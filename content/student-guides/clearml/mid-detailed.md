This is part two of three. It picks up exactly where Beginner ended and takes **every topic from there further**, then adds the machinery you have not met yet. Nothing is dropped and nothing is repeated for its own sake — where you already know the basics, we go straight to the depth.

## Where this picks up

| Topic you already use | What this level adds |
|---|---|
| `Task.init` | Task types, `Task.create` vs `init`, `continue_last_task`, reuse semantics, distributed runs |
| Automatic capture | Exactly what the framework patches hook, and how to fix detected requirements |
| `task.connect` | Sections, nested objects, `connect_configuration` round-trips, and `${…}` references |
| Logger | Custom plots, tables, media, iteration offsets, and reporting from a subprocess |
| Artifacts | Streaming, `wait_on_upload`, storage backends, and deleting them safely |
| Models | The registry as a **promotion workflow**: tags, publish, lineage, and ClearML Serving |
| Datasets | Squashing, parent chains, cache strategy, and dataset-level metrics |
| Agents | Virtualenv vs docker mode, caching layers, `--services-mode`, and CPU/GPU pinning |
| Queues | Priority, multi-queue workers, the services queue, and autoscaling |
| Pipelines | Controller vs decorator in depth, caching, retries, monitoring, and parameter plumbing |
| Debugging | `clearml-session`, log levels, reproducing an agent environment locally |
| — **new** — | HPO with `HyperParameterOptimizer` · `clearml-task` · ClearML Serving · Reports · CI/CD |

Each section starts with the problem it solves, and ends with a **Try it** you can do on a real project in a few minutes.

## Task creation, reuse, and lifecycle

Beginner used one entry point: `Task.init`. At this level you need three, and knowing which is which removes a whole category of confusion.

```python
# 1. init — "this process IS the task". Patches frameworks, captures the environment.
task = Task.init(project_name="vision", task_name="train")

# 2. create — "build a task object for someone ELSE to run". No patching, no capture.
child = Task.create(
    project_name="vision",
    task_name="train on the new split",
    script="src/train.py",
    repo="https://github.com/org/repo",
    branch="main",
    requirements_file="requirements.txt",
    docker="nvidia/cuda:12.1.0-runtime-ubuntu22.04",
)
Task.enqueue(child, queue_name="gpu")

# 3. clone — "copy an existing task as an editable draft"
clone = Task.clone(source_task="8f2c4b19…", name="lr=1e-3")
clone.set_parameter("General/lr", 1e-3)
Task.enqueue(clone, queue_name="gpu")
```

| Call | Patches frameworks | Captures environment | Runs now | Use for |
|---|---|---|---|---|
| `Task.init` | Yes | Yes | Yes | Your own training script |
| `Task.create` | No | No — you declare it | No | Launching a script from a controller |
| `Task.clone` | No | Inherited | No | Reruns with different parameters |

Two lifecycle behaviours surprise people, and both are documented but easy to miss:

**Reuse.** `Task.init` with default settings may *reuse* the last task created by the same script in the same project if that task has no recorded iterations or artifacts. It exists to stop a debugging session producing forty empty tasks. During a sweep it looks like your runs are vanishing, so pass `reuse_last_task_id=False`.

**Continuation.** `continue_last_task=True` (or `=task_id`) resumes an existing task, appending scalars from the last reported iteration instead of restarting at zero. That is the right tool for a job that got OOM-killed at epoch 40 of 100 — and the wrong tool for a fresh experiment, because the scalar history will be a splice of two runs.

```python
task = Task.init(
    project_name="vision",
    task_name="resnet18",
    continue_last_task=True,        # resume, appending iterations
    reuse_last_task_id=False,       # never silently reuse a different run
)
```

Task types are more than decoration — they drive UI filtering and, for pipelines and services, actual behaviour:

| Type | For |
|---|---|
| `training` | The default for experiments |
| `data_processing` | ETL and dataset creation; keeps it out of the experiment table |
| `testing` / `qc` | Evaluation runs, so they are filterable separately |
| `inference` | Batch scoring jobs |
| `controller` | A pipeline controller. Long-lived, low-resource |
| `service` | Something that runs continuously on the services queue |
| `optimizer` | An HPO controller |

<div class="callout warn">
  <span class="ct">A distributed run needs one task, not one per rank</span>
  Under <code>torchrun</code> or <code>accelerate</code>, every rank executes your script. If each calls <code>Task.init</code> you get eight tasks, eight sets of scalars, and a UI you cannot read. Initialise on rank zero and use <code>Task.current_task()</code> elsewhere — or let ClearML's own distributed support attach the workers to the master task.
</div>

```python distributed pattern
import os
from clearml import Task

rank = int(os.environ.get("RANK", 0))
task = Task.init(project_name="vision", task_name="ddp") if rank == 0 else None

# Later, anywhere in the codebase:
current = Task.current_task()          # the task on rank 0, None elsewhere
if current:
    current.get_logger().report_scalar("loss", "train", loss, step)
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run the same script twice in a row without <code>reuse_last_task_id=False</code> and check whether you got one task or two.</li>
    <li>Now add artifacts to the first run and repeat. Note that reuse stops happening once a task has real content.</li>
    <li>Use <code>Task.create</code> plus <code>Task.enqueue</code> from a controller script to launch a training script you do not modify at all.</li>
    <li>Kill a run at iteration 50, then relaunch with <code>continue_last_task=True</code> and read the scalar chart.</li>
  </ol>
  <em>reuse only kicks in for empty tasks, which is exactly when you want it. Step three is the important one: <code>Task.create</code> is how you drive code that has no ClearML in it, and it is the foundation of both <code>clearml-task</code> and pipeline steps.</em>
</div>

## Automatic capture: the mechanism, and its edges

Beginner said "automagic". Here is what is actually happening, because at this level you have to fix it when it goes wrong.

On `Task.init`, the SDK installs **binding patches**. Each supported framework has a binding module that wraps specific functions:

| Framework | Patched | Result |
|---|---|---|
| TensorBoard / TensorBoardX | `SummaryWriter.add_*` | Scalars, histograms, images, text |
| PyTorch | `torch.save` | Every checkpoint becomes an output model |
| Keras / TF | `Model.save`, callbacks | Models plus TB scalars |
| joblib / scikit-learn | `joblib.dump` | Output model |
| XGBoost / LightGBM | `save_model` / `Booster.save` | Output model |
| matplotlib | `pyplot.show` / `savefig` | A plot on the task |
| `argparse` | `parse_args` | Hyperparameters under `Args` |
| `hydra` | The main decorator | The full resolved config |
| `joblib`/`loky` | Process start | Child processes attach to the same task |

Requirements detection is separate and works by inspecting `sys.modules` **at the end of the run**, mapping imported modules to installed distributions. That yields three failure modes worth knowing:

<ol class="guide-steps">
  <li><b>A lazily imported package is missed</b>Imported inside a function that never ran, so it is not in <code>sys.modules</code>. The agent then fails with <code>ImportError</code>. Import at module level or declare it.</li>
  <li><b>The wrong index is used</b>A detected <code>torch==2.3.0</code> installs the CPU build from PyPI, not the CUDA build from the PyTorch index. Docker mode with a CUDA base image is the real fix.</li>
  <li><b>A local or private package is unresolvable</b>Detected as a name the agent cannot install. Vendor it into the repo, or make the private index available to the agent.</li>
</ol>

You can take control:

```python
# Declare the environment explicitly rather than relying on detection
task.set_packages("requirements.txt")            # a file
task.add_requirements("torch", "2.3.0")          # a single pin
task.add_requirements("-r requirements-gpu.txt") # pass-through to pip

