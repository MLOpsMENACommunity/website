Part one of three. A fast review of **everything in the Beginner Detailed track**, in about twenty-five minutes. Fast review first, common questions at the end. Mid-level reviews this plus its own material; Senior reviews all three.

## The thirty-second answer

> ClearML is an open-source MLOps platform that tracks experiments, versions datasets, and re-executes runs on remote hardware. You add `Task.init` to a script and it records the code, git commit, uncommitted diff, installed packages, arguments, metrics, and models into a server. Because it records the *environment* and not just the results, any past run can be cloned, reconfigured in the UI, and re-launched on an agent, so a logged experiment is executable, not just readable.

Then add the sentence that shows you have used it: *"the part people underestimate is that `task.connect` is bidirectional: locally it uploads your parameters, but when an agent runs a clone it reads them back and overrides your defaults. That is what makes clone-edit-enqueue work without touching the code."*

## The architecture

<div class="flow">
  <div class="node">SDK<small>in your script</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">API SERVER<small>metadata, 8008</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">WEB + FILE<small>8080 / 8081</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">AGENT<small>pulls a queue</small></div>
</div>

| Part | Does |
|---|---|
| **SDK** | `pip install clearml`. Patches frameworks, sends metadata and metrics |
| **API server** | Stores tasks, params, metrics, queues. Backed by MongoDB + Elasticsearch + Redis |
| **Web server** | The UI. Talks only to the API server |
| **File server** | Default store for artifacts and models when there is no S3 bucket |
| **Agent** | `pip install clearml-agent`. Rebuilds a task's environment and runs it |

**MongoDB** holds task metadata, **Elasticsearch** holds metrics and console logs, **Redis** holds ephemeral state. Worth naming. It explains why a slow task list and slow scalars are two different problems.

## Vocabulary

| Term | Say this |
|---|---|
| **Task** | One recorded, re-executable run. The core object of the whole system |
| **Project** | A folder of tasks; `/` nests them |
| **Queue** | A named ordered list of tasks waiting for an agent |
| **Agent** | A worker that claims a queued task, rebuilds its env, and runs it |
| **Artifact** | Any file or object attached to a task |
| **Model** | A first-class artifact with a registry entry, tags, and lineage |
| **Dataset** | A task holding an immutable, content-addressed, versioned file set |
| **Pipeline** | A task that creates and monitors other tasks as a DAG |
| **`execute_remotely`** | Register locally, then enqueue and exit: training happens on an agent |

## Why ClearML rather than the alternatives

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>What ClearML gives you</h4>
    <ul>
      <li>Tracking <b>plus</b> orchestration in one system</li>
      <li>Runs are re-executable, not just readable</li>
      <li>Dataset versioning built in</li>
      <li>Open source, self-hostable</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>What a tracker alone gives you</h4>
    <ul>
      <li>Metrics and params. You still need a scheduler</li>
      <li>No environment capture, so no remote re-execution</li>
      <li>Data versioning is a separate tool</li>
      <li>Often SaaS-only or a heavier server</li>
    </ul>
  </div>
</div>

Know the follow-up: *"how is this different from MLflow?"* MLflow tracks and packages; ClearML tracks **and** executes. MLflow has no agent, no queue, and no built-in dataset versioning, so an MLflow setup usually means MLflow plus Airflow plus DVC. Whether that is better is a real architectural argument, do not pretend it is not, but the one-sentence difference is that ClearML records enough to rerun the experiment, not just enough to describe it.

## The everyday code

```python
from clearml import Task

task = Task.init(project_name="vision", task_name="resnet18")   # first, before heavy imports
task.add_tags(["baseline"])

params = task.connect({"lr": 3e-4, "epochs": 20})               # editable on a clone
cfg = task.connect_configuration("configs/model.yaml")          # a whole config file

task.execute_remotely(queue_name="gpu")                          # everything below runs on an agent

logger = task.get_logger()
logger.report_scalar("loss", "train", value, iteration)          # a curve
logger.report_single_value("test_accuracy", 0.941)               # a comparison column
task.upload_artifact("predictions", df)                          # a file or object
```

