Part two of three. At this level your pipelines run and your data is versioned, so the problems change character. They are no longer "why is my data the wrong version" but "why does CI rebuild everything", "why is `dvc add` taking twenty minutes", and "why does this reproduce locally and not in CI". Start with the error table, then the practices and practice cards underneath it.

## Common errors at this level

Cumulative — Beginner's errors still apply, and these are the ones that appear once things basically work.

| Symptom | Real cause | Fix |
|---|---|---|
| CI rebuilds everything every run | No `.dvc/cache` caching between runs | `actions/cache` keyed on `hashFiles('dvc.lock')` |
| `dvc metrics diff origin/main` is empty | Shallow clone; the other revision is absent | `fetch-depth: 0` on checkout |
| `dvc add` takes twenty minutes | Hundreds of thousands of small files | Shard into tars, Parquet, or WebDataset |
| Second `dvc add` is also slow | Hash cache invalidated by a `mtime` change | Avoid `touch`-style operations; check `.dvc/tmp` survives |
| Cache grew by 60 GB overnight | A sweep; every experiment caches its outputs | `dvc exp remove --all` then `dvc gc --all-commits` |
| Disk full mid-sweep | No disk budget for N × model size | Move the cache, or mark intermediates `push: false` |
| A tracked output was silently corrupted | Hardlink cache type plus an in-place edit | `cache.protected true`, and regenerate not edit |
| `dvc checkout` restores the wrong content | Same cause — cached history was rewritten | Same fix; verify with `dvc status` after a checkout |
| `foreach` stage cannot be targeted | Generated names use `@` | `dvc repro 'featurize@tfidf'`, quoted |
| `${…}` in `dvc.yaml` is not substituted | The value is not in `vars` or `params.yaml` | Add it to `vars`, or reference the right file and key |
| `ARG`-style value empty in a generated stage | Referencing `${item}` outside a `do:` block | Templating variables only exist inside `do:` |
| An output disappears after a rerun | Declared path cleared before the stage runs | Declare every file the stage writes, or use `persist: true` |
| A log file is truncated every run | Same — DVC clears outputs first | `persist: true` |
| `push` uploads 200 GB of intermediates | Everything is cached and pushed by default | `push: false` on regenerable outputs |
| `dvc pull` is slow on a fast link | Default transfer parallelism is conservative | `dvc remote modify origin jobs 16`, or `-j` |
| A stage reruns because of an external source | The upstream path is a moving `current/` | Import a dated, immutable path |
| `dvc update` changes nothing | Upstream genuinely unchanged, or wrong `--rev` | Check the `rev_lock` in the `.dvc` file |
| `dvc.lock` conflicts on every merge | Both branches reran the pipeline | Take one side, then `dvc repro`. Never hand-edit |
| Reproduces locally, fails in CI | Unpinned library, undeclared seed, or different data | Pin and declare the environment; compare `dvc.lock` |
| Two experiments overwrote each other's model | Ran without queueing, so no workspace isolation | `dvc exp run --queue` then `--run-all` |
| `dvc exp show` is unreadable | Every parameter column shown | `--only-changed --sort-by <metric>` |
| Monorepo `dvc repro` does nothing | Ran from the root without a target | `dvc repro projects/x/dvc.yaml` or `--all-pipelines` |
| Fork CI cannot pull data | Correct and intended | Give forks a read-only remote, not a write credential |

## The practices that pay off most

<div class="cards">
  <div class="card"><div class="icon">🧊</div><h4>Cache <code>.dvc/cache</code> in CI</h4><p>Keyed on <code>dvc.lock</code>. Turns a full re-download into almost nothing on an unchanged pipeline.</p></div>
  <div class="card"><div class="icon">🚦</div><h4>Gate on <code>dvc status</code></h4><p>An empty status as a required check. It is what makes reproducibility enforceable rather than claimed.</p></div>
  <div class="card"><div class="icon">📦</div><h4>Shard small files</h4><p>Tars or Parquet instead of a million JPEGs. Faster hashing, cheaper requests, faster data loader.</p></div>
  <div class="card"><div class="icon">🚫</div><h4><code>push: false</code> on intermediates</h4><p>If it regenerates in four minutes, do not store 200 GB of it. Usually the biggest cost saving available.</p></div>
  <div class="card"><div class="icon">🔁</div><h4>Templating over copy-paste</h4><p><code>foreach</code> and <code>matrix</code>. Ten near-identical stages become six readable lines.</p></div>
  <div class="card"><div class="icon">📈</div><h4>DVCLive for curves</h4><p>Five lines turns a final number into training dynamics you can actually explain.</p></div>
  <div class="card"><div class="icon">🧹</div><h4>Clean up after every sweep</h4><p><code>dvc exp remove --all</code> then a dry-run <code>gc</code>. Nothing happens automatically.</p></div>
  <div class="card"><div class="icon">🔐</div><h4>OIDC, not a stored key</h4><p>Nothing stored means nothing to leak, and the trust policy pins the branch.</p></div>