# Or force docker mode from the code
task.set_base_docker(
    docker_image="nvidia/cuda:12.1.0-runtime-ubuntu22.04",
    docker_arguments="--shm-size=8g --ipc=host",
)
```

```bash
# On the agent side, ignore detection entirely and trust the container
clearml-agent daemon --queue gpu --docker my-registry/train:2.3.0 \
  --force-current-version
```

```text clearml.conf on the agent — the settings that matter
agent {
  package_manager {
    type: pip
    system_site_packages: true       # trust what the container already has
    force_upgrade: false
    extra_index_url: ["https://download.pytorch.org/whl/cu121"]
  }
}
```

<div class="callout tip">
  <span class="ct"><code>system_site_packages: true</code> is the single most useful agent setting</span>
  In docker mode with a prepared image, it tells the agent to use the container's existing packages instead of reinstalling everything into a fresh virtualenv. Setup time drops from minutes to seconds, and you stop fighting CUDA wheel resolution — because the image already resolved it.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Look at a completed task's Execution &rarr; Installed Packages and compare it against your <code>pip freeze</code>. Note that it lists what you <em>imported</em>, not everything installed.</li>
    <li>Move one import inside a function, rerun, and confirm the package disappears from the list.</li>
    <li>Call <code>task.set_packages("requirements.txt")</code> and confirm the list is now exactly your file.</li>
    <li>Run an agent in docker mode with <code>system_site_packages: true</code> and time the setup phase against virtualenv mode.</li>
  </ol>
  <em>a package list that reflects imports rather than the environment, and — in step four — a setup phase that goes from minutes to seconds. That timing difference is the whole argument for prepared images at this level.</em>
</div>

## Configuration: sections, objects, and references

Beginner connected one flat dict. Real projects have layered config, and ClearML has three answers.

```python
# Sections keep unrelated knobs apart in the UI
task.connect({"lr": 3e-4, "epochs": 20}, name="optimizer")
task.connect({"layers": 18, "width": 64}, name="architecture")
task.connect({"num_workers": 8, "prefetch": 2}, name="dataloader")
```

Each `name` becomes its own collapsible section, so a clone's Configuration tab is navigable instead of being a wall of forty keys.

For anything nested, `connect_configuration` is the right tool, and it round-trips both directions:

```python
# Local run: reads the file, uploads its contents, returns the local path
# Agent run: downloads the server's (possibly edited) content to a temp file,
#            returns THAT path — so a UI edit changes behaviour with no code change
config_path = task.connect_configuration("configs/model.yaml", name="model")
cfg = yaml.safe_load(open(config_path))

# A dict works too, and comes back as a dict
cfg = task.connect_configuration({"arch": "resnet18", "head": {"dropout": 0.1}}, name="model")
```

| | `connect` | `connect_configuration` |
|---|---|---|
| Shape | Flat key/value | Arbitrary nested, or a whole file |
| UI | Editable rows | An editable text blob |
| Returns | The dict, remote-overridden | A **path** for a file, a dict for a dict |
| Use for | Hyperparameters you sweep | Model definitions, feature lists, prompts |

Parameter **references** are what make pipelines and HPO able to rewire a task without editing code:

```python
# In a pipeline controller
pipe.add_parameter("lr", 3e-4)
pipe.add_step(
    name="train",
    base_task_name="resnet18 baseline",
    parameter_override={
        "General/lr": "${pipeline.lr}",                 # from the pipeline's own params
        "General/data": "${prepare.artifacts.dataset.url}",  # from a previous step
        "Args/epochs": "${pipeline.epochs}",
    },
)
```

| Reference | Resolves to |
|---|---|
| `${pipeline.NAME}` | A pipeline-level parameter |
| `${STEP.parameters.General/x}` | Another step's parameter |
| `${STEP.artifacts.NAME.url}` | Another step's artifact URL |
| `${STEP.models.output.-1.url}` | That step's last output model |
| `${STEP.id}` | The step's task id |

<div class="callout warn">
  <span class="ct">Parameter names are section-qualified, and getting it wrong fails silently</span>
  <code>General/lr</code>, not <code>lr</code>. A connected dict with no <code>name</code> lands in <code>General</code>; <code>argparse</code> lands in <code>Args</code>; a named section uses that name. An override targeting a key that does not exist is <b>not</b> an error — it is simply added as a new, unread parameter, and your step runs with its defaults. Check the executed task's Configuration tab to confirm the override landed.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Split one flat dict into three named sections and compare the Configuration tab before and after.</li>
    <li>Connect a YAML file, then clone the task, edit the YAML <em>in the UI</em>, and enqueue. Confirm the agent used your edited version.</li>
    <li>In a two-step pipeline, override a parameter with <code>${pipeline.x}</code> and verify it landed by reading the step task's config.</li>
    <li>Now misspell the target key on purpose and observe that nothing errors.</li>
  </ol>
  <em>step two is the one worth internalising: editing a config file in a browser and having a remote run pick it up is the feature that makes ClearML usable by people who do not touch the repository. Step four shows you the silent failure that pairs with it.</em>
</div>

## Agents in depth: modes, caching, and pinning

The agent is the piece with the most operational surface, and understanding its three phases explains every "why is setup slow" question.

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>1</span><strong>Claim</strong><small>Long-polls the API server for the highest-priority task on its queues.</small></div>
  <div class="guide-timeline-item"><span>2</span><strong>Environment</strong><small>Virtualenv mode: create a venv, install the package list. Docker mode: pull the image, then optionally reuse its site-packages.</small></div>
  <div class="guide-timeline-item"><span>3</span><strong>Code</strong><small>Clone the repo at the recorded commit into a cached checkout, apply the stored diff.</small></div>
  <div class="guide-timeline-item"><span>4</span><strong>Execute</strong><small>Run the entry point, streaming stdout/stderr and machine metrics to the server.</small></div>
  <div class="guide-timeline-item"><span>5</span><strong>Report</strong><small>Upload artifacts and models, set the final status, and go back to polling.</small></div>
</div>

Two modes, and the choice matters more than any other agent decision:

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Docker mode</h4>
    <ul>
      <li>System libraries, CUDA, and drivers come from the image</li>
      <li>Reproducible: the image digest is recorded on the task</li>
      <li>Isolated between jobs, so a bad run cannot poison the host</li>
      <li>With <code>system_site_packages</code>, setup is seconds</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Virtualenv mode</h4>
    <ul>
      <li>Only Python packages are managed; system libs are the host's</li>
      <li>CUDA wheel resolution is a recurring fight</li>
      <li>Faster to start on a pre-warmed host, and needs no Docker</li>
      <li>Fine for CPU jobs and for a laptop agent</li>
    </ul>
  </div>
</div>

The caches are what make the second run fast. There are four, and they are separate:

| Cache | Holds | Config key |
|---|---|---|
| pip / package cache | Downloaded wheels | `agent.pip_download_cache` |
| venv cache | Whole prebuilt virtualenvs, keyed on the requirement set | `agent.venvs_cache` |
| git cache | Bare repository clones, so fetches are incremental | `agent.vcs_cache` |
| storage cache | Datasets, artifacts, and models fetched by the SDK | `sdk.storage.cache` |

```text clearml.conf on an agent host
agent {
  vcs_cache { enabled: true, path: "/mnt/cache/vcs" }
  pip_download_cache { enabled: true, path: "/mnt/cache/pip" }
  venvs_cache { max_entries: 20, free_space_threshold_gb: 20, path: "/mnt/cache/venvs" }
  docker_apply_cuda_version_runtime: true
  package_manager {
    type: pip
    system_site_packages: true
    extra_index_url: ["https://download.pytorch.org/whl/cu121"]
  }
}
sdk { storage { cache { default_base_dir: "/mnt/cache/clearml" } } }
```

Running workers, in the four shapes you will actually need:

```bash
# One worker per GPU, both on the same queue
clearml-agent daemon --queue gpu --gpus 0 --detached
clearml-agent daemon --queue gpu --gpus 1 --detached

