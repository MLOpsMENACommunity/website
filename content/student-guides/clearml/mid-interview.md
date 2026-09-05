Part two of three. A cumulative review of **Beginner and Mid-level material**, organised by topic rather than by level, in about thirty-five minutes. Fast review first, common questions at the end. Senior reviews all three.

## Foundations, in one screen

<div class="flow">
  <div class="node">SDK<small>Task.init</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">API SERVER<small>Mongo + ES + Redis</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">QUEUE<small>named, ordered</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">AGENT<small>rebuilds and runs</small></div>
</div>

> ClearML tracks experiments, versions data, and re-executes runs. `Task.init` records the code, commit, uncommitted diff, packages, arguments, metrics, and models. Because the *environment* is captured, any run can be cloned, reconfigured in the UI, and re-launched on an agent. The log is executable, not just readable.

**`Task.init` goes before every framework import**, because capture works by patching at import time. **`task.connect` is bidirectional**: locally it uploads, on an agent it downloads and overrides, which is why you read from its return value. **One `title`, several `series`** for a comparable chart; **`report_single_value`** for anything you want as a sortable column. **`output_uri` to object storage** for anything large. **`finalize()`** is what makes a dataset version mean something.

| Status | Means |
|---|---|
| `draft` | Created or cloned; editable |
| `queued` | Waiting for an agent on some queue |
| `in_progress` | Running |
| `completed` / `failed` / `aborted` | Exit 0 / non-zero / stopped |
| `published` | Read-only and protected |

## Task creation: three entry points

| Call | Patches frameworks | Captures env | Runs now | For |
|---|---|---|---|---|
| `Task.init` | Yes | Yes | Yes | Your own training script |
| `Task.create` | No | No. You declare it | No | Launching code you do not modify |
| `Task.clone` | No | Inherited | No | Reruns with new parameters |

```python
task = Task.init(project_name="p", task_name="t", reuse_last_task_id=False)
child = Task.create(project_name="p", task_name="t2", script="src/train.py",
                    repo="…", branch="main", requirements_file="requirements.txt")
Task.enqueue(child, queue_name="gpu")
```

Two lifecycle behaviours to state without prompting. **Reuse**: `Task.init` may reuse the last *empty* task from the same script, which is anti-clutter behaviour that looks like a vanished run during a sweep, so pass `reuse_last_task_id=False`. **Continuation**: `continue_last_task=True` appends scalars from the last iteration, correct for resuming an OOM-killed job and wrong for a fresh experiment.

Task types drive UI filtering and, for `controller` / `service` / `optimizer`, real behaviour: `training`, `data_processing`, `testing`, `qc`, `inference`, `controller`, `service`, `optimizer`.

<div class="callout warn">
  <span class="ct">Distributed runs get one task, not one per rank</span>
  Under <code>torchrun</code> every rank runs your script. Call <code>Task.init</code> on rank 0 only and use <code>Task.current_task()</code> elsewhere, or you get eight tasks and eight sets of unreadable scalars.
</div>

## Automatic capture: the mechanism

Bindings patch specific functions at import time:

| Framework | Patched | Gives |
|---|---|---|
| TensorBoard(X) | `SummaryWriter.add_*` | Scalars, histograms, images |
| PyTorch | `torch.save` | Output models |
| Keras / TF | `Model.save`, callbacks | Models + scalars |
| joblib / sklearn | `joblib.dump` | Output model |
| XGBoost / LightGBM | `save_model` | Output model |
| matplotlib | `show` / `savefig` | Plots |
| `argparse` / `hydra` | Arg parsing | Hyperparameters |

Requirements detection inspects `sys.modules` **at the end of the run**, mapping imported modules to distributions. Three failure modes follow:

| Failure | Cause | Fix |
|---|---|---|
| `ImportError` only on the agent | Lazy import inside a function, never in `sys.modules` | Import at module level, or `task.add_requirements` |
| CPU torch installed instead of CUDA | Detected pin carries no index URL | Docker mode with a CUDA image |
| Private package unresolvable | Detected as a name the agent cannot install | Vendor it, or give the agent the index |

