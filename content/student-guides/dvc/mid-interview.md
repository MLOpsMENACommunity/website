Part two of three. A cumulative review of **Beginner and Mid-level material**, organised by topic rather than by level, in about thirty-five minutes. Fast review first, common questions at the end. Senior reviews all three.

## Where this picks up

| Topic you already answer | What an interviewer expects here |
|---|---|
| "DVC stores a pointer in Git" | The cache layout, MD5, `.dir` objects, and why hashing dominates |
| "The cache is content-addressed" | Link types measured, and the hardlink corruption failure |
| "`dvc.yaml` has stages" | `foreach`, `matrix`, `vars`, and multi-file pipelines |
| "`outs` tracks outputs" | `persist`, `cache: false`, `push: false`, `remote:` |
| "Data comes from a remote" | Multiple remotes, `jobs`, `verify`, `version_aware` |
| "`dvc import` shares data" | `import-url`, external deps, `--no-download`, `dvc update --rev` |
| "Experiments are cheap" | Queues, `--temp` isolation, sharing via Git refs, disk cost |
| "Metrics diff across commits" | DVCLive per-step logging and plot templates |
| "`dvc status` tells me what changed" | `data status --granular`, `repro -v`, and lock-file conflicts |
| — **new** — | DVC in CI · monorepo layout · the `dvc status` gate |

## Foundations, in one screen

<div class="flow">
  <div class="node">CODE<small>in Git</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">POINTERS<small>.dvc, dvc.lock</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">CACHE<small>by hash</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">REMOTE<small>S3, GCS, SSH</small></div>
</div>

> DVC versions data and ML pipelines on top of Git. A small hash-bearing pointer goes into Git; the bytes go into object storage. `dvc.lock` records every input and output hash from the last successful run, which is how `dvc repro` reruns only what changed.

**`git checkout` moves pointers; `dvc checkout` moves data.** `dvc install` adds hooks so you rarely need the second by hand.

**Never `dvc add` a pipeline output** — `outs` owns it. **Always commit `dvc.lock`** and never hand-edit it. **Credentials never go in `.dvc/config`**, which is committed; use the provider's credential chain or `.dvc/config.local`.

## The cache, precisely

```text .dvc/cache/files/md5/
├── 8f/2c4b19e0a7d3f1c6b8a2e4d7091f3b        ← a file's contents
└── 3a/7f9c2e8b1d4506….dir                  ← JSON listing for a directory
```

MD5 by default — chosen for speed, not cryptographic strength, which is the honest answer. The first two hex characters shard the directory. A `.dir` object maps relative paths to per-file hashes, so files inside a tracked directory are still deduplicated individually.

Three consequences worth stating without prompting:

**Hashing is the bottleneck, not transfer.** `dvc add` on 50 GB reads 50 GB. DVC caches hashes by `(path, size, mtime, inode)` in `.dvc/tmp/`, which is why the second add is near-instant and the first run after a clone feels slow.

**Small files are disproportionately expensive.** A million 4 KB files means a million hash operations, a million objects, and a `.dir` listing of a million rows. The fix is sharding.

**Deduplication is global to the cache.** Identical content anywhere — two branches, two projects on a shared cache — occupies one object.

## Link types

| Type | Extra disk | Safe to edit in place | Needs |
|---|---|---|---|
| `reflink` | None (copy-on-write) | **Yes** | APFS, Btrfs, XFS |
| `hardlink` | None | **No — corrupts the cache** | Same filesystem |
| `symlink` | None | **No — corrupts the cache** | Same filesystem |
| `copy` | Double | Yes | Nothing |

```bash
dvc config cache.type reflink,copy        # the safe default
dvc config cache.protected true           # working files read-only
dvc doctor                                 # what your filesystem supports
```

<div class="callout warn">
  <span class="ct">The hardlink corruption failure, precisely</span>
  Under <code>hardlink</code>, the working file and the cache object are the same inode. Editing in place rewrites the cache object, so every commit referencing that hash now resolves to different bytes — and <code>dvc checkout</code> on an old revision restores the <em>new</em> content while reporting success. It is silent history corruption, which is why <code>cache.protected true</code> exists.
</div>

## Pipeline templating

