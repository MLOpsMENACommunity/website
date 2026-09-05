This is part one of three. It covers **everything you need to do real work with DVC**, not a teaser. By the end you can version a dataset, reproduce a pipeline, share data with a colleague through remote storage, compare experiment metrics, and answer "which data produced this model?" with a commit hash. Mid-level and Senior take the same topics further; nothing here is thrown away.

Each section ends with a **Try it** task. Do them as you go. They take a few minutes each, and these ideas only stick once you have watched `dvc repro` skip a stage it did not need to run.

## The problem DVC solves: code in Git, data elsewhere

Git is excellent at versioning text and hopeless at versioning data. Commit a 2 GB training set and you have permanently added 2 GB to every clone of that repository, forever, because Git stores full history. Change one row and you add another 2 GB.

So teams do the obvious thing and keep data out of Git. Then the real problem starts: the model in production was trained on *something*, and nobody can say what. The notebook says `data/train_v3_final_fixed.csv`, that file is on a laptop that was reimaged, and the person who made it left.

<div class="flow">
  <div class="node">CODE<small>in Git</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">DATA<small>in a remote</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">POINTERS<small>in Git</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">ONE COMMIT<small>reproduces both</small></div>
</div>

**DVC's central trick is to store a small text pointer in Git and the actual bytes somewhere cheap.** The pointer file is a few hundred bytes and contains a content hash. Git versions the pointer; DVC moves the bytes. One `git checkout` then brings back the exact code *and* tells DVC which data belongs to it.

That single idea gives you four things, and they are the reason DVC exists rather than a bespoke script:

<div class="cards">
  <div class="card"><div class="icon">🔗</div><h4>Data tied to commits</h4><p>Every commit records which dataset and which model it used. "Which data produced this?" becomes a lookup.</p></div>
  <div class="card"><div class="icon">🔁</div><h4>Reproducible pipelines</h4><p>Declare stages and dependencies once. DVC reruns only what changed.</p></div>
  <div class="card"><div class="icon">☁️</div><h4>Shared storage</h4><p>Push data to S3, GCS, Azure, or an SSH box. A colleague clones and pulls, and has your exact files.</p></div>
  <div class="card"><div class="icon">📊</div><h4>Comparable experiments</h4><p>Metrics and parameters are versioned alongside the code, so comparing two runs is a command, not archaeology.</p></div>
</div>

You need little to follow along: Python, Git, and a folder. A tiny CSV and a five-line training script are the best place to start, because a broken pipeline costs you nothing.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Find a project of yours with data in it. Run <code>git count-objects -vH</code> and note the <code>size-pack</code>.</li>
    <li>Look for files matching <code>*_final*</code>, <code>*_v2*</code>, <code>*_backup*</code>, or a date in the name. Count them.</li>
    <li>Pick the newest model artifact you have and try to name, precisely, the exact file that trained it.</li>
  </ol>
  <em>either a repository bloated by data, or a folder full of manually versioned filenames, usually both. That third question is the one DVC turns from an archaeology exercise into a command.</em>
</div>

## Install and initialise

DVC is a Python package, and it sits *on top of* Git rather than replacing it.

```bash
pip install "dvc[s3]"        # or dvc[gs], dvc[azure], dvc[ssh], dvc[all]
dvc --version
```

The bracketed extra pulls in the driver for your remote storage. Plain `pip install dvc` works fine for local experimentation and then fails with a confusing "URL is not supported" the moment you configure an S3 remote, so install the extra you need up front.

```bash
git init                     # DVC needs a Git repository
dvc init
git status
```

`dvc init` creates a small amount of scaffolding and stages it for you:

| Path | Purpose |
|---|---|
| `.dvc/config` | Your project's DVC configuration: remotes, cache settings. **Committed** |
| `.dvc/.gitignore` | Keeps DVC's internal cache and temp files out of Git |
| `.dvcignore` | Optional; excludes paths from DVC's own scanning, like `.gitignore` |
| `.dvc/cache/` | Where content lands locally, addressed by hash. **Not committed** |

```bash
git commit -m "Initialise DVC"
```

<div class="callout note">
  <span class="ct">DVC does not replace Git. It needs it</span>
  Every DVC operation assumes a Git repository underneath. DVC writes small text files; Git versions them. If you find yourself wondering "do I <code>git add</code> this?", the answer is almost always yes for anything DVC creates that is not inside <code>.dvc/cache</code>, and DVC tells you the exact command to run.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Create a fresh folder, run <code>git init</code>, then <code>dvc init</code>.</li>
    <li>Run <code>git status</code> and read what DVC staged for you.</li>
    <li>Open <code>.dvc/.gitignore</code> and note that <code>/cache</code> is listed.</li>
    <li>Commit, then run <code>dvc doctor</code> and read the output.</li>
  </ol>
  <em>a clean initialisation with three or four staged files, and a <code>.gitignore</code> that already excludes the cache. <code>dvc doctor</code> prints your platform, version, and which remote drivers are available, worth knowing about now because it is the first thing to run when something behaves oddly.</em>
</div>

## Your first tracked dataset, in four commands

This is the core loop. Four commands, and afterwards your data is versioned.

```bash
mkdir -p data
# put a file in data/raw.csv — any size, even 10 rows

dvc add data/raw.csv
git add data/raw.csv.dvc data/.gitignore
git commit -m "Track the raw dataset"
```

Now look at what happened, because this is the whole mental model:

```bash
cat data/raw.csv.dvc
```

```yaml data/raw.csv.dvc
outs:
- md5: 8f2c4b19e0a7d3f1c6b8a2e4d7091f3b
  size: 1048576
  hash: md5
  path: raw.csv
```

The `.dvc` file holds a hash, a size, and a path. **The file itself is not in Git**. `data/.gitignore` now contains `/raw.csv`, which DVC wrote for you, so Git will never try to store it.

```bash
cat data/.gitignore          # /raw.csv
git status                   # clean; the CSV is ignored
```

