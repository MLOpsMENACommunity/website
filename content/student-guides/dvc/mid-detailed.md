This is part two of three. It picks up exactly where Beginner ended and takes **every topic from there further**, then adds the machinery you have not met yet. Nothing is dropped and nothing is repeated for its own sake — where you already know the basics, we go straight to the depth.

## Where this picks up

| Topic you already use | What this level adds |
|---|---|
| `.dvc` pointers | The hash algorithm, `files/md5/` layout, `.dir` listings, and why hashing is the bottleneck |
| The cache and link types | `reflink` vs `hardlink` vs `copy` measured, shared caches, and the corruption failure mode |
| `dvc add` | `--to-remote`, `--no-commit`, and when a directory should become shards instead |
| `dvc.yaml` | `foreach`, `matrix`, `vars`, templating, and multi-file pipelines |
| `outs` | `persist`, `cache: false`, `remote:`, `push: false`, and metrics-as-outputs |
| `params` | Parameter files other than `params.yaml`, `--set-param` sweeps, dotted paths |
| Metrics and plots | Plot templates, multi-revision comparison, DVCLive during training |
| Remotes | Multiple remotes, per-output remotes, `--jobs`, retries, and remote layout versions |
| `dvc import` | `import-url`, `--no-download`, `dvc update --rev`, and registry consumption |
| Experiments | Queues, `--temp`, custom runners, `dvc exp save`, and `exp show --sort-by` |
| Debugging | `dvc repro` internals, `--dry`, `--downstream`, `--force-downstream`, verbose transfer logs |
| — **new** — | CI/CD for pipelines · DVCLive · external outputs · monorepos · cloud-versioned data |

Each section starts with the problem it solves, and ends with a **Try it** you can do on a real project in a few minutes.

## Hashing, the cache layout, and why it matters

Beginner told you the cache is content-addressed. Here is the mechanism, because at this level performance questions start arriving and they all trace back to it.

DVC hashes file contents with **MD5** by default — chosen for speed, not for cryptographic strength, which is the honest answer when an interviewer asks. The hash becomes the object's address:

```text .dvc/cache layout
.dvc/cache/files/md5/
├── 8f/
│   └── 2c4b19e0a7d3f1c6b8a2e4d7091f3b        ← a file's contents
└── 3a/
    └── 7f9c2e8b1d4506….dir                  ← a JSON listing for a directory
```

The first two hex characters become the directory, which keeps any single directory from holding millions of entries. A `.dir` object is a JSON array mapping relative paths to per-file hashes:

```json a .dir object
[
  {"md5": "a1b2c3…", "relpath": "cats/001.jpg"},
  {"md5": "d4e5f6…", "relpath": "cats/002.jpg"},
  {"md5": "789abc…", "relpath": "dogs/001.jpg"}
]
```

Three consequences follow, and each one shows up as a real problem:

**Hashing is the bottleneck, not transfer.** `dvc add` on a 50 GB dataset reads all 50 GB to compute hashes. On a slow disk that dominates everything. DVC caches file hashes by `(path, size, mtime, inode)` in `.dvc/tmp/`, so a *second* add of unchanged files is fast — which is why the first run after a `git clone` feels much slower than every run afterwards.

**Small files are disproportionately expensive.** A million 4 KB files means a million hash operations, a million cache entries, and a `.dir` listing of a million rows. The same bytes as 200 shard files is dramatically faster.

**Deduplication is global to the cache.** Identical content anywhere — two branches, two projects on a shared cache, two paths in one directory — occupies one object. That is why a shared cache across projects can cut disk usage sharply.

```bash
dvc config core.hash_algorithm md5           # the default
dvc config core.hash_algorithm sha256        # slower, cryptographically sound
dvc data status --granular                   # per-file view of what changed
du -sh .dvc/cache && find .dvc/cache -type f | wc -l
```

<div class="callout warn">
  <span class="ct">Changing the hash algorithm rewrites every address</span>
  Switching from md5 to sha256 changes every object's location, so your existing cache and remote become unusable for the new pointers. It is a migration, not a setting — decide early, and if you need it for compliance reasons, do it before the dataset is large.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Generate two directories with the same total size: one with 20 files of 50 MB, one with 200,000 files of 5 KB.</li>
    <li>Time <code>dvc add</code> on each. Compare.</li>
    <li>Run <code>dvc add</code> a second time on the large-file one and time it again — the hash cache makes it near-instant.</li>
    <li>Inspect the <code>.dir</code> object for the many-files case: <code>cat .dvc/cache/files/md5/&lt;hash&gt;.dir | head</code>.</li>
  </ol>
  <em>an order-of-magnitude difference for the same number of bytes, and a near-instant second run. Those two measurements are the entire argument for sharding small files, and they are far more convincing than being told.</em>
</div>

## Link types, measured

Beginner said `reflink,copy` is the safe default. Here is what each option actually costs, because on a large dataset the difference is minutes and gigabytes.

| Type | Extra disk | Speed | Safe to edit in place | Needs |
|---|---|---|---|---|
| `reflink` | None (copy-on-write) | Instant | **Yes** | APFS, Btrfs, XFS with reflink |
| `hardlink` | None | Instant | **No — corrupts the cache** | Same filesystem |
| `symlink` | None | Instant | **No — corrupts the cache** | Same filesystem |
| `copy` | Double | Proportional to size | Yes | Nothing |