```yaml dvc.yaml
vars:
  - params.yaml
  - config/paths.yaml:paths

stages:
  featurize:
    foreach: [tfidf, word2vec, embeddings]
    do:
      cmd: python src/featurize.py --method ${item}
      deps: [src/featurize.py, data/prepared.csv]
      outs: [data/features-${item}.pkl]

  benchmark:
    matrix:
      model: [rf, xgb, lgbm]
      split: [0.1, 0.2]
    do:
      cmd: python src/bench.py --model ${item.model} --split ${item.split}
      outs: [out/${item.model}-${item.split}.json]
```

`foreach` generates one stage per item; `matrix` takes the cross product — six stages from six lines. `foreach` also accepts a dictionary, giving `${key}` and `${item.field}`. Generated names use `@`: `featurize@tfidf`. `vars` pulls shared values from a file or defines them inline.

## Output modifiers

| Modifier | Effect | Use for |
|---|---|---|
| *(none)* | Cached, gitignored, pushed | Models, datasets |
| `cache: false` | Committed to Git instead | Metrics, plots, small summaries |
| `persist: true` | Not deleted before the stage reruns | Logs, checkpoints |
| `push: false` | Cached locally, excluded from `dvc push` | Huge regenerable intermediates |
| `remote: NAME` | Stored on a named remote | Cost tiering |
| `desc:` | Description shown in `dvc list` | Registry documentation |

Two carry real weight. **`persist: true` changes the execution contract** — DVC normally deletes outputs before rerunning, so persisting means the stage is no longer purely a function of its inputs. **`push: false` is the cost lever** — a 200 GB intermediate that rebuilds in four minutes should not be in object storage.

## External data

```bash
dvc import-url s3://landing/2024-05-01/events.parquet data/events.parquet
dvc import-url --no-download s3://landing/huge.parquet data/huge.parquet
dvc update data/events.parquet.dvc
```

```yaml
deps:
  - s3://landing/exports/current/events.parquet   # external dep, hashed remotely
```

| Approach | Downloads | Tracks upstream version |
|---|---|---|
| `dvc import-url` | Yes | Yes, via `dvc update` |
| `--no-download` | No | Yes |
| External `deps` in a stage | No | Yes, by hashing the remote object |
| `dvc get` | Yes | No |

<div class="callout warn">
  <span class="ct">A moving external path is a reproducibility hole</span>
  Depending on <code>s3://landing/current/events.parquet</code> means someone else's overwrite silently changes your inputs. If the result must be reproducible in eighteen months, import a <b>dated, immutable</b> path instead.
</div>

## Multiple remotes

```bash
dvc remote add -d origin s3://prod-bucket/dvc
dvc remote add archive s3://glacier-bucket/dvc
dvc remote modify origin jobs 16          # transfer parallelism
dvc remote modify origin verify true      # re-hash on download
dvc remote modify origin sse AES256
dvc remote modify origin version_aware true
dvc push --remote archive
```

| Setting | Why it matters |
|---|---|
| `jobs` | The single biggest `dvc pull` speed lever |
| `verify` | Catches corruption instead of restoring it silently |
| `sse` | Encryption at rest, usually a compliance requirement |
| `version_aware` | Natural paths plus bucket versioning — browsable, but no cross-file dedup |

An output can name its own remote with `remote:`, which is how you tier storage without moving anything by hand.

## Experiments at scale

```bash
dvc exp run --queue -S train.max_depth=4,8,16,24
dvc exp run --run-all --jobs 4            # each in an isolated temp workspace
dvc queue status / logs / stop
dvc exp show --only-changed --sort-by f1 --sort-order desc
dvc exp show --csv > results.csv
dvc exp branch exp-a1b2c deeper-trees
dvc exp push origin exp-a1b2c
dvc exp remove --all
```

The critical mechanic: **a queued experiment runs in an isolated temporary workspace**, which is what makes four parallel workers safe rather than a race over `models/model.pkl`.

| Promotion | Result |
|---|---|
| `dvc exp apply` | Into your workspace, uncommitted |
| `dvc exp branch` | A branch at that experiment |
| `dvc exp save -n` | Snapshot the current workspace as an experiment |
| `dvc exp push origin` | Share via Git refs |