</div>

## Practice cards

<ol class="guide-steps">
  <li><b>Measure the sharding win</b>Generate 100,000 small files and time <code>dvc add</code>. Shard into 200 tars and time it again. Compare the two <code>.dir</code> object sizes and the object counts pushed.</li>
  <li><b>Find your invalidation point</b>Run <code>dvc repro -v</code> after a small change and read which dependency's hash differed. It is usually earlier in the graph than you assumed.</li>
  <li><b>Watch the hardlink corruption</b>On a throwaway repo, set <code>cache.type hardlink</code>, add a file, commit, then edit the file in place. Check out the old revision and confirm you get the <em>new</em> content. Then enable <code>cache.protected</code> and try again.</li>
  <li><b>Prove <code>persist</code> changes the contract</b>Add a log output, repro twice without <code>persist</code> and note it is recreated. Add <code>persist: true</code> and repro twice more.</li>
  <li><b>Budget a sweep</b>Measure <code>du -sh .dvc/cache</code>, run a four-way sweep of a large model, and measure again. Multiply by your usual sweep count per month.</li>
  <li><b>Break CI on purpose</b>Change a script without running <code>dvc repro</code>, push, and confirm the <code>dvc status</code> gate fails. That failing check is the whole value of the workflow.</li>
  <li><b>Time the CI cache</b>Run the pipeline workflow with and without the <code>.dvc/cache</code> cache step and compare wall-clock time.</li>
  <li><b>Collapse ten stages into one</b>Convert a set of near-identical stages to <code>foreach</code> and confirm <code>dvc dag</code> shows an identical graph.</li>
  <li><b>Resolve a lock conflict correctly</b>Create the conflict deliberately on two branches. Resolve it by taking one side and running <code>dvc repro</code> — not by editing the YAML.</li>
</ol>

## Making CI fast

Three changes, in order of return.

```yaml .github/workflows/pipeline.yml
- uses: actions/checkout@v4
  with: { fetch-depth: 0 }                    # 2. metrics diff needs history

- uses: actions/cache@v4                       # 1. the biggest win
  with:
    path: .dvc/cache
    key: dvc-${{ hashFiles('dvc.lock') }}
    restore-keys: dvc-

- run: dvc pull --allow-missing -j 16          # 3. transfer parallelism
- run: dvc repro
- run: test "$(dvc status --json)" = "{}"      # the gate
```

| Change | Effect |
|---|---|
| Cache `.dvc/cache` on `dvc.lock` | An unchanged pipeline pulls almost nothing |
| `fetch-depth: 0` | `metrics diff`, `params diff`, `dvc diff` against another branch work at all |
| `-j 16` or `jobs` on the remote | Multiplies transfer throughput on many small objects |
| Runner in the bucket's region | Removes cross-region egress, often the largest cost |
| `--allow-missing` | Does not fail on outputs a branch has not produced |

<div class="callout tip">
  <span class="ct">The <code>dvc status</code> gate is the point of the whole workflow</span>
  Everything else makes CI faster. That one line makes it <em>meaningful</em>: it fails the pull request when someone edited a script or a parameter without rerunning the pipeline, so <code>dvc.lock</code> cannot drift from the code it claims to describe.
</div>

## Sharding, and when to do it

`dvc add` on a directory hashes every file. Beyond roughly ten thousand files that starts to hurt, and beyond a hundred thousand it dominates everything.

```python src/shard.py
import tarfile, pathlib, itertools

files = sorted(pathlib.Path("data/raw-images").rglob("*.jpg"))
out = pathlib.Path("data/shards"); out.mkdir(parents=True, exist_ok=True)

for i in range(0, len(files), 512):
    with tarfile.open(out / f"shard-{i // 512:05d}.tar", "w") as tar:
        for f in files[i:i + 512]:
            tar.add(f, arcname=f.name)
```

```yaml dvc.yaml
stages:
  shard:
    cmd: python src/shard.py
    deps: [src/shard.py, data/raw-images]
    outs:
      - data/shards           # ~2,000 tars instead of 1,000,000 jpegs
```

| Measure | 1M JPEGs | 2K tars |
|---|---|---|
| `dvc add` time | Tens of minutes | Under a minute |
| `.dir` listing | Megabytes | Kilobytes |
| Objects transferred | 1,000,000 | 2,000 |
| Request charges | Significant | Negligible |
| Data loader | A million opens | Sequential reads |

<div class="callout warn">
  <span class="ct">Shard once, upstream of everything</span>
  Make sharding the first stage, so every downstream stage depends on shards rather than raw files. Sharding as an afterthought halfway down the pipeline means DVC still hashes the million originals on every run.
</div>

## Cache hygiene

The cache keeps every version of everything, which is the feature and the problem.

