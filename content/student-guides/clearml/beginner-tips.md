Part one of three. Almost every beginner problem with ClearML comes from one of three things: `Task.init` running too late, the agent rebuilding an environment you never fully declared, or parameters flowing back from the server on a remote run. Start with the error table, then work through the habits and practice cards underneath it.

## Common errors at this level

| Symptom | Real cause | Fix |
|---|---|---|
| No scalars in the UI, but TensorBoard works locally | `Task.init` ran after `import torch` / `import tensorflow` | Move `Task.init` above every framework import |
| `Task.init` hangs or times out | Wrong `api_server` host, or a proxy blocking it | Re-run `clearml-init`; check `~/clearml.conf` hosts |
| `ValueError: Could not find credentials` | No `clearml.conf` and no `CLEARML_API_*` env vars | `clearml-init`, or export the five env vars |
| Task sits in `queued` forever | No agent watching that queue, or a typo in the queue name | Workers &amp; Queues page; start `clearml-agent daemon --queue NAME` |
| Agent fails immediately with a git error | The recorded commit was never pushed | Push the branch, then enqueue |
| `ImportError` on the agent but not locally | Package imported inside a function, so never detected | Import at module level, or add it to the task's package list |
| Agent installs the wrong CUDA/torch build | Detected requirements do not carry the index URL | Docker mode with a CUDA base image |
| Edited a hyperparameter in the UI, nothing changed | Code reads its own literal, not `connect`'s return value | `params = task.connect({...})` then read `params[...]` |
| Two charts instead of two lines on one chart | Two `title`s used where one title with two `series` was meant | One `title`, several `series` |
| A metric is missing from the comparison table | It was `print`ed, or only ever a scalar curve | `report_single_value` for anything you want to sort by |
| File server quota exceeded / disk full | Default `output_uri` sends every artifact and checkpoint there | `output_uri="s3://bucket/clearml"` |
| Artifact upload is slow | Large object going to the file server over the internet | Object storage in the same region as the compute |
| `Dataset` content changed under a finished run | The dataset was never finalized | `ds.finalize()`, and consume by explicit version |
| `get_local_copy()` re-downloads every time | Cache directory not writable, or a different machine each run | Fix cache perms; on ephemeral runners mount a cache volume |
| Every run is called "Untitled" | No `task_name`, and the script name is generic | Always pass `task_name`; add tags in code |
| Console shows nothing until the task ends | Output buffered by Python | `python -u`, or `flush=True` |
| Two processes wrote into one task | `Task.init` called twice, or reused in a subprocess | One `Task.init` per process; use `Task.current_task()` elsewhere |
| The task shows `completed` but the model is missing | Weights saved after the script's last ClearML call, or outside a patched framework | Register explicitly with `OutputModel.update_weights` |
| Credentials committed to git | `clearml.conf` in the repo | Gitignore it globally; env vars in CI |
| Local run overwrote a "good" task | You reran instead of cloning | Completed tasks are read-only; clone, do not rerun |
| Metrics stop halfway through a long run | The process was killed (OOM): task left `in_progress` | Check machine metrics in the UI; the memory curve shows it |

## The habits that pay off most

<div class="cards">
  <div class="card"><div class="icon">🔝</div><h4><code>Task.init</code> on line one</h4><p>Above every framework import, no exceptions. It is the difference between automatic capture working and silently not.</p></div>
  <div class="card"><div class="icon">🏷️</div><h4>Tag in code, not by hand</h4><p><code>task.add_tags(["baseline"])</code> in the script. Tags added manually get forgotten, and an untaggable table is unnavigable.</p></div>
  <div class="card"><div class="icon">☁️</div><h4>Set <code>output_uri</code> once</h4><p>Point artifacts and models at object storage in <code>clearml.conf</code> and never think about the file server again.</p></div>
  <div class="card"><div class="icon">🔀</div><h4><code>execute_remotely</code> as a switch</h4><p>One line moves the run to a GPU queue; comment it out to debug locally. Same script both ways.</p></div>
  <div class="card"><div class="icon">📥</div><h4>Read from <code>connect</code>'s return</h4><p>The only way remote parameter overrides work. Reading your own literal is a bug that only shows up on an agent.</p></div>
  <div class="card"><div class="icon">📦</div><h4>Version data before you need to</h4><p>A <code>Dataset</code> with an <code>alias</code> turns "trained on the customer data" into a reproducible claim.</p></div>
  <div class="card"><div class="icon">🔢</div><h4><code>report_single_value</code> for finals</h4><p>Curves diagnose; single values rank. If it belongs in a comparison column, it is a single value.</p></div>
  <div class="card"><div class="icon">🧪</div><h4>Clone, never rerun</h4><p>A completed task is a record. Change something by cloning it, so the original stays intact and comparable.</p></div>
</div>