# Multi-GPU jobs: pin two GPUs to one worker
clearml-agent daemon --queue gpu-big --gpus 0,1 --detached

# Queue priority: drain "urgent" before "gpu"
clearml-agent daemon --queue urgent gpu --detached

# The services queue: many light, long-lived tasks on one CPU box
clearml-agent daemon --queue services --services-mode --cpu-only --detached
```

`--services-mode` is the one worth explaining. Normally an agent runs one task at a time. In services mode it launches each task as a background container and immediately goes back to polling, so a single small machine can host dozens of pipeline controllers, HPO optimisers, and monitoring tasks concurrently. Controllers spend their lives waiting, so they must never occupy a GPU worker.

<div class="callout warn">
  <span class="ct">Never run pipeline controllers on your GPU queue</span>
  A controller is a task that mostly sleeps while its steps run. Put it on a GPU worker and it holds that GPU for the pipeline's entire duration doing nothing, while its own GPU steps queue behind it — a self-inflicted deadlock if there is only one worker. Controllers, optimisers, and monitors belong on <code>services</code>.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run an agent in virtualenv mode and time the setup phase from the console log. Run the same task again and time it once more.</li>
    <li>Enable <code>venvs_cache</code> and repeat. Compare all three numbers.</li>
    <li>Start two agents on one queue and enqueue three tasks. Watch the third wait.</li>
    <li>Start a services-mode agent and enqueue three pipeline controllers. Confirm all three run at once.</li>
  </ol>
  <em>the venv cache is usually the biggest single win — a repeated requirement set goes from a multi-minute install to a copy. Step four shows why <code>--services-mode</code> exists: without it, three controllers on one worker run strictly one after another.</em>
</div>

## `clearml-task`: launching code with no SDK in it

You will often need to run a repository you cannot or should not modify — someone else's training script, an open-source benchmark, a colleague's branch. `clearml-task` builds a task from the outside.

```bash
clearml-task \
  --project vision \
  --name "external repo baseline" \
  --repo https://github.com/some/repo.git \
  --branch main \
  --script train.py \
  --args lr=0.001 epochs=30 \
  --requirements requirements.txt \
  --docker nvidia/cuda:12.1.0-runtime-ubuntu22.04 \
  --queue gpu
```

It creates a task with the repository, commit, entry point, arguments, and environment recorded, then enqueues it. The script itself never imported ClearML, yet the run is now tracked, comparable, cloneable, and re-launchable. Automatic capture of TensorBoard scalars still works, because the agent injects the SDK before execution.

| Flag | Does |
|---|---|
| `--repo` / `--branch` / `--commit` | What to clone |
| `--script` | The entry point, relative to the repo root |
| `--args` | Command-line arguments, recorded as editable parameters |
| `--requirements` | Explicit environment, instead of detection |
| `--docker` | Base image, and therefore CUDA and system libraries |
| `--queue` | Enqueue immediately; omit it to leave a draft |
| `--import-offline` | Import a previously recorded offline run |

The related trick is **offline mode**, for a machine with no network access to the server:

```python
from clearml import Task
Task.set_offline(offline_mode=True)
task = Task.init(project_name="vision", task_name="air-gapped run")
# ... trains normally, writing everything to a local zip
```

```bash
# Later, from a connected machine
clearml-task --import-offline /path/to/offline-<id>.zip
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Pick any public training repository and launch it with <code>clearml-task</code> against your local agent.</li>
    <li>Confirm the task's Execution tab has the repo and commit, and Configuration has your <code>--args</code>.</li>
    <li>Clone it in the UI, change one argument, and enqueue. You have just reconfigured someone else's code from a browser.</li>
    <li>Run something in offline mode, then import the zip and check that scalars survived.</li>
  </ol>
  <em>tracking and re-execution for code that knows nothing about ClearML. Step three is the point: the "clone, edit, enqueue" loop is not a property of your script, it is a property of the platform.</em>
</div>

## Hyperparameter optimisation

Beginner ran three learning rates by hand. `HyperParameterOptimizer` does that properly: it clones a base task N times, sets parameters from a search strategy, enqueues them, watches the objective, and kills the runs that are clearly losing.

```python hpo.py
from clearml import Task
from clearml.automation import (
    HyperParameterOptimizer, DiscreteParameterRange,
    UniformParameterRange, UniformIntegerParameterRange,
)
from clearml.automation.optuna import OptimizerOptuna

task = Task.init(
    project_name="vision",
    task_name="resnet18 HPO",
    task_type=Task.TaskTypes.optimizer,
    reuse_last_task_id=False,
)

optimizer = HyperParameterOptimizer(
    base_task_id="8f2c4b19e0a7d3f1c6b8a2e4d7091f3b",   # a completed, working run
    hyper_parameters=[
        UniformParameterRange("General/lr", min_value=1e-5, max_value=1e-2, log_scale=True),
        DiscreteParameterRange("General/batch_size", values=[32, 64, 128]),
        UniformIntegerParameterRange("General/layers", min_value=2, max_value=8),
    ],
    objective_metric_title="accuracy",
    objective_metric_series="val",
    objective_metric_sign="max",
    optimizer_class=OptimizerOptuna,
    execution_queue="gpu",
    max_number_of_concurrent_tasks=4,
    total_max_jobs=40,
    max_iteration_per_job=30,
    min_iteration_per_job=5,
    time_limit_per_job=45.0,          # minutes
)

optimizer.set_report_period(2.0)      # minutes between progress reports
optimizer.start()                      # or start_locally() to debug
optimizer.wait()
print(optimizer.get_top_experiments(top_k=5))
optimizer.stop()
```

| Strategy | Class | When |
|---|---|---|
| Random | `RandomSearch` | A baseline, and a sanity check on your ranges |
| Grid | `GridSearch` | Few discrete parameters, exhaustive coverage required |
| Optuna (TPE) | `OptimizerOptuna` | The default choice; good with continuous ranges |
| BOHB | `OptimizerBOHB` | Expensive training where early stopping saves the most |

The parameters that decide whether this saves GPU hours or wastes them:

| Setting | Effect |
|---|---|
| `max_number_of_concurrent_tasks` | Parallelism. Must fit your worker count, or trials just queue |
| `total_max_jobs` | The budget. Set it deliberately, not optimistically |
| `min_iteration_per_job` | Trials are protected from pruning until here — too low and you kill slow starters |
| `max_iteration_per_job` | Hard cap; the main lever on cost |
| `time_limit_per_job` | Wall-clock safety net for a run that hangs |
| `objective_metric_*` | Must match a reported `title`/`series` **exactly**, or nothing is optimised |

