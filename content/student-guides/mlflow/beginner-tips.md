Part one of three. Almost every beginner problem with MLflow comes from one of three things: the tracking URI pointing somewhere you did not expect, a model logged without a signature or a usable environment, or the difference between immutable params and mutable tags. Start with the error table, then work through the habits and practice cards underneath it.

## Common errors at this level

| Symptom | Real cause | Fix |
|---|---|---|
| No runs in the UI, but the script "worked" | No tracking URI, so it wrote to a local `./mlruns` | `export MLFLOW_TRACKING_URI=http://…` or `mlflow.set_tracking_uri(...)` |
| Runs split across two places | One script sets the URI, another does not | Set it once via the environment, not per file |
| Everything lands in `Default` | No `set_experiment` call | `mlflow.set_experiment("name")` at the top |
| `MlflowException: ... does not support model registry` | File-based backend store | `--backend-store-uri sqlite:///mlflow.db` or Postgres |
| Metrics visible, artifacts 404 in the UI | Client cannot reach the artifact root | Check `--default-artifact-root` and the client's credentials |
| Artifacts written to the server's disk unexpectedly | Artifact root is a local path on the server | Use a shared URI (`s3://`, `gs://`, a mount) for teams |
| Run stuck in `RUNNING` for days | No context manager and the process died | `with mlflow.start_run():`, or `client.set_terminated(...)` |
| Notebook run captures the next cell's logs | A run was never ended | Always use the `with` block, even interactively |
| `Param already logged with a different value` | `log_param` inside a loop or a retry | Params once at the top; use metrics for varying values |
| Nothing autologged | `autolog()` called after the estimator was created | Call it beside the imports |
| Autolog logged a huge number of child runs | A large `GridSearchCV` under default settings | `max_tuning_runs=N` |
| Metric shows one number, not a curve | Logged without `step` | Pass `step=epoch` |
| Metric chart has one point per run only | Metric logged once, outside the loop | Log inside the loop with a step |
| Serving returns confident nonsense | No signature; columns reordered or retyped | `infer_signature(...)` or `input_example=` |
| Serving fails on load with an import error | Environment mismatch with the training env | Default `--env-manager virtualenv`, not `local` |
| `mlflow models serve` is very slow to start | Building a fresh virtualenv each time | Fine in production; use `--env-manager local` for quick checks |
| `Model does not have the "python_function" flavor` | Logged with a save API instead of a log/flavour API | Log through a flavour module, e.g. `mlflow.sklearn.log_model` |
| Two runs are indistinguishable | No `run_name`, no tags | Name and tag in code |
| `transition_model_version_stage` warnings | Deprecated stages API | Use aliases |
| A promoted model cannot be traced to code | Run executed from a dirty tree | Commit first; MLflow stores the commit, not a diff |
| Disk filling in `mlruns/` | Every run keeps a full model copy | An artifact store with lifecycle rules; log models deliberately |
| `search_runs` returns nothing | Filter string quoting — params are strings | `params.max_depth = '5'`, quoted |

## The habits that pay off most

<div class="cards">
  <div class="card"><div class="icon">🔗</div><h4>Set the tracking URI in the environment</h4><p>One <code>MLFLOW_TRACKING_URI</code> export beats per-script calls, and removes the "which mlruns folder?" problem entirely.</p></div>
  <div class="card"><div class="icon">🧷</div><h4>Always use the context manager</h4><p><code>with mlflow.start_run():</code> gives you correct statuses on failure and no orphaned runs.</p></div>
  <div class="card"><div class="icon">✍️</div><h4>Name and tag every run in code</h4><p>A descriptive <code>run_name</code> plus team/dataset/purpose tags makes a two-hundred-row table navigable.</p></div>
  <div class="card"><div class="icon">📐</div><h4>Log a signature, every time</h4><p>One line. It converts a class of silently-wrong predictions into a clear rejection at the boundary.</p></div>
  <div class="card"><div class="icon">⚡</div><h4>Autolog, then add your own</h4><p>Framework params and metrics for free; your business metric and artifacts on top.</p></div>
  <div class="card"><div class="icon">📊</div><h4><code>mlflow.evaluate</code> for the standard set</h4><p>Comparable metrics computed the same way every time, so the leaderboard means something.</p></div>
  <div class="card"><div class="icon">🏷️</div><h4>Consume by alias, never by version</h4><p><code>models:/name@champion</code> in every consumer. Promotion becomes a pointer move.</p></div>
  <div class="card"><div class="icon">🧾</div><h4>Commit before a run that matters</h4><p>MLflow records the commit and not a diff, so a dirty-tree run is a scratch experiment by definition.</p></div>
