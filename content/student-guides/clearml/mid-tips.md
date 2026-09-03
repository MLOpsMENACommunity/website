Part two of three. The problems at this level are no longer "why is nothing logging". They are a GPU queue full of idle sessions, an HPO that burned four hundred GPU-hours optimising nothing, a pipeline that reused a stale step, and a run that works on your laptop and dies on every agent. Start with the error table, then the practices, then the deeper material underneath.

## Common errors at this level

Cumulative — everything from Beginner still applies. These are the failures that cost hours rather than minutes.

| Symptom | Real cause | Fix |
|---|---|---|
| HPO ran 40 trials, ranked nothing, pruned nothing | `objective_metric_title`/`_series` do not match a reported scalar | Copy the exact strings from the base task's Scalars tab |
| All HPO trials failed identically | The base task itself was broken on the agent | Validate the base task on an agent before pointing HPO at it |
| HPO trials all sit in `queued` | `max_number_of_concurrent_tasks` exceeds worker count | Match concurrency to workers, or add workers |
| Pipeline reused a step that should have rerun | Caching keys on params and code, not on input file contents | Consume a versioned dataset so a change is a parameter change |
| Pipeline queued forever with no steps | Nothing watching the controller's queue | An agent on `services`, or `start_locally()` |
| One pipeline hogged every GPU | Controller placed on the GPU queue | Controllers on `services`, always |
| `parameter_override` had no effect | Key not section-qualified, e.g. `lr` instead of `General/lr` | Read the executed step's Configuration to confirm the override landed |
| Agent installs CPU torch on a GPU box | Detected requirements carry no index URL | Docker mode with a CUDA image, or `extra_index_url` |
| Agent setup takes 6 minutes every run | No venv cache, no pip cache, fresh venv each time | Enable `venvs_cache` + `pip_download_cache`; `system_site_packages` in docker |
| `ImportError` on the agent, never locally | Lazy import missed by detection | Module-level import, or `task.set_packages` |
| GPU queue full of tasks doing nothing | Abandoned `clearml-session` instances | `--shutdown`; enforce a session timeout |
| Dataset fetch dominates job time | Empty SDK cache on ephemeral runners | Mount a persistent cache volume |
| `get_local_copy()` slow on a deep chain | Long parent chain walked every fetch | `Dataset.squash` |
| A "finalized" dataset changed | `add_external_files` and someone overwrote the bucket object | Bucket versioning + write-restricted prefix |
| Serving endpoint still returns the old model | Endpoint pinned to a model id, not a tag | `model auto-update --tags production` |
| Serving returns 500 on bad input | No validation in `Preprocess` | Validate and raise a clean error in preprocess |
| CI job waits hours on a queue | No agent on the target queue, no timeout | Job-level timeout; alert on queue depth |
| Distributed run created 8 tasks | `Task.init` on every rank | Init on rank 0; `Task.current_task()` elsewhere |
| Scalars arrive minutes late | Elasticsearch under load, or reporting every step | Report per epoch, not per batch; check the server |
| Two "identical" runs differ | Unseeded randomness, or different stored diffs | Connect the seed; compare `data.script.diff` |
| Setup failure with an empty task console | It failed before your code ran | Read the agent's log, not the task's |
| Promotion script found no candidates | Tag vocabulary drift (`prod` vs `production`) | Fix four tags and set them from code only |

## The practices that pay off most