<div class="callout warn">
  <span class="ct">The objective metric must match a reported scalar exactly</span>
  <code>objective_metric_title="accuracy"</code> with <code>series="val"</code> only works if your base task calls <code>report_scalar("accuracy", "val", …)</code>. A mismatch does not raise — the optimiser simply sees no objective, cannot rank anything, and degenerates into random search that never prunes. Run the base task first, look at the Scalars tab, and copy the exact strings.
</div>

<div class="callout tip">
  <span class="ct">The base task must be a completed, working run</span>
  HPO clones it. If the base task fails, all forty trials fail identically and you have burned a queue. Always validate the base task end to end — including on the agent, not just locally — before pointing an optimiser at it.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run a base task that reports <code>accuracy/val</code> per epoch, and confirm the exact title and series in the UI.</li>
    <li>Launch an Optuna optimiser with a small budget (<code>total_max_jobs=8</code>) against your local agent.</li>
    <li>Open the optimiser task's Plots tab and read the parallel-coordinates and objective-over-time plots.</li>
    <li>Now misspell the objective series and rerun. Note that nothing errors and no pruning happens.</li>
  </ol>
  <em>a live pruning plot showing weak trials dying early — and, in step four, an optimiser that silently does nothing useful. That silent failure is the single most expensive HPO mistake, because you only notice after the budget is spent.</em>
</div>

## Datasets at scale

Beginner created a version and consumed it. Here is the machinery, because dataset decisions are where storage bills and job startup times are decided.

A dataset is a task whose artifacts are **chunked zip archives** plus a file-list state. A child version stores only its own chunks and points at its parents:

```text a parent chain
iris 1.0.0   ── chunk_000.zip (10k rows)
   └─ 1.1.0  ── chunk_000.zip (+2k rows)          parents: [1.0.0]
        └─ 1.2.0 ── chunk_000.zip (relabelled 500)  parents: [1.1.0]
```

`get_local_copy()` walks that chain, downloads every needed chunk, and materialises a flattened view. That is cheap for three versions and expensive for three hundred — which is what `squash` is for:

```python
from clearml import Dataset

# Flatten a long chain into one self-contained version
Dataset.squash(
    dataset_name="iris-flat",
    dataset_project="datasets",
    dataset_ids=["id-1.0.0", "id-1.1.0", "id-1.2.0"],
)
```

The operations that matter beyond create/add/finalize:

```python
ds = Dataset.create(dataset_project="datasets", dataset_name="images",
                    parent_datasets=[parent_id])

ds.add_files("./new", wildcard="*.jpg", recursive=True)
ds.remove_files("old/*.jpg")                       # tombstoned in this child
ds.add_external_files(source_url="s3://bucket/raw/", recursive=True)  # link, do not copy
ds.upload(chunk_size=512, max_workers=8, compression="ZIP_DEFLATED")
ds.finalize()

ds.get_logger().report_table("class balance", "train", 0, table_plot=balance_df)
ds.set_metadata({"rows": 12000, "labelled_by": "vendor-a"})
print(ds.list_files(), ds.file_count, ds.total_size)
```

| Method | Use for |
|---|---|
| `add_files` | Copy files into the dataset (uploaded as chunks) |
| `add_external_files` | Register files that stay in your bucket — no copy, no duplication |
| `remove_files` | Delete in a child version; parents are untouched |
| `get_local_copy` | Read-only, cached, shared across tasks on the machine |
| `get_mutable_local_copy` | A fresh writable extraction |
| `squash` | Collapse a long parent chain into one version |
| `set_metadata` / `get_logger` | Statistics and plots attached to the data itself |

<div class="callout tip">
  <span class="ct"><code>add_external_files</code> is the right answer for very large data</span>
  It records paths and hashes without copying bytes, so a 5 TB bucket becomes a versioned dataset without a second 5 TB copy. The trade is that immutability now depends on <b>your bucket</b> — if someone overwrites the underlying object, the "immutable" version silently changes. Pair it with bucket versioning and a write-restricted prefix, which Senior covers.
</div>

Two operational habits that matter here:

**Chunk size is a real tuning knob.** Default chunking produces many medium zips. Very many small files benefit from larger chunks (fewer requests); a few huge files benefit from smaller ones (better parallelism on download).

**Cache placement decides your job startup time.** On ephemeral runners the SDK cache is empty every time, so every job re-downloads the dataset. Mount a persistent volume at `sdk.storage.cache.default_base_dir` and the second job on that node starts immediately.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Build a five-deep parent chain, then time <code>get_local_copy()</code>. Squash it and time the same call again.</li>
    <li>Register a folder with <code>add_external_files</code> and compare the dataset's stored size against the same folder added with <code>add_files</code>.</li>
    <li>Attach a class-balance table to the dataset with <code>get_logger().report_table</code> and view it in the UI.</li>
    <li>Delete your SDK cache directory, fetch a dataset, then fetch again. Compare the two times.</li>
  </ol>
  <em>squashing turns a chain walk into one download, external files cost almost no storage, and a warm cache turns a multi-minute fetch into nothing. Step three is underused: a dataset that carries its own statistics answers "is this data any good?" without loading it.</em>
</div>

## Pipelines properly

Beginner wrote a three-component pipeline. Here is what to know once pipelines become the thing you actually ship.

The controller API, with everything you need for production:

```python pipeline.py
from clearml import PipelineController

def pre_execute(pipeline, node, params):
    """Runs before a step is enqueued. Return False to skip it."""
    if node.name == "evaluate" and params.get("General/skip_eval"):
        return False
    return True

def post_execute(pipeline, node):
    """Runs after a step finishes — good place for a promotion decision."""
    acc = node.job.task.get_last_scalar_metrics() \
        .get("accuracy", {}).get("val", {}).get("last", 0)
    pipeline.get_logger().report_single_value(f"{node.name}_accuracy", acc)

pipe = PipelineController(
    name="nightly-train",
    project="vision",
    version="1.2.0",
    add_pipeline_tags=True,          # tag every step with the pipeline id
    docker="python:3.11-slim",
    repo="https://github.com/org/repo",
)

pipe.add_parameter("lr", 3e-4)
pipe.add_parameter("dataset_version", "1.1.0")

pipe.add_step(
    name="prepare",
    base_task_project="vision",
    base_task_name="make dataset",
    parameter_override={"General/version": "${pipeline.dataset_version}"},
    cache_executed_step=True,
    execution_queue="cpu",
)
pipe.add_step(
    name="train",
    parents=["prepare"],
    base_task_project="vision",
    base_task_name="resnet18 baseline",
    parameter_override={
        "General/lr": "${pipeline.lr}",
        "General/data_id": "${prepare.artifacts.dataset_id.url}",
    },
    execution_queue="gpu",
    retry_on_failure=2,
    pre_execute_callback=pre_execute,
    post_execute_callback=post_execute,
    monitor_metrics=[("accuracy", "val")],
    monitor_models=["resnet18-cls"],
)
pipe.add_step(
    name="evaluate",
    parents=["train"],
    base_task_project="vision",
    base_task_name="evaluate",
    parameter_override={"General/model_url": "${train.models.output.-1.url}"},
    execution_queue="cpu",
)

pipe.start(queue="services")        # start_locally(run_pipeline_steps_locally=True) to debug
```

