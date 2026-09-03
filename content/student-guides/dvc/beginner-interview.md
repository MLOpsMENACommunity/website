Part one of three. A fast review of **everything in the Beginner Detailed track**, in about twenty-five minutes. Fast review first, common questions at the end. Mid-level reviews this plus its own material; Senior reviews all three.

## The thirty-second answer

> DVC is version control for data and machine-learning pipelines, built on top of Git. Instead of committing large files, DVC stores a small text pointer containing a content hash in Git and keeps the actual bytes in a remote such as S3. One `git checkout` then restores the exact code, and `dvc checkout` restores the exact data that belongs to it — so a commit reproduces a result rather than merely describing one.

Then add the sentence that shows you have used it: *"the part people underestimate is `dvc.lock` — it records the hash of every input and output from the last successful run, which is how `dvc repro` reruns only the stages whose inputs actually changed."*

## The model

<div class="flow">
  <div class="node">CODE<small>in Git</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">POINTERS<small>.dvc files, in Git</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">CACHE<small>.dvc/cache, by hash</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">REMOTE<small>S3, GCS, SSH</small></div>
</div>

| Term | Say this |
|---|---|
| **`.dvc` file** | A small text pointer: hash, size, path. Committed to Git |
| **Cache** | `.dvc/cache`, content-addressed local storage. Gitignored |
| **Remote** | Shared storage the cache pushes to and pulls from |
| **`dvc.yaml`** | The pipeline: stages with `cmd`, `deps`, `outs`, `params` |
| **`dvc.lock`** | What actually ran — every input and output hash. Committed |
| **Stage** | One step: a command plus declared inputs and outputs |
| **`params.yaml`** | Declared hyperparameters, so a config change invalidates a stage |
| **Metrics / plots** | Small numbers and curves, usually `cache: false` so they live in Git |
| **Experiment** | A cheap, uncommitted run under `refs/exps/`, comparable in a table |

## Why not just Git?

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Git plus DVC</h4>
    <ul>
      <li>Repository stays small — pointers are hundreds of bytes</li>
      <li>Data in cheap object storage</li>
      <li>Content-addressed, so identical files stored once</li>
      <li>One commit identifies code <b>and</b> data</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Git alone</h4>
    <ul>
      <li>Full history of every large binary, forever</li>
      <li>Every clone downloads all of it</li>
      <li>No deduplication of near-identical files</li>
      <li>Git LFS helps with size but not with pipelines or metrics</li>
    </ul>
  </div>
</div>

Know the follow-up: *"why not Git LFS?"* LFS solves the size problem and nothing else — no pipelines, no dependency graph, no metrics, no experiments, and it is tied to your Git host rather than to storage you choose.

## The everyday commands

```bash
dvc init                          # scaffold in an existing Git repo
dvc add data/raw.csv              # track a file you did not generate
dvc status                        # working files versus pointers
dvc status -c                     # local cache versus remote
dvc checkout                      # restore working files from the cache
dvc push / dvc pull / dvc fetch   # cache ↔ remote
dvc repro                         # run whatever is out of date
dvc dag                           # the dependency graph
dvc metrics show / diff           # the numbers, and how they moved
dvc plots show / diff             # curves, rendered to HTML
dvc exp run / show / apply        # experiments
dvc gc --dry-run --all-commits    # what cleanup would delete
dvc doctor                        # version, platform, available remotes
```

The Git parallel is exact, and stating it is the fastest way to show you understand the model:

| Git | DVC | Moves |
|---|---|---|
| `git add` | `dvc add` | Working file → tracked |
| `git commit` | commit the `.dvc` file | Pointer → history |
| `git push` | `dvc push` | Cache → remote |
| `git pull` | `dvc pull` | Remote → cache → workspace |
| `git checkout` | `dvc checkout` | History → working files |
| `git status` | `dvc status` | What differs |

## What `dvc add` actually does

```bash
dvc add data/raw.csv
```

```yaml data/raw.csv.dvc
outs:
- md5: 8f2c4b19e0a7d3f1c6b8a2e4d7091f3b
  size: 1048576
  hash: md5
  path: raw.csv
```

Four things happen, and being able to list them is the core question at this level:

<ol class="guide-steps">
  <li><b>Hash the contents</b>MD5 by default, which is why <code>dvc add</code> on a large file is I/O-bound.</li>
  <li><b>Move it to the cache</b><code>.dvc/cache/files/md5/8f/2c4b…</code> — the first two characters shard the directory.</li>
  <li><b>Write the pointer</b>The <code>.dvc</code> file, which you commit to Git.</li>
  <li><b>Add a <code>.gitignore</code> entry</b>So Git never tries to store the data itself.</li>
</ol>

