Part two of three. A cumulative review of **Beginner and Mid-level material**, organised by topic rather than by level, in about thirty-five minutes. Fast review first, common questions at the end. Senior reviews all three.

## Foundations, in one screen

<div class="flow">
  <div class="node">TRACKING<small>runs, params, metrics</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">MODELS<small>flavours + signature</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">REGISTRY<small>versions + aliases</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">SERVING<small>batch, REST, Docker</small></div>
</div>

> MLflow has four components: Tracking for runs, Models for framework-agnostic packaging, a Registry for named versions and moveable aliases, and Projects for reproducible entry points. The core idea is the model format (a directory with an `MLmodel` manifest declaring flavours, a signature, and an environment) which is why the same artifact loads in a batch job, a REST server, or a container.

**Two stores:** a backend store for metadata (`--backend-store-uri`) and an artifact store for files (`--default-artifact-root`). **The registry needs a database backend.** **Params are immutable, metrics have steps, tags are mutable.** **Consume by alias**, so promotion is a pointer move. **MLflow records the commit, not a diff.**

| Kind | Mutable | For |
|---|---|---|
| Param | No | Configuration: hyperparameters, seed, data partition |
| Metric | Yes, appends a step | Anything measured |
| Tag | Yes, overwrites | Organisation and search |
| Artifact | Append-only | Files, including the model |

## Runs, nesting, and the client API

```python
with mlflow.start_run(run_name="sweep") as parent:
    for depth in (3, 5, 8):
        with mlflow.start_run(run_name=f"depth={depth}", nested=True):
            ...
```

Nesting is stored as the `mlflow.parentRunId` tag, so children are queryable:
`filter_string=f"tags.mlflow.parentRunId = '{parent_id}'"`.

| Need | Use |
|---|---|
| A normal script | Fluent API: writes to the active run |
| Threads, async, another run, bulk, registry | Client API: explicit run id, no global state |
| Thousands of metric points | `client.log_batch(...)` |
| Resuming a run to add metrics | `start_run(run_id=...)` |

<div class="callout warn">
  <span class="ct">Per-step HTTP logging is the usual cause of a "slow MLflow"</span>
  One <code>log_metric</code> per batch on a long run means tens of thousands of round trips. Accumulate and use <code>log_batch</code>, or log per epoch. This is a common interview probe because it separates people who have run MLflow at scale from people who have read about it.
</div>

## Autologging internals

Integrations install patches around framework functions: `sklearn` on `fit` and search classes, Lightning on trainer hooks, `xgboost`/`lightgbm` on `train`, `transformers` on `Trainer`, `langchain`/`openai` on chain and client calls (which produces traces).

| Option | Effect |
|---|---|
| `log_models=False` | You log the model yourself, with your signature and registration |
| `log_input_examples=False` | Do not embed a data sample inside the model artifact |
| `max_tuning_runs=N` | Cap child runs from a hyperparameter search |
| `exclusive=True` | Skip autologging when a run is already active |
| `silent=True` | Suppress warning noise |

Three behaviours to state without prompting: **autolog creates a run if none is active**; **it must be enabled before the estimator is created** or it silently does nothing; and **`log_input_examples=True` embeds training data** in an artifact you might publish.

<div class="callout warn">
  <span class="ct">Autolog plus your own `log_model` gives two models per run</span>
  Autolog's model has no signature of yours and no <code>registered_model_name</code>. Two <code>model/</code> directories in one run with nothing stating which is authoritative is a real source of confusion, so set <code>log_models=False</code> and log it explicitly.
</div>

## Custom `pyfunc` models

The most useful advanced feature: wrap preprocessing, several models, and business rules behind one `predict`, shipped as one artifact.

```python
class ChurnModel(mlflow.pyfunc.PythonModel):
    def load_context(self, context):
        self.scaler = joblib.load(context.artifacts["scaler"])
        self.clf = joblib.load(context.artifacts["classifier"])

    def predict(self, context, model_input, params=None):
        t = (params or {}).get("threshold", 0.5)
        proba = self.clf.predict_proba(self.scaler.transform(model_input))[:, 1]
        return pd.DataFrame({"proba": proba, "label": (proba >= t).astype(int)})

mlflow.pyfunc.log_model(
    name="model", python_model=ChurnModel(),
    artifacts={"scaler": "outputs/scaler.pkl", "classifier": "outputs/clf.pkl"},
    code_paths=["src/features.py"],          # your modules travel with it
    signature=signature,                      # including a ParamSchema
    pip_requirements="requirements-serving.txt",
    registered_model_name="churn-classifier",
)
```

