Part one of three. Almost every beginner problem with DVC comes from one of three things: pointers and data being separate, the cache being local until you push, or DVC only knowing what you declared. Start with the error table, then work through the habits and practice cards underneath it.

## Common errors at this level

| Symptom | Real cause | Fix |
|---|---|---|
| `ERROR: failed to initiate — not a git repository` | `dvc init` without Git | `git init` first; DVC needs Git underneath |
| `URL 's3://…' is not supported` | Missing the storage driver | `pip install "dvc[s3]"` — or `[gs]`, `[azure]`, `[ssh]`, `[all]` |
| Data is the wrong version after `git checkout` | You skipped `dvc checkout` | Run it, or `dvc install` the hooks once |
| `Missing cache files` on `dvc checkout` | That version is not in the local cache | `dvc pull` — and check it was ever pushed |
| A colleague cannot pull your data | You never ran `dvc push` | `dvc status -c` shows this immediately |
| The data file appears in `git status` | The `.gitignore` entry is missing or was edited | Re-run `dvc add`; a clean status is the signal it worked |
| `output 'data/x' is already tracked` | `dvc add` on a pipeline output | Delete the `.dvc` file; `outs` already owns it |
| A stage never reruns after a code change | The script is not in `deps` | Add it — this is a silent failure, nothing errors |
| A parameter change is ignored | Not declared under `params` | Declare the key, or the whole section |
| Every `dvc repro` reruns everything | A dep whose hash changes every run | Usually a log or timestamp; find it with `dvc repro -v` |
| `dvc.lock` conflicts on every merge | Both branches reran the pipeline | Take one side, then `dvc repro`. Never hand-edit |
| `dvc metrics diff` prints nothing | Metrics are cached, or the revision is missing | Use `cache: false`; in CI use `fetch-depth: 0` |
| Disk full | The cache keeps every version ever added | `dvc gc --dry-run --all-commits` first |
| `dvc gc` deleted data you needed | The default is `--workspace`, the most aggressive | Prefer `--all-commits`; always dry-run |
| Credentials rejected on push | Not configured, or in the wrong config file | Environment or `.dvc/config.local`, never `.dvc/config` |
| `dvc add` is extremely slow | Hundreds of thousands of small files | Package them; Mid level covers sharding |
| Pipeline runs but outputs vanish | Output path not listed in `outs` | DVC deletes undeclared files in the stage's way |
| `dvc pull` overwrote my local edits | Working files are managed by DVC | Never hand-edit tracked outputs; regenerate them |
| `dvc repro` says up to date but output is missing | The output was deleted outside DVC | `dvc checkout` restores it from the cache |
| Two people track the same file differently | One used `dvc add`, one used `outs` | Decide: generated → `outs`, given → `dvc add` |

## The habits that pay off most

<div class="cards">
  <div class="card"><div class="icon">🪝</div><h4>Run <code>dvc install</code> once</h4><p>Git hooks that run <code>dvc checkout</code> after every <code>git checkout</code>. Removes the single most common confusion.</p></div>
  <div class="card"><div class="icon">📤</div><h4><code>dvc push</code> before <code>git push</code></h4><p>Otherwise you have shared a pointer to data nobody else can get. <code>dvc status -c</code> tells you.</p></div>
  <div class="card"><div class="icon">🔒</div><h4>Commit <code>dvc.lock</code>, always</h4><p>It is the record of what actually ran. Treat it like <code>package-lock.json</code>: generated, never edited.</p></div>
  <div class="card"><div class="icon">📋</div><h4>Declare every input in <code>deps</code></h4><p>A missing dep is a silent skip — nothing errors, and your stage quietly goes stale.</p></div>
  <div class="card"><div class="icon">⚙️</div><h4>Hyperparameters in <code>params.yaml</code></h4><p>Hard-coded numbers are invisible to DVC, so the stage never reruns when you change one.</p></div>
  <div class="card"><div class="icon">📊</div><h4><code>cache: false</code> on metrics</h4><p>Small text in Git means <code>dvc metrics diff</code> works between any two commits with no download.</p></div>
  <div class="card"><div class="icon">🧪</div><h4><code>dvc exp run</code>, not a commit</h4><p>Stop committing every attempt. Experiments are cheap, comparable, and discardable.</p></div>
  <div class="card"><div class="icon">🧯</div><h4><code>--dry-run</code> before any <code>gc</code></h4><p>The default flag is the most destructive one. Read the list before deleting anything.</p></div>