</div>

## Practice cards

Short, self-contained exercises. Each one takes a few minutes and leaves you with a fact you will not forget.

<ol class="guide-steps">
  <li><b>Find the phantom <code>mlruns</code></b>Unset the tracking URI, run a script, then find the local <code>mlruns/</code> it created. This is the single most common MLflow confusion, and causing it once inoculates you.</li>
  <li><b>Break param immutability</b><code>log_param("lr", 0.1)</code> then <code>log_param("lr", 0.2)</code>. Read the error, then do the same with <code>set_tag</code> and see it overwrite.</li>
  <li><b>Watch a metric become a curve</b>Log a metric once without a step, then in a loop with <code>step=i</code>. Compare the Metrics tab.</li>
  <li><b>Read an <code>MLmodel</code> file</b>Log a model and open the manifest. Identify the flavours, the signature, and the Python version. This file <em>is</em> the design.</li>
  <li><b>Prove what a signature does</b>Log one model with and one without, then feed both a DataFrame with reordered columns. One refuses, one lies.</li>
  <li><b>Move an alias, change a deployment</b>Register two versions, point <code>champion</code> at one, load by alias, then move the alias and rerun the identical code.</li>
  <li><b>Serve without a server</b><code>mlflow models predict -m runs:/…/model -i input.json --env-manager virtualenv</code>. Watch it build the environment from the logged requirements.</li>
  <li><b>Autolog a grid search</b>Run a six-candidate <code>GridSearchCV</code> under autolog and look at the parent's child runs.</li>
  <li><b>Query your own history</b><code>mlflow.search_runs</code> with a filter on a metric and a tag. Note that params compare as quoted strings.</li>
  <li><b>Reproduce a run from what MLflow recorded</b>Pick an old run and try to rebuild it from its tags and params alone. Write down what was missing.</li>
</ol>

## Debugging order

Follow this rather than guessing — the first two steps answer most problems.

<ol class="guide-steps">
  <li><b>Print the tracking URI and experiment</b><code>mlflow.get_tracking_uri()</code> and <code>mlflow.get_experiment_by_name(...)</code>. If the run is not where you expected, nothing else matters.</li>
  <li><b>Check the run's status and artifact URI</b><code>client.get_run(id).info</code>. A <code>RUNNING</code> status means the process died; an unreachable <code>artifact_uri</code> explains missing files.</li>
  <li><b>Read the params, not your code</b>Under autolog especially, the recorded params are what actually ran.</li>
  <li><b>Read the <code>mlflow.*</code> tags</b>Source file, git commit, user, run type. A surprising commit explains a surprising result.</li>
  <li><b>Open the model's <code>MLmodel</code> and <code>requirements.txt</code></b>Every load and serve failure is answered here. Compare against the environment doing the loading.</li>
  <li><b>Reproduce the load path without a server</b><code>mlflow models predict --env-manager virtualenv</code> exercises exactly what serving would do, with a traceback you can read.</li>
</ol>