<div class="cards">
  <div class="card"><div class="icon">🐳</div><h4>Docker mode with a prepared image</h4><p>CUDA, system libs, and wheels resolved once at build time. With <code>system_site_packages</code>, setup is seconds.</p></div>
  <div class="card"><div class="icon">📝</div><h4>Declare packages, do not detect them</h4><p><code>set_packages("requirements.txt")</code> removes the entire class of "works locally, ImportError on the agent".</p></div>
  <div class="card"><div class="icon">🛠️</div><h4>A services queue from day one</h4><p>Controllers, optimisers, schedulers, and triggers all live there. Nothing that waits should hold a GPU.</p></div>
  <div class="card"><div class="icon">🎯</div><h4>Verify the HPO objective first</h4><p>Read the base task's Scalars tab and copy the strings. Two minutes against a whole wasted budget.</p></div>
  <div class="card"><div class="icon">🧊</div><h4>Version data, not paths</h4><p>It is also what makes pipeline caching correct, because a data change becomes a parameter change.</p></div>
  <div class="card"><div class="icon">🏷️</div><h4>Four tags, set only from code</h4><p><code>candidate</code>, <code>staging</code>, <code>production</code>, <code>archived</code>. Serving follows the tag, so drift is an outage.</p></div>
  <div class="card"><div class="icon">💾</div><h4>Persistent caches on every worker</h4><p>venv, pip, vcs, and SDK storage. On ephemeral runners, a mounted volume is the whole difference.</p></div>
  <div class="card"><div class="icon">🚪</div><h4>Sessions have an owner and a deadline</h4><p><code>--shutdown</code> when done, and a timeout on shared queues. Idle sessions are the top cause of a "full" GPU queue.</p></div>
</div>

## Practice cards

<ol class="guide-steps">
  <li><b>Measure the setup phase three ways</b>Time the agent's setup in virtualenv mode cold, virtualenv with venv cache warm, and docker with <code>system_site_packages</code>. Three numbers, one obvious conclusion.</li>
  <li><b>Break the HPO objective on purpose</b>Run eight trials with a misspelled series. Watch the optimiser complete with no ranking and no pruning. This is the failure you must be able to recognise in ten seconds.</li>
  <li><b>Prove pipeline caching is not input-aware</b>A step that reads a file from disk, cached. Change the file, rerun the pipeline, and watch the step be skipped. Then switch to a versioned dataset and repeat.</li>
  <li><b>Deadlock yourself deliberately</b>One GPU worker, controller on the GPU queue, one GPU step. Watch it hang. Move the controller to <code>services</code> and watch it work.</li>
  <li><b>Land a silent override failure</b>Use <code>parameter_override={"lr": …}</code> without the section prefix. Confirm no error, then find the unread parameter in the step's config.</li>
  <li><b>Reproduce an agent-only failure in a session</b>Cause a lazy-import failure, then <code>clearml-session --base-task-id</code> that task and fix it interactively.</li>
  <li><b>Squash a chain and measure</b>Five-deep dataset chain, timed fetch, squash, timed fetch again.</li>
  <li><b>Make promotion deploy itself</b>Register an endpoint with <code>auto-update</code> on a tag, then move the tag with a script. Confirm the endpoint changed with no deploy step.</li>
  <li><b>Launch something you did not write</b><code>clearml-task</code> against a public repo, then clone it in the UI and change an argument.</li>
  <li><b>Time a full-cold job on an ephemeral runner</b>Empty caches, then mount a persistent cache volume and repeat. That delta is your per-job tax.</li>
</ol>

## Making the agent fast

Setup time is the tax on every single run, and four things account for nearly all of it.

```text clearml.conf on every agent host
agent {
  vcs_cache { enabled: true, path: "/mnt/cache/vcs" }
  pip_download_cache { enabled: true, path: "/mnt/cache/pip" }
  venvs_cache { max_entries: 20, free_space_threshold_gb: 20, path: "/mnt/cache/venvs" }
  docker_apply_cuda_version_runtime: true
  package_manager {
    type: pip
    system_site_packages: true
    force_upgrade: false
    extra_index_url: ["https://download.pytorch.org/whl/cu121"]
  }
}
sdk { storage { cache { default_base_dir: "/mnt/cache/clearml" } } }
```