```bash
dvc config cache.type reflink,hardlink,symlink,copy   # try in order
dvc config cache.protected true                       # make working files read-only
dvc config core.check_link_support true               # verify at runtime
dvc doctor                                            # what your filesystem supports
```

The `reflink,copy` ordering means "use copy-on-write if the filesystem can, otherwise make a real copy". That is the right default: no extra space where possible, and always safe.

<div class="callout warn">
  <span class="ct">The hardlink corruption failure, precisely</span>
  Under <code>hardlink</code>, your working file and the cache object are the same inode. Editing the file in place rewrites the cache object — so every commit that referenced that hash now silently points at different bytes, and <code>dvc checkout</code> on an old revision restores the <em>new</em> content while reporting success. It is a silent history corruption, which is why <code>cache.protected true</code> exists: it marks working files read-only so an in-place edit fails loudly instead.
</div>

The pattern for a machine where space is tight and speed matters:

```bash
dvc config --local cache.type hardlink,symlink
dvc config --local cache.protected true
# and then: never edit outputs in place, always regenerate through the pipeline
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run <code>dvc doctor</code> and note which link types your filesystem supports.</li>
    <li>Set <code>cache.type</code> to <code>copy</code>, add a large file, and measure <code>du -sh . .dvc/cache</code>.</li>
    <li>Switch to <code>reflink,hardlink</code>, run <code>dvc checkout --relink</code>, and measure again.</li>
    <li>Set <code>cache.protected true</code>, then try to edit a tracked output in place and read the error.</li>
  </ol>
  <em>double the disk under <code>copy</code> and effectively none under the link types, plus a hard permission error when you try to edit a protected file. That error is the safety net that makes hardlinks usable at all.</em>
</div>

## Pipeline templating: `foreach`, `matrix`, and `vars`

A pipeline with one stage per feature set, per model type, or per dataset shard quickly becomes hundreds of near-identical blocks. `foreach` and `matrix` collapse them.

```yaml dvc.yaml
stages:
  featurize:
    foreach:
      - tfidf
      - word2vec
      - embeddings
    do:
      cmd: python src/featurize.py --method ${item}
      deps:
        - src/featurize.py
        - data/prepared.csv
      outs:
        - data/features-${item}.pkl
```

That generates three stages named `featurize@tfidf`, `featurize@word2vec`, and `featurize@embeddings`. `foreach` also accepts a dictionary, which is how you vary several values at once:

```yaml
stages:
  train:
    foreach:
      small:
        depth: 4
        estimators: 100
      large:
        depth: 16
        estimators: 500
    do:
      cmd: python src/train.py --depth ${item.depth} --estimators ${item.estimators}
      deps: [src/train.py, data/train.csv]
      outs: [models/model-${key}.pkl]
```

`matrix` takes the cross product, which is the right tool for a genuine grid:

```yaml
stages:
  benchmark:
    matrix:
      model: [rf, xgb, lgbm]
      split: [0.1, 0.2]
    do:
      cmd: python src/bench.py --model ${item.model} --split ${item.split}
      outs:
        - out/${item.model}-${item.split}.json
```

Six stages from six lines. And `vars` lets you pull shared values in from a file or define them inline:

```yaml dvc.yaml
vars:
  - params.yaml                    # everything in params.yaml is available
  - config/paths.yaml:data         # just the `data` key from another file
  - stage_defaults:
      timeout: 3600

stages:
  train:
    cmd: python src/train.py --timeout ${stage_defaults.timeout}
    deps:
      - ${data.train_path}
```

```bash
dvc dag                            # confirm the generated stages
dvc repro featurize@tfidf          # target one generated stage
dvc repro 'featurize@*'            # or a glob
```

<div class="callout tip">
  <span class="ct">Generated stage names use <code>@</code>, and that matters for targeting</span>
  <code>featurize@tfidf</code> is the addressable name. Quote globs in the shell, and remember that <code>dvc repro featurize</code> with no suffix targets nothing — the plain name does not exist once <code>foreach</code> is in play.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Convert three near-identical stages into one <code>foreach</code> block and confirm <code>dvc dag</code> shows the same graph.</li>
    <li>Run <code>dvc repro</code> and note the generated stage names in the output.</li>
    <li>Add a second axis with <code>matrix</code> and count how many stages appear.</li>
    <li>Move a shared path into <code>vars</code> from a separate YAML file and reference it with <code>${…}</code>.</li>
  </ol>
  <em>a much shorter <code>dvc.yaml</code> producing an identical DAG, and stage names with <code>@</code> suffixes. The moment you have more than three similar stages, this is the change that keeps the file readable.</em>
</div>

## Output modifiers

Beginner used plain `outs`. Every output takes modifiers, and choosing them correctly is most of what separates a pipeline that works from one that is pleasant to operate.

```yaml dvc.yaml
stages:
  train:
    cmd: python src/train.py
    outs:
      - models/model.pkl                  # the default: cached, gitignored
      - models/summary.txt:
          cache: false                    # small text → Git, diffable forever
      - logs/training.log:
          persist: true                   # survives the next run; append-friendly
      - checkpoints/:
          persist: true
          push: false                     # cached locally, never uploaded
      - data/huge-intermediate.parquet:
          remote: bigstore                # cached to a specific remote
