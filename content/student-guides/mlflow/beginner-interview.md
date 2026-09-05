Part one of three. A fast review of **everything in the Beginner Detailed track**, in about twenty-five minutes. Fast review first, common questions at the end. Mid-level reviews this plus its own material; Senior reviews all three.

## The thirty-second answer

> MLflow is an open-source platform for the machine-learning lifecycle, in four parts: **Tracking** records runs with parameters, metrics, tags, and artifacts; **Models** packages a trained object in a framework-agnostic format with a declared signature and environment; the **Model Registry** gives that model a name, numbered versions, and moveable aliases; and **Projects** declares an entry point so a run is reproducible by command. The key idea is the model format: a logged model is a directory with a manifest, not a pickle from someone's laptop, so a batch job, a REST server, or a container can load it without knowing the framework.

Then add the sentence that shows you have used it: *"the part people underestimate is aliases: consumers load `models:/name@champion`, so promoting a model is moving a pointer rather than editing and redeploying code."*

## The four components

<div class="flow">
  <div class="node">TRACKING<small>runs, params, metrics</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">MODELS<small>flavours + signature</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">REGISTRY<small>versions + aliases</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">SERVING<small>batch, REST, Docker</small></div>
</div>

| Component | Answers |
|---|---|
| **Tracking** | "What did we try, and what happened?" |
| **Models** | "How do I load this without knowing the framework?" |
| **Model Registry** | "Which version is in production, and where did it come from?" |
| **Projects** | "How do I rerun this exactly?" |

## The two stores

| Store | Holds | Flag |
|---|---|---|
| **Backend store** | Runs, params, metrics, tags, experiment and registry metadata | `--backend-store-uri` |
| **Artifact store** | Files: models, plots, reports, predictions | `--default-artifact-root` |

```bash
mlflow server --backend-store-uri postgresql://user:pass@host/mlflow \
              --default-artifact-root s3://bucket/mlflow --host 0.0.0.0 --port 5000
```

<div class="callout warn">
  <span class="ct">The Model Registry needs a database backend</span>
  With the default file store, tracking works and <code>register_model</code> fails. SQLite is fine for one person; Postgres or MySQL for a team. This is a frequent interview question because it is the first real infrastructure decision MLflow forces.
</div>

## Vocabulary

| Term | Say this |
|---|---|
| **Run** | One execution: params, metrics, tags, artifacts, status. The atomic unit |
| **Experiment** | A named container of runs; the unit you compare within |
| **Artifact** | Any file attached to a run: including the model directory |
| **Flavour** | A declared way to load the model: `sklearn`, `pytorch`, `pyfunc`, … |
| **pyfunc** | The generic flavour: `predict()` and nothing framework-specific |
| **Signature** | The declared input/output schema, validated at serving time |
| **Registered model** | A name with immutable numbered versions |
| **Alias** | A moveable pointer to a version: `champion`, `challenger` |
| **Project** | `MLproject` + environment file: a run as a typed command |

## The four things you log

| Kind | Mutable | Type | For |
|---|---|---|---|
| **Param** | **No**: relogging a different value errors | String | Configuration: hyperparameters, seed, feature-set version |
| **Metric** | Yes: a new step appends | Float | Anything measured: loss, AUC, latency, cost |
| **Tag** | Yes: overwrites | String | Organisation and search: team, purpose, dataset |
| **Artifact** | Append-only | File | Plots, reports, predictions, the model |

```python
mlflow.log_params({"max_depth": 5, "seed": 42})
mlflow.log_metric("val_auc", 0.94, step=epoch)
mlflow.set_tags({"team": "risk", "dataset": "v3"})
mlflow.log_artifact("outputs/roc.png")
mlflow.log_figure(fig, "plots/roc.png")
mlflow.log_table(preds_df, "predictions.json")
```

Two rules resolve nearly every question: **a number you might plot is a metric**; **something you might change your mind about after the run is a tag.**

## The everyday code