```python
task.set_packages("requirements.txt")
task.add_requirements("torch", "2.3.0")
task.set_base_docker("nvidia/cuda:12.1.0-runtime-ubuntu22.04",
                     docker_arguments="--shm-size=8g")
```

## Configuration: sections, objects, references

```python
task.connect({"lr": 3e-4}, name="optimizer")            # a named UI section
cfg_path = task.connect_configuration("configs/m.yaml", name="model")  # returns a PATH
```

| | `connect` | `connect_configuration` |
|---|---|---|
| Shape | Flat key/value | Nested, or a whole file |
| Returns | The dict, remote-overridden | A path for a file, a dict for a dict |
| Use for | Swept hyperparameters | Model definitions, feature lists |

Reference syntax, used by pipelines and HPO to rewire a task with no code change:

| Reference | Resolves to |
|---|---|
| `${pipeline.NAME}` | A pipeline-level parameter |
| `${STEP.parameters.General/x}` | Another step's parameter |
| `${STEP.artifacts.NAME.url}` | Another step's artifact |
| `${STEP.models.output.-1.url}` | That step's last output model |
| `${STEP.id}` | The step's task id |

<div class="callout warn">
  <span class="ct">Parameter names are section-qualified, and a bad override is silent</span>
  <code>General/lr</code>, not <code>lr</code>. Unnamed dicts land in <code>General</code>, <code>argparse</code> in <code>Args</code>, named sections use their name. Overriding a key that does not exist is not an error. It is added as a new, unread parameter and your step runs with its defaults.
</div>

## Agents: modes and caches

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>1</span><strong>Claim</strong><small>Long-polls its queues for the highest-priority task.</small></div>
  <div class="guide-timeline-item"><span>2</span><strong>Environment</strong><small>Venv + pip install, or pull a container and optionally reuse its site-packages.</small></div>
  <div class="guide-timeline-item"><span>3</span><strong>Code</strong><small>Clone the recorded commit into a cached checkout; apply the stored diff.</small></div>
  <div class="guide-timeline-item"><span>4</span><strong>Execute</strong><small>Run the entry point; stream stdout, stderr, and machine metrics.</small></div>
  <div class="guide-timeline-item"><span>5</span><strong>Report</strong><small>Upload artifacts and models, set final status, resume polling.</small></div>
</div>

| Cache | Holds |
|---|---|
| `agent.pip_download_cache` | Wheels |
| `agent.venvs_cache` | Whole prebuilt virtualenvs, keyed on the requirement set |
| `agent.vcs_cache` | Bare git clones, for incremental fetches |
| `sdk.storage.cache` | Datasets, artifacts, and models fetched by the SDK |

```bash
clearml-agent daemon --queue gpu --gpus 0 --docker nvidia/cuda:12.1.0-runtime-ubuntu22.04
clearml-agent daemon --queue gpu-big --gpus 0,1          # multi-GPU job
clearml-agent daemon --queue urgent gpu                  # priority order
clearml-agent daemon --queue services --services-mode --cpu-only
```

`system_site_packages: true` in docker mode is the biggest single speed win: trust the image instead of rebuilding a venv. `--services-mode` launches each task as a background container and keeps polling, so one small box hosts dozens of controllers.

<div class="callout warn">
  <span class="ct">Controllers never belong on a GPU queue</span>
  A pipeline controller mostly sleeps. On a GPU worker it holds that GPU for the whole pipeline while its own GPU steps queue behind it, a self-inflicted deadlock with one worker. Controllers, optimisers, and monitors go on <code>services</code>.
</div>

## `clearml-task` and offline mode

```bash
clearml-task --project vision --name "external baseline" \
  --repo https://github.com/some/repo.git --branch main --script train.py \
  --args lr=0.001 epochs=30 --requirements requirements.txt \
  --docker nvidia/cuda:12.1.0-runtime-ubuntu22.04 --queue gpu
```