| Feature | What it buys you |
|---|---|
| `cache_executed_step=True` | An unchanged step with unchanged inputs is reused, not rerun |
| `retry_on_failure=N` | Transient failures (spot preemption, a flaky download) self-heal |
| `pre_execute_callback` | Conditional steps — return `False` to skip |
| `post_execute_callback` | Promotion gates and aggregate reporting |
| `monitor_metrics` | The step's metric is mirrored onto the pipeline task, so one page shows everything |
| `monitor_models` / `monitor_artifacts` | The pipeline surfaces its steps' outputs directly |
| `add_pipeline_tags=True` | Every step is tagged with the pipeline, so a run is filterable as a unit |

Caching deserves a precise statement, because people expect it to be smarter than it is: a step is reused when its **base task, its parameters, and its code** are unchanged. Change a parameter and it reruns. Change nothing and it is skipped, and the *previous* run's artifacts are wired into the downstream step. It does not hash your input files, so a step reading a mutable path will happily reuse a stale result — which is a good argument for versioned datasets rather than paths.

<div class="callout warn">
  <span class="ct">A pipeline controller is a task, so it needs a worker of its own</span>
  <code>pipe.start(queue="services")</code> enqueues the controller, which then enqueues its steps. If nothing is watching <code>services</code>, the pipeline never starts and the UI shows a queued controller with no steps — which reads like a broken pipeline but is a missing worker. <code>start_locally()</code> runs the controller in your process instead, which is how you should develop.
</div>

Scheduling turns a pipeline into a product:

```python scheduler.py
from clearml.automation import TaskScheduler

scheduler = TaskScheduler(sync_frequency_minutes=5)
scheduler.add_task(
    schedule_task_id="pipeline-controller-task-id",
    queue="services",
    minute=0, hour=2,               # 02:00 daily
)
scheduler.start()                   # itself a task, on the services queue
```

There is also a **trigger** scheduler, which is the more interesting one: it fires when a dataset or model changes rather than on a clock.

```python
from clearml.automation import TriggerScheduler

trigger = TriggerScheduler()
trigger.add_dataset_trigger(
    schedule_task_id="pipeline-controller-task-id",
    queue="services",
    trigger_project="datasets",
    trigger_name="iris",
)
trigger.add_model_trigger(
    schedule_task_id="eval-task-id",
    queue="services",
    trigger_project="vision",
    trigger_on_tags=["candidate"],
)
trigger.start()
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Build a three-step controller pipeline and run it with <code>start_locally()</code>. Then run it on the services queue.</li>
    <li>Rerun it unchanged and confirm the cached step is skipped in the DAG view.</li>
    <li>Add <code>monitor_metrics</code> to the training step and check that the metric appears on the <em>pipeline</em> task.</li>
    <li>Add a <code>pre_execute_callback</code> that skips the evaluation step when a pipeline parameter is set, and prove it works both ways.</li>
    <li>Register a dataset trigger and then finalize a new dataset version. Watch the pipeline start on its own.</li>
  </ol>
  <em>step five is the moment a pipeline stops being a script you run and becomes a system that reacts. Step three is the underrated one: a pipeline page that shows its steps' metrics is the difference between one link to share and five.</em>
</div>

## The model registry as a promotion workflow

Beginner registered a model and tagged it. At this level the registry is a **workflow**, and the tag is the contract between training and serving.

```python promote.py
from clearml import Model, Task

candidates = Model.query_models(
    project_name="vision",
    model_name="resnet18-cls",
    tags=["candidate"],
    only_published=False,
    max_results=20,
)

def score(model):
    return model.get_metadata().get("val_accuracy", 0)

best = max(candidates, key=score)
current = Model.query_models(project_name="vision", model_name="resnet18-cls",
                             tags=["production"], max_results=1)

if not current or score(best) > score(current[0]) + 0.002:
    if current:
        current[0].tags = [t for t in current[0].tags if t != "production"] + ["archived"]
    best.tags = [t for t in best.tags if t != "candidate"] + ["production"]
    best.publish()                        # freeze it
    print("promoted", best.id)
else:
    print("no promotion: improvement below threshold")
```

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>1</span><strong>Train</strong><small>The task saves weights; a model appears, tagged <code>candidate</code>, linked to the task and its commit.</small></div>
  <div class="guide-timeline-item"><span>2</span><strong>Evaluate</strong><small>A separate task loads the candidate by tag and writes metrics into the model's metadata.</small></div>
  <div class="guide-timeline-item"><span>3</span><strong>Gate</strong><small>A promotion task compares against the current production model with an explicit margin.</small></div>
  <div class="guide-timeline-item"><span>4</span><strong>Promote</strong><small>Tags move; the winner is published, which makes it read-only.</small></div>
  <div class="guide-timeline-item"><span>5</span><strong>Serve</strong><small>Serving queries by tag, so deployment is a tag move rather than a code change.</small></div>
</div>

Metadata is the part people skip, and it is what makes the gate writable at all:

```python
from clearml import OutputModel

model = OutputModel(task=task, name="resnet18-cls", framework="PyTorch")
model.update_weights(weights_filename="model.pt", auto_delete_file=False)
model.update_design(config_dict={"arch": "resnet18", "classes": 10, "input": [3, 224, 224]})
model.set_metadata("val_accuracy", 0.941, v_type="float")
model.set_metadata("dataset_version", "1.1.0")
model.set_metadata("commit", task.data.script.version_num)
model.tags = ["candidate"]
```

| Field | Why it matters |
|---|---|
| `update_design` | The input/output contract, so a consumer can validate shapes |
| `set_metadata` | Queryable numbers — this is what a promotion gate reads |
| `tags` | The routing mechanism; keep the vocabulary small and enforced |
| `publish()` | Immutability. A published model cannot be silently swapped |
| Task link | Lineage: weights → task → commit → dataset version |

<div class="callout warn">
  <span class="ct">Tag vocabulary has to be agreed, or the registry is decoration</span>
  If one person writes <code>prod</code>, another <code>production</code>, and a third <code>live</code>, then serving code querying <code>production</code> silently finds nothing and keeps the old model. Fix a small vocabulary — <code>candidate</code>, <code>staging</code>, <code>production</code>, <code>archived</code> — and set tags from code in the promotion task, never by hand.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Register a model with <code>set_metadata("val_accuracy", …)</code> and confirm it is visible and queryable in the UI.</li>
    <li>Write the promotion script above and run it against two candidates. Confirm the tags moved.</li>
    <li>Try to change a published model's weights and read the refusal.</li>
    <li>Write a loader that fetches <code>tags=["production"]</code> and prints the model id, then re-run the promotion and the loader again.</li>
  </ol>
  <em>a deployment that changed without a code change or a redeploy. Step three matters because "published" is the only thing standing between your gate and someone quietly replacing production weights.</em>
</div>

## ClearML Serving

The registry answers "which weights"; Serving answers "how do requests reach them". It is a separate package that runs as a set of containers and reads the registry.

```bash
pip install clearml-serving

# 1. A serving service — itself a ClearML task on the services queue
clearml-serving create --name "vision-inference"
# → prints a service id; export it for the compose stack

# 2. Register an endpoint backed by a registry model
clearml-serving --id <service-id> model add \
  --engine triton \
  --endpoint "resnet18" \
  --model-id <model-id> \
  --preprocess "preprocess.py" \
  --input-size 1 3 224 224 --input-type float32 --input-name "input" \
  --output-size 1 10 --output-type float32 --output-name "output"