```python
import mlflow, mlflow.sklearn
from mlflow.models import infer_signature

mlflow.set_tracking_uri("http://127.0.0.1:5000")
mlflow.set_experiment("churn")
mlflow.sklearn.autolog(log_models=False, silent=True)

with mlflow.start_run(run_name="rf d=5 feats=v3") as run:
    model.fit(X_train, y_train)                                # params/metrics autologged
    mlflow.log_metric("expected_cost", cost)                   # yours
    signature = infer_signature(X_train, model.predict(X_train))
    info = mlflow.sklearn.log_model(
        model, name="model", signature=signature,
        input_example=X_train.head(3),
        registered_model_name="churn-classifier",
    )
    mlflow.evaluate(model=info.model_uri, data=eval_df,
                    targets="label", model_type="classifier")
```

<div class="callout tip">
  <span class="ct">Always use the context manager</span>
  <code>with mlflow.start_run():</code> sets <code>FINISHED</code> on success and <code>FAILED</code> on an exception. Without it, an interrupted script leaves a run stuck in <code>RUNNING</code> forever, and in a notebook it silently captures your next cell.
</div>

## Autologging

```python
mlflow.autolog()              # everything detectable
mlflow.sklearn.autolog(max_tuning_runs=10, log_models=True, log_datasets=True, silent=True)
```

| Autologged | Not autologged |
|---|---|
| Estimator parameters | Your own business metrics |
| Training metrics, per epoch for DL frameworks | Artifacts you generated yourself |
| The model, with an inferred signature | Which of your variables were meaningful |
| Framework artifacts (feature importances, plots) | The data you trained on |
| **Child runs** per candidate in a hyperparameter search | Seeds you never set |

**Call autolog before the estimator is created.** It patches the framework, so ordering matters, and a late call fails silently rather than loudly.

## The MLflow Model format

```text model/
├── MLmodel            # manifest: flavours, signature, python_version
├── model.pkl
├── conda.yaml
├── python_env.yaml
└── requirements.txt
```

```yaml MLmodel
flavors:
  python_function: {loader_module: mlflow.sklearn, model_path: model.pkl}
  sklearn: {pickled_model: model.pkl, sklearn_version: 1.5.1}
signature:
  inputs: '[{"name": "mean radius", "type": "double"}]'
  outputs: '[{"type": "long"}]'
run_id: a1b2c3d4e5f64718
```

```python
sk = mlflow.sklearn.load_model("runs:/a1b2c3d4/model")     # the real object
pf = mlflow.pyfunc.load_model("models:/churn@champion")     # just predict()
```

| URI | Points at |
|---|---|
| `runs:/<run_id>/model` | A model logged by a run |
| `models:/<name>/<version>` | A specific registry version |
| `models:/<name>@champion` | Whatever version holds that alias |
| `s3://bucket/path/model` | A model directory in storage |

<div class="callout warn">
  <span class="ct">No signature means serving accepts anything</span>
  Without a signature an endpoint takes columns in the wrong order or type and returns predictions that are wrong. <code>infer_signature</code> is one line and turns a silent production bug into a 400 at the boundary.
</div>

## The Model Registry

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>1</span><strong>Logged</strong><small>A run produces a model with a signature and an environment.</small></div>
  <div class="guide-timeline-item"><span>2</span><strong>Registered</strong><small>It becomes version N, permanently linked to its run.</small></div>
  <div class="guide-timeline-item"><span>3</span><strong>Evaluated</strong><small>A job scores it and records the number, usually as a version tag.</small></div>
  <div class="guide-timeline-item"><span>4</span><strong>Aliased</strong><small><code>champion</code> moves to that version; every consumer follows the alias.</small></div>
  <div class="guide-timeline-item"><span>5</span><strong>Superseded</strong><small>A newer version takes the alias; the old one stays queryable by number.</small></div>
</div>

```python
from mlflow import MlflowClient
client = MlflowClient()
client.set_registered_model_alias("churn-classifier", "champion", version=7)
model = mlflow.pyfunc.load_model("models:/churn-classifier@champion")
```

**Stages are deprecated.** `None`/`Staging`/`Production`/`Archived` with `transition_model_version_stage` appears in older code and tutorials; aliases replaced them because they are arbitrary, multiple, and not a fixed vocabulary. Recognise stages, write aliases.

## Serving

