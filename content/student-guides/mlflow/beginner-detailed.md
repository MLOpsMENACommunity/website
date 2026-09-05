This is part one of three. It covers **everything you need to do real work with MLflow**, not a teaser. By the end you can track an experiment without restructuring your code, log parameters, metrics, and artifacts on purpose, compare thirty runs in a table and a chart, package a model so someone else can load it without knowing your framework, register and promote it through stages, and serve it behind an HTTP endpoint. Mid-level and Senior take the same topics further; nothing here is thrown away.

Each section ends with a **Try it** task. Do them as you go. They take a few minutes each, and these ideas only stick once you have watched a metric appear in the MLflow UI while your script is still running.

## What MLflow is, and the problem it solves

You trained a model last Tuesday. It scored 0.94 AUC. Today you cannot reproduce it. The notebook has moved on, the learning rate in the cell is not the one that ran, the feature list changed, and the only surviving record of 0.94 is a number in a Slack message.

Carelessness was never the problem. A system was missing: **nothing was writing anything down.** Every fact about that run lived in your terminal scrollback and your memory.

MLflow writes it down. You add a handful of lines, often just one, and it records the parameters, the metrics over time, the artifacts, the source file, the git commit, and the environment needed to load the model again, into a store you and your team can query.

<div class="flow">
  <div class="node">YOUR CODE<small>+ autolog</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">TRACKING<small>runs, params, metrics</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">MODELS<small>packaged + registered</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">SERVING<small>load anywhere</small></div>
</div>

**MLflow's central idea is a framework-agnostic contract.** A logged model is a directory with a declared flavour, a signature describing inputs and outputs, and a dependency list rather than a bare pickle from someone's laptop. Anything that understands that contract can load it: a batch job, a REST server, a Spark UDF, a Docker image. That single property is what turns a training script into something deployable.

That gives you four components, and they map exactly onto four problems:

<div class="cards">
  <div class="card"><div class="icon">📋</div><h4>Tracking</h4><p>Runs with parameters, metrics, tags, and artifacts. The answer to "what did we try and what happened?"</p></div>
  <div class="card"><div class="icon">📦</div><h4>Models</h4><p>A packaging format with flavours, a signature, and an environment. The answer to "how do I load this?"</p></div>
  <div class="card"><div class="icon">🗂️</div><h4>Model Registry</h4><p>Named models with versions, aliases, and stage transitions. The answer to "which one is in production?"</p></div>
  <div class="card"><div class="icon">🧪</div><h4>Projects</h4><p>A declared entry point and environment so a run is reproducible by command. The answer to "how do I rerun it?"</p></div>
</div>

The vocabulary is small, and getting it straight now prevents most later confusion:

| Term | What it is |
|---|---|
| **Run** | One execution: parameters, metrics, tags, artifacts, and a status. The atomic unit |
| **Experiment** | A named container of runs. The unit you compare within |
| **Tracking server** | The service that stores run metadata and serves the UI |
| **Backend store** | Where run metadata lives: a database, or local files |
| **Artifact store** | Where files live: S3, GCS, Azure, or a local directory |
| **Artifact** | Any file attached to a run: a plot, a CSV, a model directory |
| **Flavour** | How a logged model can be loaded: `sklearn`, `pytorch`, `pyfunc`, and others |
| **Signature** | The declared input and output schema of a model |
| **Registered model** | A named entry in the registry with numbered versions |

You need little to follow along: Python, a script that trains something small, and a folder. A tiny dataset and a five-line model are the best place to start, because a broken run costs you nothing.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Find your most recent training script. Write down, from memory, the exact learning rate and feature set it last ran with.</li>
    <li>Check the script and see whether you were right.</li>
    <li>Find the model file it produced and try to name the git commit that trained it.</li>
    <li>Count the files on your disk matching <code>model_final*</code>, <code>*_v2*</code>, or a date in the name.</li>
  </ol>
  <em>at least one of those is unanswerable, and usually all three. The third one, tying a model file to a commit, is the question that turns into an afternoon of archaeology during a code review, and it is the one MLflow answers with a run id.</em>
</div>

## The four components, and the two stores behind them

MLflow is often described as one tool. It is four that share a store, and you can adopt them in order.

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>1</span><strong>Tracking</strong><small>Log params, metrics, and artifacts. Useful on day one, with no infrastructure.</small></div>
  <div class="guide-timeline-item"><span>2</span><strong>Models</strong><small>Log the trained object in a loadable format with a signature and environment.</small></div>
  <div class="guide-timeline-item"><span>3</span><strong>Registry</strong><small>Promote a specific model version by alias, so consumers stop hard-coding paths.</small></div>
  <div class="guide-timeline-item"><span>4</span><strong>Serving / Projects</strong><small>Load that version in a batch job, a REST server, or a container.</small></div>
</div>

Two stores sit behind everything, and confusing them causes a whole category of errors:

<div class="guide-arch" style="--arch-cols:3">
  <div class="arch-lane" style="--lane-cols:2">
    <span class="arch-label">your process</span>
    <div class="arch-node" data-kind="entry"><b><code>mlflow</code> client</b><small><code>log_param</code> · <code>log_metric</code> · <code>log_model</code></small></div>
    <div class="arch-node"><b>Autolog patches</b><small>sklearn, torch, xgboost: params and metrics for free</small></div>
  </div>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down" data-flow="optional"></i>
  <div class="arch-lane" style="--lane-cols:3">
    <span class="arch-label">tracking server: two separate stores</span>
    <div class="arch-node" data-kind="store"><b>Backend store</b><small>Runs, params, metrics, tags, <em>and the registry</em>. Needs a database for aliases</small></div>
    <div class="arch-node" data-kind="store"><b>Artifact store</b><small>Files: models, plots, reports. S3, GCS, Azure, or a directory</small></div>
    <div class="arch-node"><b>Web UI</b><small>Reads both. Compare, filter, chart</small></div>
  </div>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down"></i>
  <div class="arch-node" data-kind="worker"><b>Registry version</b><small>Immutable, numbered, linked to its run</small></div>
  <div class="arch-node" data-kind="worker"><b>Alias → <code>@champion</code></b><small>Moveable pointer. Promotion is a tag move</small></div>
  <div class="arch-node" data-kind="external"><b>Consumers</b><small>Batch job · REST server · container · Spark UDF</small></div>
  <p class="arch-note"><b>The detail that surprises people:</b> by default the client reads and writes the <em>artifact store directly</em>, and the tracking server only hands out a URI. That is why metrics can appear in the UI while artifacts 404, and it means every user and CI job needs storage credentials unless you enable proxied access.</p>