# 3. Or track a tag instead of an id — new production model, no redeploy
clearml-serving --id <service-id> model auto-update \
  --engine triton --endpoint "resnet18" \
  --project vision --name "resnet18-cls" --tags production --max-versions 2

# 4. Canary between two versions
clearml-serving --id <service-id> model canary \
  --endpoint "resnet18" --weights 0.9 0.1 --input-endpoints resnet18/1 resnet18/2
```

```python preprocess.py
class Preprocess:
    def preprocess(self, body, state, collect_custom_statistics_fn=None):
        import numpy as np
        arr = np.array(body["image"], dtype=np.float32) / 255.0
        return arr.reshape(1, 3, 224, 224)

    def postprocess(self, data, state, collect_custom_statistics_fn=None):
        probs = data[0].tolist()
        if collect_custom_statistics_fn:
            collect_custom_statistics_fn({"max_prob": max(probs)})
        return {"class": int(max(range(len(probs)), key=probs.__getitem__)), "probs": probs}
```

| Piece | Role |
|---|---|
| Serving **service task** | The control plane. Holds the endpoint configuration, lives on `services` |
| Inference container | The request path. Reads config, runs preprocess/postprocess |
| Triton container | GPU inference for framework models that support it |
| Statistics container | Ships request and drift metrics to Prometheus |
| `auto-update` | Endpoint follows a tag, so promotion deploys itself |
| `canary` | Weighted split between versions |

<div class="callout warn">
  <span class="ct">An inference endpoint is a network service — authenticate it</span>
  A ClearML Serving endpoint does not authenticate callers by itself. Put it behind an ingress or API gateway that terminates TLS and enforces authentication, and never expose it directly to the internet. This is the most common oversight when someone stands one up for a demo and then leaves it running.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Serve a small scikit-learn model with the sklearn engine and call it with <code>curl</code>.</li>
    <li>Write a <code>Preprocess</code> class that reshapes input and confirm a malformed request fails cleanly rather than with a 500.</li>
    <li>Switch the endpoint to <code>auto-update</code> on a tag, then promote a new model and watch the endpoint pick it up.</li>
    <li>Enable the statistics container and look at request metrics.</li>
  </ol>
  <em>step three is the payoff for everything in the previous section: a promotion in the registry becomes a deployment with no pipeline, no redeploy, and no human. Also note in step two how much of production reliability lives in the preprocess code rather than the model.</em>
</div>

## Remote debugging with `clearml-session`

A task that fails only on the agent is the most annoying failure mode there is. `clearml-session` gives you an interactive shell inside the agent's own environment.

```bash
# A JupyterLab + VS Code server session on a GPU worker
clearml-session --queue gpu \
  --docker nvidia/cuda:12.1.0-runtime-ubuntu22.04 \
  --packages "torch==2.3.0 torchvision" \
  --git-credentials

# Attach to the environment of a specific failed task
clearml-session --queue gpu --base-task-id 8f2c4b19e0a7d3f1c6b8a2e4d7091f3b

# Reconnect to a session you left running
clearml-session --shutdown            # when you are done — it holds a worker
```

It prints a local URL tunnelled to the remote machine, with Jupyter, a browser VS Code, and SSH. The environment is the *same* one the agent builds for a task, which is the whole point: you are debugging the actual failure, not an approximation of it.

| Flag | Use |
|---|---|
| `--base-task-id` | Reproduce a specific task's environment exactly |
| `--docker` | Pick the image, and therefore CUDA |
| `--packages` | Extras beyond the base task's list |
| `--git-credentials` | Forward your git credentials for private repos |
| `--queue` | Which hardware you want to sit on |
| `--shutdown` | **Release the worker.** Sessions hold a GPU until stopped |

<div class="callout warn">
  <span class="ct">A session occupies a worker until you shut it down</span>
  It is a task like any other, so an interactive session sitting idle overnight holds a GPU that nobody else can use. Always <code>--shutdown</code>, and set a session timeout on shared queues. This is the number one source of "why is the GPU queue full of nothing" in teams that have just discovered the feature.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Start a session on your local agent and open the Jupyter URL it prints.</li>
    <li>Inside the session, run <code>pip list</code> and compare it against a task's Installed Packages.</li>
    <li>Take a task that failed on the agent and start a session with <code>--base-task-id</code>. Reproduce the failure interactively.</li>
    <li>Shut it down and confirm the worker returns to idle in Workers &amp; Queues.</li>
  </ol>
  <em>the failure reproduced in the environment that produced it, in a browser, in under two minutes. Step three converts the worst class of ClearML bug — "only breaks on the agent" — into an ordinary debugging session.</em>
</div>

## ClearML in CI

The pattern worth building: a pull request that changes training code launches a short training run, and the check passes only if the metric clears a threshold. That makes model quality a reviewable property of the diff.

```yaml .github/workflows/train.yml
name: train
on:
  pull_request:
    paths: ['src/**', 'configs/**', 'requirements.txt']

permissions:
  contents: read

jobs:
  smoke-train:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0            # the agent needs a real commit to clone

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: pip

      - run: pip install -r requirements.txt

      - name: Launch a tracked run on the GPU queue
        env:
          CLEARML_API_HOST: ${{ secrets.CLEARML_API_HOST }}
          CLEARML_WEB_HOST: ${{ secrets.CLEARML_WEB_HOST }}
          CLEARML_FILES_HOST: ${{ secrets.CLEARML_FILES_HOST }}
          CLEARML_API_ACCESS_KEY: ${{ secrets.CLEARML_API_ACCESS_KEY }}
          CLEARML_API_SECRET_KEY: ${{ secrets.CLEARML_API_SECRET_KEY }}
        run: python ci/launch_and_gate.py --epochs 3 --min-accuracy 0.85
```

```python ci/launch_and_gate.py
import argparse, os, sys, time
from clearml import Task

ap = argparse.ArgumentParser()
ap.add_argument("--epochs", type=int, default=3)
ap.add_argument("--min-accuracy", type=float, default=0.85)
args = ap.parse_args()

task = Task.create(
    project_name="vision/ci",
    task_name=f"pr smoke {os.environ.get('GITHUB_SHA', 'local')[:8]}",
    script="src/train.py",
    repo=os.environ["GITHUB_SERVER_URL"] + "/" + os.environ["GITHUB_REPOSITORY"],
    commit=os.environ["GITHUB_SHA"],
    requirements_file="requirements.txt",
    docker="nvidia/cuda:12.1.0-runtime-ubuntu22.04",
)
task.set_parameters({"General/epochs": args.epochs})
task.add_tags(["ci", f"pr-{os.environ.get('GITHUB_REF_NAME', 'local')}"])
Task.enqueue(task, queue_name="gpu")

while task.status in ("queued", "in_progress"):
    time.sleep(20)
    task.reload()

if task.status != "completed":
    sys.exit(f"training task {task.status}: {task.get_output_log_web_page()}")

acc = task.get_last_scalar_metrics().get("accuracy", {}).get("val", {}).get("last", 0)
print(f"::notice::val accuracy {acc:.4f} — {task.get_output_log_web_page()}")
if acc < args.min_accuracy:
    sys.exit(f"accuracy {acc:.4f} below threshold {args.min_accuracy}")