| Lever | Typical saving | Notes |
|---|---|---|
| Prepared docker image + `system_site_packages` | Minutes → seconds | The biggest single win |
| `venvs_cache` | Whole install skipped on a repeated requirement set | Needs a stable requirement set to hit |
| `pip_download_cache` | Download time only, not install time | Cheap, always enable |
| `vcs_cache` | Full clone → incremental fetch | Matters a lot on a large repo |
| SDK storage cache on a persistent volume | The entire dataset download | The dominant cost on ephemeral runners |

<div class="callout tip">
  <span class="ct">Build the image in CI, tag it with the requirements hash</span>
  A nightly or on-change image build that installs <code>requirements.txt</code> means the agent never resolves a dependency at run time. Tag it with a hash of the requirements file and pin that tag on the task, and you get both fast setup and an exact, recorded environment.
</div>

```dockerfile Dockerfile.train
FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3.11 python3-pip git && rm -rf /var/lib/apt/lists/*
COPY requirements.txt /tmp/
RUN pip install --no-cache-dir -r /tmp/requirements.txt
# The agent injects clearml at run time; system_site_packages reuses everything above.
```

## Structuring HPO so it does not waste money

The optimiser will happily spend your entire GPU budget learning nothing. Four rules prevent that.

<ol class="guide-steps">
  <li><b>Validate the base task on an agent first</b>HPO clones it. A base task that fails on the agent produces N identical failures and a bill.</li>
  <li><b>Copy the objective strings from the UI</b>Open the base task's Scalars tab and copy <code>title</code> and <code>series</code> literally. A typo is silent and total.</li>
  <li><b>Set a budget before a strategy</b><code>total_max_jobs</code> and <code>max_iteration_per_job</code> are the cost. Decide them from the hours you are willing to spend, then pick the strategy.</li>
  <li><b>Protect slow starters</b><code>min_iteration_per_job</code> must be past the point where a good configuration looks bad. Set it too low and pruning kills the winner.</li>
</ol>

```python a defensive optimiser setup
base = Task.get_task(task_id=BASE_ID)
assert base.status == "completed", f"base task is {base.status}"

metrics = base.get_last_scalar_metrics()
assert "accuracy" in metrics and "val" in metrics["accuracy"], \
    f"objective not reported by the base task; got {list(metrics)}"

optimizer = HyperParameterOptimizer(
    base_task_id=BASE_ID,
    hyper_parameters=[...],
    objective_metric_title="accuracy",
    objective_metric_series="val",
    objective_metric_sign="max",
    optimizer_class=OptimizerOptuna,
    execution_queue="gpu",
    max_number_of_concurrent_tasks=WORKERS,     # not more than you have
    total_max_jobs=40,
    min_iteration_per_job=5,
    max_iteration_per_job=30,
    time_limit_per_job=45.0,
    save_top_k_tasks_only=10,                   # stop the sweep filling storage
)
```

<div class="callout warn">
  <span class="ct">Forty trials of a 2 GB checkpoint is 80 GB</span>
  Every trial is a task with its own artifacts and models. <code>save_top_k_tasks_only</code> keeps the best K and deletes the rest, which is the difference between a sweep and a storage incident. Without it, a weekly sweep quietly becomes the largest thing in your bucket.
</div>

Those two assertions at the top are worth more than any tuning advice on this page. They cost three lines and catch the two failures that account for nearly every wasted HPO budget.

## Pipelines that are safe to schedule

An unattended pipeline needs four properties a hand-run one does not.

| Property | How |
|---|---|
| **Idempotent steps** | A rerun produces the same result; outputs keyed by version, not appended |
| **Correct caching** | Inputs are versioned datasets and parameters, never mutable paths |
| **Bounded retries** | `retry_on_failure=2` on network-dependent and preemptible steps |
| **A visible failure** | A `post_execute_callback` or the pipeline's own status feeding an alert |