</div>

## Practice cards

Short, self-contained exercises. Each one takes a few minutes and leaves you with a fact you will not forget.

<ol class="guide-steps">
  <li><b>Watch the two-command time travel</b>Make three versions of a file, committing each. <code>git checkout</code> an old <code>.dvc</code> file, run <code>dvc status</code> <em>before</em> <code>dvc checkout</code>, and read the mismatch it reports. Then <code>dvc install</code> and repeat to see the step disappear.</li>
  <li><b>Simulate a colleague</b><code>rm -rf .dvc/cache data/raw.csv</code>, then <code>dvc pull</code>. Getting your file back after deleting both the file and the cache is the moment DVC stops being abstract.</li>
  <li><b>Cause a silent skip</b>Remove a script from a stage's <code>deps</code>, change the script, and run <code>dvc repro</code>. Nothing errors and nothing reruns — this is the most dangerous failure at this level.</li>
  <li><b>Watch the cascade</b>Edit a late-stage script and run <code>dvc status</code>: one stage. Edit an early one: every downstream stage. Then run <code>dvc dag</code> and confirm the picture matches.</li>
  <li><b>Prove parameters need declaring</b>Change a value in <code>params.yaml</code> that is <em>not</em> listed under <code>params</code> and confirm the stage is skipped. Declare it and repeat.</li>
  <li><b>Produce a metrics diff worth sharing</b>Add a metrics stage, commit, change one parameter, repro, and run <code>dvc metrics diff</code>. That table is the artifact to paste into a pull request.</li>
  <li><b>Compare three experiments</b>Queue three variations of one parameter, run them, and read <code>dvc exp show --only-changed</code>. Apply the winner, commit, and discard the rest.</li>
  <li><b>Read a dry-run garbage collection</b>With three dataset versions committed, compare <code>dvc gc --dry-run --workspace</code> against <code>--all-commits</code>. The difference in the two lists is the lesson.</li>
  <li><b>Break the pointer/data pairing on purpose</b>Delete a tracked output with <code>rm</code>, run <code>dvc status</code>, then <code>dvc checkout</code>. Knowing DVC restores it from the cache saves you from re-running a long pipeline.</li>
</ol>

## Debugging order

Follow this rather than guessing — the first two steps answer most problems.

<ol class="guide-steps">
  <li><b><code>dvc status</code></b>Names the stage, the specific dependency, and the reason. Most problems end here.</li>
  <li><b><code>dvc status -c</code></b>Compares your cache against the remote. This is the answer to "my colleague cannot pull my data" — you never pushed it.</li>
  <li><b><code>dvc dag</code></b>A stage that never reruns usually has a missing <code>deps</code> entry; a cycle error means two stages each claim the other's output.</li>
  <li><b>Run the <code>cmd</code> by hand</b>Copy it out of <code>dvc.yaml</code> and run it in your shell. If it fails there, DVC is innocent and you are debugging your script.</li>
  <li><b><code>dvc repro -f</code></b>Ignores the lock and reruns everything. If forcing fixes it, your <code>deps</code> are incomplete — declaring the missing input is the real fix.</li>
  <li><b>Add <code>-v</code></b><code>dvc repro -v</code> or <code>dvc pull -v</code> prints every hash comparison and every transfer, including which remote it contacted and why something failed.</li>
</ol>

