Part two of three. The problems at this level are no longer "why is nothing logging". They are a model that loads on your laptop and dies in the container, an evaluation gate that passes noise, an artifact store nobody can read from CI, and a tracking server that got slow because someone logged per batch. Start with the error table, then the practices, then the deeper material underneath.

## Common errors at this level

Cumulative — everything from Beginner still applies. These are the failures that cost hours rather than minutes.

| Symptom | Real cause | Fix |
|---|---|---|
| Custom pyfunc fails to load with `ModuleNotFoundError` | The class is pickled by reference; the module is not in the artifact | `code_paths=[...]` for every module the model touches |
| Model loads locally, fails in the container | You tested with `--env-manager local` | Validate with `--env-manager virtualenv` before shipping |
| Serving env build takes minutes | Inference pulled in your whole dev environment | An explicit `pip_requirements` / `requirements-serving.txt` |
| `ModuleNotFoundError` for a dynamically imported package | Inference only sees real imports | `extra_pip_requirements`, or import at module level |
| Tracking server slow, trainer slow | One `log_metric` HTTP call per batch | Log per epoch, or `client.log_batch` |
| Two `model/` directories in one run | Autolog logged one and so did you | `mlflow.<flavour>.autolog(log_models=False)` |
| Training data found inside a published model | `log_input_examples=True` | Turn it off, or use a synthetic example |
| Hundreds of child runs from one search | Default `max_tuning_runs` under a big grid | Cap it explicitly |
| Metrics logged, artifacts 404 in CI | The client writes object storage directly and has no credentials | Give CI storage credentials, or enable proxied artifact access |
| Old runs' artifacts unreachable | Artifact root changed; the URI is stored per run | Keep the old location readable, or migrate and rewrite URIs |
| `INVALID_PARAMETER_VALUE` on a field that exists in the docs | Client newer than the server | Pin and align client/server versions |
| Promotion gate passes a noise-level model | Absolute threshold only | `baseline_model` + `min_relative_change` |
| Gate never fails, ever | `validation_thresholds` omitted; you only logged metrics | Thresholds raise; logging does not |
| Cannot roll back quickly | No `previous` alias at promotion time | Set it in the promotion script |
| A promotion broke every caller | Signature changed; alias move skipped code review | Additive-only signatures, or a new model name |
| A `nested=True` run raises | A previous run was never closed | Context manager everywhere, including notebooks |
| Threads write to each other's runs | Fluent API's single global active run | Client API with explicit run ids |
| `search_runs` returns nothing obvious | Params compare as strings | `params.max_depth = '5'`, quoted |
| A "reproducible" run cannot be rebuilt | Dirty tree — MLflow stores the commit, not a diff | Commit first; treat dirty runs as scratch |
| Dataset digest changed but nothing warned | Someone overwrote the source URI | Dated immutable prefixes; digests are annotation |
| LLM evaluation bill was a surprise | Judged metrics are one API call per row | Sample rows; pin and name the judge |
| Traces contain customer messages | Tracing stores inputs verbatim | Redaction and retention decided before enabling |
| Registry write from a fork PR | A pull-request credential could move aliases | Read/create-only for PRs; promotion on protected branches |

## The practices that pay off most

<div class="cards">
  <div class="card"><div class="icon">📦</div><h4>One custom pyfunc per model</h4><p>Preprocessing, threshold, and postprocessing travel with the weights. Consumers stop reimplementing your pipeline.</p></div>
  <div class="card"><div class="icon">🧳</div><h4><code>code_paths</code> without exception</h4><p>Every module the model touches, copied into the artifact. It is the difference between portable and personal.</p></div>
  <div class="card"><div class="icon">📌</div><h4>An explicit serving requirements file</h4><p>Smaller, faster, reviewable, and it does not depend on inference guessing correctly.</p></div>
  <div class="card"><div class="icon">✅</div><h4>Validate in a built environment</h4><p><code>mlflow models predict --env-manager virtualenv</code> before anything is promoted. It is the serving path, exactly.</p></div>
  <div class="card"><div class="icon">📈</div><h4>Relative gates, not absolute floors</h4><p><code>baseline_model</code> plus <code>min_relative_change</code>. Noise stops counting as an improvement.</p></div>
  <div class="card"><div class="icon">↩️</div><h4>A <code>previous</code> alias, always</h4><p>Set it while promoting. Rollback becomes one call instead of an archaeology exercise mid-incident.</p></div>
  <div class="card"><div class="icon">🔢</div><h4>Batch your metric logging</h4><p>Per epoch, or <code>log_batch</code>. Per-batch HTTP is the usual reason a team thinks MLflow is slow.</p></div>
  <div class="card"><div class="icon">🔒</div><h4>Additive-only signatures</h4><p>Treat it as a public API. A rename reaches production through an alias move with no review.</p></div>