The bytes went into DVC's cache, filed under that hash:

```bash
ls .dvc/cache/files/md5/8f/2c4b19e0a7d3f1c6b8a2e4d7091f3b
```

<div class="flow">
  <div class="node">data/raw.csv<small>your working copy</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">.dvc/cache<small>filed by hash</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">raw.csv.dvc<small>the pointer, in Git</small></div>
</div>

| Command | Does |
|---|---|
| `dvc add PATH` | Hash the file, move it to the cache, write a `.dvc` pointer, add to `.gitignore` |
| `dvc status` | Compare working files against the pointers |
| `dvc checkout` | Restore working files from the cache to match the pointers |
| `dvc remove PATH.dvc` | Stop tracking; removes the pointer and the `.gitignore` entry |

<div class="callout warn">
  <span class="ct">Do not <code>git add</code> the data file itself</span>
  If you ever see the data file appear in <code>git status</code>, something is wrong, usually a missing or edited <code>.gitignore</code> entry. Committing the file to Git as well as DVC defeats the whole purpose and doubles your storage. <code>git status</code> being clean after <code>dvc add</code> is the signal that it worked.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Create <code>data/raw.csv</code> with a handful of rows and run <code>dvc add data/raw.csv</code>.</li>
    <li>Read the three things DVC changed: the new <code>.dvc</code> file, the new <code>.gitignore</code> entry, and the cache directory.</li>
    <li>Commit the pointer and confirm <code>git status</code> is clean.</li>
    <li>Now check the sizes: <code>du -h data/raw.csv .dvc/cache</code> and <code>wc -c data/raw.csv.dvc</code>.</li>
  </ol>
  <em>a few hundred bytes in Git standing in for however large your file is. Seeing those two numbers side by side is the moment the design clicks.</em>
</div>

## Inside the cache: content addressing and links

Understanding this saves you from a whole category of confusion later, and it takes two minutes.

DVC's cache is **content-addressable**: a file's location is derived from the hash of its contents. Two identical files, whatever they are called, occupy one cache entry. Change one byte and you get a different hash and a new entry.

```bash
dvc add data/raw.csv         # hash A
echo "one more row" >> data/raw.csv
dvc add data/raw.csv         # hash B — a new entry; A is still there
```

That has an important consequence: **the cache accumulates.** Every version you have ever added is still on disk until you clean it up, which is what makes going back in time possible, and also why the cache grows.

By default DVC does not copy the file into your workspace, it **links** it from the cache, so you are not storing two copies:

| Link type | Behaviour | Default on |
|---|---|---|
| `reflink` | Copy-on-write; fast, safe, and space-efficient | APFS, Btrfs, XFS where supported |
| `copy` | A real second copy. Safe, uses double the space | The fallback everywhere |
| `hardlink` / `symlink` | One inode, no extra space, but **editing in place corrupts the cache** | Opt-in |

```bash
dvc config cache.type reflink,copy      # try reflink, fall back to a copy
dvc config core.check_link_support true
```

<div class="callout warn">
  <span class="ct">Never edit a file in place under hardlink or symlink caching</span>
  With those link types your working file and the cache entry are the same bytes on disk, so editing the file silently rewrites cached history for every version that shared it. If you enable them, treat working files as read-only and always regenerate rather than edit. <code>reflink,copy</code> is the safe default and what you want unless you have measured a reason otherwise.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run <code>dvc add</code> on a file, note the md5 in the <code>.dvc</code> file, then append one line and <code>dvc add</code> again.</li>
    <li>Compare the two hashes, then look in <code>.dvc/cache/files/md5/</code> and confirm both entries exist.</li>
    <li>Copy the file to a second name and <code>dvc add</code> that too. Check whether the cache grew.</li>
    <li>Run <code>dvc config cache.type</code> and then <code>dvc doctor</code> to see which link types your filesystem supports.</li>
  </ol>
  <em>two cache entries for two versions, but only one for two identical files under different names. That deduplication is free, and it is why adding the same dataset in three projects on one machine costs you one copy with a shared cache.</em>
</div>

## Going back in time: two commands, in order

This is the payoff. Do it on purpose early so you trust it.

```bash
# Make a second version and commit it
echo "new rows" >> data/raw.csv
dvc add data/raw.csv
git commit -am "Dataset v2"

# Travel back
git checkout HEAD~1 data/raw.csv.dvc
dvc checkout data/raw.csv
head data/raw.csv                     # v1 is back
```

Two commands, and the order matters. **`git checkout` moves the pointer; `dvc checkout` makes the working file match it.** Miss the second step and you have v1's pointer with v2's file on disk, which `dvc status` will tell you about immediately.

```bash
dvc status
# data/raw.csv.dvc:
#         changed outs:
#                 modified:           data/raw.csv
```

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4><code>git checkout</code></h4>
    <ul>
      <li>Moves code and <code>.dvc</code> pointers</li>
      <li>Instant, because pointers are tiny</li>
      <li>Leaves data files untouched</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4><code>dvc checkout</code></h4>
    <ul>
      <li>Moves data files to match the pointers</li>
      <li>Reads from the local cache</li>
      <li>Fails if the cache does not have that version, so then you need <code>dvc pull</code></li>
    </ul>
  </div>
</div>

<div class="callout tip">
  <span class="ct">Install the Git hooks and stop thinking about it</span>
  <code>dvc install</code> adds Git hooks that run <code>dvc checkout</code> after <code>git checkout</code>, and warn you about unpushed data before <code>git push</code>. It removes the most common source of "why is my data the wrong version?" A forgotten second command.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Create three versions of a file, committing after each <code>dvc add</code>.</li>
    <li>Use <code>git log --oneline</code> to find the first commit, then <code>git checkout &lt;sha&gt; data/raw.csv.dvc</code>.</li>
    <li>Run <code>dvc status</code> <em>before</em> <code>dvc checkout</code> and read what it reports.</li>
    <li>Run <code>dvc checkout</code>, confirm the file matches v1, then return to the latest with <code>git checkout HEAD data/raw.csv.dvc &amp;&amp; dvc checkout</code>.</li>
    <li>Now run <code>dvc install</code> and repeat step two, and notice you no longer need step four.</li>
  </ol>
  <em>the intermediate state where the pointer and the file disagree, which <code>dvc status</code> names precisely. Seeing that state once means you will recognise it instantly, and <code>dvc install</code> means you rarely have to.</em>