The cache is **content-addressable**: identical files share one entry, and every version you have ever added is still there until you garbage-collect. A directory gets a `.dir` hash — the hash of a JSON listing mapping each file to its own hash — so individual files inside it are still deduplicated.

<div class="callout warn">
  <span class="ct">If the data file shows up in <code>git status</code>, something is wrong</span>
  A clean <code>git status</code> after <code>dvc add</code> is the signal it worked. The file appearing means the <code>.gitignore</code> entry is missing or was edited — and committing the file to both Git and DVC defeats the whole purpose.
</div>

## Time travel, in two commands

```bash
git checkout HEAD~1 data/raw.csv.dvc      # move the pointer
dvc checkout data/raw.csv                  # make the file match it
```

**`git checkout` moves pointers; `dvc checkout` moves data.** Skip the second and `dvc status` reports the mismatch immediately. `dvc install` adds Git hooks that run `dvc checkout` for you after every `git checkout`, which removes the most common source of "my data is the wrong version".

If the cache does not have that version, `dvc checkout` fails and you need `dvc pull` — which is exactly the "missing cache files" error people hit when the data was never pushed.

## Configuration: two files

| File | Committed | For |
|---|---|---|
| `.dvc/config` | **Yes** | Remote URLs, cache type — shared truth |
| `.dvc/config.local` | **No** (gitignored) | Credentials, machine-specific paths |

```bash
dvc remote add -d storage s3://bucket/dvc                # → config, committed
dvc remote modify --local storage access_key_id AKIA…    # → config.local, ignored
dvc cache dir /mnt/big/cache                              # a bigger disk
```

**Credentials never belong in `.dvc/config`.** Use the provider's own mechanism — environment variables, an IAM role, `gcloud auth`, an SSH agent — or `--local` if it must be a file.

## Pipelines

```yaml dvc.yaml
stages:
  prepare:
    cmd: python src/prepare.py
    deps: [src/prepare.py, data/raw.csv]
    params: [prepare.test_size]
    outs: [data/train.csv, data/test.csv]

  train:
    cmd: python src/train.py
    deps: [src/train.py, data/train.csv]
    params: [train.n_estimators, train.max_depth]
    outs: [models/model.pkl]

  evaluate:
    cmd: python src/evaluate.py
    deps: [src/evaluate.py, models/model.pkl, data/test.csv]
    metrics:
      - metrics.json:
          cache: false
```

| Key | Means |
|---|---|
| `cmd` | The command to run — any executable |
| `deps` | Inputs. If any hash changes, the stage is out of date |
| `outs` | Outputs. DVC caches and gitignores them |
| `params` | Keys from `params.yaml`; a value change invalidates the stage |
| `metrics` / `plots` | Small results, usually `cache: false` so they live in Git |

**Never `dvc add` a pipeline output.** `outs` already tracks it, and DVC will refuse — two mechanisms cannot own the same file.

## `dvc.lock` and how `repro` decides

```yaml dvc.lock
stages:
  train:
    cmd: python src/train.py
    deps:
    - path: data/train.csv
      md5: 8f2c4b19e0a7d3f1c6b8a2e4d7091f3b
      size: 1048576
    outs:
    - path: models/model.pkl
      md5: 9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b
```

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>1</span><strong>Build the graph</strong><small>Dependency order comes from matching <code>outs</code> to <code>deps</code> across stages.</small></div>
  <div class="guide-timeline-item"><span>2</span><strong>Hash current inputs</strong><small>Compare each against <code>dvc.lock</code>.</small></div>
  <div class="guide-timeline-item"><span>3</span><strong>Skip or run</strong><small>All hashes match and outputs exist → skip. Otherwise run <code>cmd</code>.</small></div>
  <div class="guide-timeline-item"><span>4</span><strong>Cascade</strong><small>A stage that ran produces new output hashes, so downstream stages are now stale too.</small></div>
  <div class="guide-timeline-item"><span>5</span><strong>Rewrite the lock</strong><small>New hashes recorded; outputs saved to the cache.</small></div>
</div>

**Always commit `dvc.lock`.** Treat it exactly like `package-lock.json`: generated, never hand-edited, always committed. Without it a colleague rebuilds everything and cannot verify they got your result.

## Metrics, plots, and `cache: false`

```bash
dvc metrics show
dvc metrics diff HEAD~1
dvc plots diff HEAD~1 --open
```

| Output kind | Tracked by | For |
|---|---|---|
| `outs` | DVC cache | Models, datasets, anything large |
| `metrics` + `cache: false` | Git | Small JSON of scores |
| `plots` + `cache: false` | Git | Small CSV/JSON of curves |