</div>

## Practice cards

<ol class="guide-steps">
  <li><b>Fail on <code>code_paths</code> deliberately</b>Log a custom pyfunc without it, then load it from a fresh shell in <code>/tmp</code>. Add <code>code_paths</code> and repeat. The error becomes instantly recognisable forever.</li>
  <li><b>Measure the logging tax</b>Log 5,000 metric points one call at a time, then with <code>log_batch</code>. The ratio is the argument.</li>
  <li><b>Prove the artifact-store split</b>Remove your object-store credentials and run a training script. Metrics succeed, artifacts fail. That is the architecture in one experiment.</li>
  <li><b>Trim an inferred environment</b>Read a model's inferred <code>requirements.txt</code>, then replace it with an explicit five-line serving file. Compare build times.</li>
  <li><b>Reject a noise-level model</b>Add <code>baseline_model</code> and <code>min_relative_change=0.005</code>, then try to promote something 0.0004 better.</li>
  <li><b>Rehearse a rollback</b>Serve <code>@champion</code>, promote a new version, then move <code>champion</code> back to <code>previous</code> while the endpoint is live.</li>
  <li><b>Break a signature on purpose</b>Rename a feature, promote, and call the endpoint with the old payload. Then write your team's rule for signature changes.</li>
  <li><b>Read your own trace</b>Trace a RAG call with real input and look at exactly what got stored. Decide what needs redacting.</li>
  <li><b>Diff two runs from the client</b>Params, git commit, artifact URI. Practise finding the one line that differs.</li>
  <li><b>Validate without a server</b><code>validate_serving_input</code> plus <code>mlflow models predict</code>, wired into CI as a check.</li>
</ol>

## Making the serving path trustworthy

Most production surprises with MLflow are environment surprises. Four steps eliminate nearly all of them, and they belong in CI.

```bash
# 1. What would actually be installed?
python -c "import mlflow; print(mlflow.pyfunc.get_model_dependencies('models:/churn@champion'))"

# 2. Does the contract hold?
python - <<'PY'
from mlflow.models import validate_serving_input, convert_input_example_to_serving_input
import pandas as pd
payload = convert_input_example_to_serving_input(pd.read_json("holdout_sample.json"))
validate_serving_input("models:/churn@champion", payload)
print("signature contract OK")
PY

# 3. Does it load and score in a freshly built environment?
mlflow models predict -m "models:/churn@champion" -i holdout_sample.json \
  --content-type json --env-manager virtualenv

# 4. Does the container work?
mlflow models build-docker -m "models:/churn@champion" -n churn-scorer --enable-mlserver
docker run --rm -d -p 5001:8080 --name scorer churn-scorer
curl -sf -X POST localhost:5001/invocations -H 'Content-Type: application/json' \
  -d @holdout_sample.json > /dev/null && echo "container OK"
docker rm -f scorer
```

```text requirements-serving.txt — small, explicit, reviewable
mlflow==2.16.0
scikit-learn==1.5.1
pandas==2.2.2
numpy==1.26.4
joblib==1.4.2
```

| Check | Catches |
|---|---|
| `get_model_dependencies` | A bloated or wrong inferred environment |
| `validate_serving_input` | A signature that no longer matches real payloads |
| `predict --env-manager virtualenv` | Missing modules, version incompatibilities, `code_paths` gaps |
| A container smoke test | Base-image, port, and MLServer configuration problems |

<div class="callout tip">
  <span class="ct">Run all four in CI on every model change</span>
  They take a couple of minutes and they collectively eliminate the "worked on my machine" class of failure. A promotion that has not passed them is a promotion nobody has actually tested — because your notebook environment is not the serving environment, and only step three proves the difference.
</div>

## Sweep hygiene

Nested runs make sweeps readable. Four rules keep them useful rather than noisy.

<ol class="guide-steps">
  <li><b>The parent carries the summary, the children carry the detail</b>Log the best metric and the winning child's run id on the parent, so the table is scannable without expanding anything.</li>
  <li><b>Tag the sweep</b>A <code>sweep</code> tag plus the parameter name makes every run from one campaign filterable and deletable as a group.</li>
  <li><b>Do not log a model per child unless you need it</b>Forty children × a 200 MB model is 8 GB per sweep. Log models for the top candidates only.</li>
  <li><b>Cap search autologging</b><code>max_tuning_runs</code> on a large grid, or your experiment table becomes unusable and your backend store grows for no benefit.</li>