Builds a task from the outside for a script with no SDK in it. The agent injects the SDK, so TensorBoard capture still works. Offline mode (`Task.set_offline(True)`) writes a zip on an air-gapped machine, imported later with `clearml-task --import-offline`.

## Hyperparameter optimisation

```python
optimizer = HyperParameterOptimizer(
    base_task_id="…a completed, working run…",
    hyper_parameters=[
        UniformParameterRange("General/lr", 1e-5, 1e-2, log_scale=True),
        DiscreteParameterRange("General/batch_size", values=[32, 64, 128]),
    ],
    objective_metric_title="accuracy", objective_metric_series="val",
    objective_metric_sign="max",
    optimizer_class=OptimizerOptuna,
    execution_queue="gpu",
    max_number_of_concurrent_tasks=4, total_max_jobs=40,
    min_iteration_per_job=5, max_iteration_per_job=30, time_limit_per_job=45.0,
)
optimizer.start(); optimizer.wait(); optimizer.get_top_experiments(top_k=5)
```

| Strategy | When |
|---|---|
| `RandomSearch` | Baseline and a sanity check on ranges |
| `GridSearch` | Few discrete params, exhaustive coverage needed |
| `OptimizerOptuna` | Default; good with continuous ranges |
| `OptimizerBOHB` | Expensive training where early stopping saves most |

<div class="callout warn">
  <span class="ct">A mismatched objective metric fails silently</span>
  <code>objective_metric_title</code> / <code>_series</code> must match a <code>report_scalar</code> call in the base task exactly. A mismatch does not raise: the optimiser sees no objective, cannot rank, never prunes, and degenerates into random search, which you discover after the GPU budget is spent. The base task must itself be a working completed run, or all forty trials fail identically.
</div>

## Datasets at scale

A dataset is a task holding **chunked zips** plus a file list; a child stores only its delta and points at parents. `get_local_copy()` walks the chain and flattens it.

| Method | Use for |
|---|---|
| `add_files` | Copy bytes into the dataset |
| `add_external_files` | Register bucket paths: no copy, no duplication |
| `remove_files` | Tombstone in a child; parents untouched |
| `get_local_copy` | Read-only, cached, shared between tasks |
| `get_mutable_local_copy` | Fresh writable extraction |
| `Dataset.squash` | Collapse a long parent chain into one version |
| `set_metadata` / `get_logger` | Statistics and plots on the data itself |

Two operational facts: **chunk size is a real knob** (many small files want larger chunks, few huge files want smaller), and **cache placement decides startup time**, because an ephemeral runner with an empty cache re-downloads everything every job.

<div class="callout tip">
  <span class="ct"><code>add_external_files</code> trades a copy for a dependency</span>
  5 TB becomes a versioned dataset with no second copy, but immutability now depends on your bucket. Overwrite the underlying object and the "immutable" version silently changes. Pair it with bucket versioning and a write-restricted prefix.
</div>

## Pipelines properly

```python
pipe.add_step(
    name="train", parents=["prepare"], execution_queue="gpu",
    base_task_project="vision", base_task_name="resnet18",
    parameter_override={"optimizer/lr": "${pipeline.lr}",
                        "General/data": "${prepare.artifacts.dataset.url}"},
    cache_executed_step=True, retry_on_failure=2,
    pre_execute_callback=skip_if, post_execute_callback=record_metric,
    monitor_metrics=[("accuracy", "val")], monitor_models=["resnet18-cls"],
)
```

| Feature | Buys you |
|---|---|
| `cache_executed_step` | Unchanged step with unchanged inputs is reused |
| `retry_on_failure=N` | Spot preemption and flaky downloads self-heal |
| `pre_execute_callback` | Conditional steps: return `False` to skip |
| `post_execute_callback` | Promotion gates and aggregate reporting |
| `monitor_metrics` / `monitor_models` | Steps' results mirrored onto the pipeline page |
| `add_pipeline_tags` | A run is filterable as a unit |