</div>

## Remote storage: where the bytes live

So far everything lives on your machine. A remote is where the bytes go so a colleague (or a CI runner, or a training box) can get them.

```bash
# Local folder: perfect for learning, and genuinely useful for a shared NAS
dvc remote add -d myremote /tmp/dvc-storage

# S3
dvc remote add -d storage s3://my-bucket/dvc-store

# Google Cloud Storage
dvc remote add -d storage gs://my-bucket/dvc-store

# Azure Blob
dvc remote add -d storage azure://my-container/dvc-store

# Any SSH box
dvc remote add -d storage ssh://user@host/srv/dvc-store

git add .dvc/config
git commit -m "Configure the default DVC remote"
```

The `-d` makes it the default, so `dvc push` and `dvc pull` need no arguments. The configuration lands in `.dvc/config`, which **is** committed. It contains the location, not the credentials.

```bash
dvc push                     # upload cached content to the remote
dvc pull                     # download what the current pointers need
dvc fetch                    # download to the cache without touching the workspace
dvc status -c                # compare local cache against the remote
```

Those four are the whole workflow, and the mental model mirrors Git exactly:

<div class="guide-arch" style="--arch-cols:4">
  <div class="arch-lane" style="--lane-cols:2">
    <span class="arch-label">versioned in git: small, diffable, reviewable</span>
    <div class="arch-node" data-kind="entry"><b>Code &amp; <code>dvc.yaml</code></b><small>Scripts, stages, params</small></div>
    <div class="arch-node" data-kind="entry"><b><code>*.dvc</code> · <code>dvc.lock</code></b><small>Hash, size, path: a few hundred bytes</small></div>
  </div>
  <div class="arch-node"><b>Workspace</b><small>The files you open</small></div>
  <i class="arch-edge" data-dir="right"></i>
  <div class="arch-node" data-kind="store"><b><code>.dvc/cache</code></b><small>Content-addressed, local, gitignored</small></div>
  <i class="arch-edge" data-dir="right"></i>
  <div class="arch-node" data-kind="external"><b>Remote</b><small>S3 · GCS · Azure · SSH</small></div>
  <div class="arch-node" data-kind="store"><b>Hash addresses the bytes</b><small><code>files/md5/8f/2c4b…</code>, the same layout in cache and remote</small></div>
  <div class="arch-node" data-kind="worker"><b><code>dvc add</code> · <code>checkout</code></b><small>Workspace ↔ cache</small></div>
  <div class="arch-node" data-kind="worker"><b><code>dvc push</code> · <code>pull</code> · <code>fetch</code></b><small>Cache ↔ remote</small></div>
  <div class="arch-node" data-kind="danger"><b><code>dvc gc --cloud</code></b><small>Deletes on the remote. Not recoverable</small></div>
  <p class="arch-note"><b>Read it as two hops:</b> a pointer in Git names a hash, the cache holds that hash locally, and the remote holds it for everyone else. <code>git push</code> ships the pointer; <code>dvc push</code> ships the bytes. Do one without the other and a colleague gets a reference to data they cannot fetch.</p>
</div>

| Git | DVC | Moves |
|---|---|---|
| `git add` | `dvc add` | Working file → tracked |
| `git commit` | (commit the `.dvc` file) | Pointer → history |
| `git push` | `dvc push` | Cache → remote |
| `git pull` | `dvc pull` | Remote → cache → workspace |
| `git status` | `dvc status` / `dvc status -c` | What differs, locally / against the remote |

<div class="callout warn">
  <span class="ct">Credentials do not belong in <code>.dvc/config</code></span>
  That file is committed, so a secret in it is a secret in your history. Use the cloud provider's normal mechanism: <code>AWS_ACCESS_KEY_ID</code> in the environment, an IAM role, <code>gcloud auth</code>, an SSH agent. If you must store something per-machine, DVC has a <b>local</b> config for exactly that, covered in the next section.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add a local-folder remote pointing at <code>/tmp/dvc-storage</code> and commit <code>.dvc/config</code>.</li>
    <li>Run <code>dvc push</code>, then look inside <code>/tmp/dvc-storage</code> for the same hash-based layout as the cache.</li>
    <li>Run <code>dvc status -c</code> and confirm everything is up to date.</li>
    <li>Now simulate a colleague: <code>rm -rf .dvc/cache data/raw.csv</code>, then <code>dvc pull</code>.</li>
  </ol>
  <em>your file comes back from the remote after you deleted both it and the local cache. That is the moment DVC stops being an abstraction and starts being useful, and the remote's directory layout being identical to the cache is not a coincidence.</em>
</div>

## Two config files: committed versus local

There are two config files, and knowing which is which prevents both leaked secrets and "it works on my machine".

```bash
dvc remote add -d storage s3://my-bucket/dvc-store    # → .dvc/config, committed
dvc remote modify --local storage access_key_id AKIA…  # → .dvc/config.local, ignored
```

| File | Committed | For |
|---|---|---|
| `.dvc/config` | **Yes** | Remote URLs, cache type, anything the whole team shares |
| `.dvc/config.local` | **No** (gitignored) | Credentials, machine-specific paths, a personal cache directory |

The pattern that follows from this is worth adopting immediately: **shared truth in `config`, personal reality in `config.local`.** A remote URL is shared truth. Your access key is personal reality. So is a cache on a different disk because your home directory is small.