```bash
mlflow models serve -m "models:/churn-classifier@champion" --port 5001 --env-manager virtualenv
mlflow models build-docker -m "models:/churn-classifier@champion" -n churn-scorer
mlflow models predict -m "runs:/abc/model" -i input.json          # no server needed
```

```json request body
{"dataframe_split": {"columns": ["mean radius"], "data": [[17.99]]}}
```

| `--env-manager` | Behaviour |
|---|---|
| `virtualenv` | Builds from the logged `python_env.yaml`. The default, and the correct one |
| `conda` | Builds from `conda.yaml` |
| `local` | Uses the current environment: fast, and only safe when versions match |

<div class="callout warn">
  <span class="ct">A served endpoint has no authentication</span>
  <code>mlflow models serve</code> answers anyone who can reach it. Bind to localhost for local work and put anything real behind an ingress or gateway that terminates TLS and enforces auth.
</div>

## Evaluation and comparison

```python
mlflow.evaluate(model=info.model_uri, data=eval_df, targets="label", model_type="classifier")
```

| `model_type` | Produces |
|---|---|
| `classifier` | Accuracy, precision, recall, F1, ROC AUC, log loss + ROC/PR/confusion plots |
| `regressor` | MAE, MSE, RMSE, R² + residual and error plots |

```python
runs = mlflow.search_runs(
    experiment_names=["churn"],
    filter_string="metrics.roc_auc > 0.9 and tags.dataset = 'v3'",
    order_by=["metrics.roc_auc DESC"],
)
```

```text filter syntax
metrics.auc > 0.9
params.max_depth = '5'
tags.dataset = 'v3' and metrics.auc > 0.88
attributes.status = 'FINISHED'
```

`search_runs` returns a DataFrame with flattened `params.*`, `metrics.*`, and `tags.*` columns, which is what makes "find the best run and act on it" three lines.

## Reproducibility: what is and is not recorded

| Recorded automatically | Tag |
|---|---|
| Source file or notebook | `mlflow.source.name` |
| Git commit | `mlflow.source.git.commit` |
| User | `mlflow.user` |
| Run type | `mlflow.source.type` |
| Model dependencies | `requirements.txt` inside the model |

| Not recorded unless you do it | How |
|---|---|
| The training data | `mlflow.log_input(dataset, context="training")` |
| Seeds | Log as a param, and set them |
| **Uncommitted changes** | Nothing stores a diff: commit before real runs |
| System packages, CUDA | Use a container; pip is not the whole environment |

<div class="callout warn">
  <span class="ct">MLflow records the commit, not a diff</span>
  A run tagged with commit <code>abc123</code> executed from a dirty tree is <b>not</b> reproducible from that commit, and nothing shouts about it. This is the sharpest difference between MLflow and tools that capture the working tree, and it is a good answer to "what are MLflow's limits?"
</div>

## Projects

```yaml MLproject
name: churn
python_env: python_env.yaml
entry_points:
  main:
    parameters:
      max_depth: {type: int, default: 5}
    command: "python train.py --max-depth {max_depth}"
```

```bash
mlflow run . -P max_depth=8
mlflow run https://github.com/org/repo.git --version 3f9a1c2 -P max_depth=8
mlflow run . --env-manager local
```

A Project run gets `mlflow.source.type = PROJECT` and records its entry point and parameters, so the run states the command that produced it.

## The traps, and why they happen

Three ideas explain nearly every beginner failure: **the tracking URI decides where runs go**, **params are immutable while tags are not**, and **a model's portability comes from its logged environment**.

| Symptom | Cause | Fix |
|---|---|---|
| No runs in the UI | Wrote to a local `mlruns/` | Set `MLFLOW_TRACKING_URI` or `set_tracking_uri` |
| `register_model` fails | File-based backend store | SQLite or Postgres |
| Metrics present, artifacts missing | Artifact root unreachable from the client | Check the root and its credentials |
| Run stuck in `RUNNING` | No context manager; the process died | `with mlflow.start_run()` |
| `Param already logged` | `log_param` twice with different values | Log once; use metrics for varying values |
| Nothing autologged | `autolog()` called after the estimator | Call it at the top of the entry point |
| Serving fails to load | Dependency version mismatch | Let `virtualenv` build from logged requirements |
| Predictions silently wrong | No signature; columns misordered | `infer_signature` |
| Cannot tell two runs apart | No `run_name`, no tags | Name and tag in code |
| Old tutorial code fails | Uses deprecated stages | Aliases |

