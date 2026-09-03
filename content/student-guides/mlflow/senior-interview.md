Part three of three, and the one to read if you only read one. A cumulative review of **the entire series** — foundations, packaging and promotion machinery, and the governance and scale work a senior owns — organised by topic rather than by level. About fifty minutes. Fast review first, common questions at the end.

## Part one — foundations

<div class="flow">
  <div class="node">TRACKING<small>runs, params, metrics</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">MODELS<small>flavours + signature</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">REGISTRY<small>versions + aliases</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">SERVING<small>batch, REST, Docker</small></div>
</div>

> MLflow has four components: Tracking for runs, Models for framework-agnostic packaging, a Registry for named versions and moveable aliases, and Projects for reproducible entry points. The core idea is the model format — a directory with an `MLmodel` manifest declaring flavours, a signature, and an environment — which is why one artifact loads in a batch job, a REST server, or a container.

**Two stores:** backend for metadata, artifact store for files. **The registry needs a database backend.** **Params immutable, metrics stepped, tags mutable.** **Consume by alias.** **MLflow records the commit, not a diff.**

### The four things you log

| Kind | Mutable | For |
|---|---|---|
| Param | No | Configuration: hyperparameters, seed, data partition |
| Metric | Yes, stepped | Anything measured |
| Tag | Yes | Organisation and search |
| Artifact | Append-only | Files, including the model |

### The model format and URIs

```yaml MLmodel
flavors:
  python_function: {loader_module: mlflow.sklearn, model_path: model.pkl}
  sklearn: {pickled_model: model.pkl, sklearn_version: 1.5.1}
signature: {inputs: '[…]', outputs: '[…]'}
run_id: a1b2c3d4e5f64718
```

| URI | Points at |
|---|---|
| `runs:/<id>/model` | A model logged by a run |
| `models:/<name>/<n>` | A pinned registry version |
| `models:/<name>@champion` | Whatever holds that alias |

Native flavour returns the real object; **pyfunc** returns a generic `predict` — which is what every deployment target uses. **A signature is a contract**; without it, misordered or mistyped input scores silently.

### The rules that never change

Context manager always. Named experiment, named runs, tags in code. Signature on every model. `mlflow.evaluate` for the standard metric set. Aliases, not deprecated stages. Commit before a run you might defend.

### The traps

| Symptom | Cause | Fix |
|---|---|---|
| No runs in the UI | Wrote to local `./mlruns` | Set `MLFLOW_TRACKING_URI` |
| `register_model` fails | File-based backend | Postgres/MySQL |
| Run stuck in `RUNNING` | No context manager | `with mlflow.start_run()` |
| `Param already logged` | `log_param` twice | Params once; metrics vary |
| Nothing autologged | `autolog()` after the estimator | Call it beside the imports |
| Serving fails to load | Environment mismatch | Default `virtualenv`, not `local` |

## Part two — packaging and promotion machinery

### Runs, nesting, and the client API

Nesting is the `mlflow.parentRunId` tag, so children are queryable. Use the **client API** for threads, other runs, bulk `log_batch`, and all registry work — the fluent API is global state keyed on the active run.

<div class="callout warn">
  <span class="ct">Per-batch metric logging is why teams think MLflow is slow</span>
  One <code>log_metric</code> per batch is one HTTP round trip per point. Log per epoch, or accumulate and use <code>log_batch</code>. This is the most common scale mistake and a frequent interview probe.
</div>

### Autologging internals

Patches framework functions at import time. Three behaviours: **it creates a run if none is active**; **it must be enabled before the estimator exists**; **`log_input_examples=True` embeds real training data** in the artifact. Set `log_models=False` and log the model yourself, or you get two model directories with no statement of which is authoritative.

### Custom pyfunc

```python
class ChurnModel(mlflow.pyfunc.PythonModel):
    def load_context(self, context): ...
    def predict(self, context, model_input, params=None): ...

mlflow.pyfunc.log_model(name="model", python_model=ChurnModel(),
    artifacts={"scaler": …, "classifier": …},
    code_paths=["src/features.py"], signature=signature,
    pip_requirements="requirements-serving.txt",
    registered_model_name="churn-classifier")
```

| Piece | Role |
|---|---|
| `load_context` | One-time setup from declared artifacts |
| `predict(ctx, input, params)` | The whole inference contract, including postprocessing |
| `code_paths` | Your modules, so the model imports nothing from your repo |
| Signature `params` | Validated call-time knobs — threshold, top-k, temperature |

**Missing `code_paths` is the top cause of "loads locally, fails in serving"** — the class is pickled by reference, so the module must be importable.