```bash
# Useful local-only settings
dvc cache dir /mnt/big-disk/dvc-cache          # move the cache off a small root disk
dvc remote modify --local storage ssh_private_key_path ~/.ssh/id_dvc
dvc config --local core.jobs 8                  # more parallel transfers on a fast link
```

<div class="callout tip">
  <span class="ct">A read-only remote for people who should not push</span>
  You can define several remotes and give one to contributors who need to <code>pull</code> but must not <code>push</code>. Access control lives in the storage provider, not in DVC, but declaring the remote in <code>.dvc/config</code> means everyone at least agrees on where the data is.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run <code>dvc remote list</code> and then <code>cat .dvc/config</code>.</li>
    <li>Set something local-only: <code>dvc config --local core.jobs 4</code>, then <code>cat .dvc/config.local</code>.</li>
    <li>Run <code>git status</code> and confirm <code>config.local</code> is not listed.</li>
    <li>Check <code>.dvc/.gitignore</code> and find the entry that makes that true.</li>
  </ol>
  <em>two files, one committed and one ignored, with the ignore rule already written for you. Knowing this split exists is what stops a credential ending up in your history six months from now.</em>
</div>

## Tracking directories, and the `.dir` object

Datasets are rarely one file. `dvc add` works on directories, and the behaviour is slightly different in a way worth knowing.

```bash
dvc add data/images/          # one .dvc file for the whole directory
cat data/images.dvc
```

```yaml data/images.dvc
outs:
- md5: 3a7f9c2e8b1d4506.dir      # note the .dir suffix
  size: 524288000
  nfiles: 12000
  hash: md5
  path: images
```

The `.dir` suffix marks this as a **directory hash**, the hash of a small JSON listing that maps every file in the tree to its own hash. Individual files are still deduplicated in the cache, so adding a directory where one image changed uploads exactly one new object.

| Property | Single file | Directory |
|---|---|---|
| Pointer records | One hash | A `.dir` hash plus `nfiles` |
| Cache entries | One | One per file, plus the listing |
| Changing one file | New hash for the file | New `.dir` hash, one new file entry |
| `dvc status` granularity | The file | Counts of added, modified, deleted |

<div class="callout warn">
  <span class="ct">Directories with hundreds of thousands of small files are slow</span>
  DVC hashes every file, so <code>dvc add</code> on a tree of 500,000 tiny images takes a long time and produces a large listing. If that is your situation, the answer is usually to package the files (tar shards, Parquet, WebDataset, LMDB) which is faster for DVC <em>and</em> faster for your data loader. Mid level covers this properly.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Create <code>data/images/</code> with twenty small files and run <code>dvc add data/images</code>.</li>
    <li>Read the <code>.dvc</code> file and note the <code>.dir</code> hash and <code>nfiles</code>.</li>
    <li>Change one file, run <code>dvc status</code>, and read how it reports the difference.</li>
    <li><code>dvc add</code> again and <code>dvc push</code>, then count the objects that were uploaded.</li>
  </ol>
  <em>a single pointer for the whole tree, and a second push that uploads one object rather than twenty. That per-file deduplication inside a directory is what makes DVC practical for image datasets.</em>
</div>

## Pipelines: from `dvc add` to `dvc.yaml`

`dvc add` versions data somebody produced. A **pipeline** versions the *process*, which is what makes a result reproducible rather than recorded.

The idea is a dependency graph. Each stage declares what it needs and what it makes, and DVC reruns a stage only when one of its declared inputs changed.

```yaml dvc.yaml
stages:
  prepare:
    cmd: python src/prepare.py data/raw.csv data/prepared.csv
    deps:
      - src/prepare.py
      - data/raw.csv
    outs:
      - data/prepared.csv

  train:
    cmd: python src/train.py data/prepared.csv models/model.pkl
    deps:
      - src/train.py
      - data/prepared.csv
    outs:
      - models/model.pkl
```

```bash
dvc repro                    # run whatever is out of date, in dependency order
git add dvc.yaml dvc.lock .gitignore
git commit -m "Add the prepare → train pipeline"
```

Four keys carry almost all of the meaning:

| Key | Means |
|---|---|
| `cmd` | The command to run. Any executable: Python, R, a shell script, a binary |
| `deps` | Inputs. If any changes, this stage is out of date |
| `outs` | Outputs. DVC tracks these, caches them, and gitignores them for you |
| `params` | Values read from `params.yaml`, so a config change invalidates the stage |

Notice what you no longer do: **you do not `dvc add` a pipeline output.** `outs` already tracks it. Running `dvc add` on something a stage produces is a common early mistake and DVC will refuse it, because two mechanisms would then own the same file.

<div class="flow">
  <div class="node">raw.csv<small>dvc add</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">prepare<small>a stage</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">prepared.csv<small>an out</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">train<small>a stage</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">model.pkl<small>an out</small></div>
</div>

<div class="callout tip">
  <span class="ct">Write <code>dvc.yaml</code> by hand</span>
  There is a <code>dvc stage add</code> command that generates it, and it is fine. But <code>dvc.yaml</code> is a short, readable file that you will edit far more often than you create, so learning to write it directly is faster within about ten minutes.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Write two tiny scripts (one that reads a CSV and writes another, one that reads that and writes a text file) and the <code>dvc.yaml</code> above to match.</li>
    <li>Run <code>dvc repro</code> and watch both stages execute in order.</li>
    <li>Run <code>dvc repro</code> again with no changes and read the output.</li>
    <li>Try to <code>dvc add</code> one of the outputs and read the error.</li>
  </ol>
  <em>the second run reports that everything is up to date and executes nothing, and the <code>dvc add</code> attempt is refused because the file is already a stage output. Those two behaviours are the pipeline model in miniature.</em>
</div>

## `dvc.lock`, and how DVC knows what changed

`dvc.yaml` is what you wrote. **`dvc.lock` is what happened**, and it is the file that makes reproducibility real.