```bash
clearml-init                                     # write ~/clearml.conf
clearml-agent daemon --queue gpu --gpus 0        # a worker
clearml-agent daemon --queue gpu --docker nvidia/cuda:12.1.0-runtime-ubuntu22.04
clearml-data create --project datasets --name iris --version 1.0.0
clearml-data add --files ./data && clearml-data close
```

## What `Task.init` captures

Being able to list this quickly is the core question at this level:

<ol class="guide-steps">
  <li><b>Code</b>Git remote, branch, commit, the <b>uncommitted diff</b>, entry point, working directory.</li>
  <li><b>Environment</b>Python version, and the packages your script imported with exact versions.</li>
  <li><b>Arguments</b>Every <code>argparse</code> flag, plus <code>click</code>, <code>fire</code>, and <code>hydra</code>.</li>
  <li><b>Metrics</b>Anything written to TensorBoard, TensorBoardX, or matplotlib.</li>
  <li><b>Models</b>Every checkpoint saved by PyTorch, TF/Keras, joblib, XGBoost, LightGBM.</li>
  <li><b>Console and machine</b>stdout/stderr streamed live, plus CPU, GPU, and memory utilisation.</li>
</ol>

<div class="callout warn">
  <span class="ct"><code>Task.init</code> must run before the framework imports</span>
  Automatic capture works by patching frameworks at import time. Initialise after <code>import torch</code> and TensorBoard scalars and checkpoints may silently not be captured. This is the most common "it is not logging anything" cause, and it is the answer an interviewer is fishing for.
</div>

What is **not** captured: values you only `print()`, data read from an unversioned path, conda/apt/system libraries, environment variables (deliberately, because they hold secrets), and seeds you never set.

## Logging: title, series, and single values

```python
logger.report_scalar(title="loss", series="train", value=v, iteration=epoch)
logger.report_scalar(title="loss", series="val",   value=v, iteration=epoch)
logger.report_single_value(name="test_accuracy", value=0.941)
```

| | Means | Result |
|---|---|---|
| `title` | The chart | One plot per title |
| `series` | A line in it | Several lines on one plot |
| `report_single_value` | A fact about the run | A sortable column in the comparison table |

One `title="loss"` with two series gives one comparable chart. Two titles gives two charts you cannot overlay. Report both kinds: **curves to diagnose, single values to rank.**

## Parameters are the editable surface

```python
params = task.connect({"lr": 3e-4})
train(lr=params["lr"])          # read from the return value, always
```

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>1</span><strong>Local run</strong><small><code>connect</code> uploads <code>{"lr": 3e-4}</code> to the server.</small></div>
  <div class="guide-timeline-item"><span>2</span><strong>Clone</strong><small>You copy the task in the UI; it becomes an editable draft.</small></div>
  <div class="guide-timeline-item"><span>3</span><strong>Edit</strong><small>You change <code>lr</code> to <code>1e-3</code> in the Configuration tab.</small></div>
  <div class="guide-timeline-item"><span>4</span><strong>Enqueue</strong><small>The task moves to <code>queued</code> on the chosen queue.</small></div>
  <div class="guide-timeline-item"><span>5</span><strong>Agent run</strong><small>Same code; <code>connect</code> now <b>returns</b> <code>1e-3</code> and your default is ignored.</small></div>
</div>

Three mechanisms: `task.connect(dict)` for hyperparameters, `argparse` captured automatically, `task.connect_configuration(path)` for YAML/JSON and anything nested.

## Artifacts and models

```python
task.upload_artifact("predictions", df)               # DataFrame → CSV with a UI preview
task.upload_artifact("report", "outputs/report.html") # a file
other = Task.get_task(task_id="...")
df = other.artifacts["predictions"].get()             # object back
p  = other.artifacts["report"].get_local_copy()       # path back
```