| Piece | Role |
|---|---|
| `load_context` | One-time setup from the declared `artifacts` |
| `predict(context, input, params)` | The whole inference contract, including postprocessing |
| `artifacts` | Files copied in and re-pathed at load time |
| `code_paths` | Your modules, so the model imports nothing from your repo |
| Signature `params` | Validated call-time knobs: threshold, top-k, temperature |

<div class="callout warn">
  <span class="ct">Missing `code_paths` is the top cause of "loads locally, fails in serving"</span>
  A <code>PythonModel</code> is pickled by class reference, so loading needs the module importable. It works on your machine because your repo is on the path, and fails in a container with <code>ModuleNotFoundError</code>.
</div>

## Dependencies and environments

Requirements are inferred at log time by introspecting loaded modules and pinning the resolved distributions.

| Control | Use |
|---|---|
| `extra_pip_requirements=[...]` | Add a pin inference could not see |
| `pip_requirements=[...]` or a file | Replace inference: do this for custom pyfunc models |
| `mlflow.pyfunc.get_model_dependencies(uri)` | Print what would be installed |
| `mlflow models predict --env-manager virtualenv` | Reproduce the serving path exactly |
| `validate_serving_input(uri, payload)` | Check the signature contract without a server |

**Inference sees imports, not intent.** A dynamic `importlib` call, or an import inside a branch that never ran, is invisible, and the model then fails to load elsewhere.

## Evaluation with thresholds

```python
mlflow.evaluate(
    model=candidate_uri, data=eval_df, targets="label", model_type="classifier",
    baseline_model=champion_uri,
    extra_metrics=[make_metric(eval_fn=_cost, greater_is_better=False, name="expected_cost")],
    validation_thresholds={
        "roc_auc": MetricThreshold(threshold=0.85, min_relative_change=0.005, greater_is_better=True),
        "expected_cost": MetricThreshold(threshold=20000, greater_is_better=False),
    },
)   # raises ModelValidationFailedException on failure
```

| Capability | Why |
|---|---|
| `validation_thresholds` | Turns evaluation into a pass/fail gate CI can act on |
| `baseline_model` | "Better than production", not "above an arbitrary number" |
| `min_relative_change` | Rejects promotions inside the noise band |
| `extra_metrics` | Cost and fairness become gate conditions |
| Static datasets | Evaluate any prediction column, even from a non-MLflow model |

## The registry as a workflow

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>1</span><strong>Register</strong><small>Training logs and registers a version, tagged <code>validated=false</code>.</small></div>
  <div class="guide-timeline-item"><span>2</span><strong>Validate</strong><small>Thresholds on a holdout set; tag <code>validated=true</code> and record the number.</small></div>
  <div class="guide-timeline-item"><span>3</span><strong>Compare</strong><small>Against the current champion with a minimum relative change.</small></div>
  <div class="guide-timeline-item"><span>4</span><strong>Promote</strong><small><code>previous</code> keeps the old version, <code>champion</code> moves.</small></div>
  <div class="guide-timeline-item"><span>5</span><strong>Roll back</strong><small>Move <code>champion</code> to <code>previous</code>. One call, no redeploy.</small></div>
</div>

| Alias | Convention |
|---|---|
| `champion` | What production serves |
| `challenger` | Under evaluation or shadow-scored |
| `previous` | The rollback target: set it at promotion time |
| `baseline` | A fixed reference for relative comparisons |

Stages (`Staging`/`Production`, `transition_model_version_stage`) are deprecated, so recognise them in old code and write aliases.

## Dataset lineage

```python
dataset = mlflow.data.from_pandas(frame, source=SOURCE, name="churn-train", targets="label")
mlflow.log_input(dataset, context="training")
```