```yaml dvc.lock
schema: '2.0'
stages:
  prepare:
    cmd: python src/prepare.py data/raw.csv data/prepared.csv
    deps:
    - path: data/raw.csv
      hash: md5
      md5: 8f2c4b19e0a7d3f1c6b8a2e4d7091f3b
      size: 1048576
    - path: src/prepare.py
      hash: md5
      md5: 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d
      size: 842
    outs:
    - path: data/prepared.csv
      hash: md5
      md5: 9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b
      size: 987654
```

Every dependency and output is recorded with its exact hash at the moment the stage last ran successfully. That is how `dvc repro` decides what to do. It hashes the current inputs and compares them against the lock.

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>1</span><strong>Read the graph</strong><small>DVC builds the dependency order from <code>deps</code> and <code>outs</code> across all stages.</small></div>
  <div class="guide-timeline-item"><span>2</span><strong>Hash the inputs</strong><small>For each stage, hash every dep and compare with <code>dvc.lock</code>.</small></div>
  <div class="guide-timeline-item"><span>3</span><strong>Skip or run</strong><small>All hashes match and outputs exist? Skip. Otherwise run <code>cmd</code>.</small></div>
  <div class="guide-timeline-item"><span>4</span><strong>Cascade</strong><small>A stage that ran produces new output hashes, so every downstream stage is now out of date too.</small></div>
  <div class="guide-timeline-item"><span>5</span><strong>Rewrite the lock</strong><small>New hashes are written, and outputs are saved into the cache.</small></div>
</div>

<div class="callout warn">
  <span class="ct">Always commit <code>dvc.lock</code></span>
  It is the record of which exact inputs produced which exact outputs. Without it, a colleague running <code>dvc repro</code> rebuilds everything and has no way to verify they got the same result. Treat it exactly like a <code>package-lock.json</code>: generated, never hand-edited, always committed.
</div>

Two more commands make the graph legible:

```bash
dvc dag                      # ASCII dependency graph
dvc dag --outs               # the same, keyed on outputs
dvc status                   # which stages are out of date, and why
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run <code>dvc repro</code>, then open <code>dvc.lock</code> and find the hash of <code>data/raw.csv</code>.</li>
    <li>Compare it with the hash in <code>data/raw.csv.dvc</code>. They match.</li>
    <li>Edit one comment in <code>src/train.py</code> and run <code>dvc status</code>. Only <code>train</code> is out of date.</li>
    <li>Now edit <code>src/prepare.py</code> instead and run <code>dvc status</code> again. <b>both</b> stages are affected.</li>
    <li>Run <code>dvc dag</code> and check the picture matches your expectation.</li>
  </ol>
  <em>a change to a late stage affects only that stage, while a change to an early one cascades downstream. Watching that cascade is what turns "DVC caches things" into "DVC understands my pipeline".</em>
</div>

## Parameters: config DVC can see

Hard-coded hyperparameters make a stage un-reproducible: you changed `n_estimators` from 100 to 200, DVC saw no dependency change, and skipped the stage. `params` fixes that.

```yaml params.yaml
prepare:
  test_size: 0.2
  random_state: 42

train:
  n_estimators: 100
  max_depth: 8
  learning_rate: 0.05
```

```yaml dvc.yaml
stages:
  train:
    cmd: python src/train.py
    deps:
      - src/train.py
      - data/prepared.csv
    params:
      - train.n_estimators
      - train.max_depth
      - train.learning_rate
    outs:
      - models/model.pkl
```

```python src/train.py
import yaml

with open("params.yaml") as f:
    params = yaml.safe_load(f)["train"]

model = RandomForestClassifier(
    n_estimators=params["n_estimators"],
    max_depth=params["max_depth"],
)
```

Now changing a number in `params.yaml` marks the stage out of date, as changing the code would. You can list individual keys as above, or `- train` to depend on the whole section.

```bash
dvc params diff              # what changed since the last commit
dvc params diff HEAD~3       # or against any revision
```

<div class="callout tip">
  <span class="ct">Parameters are the seam between "config" and "code"</span>
  Anything you might reasonably want to sweep belongs in <code>params.yaml</code>: learning rates, thresholds, feature flags, split ratios. Anything structural belongs in code. Getting this line in the right place is what makes experiment tracking pleasant later, because DVC can then vary parameters without touching a single source file.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Move one hard-coded number from your training script into <code>params.yaml</code> and declare it in <code>dvc.yaml</code>.</li>
    <li>Run <code>dvc repro</code>, then run it again and confirm the stage is skipped.</li>
    <li>Change the value in <code>params.yaml</code> and run <code>dvc status</code>. The stage is out of date, with the parameter named.</li>
    <li>Run <code>dvc repro</code>, then <code>dvc params diff</code>.</li>
  </ol>
  <em>DVC reporting the specific parameter that changed rather than a vague "modified". That precision in <code>dvc status</code> is what makes a long pipeline debuggable.</em>
</div>

## Metrics and plots: results that diff in Git

A pipeline that produces a model but no numbers is a pipeline you cannot reason about. DVC has two output kinds for exactly this.

```yaml dvc.yaml
stages:
  evaluate:
    cmd: python src/evaluate.py
    deps:
      - src/evaluate.py
      - models/model.pkl
      - data/test.csv
    metrics:
      - metrics.json:
          cache: false
    plots:
      - plots/roc.json:
          cache: false
          x: fpr
          y: tpr
      - plots/confusion.csv:
          cache: false
          template: confusion
          x: actual
          y: predicted