<div class="callout warn">
  <span class="ct">Experiments are Git refs, and they accumulate</span>
  Thirty sweeps of a 2 GB model is 60 GB of cache. <code>dvc exp remove</code> drops the refs and <code>dvc gc --all-commits</code> reclaims the space — neither happens automatically, and "my disk filled up during a sweep" is the most common mid-level surprise.
</div>

## DVCLive and plots

```python
from dvclive import Live

with Live() as live:
    live.log_params({"lr": lr, "batch_size": bs})
    for epoch in range(epochs):
        live.log_metric("train/loss", train_loss)
        live.log_metric("val/accuracy", val_acc)
        live.next_step()
    live.log_artifact("models/model.pkl", type="model")
```

```yaml dvc.yaml
metrics:
  - dvclive/metrics.json:
      cache: false
plots:
  - dvclive/plots/metrics:
      x: step
      cache: false
```

DVCLive turns a final number into a curve, so you can see *why* a run won rather than only that it did. Framework callbacks exist for Lightning, Keras, Hugging Face, XGBoost, and LightGBM.

| Plot template | Shows |
|---|---|
| `linear` | Default line chart |
| `confusion` / `confusion_normalized` | Confusion matrix heatmap |
| `scatter` | Point cloud |
| `smooth` | Line with smoothing |
| `bar_horizontal` | Ranked bars — feature importance |

```bash
dvc plots diff HEAD~1 --open
dvc plots templates
```

## DVC in CI

```yaml .github/workflows/pipeline.yml
- uses: actions/checkout@v4
  with: { fetch-depth: 0 }              # metrics diff needs history
- uses: aws-actions/configure-aws-credentials@v4
  with: { role-to-assume: ${{ vars.DVC_ROLE_ARN }}, aws-region: eu-west-1 }
- uses: actions/cache@v4
  with:
    path: .dvc/cache
    key: dvc-${{ hashFiles('dvc.lock') }}
    restore-keys: dvc-
- run: dvc pull --allow-missing
- run: dvc repro
- name: Fail if the lock is stale
  run: test "$(dvc status --json)" = "{}"
- run: dvc metrics diff origin/main --md >> "$GITHUB_STEP_SUMMARY"
- run: dvc push
  if: github.ref == 'refs/heads/main'
```

| CI concern | Answer |
|---|---|
| Credentials | OIDC — never a stored key |
| Cold start | Cache `.dvc/cache`, keyed on `dvc.lock` |
| Empty metrics diff | `fetch-depth: 0`; a shallow clone lacks the other revision |
| Stale lock | `dvc status` must be empty — a required check |
| Who may push data | Only the protected branch |

<div class="callout warn">
  <span class="ct">Fork pull requests must not hold a write credential</span>
  A fork build runs contributor code. If that job can write to your data remote, a contributor can overwrite your datasets. Give fork builds a read-only remote, or split the workflow so the privileged half never runs fork code.
</div>

## Monorepos

```bash
dvc repro projects/churn/dvc.yaml
dvc repro --all-pipelines
```

One `.dvc/cache` and one remote, a `dvc.yaml` per subdirectory, cross-project dependencies as relative paths. The alternative is separate repositories consumed with `dvc import --rev`.

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Monorepo</h4>
    <ul>
      <li>One cache and remote — maximum dedup</li>
      <li>Cross-project deps are just paths</li>
      <li>One CI configuration</li>
      <li>Atomic changes across projects</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Separate repos + import</h4>
    <ul>
      <li>Independent versioning and release cadence</li>
      <li>Consumers pin an explicit revision</li>
      <li>Access control per repository</li>
      <li>But duplicated cache, and manual updates</li>
    </ul>
  </div>
</div>

Choose on **ownership**, not tidiness: one team owning everything favours a monorepo; a dataset with its own owner and cadence deserves its own repository.

## Debugging, one level deeper

```bash
dvc repro --dry                     # what would run
dvc repro --downstream train        # train and everything after
dvc repro --force-downstream        # rerun downstream even if hashes matched
dvc repro --single-item train       # exactly one stage
dvc repro --pull                    # fetch missing deps as needed
dvc repro -v                        # every hash comparison
dvc data status --granular          # per-file changes inside a directory
dvc diff HEAD~3                     # which tracked files changed
```