```bash
du -sh .dvc/cache                       # how big
find .dvc/cache -type f | wc -l         # how many objects
dvc cache dir                            # where
dvc cache dir --local /mnt/big/cache     # move it, machine-locally

dvc exp remove --all                     # drop experiment refs first
dvc gc --dry-run --all-commits           # then read what becomes collectable
dvc gc --all-commits                     # reclaim it
```

The order matters. Experiment outputs are reachable while their refs exist, so `gc` will not touch them — dropping the refs first is what makes the space collectable.

| Flag | Keeps data needed by | Risk |
|---|---|---|
| `--workspace` (default) | The current checkout only | **Deletes every other branch's data** |
| `--all-branches` | Every branch | Tags and detached commits lost |
| `--all-tags` | Every tag | Branch-only data lost |
| `--all-commits` | Every commit | The safest; usually what you want |
| `--cloud` | Adds the remote to the target | **Shared, and not recoverable without versioning** |

<div class="callout tip">
  <span class="ct">A shared cache pays for itself on one machine</span>
  Several projects using the same datasets can share one cache directory: <code>dvc cache dir --local /shared/dvc-cache</code>. Content addressing means identical files are stored once across all of them. Use <code>--local</code> so the path stays out of the committed config.
</div>

## "Reproduces locally, not in CI"

Five differences, roughly in the order they are the answer.

| Difference | How to confirm |
|---|---|
| Different data | Compare `dvc.lock` hashes between your run and CI's |
| Unpinned library versions | Print `pip freeze` in both; then pin and declare the lock file in `deps` |
| Undeclared randomness | Seed everything: Python, NumPy, the framework, and any shuffling |
| Undeclared input | Something the script reads that is not in `deps` — `dvc dag` versus the code |
| Different hardware | GPU non-determinism, or a different BLAS. Pin the container digest |

```bash
# In both environments
dvc status
python -c "import sklearn, numpy; print(sklearn.__version__, numpy.__version__)"
sha256sum requirements.lock
git rev-parse HEAD
```

<div class="callout warn">
  <span class="ct"><code>dvc.lock</code> does not pin your environment</span>
  It pins your data and your code. The Python version, the resolved wheels, the CUDA driver, and the container image are all outside it. Add a hash-pinned lock file and the Dockerfile to a stage's <code>deps</code> so an environment change invalidates the stage — otherwise "reproducible" stops at the language boundary.
</div>

## Experiment queue hygiene

```bash
dvc exp run --queue -S train.max_depth=4,8,16,24
dvc exp run --run-all --jobs 4          # isolated temp workspaces
dvc queue status                         # queued / running / done
dvc queue logs exp-a1b2c                 # a specific run's output
dvc queue stop                           # after the current tasks finish
dvc queue kill exp-a1b2c                 # a specific run, now
dvc queue remove --all                   # clear the queue

dvc exp show --only-changed --sort-by f1 --sort-order desc
dvc exp show --csv > results.csv
dvc exp branch exp-a1b2c deeper-trees    # promote
dvc exp push origin exp-a1b2c            # share
dvc exp remove --all                     # then gc
```

| Habit | Why |
|---|---|
| Always `--queue` for more than one run | Isolated workspaces; no clobbering |
| `--jobs` no higher than your GPU or memory allows | Four workers on one GPU is slower than one |
| `--only-changed` when reading results | Otherwise every constant parameter is a column |
| Export to CSV for anything you will discuss | `dvc exp show` is for the terminal, not a document |
| Remove and `gc` after every sweep | Nothing cleans up automatically |
| Commit the code before sweeping | Otherwise two runs differ by uncommitted changes |

## Habits worth adopting now

**Declare the dependency lock file in `deps`.** `requirements.lock` or `poetry.lock` with hashes. It is the difference between reproducing the code and reproducing the run.

**Prefer dated immutable external paths.** `exports/2024-05-01/events.parquet`, never `exports/current/`.

**Put `jobs` in `.dvc/config`.** Everyone gets the faster transfers, not just whoever remembered the flag.

**Set `verify true` on remotes you do not fully control.** It costs download time and catches corruption instead of restoring it.

**One responsibility per stage.** A stage that prepares *and* trains reruns training when only preparation changed.

**Write the metric into the commit message.** `git log --oneline` becomes a results log.

```yaml dvc.yaml
stages:
  train:
    cmd: python src/train.py
    deps:
      - src/train.py
      - src/model.py                     # imports count
      - requirements.lock                # the environment is a dependency
      - data/features.pkl
    params: [train.n_estimators, train.max_depth]
    outs:
      - models/model.pkl
      - logs/train.log:
          persist: true
    metrics:
      - dvclive/metrics.json:
          cache: false
    plots:
      - dvclive/plots/metrics:
          x: step
          cache: false
```

**Senior tips go further:** the hardening pass every remote should get, verifying controls rather than trusting them, cost governance, incident playbooks for a deleted remote and an unreproducible model, running DVC as a platform, and the erasure problem.