**Caching keys on the base task, the parameters, and the code, not on input file contents.** A step reading a mutable path will reuse a stale result, which is the strongest argument for versioned datasets over paths.

Scheduling turns a pipeline into a product: `TaskScheduler` for cron-style, `TriggerScheduler` for dataset and model triggers. A new finalized dataset version, or a model gaining the `candidate` tag, starts the pipeline.

## The registry as a promotion workflow

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>1</span><strong>Train</strong><small>Weights saved; model tagged <code>candidate</code>, linked to task and commit.</small></div>
  <div class="guide-timeline-item"><span>2</span><strong>Evaluate</strong><small>A separate task loads by tag and writes metrics into model metadata.</small></div>
  <div class="guide-timeline-item"><span>3</span><strong>Gate</strong><small>Compare against production with an explicit margin, not just ">".</small></div>
  <div class="guide-timeline-item"><span>4</span><strong>Promote</strong><small>Tags move; the winner is <code>publish()</code>ed and becomes read-only.</small></div>
  <div class="guide-timeline-item"><span>5</span><strong>Serve</strong><small>Serving follows the tag, so a tag move <em>is</em> the deploy.</small></div>
</div>

```python
model.update_design(config_dict={"arch": "resnet18", "input": [3, 224, 224]})
model.set_metadata("val_accuracy", 0.941, v_type="float")   # what the gate reads
model.tags = ["candidate"]
```

<div class="callout warn">
  <span class="ct">An unagreed tag vocabulary makes the registry decoration</span>
  <code>prod</code> vs <code>production</code> vs <code>live</code> means serving queries <code>production</code>, finds nothing, and silently keeps the old model. Fix four tags (<code>candidate</code>, <code>staging</code>, <code>production</code>, <code>archived</code>) and set them from the promotion task, never by hand.
</div>

## ClearML Serving

| Piece | Role |
|---|---|
| Serving service task | Control plane; holds endpoint config, lives on `services` |
| Inference container | Request path; runs your preprocess/postprocess |
| Triton container | GPU inference for supported frameworks |
| Statistics container | Request and drift metrics to Prometheus |
| `model auto-update --tags production` | Endpoint follows a tag; promotion self-deploys |
| `model canary --weights 0.9 0.1` | Weighted split between versions |

<div class="callout warn">
  <span class="ct">A serving endpoint does not authenticate callers</span>
  Put it behind an ingress or API gateway that terminates TLS and enforces auth. Never expose it directly. This is the standard oversight when a demo endpoint outlives the demo.
</div>

## Remote debugging and CI

```bash
clearml-session --queue gpu --base-task-id <id> --git-credentials   # a shell in that env
clearml-session --shutdown                                          # it holds a worker
```

CI pattern: `Task.create` + `Task.enqueue` from the runner, poll to completion, read `get_last_scalar_metrics`, exit non-zero below threshold. `fetch-depth: 0` so the agent can clone the commit. Credentials as `CLEARML_API_*` secrets, not a config file.

<div class="callout warn">
  <span class="ct">Fork pull requests must not hold ClearML credentials</span>
  An access/secret pair can enqueue tasks, and enqueueing is arbitrary code execution on your agents. On a public repo that is RCE on your GPU fleet. Restrict fork builds to ephemeral agents on an isolated queue, or gate them behind review.
</div>

## Debugging, one level deeper

| Symptom | Cause | Fix |
|---|---|---|
| Setup fails, task console empty | Failure was before your code ran | Read the **agent's** log |
| Task hangs at start, no output | API host unreachable or proxied | `CLEARML_LOG_LEVEL=DEBUG`; `curl $HOST/debug.ping` |
| Scalars lag minutes behind | Elasticsearch under load, or reporting too often | Report less; check the server |
| Two runs on one commit differ | Different stored uncommitted diffs | Compare `task.data.script.diff` |
| Docker pull fails on the agent | No registry credentials for that host | `docker login` as the agent user |
| Works in a session, fails as a task | Entry point or working directory differs | Execution ▸ script and cwd |