</ol>

```python a sweep that stays tidy
import mlflow

with mlflow.start_run(run_name=f"sweep depth {partition}",
                      tags={"sweep": "max_depth", "dataset": partition}) as parent:
    results = []
    for depth in (3, 5, 8, 12, 16):
        with mlflow.start_run(run_name=f"depth={depth}", nested=True) as child:
            mlflow.log_param("max_depth", depth)
            model, metrics = fit(max_depth=depth)
            mlflow.log_metrics(metrics)
            results.append((metrics["val_auc"], depth, child.info.run_id, model))

    auc, depth, run_id, model = max(results)
    mlflow.log_metrics({"best_val_auc": auc, "candidates": len(results)})
    mlflow.set_tags({"best_depth": str(depth), "best_child_run_id": run_id})
    # Only the winner gets a logged, registered model.
    log_registered_model(model)
```

```python cleaning up a finished sweep
from mlflow import MlflowClient
client = MlflowClient()

losers = mlflow.search_runs(
    experiment_names=["churn"],
    filter_string=f"tags.mlflow.parentRunId = '{parent_id}' and tags.keep != 'true'",
)
for run_id in losers["run_id"]:
    client.delete_run(run_id)     # soft delete; recoverable until GC
```

<div class="callout warn">
  <span class="ct"><code>delete_run</code> is a soft delete until you garbage-collect</span>
  Deleted runs move to a <code>deleted</code> lifecycle stage and remain in the backend store; <code>mlflow gc</code> is what actually removes them and their artifacts. That is good news for accidents and bad news for disk usage — if you delete a thousand sweep runs and never run <code>gc</code>, nothing is reclaimed.
</div>

## Gates that mean something

An evaluation that only logs numbers is a report. An evaluation with thresholds is a gate. Four properties separate a gate people trust from one they route around.

| Property | How |
|---|---|
| **Relative to production** | `baseline_model` set to the current champion |
| **Above noise** | `min_relative_change` or `min_absolute_change` |
| **Business-aware** | A cost or fairness metric in `extra_metrics`, with its own threshold |
| **On a holdout the model never saw** | A fixed dataset, versioned and immutable |

```python the gate, with the honesty checks in place
import mlflow
from mlflow.models import MetricThreshold, make_metric

HOLDOUT = "s3://bucket/data/churn/holdout/dt=2026-07-01/holdout.parquet"   # frozen

def _cost(eval_df, _builtin):
    fp = ((eval_df["prediction"] == 1) & (eval_df["target"] == 0)).sum()
    fn = ((eval_df["prediction"] == 0) & (eval_df["target"] == 1)).sum()
    return float(50 * fp + 500 * fn)

def _worst_segment_auc(eval_df, _builtin):
    from sklearn.metrics import roc_auc_score
    per = eval_df.groupby("segment").apply(
        lambda g: roc_auc_score(g["target"], g["prediction"]) if g["target"].nunique() > 1 else 1.0
    )
    return float(per.min())

result = mlflow.evaluate(
    model=candidate_uri,
    data=read_parquet(HOLDOUT), targets="label", model_type="classifier",
    baseline_model=champion_uri,
    extra_metrics=[
        make_metric(eval_fn=_cost, greater_is_better=False, name="expected_cost"),
        make_metric(eval_fn=_worst_segment_auc, greater_is_better=True, name="worst_segment_auc"),
    ],
    validation_thresholds={
        "roc_auc": MetricThreshold(threshold=0.85, min_relative_change=0.005, greater_is_better=True),
        "expected_cost": MetricThreshold(threshold=20000, greater_is_better=False),
        "worst_segment_auc": MetricThreshold(threshold=0.75, greater_is_better=True),
    },
)
```

<div class="callout warn">
  <span class="ct">An aggregate metric hides a broken segment</span>
  A model can improve overall AUC while getting materially worse for one customer group. A worst-segment threshold costs ten lines and catches exactly the regression that damages trust — and it is the kind of check a reviewer will ask about long before they ask about your architecture.
</div>

## Keeping the tracking server healthy

At this level you may not own the server, but you will be blamed for its symptoms. Three client-side behaviours cause most of the load.

| Behaviour | Effect | Fix |
|---|---|---|
| Per-batch metric logging | Huge write volume; slow trainers and a slow UI | Per epoch, or `log_batch` |
| Unbounded `search_runs` in a loop | Repeated expensive queries | Query once, filter in pandas; use `max_results` |
| Thousands of tiny artifacts per run | Slow artifact listing and browsing | Bundle into one archive or one table |
| Never deleting CI and sweep runs | Backend store growth, slower search | Retention on tagged runs, then `mlflow gc` |
| Huge autologged child-run counts | Table unusable, store growth | `max_tuning_runs` |