```

```json metrics.json
{
  "accuracy": 0.9231,
  "f1": 0.9104,
  "auc": 0.9687,
  "train_seconds": 42.7
}
```

```bash
dvc metrics show             # the current numbers
dvc metrics diff             # versus the last commit
dvc metrics diff HEAD~5      # versus any revision
dvc plots show               # render plots to an HTML file
dvc plots diff HEAD~1        # overlay two revisions on one chart
```

The `cache: false` on those outputs is deliberate and worth understanding: metrics files are small text, so committing them **to Git** rather than caching them in DVC means `dvc metrics diff` can compare any two commits without downloading anything.

| Output kind | Tracked by | Use for |
|---|---|---|
| `outs` | DVC cache | Models, datasets, anything large or binary |
| `metrics` with `cache: false` | Git | Small JSON/YAML of scores |
| `plots` with `cache: false` | Git | Small CSV/JSON of curves and confusion matrices |
| `outs` with `cache: false` | Git | Any small text output you want diffable |

<div class="callout warn">
  <span class="ct">Do not cache small text outputs</span>
  A 200-byte <code>metrics.json</code> in the DVC cache means comparing two commits requires a <code>dvc pull</code> from the remote. The same file in Git is instantly diffable, forever, by anyone with the repository. Reserve the cache for things Git is bad at.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add an <code>evaluate</code> stage that writes a <code>metrics.json</code> with two or three numbers.</li>
    <li>Run <code>dvc repro</code>, commit, then change a parameter and repro again.</li>
    <li>Run <code>dvc metrics diff</code> and read the before/after/change columns.</li>
    <li>Add a plot output, a CSV of two columns is enough, and run <code>dvc plots diff HEAD~1</code>, then open the HTML it produces.</li>
  </ol>
  <em>a table showing how your numbers moved between two commits, and an overlaid chart of two revisions. That diff is the artifact you paste into a pull request, and it is the single most persuasive thing DVC produces.</em>
</div>

## Experiments: cheap runs, no commits

Committing every attempt pollutes your history. `dvc exp` gives you a lightweight way to run many variations, compare them, and keep only the ones worth keeping.

```bash
# Run with a parameter override, without editing any file
dvc exp run --set-param train.n_estimators=300

# Queue several and run them together
dvc exp run --queue --set-param train.max_depth=4
dvc exp run --queue --set-param train.max_depth=8
dvc exp run --queue --set-param train.max_depth=16
dvc exp run --run-all --jobs 3

# Compare
dvc exp show
dvc exp show --only-changed          # hide columns that are identical everywhere
```

`dvc exp show` prints a table of every experiment with its parameters and metrics side by side, which is the fastest way to see that `max_depth=8` beat both neighbours.

```text
 ───────────────────────────────────────────────────────────────
  Experiment          accuracy   f1      max_depth  n_estimators
 ───────────────────────────────────────────────────────────────
  workspace           0.9231     0.9104  8          100
  main                0.9105     0.8977  6          100
  ├── exp-a1b2c       0.9402     0.9311  8          300
  ├── exp-d4e5f       0.9188     0.9042  4          100
  └── exp-g7h8i       0.9377     0.9265  16         100
 ───────────────────────────────────────────────────────────────
```

Then promote the winner and discard the rest:

```bash
dvc exp apply exp-a1b2c      # bring it into your workspace
git add . && git commit -m "n_estimators=300: accuracy 0.940"

dvc exp branch exp-a1b2c my-branch    # or put it on its own branch
dvc exp remove --queued               # clean up
dvc exp gc --workspace                # garbage-collect experiments not referenced
```

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>An experiment</h4>
    <ul>
      <li>No commit needed, no branch needed</li>
      <li>Cheap to create and to throw away</li>
      <li>Comparable in one table</li>
      <li>Promote with <code>apply</code> or <code>branch</code></li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>A commit per attempt</h4>
    <ul>
      <li>Pollutes history with dead ends</li>
      <li>Comparing means reading log messages</li>
      <li>Rebasing later becomes unpleasant</li>
      <li>Nobody can find the good one</li>
    </ul>
  </div>
</div>

<div class="callout tip">
  <span class="ct">Experiments still require a clean-ish workspace</span>
  <code>dvc exp run</code> works from your current state, so uncommitted code changes are included, which is usually what you want while iterating. But it means two experiments run at different times can differ by code you forgot about. Commit the code, vary the parameters.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Queue three experiments varying one parameter, then run them all with <code>--run-all</code>.</li>
    <li>Run <code>dvc exp show --only-changed</code> and identify the best result.</li>
    <li>Apply the winner with <code>dvc exp apply</code>, then check <code>git status</code> and <code>params.yaml</code>.</li>
    <li>Commit it, then run <code>dvc exp remove --queued</code> and <code>dvc exp show</code> again.</li>
  </ol>
  <em>three runs compared in one table, one promoted into a real commit, and the rest discarded without leaving a trace in your history. That workflow is why you should stop committing every attempt.</em>
</div>

## Reading another repo's data: `get` versus `import`

Two commands let you use a DVC repository as a data source, which is how datasets get shared across projects.

```bash
# Look at what a repo tracks, without cloning it
dvc list https://github.com/iterative/dataset-registry get-started

# Download a file from it into the current directory
dvc get https://github.com/iterative/dataset-registry get-started/data.xml