```python
from clearml import OutputModel, InputModel
OutputModel(task=task, name="resnet18-cls").update_weights("model.pt")
model = InputModel(project="vision", name="resnet18-cls", tags=["production"])
weights = model.get_local_copy()
```

| Point | Say this |
|---|---|
| Default storage | The **file server**. Set `output_uri="s3://…"` for anything large |
| Artifact vs model | A model has a registry entry, tags, publishing, and lineage |
| Consuming a model | Query by project + name + **tag**, never by a file path |
| Published | Read-only; weights and metadata are frozen |

## Datasets

```python
ds = Dataset.create(dataset_project="datasets", dataset_name="iris", dataset_version="1.1.0",
                    parent_datasets=[parent_id])       # only the delta is uploaded
ds.add_files("./new-batch"); ds.upload(); ds.finalize()  # finalize = immutable

path = Dataset.get(dataset_project="datasets", dataset_name="iris",
                   alias="training data").get_local_copy()
```

| Idea | Why it matters |
|---|---|
| Versions are **incremental** | A child inherits its parents; only new bytes are uploaded |
| `finalize()` seals a version | "Trained on iris 1.1.0" is worthless if 1.1.0 can be edited |
| `get_local_copy()` is cached and read-only | Ten runs on one machine download it once |
| `get_mutable_local_copy()` is a fresh extraction | For preprocessing that edits files in place |
| `alias=` records the dataset id into the consuming task | The experiment names its exact data version |

## Agents and queues

<div class="flow">
  <div class="node">CLONE<small>draft</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">EDIT<small>params</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">ENQUEUE<small>queued</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">AGENT<small>in_progress</small></div>
</div>

An agent claims a queued task, then: creates a virtualenv or container → clones the recorded git commit → applies the recorded diff → installs the recorded packages → runs the recorded entry point.

| Status | Means |
|---|---|
| `draft` | Created or cloned; editable; not running |
| `queued` | Waiting for an agent on some queue |
| `in_progress` | Running |
| `completed` / `failed` / `aborted` | Exit 0 / non-zero / stopped |
| `published` | Read-only and protected |

```python
task.execute_remotely(queue_name="gpu")   # register + enqueue locally, then exit
```

<div class="callout warn">
  <span class="ct">The agent clones from git, so push before you enqueue</span>
  A commit that exists only on your laptop cannot be fetched by the agent, and the task fails during setup with a git error. The uncommitted <em>diff</em> travels through the server; the <em>commit</em> does not.
</div>

## Pipelines

```python
@PipelineDecorator.component(return_values=["path"], cache=True, execution_queue="cpu")
def prepare(name): ...

@PipelineDecorator.component(return_values=["model", "acc"], execution_queue="gpu")
def train(path, lr): ...

@PipelineDecorator.pipeline(name="train-and-eval", project="vision", version="1.0.0")
def main(lr=3e-4):
    path = prepare("iris")
    model, acc = train(path, lr)
```

| Fact | Say this |
|---|---|
| Each component is its own task | Own console, metrics, artifacts, and hardware |
| `execution_queue` is per component | CPU prep and GPU training without any orchestration code |
| The DAG is inferred from data flow | `train` depends on `prepare` because it consumes its return value |
| `cache=True` | An unchanged component is reused, not rerun |
| `run_locally()` / `start_locally()` | Debug the whole graph in one process first |
| `add_step(base_task_name=…)` | A step *is* "clone this existing task and override params" |

## The traps, and why they happen

Three ideas explain nearly every beginner failure: **`Task.init` must be first**, **the agent rebuilds from git plus a package list**, and **parameters flow back from the server on a remote run**.