```python a debugging snippet worth keeping
import mlflow
from mlflow import MlflowClient

print("uri:", mlflow.get_tracking_uri())
client = MlflowClient()

run = client.get_run("a1b2c3d4e5f64718b9c0d1e2f3a4b5c6")
print(run.info.status, run.info.artifact_uri)
print("params:", run.data.params)
print("metrics:", run.data.metrics)
print("mlflow tags:", {k: v for k, v in run.data.tags.items() if k.startswith("mlflow.")})
print("artifacts:", [f.path for f in client.list_artifacts(run.info.run_id)])

# Full metric history, not just the last value
for point in client.get_metric_history(run.info.run_id, "val_auc"):
    print(point.step, point.value)

client.set_terminated(run.info.run_id, status="FAILED")   # close a stuck run
```

## `start_run` options worth knowing on day one

Most defaults are right. These five are the ones you will reach for.

```python
with mlflow.start_run(
    run_name="rf d=5 feats=v3",          # searchable, human-readable
    experiment_id=None,                   # or set_experiment() beforehand
    nested=False,                         # True for a child under an active run
    tags={"team": "risk", "purpose": "baseline"},
    description="Baseline for the Q3 review.",
) as run:
    ...
```

| Option | Use when |
|---|---|
| `run_name` | Always. An unnamed run is a random hash in a table |
| `tags` | Always. Cheaper here than remembering `set_tags` later |
| `nested=True` | Creating child runs inside a sweep or a pipeline step |
| `run_id=...` | Resuming an existing run to add metrics or artifacts |
| `description` | Anything you will defend later; it renders in the UI |

```python resuming a run to attach a later evaluation
with mlflow.start_run(run_id="a1b2c3d4e5f64718") as run:
    mlflow.log_metric("holdout_auc", 0.918)
    mlflow.log_artifact("outputs/holdout_report.html")
```

<div class="callout warn">
  <span class="ct">A nested run without <code>nested=True</code> raises</span>
  Calling <code>start_run</code> while another run is active is an error unless you pass <code>nested=True</code>. In a notebook this often means a previous cell left a run open — which is another reason the context manager is not optional.
</div>

## Param, metric, tag, artifact — the decision

Half of all beginner MLflow confusion lives here, and two questions resolve it: **is it a number I might plot?** and **might I change my mind about it after the run?**

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Param — configuration</h4>
    <ul>
      <li>Hyperparameters, seed, feature-set version</li>
      <li>Set once, at the top of the run</li>
      <li>Immutable: relogging a different value errors</li>
      <li>Compared as a <b>string</b> in search filters</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Metric — measurement</h4>
    <ul>
      <li>Loss, AUC, latency, cost, training minutes</li>
      <li>Logged with a <code>step</code>, so it is a series</li>
      <li>The experiment table shows the latest value</li>
      <li>Compared numerically in filters</li>
    </ul>
  </div>
</div>

Tags are the third axis and the most underused: mutable, searchable labels that let you reclassify runs after the fact. `broken`, `paper-v2`, `keep`, `dataset=v3` — these are what make old runs findable.

Artifacts are everything that is a file. The rule: if a reviewer would want to look at it, log it as an artifact rather than describing it in a metric.

<div class="callout tip">
  <span class="ct">One line to remember</span>
  <b>Params describe the run, metrics measure it, tags organise it, artifacts show it.</b> That sentence resolves every case at this level.
</div>

## Set up so MLflow catches things for you

Do these four things once and an entire class of mistakes disappears.

```bash
# 1. One tracking URI for the whole machine — never per-script again
export MLFLOW_TRACKING_URI=http://127.0.0.1:5000
# and in .bashrc / .zshrc, or a project .env your shell loads

# 2. A server with a real backend, so the registry works from day one
mlflow server --backend-store-uri sqlite:///mlflow.db \
              --default-artifact-root ./mlartifacts \
              --host 127.0.0.1 --port 5000

# 3. Pin MLflow, so an upgrade never surprises a teammate mid-sprint
echo "mlflow==2.16.0" >> requirements.txt

# 4. Confirm what the client thinks it is talking to
python -c "import mlflow; print(mlflow.get_tracking_uri(), mlflow.__version__)"
```

```text .gitignore
mlruns/
mlartifacts/
mlflow.db
outputs/
*.pkl
```