# Download AND record where it came from
dvc import https://github.com/iterative/dataset-registry get-started/data.xml
```

The difference between the last two is the whole point:

| | `dvc get` | `dvc import` |
|---|---|---|
| Downloads the file | Yes | Yes |
| Records the source | **No** | Yes, in a `.dvc` file |
| Can be updated later | No: download again by hand | `dvc update` |
| Knows the source revision | No | Yes, pinned to a commit |

```bash
dvc import --rev v1.2.0 https://github.com/org/data-repo datasets/train.parquet
dvc update datasets/train.parquet.dvc         # pull the newer upstream version
```

`dvc import` writes a pointer that names the source repository, path, and revision. That means your project can state "we depend on version v1.2.0 of the shared training set" as a committed fact, and updating is a deliberate command rather than a silent drift.

<div class="callout tip">
  <span class="ct">A "data registry" is just a DVC repo with no code</span>
  Many teams keep one repository whose only job is to track canonical datasets. Consumers <code>dvc import</code> from it. There is nothing special about it. It is the pattern that emerges naturally once two projects need the same data, and Senior level covers running one properly.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run <code>dvc list https://github.com/iterative/dataset-registry</code> and explore what is there.</li>
    <li><code>dvc get</code> a file from it and note that <code>git status</code> shows an untracked file with no pointer.</li>
    <li>Delete it, then <code>dvc import</code> the same file and read the <code>.dvc</code> file it creates.</li>
    <li>Find the <code>repo:</code> section, and the <code>rev_lock</code> that pins the exact upstream commit.</li>
  </ol>
  <em><code>get</code> leaves you with an anonymous file, while <code>import</code> leaves you with a versioned dependency that names its source and revision. That distinction is the difference between copying data and depending on it.</em>
</div>

## Garbage collection: reclaiming the cache safely

The cache accumulates every version of everything you have ever added. That is the feature; it is also why your disk fills up.

```bash
dvc gc --workspace           # keep only what the current workspace needs
dvc gc --all-branches        # keep what every branch needs
dvc gc --all-tags            # keep what every tag needs
dvc gc --all-commits         # keep what every commit needs — the safest
dvc gc --cloud               # also clean the remote (dangerous, read below)
dvc gc --dry-run --workspace # show what would go, delete nothing
```

The flags are all about **which revisions count as "in use"**. The default, no flag at all, is `--workspace`, which is the most aggressive: anything not needed by the files currently checked out is deleted.

<div class="callout warn">
  <span class="ct"><code>dvc gc</code> deletes data, and <code>--cloud</code> deletes shared data</span>
  <code>dvc gc --workspace</code> on a repository with ten branches will delete the cached data for nine of them. Add <code>--cloud</code> and you have done it to your team's remote as well, where it is not recoverable. Always run with <code>--dry-run</code> first, and prefer <code>--all-commits</code> unless you have a specific reason to be aggressive.
</div>

Two other space commands worth knowing:

```bash
du -sh .dvc/cache            # how big is the local cache
dvc cache dir                # where is it
dvc cache dir /mnt/big/cache # move it, e.g. off a small root disk
```

<div class="callout tip">
  <span class="ct">A shared cache saves a lot of disk on one machine</span>
  If you have several projects using the same datasets, point them all at one cache directory: <code>dvc cache dir --local /shared/dvc-cache</code>. Content-addressing means identical files are stored once for all of them. Use the <code>--local</code> flag so the path stays out of the committed config.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Create three versions of a dataset, committing each, so the cache has three entries.</li>
    <li>Run <code>du -sh .dvc/cache</code> and note the size.</li>
    <li>Run <code>dvc gc --dry-run --workspace</code> and read what it proposes to delete.</li>
    <li>Now run <code>dvc gc --dry-run --all-commits</code> and compare the two lists.</li>
  </ol>
  <em><code>--workspace</code> proposes deleting the two older versions; <code>--all-commits</code> proposes deleting nothing, because every version is still reachable from a commit. Understanding that difference before you run it for real is the point of this exercise.</em>
</div>

## Reading a broken pipeline, in order

Debugging DVC has an order, and following it beats guessing.

<ol class="guide-steps">
  <li><b>Run <code>dvc status</code> first</b>It names the stage, the specific dependency, and the reason. Most problems are answered here and you can stop.</li>
  <li><b>Then <code>dvc status -c</code></b>Compares your cache against the remote. This is the answer to "my colleague cannot pull my data". You never pushed it.</li>
  <li><b>Check the graph with <code>dvc dag</code></b>A stage that never reruns often has a missing <code>deps</code> entry; a cycle error means two stages each claim the other's output.</li>
  <li><b>Run the <code>cmd</code> by hand</b>Copy the command out of <code>dvc.yaml</code> and run it in your shell. If it fails there, DVC is innocent and you are debugging your script.</li>
  <li><b>Force a rerun with <code>dvc repro -f</code></b>Ignores the lock and reruns everything. If forcing fixes it, your <code>deps</code> are incomplete, and the real fix is declaring the missing dependency.</li>
  <li><b>Add <code>-v</code> for verbose output</b><code>dvc repro -v</code> or <code>dvc pull -v</code> prints what DVC is doing, including which remote it contacted and why a transfer failed.</li>
</ol>

Four failures cover most of what you will hit at this level, and each has a one-line cause:

| Symptom | Cause | Fix |
|---|---|---|
| `ERROR: output 'x' is already tracked` | You `dvc add`ed a pipeline output | Remove the `.dvc` file; `outs` already tracks it |
| Stage never reruns after a code change | The script is not in `deps` | Add it |
| `dvc pull` says "missing cache files" | The data was never pushed | `dvc push` from wherever it was produced |
| Data is the wrong version after `git checkout` | You skipped `dvc checkout` | Run it, or `dvc install` the hooks |

```bash
dvc status                   # local truth
dvc status -c                # remote truth
dvc dag                      # the graph as DVC sees it
dvc repro -f                 # rebuild everything, ignoring the lock
dvc repro --dry              # show what would run, run nothing
dvc repro -s train           # just one stage, and its upstream
dvc repro -s train --single-item   # exactly one stage, no upstream
```

<div class="guide-try">
  <span class="ct">Try it: cause each failure on purpose</span>
  <ol>
    <li>Remove a script from a stage's <code>deps</code>, change the script, and confirm <code>dvc repro</code> skips the stage.</li>
    <li>Try to <code>dvc add</code> a pipeline output and read the exact error text.</li>
    <li>Delete your local cache and try <code>dvc checkout</code> without having pushed. Read the error, then <code>dvc pull</code>.</li>
    <li>For each one, get to the answer with <code>dvc status</code> rather than by remembering what you broke.</li>
  </ol>
  <em>three recognisable errors and one silent skip. The silent skip in step one is the dangerous one, because nothing fails. It is why declaring every input in <code>deps</code> matters more than any other habit at this level.</em>
</div>

## Putting it all together

Everything above in one project. Nothing here is new. Read it as a whole and you should be able to justify every line.

```text project layout
.
├── .dvc/
│   ├── config              # remote URL — committed
│   └── config.local        # credentials — gitignored
├── .dvcignore
├── data/
│   ├── .gitignore          # written by DVC
│   ├── raw.csv.dvc         # pointer, committed
│   └── raw.csv             # the bytes, gitignored
├── src/
│   ├── prepare.py
│   ├── train.py
│   └── evaluate.py
├── models/
│   └── .gitignore          # written by DVC
├── params.yaml             # committed
├── metrics.json            # committed (cache: false)
├── plots/roc.csv           # committed (cache: false)
├── dvc.yaml                # committed
└── dvc.lock                # committed
```

```yaml params.yaml
prepare:
  test_size: 0.2
  random_state: 42