```bash
export CLEARML_LOG_LEVEL=DEBUG
export CLEARML_AGENT_LOG_LEVEL=DEBUG
clearml-agent daemon --queue gpu --foreground
```

## Common interview questions

<ol class="guide-steps">
  <li><b>When would you use <code>Task.create</code> instead of <code>Task.init</code>?</b>When the process launching the task is not the process that will run it: a CI job, a controller, or launching a repository you do not modify. <code>init</code> means "this process is the task" and does the patching and capture; <code>create</code> builds a task object with the repo, commit, entry point, and environment declared explicitly, which you then enqueue.</li>
  <li><b>Why did my run seem to disappear when I ran the script twice?</b><code>Task.init</code> reuses the last task created by the same script in the same project if that task recorded nothing: no iterations, no artifacts. It stops a debugging session producing forty empty tasks. During a sweep it is wrong, so pass <code>reuse_last_task_id=False</code>.</li>
  <li><b>How does requirements detection work, and how does it fail?</b>At the end of the run the SDK inspects <code>sys.modules</code> and maps imported modules to installed distributions. So a package imported inside a function that never ran is missed and the agent fails with <code>ImportError</code>; a detected pin carries no index URL so CUDA wheels resolve to CPU builds; and private packages resolve to names the agent cannot install. The fixes are module-level imports, <code>set_packages</code>, and docker mode.</li>
  <li><b>What does <code>system_site_packages: true</code> do and why does it matter?</b>It tells the agent to use the container's existing packages rather than building a fresh virtualenv and reinstalling everything. In docker mode with a prepared image, setup drops from minutes to seconds and you stop fighting CUDA wheel resolution, because the image already resolved it.</li>
  <li><b>Explain <code>--services-mode</code>.</b>Normally an agent runs one task at a time. In services mode it launches each task as a background process or container and immediately resumes polling, so one small CPU box can host dozens of pipeline controllers, HPO optimisers, and schedulers concurrently. Those tasks spend their lives waiting, so they must never occupy a GPU worker.</li>
  <li><b>What happens if you run a pipeline controller on the GPU queue?</b>It holds a GPU for the pipeline's entire duration while doing almost nothing, and its own GPU steps queue behind it. With a single worker that is a deadlock. Controllers, optimisers, and monitors belong on a services queue.</li>
  <li><b>What exactly does ClearML's pipeline caching key on?</b>The base task, the step's parameters, and the code. Not the contents of input files. So a step that reads a mutable path can be skipped even though the data changed, which is the practical argument for consuming versioned datasets rather than paths, since a version change is a parameter change.</li>
  <li><b>How do you pass data between pipeline steps?</b>Through artifacts and references. A step uploads an artifact; a downstream step's parameter is set to <code>${step.artifacts.name.url}</code>, or in the decorator API you return a value and consume it, which is also how the DAG edge is inferred. Models use <code>${step.models.output.-1.url}</code>.</li>
  <li><b>Why is an HPO objective metric a common source of wasted compute?</b>Because a mismatch is silent. The title and series must match a <code>report_scalar</code> call in the base task exactly; if they do not, the optimiser sees no objective, cannot rank trials, never prunes, and behaves like random search with no early stopping. You find out when the budget is gone. The other half is the base task itself. HPO clones it, so a broken base means every trial fails identically.</li>
  <li><b>Which HPO knobs control cost?</b><code>total_max_jobs</code> is the budget, <code>max_iteration_per_job</code> is the per-trial cap and the main lever, <code>time_limit_per_job</code> catches hangs, and <code>max_number_of_concurrent_tasks</code> has to match your worker count or trials just queue. <code>min_iteration_per_job</code> protects slow starters from being pruned too early.</li>
  <li><b>When would you use <code>add_external_files</code>?</b>When the data is large and already in your bucket. It records paths and hashes without copying bytes, so a multi-terabyte prefix becomes a versioned dataset for almost no storage. The trade is that immutability now depends on the bucket, so it needs versioning enabled and a write-restricted prefix. Otherwise an overwrite silently changes a "finalized" version.</li>
  <li><b>What does <code>Dataset.squash</code> solve?</b>Long parent chains. <code>get_local_copy()</code> walks every ancestor and downloads all needed chunks, which is fine at three versions and slow at three hundred. Squashing flattens a chain into one self-contained version, trading storage for fetch speed.</li>
  <li><b>How do you make a promotion decision reproducible?</b>Write the numbers into the model's metadata during evaluation, then have a promotion task query candidates, compare against the current production model with an explicit margin, move the tags, and publish the winner. The decision is then a task with a log, not a person clicking in the UI.</li>
  <li><b>How does a promotion become a deployment?</b>The serving endpoint is registered with <code>model auto-update</code> against a project, name, and tag rather than a model id. Moving the <code>production</code> tag is what deploys, so there is no redeploy step and no code change, which also means the tag vocabulary has to be agreed and enforced.</li>
  <li><b>What is <code>clearml-session</code> for?</b>Starting an interactive Jupyter, VS Code, and SSH session inside the agent's own environment, optionally reconstructed from a specific task id. It turns the worst class of bug, "only fails on the agent", into an ordinary debugging session. It is a task, so it holds a worker until you <code>--shutdown</code>.</li>
  <li><b>Design a CI check that gates a pull request on model quality.</b>On PR, the runner does a full-depth checkout, builds a task with <code>Task.create</code> pinned to the commit with a short epoch budget, enqueues it to a GPU queue, polls until completion, reads the objective with <code>get_last_scalar_metrics</code>, prints the run URL into the log, and exits non-zero below a threshold. Credentials come from secrets as env vars, and fork builds are isolated.</li>
  <li><b>Why can fork pull requests not be given ClearML credentials?</b>Because enqueueing a task means executing arbitrary code on your agents. A fork PR with the workspace secret is remote code execution on your GPU fleet, plus read access to every experiment. Isolate fork builds on ephemeral agents with no other credentials, or require review before they run.</li>
  <li><b>Where do you look when setup fails but the task console is empty?</b>The agent's own log. Docker pulls, pip resolution, and git fetches all happen before your code starts, so those failures never reach the task console. Running the agent with <code>--foreground</code> and <code>CLEARML_AGENT_LOG_LEVEL=DEBUG</code> is how you watch it.</li>
  <li><b>How would you handle a distributed multi-GPU training run?</b>One task, not one per rank: initialise on rank zero and use <code>Task.current_task()</code> elsewhere, so scalars and artifacts land in a single readable task. On the agent side, pin multiple GPUs to one worker with <code>--gpus 0,1</code> rather than running one worker per GPU.</li>
  <li><b>Give a reason not to use ClearML.</b>It is a stateful platform: a self-hosted server means owning MongoDB, Elasticsearch, and Redis, with backups and upgrades. If you already run Airflow and a tracking server and your data versioning is settled, adopting ClearML means replacing working components rather than filling a gap. It earns its keep when you need tracking, data versioning, and execution together, and it is a real cost when you do not.</li>
</ol>

## Final self-test

- Distinguish `Task.init`, `Task.create`, and `Task.clone` in one sentence each.
- Explain task reuse and task continuation, and when each is correct.
- Say how requirements detection works and name its three failure modes.
- Name the agent's four caches and which one usually saves the most time.
- Explain `system_site_packages: true` and `--services-mode`.
- Say what happens when a controller runs on a GPU queue.
- State what pipeline caching keys on, and what it does not.
- Give the reference syntax for a step's parameter, artifact, and last output model.
- Say why a mismatched HPO objective is expensive, and how you would verify it.
- Explain the trade-off in `add_external_files` and what `squash` is for.
- Walk the five-stage promotion workflow and say how the tag reaches serving.
- Name the log to read when setup fails, and why the task console is empty.
- Say why fork pull requests must not hold ClearML credentials.