### Dependencies

Inferred by introspecting loaded modules. **Inference sees imports, not intent** — dynamic or conditional imports are invisible. Controls: `extra_pip_requirements`, an explicit `pip_requirements`, `get_model_dependencies`, `validate_serving_input`, and `mlflow models predict --env-manager virtualenv` to reproduce the serving path.

### Gates

```python
mlflow.evaluate(model=candidate, data=holdout, targets="label", model_type="classifier",
    baseline_model=champion,
    extra_metrics=[cost_metric, worst_segment_metric],
    validation_thresholds={"roc_auc": MetricThreshold(threshold=0.85,
        min_relative_change=0.005, greater_is_better=True)})
```

Raises `ModelValidationFailedException`, so CI fails with the metric named. **Relative to a baseline** is the honest gate; an absolute floor stops discriminating once cleared. An aggregate metric hides a broken segment.

### The registry as a workflow

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>1</span><strong>Register</strong><small>Training registers a version tagged <code>validated=false</code>.</small></div>
  <div class="guide-timeline-item"><span>2</span><strong>Validate</strong><small>Thresholds on a frozen holdout; tag the result.</small></div>
  <div class="guide-timeline-item"><span>3</span><strong>Compare</strong><small>Against the champion with a minimum relative change.</small></div>
  <div class="guide-timeline-item"><span>4</span><strong>Promote</strong><small><code>previous</code> keeps the old version; <code>champion</code> moves.</small></div>
  <div class="guide-timeline-item"><span>5</span><strong>Roll back</strong><small>Move <code>champion</code> to <code>previous</code>. One call, no redeploy.</small></div>
</div>

### Datasets, deployment, tracing

`mlflow.data.from_pandas(...)` plus `log_input` records name, source, **digest**, schema, and profile. It is **lineage annotation, not versioning** — nothing stops the source URI being overwritten.

Targets: batch `pyfunc.load_model`, `mlflow models serve --workers N --enable-mlserver`, `build-docker`, `spark_udf`, and the deployments API. `/invocations` takes `dataframe_split`, `dataframe_records`, `instances`, `inputs`, plus `params`.

Tracing records spans (`LLM`, `RETRIEVER`, `RERANKER`, `TOOL`) with inputs, outputs, timing, attributes. GenAI metrics are LLM-as-a-judge: **they cost money per row and vary**, so pin and name the judge.

<div class="callout warn">
  <span class="ct">A signature change is a breaking API change that skips code review</span>
  Promotion moves an alias with no deploy step, so a renamed column reaches production without an API diff being reviewed. Additive-only, or a new registered model name.
</div>

## Part three — trust, scale, and ownership

### The trust model

**Moving an alias changes production, and by default nothing stops anyone with tracking credentials from doing it.**

| Actor | Needs | Must not have |
|---|---|---|
| Researcher | Create runs, log models, register versions | Move `champion`; delete |
| CI on a pull request | Create runs in `*/ci` | Register or alias |
| CI on a protected branch | Register and alias, from a gated job | Delete |
| Serving | Read registry and artifacts | Any write |
| Retention | Scoped, audited delete | Register or alias |

Three sharpening properties: **authorisation is coarse** (per-experiment and per-model permissions, not rich RBAC, and unauthenticated by default); **clients touch object storage directly**, so everyone needs bucket credentials unless you proxy; and **a pickle is executable**, so loading a model runs code.

### Auth and proxied artifacts

```bash
mlflow server --backend-store-uri postgresql://… \
  --artifacts-destination s3://ml-artifacts/mlflow --serve-artifacts \
  --app-name basic-auth --workers 4
```

| Permission | Allows |
|---|---|
| `READ` | View runs, metrics, models |
| `EDIT` | Create and modify runs and versions |
| `MANAGE` | Change permissions, delete |

`--serve-artifacts` means only the server holds bucket credentials and artifact access follows MLflow's permissions — at the cost of making the server a throughput bottleneck and single point of failure for transfers.

### Self-hosting

| Component | If it dies | Grows with |
|---|---|---|
| Reverse proxy | No access; stores intact | — |
| Tracking server (stateless) | Restart or scale out | — |
| **Backend database** | **Everything stops** — system of record | Metric points × runs |
| Artifact store | Models unreadable; metadata survives | Artifacts × retention |

**SQLite in a shared deployment is a time bomb** — `database is locked` under concurrent writers. Postgres from the second user onwards. Pin the server image tag: `latest` means an unplanned schema migration on the next restart.