train:
  n_estimators: 300
  max_depth: 8
```

```yaml dvc.yaml
stages:
  prepare:
    cmd: python src/prepare.py
    deps:
      - src/prepare.py
      - data/raw.csv                # the dvc add-tracked input
    params:
      - prepare.test_size
      - prepare.random_state
    outs:
      - data/train.csv              # cached: large, binary-ish, regenerable
      - data/test.csv

  train:
    cmd: python src/train.py
    deps:
      - src/train.py
      - data/train.csv              # produced upstream; the link in the graph
    params:
      - train.n_estimators
      - train.max_depth
    outs:
      - models/model.pkl            # cached: the artifact

  evaluate:
    cmd: python src/evaluate.py
    deps:
      - src/evaluate.py
      - models/model.pkl
      - data/test.csv
    metrics:
      - metrics.json:
          cache: false              # small text → Git, so diffs need no pull
    plots:
      - plots/roc.csv:
          cache: false
          x: fpr
          y: tpr
```

```bash
# The everyday loop
dvc repro                          # run only what is out of date
dvc metrics diff                   # did the numbers move?
git add dvc.lock metrics.json plots/ params.yaml
git commit -m "Deeper trees: accuracy 0.921 → 0.940"
dvc push                           # share the data and the model
git push
```

```bash
# What a colleague runs
git clone <repo> && cd <repo>
dvc pull                           # exactly your data and model
dvc repro                          # "Everything is up to date" — reproduced
```

Ten decisions in there are the whole lesson of this page:

| Decision | Section |
|---|---|
| Data in a remote, pointers in Git | The problem DVC solves |
| `.dvc/config` committed, `config.local` not | Local versus committed configuration |
| `dvc add` for inputs you did not generate | Your first tracked dataset |
| `outs`: never `dvc add`: for generated files | Pipelines |
| Every script listed in `deps` | `dvc.lock` and how DVC knows |
| `dvc.lock` committed, never edited | `dvc.lock` and how DVC knows |
| Hyperparameters in `params.yaml` | Parameters |
| `cache: false` on metrics and plots | Metrics and plots |
| `dvc push` before `git push` | Remote storage |
| `dvc gc --dry-run` before any cleanup | Garbage collection |

<div class="guide-try">
  <span class="ct">Try it: the one that matters</span>
  <ol>
    <li>Take this structure into a project you work on, adapting the stages to your own scripts.</li>
    <li>Get <code>dvc repro</code> to a state where a second run reports everything up to date.</li>
    <li>Push to a real remote, then clone the repository into a different directory, <code>dvc pull</code>, and <code>dvc repro</code>. Confirm it reports up to date rather than rebuilding.</li>
    <li>Change one parameter, repro, and produce a <code>dvc metrics diff</code> you would be happy to paste into a pull request.</li>
  </ol>
  <em>a fresh clone that reproduces your result without rerunning anything, which is the strongest possible evidence that the pipeline is reproducible. Do this one even if you skip every other exercise.</em>
</div>

## What you can now do, and what comes next

You can version datasets and models with Git-sized pointers, restore any past version, share data through remote storage, express your workflow as a dependency graph that reruns only what changed, parameterise it, record metrics and plots that diff across commits, run and compare experiments without polluting history, depend on datasets from other repositories, keep your disk under control, and debug a pipeline methodically. That is a working practitioner's toolkit, enough to own the data and reproducibility story on a real project.

| Can you… | |
|---|---|
| Explain what is in a `.dvc` file? | A hash, a size, and a path |
| Say why Git alone is wrong for data? | Full history of large binaries, forever |
| Name the two commands to travel back in time? | `git checkout` then `dvc checkout` |
| Say where credentials belong? | The environment or `.dvc/config.local` |
| Explain how `dvc repro` decides what to run? | Hashes in `dvc.lock` versus current inputs |
| Say why you never `dvc add` a stage output? | `outs` already tracks it |
| Explain why parameters need declaring? | Otherwise a config change is invisible |
| Say why metrics use `cache: false`? | Small text belongs in Git, so diffs need no pull |
| Give the difference between `get` and `import`? | Anonymous copy versus versioned dependency |
| Say what `dvc gc --workspace` deletes? | Everything not needed by the current checkout |
| Name the first command when something is wrong? | `dvc status`, then `dvc status -c` |

**Mid-level takes every one of those topics further:** the hashing and link internals that explain performance, `dvc.yaml` templating with `foreach` and `matrix`, output modifiers like `persist` and `cache: false`, external and cloud-versioned outputs, `dvc import-url`, multiple and per-role remotes, experiment queues and cloud-based experiments, the CI patterns that make `dvc repro` a pull-request check, DVCLive for in-training logging, and monorepo layouts.

**Senior then covers what you own when data versioning is your responsibility**: the trust and access model across remotes, credentials that are never stored, immutability and retention on the storage side, cost and lifecycle policy, hashing at terabyte scale, data registries as a product, lineage and audit for regulated work, GDPR deletion against an immutable cache, CI/CD for data with self-hosted runners, and where DVC stops and a feature store or lakehouse begins.