```

| Modifier | Effect | Use for |
|---|---|---|
| *(none)* | Cached, gitignored, pushed | Models, datasets, anything large |
| `cache: false` | Committed to Git instead | Metrics, plots, small summaries |
| `persist: true` | Not deleted before the stage reruns | Logs, checkpoints, incremental state |
| `push: false` | Cached locally, excluded from `dvc push` | Huge intermediates nobody else needs |
| `remote: NAME` | Stored on a named remote | Cost tiering, region pinning |
| `desc:` | Human description, shown in `dvc list` | Documenting a registry |

Two of those deserve real attention.

**`persist: true` changes the execution contract.** Normally DVC removes a stage's outputs before running it, so the stage always starts clean. With `persist`, the previous output is left in place — which is what you need for checkpoint-resume training or an append-only log, and which also means the stage is no longer purely a function of its inputs. Use it deliberately.

**`push: false` is the cost lever.** A 200 GB intermediate that every machine regenerates in four minutes does not belong in object storage. Keeping it cached locally but out of the remote is often the single largest storage saving available.

```bash
dvc status                       # persist outputs are reported differently
dvc repro --force                # persist outputs are still not deleted
dvc push --remote bigstore       # push only to a specific remote
```

<div class="callout warn">
  <span class="ct"><code>cache: false</code> means Git is now responsible</span>
  A <code>cache: false</code> output is committed to Git, so it must be small and text — DVC will happily let you mark a 4 GB binary <code>cache: false</code> and you will discover the consequence at <code>git push</code>. The rule of thumb: kilobytes and diffable, or it belongs in the cache.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Mark a small summary output <code>cache: false</code>, repro, and confirm it appears in <code>git status</code> rather than <code>.gitignore</code>.</li>
    <li>Add a log output with <code>persist: true</code>, repro twice, and confirm the file was appended to rather than replaced.</li>
    <li>Remove <code>persist</code> and repro again — note that the file is now recreated from scratch.</li>
    <li>Mark a large intermediate <code>push: false</code>, run <code>dvc push -v</code>, and confirm it was skipped.</li>
  </ol>
  <em>a small output living in Git, a log that survives across runs, and a push that skips the file you excluded. The <code>persist</code> before/after in steps two and three is the clearest demonstration of how it changes the stage contract.</em>
</div>

## External data and `import-url`

So far every input was a file in your repository. Real pipelines start from somewhere else — an S3 landing zone, an HTTP endpoint, a database export dropped on a share.

```bash
# Track a remote file as a dependency, with version tracking
dvc import-url s3://landing-bucket/exports/2024-05-01/events.parquet data/events.parquet

# HTTP works too
dvc import-url https://data.example.org/reference/taxonomy.csv data/taxonomy.csv

# Record the source without downloading the bytes now
dvc import-url --no-download s3://landing/huge.parquet data/huge.parquet

# Later, check whether upstream changed and pull it if so
dvc update data/events.parquet.dvc
dvc update --no-download data/huge.parquet.dvc
```

The `.dvc` file records both the source URL and the upstream object's own hash or etag, so `dvc update` can tell you whether the source actually changed:

```yaml data/events.parquet.dvc
deps:
- md5: 4f8a2b1c9e7d3506
  size: 1073741824
  path: s3://landing-bucket/exports/2024-05-01/events.parquet
outs:
- md5: 4f8a2b1c9e7d3506
  size: 1073741824
  path: events.parquet
```

You can also reference external data directly as a dependency inside a stage, which avoids a separate download step:

```yaml dvc.yaml
stages:
  prepare:
    cmd: python src/prepare.py
    deps:
      - src/prepare.py
      - s3://landing-bucket/exports/current/events.parquet    # external dep
    outs:
      - data/prepared.parquet
```

| Approach | Downloads | Tracks upstream version | Good for |
|---|---|---|---|
| `dvc import-url` | Yes | Yes, with `dvc update` | A source you want pinned and reproducible |
| `import-url --no-download` | No | Yes | Huge sources you process in place |
| External `deps` in a stage | No | Yes, by hashing the remote object | A moving landing zone read by the stage |
| `dvc get` | Yes | No | One-off downloads you do not depend on |

<div class="callout warn">
  <span class="ct">An external dependency you do not control can change under you</span>
  Pointing a stage at <code>s3://landing/current/events.parquet</code> means someone else's overwrite silently invalidates your pipeline — which is sometimes exactly right and sometimes a reproducibility hole. If the result must be reproducible six months from now, import a <b>dated, immutable</b> path rather than a moving one.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li><code>dvc import-url</code> a small public HTTP file and read the resulting <code>.dvc</code> file's <code>deps</code> section.</li>
    <li>Run <code>dvc update</code> on it and observe that nothing changes because upstream did not.</li>
    <li>Add an external dependency to a stage and run <code>dvc status</code> — note that DVC hashes the remote object to decide.</li>
    <li>Try <code>--no-download</code> and confirm the pointer exists with no local file.</li>
  </ol>
  <em>a dependency that names an external source and knows its upstream version. Step three is the interesting one: DVC reaching out to hash a remote object is what makes external deps reproducible rather than merely convenient.</em>
</div>

## Multiple remotes

One remote is the common case. Several become necessary as soon as cost, geography, or access differ across your data.

```bash
dvc remote add -d origin s3://prod-bucket/dvc            # the default
dvc remote add archive s3://glacier-bucket/dvc           # cheap, cold
dvc remote add scratch /mnt/fast-nvme/dvc-scratch        # local, fast
dvc remote add readonly https://data.example.org/dvc     # HTTP, pull-only