## Practice cards

Short, self-contained exercises. Each one takes a few minutes and leaves you with a fact you will not forget.

<ol class="guide-steps">
  <li><b>Break the init order on purpose</b>Move <code>Task.init</code> below <code>import torch</code>, run, and watch the scalars go missing with no error. Move it back. This one experiment prevents the most common ClearML support question.</li>
  <li><b>Watch the diff travel</b>Make an uncommitted edit, run a task, then open Execution &rarr; Uncommitted Changes in the UI and read your own patch. Now you know why a dirty tree is still reproducible.</li>
  <li><b>Do the title/series experiment</b>Log train and val loss with one title and two series, look at the chart, then split into two titles and look again. Two minutes, permanently fixes your plotting.</li>
  <li><b>Run the agent on your own laptop</b><code>clearml-agent daemon --queue default</code>, then clone a task in the UI and enqueue it. Watching both halves on one machine is what makes agents click.</li>
  <li><b>Prove the parameter override</b>Read from your literal instead of <code>connect</code>'s return, clone the task, change the value, enqueue. Watch it run with the old value. Then fix it and repeat.</li>
  <li><b>Fail on an unpushed commit</b>Commit locally, do not push, enqueue. Read the agent's git error. Push and re-enqueue the same task.</li>
  <li><b>Cause the lazy-import failure</b>Move an import inside a function, run locally (fine), then on the agent (<code>ImportError</code>). This is the failure mode that only exists remotely.</li>
  <li><b>Version and consume a dataset</b>Create 1.0.0, add a child 1.1.0 with one extra file, then consume it with <code>alias=</code> and find the recorded id in the training task's config.</li>
  <li><b>Compare three runs properly</b>Three learning rates, then Compare with "hide identical values" on. If more than one field differs, something in your setup is non-deterministic, so find out what.</li>
  <li><b>Recover a task id from a model</b>Open a registered model in the UI and trace it back to the exact commit that produced it. Time yourself; it should be under ten seconds.</li>
</ol>

## Debugging order

Follow this rather than guessing. The first two steps answer most problems.

<ol class="guide-steps">
  <li><b>Console tab</b>Your full stdout and stderr. Most failures are ordinary tracebacks and you can stop here.</li>
  <li><b>Execution tab</b>Commit, branch, entry point, working directory, and the installed package list the agent used. A wrong commit or a missing package explains most of the rest.</li>
  <li><b>Configuration tab</b>The values it ran with. On an agent-run clone these come from the server, not your defaults, and a surprising value here is usually the whole bug.</li>
  <li><b>Workers &amp; Queues</b>Is an agent watching that queue at all? A task stuck in <code>queued</code> is nearly always this.</li>
  <li><b>Machine metrics</b>The CPU/GPU/memory curves. A run that stops mid-training with no traceback was almost certainly killed for memory, and the curve shows it.</li>
  <li><b>Reproduce locally with the task's own config</b><code>Task.get_task(task_id=…).get_parameters()</code>, then run the script by hand with those values.</li>
</ol>

```python a debugging snippet worth keeping
from clearml import Task

t = Task.get_task(task_id="8f2c4b19e0a7d3f1c6b8a2e4d7091f3b")
print(t.status, t.get_last_iteration())
print(t.get_parameters())                 # what it ran with
print(t.get_last_scalar_metrics())        # what it produced
print(t.data.script.repository, t.data.script.version_num)
print(t.data.script.diff[:400])           # the patch that was applied
print(t.get_requirements() if hasattr(t, "get_requirements") else t.data.script.requirements)
t.mark_stopped()                          # abort a stuck run
```

## `Task.init` options worth knowing on day one

Most defaults are right. These five are the ones you will reach for.

```python
task = Task.init(
    project_name="vision/experiments",       # "/" nests projects
    task_name="resnet18 lr sweep",
    task_type=Task.TaskTypes.training,       # shows up as a filter in the UI
    output_uri="s3://my-bucket/clearml",     # artifacts and models to object storage
    reuse_last_task_id=False,                # always a fresh task, never overwrite
    auto_connect_frameworks={"matplotlib": False},
)
```

| Option | Use when |
|---|---|
| `output_uri` | Always, for anything larger than a report |
| `reuse_last_task_id=False` | You are iterating fast and do not want runs merged into one task |
| `task_type` | You want `data_processing` and `training` distinguishable in the table |
| `auto_connect_frameworks` | A framework's autologging is noisy or wrong for you |
| `continue_last_task=True` | Genuinely resuming a crashed long run, appending to the same task |

<div class="callout warn">
  <span class="ct"><code>reuse_last_task_id</code> defaults to reusing</span>
  If you run the same script twice from the same directory without changing anything, ClearML may <em>reuse</em> the previous task rather than creating a new one, which looks like your run vanished. It is a deliberate anti-clutter feature. Pass <code>reuse_last_task_id=False</code> when you want one task per run, which is nearly always during a sweep.