```python monitoring the whole run from the controller
def post_execute(pipeline, node):
    task = node.job.task
    acc = task.get_last_scalar_metrics().get("accuracy", {}).get("val", {}).get("last")
    pipeline.get_logger().report_single_value(f"{node.name}_accuracy", acc or -1)
    if node.name == "train" and (acc or 0) < 0.85:
        pipeline.get_logger().report_text(f"REGRESSION: {acc} — halting promotion")
        return False        # stop the pipeline before it promotes a bad model
```

<div class="callout warn">
  <span class="ct">Caching plus a mutable input path is a silent stale result</span>
  Pipeline caching compares the base task, the parameters, and the code. A step reading <code>/data/latest/</code> has identical parameters when the data changes, so it is skipped and the downstream steps consume last week's output — with a green pipeline. Versioned datasets fix this because the version is a parameter.
</div>

```python the fix, in one line
# Instead of: prepare() reads /data/latest
# Do this: the version is a parameter, so a data change is a cache miss
pipe.add_parameter("dataset_version", "1.1.0")
pipe.add_step(name="prepare", cache_executed_step=True,
              parameter_override={"General/version": "${pipeline.dataset_version}"})
```

## Queue design for a small fleet

Queue layout is the cheapest scheduling tool you have, and three or four queues cover most teams.

| Queue | Workers | Runs |
|---|---|---|
| `services` | 1 CPU box, `--services-mode` | Controllers, optimisers, schedulers, triggers, serving control |
| `cpu` | 1–2 CPU workers | Data prep, evaluation, reporting |
| `gpu` | One worker per GPU | Training and HPO trials |
| `gpu-big` | One worker pinned to 2+ GPUs | Jobs that genuinely need multi-GPU |
| `ci` | Ephemeral workers, no other credentials | Pull-request smoke runs |

```bash
clearml-agent daemon --queue services --services-mode --cpu-only --detached
clearml-agent daemon --queue cpu --cpu-only --detached
clearml-agent daemon --queue urgent gpu --gpus 0 --detached   # drains urgent first
clearml-agent daemon --queue gpu --gpus 1 --detached
clearml-agent daemon --queue gpu-big --gpus 2,3 --detached
```

Two design rules that keep this from degrading:

**A worker listing several queues drains them in order.** `--queue urgent gpu` means "always take urgent work first, otherwise take normal work" — which is a priority system with no extra machinery.

**Never let two things compete for one GPU.** One worker per GPU, or one worker pinned to a group. Two workers claiming the same device produces out-of-memory failures that look like a model problem.

<div class="callout tip">
  <span class="ct">Alert on queue depth, not on task failures</span>
  A queue that is deep for an hour means a dead worker, a stuck session, or a runaway sweep — all things you want to know about before someone complains. Task failures are usually the author's problem; queue depth is yours.
</div>

## "Runs locally, fails on the agent"

The most common mid-level complaint, and it has exactly five causes. Work through them in this order.

<ol class="guide-steps">
  <li><b>The commit is not pushed</b>The diff travels through the server; the base commit must be fetchable. Check Execution ▸ commit against your remote.</li>
  <li><b>A package was missed</b>Compare Execution ▸ Installed Packages against your local <code>pip freeze</code>. A lazy import is the usual culprit.</li>
  <li><b>The wrong wheel was installed</b>CPU torch on a GPU box. The console shows <code>CUDA not available</code>. Docker mode with a CUDA image.</li>
  <li><b>A system dependency is missing</b>ffmpeg, libgl, a locale, a font. Only Python is managed in virtualenv mode — this is a docker-image problem.</li>
  <li><b>A path or environment variable only exists on your machine</b><code>~/data</code>, a mounted share, an exported token. Environment variables are deliberately not captured. Pass real config as parameters; mount real data as a dataset.</li>
</ol>

```bash
# The fastest possible diagnosis
clearml-session --queue gpu --base-task-id <failed-task-id>
# then, inside the session:
python -c "import torch; print(torch.__version__, torch.cuda.is_available())"
pip list | sort > /tmp/agent.txt          # compare against your laptop
ls -la ~/data 2>&1 | head                # does the path even exist here?
```