dvc remote list
dvc push --remote archive
dvc pull --remote readonly
```

Per-remote settings cover most real operational needs:

```bash
dvc remote modify origin region eu-west-1
dvc remote modify origin sse AES256                      # server-side encryption
dvc remote modify origin acl bucket-owner-full-control
dvc remote modify origin jobs 16                          # parallel transfers
dvc remote modify archive verify true                     # re-hash on download
dvc remote modify --local origin credentialpath ~/.aws/dvc-creds
dvc remote modify origin version_aware true               # use bucket versioning
```

And an output can name its own remote, which is how you tier storage without moving anything by hand:

```yaml dvc.yaml
outs:
  - models/model.pkl                       # → default remote
  - data/raw-archive.parquet:
      remote: archive                      # → cold storage
```

| Setting | Why it matters |
|---|---|
| `jobs` | Transfer parallelism. The single biggest `dvc pull` speed lever |
| `sse` / `sse_kms_key_id` | Encryption at rest, usually a compliance requirement |
| `verify` | Re-hash after download; catches corruption at the cost of time |
| `version_aware` | Store objects at their natural paths and use the bucket's own versioning |
| `credentialpath` / `profile` | Per-machine credentials, set with `--local` |

<div class="callout tip">
  <span class="ct">Tune <code>jobs</code> before blaming the network</span>
  DVC's default parallelism is conservative. On a fat link with many small objects, <code>dvc remote modify origin jobs 16</code> or <code>dvc pull -j 16</code> often multiplies throughput. Measure with <code>dvc pull -v</code>, which reports transfer counts, before concluding that the storage is slow.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Define a second remote pointing at a different local directory and push to it explicitly with <code>--remote</code>.</li>
    <li>Mark one output with <code>remote:</code> naming that second remote, repro, and push. Confirm where each object landed.</li>
    <li>Time <code>dvc pull -j 1</code> against <code>dvc pull -j 16</code> on a directory with many small files.</li>
    <li>Run <code>dvc remote list -v</code> and read the resolved configuration.</li>
  </ol>
  <em>objects split across two remotes according to a per-output rule, and a measurable difference from transfer parallelism. That <code>jobs</code> measurement is worth doing once so you know your own numbers.</em>
</div>

## Experiments at scale

Beginner ran a few experiments in sequence. At this level you want dozens, running in parallel, without three of them fighting over the same workspace.

```bash
# Queue a sweep from a range
dvc exp run --queue -S train.n_estimators=100,200,400,800
dvc exp run --queue -S 'train.max_depth=range(4, 20, 4)'

# Run the queue with N workers
dvc exp run --run-all --jobs 4

# Watch and manage the queue
dvc queue status
dvc queue logs exp-a1b2c
dvc queue stop
dvc queue remove --all
```

The critical mechanic: a queued experiment runs in an **isolated temporary workspace**, so four workers do not overwrite each other's `models/model.pkl`. That is what `--temp` does implicitly, and what makes parallel sweeps safe.

```bash
dvc exp run --temp                       # run in a temp dir, leave your workspace alone
dvc exp run --temp --set-param train.lr=0.01
```

Comparing and filtering becomes the main activity once you have thirty results:

```bash
dvc exp show --only-changed              # hide constant columns
dvc exp show --sort-by accuracy --sort-order desc
dvc exp show --num 5                     # last 5 commits' experiments
dvc exp show --drop 'train_seconds|.*_std'
dvc exp show --csv > results.csv         # or --json, --md
dvc exp diff exp-a1b2c exp-d4e5f         # two experiments, side by side
```

And promotion has three shapes, each appropriate to a different situation:

| Command | Result | Use when |
|---|---|---|
| `dvc exp apply NAME` | Brings it into your workspace, uncommitted | You want to inspect then commit |
| `dvc exp branch NAME BRANCH` | Creates a branch at that experiment | It deserves a pull request |
| `dvc exp save -n NAME` | Snapshots the current workspace as an experiment | You changed things by hand and want to keep it |
| `dvc exp push origin NAME` | Shares it via Git refs | A colleague should see your result |

```bash
dvc exp push origin exp-a1b2c            # share an experiment
dvc exp list origin                      # what others have pushed
dvc exp pull origin exp-a1b2c            # fetch theirs
```

<div class="callout warn">
  <span class="ct">Experiments are Git refs, and they accumulate</span>
  Each experiment is a hidden commit under <code>refs/exps/</code> plus cached outputs. Thirty sweeps of a 2 GB model is 60 GB of cache. <code>dvc exp remove</code> drops the refs and <code>dvc gc --workspace</code> (or better, <code>--all-commits</code>) reclaims the space — but neither happens automatically, and "my disk filled up during a sweep" is the most common mid-level surprise.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Queue a sweep with <code>-S param=a,b,c,d</code> and run it with <code>--jobs 2</code>. Watch <code>dvc queue status</code> in another terminal.</li>
    <li>Run <code>dvc exp show --only-changed --sort-by</code> your metric, and identify the winner.</li>
    <li>Measure your cache before and after with <code>du -sh .dvc/cache</code>.</li>
    <li>Promote the winner with <code>dvc exp branch</code>, then clean up with <code>dvc exp remove --all</code> and a dry-run <code>dvc gc</code>.</li>
  </ol>
  <em>a parallel sweep that does not corrupt itself, a sorted comparison table, and a visible jump in cache size. Step three is the one that teaches you to budget disk for a sweep before starting it.</em>
</div>

## DVCLive: logging from inside training

`metrics.json` written at the end of a run tells you the final score. **DVCLive** logs during the run, which gives you per-epoch curves and lets you compare training dynamics rather than just endpoints.

```bash
pip install dvclive
```

```python src/train.py
from dvclive import Live