<div class="callout tip">
  <span class="ct">Put the reproduction commands in your README</span>
  Three lines — <code>pip install -r requirements.txt</code>, the <code>export MLFLOW_TRACKING_URI=…</code>, and <code>mlflow run . -P …</code> — are the most valuable documentation in the repository, because they are simultaneously the instructions and the test of whether the project is reproducible at all.
</div>

## Writing a tracked script that ages well

```python src/train.py
import argparse
import mlflow
import mlflow.sklearn
from mlflow.models import infer_signature

ap = argparse.ArgumentParser()                       # 1. every knob is a flag
ap.add_argument("--max-depth", type=int, default=5)
ap.add_argument("--data-version", default="v3")
ap.add_argument("--seed", type=int, default=42)
args = ap.parse_args()

mlflow.set_experiment("churn")                        # 2. never Default
mlflow.sklearn.autolog(log_models=False, silent=True) # 3. autolog before the estimator

run_name = f"rf d={args.max_depth} data={args.data_version}"
with mlflow.start_run(run_name=run_name,              # 4. named and tagged at creation
                      tags={"team": "risk", "dataset": args.data_version}) as run:
    mlflow.log_params({"seed": args.seed, "data_version": args.data_version})

    set_seed(args.seed)                               # 5. seeded, and the seed is logged
    model = train(args)

    signature = infer_signature(X_train, model.predict(X_train))   # 6. a contract
    info = mlflow.sklearn.log_model(
        model, name="model", signature=signature,
        input_example=X_train.head(3),
        registered_model_name="churn-classifier",     # 7. registered at log time
    )

    mlflow.evaluate(model=info.model_uri, data=eval_df,            # 8. one evaluator
                    targets="label", model_type="classifier")
    mlflow.log_artifact("outputs/segment_report.html")             # 9. show your work
    print("run:", run.info.run_id)
```

| Rule | Why |
|---|---|
| Every tunable value is a CLI flag | So the script is a Project entry point, not a file to edit |
| A named experiment | `Default` becomes a landfill within a week |
| `autolog` before the estimator | Late calls fail silently |
| Name and tags passed to `start_run` | Nothing to forget afterwards |
| The seed logged as a param | Two "identical" runs that differ are the most expensive mystery in ML |
| A signature on every logged model | Silently wrong predictions become loud rejections |
| Registered at log time | The registry stays in step with training automatically |
| `mlflow.evaluate` for the standard metrics | Comparability across every run in the experiment |

<div class="callout warn">
  <span class="ct">`log_models=False` in autolog plus an explicit `log_model` is deliberate</span>
  Autolog will log a model for you, but without your signature or your <code>registered_model_name</code>. Logging it yourself gives you the contract and the registration; leaving autolog's model on as well means two model artifacts per run and confusion about which one is real.
</div>

## Reading the UI quickly

Learning to read these five places saves more time than any other single skill at this level.

| Where | Holds | You go here to |
|---|---|---|
| **Experiment table** | One row per run, with selectable param/metric columns | Rank and filter |
| **Run overview** | Status, duration, source, git commit, user, datasets | Confirm *what* ran |
| **Parameters** | Everything logged or autologged | Confirm what values ran |
| **Metrics** | One chart per metric, by step | Diagnose training |
| **Artifacts** | The file tree, including `model/MLmodel` | Inspect outputs and the model contract |

```text where each thing you logged ends up
mlflow.log_params({...})        → Parameters
mlflow.log_metric(..., step=i)  → Metrics  (a chart, because of the step)
mlflow.set_tags({...})          → Overview ▸ Tags, and the search index
mlflow.log_artifact("x.png")    → Artifacts
mlflow.log_figure(fig, "p.png") → Artifacts (no file written by you)
mlflow.log_input(dataset)       → Overview ▸ Datasets
mlflow.sklearn.log_model(...)   → Artifacts ▸ model/, and the registry if named
mlflow.evaluate(...)            → Metrics + Artifacts (plots and tables)
print(...)                      → your terminal, and nowhere sortable
```