| Symptom | Real cause | How to confirm |
|---|---|---|
| A stage reruns every time | A dep whose hash changes on every run — a timestamped log | `dvc repro -v`, read which dep differed |
| A stage never reruns | The changed input is not in `deps` | `dvc dag` versus what the script reads |
| Results differ across machines | Undeclared randomness or an unpinned library | Seed everything; add the lock file to `deps` |
| `dvc.lock` conflicts on every merge | Both branches reran the pipeline | Expected — take one side, then `dvc repro` |

<div class="callout warn">
  <span class="ct">Never hand-resolve a <code>dvc.lock</code> conflict</span>
  The hashes describe a run that actually happened. Stitching two halves together produces a lock describing a run that never occurred, and the next <code>dvc checkout</code> restores inconsistent data. Take one side, repro, commit.
</div>

## Common interview questions

<ol class="guide-steps">
  <li><b>What is in the DVC cache, and how is it laid out?</b>Content-addressed objects under <code>.dvc/cache/files/md5/</code>, sharded by the first two hex characters of the hash. A tracked directory gets a <code>.dir</code> object — a JSON listing mapping each relative path to its own hash — so files inside a directory are still deduplicated individually.</li>
  <li><b>Why MD5 rather than something cryptographic?</b>Speed. DVC hashes every byte of every tracked file, so the algorithm is on the critical path. It is a content address, not a security control. You can switch to sha256 with <code>core.hash_algorithm</code>, but it changes every object's location, so it is a migration rather than a setting.</li>
  <li><b>What actually dominates <code>dvc add</code> time?</b>Hashing, not transfer. Adding 50 GB reads 50 GB from disk. DVC caches file hashes keyed on path, size, mtime, and inode, which is why the second add is near-instant and the first run after a clone feels slow.</li>
  <li><b>Explain the link types and the risk.</b><code>reflink</code> is copy-on-write: no extra space and safe to edit. <code>hardlink</code> and <code>symlink</code> use no extra space but the working file <em>is</em> the cache object, so editing in place rewrites cached history for every commit that shared that hash — silently. <code>copy</code> is safe and doubles the space. Default to <code>reflink,copy</code>, and set <code>cache.protected true</code> if you use hardlinks.</li>
  <li><b>How do you handle a dataset of a million small files?</b>Shard it. A million 4 KB objects means a million hash operations, a million transfers, and a `.dir` listing of a million rows. Packaging into tar shards, Parquet, or WebDataset cuts <code>dvc add</code> by an order of magnitude, turns request-bound transfers into throughput-bound ones, and speeds up the data loader as a bonus.</li>
  <li><b>How do you avoid copy-pasting ten near-identical stages?</b><code>foreach</code> for a list or a dictionary, <code>matrix</code> for a cross product, and <code>vars</code> for shared values pulled from a file. Generated stages are addressable with an <code>@</code> suffix — <code>featurize@tfidf</code>.</li>
  <li><b>Name the output modifiers and when you use each.</b><code>cache: false</code> puts a small text output in Git so it is diffable with no pull. <code>persist: true</code> stops DVC deleting the output before a rerun — needed for logs and checkpoints, and it means the stage is no longer purely a function of its inputs. <code>push: false</code> keeps a regenerable intermediate out of the remote. <code>remote:</code> sends an output to a specific, usually colder, remote.</li>
  <li><b>How do you depend on data that lives outside the repository?</b><code>dvc import-url</code> to track and download it with upstream version tracking, <code>--no-download</code> to record the pointer without pulling, or an external path directly in a stage's <code>deps</code> so DVC hashes the remote object. All three are reproducible; a moving path is not, so pin a dated immutable one when the result must be rebuildable later.</li>
  <li><b>Why would you use several remotes?</b>Cost, geography, and access. A hot default plus a cold archive, tiered per output with <code>remote:</code>. Or a read-only remote for contributors and fork CI. Access control lives in the storage provider; the remote definition just means everyone agrees where data is.</li>
  <li><b>How do you make <code>dvc pull</code> faster?</b>Raise <code>jobs</code> on the remote or pass <code>-j</code>. In CI, cache <code>.dvc/cache</code> keyed on <code>dvc.lock</code> so an unchanged pipeline pulls almost nothing. And co-locate the runner with the bucket — cross-region egress often costs more than the compute.</li>
  <li><b>What does <code>verify true</code> do and why would you set it?</b>It re-hashes objects after download and refuses ones that do not match. Without it, a corrupted or maliciously replaced object is restored silently and reported as success, because the pointer records what DVC <em>expected</em> and nothing checks the bytes.</li>
  <li><b>How do you run twenty experiments in parallel without them clobbering each other?</b>Queue them and use <code>--run-all --jobs N</code>. Each queued experiment executes in an isolated temporary workspace, so four workers do not all write <code>models/model.pkl</code>. Then <code>dvc exp show --only-changed --sort-by</code> to compare, and <code>dvc exp branch</code> to promote.</li>
  <li><b>Where does the disk go during a sweep?</b>Every experiment is a Git ref under <code>refs/exps/</code> plus its own cached outputs. Thirty runs of a 2 GB model is 60 GB. Nothing cleans up automatically: <code>dvc exp remove</code> drops the refs, then <code>dvc gc --all-commits</code> reclaims the space.</li>
  <li><b>What does DVCLive add over writing <code>metrics.json</code> at the end?</b>Per-step logging, so you get curves rather than endpoints. That is what lets you see overfitting after epoch twelve rather than only that the final score was worse. It writes into a layout DVC understands, so wiring is two entries in <code>dvc.yaml</code>, and framework callbacks exist for the common trainers.</li>
  <li><b>How do you enforce that the pipeline is actually reproducible?</b>Run <code>dvc repro</code> in CI and then assert <code>dvc status</code> is empty as a required check. That fails the pull request when someone edited a script or a parameter without rerunning, so <code>dvc.lock</code> cannot drift from the code. Without that gate, "reproducible" is a claim.</li>
  <li><b>Why does <code>dvc metrics diff origin/main</code> return nothing in CI?</b>A shallow clone. <code>actions/checkout</code> defaults to depth 1, so the other revision is not present and the diff is silently empty. <code>fetch-depth: 0</code> fixes it.</li>
  <li><b>Monorepo or separate repositories?</b>Decide on ownership. One team owning everything favours a monorepo: one cache, one remote, maximum deduplication, cross-project dependencies as plain paths, one CI config. A dataset with its own owner and release cadence deserves its own repository, consumed with <code>dvc import --rev</code> so consumers pin explicitly.</li>
  <li><b>A stage reruns on every <code>dvc repro</code> even with no changes. Debug it.</b>Something in <code>deps</code> changes every run — a timestamped log, a generated file, a directory containing a cache. Find it with <code>dvc repro -v</code>, which prints the hash comparison and names the differing dependency.</li>
  <li><b>How do you resolve a <code>dvc.lock</code> merge conflict?</b>Never by hand. The hashes describe a run that happened; a stitched file describes one that did not, and checking it out restores inconsistent data. Take one side — usually theirs — then run <code>dvc repro</code> and commit the regenerated lock.</li>
  <li><b>One image in a 50,000-image directory changed. How do you find it?</b><code>dvc data status --granular</code>, which lists individual added, modified, and deleted files rather than reporting the whole directory as modified. That is how you discover a "changed dataset" is one corrupted file.</li>
  <li><b>What is <code>version_aware</code> and when would you use it?</b>Instead of hash-addressed object names, DVC writes files at their natural paths and relies on the bucket's own versioning for history. The bucket becomes browsable and readable by non-DVC tools — valuable when a data engineering team shares it — at the cost of cross-file deduplication.</li>
</ol>

## Final self-test

- Describe the cache layout, including what a `.dir` object contains.
- Say why MD5, and what changing the algorithm costs.
- Name what dominates `dvc add` time, and why a second add is fast.
- Give the hardlink corruption failure in two sentences.
- Say what you do with a million small files, and the three benefits.
- Name four output modifiers and one use for each.
- Explain why a moving external dependency breaks reproducibility.
- Give three ways to make `dvc pull` faster.
- Say what `verify true` prevents.
- Explain how queued experiments avoid clobbering each other.
- Say where the disk goes during a sweep, and the two-step cleanup.
- Name the CI check that makes reproducibility enforceable.
- Give the reason `dvc metrics diff` is empty in CI.
- State the correct way to resolve a `dvc.lock` conflict.