with Live() as live:
    live.log_params({"lr": lr, "batch_size": bs, "epochs": epochs})

    for epoch in range(epochs):
        train_loss = train_one_epoch(model, loader)
        val_loss, val_acc = validate(model, val_loader)

        live.log_metric("train/loss", train_loss)
        live.log_metric("val/loss", val_loss)
        live.log_metric("val/accuracy", val_acc)
        live.next_step()                       # advances the step counter

    live.log_artifact("models/model.pkl", type="model", name="classifier")
```

DVCLive writes into `dvclive/` in a layout DVC already understands, so the pipeline wiring is short:

```yaml dvc.yaml
stages:
  train:
    cmd: python src/train.py
    deps: [src/train.py, data/train.csv]
    params: [train.lr, train.batch_size, train.epochs]
    outs:
      - models/model.pkl
    metrics:
      - dvclive/metrics.json:
          cache: false
    plots:
      - dvclive/plots/metrics:
          x: step
          cache: false
```

```bash
dvc plots show                     # per-epoch curves
dvc plots diff HEAD~1              # this run's curves against the last
dvc exp show                       # final values appear as columns automatically
```

There are framework integrations that remove the manual loop entirely — callbacks for PyTorch Lightning, Keras, Hugging Face, XGBoost, LightGBM, and more:

```python
from dvclive.lightning import DVCLiveLogger
trainer = Trainer(logger=DVCLiveLogger(log_model=True))
```

<div class="callout tip">
  <span class="ct">DVCLive is the seam between "a number" and "a curve"</span>
  A final accuracy tells you which run won. A loss curve tells you <em>why</em> — overfitting after epoch 12, a learning rate that was too high, a validation set that is too small to be stable. The cost is about five lines, and it changes what your experiment table is useful for.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add DVCLive to a training script with three <code>log_metric</code> calls in the epoch loop.</li>
    <li>Wire <code>dvclive/metrics.json</code> and <code>dvclive/plots/metrics</code> into <code>dvc.yaml</code> with <code>cache: false</code>.</li>
    <li>Run <code>dvc repro</code>, then <code>dvc plots show</code> and open the HTML.</li>
    <li>Change the learning rate, repro, then <code>dvc plots diff HEAD~1</code> and compare the two curves on one chart.</li>
  </ol>
  <em>two training runs overlaid on a single loss chart. That comparison is what makes a hyperparameter change explainable rather than merely measurable, and it is the artifact to put in a pull request.</em>
</div>

## Plot templates and comparison

Beginner produced a plot. At this level the question is how to make the plot answer a question without hand-writing a chart every time.

```yaml dvc.yaml
plots:
  - plots/confusion.csv:
      template: confusion
      x: actual
      y: predicted
      cache: false
  - plots/roc.json:
      template: linear
      x: fpr
      y: tpr
      title: ROC curve
      x_label: False positive rate
      y_label: True positive rate
      cache: false
  - plots/importance.csv:
      template: bar_horizontal
      x: importance
      y: feature
      cache: false
```

| Template | Shows |
|---|---|
| `linear` | The default; a line chart |
| `confusion` | A confusion matrix heatmap |
| `confusion_normalized` | The same, as proportions |
| `scatter` | Point cloud |
| `smooth` | Line with a smoothing window |
| `bar_horizontal` | Ranked bars, ideal for feature importance |

Top-level plot definitions let you combine several files into one chart, which is how you compare across stages or models:

```yaml dvc.yaml
plots:
  - accuracy-comparison:
      x: epoch
      y:
        logs/rf.csv: accuracy
        logs/xgb.csv: accuracy
      title: RF versus XGBoost
```

```bash
dvc plots show                                   # write and open an HTML report
dvc plots diff HEAD~3 HEAD --targets plots/roc.json
dvc plots diff --open                            # open in a browser directly
dvc plots templates                              # list available templates
dvc plots templates confusion --out .dvc/plots   # customise one
```

<div class="callout tip">
  <span class="ct">Plots are for pull requests, not for you</span>
  You already know what your model does. The plot exists so a reviewer can see the difference in ten seconds without running anything. Optimise for that: label the axes, give it a title, and make <code>dvc plots diff</code> against the base branch part of your CI output.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Write a confusion matrix CSV from your evaluate stage and declare it with <code>template: confusion</code>.</li>
    <li>Run <code>dvc plots show --open</code> and check the rendering.</li>
    <li>Add a top-level plot definition combining two files onto one chart.</li>
    <li>Run <code>dvc plots templates</code> and try a second template on the same data.</li>
  </ol>
  <em>a rendered confusion matrix and a combined chart from two sources, with no plotting code written. The templates are the reason to use DVC plots rather than saving PNGs — the data stays diffable and the rendering is declarative.</em>
</div>

## DVC in CI

A pipeline that only reproduces on your laptop is not reproducible. Putting `dvc repro` in CI turns reproducibility from a claim into a check.

```yaml .github/workflows/pipeline.yml
name: Pipeline
on:
  pull_request:
  push:
    branches: [main]