</div>

| Store | Holds | Configured by |
|---|---|---|
| **Backend store** | Runs, params, metrics, tags, experiment and registry metadata | `--backend-store-uri` |
| **Artifact store** | Files: models, plots, CSVs, anything you log as an artifact | `--default-artifact-root` |

```bash
# Local files only — no server, no database. Creates ./mlruns
python train.py

# A local server with a SQLite backend — needed for the Model Registry
mlflow server --backend-store-uri sqlite:///mlflow.db \
              --default-artifact-root ./mlartifacts \
              --host 127.0.0.1 --port 5000

# A team setup: Postgres for metadata, S3 for files
mlflow server --backend-store-uri postgresql://user:pass@host/mlflow \
              --default-artifact-root s3://my-bucket/mlflow \
              --host 0.0.0.0 --port 5000
```

<div class="callout warn">
  <span class="ct">The Model Registry requires a database backend</span>
  With the default file store, tracking works and the registry does not. You get a clear error the first time you call <code>register_model</code>. SQLite is enough for one person; Postgres or MySQL is what a team needs. Decide this early, because migrating a file store into a database later is a chore nobody enjoys.
</div>

Your code points at a tracking server with one line, or one environment variable:

```python
import mlflow
mlflow.set_tracking_uri("http://127.0.0.1:5000")   # or "sqlite:///mlflow.db", or a path
mlflow.set_experiment("churn-baseline")
```

```bash
export MLFLOW_TRACKING_URI=http://127.0.0.1:5000
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run <code>pip install mlflow</code>, then <code>mlflow server --backend-store-uri sqlite:///mlflow.db --default-artifact-root ./mlartifacts --port 5000</code>.</li>
    <li>Open <code>http://127.0.0.1:5000</code> and note that it is empty: no runs, no experiments except <code>Default</code>.</li>
    <li>Sketch the two stores from memory and label which one a metric goes to and which one a plot goes to.</li>
    <li>Now run a script with no <code>set_tracking_uri</code> at all and find the <code>mlruns/</code> directory it created.</li>
  </ol>
  <em>step four is the one worth doing: MLflow works with zero configuration by writing to a local folder, which is why people accidentally end up with runs scattered across five <code>mlruns</code> directories. Knowing that the default exists is how you avoid it.</em>
</div>

## Your first tracked run, line by line

Start from a script with no MLflow in it:

```python train.py (before)
from sklearn.datasets import load_breast_cancer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score

n_estimators, max_depth = 200, 5