```

| CI decision | Why |
|---|---|
| `fetch-depth: 0` | The agent clones the commit; a shallow checkout can leave it unfetchable |
| `Task.create` + `enqueue`, not `Task.init` | The runner should not do the training; it launches and waits |
| Credentials as secrets, in env vars | There is no `clearml.conf` to leak, and rotation is one place |
| Short epoch budget on pull requests | The gate is "did this break", not "is this the best model" |
| The web page URL printed into the log | A reviewer gets one click to the full run |
| A tag per pull request | Every CI run is filterable, and cleanable, as a group |

<div class="callout warn">
  <span class="ct">Fork pull requests must not get a write credential</span>
  A ClearML access/secret pair can enqueue tasks that execute arbitrary code on your agents. On a public repository, <code>pull_request</code> from a fork with access to that secret is remote code execution on your GPU fleet. Use <code>pull_request_target</code> with an explicit review gate, or restrict fork builds to a queue whose agents are ephemeral and hold no other credentials. Senior treats this properly.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add the launch-and-gate script to a repository and run it locally with your own credentials first.</li>
    <li>Wire it into CI and open a pull request that harms the metric on purpose. Confirm the check fails and the log links to the run.</li>
    <li>Now open one that improves it and confirm the check passes.</li>
    <li>Check what happens if the queue has no agent: how long does your CI job wait before it times out?</li>
  </ol>
  <em>a red check with a link to a full experiment page. Step four is the operational detail people miss — without a timeout, a missing agent turns into a CI job that burns runner minutes for six hours.</em>
</div>

## Reports and sharing

A tracked experiment is only useful if someone reads it. ClearML Reports are markdown documents that embed **live** task resources — a plot in a report updates when the task does.

| Element | Use |
|---|---|
| Embedded scalar plot | The metric that justifies the decision, live |
| Embedded task | The full run, one click away, with all its config |
| Embedded model | The exact artifact under discussion |
| Markdown prose | The reasoning, which is the part nobody writes down |

The pieces you need in code to make a report worth writing:

```python
# A plot the report can embed
logger.report_table("per-class F1", "test", 0, table_plot=f1_df)

# A one-line summary a reader sees without opening anything
logger.report_text(
    f"Baseline 0.921 → 0.940 on iris 1.1.0. "
    f"Change: depth 4 → 8. Cost: +6 min/epoch."
)

# The comparison link, built from ids
print("compare:", f"{task.get_output_log_web_page().split('/output')[0]}")
```

<div class="callout tip">
  <span class="ct">Write the number into the task name or a text report</span>
  <code>"resnet18 depth=8 acc=0.940"</code> costs nothing and makes the experiments table self-documenting. A month later, a table where every row states its own result is the difference between reading a list and doing archaeology.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Create a report, embed a scalar plot from a running task, and watch the embed update.</li>
    <li>Embed a comparison of three tasks and share the link with someone who has never opened ClearML.</li>
    <li>Add a <code>report_text</code> summary to your training script and confirm it shows up in the task.</li>
  </ol>
  <em>a document that stays correct as the experiment continues. The person in step two is the real test: if they cannot understand the result from your report alone, the report is missing the reasoning rather than the plots.</em>
</div>

## Debugging, one level deeper

Beginner had a tab order. Here is what to do when the tabs are not enough.

<ol class="guide-steps">
  <li><b>Turn up SDK logging</b><code>CLEARML_LOG_LEVEL=DEBUG</code> shows every API call the SDK makes, which is how you diagnose a hang: you can see which request never returned.</li>
  <li><b>Read the agent's own log, not the task's</b>Setup failures — pip resolution, docker pull, git fetch — happen before your code runs and appear in the agent's stdout, not in the task console.</li>
  <li><b>Reproduce the environment with <code>clearml-session --base-task-id</code></b>Interactive access to the exact environment the task got.</li>
  <li><b>Compare a working and a broken task in the UI</b>Details view with "hide identical values" narrows a mystery to a package version or a single parameter in seconds.</li>
  <li><b>Check the diff, not just the commit</b>Two tasks on the same commit can differ by the stored uncommitted patch. <code>task.data.script.diff</code> shows it.</li>
  <li><b>Verify the server is not the problem</b><code>curl $CLEARML_API_HOST/debug.ping</code>. Elasticsearch under pressure looks like the SDK "hanging" on metric reports.</li>
</ol>

```bash
export CLEARML_LOG_LEVEL=DEBUG          # verbose SDK
export CLEARML_AGENT_LOG_LEVEL=DEBUG    # verbose agent
clearml-agent daemon --queue gpu --foreground   # do not detach; watch it live
curl -s "$CLEARML_API_HOST/debug.ping"
```

```python compare two tasks programmatically
from clearml import Task

good = Task.get_task(task_id="…good…")
bad  = Task.get_task(task_id="…bad…")

gp, bp = good.get_parameters(), bad.get_parameters()
for key in sorted(set(gp) | set(bp)):
    if gp.get(key) != bp.get(key):
        print(f"{key}: {gp.get(key)!r} → {bp.get(key)!r}")

print("commit:", good.data.script.version_num, "→", bad.data.script.version_num)
```

| Symptom | Cause | Fix |
|---|---|---|
| Setup fails, task console empty | Failure happened before your code ran | Read the agent's log |
| Task hangs at start with no output | API host unreachable, or a proxy | `CLEARML_LOG_LEVEL=DEBUG`; `debug.ping` |
| Scalars lag minutes behind | Elasticsearch under load, or a huge report rate | Report less often; check the server |
| Two runs on one commit behave differently | Different stored diffs | Compare `data.script.diff` |
| Docker pull fails on the agent | No registry credentials on that host | `docker login` as the agent's user |
| Works in session, fails as a task | The entry point or working directory differs | Check Execution ▸ script and cwd |

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run a script with <code>CLEARML_LOG_LEVEL=DEBUG</code> and read the API calls <code>Task.init</code> makes.</li>
    <li>Deliberately break the docker image name on a task and find where the error appears — task console or agent log?</li>
    <li>Use the programmatic diff above on two of your own tasks that should be identical.</li>
    <li>Point <code>CLEARML_API_HOST</code> at a wrong port and observe exactly how the hang presents.</li>
  </ol>
  <em>step two is the important habit: setup failures are invisible in the UI, and knowing to read the agent's log first saves the half hour you would otherwise spend refreshing the console tab.</em>
</div>

## Putting it all together

A complete project using everything on this page. Nothing here is new — read it as a whole and you should be able to justify every line.

```text project layout
.
├── .github/workflows/train.yml     # PR gate: launch, wait, threshold
├── requirements.txt                # pinned, and the agent's source of truth
├── configs/
│   ├── model.yaml                  # connect_configuration
│   └── features.yaml
├── src/
│   ├── make_dataset.py             # data_processing task → Dataset version
│   ├── train.py                    # training task, execute_remotely
│   └── evaluate.py                 # qc task, writes model metadata
├── ops/
│   ├── pipeline.py                 # PipelineController, services queue
│   ├── hpo.py                      # HyperParameterOptimizer
│   ├── promote.py                  # tag-moving gate
│   └── triggers.py                 # TriggerScheduler on the dataset
└── ci/launch_and_gate.py
```

```python src/train.py
import os
from clearml import Task

task = Task.init(
    project_name="vision/experiments",
    task_name="resnet18",
    task_type=Task.TaskTypes.training,
    output_uri="s3://ml-artifacts/clearml",
    reuse_last_task_id=False,
)
task.add_tags(["resnet18"])
task.set_packages("requirements.txt")                 # explicit, not detected
task.set_base_docker("nvidia/cuda:12.1.0-runtime-ubuntu22.04",
                     docker_arguments="--shm-size=8g")