jobs:
  repro:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0                 # DVC needs history for metrics diff

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: pip

      - run: pip install -r requirements.txt

      # Credentials via OIDC — no stored keys
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.DVC_ROLE_ARN }}
          aws-region: ${{ vars.AWS_REGION }}

      # Cache DVC's own cache between runs, keyed on the lock file
      - uses: actions/cache@v4
        with:
          path: .dvc/cache
          key: dvc-${{ hashFiles('dvc.lock') }}
          restore-keys: dvc-

      - run: dvc pull --allow-missing
      - run: dvc repro

      - name: Fail if the pipeline was not up to date
        run: |
          dvc status --json | tee status.json
          test "$(cat status.json)" = "{}" || {
            echo "::error::dvc.lock is stale — run 'dvc repro' and commit"; exit 1; }

      - name: Report metrics on the pull request
        if: github.event_name == 'pull_request'
        run: |
          {
            echo "## Metrics"
            dvc metrics diff origin/main --md
            echo "## Parameters"
            dvc params diff origin/main --md
          } >> "$GITHUB_STEP_SUMMARY"

      - run: dvc push
        if: github.ref == 'refs/heads/main'
```

Five details in there carry the weight:

**`fetch-depth: 0`.** `dvc metrics diff origin/main` needs the other revision present. A shallow clone silently produces an empty diff.

**Caching `.dvc/cache` keyed on `dvc.lock`.** Without it, every CI run downloads every input. With it, an unchanged pipeline pulls almost nothing.

**`dvc pull --allow-missing`.** Pulls what exists and does not fail on outputs that have not been produced yet, which is the normal state on a branch.

**The `dvc status` gate.** This is the check that matters: it fails the pull request when someone edited a script or a parameter without rerunning the pipeline, so `dvc.lock` cannot drift from the code.

**`dvc push` only on `main`.** Feature branches produce experiments, not canonical artifacts. Pushing from every branch fills your remote with dead ends.

| CI concern | Answer |
|---|---|
| Credentials | OIDC or a workload identity — never a stored key |
| Cold-start cost | Cache `.dvc/cache`, keyed on `dvc.lock` |
| "The lock is stale" | `dvc status` as a required check |
| Reviewer visibility | `dvc metrics diff --md` into the job summary |
| Who may push data | Only the protected branch |
| Long-running training | A self-hosted or GPU runner — Senior covers this |

<div class="callout warn">
  <span class="ct">A fork pull request must not receive push credentials</span>
  The same trust model as any CI system: a pull request from a fork runs contributor code. If that job holds a write credential for your data remote, a contributor can overwrite your datasets. Give fork builds a read-only remote, or split the workflow so the privileged half never runs fork code.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add the workflow above to a repository, adapted to your remote, and open a pull request that changes a parameter.</li>
    <li>Confirm the metrics diff appears in the job summary.</li>
    <li>Now change a script <em>without</em> running <code>dvc repro</code>, push, and confirm the <code>dvc status</code> gate fails.</li>
    <li>Compare run times with and without the <code>actions/cache</code> step.</li>
  </ol>
  <em>a pull request that shows how the numbers moved, and a red check when the lock file is stale. That failing gate in step three is the single most valuable thing this workflow does — it makes "reproducible" enforceable rather than aspirational.</em>
</div>

## Monorepos and multiple projects

One repository with several models, or one dataset shared by several repositories, both need a layout decision.

**Subdirectory pipelines.** DVC supports a `dvc.yaml` per subdirectory, each with its own stages, sharing one `.dvc/cache` and one remote:

```text monorepo layout
.
├── .dvc/                     # one cache, one remote, one config
├── projects/
│   ├── churn/
│   │   ├── dvc.yaml
│   │   ├── dvc.lock
│   │   └── params.yaml
│   └── fraud/
│       ├── dvc.yaml
│       ├── dvc.lock
│       └── params.yaml
└── shared/
    └── data/features.parquet.dvc