</div>

## Clone, do not rerun

The mental shift that makes ClearML click: **a completed task is a record, not a workspace.**
<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Clone it</h4>
    <ul>
      <li>The original stays intact and comparable</li>
      <li>The clone is a draft you can edit freely</li>
      <li>Your parameter change is visible in the compare view</li>
      <li>The history reads as a sequence of decisions</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Rerun the script with a tweak</h4>
    <ul>
      <li>A brand-new task with no stated relationship to the old one</li>
      <li>Or, worse, a reused task id that overwrites the old results</li>
      <li>Nothing records <em>why</em> the value changed</li>
      <li>The table fills with runs nobody can order</li>
    </ul>
  </div>
</div>

<div class="callout tip">
  <span class="ct">One line to remember</span>
  <b>If the code changed, run it. If only the configuration changed, clone it.</b> That single test decides correctly almost every time at this level.
</div>

## Set up so ClearML catches things for you

Do these four things once and an entire class of mistakes disappears.

```bash
# 1. Never commit credentials again
echo "clearml.conf" >> ~/.gitignore_global
git config --global core.excludesfile ~/.gitignore_global
```

```text ~/clearml.conf: the three edits that matter
sdk {
  development {
    # Every task on this machine sends artifacts and models to object storage
    default_output_uri: "s3://my-bucket/clearml"
  }
  storage {
    cache {
      # A big disk, so dataset caches survive and are shared between runs
      default_base_dir: "/mnt/data/clearml-cache"
    }
  }
}
```

```bash
# 2. Pin the SDK, so an upgrade never surprises a teammate mid-sprint
echo "clearml==1.16.4" >> requirements.txt

# 3. A local agent, for the clone-and-enqueue loop
clearml-agent daemon --queue default --detached

# 4. Confirm what the SDK thinks it is talking to
python -c "from clearml.config import get_config_object; print(get_config_object('api.api_server'))"
```

<div class="callout tip">
  <span class="ct">Put the reproduction commands in your README</span>
  Three lines (<code>pip install -r requirements.txt</code>, <code>clearml-init</code>, <code>python src/train.py</code>) are the most valuable documentation in the repository, because they are simultaneously the instructions and the acceptance test for whether the project is reproducible at all.
</div>

## Writing a tracked script that ages well

```python src/train.py
from clearml import Task                          # 1. ClearML import first

task = Task.init(                                 # 2. before heavy imports
    project_name="vision/experiments",
    task_name="resnet18 baseline",
    output_uri="s3://my-bucket/clearml",
    reuse_last_task_id=False,
)
task.add_tags(["baseline", "resnet18"])           # 3. tags in code

import torch                                      # 4. frameworks after init
from clearml import Dataset, OutputModel

params = task.connect({                           # 5. one flat dict of knobs
    "lr": 3e-4,
    "batch_size": 64,
    "epochs": 20,
    "seed": 42,
    "dataset_version": "1.1.0",
})

task.execute_remotely(queue_name="gpu")           # 6. comment out to debug locally

set_seed(params["seed"])                          # 7. seeded and recorded
data = Dataset.get(                               # 8. data version recorded
    dataset_project="datasets",
    dataset_name="iris",
    dataset_version=params["dataset_version"],
    alias="training data",
).get_local_copy()
```

| Rule | Why |
|---|---|
| ClearML imported and initialised first | Patching only works before the framework loads |
| Every tunable value in one connected dict | So a clone is fully reconfigurable from the UI |
| Read only from `connect`'s return value | So remote overrides take effect |
| Seed set from a connected parameter | Otherwise two "identical" runs differ and you cannot tell why |
| Dataset version as a parameter | A clone can be pointed at new data without a code change |
| `execute_remotely` on its own line | The one-line switch between local debugging and remote training |
| Tags in code | Manual tagging is forgotten exactly when you need it |

<div class="callout warn">
  <span class="ct">Anything above <code>execute_remotely</code> runs twice</span>
  Once locally when you register the task, and again on the agent. Keep that region cheap: imports, <code>connect</code> calls, and configuration only. Downloading a dataset or loading a model above that line means doing it twice, once on a laptop that did not need it.
</div>

## Reading the UI quickly

Learning to read these five tabs saves more time than any other single skill at this level.

| Tab | Holds | You go here to |
|---|---|---|
| **Execution** | Repo, commit, diff, entry point, packages, container, output destination | Confirm *what* ran |
| **Configuration** | Hyperparameters, `Args`, configuration objects, connected dataset aliases | Confirm what values it ran with |
| **Console** | Live stdout and stderr | Read a traceback |
| **Scalars** | Curves by title/series, plus the single-value table | Diagnose training |
| **Plots / Debug samples** | Figures, tables, images | Look at confusion matrices and sample outputs |