```bash
dvc status                   # local truth
dvc status -c                # remote truth
dvc dag                      # the graph as DVC sees it
dvc repro --dry              # what would run, run nothing
dvc repro -s train           # one stage and its upstream
dvc repro -s train --single-item   # exactly one stage
dvc repro -f                 # ignore the lock, rebuild everything
dvc doctor                   # version, platform, available remote drivers
```

## `dvc add` versus `outs` — the decision

Half of all beginner DVC confusion lives here, and one question resolves it: **did a pipeline stage produce this file?**

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4><code>dvc add</code> — inputs you were given</h4>
    <ul>
      <li>A raw dataset somebody handed you</li>
      <li>A downloaded corpus, a labelled set</li>
      <li>Nothing in your pipeline generates it</li>
      <li>Creates a <code>.dvc</code> file you commit</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4><code>outs</code> — files a stage makes</h4>
    <ul>
      <li>Prepared data, features, models, reports</li>
      <li>Regenerable by running the stage</li>
      <li>Declared in <code>dvc.yaml</code></li>
      <li>Recorded in <code>dvc.lock</code>, no <code>.dvc</code> file</li>
    </ul>
  </div>
</div>

Getting it wrong produces one of two errors. `dvc add` on a stage output is refused outright. Forgetting `outs` is worse: the file is untracked, so it is not cached, not pushed, and — because DVC clears a stage's declared path before running — an undeclared sibling file can be deleted without warning.

<div class="callout tip">
  <span class="ct">One line to remember</span>
  <b>If you can regenerate it, it belongs in <code>outs</code>. If you cannot, it belongs in <code>dvc add</code>.</b> That single test resolves every case at this level.
</div>

## Set up so DVC catches things for you

Do these four things once per project and an entire class of mistakes disappears.

```bash
dvc install                   # Git hooks: checkout, pre-push warning
dvc config core.autostage true # git add .dvc files automatically
dvc config cache.type reflink,copy
dvc doctor                     # confirm remote drivers are present
```

`core.autostage` is the quiet win: DVC stages the `.dvc` files and `.gitignore` entries it creates, so you stop forgetting to `git add` them.

Then a `.dvcignore`, which works like `.gitignore` but for DVC's own scanning — it stops DVC hashing files you never want tracked:

```text .dvcignore
*.tmp
.ipynb_checkpoints/
__pycache__/
*.log
.DS_Store
```

<div class="callout tip">
  <span class="ct">Add DVC's own commands to your README</span>
  The three-line "Running locally" block — <code>git clone</code>, <code>dvc pull</code>, <code>dvc repro</code> — is the most valuable documentation in the repository, because it is the acceptance test for reproducibility as well as the instructions.
</div>

## Writing a `dvc.yaml` that ages well

```yaml dvc.yaml
stages:
  prepare:
    cmd: python src/prepare.py               # no hard-coded paths in the command
    deps:
      - src/prepare.py                       # the script itself
      - src/common.py                        # anything it imports
      - data/raw.csv
    params:
      - prepare.test_size                    # every value the script reads
    outs:
      - data/train.csv
      - data/test.csv
```

| Rule | Why |
|---|---|
| List the script **and its imports** in `deps` | Changing a helper module must invalidate the stage |
| Keep `cmd` free of tunable values | Those belong in `params.yaml`, where DVC can see them |
| One responsibility per stage | So a change reruns the minimum |
| Declare every file the stage writes | Undeclared outputs are untracked and can be deleted |
| Never point two stages at one output | DVC refuses, and it means the graph is wrong |
| Name stages as verbs | `prepare`, `featurize`, `train`, `evaluate` reads as a pipeline |

<div class="callout warn">
  <span class="ct">A stage's directory is cleared before it runs</span>
  DVC removes a stage's declared outputs before executing it, so the stage always starts clean. A file you write into an output directory but did not declare can therefore disappear on the next run. Declare everything the stage produces.
</div>

## Reading `dvc status` output