import torch
from clearml import Dataset, OutputModel

opt  = task.connect({"lr": 3e-4, "epochs": 20, "seed": 42}, name="optimizer")
arch = task.connect({"layers": 18, "width": 64}, name="architecture")
data = task.connect({"dataset_version": "1.1.0"}, name="data")
model_cfg_path = task.connect_configuration("configs/model.yaml", name="model")

task.execute_remotely(queue_name="gpu")               # comment out to debug locally

set_seed(opt["seed"])
root = Dataset.get(
    dataset_project="datasets", dataset_name="iris",
    dataset_version=data["dataset_version"], alias="training data",
).get_local_copy()

logger = task.get_logger()
for epoch in range(opt["epochs"]):
    tr, va, acc = train_one_epoch(root, opt, arch)
    logger.report_scalar("loss", "train", tr, epoch)
    logger.report_scalar("loss", "val", va, epoch)
    logger.report_scalar("accuracy", "val", acc, epoch)   # the HPO objective

test_acc = test(root)
logger.report_single_value("test_accuracy", test_acc)
task.upload_artifact("predictions", predictions_df)

model = OutputModel(task=task, name="resnet18-cls", framework="PyTorch")
model.update_weights(weights_filename="model.pt")
model.update_design(config_dict={"arch": "resnet18", "input": [3, 224, 224]})
model.set_metadata("val_accuracy", test_acc, v_type="float")
model.set_metadata("dataset_version", data["dataset_version"])
model.tags = ["candidate"]
```

```python ops/pipeline.py
from clearml import PipelineController

pipe = PipelineController(name="nightly", project="vision", version="1.2.0",
                          add_pipeline_tags=True, docker="python:3.11-slim")
pipe.add_parameter("lr", 3e-4)
pipe.add_parameter("dataset_version", "1.1.0")

pipe.add_step(name="prepare", execution_queue="cpu", cache_executed_step=True,
              base_task_project="vision", base_task_name="make dataset",
              parameter_override={"General/version": "${pipeline.dataset_version}"})

pipe.add_step(name="train", parents=["prepare"], execution_queue="gpu",
              base_task_project="vision/experiments", base_task_name="resnet18",
              parameter_override={"optimizer/lr": "${pipeline.lr}",
                                  "data/dataset_version": "${pipeline.dataset_version}"},
              retry_on_failure=2,
              monitor_metrics=[("accuracy", "val")],
              monitor_models=["resnet18-cls"])

pipe.add_step(name="evaluate", parents=["train"], execution_queue="cpu",
              base_task_project="vision", base_task_name="evaluate",
              parameter_override={"General/model_url": "${train.models.output.-1.url}"})

pipe.add_step(name="promote", parents=["evaluate"], execution_queue="services",
              base_task_project="vision", base_task_name="promote")

pipe.start(queue="services")
```

```bash
# The fleet
clearml-agent daemon --queue services --services-mode --cpu-only --detached
clearml-agent daemon --queue cpu --cpu-only --detached
clearml-agent daemon --queue gpu --gpus 0 --docker nvidia/cuda:12.1.0-runtime-ubuntu22.04 --detached
clearml-agent daemon --queue gpu --gpus 1 --docker nvidia/cuda:12.1.0-runtime-ubuntu22.04 --detached

# Search, then ship
python ops/hpo.py                       # 40 trials, 4 at a time, pruned
python ops/triggers.py                  # new dataset version → pipeline runs
clearml-serving --id $SVC model auto-update --endpoint resnet18 \
  --project vision --name resnet18-cls --tags production --max-versions 2
```

Twelve decisions in there are the whole lesson of this page:

| Decision | Section |
|---|---|
| `set_packages` instead of trusting detection | Automatic capture: the mechanism |
| Docker image pinned on the task | Automatic capture: the mechanism |
| Config split into named sections | Configuration: sections and objects |
| YAML through `connect_configuration` | Configuration: sections and objects |
| `reuse_last_task_id=False` on every experiment | Task creation and lifecycle |
| Dataset version as a parameter, with `alias` | Datasets at scale |
| The HPO objective is a real reported series | Hyperparameter optimisation |
| Model metadata written for the gate to read | The registry as a promotion workflow |
| `cache_executed_step` on the deterministic step | Pipelines properly |
| `retry_on_failure` on the expensive step | Pipelines properly |
| Controllers on `services`, never on `gpu` | Agents in depth |
| Serving follows a tag, so promotion deploys | ClearML Serving |

<div class="guide-try">
  <span class="ct">Try it — the one that matters</span>
  <ol>
    <li>Take this layout into a real project. Get the training task green on an agent, in docker mode, with an explicit package list.</li>
    <li>Run the HPO with a small budget and confirm pruning happens — check the objective plot, not just the task count.</li>
    <li>Build the pipeline and run it twice. Confirm the cached step is skipped the second time.</li>
    <li>Wire the dataset trigger, then finalize a new dataset version and let the whole thing run unattended.</li>
    <li>Promote by tag and confirm your serving endpoint picks up the new model with no deploy step.</li>
  </ol>
  <em>an end-to-end system where new data produces a trained, evaluated, promoted, and served model without anyone typing a command. Step four is the acceptance test; if it needs a human anywhere, find that spot and close it.</em>
</div>

## Where you are now

You can control task creation and reuse precisely, fix requirement detection instead of fighting it, structure configuration so a clone is fully reconfigurable, tune agent modes and caches so setup is seconds rather than minutes, launch code that has no ClearML in it, run a real HPO with a correct objective and a budget, manage datasets at a scale where chunking and squashing matter, build pipelines with caching, retries, callbacks, and triggers, run the registry as a promotion workflow, serve a model that follows a tag, debug remotely inside the agent's own environment, and gate a pull request on a metric.

| Can you… | |
|---|---|
| Distinguish `init`, `create`, and `clone`? | Runs now / builds for someone else / editable copy |
| Say why requirement detection misses a package? | It inspects `sys.modules`; a lazy import is never there |
| Name the agent's four caches? | pip, venv, vcs, and the SDK storage cache |
| Say why `system_site_packages` matters? | Trust the image; setup drops from minutes to seconds |
| Explain `--services-mode`? | Many concurrent light tasks; controllers must not hold a GPU |
| Write a correct HPO objective? | Exact `title`/`series` from the base task's Scalars tab |
| Say what pipeline caching keys on? | Base task, parameters, and code — **not** input file contents |
| Name the reference syntax for a step's model? | `${step.models.output.-1.url}` |
| Explain how promotion reaches serving? | `auto-update` follows a tag; a tag move is a deploy |
| Say what `clearml-session --base-task-id` gives you? | A shell in the exact environment that failed |
| Name the first log to read on a setup failure? | The agent's own log, not the task console |
| Say why fork PRs must not hold ClearML credentials? | Enqueue is remote code execution on your agents |

**Senior takes every one of those topics further** — the self-hosted deployment and its three data stores, the credential and access model across workspaces, multi-tenancy and quota, storage cost and retention policy, Elasticsearch and MongoDB scaling and what breaks first, backup and upgrade procedure, audit and lineage for regulated work, GPU fleet economics and autoscaling, incident playbooks for a lost server or a corrupted index, and where ClearML stops and a feature store, a warehouse, or a dedicated serving stack begins.