```text where each thing you logged ends up
task.connect({...})               → Configuration ▸ Hyperparameters ▸ General
argparse                          → Configuration ▸ Hyperparameters ▸ Args
task.connect_configuration(...)   → Configuration ▸ Configuration Objects
Dataset.get(..., alias="x")       → Configuration ▸ Hyperparameters ▸ Datasets
report_scalar(...)                → Scalars ▸ (one chart per title)
report_single_value(...)          → Scalars ▸ single values table
report_table / matplotlib figure  → Plots
report_image(...)                 → Debug samples
upload_artifact(...)              → Artifacts
torch.save / OutputModel          → Artifacts ▸ Output models, and the project's Models list
print(...)                        → Console  (and nowhere sortable — that is the point)
```

## Small things worth doing from day one

**Name tasks by what changed, not by date.** `resnet18 lr=1e-3 aug=heavy` beats `run_47`. The date is already recorded; the intent is not.

**Nest projects with `/`.** `research/nlp/ner` gives you a tree instead of four hundred siblings, and it costs nothing to adopt later.

**Report a single value for training time and model size.** They become columns you can sort, and they are the two numbers a reviewer asks for that nobody ever logs.

**`report_text` the things a future reader needs.** One line naming the dataset version and the reason for the run turns the task into a note to your future self.

**Set and connect the seed.** Two runs that differ for unknown reasons cost more time than any other single problem in ML work.

**Archive rather than delete.** Archived tasks leave the default views but stay fully queryable, so a wrong archive is recoverable and a wrong delete is not.

**Check the machine metrics on any run that ended strangely.** A missing traceback plus a memory curve that hits the ceiling is an OOM kill, and it looks like nothing else.

```python a two-line habit worth aliasing
task.add_tags([f"lr-{params['lr']}", f"bs-{params['batch_size']}"])
task.get_logger().report_text(f"data={params['dataset_version']} reason=baseline for Q3 report")
```

## A starter setup worth keeping

Copy this into a new project and delete what you do not need. Every line is something from this page.

```text .gitignore
clearml.conf
.clearml/
outputs/
*.pt
*.pkl
```

```python src/train.py
from clearml import Task

task = Task.init(
    project_name="vision/experiments",
    task_name="resnet18 baseline",
    task_type=Task.TaskTypes.training,
    output_uri="s3://my-bucket/clearml",
    reuse_last_task_id=False,
)
task.add_tags(["baseline"])

import torch
from clearml import Dataset, OutputModel

params = task.connect({
    "lr": 3e-4, "batch_size": 64, "epochs": 20,
    "seed": 42, "dataset_version": "1.1.0",
})

task.execute_remotely(queue_name="gpu")     # comment out for a local debug run

set_seed(params["seed"])
data = Dataset.get(dataset_project="datasets", dataset_name="iris",
                   dataset_version=params["dataset_version"],
                   alias="training data").get_local_copy()

logger = task.get_logger()
for epoch in range(params["epochs"]):
    tr, va, acc = train_one_epoch(data, params)
    logger.report_scalar("loss", "train", tr, epoch)
    logger.report_scalar("loss", "val", va, epoch)
    logger.report_scalar("accuracy", "val", acc, epoch)

logger.report_single_value("test_accuracy", test(data))
logger.report_single_value("train_minutes", elapsed_minutes())
task.upload_artifact("predictions", predictions_df)

model = OutputModel(task=task, name="resnet18-cls", framework="PyTorch")
model.update_weights(weights_filename="model.pt")
model.tags = ["candidate"]
```

```bash
# One-time setup
pip install clearml clearml-agent
clearml-init
echo "clearml.conf" >> ~/.gitignore_global

# Everyday loop
python src/train.py                      # registers, enqueues to gpu, exits
# → compare in the UI, clone the winner, edit one value, enqueue again

# A worker wherever the hardware is
clearml-agent daemon --queue gpu --docker nvidia/cuda:12.1.0-runtime-ubuntu22.04 --detached
```

Eight details in there are the whole lesson of this page: ClearML imported and initialised before any framework, `output_uri` pointed at object storage, `reuse_last_task_id=False` so no run overwrites another, tags added in code, every knob in one connected dict read back from the return value, the seed and the dataset version as parameters, `execute_remotely` as a one-line local/remote switch, and single values for the two numbers a reviewer will ask about.

**Mid-level tips go deeper on every one of these:** hyperparameter optimisation without wasting GPU hours, agent caching and why the second run is fast, docker mode and `clearml-task` for code you cannot modify, `clearml-session` for remote debugging, dataset squashing and cache strategy on ephemeral runners, the services queue, model promotion as a workflow, and diagnosing "runs locally, fails on the agent" properly.