| Symptom | Cause | Fix |
|---|---|---|
| No scalars appear | `Task.init` after the framework import | Move it to the top |
| Task stuck in `queued` | No agent on that queue, or a typo in the name | Start an agent; check Workers &amp; Queues |
| Agent fails on git | The commit was never pushed | Push the branch first |
| `ImportError` only on the agent | Package imported lazily, never detected | Declare it in the task's package list |
| Edited parameter had no effect | Code reads the literal, not `connect`'s return | Read from the returned object |
| Two charts instead of two lines | Two `title`s instead of one title with two `series` | One title, several series |
| File server full / quota hit | Default `output_uri` | Point it at S3 |
| Dataset "changed" under a run | A non-finalized dataset was used | `finalize()`, and consume by version |
| Metrics missing from comparison | They were `print`ed, not reported | `report_single_value` |
| Credentials leaked | `clearml.conf` committed | Env vars in CI; gitignore the file |

## Common interview questions

<ol class="guide-steps">
  <li><b>What is ClearML and what problem does it solve?</b>An open-source MLOps platform covering experiment tracking, data versioning, and orchestration. Two lines in a script record the code, commit, diff, packages, arguments, metrics, and models to a server. Because the environment is captured too, any run can be cloned, reconfigured, and re-executed on remote hardware, so the log is executable rather than descriptive.</li>
  <li><b>What are the components of a ClearML deployment?</b>The SDK inside your process; an API server for metadata backed by MongoDB, Elasticsearch, and Redis; a web server for the UI; a file server for artifacts when there is no object storage; and agents that pull tasks off named queues and execute them.</li>
  <li><b>What exactly does <code>Task.init</code> do?</b>Creates or reuses a task, then hooks into the process: it records the git state including the uncommitted diff, the imported packages, the argument parser, stdout and stderr, machine metrics, and it patches supported frameworks so TensorBoard scalars and saved checkpoints are captured without extra code.</li>
  <li><b>Why must <code>Task.init</code> come before the framework imports?</b>Automatic capture is implemented by patching those libraries at import time. If they are already imported, the patch never gets applied and metrics or checkpoints silently go missing. It is a silent failure, not an error, which is what makes it worth knowing.</li>
  <li><b>What is <em>not</em> captured automatically?</b>Values you only print, data read from an unversioned path, system and conda packages, environment variables, excluded on purpose since they hold secrets, and any randomness you never seeded. Each has a deliberate replacement: report it, version it, use docker mode, or connect it as a parameter.</li>
  <li><b>Explain <code>title</code> versus <code>series</code> in <code>report_scalar</code>.</b>Title is the chart, series is a line within it. One title with `train` and `val` series gives a single comparable chart; two titles gives two charts you cannot overlay. A curve is not a comparison column, so final numbers go through <code>report_single_value</code> and can be sorted in the experiments table.</li>
  <li><b>Why is <code>task.connect</code> described as bidirectional?</b>Running locally it uploads your dict to the server. When an agent executes a clone of that task, the same call reads the server's values and returns them, overriding your defaults. That is what makes clone-edit-enqueue work with no code change, and why you must read from the value <code>connect</code> returns rather than from your original literal.</li>
  <li><b>How would you rerun a past experiment with a different learning rate?</b>Clone the task in the UI, which produces an editable draft; change the parameter; enqueue it to a queue an agent is watching. The agent rebuilds the environment from the recorded packages, checks out the recorded commit, applies the recorded diff, and runs it. No code change and no SSH.</li>
  <li><b>What does <code>execute_remotely</code> do?</b>Everything above the call runs locally: the task is created, parameters uploaded, configuration registered. Then the local process enqueues the task and exits, and the agent runs everything below the line. Commenting out that one line gives you an identical local run for debugging.</li>
  <li><b>What does an agent do with a queued task?</b>Claims it, creates an isolated environment (virtualenv, or a container in docker mode), clones the repository at the recorded commit, applies the stored diff, installs the recorded package list, then executes the recorded entry point with the server's current parameter values.</li>
  <li><b>Why did my agent task fail with a git error?</b>Almost always because the commit exists only locally. The diff travels through the server, but the base commit has to be fetchable from the remote, so the branch must be pushed before enqueueing.</li>
  <li><b>Artifact versus model: when do you use each?</b>An artifact is any attached file or object: a dataframe, a report, a vocabulary. A model is a first-class registry entry with tags, a publish state, and a link back to the task that produced it. Serving code should query the registry by project, name, and tag, so promotion is a tag move rather than a code change.</li>
  <li><b>Where do artifacts go, and when is that wrong?</b>To the ClearML file server by default. That is fine for small reports and dataframes and wrong for checkpoints, so set <code>output_uri</code> to S3 or another bucket and large objects go to real object storage with its own lifecycle rules.</li>
  <li><b>How does ClearML Dataset versioning work?</b>A dataset is itself a task holding a content-addressed file set. Versions are incremental: a child declares parents and uploads only its delta. <code>finalize()</code> makes a version immutable, which is what gives "trained on 1.1.0" any meaning. Consumers call <code>get_local_copy()</code>, which flattens the parent chain and caches locally.</li>
  <li><b>Why pass <code>alias=</code> to <code>Dataset.get</code>?</b>It records the resolved dataset id into the consuming task's configuration, so the experiment itself names the exact data version it read. Without it the run is reproducible only if nobody has to guess which dataset "the training data" meant.</li>
  <li><b>How do you compare twenty experiments?</b>In the UI: add hyperparameters and single-value metrics as columns, sort, then select rows and hit Compare with "hide identical values" on, which reduces the runs to the fields that differ. In code: <code>Task.get_tasks</code> with a filter plus <code>get_last_scalar_metrics</code>, which is also how you would write a promotion gate.</li>
  <li><b>What is a ClearML pipeline, mechanically?</b>A task that creates and monitors other tasks. Each step is an independent task with its own logs, metrics, and target queue, so different steps can run on different hardware. With the controller API a step is literally "clone this base task and override these parameters", the same clone-and-enqueue loop expressed as a graph.</li>
  <li><b>How do you organise hundreds of runs?</b>Projects for structure, with <code>/</code> for nesting, and **tags** for everything cross-cutting: <code>baseline</code>, <code>ablation</code>, <code>candidate</code>, <code>broken</code>. Add tags in code with <code>task.add_tags</code> so they are never forgotten, since a table you cannot filter is a table nobody reads.</li>
  <li><b>How is this different from MLflow?</b>MLflow tracks and packages; it has no agent, no queue, and no built-in dataset versioning, so a full setup is usually MLflow plus a scheduler plus a data-versioning tool. ClearML puts tracking, data versioning, and execution in one system, at the cost of running a heavier server. Which trade is right depends on whether you already have an orchestrator.</li>
  <li><b>How do you debug a failed remote task?</b>Console tab for the traceback, Execution tab to verify the commit, entry point, and package list, Configuration to check the values it ran with, and Workers &amp; Queues to confirm an agent was even watching. Then reproduce locally with the same parameters via <code>Task.get_task(...).get_parameters()</code>.</li>
  <li><b>Where do credentials live and what can they do?</b>An access/secret pair in <code>~/clearml.conf</code>, or the <code>CLEARML_API_*</code> environment variables in CI. That pair can read every experiment in the workspace and enqueue tasks that execute code on your agents, so it is a full-access credential and must never be committed.</li>
</ol>

## Sixty-second self-test

- Give the thirty-second answer, then the sentence that shows you have used it.
- Name the four parts of a ClearML deployment and the three data stores behind the API server.
- List the six categories `Task.init` captures automatically.
- Say why `Task.init` must precede the framework imports, and what fails if it does not.
- Explain `title` versus `series`, and when to use `report_single_value` instead.
- Explain why `task.connect` is bidirectional, and the bug that follows from ignoring it.
- Walk the clone → edit → enqueue → agent loop, naming the status at each step.
- Say what `execute_remotely` runs locally and what it does not.
- Give the difference between an artifact and a registered model.
- Say where artifacts go by default and when that is the wrong choice.
- Explain incremental dataset versions, `finalize()`, and what `alias=` records.
- Name the first two UI tabs to open when a remote task fails.