```bash
# What the server actually holds — ask before assuming
python - <<'PY'
import mlflow
for exp in mlflow.search_experiments():
    runs = mlflow.search_runs(experiment_ids=[exp.experiment_id], max_results=1,
                              output_format="pandas")
    print(exp.name, exp.experiment_id, "artifact:", exp.artifact_location)
PY

# Reclaim space from soft-deleted runs (server-side, coordinate with the owner)
mlflow gc --backend-store-uri postgresql://... --older-than 30d
```

<div class="callout tip">
  <span class="ct">Log a metric per epoch and a summary per run</span>
  Curves are for diagnosis and need epoch resolution at most; comparison needs one number per run. That split keeps write volume proportional to runs rather than to batches, and it is the single most effective thing an individual can do for a shared server's health.
</div>

## "Loads locally, fails in serving"

The most common mid-level complaint, with exactly five causes. Work through them in order.

<ol class="guide-steps">
  <li><b>A module is missing from the artifact</b>Custom pyfunc without <code>code_paths</code>. The error names your module.</li>
  <li><b>A dependency was never inferred</b>Dynamic or conditional import. The error names a third-party package.</li>
  <li><b>A version differs</b>The model loads but warns, or behaves differently. Compare the logged <code>requirements.txt</code> against the serving environment.</li>
  <li><b>A system dependency is missing</b>libgomp, libgl, a locale. Only Python is managed — this is a base-image problem.</li>
  <li><b>A path or credential only exists on your machine</b>The model reads a file or a secret at load time. Everything it needs must be an <code>artifact</code> or a declared environment variable.</li>
</ol>

```bash
# The fastest diagnosis: reproduce the load in a built environment, verbosely
mlflow models predict -m "models:/churn@champion" -i sample.json \
  --content-type json --env-manager virtualenv 2>&1 | tail -40

# Then compare the two environments explicitly
python -c "import mlflow; print(open(mlflow.artifacts.download_artifacts('models:/churn@champion/requirements.txt')).read())"
pip freeze | sort > /tmp/local.txt
```

<div class="callout warn">
  <span class="ct">Never load secrets in `load_context`</span>
  A custom pyfunc that reads a credential file or calls a secrets manager at load time works in your environment and fails, or silently behaves differently, everywhere else — and it couples the model artifact to one deployment's configuration. Pass what it needs as declared artifacts or environment variables, and keep the model a pure function of its inputs.
</div>

## Habits worth adopting now

**Pin MLflow in `requirements.txt` and align it with the server.** A client ahead of the server sends fields the server rejects, and the error message is unhelpful. One pinned version across the team removes a class of "works for me".

**Keep a `requirements-serving.txt` separate from `requirements.txt`.** Training needs notebooks, plotting, and test tooling; serving needs five packages. Smaller serving environments build faster and have less to go wrong.

**Tag every run with its origin.** `ci`, `sweep`, `nightly`, `manual`. Retention, cost attribution, and "what is filling the store" all become one filter.

**Write the metric into the run name.** `rf d=8 auc=0.941` makes the experiment table self-documenting, and it makes a sweep's parent row readable at a glance.

**Set `previous` at every promotion.** One line, and rollback stops being an incident-time investigation.

**Freeze the holdout set and version its path.** A gate is only meaningful against data the model has never seen and that does not move underneath you.

**Treat the signature as a published API.** Additive changes only. If you must break it, publish a new registered model name and migrate consumers deliberately.

**Validate in a built environment before every promotion.** It is two minutes and it is the only test that exercises what production will actually do.

```bash
# A pre-promotion checklist worth aliasing
set -e
mlflow models predict -m "models:/$NAME/$VERSION" -i holdout_sample.json \
  --content-type json --env-manager virtualenv > /dev/null
python ci/validate_signature.py --model "models:/$NAME/$VERSION"
python ci/evaluate_gate.py --model "models:/$NAME/$VERSION" --baseline "models:/$NAME@champion"
echo "ready to promote $NAME v$VERSION"
```

**Senior tips go deeper on every one of these** — the hardening pass every self-hosted server needs, authentication and proxied artifact access, multi-tenant isolation and quota, backend database capacity and what breaks first, backup and restore drills, artifact retention that survives an audit, promotion approval and separation of duties, and incident playbooks for a lost server, an unreadable artifact store, or a model nobody can rebuild.