Learning to read this saves more time than any other single skill at this level.

```text
data/raw.csv.dvc:
        changed outs:
                modified:           data/raw.csv        ← the file differs from the pointer

train:
        changed deps:
                modified:           src/train.py        ← this input changed
        changed outs:
                deleted:            models/model.pkl    ← the output is missing

evaluate:
        changed command                                 ← you edited `cmd` in dvc.yaml
```

| Report | Means | Do |
|---|---|---|
| `changed outs: modified` on a `.dvc` file | The working file differs from the pointer | `dvc add` to record it, or `dvc checkout` to discard the change |
| `changed deps` on a stage | An input changed | `dvc repro` |
| `changed outs: deleted` | The output is gone from the workspace | `dvc checkout` to restore, or `dvc repro` |
| `changed command` | You edited `cmd` | `dvc repro` |
| `Data and pipelines are up to date.` | Nothing to do | Nothing |
| With `-c`: `new` or `missing` | Cache and remote disagree | `dvc push` or `dvc pull` |

## Small things worth doing from day one

**Name datasets by what they are, not by version.** `customers.parquet`, not `customers_v3_final.parquet`. Versions are Git's job now, and the old naming habit is exactly what DVC removes.

**Add a `desc:` to important outputs.** It shows up in `dvc list` and answers "what is this?" six months later.

**Keep raw data immutable.** `dvc add` it once and never edit it in place — regenerate derived data through the pipeline instead.

**Commit the pointer in the same commit as the code that reads it.** Splitting them means an intermediate commit that cannot reproduce.

**Write the metrics number into the commit message.** `"Deeper trees: F1 0.910 → 0.931"` makes `git log` a results log.

**Check `dvc status -c` before you finish for the day.** It is a two-second habit that prevents "the pointer is pushed but the data is on my laptop".

```bash
# A pre-push sanity check worth aliasing
dvc status && dvc status -c && git status --short
```

## A starter setup worth keeping

Copy this into a new project and delete what you do not need. Every line is something from this page.

```text .dvcignore
*.tmp
.ipynb_checkpoints/
__pycache__/
*.log
.DS_Store
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
    deps: [src/prepare.py, src/common.py, data/raw.csv]
    params: [prepare.test_size, prepare.random_state]
    outs: [data/train.csv, data/test.csv]

  train:
    cmd: python src/train.py
    deps: [src/train.py, src/common.py, data/train.csv]
    params: [train.n_estimators, train.max_depth]
    outs:
      - models/model.pkl                 # cached: the artifact

  evaluate:
    cmd: python src/evaluate.py
    deps: [src/evaluate.py, models/model.pkl, data/test.csv]
    metrics:
      - metrics.json:
          cache: false                   # small text → Git, diffable forever
    plots:
      - plots/confusion.csv:
          cache: false
          template: confusion
          x: actual
          y: predicted
```

```bash
# One-time setup
git init && dvc init
dvc remote add -d storage s3://my-bucket/dvc
dvc install
dvc config core.autostage true
git add . && git commit -m "Initialise DVC"

# The everyday loop
dvc repro
dvc metrics diff
git commit -am "Deeper trees: F1 0.910 → 0.931"
dvc push && git push

# What a colleague runs
git clone <repo> && cd <repo> && dvc pull && dvc repro
```

Eight details in there are the whole lesson of this page: a `.dvcignore` written before the first add, hooks and autostage installed once, every script *and its imports* in `deps`, hyperparameters in `params.yaml`, `cache: false` on metrics and plots, `dvc push` before `git push`, a metrics number in the commit message, and a colleague's three-command reproduction as the acceptance test.

**Mid-level tips go deeper on every one of these** — cache internals and why CI never hits the cache, sharding small files, output modifiers in practice, entrypoint-style pipeline patterns, Compose-style override layouts for environments, experiment queue hygiene, remote tuning, and diagnosing "reproduces locally, not in CI".