## Small things worth doing from day one

**Name runs by what changed, not by number.** `rf d=8 feats=v3` beats `run_47`. The timestamp is already recorded; the intent is not.

**One experiment per problem, not per person.** `churn` with tagged runs beats `churn-amina` and `churn-omar`, because the whole point is comparing across people.

**Log training time and model size as metrics.** They become sortable columns, and they are the two numbers a reviewer asks for that nobody ever records.

**Log the evaluation report as an artifact.** A metric says 0.94; an artifact shows which segment it failed on.

**Set and log the seed.** Unexplained variance between two "identical" runs costs more time than any other problem in ML work.

**Use `log_figure` and `log_table` instead of writing files.** Fewer temp files, no cleanup, and the artifact lands where you meant it to.

**Delete runs you know are junk, tag the rest.** A table where every row is meaningful is a table people read.

```python a two-line habit worth aliasing
mlflow.set_tags({"dataset": args.data_version, "purpose": "baseline", "ticket": "RISK-412"})
mlflow.log_metrics({"train_minutes": elapsed / 60, "model_mb": size_mb})
```

## A starter setup worth keeping

Copy this into a new project and delete what you do not need. Every line is something from this page.

```text project layout
.
├── MLproject
├── python_env.yaml
├── requirements.txt          # includes a pinned mlflow==
├── .gitignore                # mlruns/, mlartifacts/, mlflow.db
├── src/
│   ├── train.py
│   ├── promote.py
│   └── batch_score.py
└── README.md                 # the three commands to reproduce
```

```yaml MLproject
name: churn
python_env: python_env.yaml
entry_points:
  main:
    parameters:
      max_depth: {type: int, default: 5}
      data_version: {type: string, default: "v3"}
      seed: {type: int, default: 42}
    command: >
      python src/train.py --max-depth {max_depth}
                          --data-version {data_version}
                          --seed {seed}
```

```python src/promote.py
import mlflow
from mlflow import MlflowClient

NAME, MARGIN, METRIC = "churn-classifier", 0.002, "roc_auc"
client = MlflowClient()

def score(version):
    return client.get_run(version.run_id).data.metrics.get(METRIC, 0.0)

versions = client.search_model_versions(f"name = '{NAME}'")
best = max(versions, key=score)

try:
    current = client.get_model_version_by_alias(NAME, "champion")
except mlflow.exceptions.MlflowException:
    current = None

if current is None or score(best) > score(current) + MARGIN:
    client.set_registered_model_alias(NAME, "champion", best.version)
    client.set_model_version_tag(NAME, best.version, "promoted_metric", f"{score(best):.4f}")
    print("promoted version", best.version)
else:
    print(f"no promotion: {score(best):.4f} vs {score(current):.4f}")
```

```bash
# One-time setup
pip install -r requirements.txt
export MLFLOW_TRACKING_URI=http://127.0.0.1:5000
mlflow server --backend-store-uri sqlite:///mlflow.db \
              --default-artifact-root ./mlartifacts --port 5000

# Everyday loop
mlflow run . -P max_depth=8 -P data_version=v3
python src/promote.py
mlflow models serve -m "models:/churn-classifier@champion" --port 5001
```

Eight details in there are the whole lesson of this page: one tracking URI in the environment, a named experiment, autolog enabled before the estimator with `log_models=False`, a run named and tagged at creation, the seed and data version as params, a signature on every logged model, promotion by moving an alias with an explicit margin, and an `MLproject` so the run is one typed command.

**Mid-level tips go deeper on every one of these** — nested runs and sweep hygiene, custom `pyfunc` models for preprocessing that has to travel with the model, dependency pinning that actually holds, dataset tracking and lineage, promotion gates in CI, `mlflow.evaluate` validation thresholds, tracing and LLM evaluation, deployment targets, and diagnosing "loads locally, fails in serving".