### Backups and upgrades

Two parts: `pg_dump` of the MLflow (and auth) database, **and** the artifact bucket with versioning and replication. A restored database with an unreachable bucket is a catalogue of missing models. Verify: login → a run's metrics → alias resolution → **a model download** → a new run logging. Upgrades run migrations: back up, `mlflow db upgrade` deliberately, server before clients.

### Multi-tenancy

Open-source MLflow is one server with coarse permissions. Isolation comes from experiment naming conventions, the basic-auth plugin, artifact prefixes with bucket policy, mandatory tags, and — for hard isolation — a separate server and database per tenant. A thirty-line wrapper turns every convention into a default.

### Cost and retention

| Centre | Driver | Control |
|---|---|---|
| Artifact storage | Models per run × runs × retention | Log models deliberately, lifecycle, `mlflow gc` |
| Backend database | Metric points × runs | Per-epoch logging, retention on CI and sweeps |
| Server | Concurrency, proxied throughput | Workers, replicas |

<div class="callout warn">
  <span class="ct">Two retention traps</span>
  <code>delete_run</code> is a <b>soft</b> delete — nothing is reclaimed until <code>mlflow gc</code> runs. And a lifecycle rule can expire the object behind a registered version, leaving an entry that resolves and then fails to download, discovered by a batch job at 3am.
</div>

### Scale, in order of what breaks

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>1</span><strong>Metric write rate</strong><small>Database write pressure. Fix: per epoch, then <code>log_batch</code>.</small></div>
  <div class="guide-timeline-item"><span>2</span><strong>Run count</strong><small>Slow search and table. Fix: retention, then <code>mlflow gc</code>.</small></div>
  <div class="guide-timeline-item"><span>3</span><strong>Artifact volume</strong><small>Cost and proxied throughput. Fix: lifecycle, fewer logged models.</small></div>
  <div class="guide-timeline-item"><span>4</span><strong>Client concurrency</strong><small>Worker saturation. Fix: more workers and replicas — it is stateless.</small></div>
</div>

**The backend database is the single point of failure**, and it includes alias resolution — so serving should resolve the alias once at startup, not per request.

### Reproducibility

| Layer | Recorded | Pin with |
|---|---|---|
| Code | The **commit only**, no diff | A dirty-tree guard |
| Packages | Inferred pins | An explicit committed serving requirements file |
| CUDA, system libs | No | The base image **by digest** |
| Data | Only via `log_input` | A dated immutable source, digest, and a param |
| Seeds | Only if logged | Log and set them |

**MLflow will happily record an unreproducible run** with no warning. The checks are yours: refuse to register from a dirty tree, require a dataset input, and run a **weekly rebuild check** against the champion with a tolerance.

### Governed promotion, lineage, erasure

Three mechanisms make promotion auditable: **permissions** (only a CI account may move aliases), **a gated workflow** (protected branch with required review), and **a `promotion_audit` version tag** recording who, when, which holdout, which baseline, which thresholds, and the metrics.

Audit chain: model → version → run → code, data, configuration. A lineage script proves whether each link exists. Common gaps: a dirty tree, no dataset recorded, no approval trail.

Erasure exposure specific to MLflow: **prediction artifacts** with identifiers, **`input_example` embedded in a model**, and **GenAI traces** holding prompts verbatim. Weights are effectively un-erasable — retraining is the remedy.

### Serving and the supply chain

Authenticate at an ingress; the scoring server authenticates nobody. Resource limits, pinned base image by digest, resolve the alias at startup, and a rehearsed rollback.

<div class="callout warn">
  <span class="ct">A registry version is immutable metadata pointing at mutable bytes</span>
  MLflow will not let you change version 7, but anyone with bucket write access can replace the object it points at — and every consumer then loads different weights with no error. Write-restrict the prefix, enable versioning, prefer proxied access.
</div>

### Where MLflow stops

| Need | Better tool |
|---|---|
| Executing and scheduling | Airflow, Dagster, Prefect, Argo, CI |
| Data versioning with immutability | DVC, LakeFS, Delta/Iceberg |
| Point-in-time features | Feast, Tecton |
| High-scale low-latency serving | KServe, Seldon, Triton, managed endpoints |
| Fine-grained RBAC | Managed MLflow, or a server per tenant |
| Hyperparameter search | Optuna, Ray Tune — then log to MLflow |

## Common interview questions