```

```bash
dvc repro projects/churn/dvc.yaml
dvc repro --all-pipelines             # every dvc.yaml in the repo
dvc dag projects/fraud/dvc.yaml
```

A stage in one project can depend on an output from another by relative path, which makes shared feature engineering a first-class dependency rather than a copy.

**Separate repositories with `import`.** When teams need independence, keep the data in its own repository and consume it:

```bash
dvc import --rev v2.1.0 git@github.com:org/data-registry.git datasets/customers.parquet
dvc update --rev v2.2.0 datasets/customers.parquet.dvc
```

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Monorepo</h4>
    <ul>
      <li>One cache and remote — maximum deduplication</li>
      <li>Cross-project dependencies are just paths</li>
      <li>One CI configuration to maintain</li>
      <li>Atomic changes across projects</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Separate repos + import</h4>
    <ul>
      <li>Teams version and release independently</li>
      <li>Consumers pin an explicit upstream revision</li>
      <li>Access control per repository</li>
      <li>But: duplicated cache, and update is manual</li>
    </ul>
  </div>
</div>

<div class="callout tip">
  <span class="ct">Choose on ownership, not on tidiness</span>
  If one team owns everything, a monorepo is simpler and cheaper. If a dataset has its own owner and its own release cadence, give it its own repository and let consumers pin a revision. Retrofitting either direction is painful, so decide before there are five projects.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Create two subdirectories each with their own <code>dvc.yaml</code>, and run <code>dvc repro --all-pipelines</code>.</li>
    <li>Make a stage in the second project depend on an output from the first, and confirm <code>dvc dag</code> shows the link.</li>
    <li>Check that both share one <code>.dvc/cache</code> by looking for both outputs' hashes in it.</li>
    <li>Now try the other shape: <code>dvc import</code> from a second local repository with <code>--rev</code>.</li>
  </ol>
  <em>two pipelines in one repository sharing a cache, with a cross-project dependency visible in the DAG. Building both layouts once makes the trade-off concrete rather than theoretical.</em>
</div>

## Debugging, one level deeper

Beginner's checklist covers "it does not work". At this level the failures are subtler: it runs, it succeeds, and the result is wrong or the rebuild was unnecessary.

```bash
dvc repro --dry                     # what would run, and in what order
dvc repro --downstream train        # train and everything after it
dvc repro --force-downstream        # rerun downstream even if hashes matched
dvc repro --single-item train       # exactly one stage, no upstream
dvc repro --pull                    # fetch missing deps from the remote as needed
dvc repro --no-commit               # run but do not save outputs to the cache
dvc repro -v                        # verbose: every hash comparison

dvc data status --granular --unchanged   # per-file, including what did not change
dvc diff HEAD~3                          # which tracked files changed between revisions
dvc diff --targets data/ HEAD~1
```

`dvc data status --granular` is the underused one. Where `dvc status` says "modified: data/images", the granular form lists the individual files added, modified, and deleted — which is how you discover that a "changed dataset" is actually one corrupted image.

Four subtle failures and how to find them:

| Symptom | Real cause | How to confirm |
|---|---|---|
| A stage reruns every time | A dependency whose hash changes on every run — a timestamped log, a generated file | `dvc repro -v` and read which dep differed |
| A stage never reruns after a real change | The changed input is not in `deps` | `dvc dag` and compare against what the script reads |
| Results differ between machines | Undeclared randomness or an unpinned library | Seed everything and add `requirements.txt` to `deps` |
| `dvc.lock` conflicts on every merge | Two branches both reran the pipeline | Expected; regenerate with `dvc repro` after merging rather than hand-resolving |

<div class="callout warn">
  <span class="ct">Never hand-resolve a <code>dvc.lock</code> merge conflict</span>
  The hashes in it describe a run that actually happened. Stitching two halves together produces a lock file describing a run that never occurred, and the next <code>dvc checkout</code> will restore inconsistent data. Take one side — usually theirs — then run <code>dvc repro</code> and commit the regenerated lock.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add a dependency that changes every run — a file containing the current timestamp — and confirm the stage never caches.</li>
    <li>Find it with <code>dvc repro -v</code> and read the hash comparison.</li>
    <li>Run <code>dvc data status --granular</code> on a directory where you changed one file out of many.</li>
    <li>Create a <code>dvc.lock</code> conflict deliberately on two branches, then resolve it the correct way: take one side and repro.</li>
  </ol>
  <em>a stage that can never be cached, found in one verbose run, and a granular status that names the single changed file. The lock conflict exercise is worth doing before it happens for real on a Friday.</em>
</div>

## Putting it all together

Everything from this level in one project. Nothing here is new — read it as a whole and you should be able to justify every line.

```yaml params.yaml
prepare:
  test_size: 0.2
  random_state: 42

featurize:
  methods: [tfidf, embeddings]
  max_features: 50000

train:
  n_estimators: 300
  max_depth: 8
  learning_rate: 0.05
```

```yaml dvc.yaml
vars:
  - params.yaml
  - config/paths.yaml:paths

stages:
  # External, dated source — immutable, so the result stays reproducible
  ingest:
    cmd: python src/ingest.py
    deps:
      - src/ingest.py
      - s3://landing/exports/2024-05-01/events.parquet
    outs:
      - data/raw.parquet

  prepare:
    cmd: python src/prepare.py
    deps: [src/prepare.py, data/raw.parquet]
    params: [prepare.test_size, prepare.random_state]
    outs:
      - data/train.parquet
      - data/test.parquet

  # One block, two generated stages
  featurize:
    foreach: ${featurize.methods}
    do:
      cmd: python src/featurize.py --method ${item}
      deps: [src/featurize.py, data/train.parquet]
      params: [featurize.max_features]
      outs:
        - data/features-${item}.pkl:
            push: false                 # regenerable in minutes; not worth storing
  train:
    cmd: python src/train.py
    deps:
      - src/train.py
      - requirements.txt                # pinned deps are a real dependency
      - data/features-tfidf.pkl
    params: [train.n_estimators, train.max_depth, train.learning_rate]
    outs:
      - models/model.pkl                # cached and pushed: the artifact
      - logs/train.log:
          persist: true                 # appended across runs
    metrics:
      - dvclive/metrics.json:
          cache: false                  # small text → Git, diffable
    plots:
      - dvclive/plots/metrics:
          x: step
          cache: false

  evaluate:
    cmd: python src/evaluate.py
    deps: [src/evaluate.py, models/model.pkl, data/test.parquet]
    metrics:
      - metrics.json:
          cache: false
    plots:
      - plots/confusion.csv:
          template: confusion
          x: actual
          y: predicted
          cache: false