`cache: false` on a metrics file means `dvc metrics diff` can compare any two commits **without downloading anything**. Caching a 200-byte JSON forces a `dvc pull` to read a number, which is the wrong trade.

## Experiments

```bash
dvc exp run --set-param train.max_depth=16     # no commit, no branch
dvc exp run --queue -S train.max_depth=4,8,16
dvc exp run --run-all --jobs 3
dvc exp show --only-changed
dvc exp apply exp-a1b2c                         # promote the winner
dvc exp remove --queued
```

An experiment is a hidden commit under `refs/exps/` plus cached outputs. It is cheap to create, cheap to discard, and comparable in one table — which is why you stop committing every attempt.

## Sharing data across projects

| | `dvc get` | `dvc import` |
|---|---|---|
| Downloads | Yes | Yes |
| Records the source | No | Yes, in a `.dvc` file |
| Pins a revision | No | Yes, `rev_lock` |
| Updatable | Download again by hand | `dvc update` |

```bash
dvc list https://github.com/org/data-registry
dvc get https://github.com/org/data-registry data/train.csv        # anonymous copy
dvc import --rev v1.2.0 https://github.com/org/data-registry data/train.csv
dvc update data/train.csv.dvc
```

## Garbage collection

```bash
dvc gc --dry-run --all-commits    # always dry-run first
dvc gc --workspace                # keep only the current checkout's data — aggressive
dvc gc --all-commits              # keep everything reachable from any commit — safest
dvc gc --cloud                    # ALSO deletes on the remote — dangerous
```

The flag chooses **which revisions count as in use**. The default is `--workspace`, which on a repository with ten branches deletes the data for nine of them. Add `--cloud` and you have done it to the team's remote, where it is not recoverable.

## The traps, and why they happen

Three ideas explain nearly every beginner failure: **pointers and data are separate**, **the cache is local until you push**, and **DVC only knows what you declared**.

| Symptom | Cause | Fix |
|---|---|---|
| Data is the wrong version after `git checkout` | Skipped `dvc checkout` | Run it, or `dvc install` the hooks |
| `dvc pull` says missing cache files | Never pushed | `dvc push` where it was produced |
| `output 'x' is already tracked` | `dvc add` on a pipeline output | Remove the `.dvc`; `outs` owns it |
| A stage never reruns after a code change | The script is not in `deps` | Add it |
| A parameter change is ignored | Not declared in `params` | Declare it |
| The data file appears in `git status` | Missing `.gitignore` entry | Re-run `dvc add` |
| `dvc.lock` conflicts on every merge | Both branches reran the pipeline | Take one side, then `dvc repro` |
| `URL is not supported` | Missing the remote driver | `pip install "dvc[s3]"` |
| Disk full | The cache keeps every version | `dvc gc --dry-run --all-commits` first |

## Common interview questions