<ol class="guide-steps">
  <li><b>Design MLflow for a team of thirty across three squads.</b>Self-hosted behind TLS and auth, Postgres backend with disk and connection alerts, artifacts in object storage with a prefix per team, bucket versioning on, and proxied artifact access so clients hold no bucket keys. Experiments named <code>team/project/purpose</code>, mandatory <code>team</code> and <code>cost_centre</code> tags, and a shared wrapper making all of that default. Researchers get <code>EDIT</code> on experiments and <code>READ</code> on registered models; only a CI service account can move aliases, from a reviewed workflow that writes an audit tag. Scheduled retention plus <code>mlflow gc</code>, a weekly rebuild check, and a published platform report. Then say plainly that authorisation is coarse, so isolation is conventions, permissions, and buckets — not roles.</li>
  <li><b>Why is alias permission the security question that matters?</b>Because consumers load <code>models:/name@champion</code>, so moving that alias changes what production serves with no deploy and no code review. On a default install anyone with tracking credentials can do it, and nothing records who did. That makes alias write the production-change surface, and it should belong to one gated CI job rather than to every researcher.</li>
  <li><b>What is MLflow's most surprising architectural detail?</b>By default the tracking server returns an artifact URI and the client reads and writes object storage itself. So every user and every CI job needs bucket credentials, and artifact access is governed by bucket policy rather than by MLflow permissions. It is why "metrics appear but artifacts 404" is the most common support question, and <code>--serve-artifacts</code> with <code>--artifacts-destination</code> is the fix — at the cost of routing all transfers through the server.</li>
  <li><b>Which component breaks first as you grow, and why?</b>The backend database, on metric write rate. Per-batch logging from several concurrent runs produces enormous write volume, which slows logging and then the UI; after that it is run count making search slow. Both are fixed by client behaviour first — per-epoch logging and retention — before adding database resources. And because the database also serves alias resolution, a database problem is a production problem unless serving caches its model at startup.</li>
  <li><b>What does a complete MLflow backup contain?</b>A dump of the backend database, including the auth database if you use the basic-auth plugin, plus the artifact bucket with versioning and ideally replication. Metadata alone restores a complete-looking system where every model resolves and nothing downloads. That is why "can you download a known model" belongs in the restore verification, alongside login, a run's metrics, and alias resolution.</li>
  <li><b>Why is SQLite unacceptable for a shared server?</b>It locks under concurrent writers, so several people training at once produce <code>database is locked</code> exactly when the server is most needed. It also cannot be replicated or scaled, and migrating a live SQLite store to Postgres involves downtime and care. Postgres from the second user onwards.</li>
  <li><b>How do you make a model from a year ago rebuildable?</b>MLflow records the commit, params, and pip pins; everything else is yours. Refuse to register from a dirty tree, require a logged dataset with a dated immutable source and a digest, pin the base image by digest, log and set the seed, and keep an explicit committed serving requirements file. Then schedule a rebuild check that reruns the champion's recipe and compares the metric within a tolerance — because unpinned layers degrade silently and the first run of that check will fail.</li>
  <li><b>Why does MLflow's lack of a stored diff matter?</b>Because a run tagged with a commit but executed from a dirty tree looks exactly as trustworthy as a clean one, and nothing warns you. Unlike tools that capture the working tree, MLflow cannot reconstruct what actually ran. The mitigation is procedural: a guard that refuses to create a promotable run from a dirty tree, and a <code>git_clean</code> tag that promotion checks.</li>
  <li><b>How do you build an approval trail for promotion?</b>Three things together. Permissions, so only a CI service account can move an alias. A gated workflow on a protected branch, so the human approval is a reviewed pull request by someone other than the author. And an audit tag on the model version recording who, when, which frozen holdout, which baseline version, which thresholds, and the resulting metrics. The tag is the record; the permission is the control — a tag written by the person who trained the model is a self-approval.</li>
  <li><b>An auditor asks you to prove what produced the production model. What do you show them?</b>One generated report: the alias, the version, the version tags, the producing run with its user and status, the git commit and whether the tree was clean, the dataset inputs with their sources and digests, the params as executed, and the promotion audit tag. If any of those is missing — usually the data chain or the approval — that is the finding, and it is better to know it before the audit than during it.</li>
  <li><b>How would you handle an erasure request?</b>Enumerate the MLflow-specific copies first: prediction artifacts containing identifiers, an <code>input_example</code> embedded in a model if autologging left it on, GenAI traces holding prompts verbatim, and database backups. Then be honest that weights retain the influence and are sometimes extractable, so retraining is the only real remedy for the model itself. The architectural fix is upstream: keep identifiers out of logged artifacts, turn off input examples, and decide trace redaction before enabling tracing on real traffic.</li>
  <li><b>What is the supply-chain risk in an MLflow model?</b>Loading a model executes code — unpickling is code execution, and <code>code_paths</code> ships arbitrary modules that run at load time. Worse, a registry version is immutable metadata pointing at mutable bytes: anyone with bucket write access can replace the object behind version 7 and every consumer loads different weights with no error. Write-restrict the artifact prefix, enable versioning, prefer proxied access, and treat an external model artifact like an unreviewed dependency.</li>
  <li><b>Design a promotion gate a reviewer would trust.</b>Evaluate on a frozen holdout the model has never seen, with the current champion as <code>baseline_model</code> and a <code>min_relative_change</code> so noise does not pass. Include a business-cost metric and a worst-segment metric with their own thresholds, because an aggregate improvement can hide a regression for one group. Fail on the exception rather than on a logged number, and write the audit tag. Then rehearse the rollback.</li>
  <li><b>How do you roll back, and how fast?</b>Move <code>champion</code> to the version held by <code>previous</code>. That is one call, and it only works because <code>previous</code> was set at promotion time. If serving caches its model at startup, the rollback also needs a restart or a cache expiry — which is a trade-off worth making explicit, since the alternative is resolving the alias per request and coupling production to the tracking database.</li>
  <li><b>What is your retention policy, and what could it break?</b>Runs in CI experiments deleted after thirty days, research runs after a year, with exemptions for tagged runs and anything a registered version references — then <code>mlflow gc</code> to actually reclaim space, because <code>delete_run</code> is only a soft delete. On the artifact side, lifecycle rules per prefix with the registry prefix exempt from expiry, because expiring the object behind a registered version produces a resolvable entry that fails to download.</li>
  <li><b>How do you keep researchers productive without giving everyone everything?</b>A wrapper: they call one function and get the right experiment path, mandatory tags, registered model name, serving requirements, and image digest. They can create runs and register versions; they cannot move an alias. Promotion is a reviewed workflow. The result is that the safe path is also the shortest path, which is the only governance that survives a deadline.</li>
  <li><b>What monitoring does an MLflow platform need?</b>Backend database disk above 80% first, because when it fills, logging, the UI, and alias resolution all stop. Then database connections, tracking-server 5xx rate, artifact-store error rate, the rebuild-check result, storage growth per team, and a notification on any production alias change. Deliberately not on that list: users' failed runs, which belong to their authors and will drown the real alerts.</li>
  <li><b>You inherit an MLflow setup. What do you check first?</b>Whether a researcher can move a production alias, and whether a restore has ever been performed. Those two are "anyone can change production" and "a bad day is permanent". Then: unauthenticated server, SQLite backend, artifact root on a server disk, unpinned server image, no bucket versioning, no retention, and whether promotion is a script with a threshold or a person clicking.</li>
  <li><b>Where does MLflow stop?</b>It executes nothing — no agent, no queue, no retries — so orchestration is Airflow, Dagster, or CI. Its dataset tracking is annotation, not versioning, so immutability comes from DVC, LakeFS, or a table format. It is not a feature store and not a serving mesh. Authorisation is coarse. And it has no optimiser, so hyperparameter search is Optuna or Ray Tune logging into it. That narrowness is deliberate and is why it composes well with whatever you already run.</li>
  <li><b>What is the single idea that connects the whole series?</b>A model is only useful if something other than its author can load it, and only trustworthy if something other than its author's memory explains it. Signatures, flavours, pinned environments, aliases, audit tags, backups, and rebuild checks all exist to keep that true as the number of models, people, and months grows.</li>
</ol>

## Final self-test

- Give the thirty-second answer, the four components, and the two stores.
- State the rules that never change: context manager, signature, alias, evaluate, commit.
- Explain what `log_model` writes and why pyfunc makes it portable.
- Say why per-batch metric logging is the classic scale mistake.
- Explain custom pyfunc, `code_paths`, and signature `params`.
- Describe how requirements are inferred and the one case that always fails.
- Give the command that reproduces the serving environment without a server.
- Explain `baseline_model` plus `min_relative_change`, and why an aggregate metric is not enough.
- Say why alias write is the production-change surface, and how you restrict it.
- Name MLflow's most surprising architectural detail and the error it causes.
- Say which component breaks first at scale and the fix order.
- List the two backup parts and the restore step that usually fails.
- Name every layer that must be pinned for an eighteen-month rebuild, and how you verify it.
- Explain why a registry version is immutable metadata over mutable bytes.
- Name three places MLflow is the wrong tool and what you would use instead.