<div class="callout tip">
  <span class="ct">A one-off diagnostic task is cheaper than guessing</span>
  <code>clearml-task --script scripts/env_report.py --queue gpu</code> with a script that prints Python version, CUDA availability, package list, and the presence of the paths you expect. Run it once per new worker pool and keep the task — it becomes the reference for "what does this queue actually look like".
</div>

## Cost hygiene at this level

Storage and GPU-hours both grow silently, and both are noticed by someone else first.

| Source | Symptom | Control |
|---|---|---|
| Sweep artifacts | Bucket grows weekly with no new datasets | `save_top_k_tasks_only`; delete non-top trials |
| Checkpoints every epoch | Hundreds of GB per experiment | Keep best + last; `output_uri` to a lifecycle-managed prefix |
| Abandoned sessions | GPU utilisation low, queue deep | `--shutdown`; session timeout on shared queues |
| Datasets copied instead of linked | Storage doubles per version | `add_external_files` for very large data |
| Debug samples and images | Elasticsearch and file server growth | Report images sparsely, not every step |
| Failed trials retained | Thousands of dead tasks | Archive and delete CI and sweep tasks on a schedule |

```python a cleanup task worth scheduling
from datetime import datetime, timedelta
from clearml import Task

cutoff = (datetime.utcnow() - timedelta(days=30)).timestamp()
for t in Task.get_tasks(project_name="vision/ci"):
    if t.data.last_update.timestamp() < cutoff and t.status in ("failed", "aborted"):
        t.delete(delete_artifacts_and_models=True)
```

<div class="callout warn">
  <span class="ct"><code>delete(delete_artifacts_and_models=True)</code> is not reversible</span>
  It removes the objects from storage as well as the metadata. Run any cleanup script in report-only mode first, printing what it would delete and the total size, and scope it to a project you own — never workspace-wide. Archive is the reversible option; delete is not.
</div>

## Habits worth adopting now

**Pin the SDK and the agent version together.** An SDK newer than the agent can record fields the agent does not understand. One pinned pair across the team removes a class of "works for me".

**Put the image tag on the task, not only in the agent config.** `task.set_base_docker(...)` records the environment on the run, so a task from three months ago still names the image it needs.

**Give every launched task a tag naming its source.** `ci`, `hpo`, `nightly`, `manual`. Cleanup, cost attribution, and "what is filling my bucket" all become one filter.

**Report per epoch, not per batch.** Per-batch reporting on a long run is thousands of Elasticsearch writes for a curve nobody zooms into that far, and it is the usual cause of lagging scalars.

**Write the objective metric into the task name.** `resnet18 lr=1e-3 acc=0.940`. The experiments table becomes self-documenting, and an HPO result list becomes readable without opening anything.

**Keep a `scripts/env_report.py` in the repo.** One task per worker pool tells you what that hardware actually has, and it is the first thing you run when a queue starts behaving oddly.

**Treat `services` as production.** The controllers, schedulers, and triggers living there are what make everything else automatic. A dead services agent is an outage that presents as "the nightly did not run".

```bash
# A pre-flight worth aliasing before you launch a sweep or a pipeline
python -c "
from clearml import Task
t = Task.get_task(task_id='$BASE_ID')
print(t.status)
print(t.get_last_scalar_metrics().keys())
print(t.data.script.version_num, t.data.script.repository)
"
```

**Senior tips go deeper on every one of these** — the hardening pass every self-hosted server needs, credential scoping and service accounts, multi-tenant quota and isolation, Elasticsearch and MongoDB capacity and what breaks first, backup and restore drills, retention policy that survives an audit, GPU fleet economics and autoscaling, and incident playbooks for a lost server, a corrupted index, or a model nobody can rebuild.