## Common interview questions

<ol class="guide-steps">
  <li><b>What is MLflow and what problem does it solve?</b>An open-source platform for the ML lifecycle with four components: Tracking for runs, Models for framework-agnostic packaging, a Model Registry for named versions and aliases, and Projects for reproducible entry points. The problem it solves is that a trained model is normally a file on somebody's laptop with no record of what produced it and no declared way to load it. MLflow turns it into an addressable artifact with parameters, metrics, a signature, and an environment.</li>
  <li><b>What are the two stores, and why does the distinction matter?</b>The backend store holds run metadata (params, metrics, tags, experiment and registry records) and the artifact store holds files, including model directories. They are configured separately, which is why you can have runs appearing in the UI with unreachable artifacts: the client could write metadata but not the files, or cannot read the artifact root.</li>
  <li><b>Why does the Model Registry require a database backend?</b>The default file-based store implements tracking only; the registry needs relational storage for models, versions, aliases, and their transitions. Practically it means <code>--backend-store-uri</code> pointing at SQLite for a single user or Postgres/MySQL for a team, and it is the first infrastructure decision MLflow forces on you.</li>
  <li><b>Explain the difference between a parameter, a metric, and a tag.</b>A parameter is immutable configuration stored as a string, and logging it twice with a different value raises. A metric is a float with a step, so it is a series you can plot. A tag is a mutable string for organisation and search. The rule of thumb: a number you might plot is a metric, something you might reclassify later is a tag.</li>
  <li><b>What does <code>log_model</code> write?</b>Not a pickle, but a directory containing an <code>MLmodel</code> manifest that declares the flavours it can be loaded as, the signature, and the Python version, plus the serialised model and three environment files. That manifest is what lets a REST server, a Spark UDF, or a Docker build load the model without knowing scikit-learn or PyTorch.</li>
  <li><b>What is a flavour, and what does pyfunc give you?</b>A flavour is a declared loader. A model usually has a native flavour, which returns the real framework object with all its methods, and the <code>python_function</code> flavour, which returns a generic object with just <code>predict</code>. pyfunc is the one deployment targets use, because it means the serving layer needs no framework-specific code.</li>
  <li><b>Why log a signature?</b>It declares the input columns and types and the output type, so a wrong-shaped or wrong-typed request fails at the boundary instead of producing confidently wrong predictions. Without it, a DataFrame with the columns in a different order will still get scored. <code>infer_signature</code> is one line, and <code>input_example</code> lets MLflow infer it for you.</li>
  <li><b>Walk me through the model URI schemes.</b><code>runs:/&lt;run_id&gt;/model</code> for a model logged by a specific run, <code>models:/&lt;name&gt;/&lt;version&gt;</code> for a pinned registry version, <code>models:/&lt;name&gt;@alias</code> for whatever version currently holds that alias, and plain storage URIs for a directory. Production consumers should use the alias form, so promotion does not touch code.</li>
  <li><b>Why did aliases replace stages?</b>Stages were a fixed vocabulary (<code>None</code>, <code>Staging</code>, <code>Production</code>, <code>Archived</code>) and a version could hold exactly one. Aliases are arbitrary names, several can exist at once, and they map onto real patterns like champion/challenger or per-region pointers. You will still see <code>transition_model_version_stage</code> in older code; recognise it and write aliases in new work.</li>
  <li><b>How does promotion become a deployment?</b>Consumers load <code>models:/name@champion</code>, so moving the alias to a new version changes what they load with no code change and no redeploy. That makes the promotion decision itself the interesting part: it should be a script with a threshold and a log, not a person clicking, so there is a record of what was compared.</li>
  <li><b>What does autologging cover, and what does it miss?</b>It patches the framework to log constructor parameters, training metrics, the fitted model with an inferred signature, framework artifacts, and child runs for hyperparameter searches. It cannot know your business metrics, your own artifacts, or which of your variables mattered, so the realistic pattern is autolog plus a handful of deliberate calls. It must be enabled before the estimator is created, or it silently does nothing.</li>
  <li><b>What is <code>mlflow.evaluate</code> for?</b>It computes a consistent metric and plot set for a task type (classifier, regressor, or text) against a dataset, and logs them to the run. The value is comparability: hand-rolled metrics drift between runs, so a leaderboard built on them is untrustworthy. You can add custom metrics with <code>make_metric</code>, which is how a business number like expected cost gets into the same sortable table.</li>
  <li><b>How would you find the best run programmatically?</b><code>mlflow.search_runs</code> with a filter string and <code>order_by</code>, which returns a pandas DataFrame with flattened <code>params.*</code>, <code>metrics.*</code>, and <code>tags.*</code> columns. The filter syntax is the same as the UI search box, so a query you built by clicking is directly reusable in a promotion gate.</li>
  <li><b>What does MLflow <em>not</em> record?</b>It does not store a diff of your working tree, only the commit, so a run from a dirty tree is not reproducible from that commit and nothing warns you. It does not know your data unless you call <code>log_input</code> or log a version. It does not capture system packages or CUDA, only pip. It does not set seeds for you.</li>
  <li><b>How do you serve a model, and what are the options?</b><code>mlflow models serve</code> for a local REST endpoint, <code>build-docker</code> for a container to hand to a platform team, or <code>pyfunc.load_model</code> inside a batch job, which is the most common in practice. The <code>--env-manager</code> flag decides whether the environment is rebuilt from the logged requirements or reused from your current one; the default rebuild is what makes the model portable.</li>
  <li><b>Serving fails with an import or version error. What is happening?</b>The environment loading the model differs from the one that trained it. That is what the logged <code>requirements.txt</code> and <code>python_env.yaml</code> exist for, so the fix is to let the default <code>virtualenv</code> manager build from them rather than using <code>--env-manager local</code>. It is also the argument for pinning versions at training time rather than after a failure.</li>
  <li><b>What is an MLflow Project?</b>A directory with an <code>MLproject</code> file declaring named entry points, typed parameters with defaults, and an environment. <code>mlflow run</code> can then execute it locally or straight from a git URL at a pinned commit, building the environment first. The run records the entry point and parameters, so it states the command that produced it.</li>
  <li><b>My runs are not showing up in the UI. Where do you look first?</b>The tracking URI. With none set, MLflow writes to a local <code>./mlruns</code> directory, so two people "using MLflow" can be writing to two different folders. Check <code>mlflow.get_tracking_uri()</code> and the experiment name before anything else. This is the most common false alarm.</li>
  <li><b>How do you organise hundreds of runs?</b>One experiment per problem, a descriptive <code>run_name</code> set in code, and tags for everything cross-cutting: team, dataset version, purpose, ticket. Then the searchable columns and the filter syntax do the work. The run you forget to name is always the one you need to find later, which is why it belongs in the script rather than in the UI.</li>
  <li><b>How is MLflow different from a tool like ClearML or W&amp;B?</b>MLflow is deliberately narrow and unopinionated: it tracks, packages, registers, and serves, and it does not schedule or execute anything. There is no agent and no queue, so remote execution is your orchestrator's job. That is a strength when you already run Airflow or Kubernetes and want a standard model format, and a gap when you wanted tracking and execution in one system.</li>
</ol>

## Sixty-second self-test

- Give the thirty-second answer, then the sentence that shows you have used it.
- Name the four components and what each one answers.
- Name the two stores and say which one a metric goes to versus a plot.
- Say why the Model Registry needs a database backend.
- Distinguish param, metric, and tag, including which is immutable.
- Say what `log_model` writes and name three files in it.
- Explain a flavour, and what pyfunc buys a deployment target.
- Say what a signature prevents, and how you produce one.
- List the four model URI schemes.
- Explain why aliases replaced stages, and how promotion reaches a consumer.
- Say what autologging misses, and the ordering rule it depends on.
- Name the three things MLflow does not record, starting with the diff.
- State the first thing to check when runs are missing from the UI.