Records a name, a source URI, a content **digest**, a schema, and a profile. Constructors exist for pandas, numpy, Spark/Delta, and HuggingFace.

<div class="callout warn">
  <span class="ct">Dataset tracking is lineage annotation, not data versioning</span>
  The digest describes the frame you profiled; it does not stop someone overwriting the object at that URI. Immutability comes from the storage side: versioned buckets, dated immutable prefixes, or a table format with time travel. Saying this out loud is a strong senior signal.
</div>

## Deployment targets

| Target | How |
|---|---|
| Local REST | `mlflow models serve --workers N --enable-mlserver` |
| Container | `mlflow models build-docker -n name --enable-mlserver` |
| Spark batch | `mlflow.pyfunc.spark_udf(spark, uri)` |
| SageMaker / Azure ML / Databricks | `mlflow deployments` or vendor plugins |
| No server at all | `mlflow models predict -m ... -i input.json` |

`/invocations` accepts `dataframe_split`, `dataframe_records`, `instances`, or `inputs`, plus `params`.

<div class="callout warn">
  <span class="ct">A signature change is a breaking API change that skips code review</span>
  Because promotion moves an alias with no deploy step, renaming a column or tightening a type can reach production without anyone reviewing an API diff. Treat the signature as a public interface: additive only, or a new registered model name.
</div>

## Tracing and LLM evaluation

```python
mlflow.langchain.autolog()

@mlflow.trace(span_type="RETRIEVER")
def retrieve(q, k=4): ...

with mlflow.start_span(name="rerank", span_type="RERANKER") as span:
    span.set_inputs({"candidates": len(docs)})
    span.set_attribute("model", "bge-reranker-v2")
```

| Concept | Meaning |
|---|---|
| Trace | One end-to-end request |
| Span | One step, with type, inputs, outputs, timing, attributes |
| `span_type` | `LLM`, `RETRIEVER`, `RERANKER`, `TOOL`, `CHAIN`, `PARSER` |
| GenAI metrics | `answer_correctness`, `faithfulness`, `answer_relevance`: LLM-as-a-judge |

Two things to say without prompting: **traces store prompts and responses verbatim**, so they are data with retention and redaction obligations; and **judged metrics cost money and vary**, so pin the judge model and name it alongside the score.

## CI

```python
with mlflow.start_run(run_name=f"pr {pr} @ {sha}", tags={"ci": "true", "pr": pr}):
    info = train_and_log()
    mlflow.evaluate(model=info.model_uri, data=holdout, targets="label",
                    model_type="classifier", baseline_model=champion_uri,
                    validation_thresholds={...})     # raises → job fails
```

Separate `*/ci` experiment, tags per pull request, credentials from secrets, a job timeout, and the run URL printed into the log.

<div class="callout warn">
  <span class="ct">A credential that can move aliases is a production credential</span>
  On a public repository, a fork pull request holding it means a stranger can promote a model. Pull requests get a credential that can create runs but not move aliases; promotion lives on a protected-branch workflow.
</div>

## Debugging

| Symptom | Cause | Fix |
|---|---|---|
| No runs in the UI | Wrote to local `./mlruns` | Set `MLFLOW_TRACKING_URI` |
| 401 / 403 from the client | Auth enabled, no credentials | `MLFLOW_TRACKING_USERNAME`/`PASSWORD` |
| Metrics fine, artifacts 404 | Client lacks object-store credentials | The artifact store is accessed **by the client** |
| Old runs' artifacts unreachable | Artifact root changed after they were created | The URI is stored per run |
| `INVALID_PARAMETER_VALUE` on a new field | Client newer than server | Align versions |
| Registry fails, tracking works | File-based backend | Database backend |
| Works with `--env-manager local` | You tested your env, not the logged one | Validate with `virtualenv` |

<div class="callout warn">
  <span class="ct">MLflow's most surprising architectural detail</span>
  By default the tracking server hands out an artifact URI and <b>the client reads and writes object storage itself</b>. Every user and every CI job therefore needs storage credentials. That is why "metrics appear but artifacts 404" is so common, and proxied artifact access is the fix.
</div>

## Common interview questions