<ol class="guide-steps">
  <li><b>What is DVC and what problem does it solve?</b>It versions data and ML pipelines on top of Git. Large files stay out of Git; a small hash-bearing pointer goes in instead, and the bytes live in object storage. The result is that one commit identifies both the code and the exact data, so "which data produced this model?" becomes a lookup rather than an investigation.</li>
  <li><b>Why not just commit data to Git? Why not Git LFS?</b>Git stores full history of every version, so a 2 GB file changed ten times is 20 GB in every clone forever. LFS fixes the size problem but gives you nothing else — no pipelines, no dependency graph, no metrics, no experiments — and ties storage to your Git host.</li>
  <li><b>What is inside a <code>.dvc</code> file?</b>A hash, a size, and a path — a few hundred bytes. It is the pointer Git versions; DVC uses the hash to find the content in the cache or the remote.</li>
  <li><b>Walk me through what <code>dvc add</code> does.</b>Hashes the file, moves it into the content-addressed cache under that hash, writes the <code>.dvc</code> pointer, and adds a <code>.gitignore</code> entry so Git ignores the data. Then you commit the pointer.</li>
  <li><b>How do you restore an old version of a dataset?</b><code>git checkout</code> the <code>.dvc</code> file to that revision, then <code>dvc checkout</code> to make the working file match. Two commands, because Git moves pointers and DVC moves data. <code>dvc install</code> adds hooks that automate the second.</li>
  <li><b>What is the difference between <code>dvc add</code> and <code>outs</code> in <code>dvc.yaml</code>?</b><code>dvc add</code> is for inputs you did not generate — a raw dataset someone handed you. <code>outs</code> is for files a stage produces. Never both on the same file; DVC refuses because two mechanisms would own it.</li>
  <li><b>How does <code>dvc repro</code> know what to rerun?</b>It compares the current hash of every declared dependency against the hashes recorded in <code>dvc.lock</code> from the last successful run. Any mismatch, or a missing output, means the stage runs — and that stage's new outputs cascade to everything downstream.</li>
  <li><b>Why must <code>dvc.lock</code> be committed?</b>It is the record of which exact inputs produced which exact outputs. Without it, a colleague cannot verify they reproduced your result, and <code>dvc repro</code> rebuilds everything. Same role as <code>package-lock.json</code>: generated, never hand-edited, always committed.</li>
  <li><b>How do you resolve a <code>dvc.lock</code> merge conflict?</b>Never by hand. The hashes describe a run that actually happened, so stitching two halves together produces a lock describing a run that never occurred. Take one side, then run <code>dvc repro</code> and commit the regenerated file.</li>
  <li><b>Why do parameters need declaring in <code>params</code>?</b>Otherwise DVC sees no dependency change when you edit <code>params.yaml</code> and skips the stage — a silent staleness. Declaring the key makes a value change invalidate the stage exactly as a code change would.</li>
  <li><b>Why do metrics use <code>cache: false</code>?</b>They are small text, so committing them to Git means <code>dvc metrics diff</code> can compare any two revisions instantly with no download. Putting them in the cache would require a <code>dvc pull</code> just to read a number.</li>
  <li><b>How does a colleague get your data?</b><code>git clone</code>, then <code>dvc pull</code>. The clone brings the pointers and <code>dvc.lock</code>; the pull brings the bytes from the remote into the cache and then into the workspace.</li>
  <li><b>Where do credentials go?</b>Not in <code>.dvc/config</code>, which is committed. Use the provider's own credential chain — environment variables, an IAM role, <code>gcloud auth</code>, an SSH agent — or <code>.dvc/config.local</code>, which is gitignored, if it must be a file.</li>
  <li><b>What is the DVC cache, and why does it grow?</b>Content-addressed local storage under <code>.dvc/cache</code>. Every version you have ever added is a separate object, which is exactly what makes time travel possible — and why you eventually need <code>dvc gc</code>.</li>
  <li><b>What does <code>dvc gc</code> do, and what is the risk?</b>Deletes cached objects that are not reachable from the revisions you name. The default <code>--workspace</code> only considers the current checkout, so on a multi-branch repo it deletes most of your data. Always <code>--dry-run</code> first, prefer <code>--all-commits</code>, and treat <code>--cloud</code> as destructive because it hits the shared remote.</li>
  <li><b><code>dvc get</code> versus <code>dvc import</code>?</b><code>get</code> downloads a file and records nothing — an anonymous copy. <code>import</code> downloads it and writes a <code>.dvc</code> file naming the source repository, path, and pinned revision, so it becomes a versioned dependency you can later <code>dvc update</code>.</li>
  <li><b>What is a DVC experiment and why not just commit?</b>A lightweight hidden commit under <code>refs/exps/</code> with its own cached outputs. It needs no branch and no commit, several can be queued and run in parallel, and <code>dvc exp show</code> compares them in one table. Committing every attempt instead pollutes history with dead ends nobody can navigate.</li>
  <li><b>How would you make an existing project reproducible?</b><code>dvc init</code>, <code>dvc add</code> the raw inputs, express the scripts as stages in <code>dvc.yaml</code> with every input declared in <code>deps</code>, move hyperparameters into <code>params.yaml</code>, write metrics with <code>cache: false</code>, then <code>dvc repro</code> until a second run reports up to date. The acceptance test is a fresh clone that pulls and reports up to date without rebuilding.</li>
  <li><b>What is the first command when something is wrong?</b><code>dvc status</code>, which names the stage and the specific dependency. Then <code>dvc status -c</code> to compare against the remote, which answers "my colleague cannot pull my data" — you never pushed it.</li>
  <li><b>Which storage backends does DVC support?</b>S3 and anything S3-compatible such as MinIO, Google Cloud Storage, Azure Blob, SSH, HDFS, WebDAV, HTTP for read-only, and a plain local or network directory. The driver comes from a pip extra, which is why <code>pip install dvc</code> alone fails on an S3 URL.</li>
</ol>

## Sixty-second self-test

- Give the thirty-second answer, then the sentence that shows you have used it.
- Say what a `.dvc` file contains and roughly how big it is.
- List the four things `dvc add` does.
- Name the two commands to restore an old dataset version, and why there are two.
- Explain how `dvc repro` decides what to run.
- Say why `dvc.lock` must be committed and never hand-edited.
- Explain why a parameter must be declared in `params`.
- Say why metrics use `cache: false`.
- Give the difference between `dvc get` and `dvc import`.
- Say what `dvc gc --workspace` deletes, and what makes `--cloud` dangerous.
- Name where credentials belong, and where they must not go.
- State the first two commands to run when something is wrong.