X, y = load_breast_cancer(return_X_y=True, as_frame=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestClassifier(n_estimators=n_estimators, max_depth=max_depth, random_state=42)
model.fit(X_train, y_train)
print("auc", roc_auc_score(y_test, model.predict_proba(X_test)[:, 1]))
```

Here it is tracked:

```python train.py (after)
import mlflow
import mlflow.sklearn
from sklearn.datasets import load_breast_cancer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score

mlflow.set_tracking_uri("http://127.0.0.1:5000")
mlflow.set_experiment("churn-baseline")

params = {"n_estimators": 200, "max_depth": 5, "random_state": 42}

with mlflow.start_run(run_name="rf baseline") as run:
    mlflow.log_params(params)

    X, y = load_breast_cancer(return_X_y=True, as_frame=True)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestClassifier(**params).fit(X_train, y_train)
    auc = roc_auc_score(y_test, model.predict_proba(X_test)[:, 1])

    mlflow.log_metric("auc", auc)
    mlflow.sklearn.log_model(model, name="model", input_example=X_train.head(3))

    print("run id:", run.info.run_id, "auc:", auc)
```

Run it, then open the UI. Four things happened:

<ol class="guide-steps">
  <li><b>A run was created</b>With a run id, an experiment, a status, a start and end time, and the user and source file that produced it.</li>
  <li><b>Parameters were recorded</b>Immutable strings. A parameter is set once and describes the configuration of the run.</li>
  <li><b>A metric was recorded</b>A float with a step and a timestamp, so a metric is a series rather than a single number.</li>
  <li><b>A model was logged</b>Not a bare pickle, but a directory with an <code>MLmodel</code> file declaring its flavours, its signature, and its dependencies.</li>
</ol>

The `with` block matters more than it looks. It sets the run's status to `FINISHED` on success and `FAILED` on an exception, and it guarantees the run is closed. Without it, an interrupted script leaves a run stuck in `RUNNING` forever.

<div class="callout tip">
  <span class="ct">Use the context manager, always</span>
  <code>with mlflow.start_run():</code> is the correct default. A bare <code>mlflow.start_run()</code> followed by <code>mlflow.end_run()</code> works until something raises in between, and then you have a run that claims to be running days later. In a notebook, an un-ended run also silently captures your next cell's logs.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run the tracked script and open the run in the UI. Visit each tab: Overview, Parameters, Metrics, Artifacts.</li>
    <li>Under Artifacts, open <code>model/MLmodel</code> and read it. Note the flavours and the signature.</li>
    <li>Raise an exception halfway through the <code>with</code> block and confirm the run's status becomes <code>FAILED</code>.</li>
    <li>Now do the same without the context manager and see the run stuck in <code>RUNNING</code>.</li>
  </ol>
  <em>the <code>MLmodel</code> file is the thing to read. It is the entire "why MLflow" argument in twenty lines: a declared loader, a declared schema, and a declared environment, which is what makes the artifact portable rather than personal.</em>
</div>

## Params, metrics, tags, artifacts: choosing correctly

Four things you log, with four different meanings. Choosing correctly is most of what separates a readable experiment table from an unusable one.

```python
# Parameters: configuration. Immutable, stored as strings.
mlflow.log_param("learning_rate", 3e-4)
mlflow.log_params({"batch_size": 64, "optimizer": "adamw", "features": "v3"})

# Metrics: numbers that can move. Float, with an optional step.
mlflow.log_metric("train_loss", 0.412, step=epoch)
mlflow.log_metric("val_loss", 0.503, step=epoch)
mlflow.log_metrics({"precision": 0.91, "recall": 0.88}, step=epoch)

# Tags: mutable, searchable labels for organisation.
mlflow.set_tag("stage", "baseline")
mlflow.set_tags({"team": "risk", "dataset": "v3", "owner": "amina"})

# Artifacts: files.
mlflow.log_artifact("outputs/confusion_matrix.png")
mlflow.log_artifact("outputs/report.html", artifact_path="reports")
mlflow.log_artifacts("outputs/plots", artifact_path="plots")   # a whole directory

# Convenience helpers that avoid touching disk yourself
mlflow.log_figure(fig, "plots/roc.png")
mlflow.log_table(predictions_df, "predictions.json")
mlflow.log_text(json.dumps(config, indent=2), "config.json")
mlflow.log_dict(config, "config.yaml")
```

| Kind | Mutable | Type | Use for |
|---|---|---|---|
| **Param** | No: logging twice with a different value errors | String | Configuration: hyperparameters, feature-set version, seed |
| **Metric** | Yes: appends a new step | Float | Anything measured: loss, AUC, latency, training minutes |
| **Tag** | Yes: overwrites | String | Organisation and search: team, purpose, ticket, dataset |
| **Artifact** | Append-only | File | Plots, reports, predictions, the model itself |

Two rules resolve nearly every "which one?" question. **If it is a number you might plot, it is a metric.** **If it is something you might change your mind about after the run, it is a tag.**

<div class="callout warn">
  <span class="ct">Params are immutable, and that bites in loops</span>
  Calling <code>log_param("lr", x)</code> twice with different values raises. It is deliberate, a run has one configuration, but it surprises people who log parameters inside a training loop or a retry. Log parameters once, at the top of the run, and use metrics for anything that varies during it.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Log the same parameter twice with different values and read the error.</li>
    <li>Log a metric with <code>step=0..9</code> in a loop and look at the Metrics tab, and note that you get a chart, not a number.</li>
    <li>Set a tag, then set the same tag to a different value, and confirm it overwrites.</li>
    <li>Log a matplotlib figure with <code>log_figure</code> and confirm it appears under Artifacts without you writing a file.</li>
  </ol>
  <em>the immutability difference in steps one and three is the whole model: params describe the run, tags describe how you think about the run, and only one of those is allowed to change afterwards.</em>
</div>

## Autologging: one line, and its boundaries

Most of the code in the previous section is unnecessary for common frameworks. One line replaces it.

```python
import mlflow

mlflow.autolog()            # everything MLflow can detect

# or per-framework, which is more predictable
mlflow.sklearn.autolog()
mlflow.pytorch.autolog()
mlflow.tensorflow.autolog()
mlflow.xgboost.autolog()
mlflow.lightgbm.autolog()
mlflow.transformers.autolog()
```

With `sklearn.autolog()` active, calling `.fit()` logs the estimator's parameters, training metrics, the fitted model with a signature, and, for search objects like `GridSearchCV`, child runs for every candidate configuration:

```python
import mlflow
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import GridSearchCV

mlflow.set_experiment("gb-sweep")
mlflow.sklearn.autolog(max_tuning_runs=10)

grid = GridSearchCV(
    GradientBoostingClassifier(random_state=42),
    {"max_depth": [2, 3, 4], "learning_rate": [0.05, 0.1]},
    scoring="roc_auc", cv=3,
)

with mlflow.start_run(run_name="gb grid search"):
    grid.fit(X_train, y_train)          # one parent run, plus child runs per candidate
```

| Autologged | Typically includes |
|---|---|
| Parameters | Every constructor argument of the estimator or the training call |
| Metrics | Training scores, and per-epoch metrics for deep learning frameworks |
| Model | Logged with a signature inferred from the training data |
| Artifacts | Feature importances, metric plots, and framework-specific summaries |
| Child runs | One per candidate in a hyperparameter search, up to `max_tuning_runs` |
| Datasets | For some flavours, a dataset reference describing the training input |

What autologging does **not** do: log your own custom evaluation metrics, log artifacts you generated yourself, or know which of your variables were meaningful. So the realistic pattern is autolog plus a few deliberate calls:

```python
mlflow.sklearn.autolog(log_models=True, log_datasets=True, silent=True)

with mlflow.start_run(run_name="rf + business metric"):
    model.fit(X_train, y_train)                     # autologged
    mlflow.log_metric("expected_loss_usd", cost)     # yours
    mlflow.set_tag("dataset", "v3")                  # yours
    mlflow.log_artifact("outputs/segment_report.html")
```

<div class="callout tip">
  <span class="ct">Call autolog before you create the estimator</span>
  Autologging patches the framework, so it has to be active before the training call, and for some frameworks before the object is constructed. Putting <code>mlflow.autolog()</code> at the top of the entry point, next to the imports, removes an entire class of "why did nothing get logged".
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Delete every logging call from your script, add <code>mlflow.sklearn.autolog()</code>, and compare what gets recorded.</li>
    <li>Run a <code>GridSearchCV</code> under autolog and look at the parent run's child runs in the UI.</li>
    <li>Add one custom metric of your own alongside autolog and confirm both appear.</li>
    <li>Move the <code>autolog()</code> call to <em>after</em> the estimator is created and see what changes.</li>
  </ol>
  <em>the child-run structure in step two is the payoff: a six-candidate search becomes six comparable runs in one table, for free. Step four teaches you the ordering rule the hard way, which is the way that sticks.</em>
</div>

## The MLflow Model format: flavours and signatures

This is the component that makes MLflow more than a logbook, and everything downstream depends on understanding it properly.

`log_model` does not save a pickle. It creates a directory:

```text mlruns/<exp>/<run>/artifacts/model/
model/
├── MLmodel                 # the manifest — flavours, signature, dependencies
├── model.pkl               # the serialised estimator
├── conda.yaml              # a conda environment that can load it
├── python_env.yaml         # a pip/venv equivalent
└── requirements.txt        # the pinned pip requirements
```

```yaml MLmodel
artifact_path: model
flavors:
  python_function:
    loader_module: mlflow.sklearn
    model_path: model.pkl
    python_version: 3.11.9
  sklearn:
    pickled_model: model.pkl
    sklearn_version: 1.5.1
    serialization_format: cloudpickle
mlflow_version: 2.16.0
model_uuid: 8f2c4b19e0a7d3f1c6b8a2e4d7091f3b
run_id: a1b2c3d4e5f64718b9c0d1e2f3a4b5c6
signature:
  inputs: '[{"name": "mean radius", "type": "double"}, {"name": "mean texture", "type": "double"}]'
  outputs: '[{"type": "long"}]'
```

Two ideas in that file carry the whole design:

**Flavours are loaders.** A model can declare several. The `sklearn` flavour lets you load it back as a scikit-learn object with all its methods. The `python_function` (pyfunc) flavour lets anything load it as a generic object with a `predict` method and no knowledge of scikit-learn at all. That second one is why the same artifact works in a REST server, a Spark job, and a Docker image.

```python
import mlflow

# Native flavour: the real object, with its own API
sk_model = mlflow.sklearn.load_model("runs:/a1b2c3d4/model")
sk_model.feature_importances_

# Generic flavour: just predict(). Framework-agnostic.
pyfunc = mlflow.pyfunc.load_model("runs:/a1b2c3d4/model")
pyfunc.predict(X_test)
```

**A signature is a contract.** It declares the input columns and types and the output type, so a wrong-shaped or wrong-typed request is rejected at the boundary rather than producing nonsense predictions.

```python
from mlflow.models import infer_signature

signature = infer_signature(X_train, model.predict(X_train))
mlflow.sklearn.log_model(
    model,
    name="model",
    signature=signature,
    input_example=X_train.head(3),      # also enables the UI's sample request
)
```

| Piece | Why it matters |
|---|---|
| `flavors` | How the model can be loaded, and by whom |
| `signature` | Input/output schema: validated at serving time |
| `input_example` | A concrete sample, used for docs and for signature inference |
| `requirements.txt` | The pinned environment, so serving does not guess |
| `run_id` | The link back to the run, and therefore to the params and metrics |

The URI schemes you will use constantly:

| URI | Points at |
|---|---|
| `runs:/<run_id>/model` | A model logged by a specific run |
| `models:/<name>/<version>` | A specific registry version |
| `models:/<name>@champion` | Whatever version currently holds that alias |
| `s3://bucket/path/model` | A model directory in object storage |
| `file:///abs/path/model` | A local directory |

<div class="callout warn">
  <span class="ct">Log a signature, or serving will accept anything</span>
  Without a signature, an endpoint takes columns in the wrong order or of the wrong type and returns predictions that are wrong. <code>infer_signature</code> costs one line and converts a class of silent production bugs into a loud 400 at the boundary. Always pass it, or pass <code>input_example</code> so MLflow can infer it.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Log a model, then open its <code>MLmodel</code> file and identify every flavour it declares.</li>
    <li>Load it twice (once with <code>mlflow.sklearn.load_model</code>, once with <code>mlflow.pyfunc.load_model</code>) and note what each object can do.</li>
    <li>Log one model with a signature and one without, then feed both a DataFrame with the columns in the wrong order.</li>
    <li>Open the <code>requirements.txt</code> inside the model directory and compare it against your environment.</li>
  </ol>
  <em>step three is the demonstration: the unsigned model returns confident nonsense, the signed one refuses. That difference is the argument for signatures, and no amount of reading it is as convincing as seeing both outputs.</em>
</div>

## Comparing runs: the table, the chart, the query

Tracking pays off here, and it is largely a UI skill. Run your script three or four times with different parameters before reading on.

In the experiment table:

| Action | How |
|---|---|
| Show a param or metric as a column | The columns selector; metric columns show the latest value |
| Sort by a metric | Click the column header |
| Filter | The search box, using the run-filter syntax |
| Compare | Tick two or more runs → **Compare** |
| Chart across runs | The Chart view: parallel coordinates, scatter, or bar |

Learn the search syntax, because the Python API uses the same language:

```text
metrics.auc > 0.9
params.max_depth = '5'
tags.dataset = 'v3' and metrics.auc > 0.88
attributes.status = 'FINISHED'
metrics.rmse < 1.5 and params.model_type != 'linear'
```

In code, which is how you build a report or a promotion gate:

```python
import mlflow

runs = mlflow.search_runs(
    experiment_names=["churn-baseline"],
    filter_string="metrics.auc > 0.9 and tags.dataset = 'v3'",
    order_by=["metrics.auc DESC"],
    max_results=20,
)
print(runs[["run_id", "params.max_depth", "metrics.auc", "tags.mlflow.runName"]])

best = runs.iloc[0]
print("best run:", best.run_id, best["metrics.auc"])
```

`search_runs` returns a pandas DataFrame with flattened `params.*`, `metrics.*`, and `tags.*` columns, which makes "find the best run and do something with it" a three-line script rather than a project.

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>What comparison gives you</h4>
    <ul>
      <li>A diff of parameters across selected runs</li>
      <li>Overlaid metric curves by step</li>
      <li>Parallel coordinates to see which parameter drives the metric</li>
      <li>A queryable table you can drive from Python</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>What it cannot do for you</h4>
    <ul>
      <li>Compare numbers you only <code>print()</code>ed</li>
      <li>Compare parameters you never logged</li>
      <li>Distinguish runs you never named or tagged</li>
      <li>Explain a difference caused by unlogged data changes</li>
    </ul>
  </div>
</div>

<div class="callout tip">
  <span class="ct">Name and tag every run, in code</span>
  <code>run_name="rf depth=5 feats=v3"</code> plus a couple of tags makes a table of two hundred runs navigable. Set them in the script rather than by hand, because the run you forget to label is always the one you need to find later.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run one script four times with different depths, each with a descriptive <code>run_name</code>.</li>
    <li>Add the depth and your metric as columns and sort by the metric.</li>
    <li>Select all four and open the Compare view, then the Chart view's parallel coordinates.</li>
    <li>Reproduce the ranking in Python with <code>mlflow.search_runs</code> and a <code>filter_string</code>.</li>
  </ol>
  <em>parallel coordinates in step three is the underused one: with four runs it looks decorative, and with forty it tells you immediately which parameter matters. Step four matters because that same query is what a CI promotion check runs.</em>
</div>

## The Model Registry: versions and aliases

Tracking answers "what did we try". The registry answers "which one is live", and it is the boundary between experimentation and production.

Register a model in one of three ways:

```python
# 1. At log time — the most common
mlflow.sklearn.log_model(model, name="model", registered_model_name="churn-classifier")

# 2. From an existing run afterwards
mlflow.register_model("runs:/a1b2c3d4e5f64718/model", "churn-classifier")

# 3. Through the client, with explicit control
from mlflow import MlflowClient
client = MlflowClient()
client.create_registered_model("churn-classifier")
client.create_model_version(
    name="churn-classifier",
    source="runs:/a1b2c3d4e5f64718/model",
    run_id="a1b2c3d4e5f64718",
)
```

Each registration creates a **numbered version** (version 1, 2, 3) which is immutable in content and permanently linked back to the run that produced it.

Then you point at a version by **alias** rather than by number, which is the part that makes deployment sane:

```python
from mlflow import MlflowClient
client = MlflowClient()

client.set_registered_model_alias("churn-classifier", "champion", version=7)
client.set_registered_model_alias("churn-classifier", "challenger", version=8)

# Consumers never mention a version number
model = mlflow.pyfunc.load_model("models:/churn-classifier@champion")
```

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>1</span><strong>Logged</strong><small>A run produces a model artifact with a signature and an environment.</small></div>
  <div class="guide-timeline-item"><span>2</span><strong>Registered</strong><small>It becomes version N of a named registered model, linked to its run.</small></div>
  <div class="guide-timeline-item"><span>3</span><strong>Evaluated</strong><small>A separate job scores it and records the result, often as a tag on the version.</small></div>
  <div class="guide-timeline-item"><span>4</span><strong>Aliased</strong><small><code>champion</code> moves to that version. Every consumer follows the alias.</small></div>
  <div class="guide-timeline-item"><span>5</span><strong>Superseded</strong><small>A newer version takes the alias; the old one stays queryable by number forever.</small></div>
</div>

| Concept | Meaning |
|---|---|
| Registered model | The name: one per problem, e.g. `churn-classifier` |
| Version | An immutable numbered entry, linked to the producing run |
| Alias | A moveable pointer: `champion`, `challenger`, `shadow` |
| Tags | Metadata on the model or a version, searchable |
| Description | Free text: what it is, who owns it, known limitations |

<div class="callout warn">
  <span class="ct">Stages are deprecated: use aliases</span>
  Older MLflow used fixed stages: <code>None</code>, <code>Staging</code>, <code>Production</code>, <code>Archived</code>, moved with <code>transition_model_version_stage</code>. You will see them in older code and tutorials, and they still appear in some UIs. Aliases replaced them because they are arbitrary, multiple, and not tied to a fixed vocabulary. Write new code against aliases; recognise stages when you read old code.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Register two models from two different runs and confirm you get versions 1 and 2.</li>
    <li>Set the <code>champion</code> alias to version 1, then load <code>models:/name@champion</code> and print a prediction.</li>
    <li>Move the alias to version 2 and rerun the exact same loading code. Nothing in your code changed.</li>
    <li>From a registered version in the UI, click through to the run that produced it and find its parameters.</li>
  </ol>
  <em>step three is the entire point of a registry: a deployment changed without a code change, a redeploy, or a file path. Step four is the audit path, weights to run to parameters to commit, and it should take you seconds.</em>
</div>

## Loading and serving: batch, REST, container

A registered model is only useful once something consumes it. Three ways, in increasing order of infrastructure.

**In a batch job**, which is the most common and the easiest:

```python batch_score.py
import mlflow
import pandas as pd

model = mlflow.pyfunc.load_model("models:/churn-classifier@champion")
frame = pd.read_parquet("data/today.parquet")
frame["score"] = model.predict(frame[model.metadata.get_input_schema().input_names()])
frame.to_parquet("out/scored.parquet")
```

**Behind a local REST endpoint**, with one command:

```bash
mlflow models serve -m "models:/churn-classifier@champion" --host 127.0.0.1 --port 5001 --env-manager local
```

```bash
curl -X POST http://127.0.0.1:5001/invocations \
  -H 'Content-Type: application/json' \
  -d '{"dataframe_split": {"columns": ["mean radius", "mean texture"], "data": [[17.99, 10.38]]}}'
```

| Payload format | Shape |
|---|---|
| `dataframe_split` | `{"columns": [...], "data": [[...]]}`: the usual choice for tabular |
| `dataframe_records` | `[{"col": value, ...}]`: row dicts |
| `instances` | `[[...], [...]]`: tensor-style input |
| `inputs` | A named-tensor dict, for deep learning models |

**As a container**, which is what you hand to a platform team:

```bash
mlflow models build-docker -m "models:/churn-classifier@champion" -n churn-scorer
docker run -p 5001:8080 churn-scorer
```

The `--env-manager` flag decides how the serving environment is built, and it is the setting people trip over:

| Value | Behaviour | When |
|---|---|---|
| `virtualenv` | Builds a fresh env from `python_env.yaml`. The default | Correct, slower start |
| `conda` | Builds from `conda.yaml` | If your stack is conda-based |
| `local` | Uses the current environment as-is | Fast iteration, and only safe when versions match |

<div class="callout warn">
  <span class="ct">A local MLflow endpoint has no authentication</span>
  <code>mlflow models serve</code> starts an unauthenticated HTTP server that will run predictions for anyone who can reach it. Bind it to <code>127.0.0.1</code> for local work, and never expose it directly. Put it behind an ingress or gateway that terminates TLS and enforces auth. Mid and Senior levels cover the production shape properly.
</div>

<div class="callout tip">
  <span class="ct">Mismatched dependencies are the top serving failure</span>
  A model pickled with scikit-learn 1.5 and loaded under 1.2 may fail loudly or, worse, load and behave differently. That is what the logged <code>requirements.txt</code> is for, so let the default <code>virtualenv</code> manager use it in anything that matters, and reserve <code>--env-manager local</code> for quick local checks.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Serve your registered champion locally and call it with <code>curl</code> using <code>dataframe_split</code>.</li>
    <li>Send a request with a column missing and read the error the signature produces.</li>
    <li>Serve with <code>--env-manager virtualenv</code> and watch it build the environment from the logged requirements.</li>
    <li>Write the batch scoring script and run it against the same alias.</li>
  </ol>
  <em>step two is why signatures exist: a clear 400 instead of a wrong prediction that arrives with no warning. Step three shows you where model portability comes from: the environment travels with the artifact, not with your laptop.</em>
</div>

## Evaluating with `mlflow.evaluate`

Logging your own metrics is fine. For standard tasks there is a built-in evaluator that produces a consistent, comparable set, plus plots and an explainability summary, from one call.

```python
import mlflow
from mlflow.models import infer_signature

with mlflow.start_run(run_name="rf + eval"):
    model.fit(X_train, y_train)
    signature = infer_signature(X_train, model.predict(X_train))
    info = mlflow.sklearn.log_model(model, name="model", signature=signature)

    eval_data = X_test.copy()
    eval_data["label"] = y_test

    result = mlflow.evaluate(
        model=info.model_uri,
        data=eval_data,
        targets="label",
        model_type="classifier",
        evaluators=["default"],
    )
    print(result.metrics["roc_auc"], result.metrics["f1_score"])
```

| `model_type` | Produces |
|---|---|
| `classifier` | Accuracy, precision, recall, F1, ROC AUC, log loss, plus ROC/PR/confusion plots |
| `regressor` | MAE, MSE, RMSE, R², plus residual and prediction-error plots |
| `question-answering` / `text` | Text metrics such as exact match, toxicity, and token counts |

You can also add your own metric alongside the defaults, which is how a business number gets into the same comparable table:

```python
from mlflow.models import make_metric

def _expected_cost(eval_df, _builtin_metrics):
    fp = ((eval_df["prediction"] == 1) & (eval_df["target"] == 0)).sum()
    fn = ((eval_df["prediction"] == 0) & (eval_df["target"] == 1)).sum()
    return 50 * fp + 500 * fn

expected_cost = make_metric(eval_fn=_expected_cost, greater_is_better=False, name="expected_cost")

result = mlflow.evaluate(
    model=info.model_uri, data=eval_data, targets="label",
    model_type="classifier", extra_metrics=[expected_cost],
)
```

<div class="callout tip">
  <span class="ct">One evaluator means every run is comparable</span>
  Hand-rolled metrics drift: one run computes AUC on probabilities, another on labels, a third excludes a class. <code>mlflow.evaluate</code> computes the same set the same way for every run, which is what makes a leaderboard trustworthy rather than tidy.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run <code>mlflow.evaluate</code> on a classifier and look at the metrics and plots it added to the run.</li>
    <li>Compare two runs evaluated this way and confirm every metric lines up.</li>
    <li>Add a custom cost metric with <code>make_metric</code> and sort your experiment table by it.</li>
    <li>Run it on a regressor and note that the metric and plot set changes automatically.</li>
  </ol>
  <em>the custom cost metric in step three is the one that changes conversations: sorting by expected loss in dollars rather than by AUC often reorders your leaderboard, and that reordering is the actual result.</em>
</div>

## Reproducibility: what a run records, and what it does not

A tracked run is not automatically a reproducible one. MLflow captures some of what you need and leaves the rest to you.

| Recorded automatically | Tag or field |
|---|---|
| Source file or notebook | `mlflow.source.name` |
| Git commit, if run inside a repository | `mlflow.source.git.commit` |
| Whether the tree was dirty | `mlflow.source.git.repoURL`, plus a dirty warning |
| User | `mlflow.user` |
| Run type | `mlflow.source.type`: `LOCAL`, `PROJECT`, `JOB`, `NOTEBOOK` |
| Model dependencies | `requirements.txt` inside the model directory |

| Not recorded unless you do it | How |
|---|---|
| The data you trained on | `mlflow.log_input` with a dataset, or a tag naming a version |
| Random seeds | Log them as parameters and set them |
| Uncommitted code | MLflow records the commit, **not a diff**: commit before real runs |
| System packages, CUDA | Use a container; the pip list is not the whole environment |
| Feature definitions | Log the feature-set version as a param or tag |

```python logging the dataset, so the run names its input
import mlflow.data
import pandas as pd

frame = pd.read_parquet("data/train_v3.parquet")
dataset = mlflow.data.from_pandas(frame, source="s3://bucket/data/train_v3.parquet", name="churn-train", targets="label")

with mlflow.start_run():
    mlflow.log_input(dataset, context="training")
    mlflow.log_params({"seed": 42, "feature_set": "v3"})
    ...
```

<div class="callout warn">
  <span class="ct">MLflow records your commit, not your uncommitted changes</span>
  Unlike some tools, MLflow does not store a diff of your working tree. A run tagged with commit <code>abc123</code> that was executed with unsaved edits is <em>not</em> reproducible from that commit, and nothing in the UI shouts about it. Commit before any run whose result you might defend later, and treat a dirty-tree run as a scratch experiment.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run a script inside a git repository and find <code>mlflow.source.git.commit</code> in the run's tags.</li>
    <li>Make an uncommitted edit, rerun, and confirm the commit tag is unchanged, because the edit is invisible.</li>
    <li>Add <code>mlflow.log_input</code> with a dataset and find it in the run's Datasets section.</li>
    <li>Log your seed as a parameter, then try to reproduce a run exactly from what MLflow recorded. Note what was missing.</li>
  </ol>
  <em>step two is the important discovery, and it is the single biggest difference between MLflow and tools that store a diff. Step four usually reveals two gaps: the data version and the environment beyond pip.</em>
</div>

## MLflow Projects: a run as one command

A Project is a directory with a declared entry point and environment, so a run becomes a command anyone can execute, including MLflow itself, straight from a git URL.

```yaml MLproject
name: churn

python_env: python_env.yaml

entry_points:
  main:
    parameters:
      max_depth: {type: int, default: 5}
      n_estimators: {type: int, default: 200}
      data_version: {type: string, default: "v3"}
    command: >
      python train.py --max-depth {max_depth}
                      --n-estimators {n_estimators}
                      --data-version {data_version}

  evaluate:
    parameters:
      run_id: {type: string}
    command: "python evaluate.py --run-id {run_id}"
```

```yaml python_env.yaml
python: "3.11"
build_dependencies:
  - pip==24.2
dependencies:
  - -r requirements.txt
```

```bash
# Run locally, with overrides
mlflow run . -P max_depth=8 -P n_estimators=400

# Run a specific entry point
mlflow run . -e evaluate -P run_id=a1b2c3d4

# Run straight from git, at a pinned commit
mlflow run https://github.com/org/repo.git --version 3f9a1c2 -P max_depth=8

# Skip environment creation when you know the current env is right
mlflow run . --env-manager local
```

| Field | Purpose |
|---|---|
| `name` | Shows up on the run |
| `python_env` / `conda_env` / `docker_env` | How the environment is built |
| `entry_points` | Named commands; `main` is the default |
| `parameters` | Typed, with defaults: overridable with `-P` |
| `command` | The shell command, with `{param}` substitution |

A run launched this way gets `mlflow.source.type = PROJECT` and records the entry point and its parameters, so the run itself tells you the command that produced it.

<div class="callout tip">
  <span class="ct">A Project is the cheapest reproducibility win available</span>
  Three small files turn "clone the repo, install something, hope, then run a script with the right flags" into one command with typed parameters and a pinned commit. Even if you never use <code>mlflow run</code> yourself, having the entry point declared is documentation that cannot go stale.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add an <code>MLproject</code> and <code>python_env.yaml</code> to your project and run it with <code>mlflow run. -P max_depth=8</code>.</li>
    <li>Watch it build an isolated environment, then check the run's source type in the UI.</li>
    <li>Push the repo and run it from the git URL at a pinned commit.</li>
    <li>Add a second entry point and invoke it with <code>-e</code>.</li>
  </ol>
  <em>step three is the one that feels like a different tool: a training run reproduced on a machine that never had your code, from a URL and a commit. That is the property a Project exists to give you.</em>
</div>

## Reading a failed run, in order

Debugging MLflow has an order, and following it beats guessing.

<ol class="guide-steps">
  <li><b>Check the run's status and whether it exists at all</b>A run stuck in <code>RUNNING</code> means the process died without closing it. No run at all means the tracking URI was wrong and you wrote to a local <code>mlruns/</code> somewhere.</li>
  <li><b>Confirm the tracking URI and experiment</b><code>mlflow.get_tracking_uri()</code> and <code>mlflow.get_experiment_by_name(...)</code>. Runs landing in the wrong place is the most common "MLflow is broken".</li>
  <li><b>Read the run's tags</b>Source file, git commit, and user. A surprising commit explains a lot.</li>
  <li><b>Read the params, not your code</b>Especially with autolog, the recorded parameters are what ran.</li>
  <li><b>Open the model's <code>MLmodel</code> and <code>requirements.txt</code></b>Serving and loading failures are nearly always environment mismatches, and this is where the truth is.</li>
  <li><b>Reload the model in a clean environment</b><code>mlflow models predict -m ... --env-manager virtualenv</code> reproduces the serving path without standing up a server.</li>
</ol>

Six failures cover most of what you will hit at this level:

| Symptom | Cause | Fix |
|---|---|---|
| No runs in the UI | Wrote to a local `mlruns/`, not the server | Set `MLFLOW_TRACKING_URI` or `set_tracking_uri` |
| `register_model` fails | File-based backend store | Use SQLite/Postgres for the backend |
| Artifacts missing but metrics present | Artifact root not reachable from the client | Check `--default-artifact-root` and credentials |
| Run stuck in `RUNNING` | No context manager, process died | Use `with mlflow.start_run()` |
| `Param already logged` error | `log_param` called twice with different values | Log params once, use metrics for varying values |
| Serving fails on load | Dependency version mismatch | Let `virtualenv` build from the logged requirements |

```python useful in a debugging session
import mlflow
from mlflow import MlflowClient

print(mlflow.get_tracking_uri())
client = MlflowClient()

run = client.get_run("a1b2c3d4e5f64718b9c0d1e2f3a4b5c6")
print(run.info.status, run.info.artifact_uri)
print(run.data.params)
print(run.data.metrics)
print({k: v for k, v in run.data.tags.items() if k.startswith("mlflow.")})
print([f.path for f in client.list_artifacts(run.info.run_id)])
client.set_terminated(run.info.run_id, status="FAILED")   # close a stuck run
```

<div class="guide-try">
  <span class="ct">Try it: cause each failure on purpose</span>
  <ol>
    <li>Unset your tracking URI, run a script, and find the local <code>mlruns/</code> it created instead.</li>
    <li>Point at a file-based store and call <code>register_model</code>. Read the error.</li>
    <li>Kill a script mid-run and find the stuck <code>RUNNING</code> run, then close it with <code>set_terminated</code>.</li>
    <li>For each one, diagnose it from the client API rather than from memory of what you broke.</li>
  </ol>
  <em>the first one is by far the most common real-world confusion: two people "using MLflow" while writing to two different local folders. Recognising it from a missing experiment saves hours.</em>
</div>

## Putting it all together

Everything above in one project. Nothing here is new. Read it as a whole and you should be able to justify every line.

```text project layout
.
├── MLproject                  # declared entry points and parameters
├── python_env.yaml            # the environment MLflow builds
├── requirements.txt           # pinned
├── data/
│   └── train_v3.parquet
├── src/
│   ├── train.py               # the tracked run
│   ├── evaluate.py            # mlflow.evaluate against a registered version
│   ├── promote.py             # moves the champion alias
│   └── batch_score.py         # loads models:/name@champion
└── README.md                  # the three commands to reproduce
```

```python src/train.py
import argparse
import mlflow
import mlflow.sklearn
import pandas as pd
from mlflow.models import infer_signature
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

ap = argparse.ArgumentParser()
ap.add_argument("--max-depth", type=int, default=5)
ap.add_argument("--n-estimators", type=int, default=200)
ap.add_argument("--data-version", default="v3")
ap.add_argument("--seed", type=int, default=42)
args = ap.parse_args()

mlflow.set_experiment("churn")                       # 1. named experiment
mlflow.sklearn.autolog(log_models=False, silent=True) # 2. autolog params/metrics only

frame = pd.read_parquet(f"data/train_{args.data_version}.parquet")
dataset = mlflow.data.from_pandas(                   # 3. the run names its data
    frame, source=f"data/train_{args.data_version}.parquet",
    name=f"churn-train-{args.data_version}", targets="label",
)

X = frame.drop(columns=["label"])
y = frame["label"]
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=args.seed, stratify=y,
)

run_name = f"rf d={args.max_depth} n={args.n_estimators} data={args.data_version}"
with mlflow.start_run(run_name=run_name) as run:      # 4. context manager, named
    mlflow.log_input(dataset, context="training")
    mlflow.log_params({"seed": args.seed, "data_version": args.data_version})
    mlflow.set_tags({"team": "risk", "purpose": "baseline"})   # 5. tags in code

    model = RandomForestClassifier(
        max_depth=args.max_depth, n_estimators=args.n_estimators,
        random_state=args.seed,
    ).fit(X_train, y_train)

    signature = infer_signature(X_train, model.predict(X_train))   # 6. a contract
    info = mlflow.sklearn.log_model(                               # 7. registered
        model, name="model", signature=signature,
        input_example=X_train.head(3),
        registered_model_name="churn-classifier",
    )

    eval_data = X_test.copy()
    eval_data["label"] = y_test
    result = mlflow.evaluate(                                      # 8. one evaluator
        model=info.model_uri, data=eval_data, targets="label",
        model_type="classifier",
    )
    print(run.info.run_id, result.metrics["roc_auc"])
```

```python src/promote.py
import mlflow
from mlflow import MlflowClient

NAME, MARGIN = "churn-classifier", 0.002
client = MlflowClient()

def auc_of(version):
    return client.get_run(version.run_id).data.metrics.get("roc_auc", 0.0)

versions = client.search_model_versions(f"name = '{NAME}'")
best = max(versions, key=auc_of)

try:
    current = client.get_model_version_by_alias(NAME, "champion")
except mlflow.exceptions.MlflowException:
    current = None

if current is None or auc_of(best) > auc_of(current) + MARGIN:
    client.set_registered_model_alias(NAME, "champion", best.version)  # 9. alias move
    client.set_model_version_tag(NAME, best.version, "promoted_auc", f"{auc_of(best):.4f}")
    print("promoted version", best.version)
else:
    print("no promotion: improvement below margin")
```

```bash
# One-time setup
pip install mlflow
mlflow server --backend-store-uri sqlite:///mlflow.db \
              --default-artifact-root ./mlartifacts --port 5000
export MLFLOW_TRACKING_URI=http://127.0.0.1:5000

# Everyday loop
mlflow run . -P max_depth=8 -P n_estimators=400     # 10. reproducible by command
python src/promote.py                                # threshold, then move the alias
python src/batch_score.py                            # consumes models:/…@champion
```

Ten decisions in there are the whole lesson of this page:

| Decision | Section |
|---|---|
| A named experiment, not `Default` | The four components |
| Autolog for framework params, explicit calls for yours | Autologging |
| The dataset logged with `log_input` | Reproducibility |
| `with mlflow.start_run()` and a descriptive `run_name` | Your first tracked run |
| Tags set in code, never by hand | Comparing runs |
| A signature inferred and logged | The MLflow Model format |
| Registered at log time with `registered_model_name` | The Model Registry |
| `mlflow.evaluate` so every run is comparable | Evaluating models |
| Promotion by moving an **alias**, with a margin | The Model Registry |
| An `MLproject` entry point, so a run is one command | MLflow Projects |

<div class="guide-try">
  <span class="ct">Try it: the one that matters</span>
  <ol>
    <li>Take this structure into a project you work on, adapting the training body to your own code.</li>
    <li>Get one run green with autolog, a custom metric, a signature, a registered model, and an evaluation.</li>
    <li>Run it twice with different parameters and pick a winner from the experiment table.</li>
    <li>Promote the winner by moving the <code>champion</code> alias, then serve <code>models:/name@champion</code> locally and call it with <code>curl</code>.</li>
    <li>Move the alias to the other version and call the endpoint again without changing a line of code.</li>
  </ol>
  <em>step five is the acceptance test: a deployment that changed by moving a pointer. If anything in your loop required editing a path or a version number, that is the spot to fix. It is exactly where production drift comes from.</em>
</div>

## What you can now do, and what comes next

You can track runs with parameters, metrics, tags, and artifacts; autolog whole frameworks in one line; log models in a portable format with a signature and an environment; compare dozens of runs in the UI and in Python; register versions and move aliases so deployment is a pointer change; evaluate models consistently with built-in and custom metrics; serve a model locally, in a batch job, or as a container; declare a Project so a run is one reproducible command; and debug a failed run in a fixed order. That is a working practitioner's toolkit, enough to own the experiment-tracking and model-delivery story on a real project.

| Can you… | |
|---|---|
| Name MLflow's four components? | Tracking, Models, Registry, Projects |
| Give the two stores and what each holds? | Backend for metadata, artifact store for files |
| Say why the registry needs a database? | The file store cannot back it |
| Explain param vs metric vs tag? | Immutable config, movable number, mutable label |
| Say what `log_model` writes? | A directory with `MLmodel`, flavours, signature, requirements |
| Explain a flavour, and what pyfunc buys? | A loader; pyfunc is the framework-agnostic one |
| Say why a signature matters? | Wrong-shaped input fails loudly instead of silently |
| Name the model URI schemes? | `runs:/`, `models:/name/1`, `models:/name@alias` |
| Say why aliases replaced stages? | Arbitrary, multiple, not a fixed vocabulary |
| Explain what MLflow does *not* record? | Uncommitted diffs, data unless you log it, system packages |
| Say what `mlflow.evaluate` gives you? | One consistent metric and plot set per task type |
| Name the first check when runs are missing? | The tracking URI. You probably wrote to local `mlruns/` |

**Mid-level takes every one of those topics further:** nested runs and sweep structure, `pyfunc` custom models and wrappers, model dependencies and environment management in depth, dataset tracking and lineage, the registry as a promotion workflow with webhooks and CI, `mlflow.evaluate` with custom metrics and validation thresholds, MLflow Tracing and LLM evaluation, deployment targets and the deployments API, autologging internals, the client API and bulk operations, and the CI patterns that make a training run a pull-request check.

**Senior then covers what you own when MLflow is your team's platform**: the self-hosted deployment and its stores, authentication and multi-tenancy, artifact-store access control and credential handling, backend database scaling and what breaks first, backup and upgrade procedure, cost and retention policy for artifacts, lineage and audit for regulated work, promotion gates and approval trails, incident playbooks, and where MLflow stops and a feature store, an orchestrator, or a dedicated serving platform begins.