```

```bash
# .dvc/config — committed
[core]
    remote = origin
    autostage = true
['remote "origin"']
    url = s3://prod-bucket/dvc
    jobs = 16
['remote "archive"']
    url = s3://glacier-bucket/dvc
[cache]
    type = reflink,copy
    protected = true
```

```bash
# The everyday loop
dvc repro                                  # only what changed
dvc metrics diff && dvc params diff        # what moved, and why
dvc plots diff HEAD~1 --open               # the curves, side by side
git add dvc.lock metrics.json plots dvclive params.yaml
git commit -m "Deeper trees, tfidf features: F1 0.910 → 0.931"
dvc push && git push

# A sweep, in parallel, isolated
dvc exp run --queue -S train.max_depth=4,8,16,24
dvc exp run --run-all --jobs 4
dvc exp show --only-changed --sort-by f1 --sort-order desc
dvc exp branch exp-a1b2c deeper-trees
dvc exp remove --all && dvc gc --dry-run --all-commits
```

Ten decisions in there are the whole lesson of this level:

| Decision | Section |
|---|---|
| An immutable dated external source | External data and `import-url` |
| `foreach` over `${featurize.methods}` | Pipeline templating |
| `push: false` on cheap regenerable intermediates | Output modifiers |
| `persist: true` on the training log | Output modifiers |
| `requirements.txt` declared as a dependency | Debugging, one level deeper |
| `cache: false` on metrics and DVCLive plots | Output modifiers · DVCLive |
| DVCLive for per-epoch curves | DVCLive |
| `jobs = 16` on the remote | Multiple remotes |
| `cache.protected = true` | Link types, measured |
| A queued, parallel, isolated sweep | Experiments at scale |

<div class="guide-try">
  <span class="ct">Try it — the one that matters</span>
  <ol>
    <li>Rebuild a real project against this template and get <code>dvc repro</code> to report up to date on a second run.</li>
    <li>Verify each decision actively: confirm <code>push: false</code> objects are absent from the remote, confirm the persisted log survived, confirm a parameter change invalidates exactly one stage.</li>
    <li>Run a four-way sweep in parallel and produce a sorted <code>dvc exp show</code> you would paste into a review.</li>
    <li>Put the CI workflow in place and confirm the <code>dvc status</code> gate fails when you forget to repro.</li>
  </ol>
  <em>a pipeline that reruns the minimum, a sweep that runs four-wide without corrupting itself, and CI that refuses a stale lock file. Those three properties are what separate a pipeline that works from one a team can operate.</em>
</div>

## Where you are now

You can explain the cache layout and why hashing dominates, choose link types deliberately, template a pipeline instead of copy-pasting stages, use every output modifier correctly, depend on external and versioned sources, tier storage across remotes, run parallel isolated sweeps and share them, log training dynamics with DVCLive, render declarative plots for reviewers, enforce reproducibility in CI, lay out a monorepo, and debug the subtle failures where nothing errors.

| Can you… | |
|---|---|
| Say what dominates `dvc add` time? | Hashing, not transfer |
| Explain the `files/md5/xx/` layout and `.dir` objects? | Two-char shard, JSON listing per directory |
| Give the hardlink corruption failure? | Working file and cache share an inode |
| Collapse ten similar stages into one block? | `foreach` or `matrix` |
| Name four output modifiers and their use? | `cache: false`, `persist`, `push: false`, `remote:` |
| Say why an external dep can break reproducibility? | A moving path can be overwritten |
| Make `dvc pull` faster? | `jobs`, and cache `.dvc/cache` in CI |
| Run a sweep four-wide safely? | Queue plus `--temp` isolation |
| Say what DVCLive adds over `metrics.json`? | Per-step curves, not just endpoints |
| Name the CI check that enforces reproducibility? | `dvc status` must be empty |
| Resolve a `dvc.lock` conflict correctly? | Take one side, then `dvc repro` |
| Find which single file in a directory changed? | `dvc data status --granular` |

**Senior takes every one of these further, with a security, scale, or ownership dimension.** Who can read and who can write each remote, and how credentials stop being stored at all. Immutability, retention, and object-lock on the storage side — and what that means for `dvc gc`. Cost modelling: storage class, egress, and the real price of a 200 GB intermediate. Hashing and transfer at terabyte scale, and when to stop using DVC for a given dataset. Data registries as a product with a release cadence. Lineage and audit trails for regulated work. GDPR deletion against a content-addressed, immutable cache. CI/CD with GPU and self-hosted runners. And where DVC stops and a feature store, lakehouse, or table format begins.