<ol class="guide-steps">
  <li><b>When do you use the client API instead of the fluent API?</b>When there is no single active run to write to: multi-threaded or async code, a job writing into a run it is not executing inside, bulk logging via <code>log_batch</code>, and anything in the registry. The fluent API is global state keyed on the active run, which is what breaks in those cases.</li>
  <li><b>Someone says MLflow is slow. Where do you look first?</b>The metric logging rate. A <code>log_metric</code> per training batch is one HTTP round trip per point, so a long run can make tens of thousands of calls and slow both the trainer and the server. The fix is to log per epoch or accumulate and use <code>log_batch</code>. After that, check backend database load and whether clients are hammering search endpoints.</li>
  <li><b>What exactly does autologging patch, and how do you control it?</b>It wraps framework functions: <code>fit</code> and search classes for scikit-learn, trainer hooks for Lightning, <code>train</code> for the boosting libraries, chain calls for LangChain. Control comes from its keyword arguments: <code>log_models=False</code> so you log the model with your own signature and registration, <code>log_input_examples=False</code> so training data is not embedded in the artifact, <code>max_tuning_runs</code> to cap child runs, and <code>exclusive=True</code> so it stays out of a hand-instrumented run.</li>
  <li><b>Why would you write a custom pyfunc model?</b>Because a model is rarely just an estimator. A fitted scaler, a vocabulary, a decision threshold, and postprocessing all have to travel with it, or every consumer reimplements them. A <code>PythonModel</code> with <code>load_context</code> and <code>predict</code> packages all of it as one artifact with one environment, and it loads through the same <code>pyfunc</code> interface as anything else, so serving needs no special casing.</li>
  <li><b>Why does a custom pyfunc need <code>code_paths</code>?</b>Because the model is pickled by reference to its class, so loading requires that module to be importable. On your machine the repo is on the path and it works; in a serving container it fails with <code>ModuleNotFoundError</code>. <code>code_paths</code> copies the modules into the artifact so the model is self-contained.</li>
  <li><b>What are signature params, and why are they useful?</b>A declared schema of call-time parameters (a threshold, a top-k, a temperature) with types and defaults. They are validated and documented like inputs, exposed by the scoring server, and they let a caller vary behaviour without a second endpoint or a redeploy. It is one of the more underused features.</li>
  <li><b>How does MLflow decide a model's dependencies, and how does that fail?</b>At log time it introspects loaded modules and pins the resolved distributions. It fails when an import is dynamic or inside a branch that never executed, so the dependency is invisible and the model will not load elsewhere. For anything custom, declare <code>pip_requirements</code> explicitly, and validate with <code>mlflow models predict --env-manager virtualenv</code> before shipping.</li>
  <li><b>How do you make an evaluation into a gate?</b><code>mlflow.evaluate</code> with <code>validation_thresholds</code> raises <code>ModelValidationFailedException</code> when a metric fails, so a CI job exits non-zero with the failing metric named. Pass the current champion as <code>baseline_model</code> and use <code>min_relative_change</code>, so the gate means "better than production by a real margin" rather than "above a number we cleared last year".</li>
  <li><b>Why do relative thresholds matter more than absolute ones?</b>An absolute floor passes forever once you clear it, so it stops discriminating. A relative threshold against the current champion rejects improvements inside the noise band, which changes the conversation from "the number went up" to "is this difference real". It is also the only version of the gate that keeps working as the model improves.</li>
  <li><b>Design a promotion workflow on the registry.</b>Training registers a version tagged <code>validated=false</code>. A validation job evaluates it on a holdout set against the champion with thresholds, then tags <code>validated=true</code> and records the metric. A promotion job selects among validated versions, sets <code>previous</code> to the outgoing champion, moves <code>champion</code>, and tags who approved it. Consumers load <code>models:/name@champion</code>, so rollback is moving <code>champion</code> back to <code>previous</code>: one call, no redeploy.</li>
  <li><b>How do you roll back a model?</b>Move the <code>champion</code> alias to the <code>previous</code> alias's version. That works only if you set <code>previous</code> at promotion time; without it, rollback means hunting for the last good version number during an incident. It is a one-line habit that turns rollback into a rehearsable action.</li>
  <li><b>What does dataset logging give you, and what does it not?</b>It records a name, a source URI, a content digest, a schema, and a profile, so a run states what it read and two runs can be compared by digest. It does not give immutability: nothing stops someone overwriting the object at that URI, and MLflow will not notice. Real versioning comes from the storage side: versioned buckets, dated immutable prefixes, or a table format with time travel.</li>
  <li><b>What are the deployment options, and which do you reach for?</b>In practice, a batch job with <code>pyfunc.load_model</code> covers most cases and needs no infrastructure. Beyond that: <code>mlflow models serve</code> for a local endpoint, <code>build-docker --enable-mlserver</code> for a container to hand to a platform team, <code>spark_udf</code> for large-scale batch, and the deployments API for managed targets. The point of the pyfunc contract is that all of them load the same artifact.</li>
  <li><b>Why is changing a model's signature risky?</b>Because promotion moves an alias with no code change, so a renamed column or a tightened type can reach production without anyone reviewing an API diff, and every caller coding against <code>/invocations</code> breaks. Treat the signature as a public interface: additive changes only, or publish a new registered model name and migrate consumers deliberately.</li>
  <li><b>What is MLflow Tracing for?</b>Recording the internal structure of a call (retrieval, reranking, tool use, model calls) as a tree of spans with inputs, outputs, timing, and attributes. It is how you debug a RAG or agent application, where the failure is usually in retrieval rather than in the model. Autolog integrations trace popular frameworks; <code>@mlflow.trace</code> and <code>start_span</code> cover your own code.</li>
  <li><b>What are the risks with tracing and LLM-as-a-judge evaluation?</b>Traces store prompts and responses verbatim, so on production traffic they hold user data. That is a redaction and retention decision to make before enabling, not after. Judged metrics are API calls, so a large evaluation has a real bill and real latency, and judges are non-deterministic, so pin the judge model and report it alongside the score, or two evaluations are not comparable.</li>
  <li><b>Sketch a CI gate for model quality.</b>On pull request, install pinned requirements, train with a short budget into a dedicated <code>*/ci</code> experiment tagged with the PR and commit, evaluate against the champion with thresholds so a regression raises, print the run URL into the log, and set a job timeout. Credentials come from secrets, and the pull-request credential can create runs but not move aliases.</li>
  <li><b>Metrics appear in the UI but artifacts 404. What is happening?</b>The client could reach the tracking server but not the artifact store. By default MLflow hands out an artifact URI and the client reads and writes object storage directly, so every user and CI job needs storage credentials. Either give them credentials or enable proxied artifact access so the tracking server brokers the transfer.</li>
  <li><b>An old run's artifacts are unreachable after you changed the artifact root. Why?</b>The artifact URI is stored per run at creation time, not resolved from current config. Changing <code>--default-artifact-root</code> affects new runs only. You either keep the old location readable or migrate the objects and rewrite the URIs, which is why the artifact root is a decision worth getting right early.</li>
  <li><b>Give an honest reason not to use MLflow.</b>It does not execute anything. There is no agent, no queue, no scheduler, so remote execution, retries, and dependency graphs are your orchestrator's problem. If you wanted tracking and execution in one system, something like ClearML fits better. MLflow's value is being a narrow, widely-supported standard for tracking and model packaging, and that narrowness is deliberate.</li>
</ol>

## Final self-test

- Give the four components, the two stores, and why the registry needs a database.
- Say when the client API beats the fluent API, and name the batch-logging call.
- Explain the three autolog behaviours: run creation, ordering, and input examples.
- Say why you set `log_models=False` alongside an explicit `log_model`.
- Explain a custom pyfunc, and why `code_paths` is mandatory outside your repo.
- Say what signature `params` buy you, and where they are enforced.
- Describe how requirements are inferred and the one case that always fails.
- Give the command that reproduces the serving environment without a server.
- Explain `validation_thresholds`, `baseline_model`, and `min_relative_change`.
- Walk the five-step promotion workflow and name the rollback mechanism.
- Say what dataset logging proves and what it does not.
- State why a signature change is dangerous when promotion is an alias move.
- Name MLflow's most surprising architectural detail and the error it produces.
