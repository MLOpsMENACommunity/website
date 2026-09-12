# Part two of three: Build dependable Evidently monitoring pipelines

At this level, a report that works on a laptop is not enough. You must make every result comparable, calibrate drift behavior, cover meaningful slices and delayed labels, run efficiently in batch pipelines, protect sensitive fields, and send an actionable alert to the correct owner.

## Where this picks up

| Beginner foundation | Mid-level extension | Production reason |
|---|---|---|
| Reference and current batches | Versioned baseline and window contracts | Prevent accidental comparisons |
| Explicit column roles | Versioned schema with compatibility checks | Detect upstream changes before statistics |
| Quality and drift reports | Detector calibration by feature type and risk | Control false alerts and missed shifts |
| Prediction and model signals | Slices plus delayed-label joins | Find localized and eventual quality failures |
| HTML and JSON snapshots | Durable workspace/result store and manifests | Compare history and reproduce incidents |
| Scheduled check | Idempotent, scalable batch pipeline | Survive retries and large windows |
| Basic minimization | Policy routing, retention, and access | Protect production data |
| Manual diagnosis | Alert states and incident triage | Give ownership to a responder |

<div class="guide-arch" style="grid-template-columns:1fr auto 1fr auto 1fr"><div class="arch-node" data-kind="entry"><b>Versioned inputs</b><small>schema + windows</small></div><i class="arch-edge" data-dir="right"></i><div class="arch-node" data-kind="worker"><b>Evidently job</b><small>metrics + conditions</small></div><i class="arch-edge" data-dir="right"></i><div class="arch-node" data-kind="store"><b>Evidence store</b><small>snapshot + manifest</small></div><div class="arch-note">Alert routing reads evidence; it does not receive unrestricted source tables.</div></div>

## 1. Turn monitoring assumptions into versioned contracts

A reliable monitor identifies the model and feature schema, the exact reference snapshot, window boundaries, completeness rule, minimum sample, metrics, detector parameters, severity rules, and owners. Store the contract beside pipeline code and review it like a model interface.

```yaml contracts/churn-monitor-v3.yaml
model: churn-v12
schema: features-v8
reference: s3://monitoring/baselines/churn/2026-08-01.parquet
window: {frequency: daily, timezone: UTC, delay: 2h}
minimum_rows: 10000
metrics: [data_summary, data_drift, prediction_drift]
owners: {service: retention-ml, data: customer-platform}
retention_days: 90
```

Freeze immutable baselines. Changing one silently resets the meaning of every historical comparison. Approve a new baseline with its reason, effective date, and backtest.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Convert a notebook monitor into YAML.</li><li>Add immutable baseline ID, timezone, completeness, and owners.</li><li>Review the diff as if it could change paging behavior.</li></ol></div>

## 2. Calibrate drift methods and thresholds

Detector choice depends on data type, sample size, and the kind of change that matters. Statistical tests answer whether evidence of difference exists; distances measure magnitude. Neither supplies business impact automatically.

| Feature/window | Candidate approach | Calibration concern |
|---|---|---|
| Continuous, moderate rows | KS-style test | Very sensitive as row count grows |
| Continuous, large rows | PSI or Wasserstein-style distance | Choose meaningful magnitude threshold |
| Categorical | Chi-square, Jensen-Shannon, PSI | Sparse and new categories |
| Small sample | Distance plus uncertainty/repeated windows | Unstable estimates |
| Prediction probability | Distribution distance and performance | Output movement can be intentional |

Backtest stable historical windows to estimate the false-alert rate. Inject known shifts or use past incidents to measure detection. Select warning and critical boundaries by operational cost, not round numbers. Recalibrate after detector, feature, population, or baseline changes.

```text calibration
stable window pairs -> detector scores -> false-alert distribution
known incidents     -> detector scores -> detection distribution
                                  \       /
                         choose risk-aware thresholds
```

<div class="guide-try"><span class="ct">Try it</span><ol><li>Score ten stable window pairs.</li><li>Inject a 10% and 25% shift.</li><li>Choose a threshold and state false-alert and missed-shift tradeoffs.</li></ol></div>

## 3. Monitor slices, seasonality, and delayed labels

An overall distribution can remain stable while one region, device type, or risk tier fails. Define slices from product risks, ensure minimum sample sizes, and compare them with appropriate references. Avoid creating hundreds of unowned slices that produce noisy alerts.

Labels often arrive later than features and predictions. Run an early monitor for quality and drift, then a later job that joins outcomes using a protected token and computes model quality. Report label coverage and delay; otherwise, a biased subset of quickly observed labels may mislead you.

```text
t+1 hour:  features + predictions -> quality/drift signals
                                          |
t+7 days: protected outcome join ---------+-> performance by approved slice
```

<div class="guide-try"><span class="ct">Try it</span><ol><li>Add two risk-based slices with minimum rows.</li><li>Design an outcome join that excludes direct identifiers from reports.</li><li>Report label coverage beside accuracy.</li></ol></div>

## 4. Build an idempotent batch pipeline

A production flow should validate readiness, derive privacy-safe features, execute the pinned report, persist snapshot and manifest atomically, evaluate severity, and notify once. Use a run key such as `model/window/report-version`; retries with the same key must update the same run rather than duplicate alerts.

```text
partition sensor -> contract check -> sample/transform -> report workers
       |                                                    |
 incomplete: wait                                  snapshots + statuses
                                                            |
                         idempotent run key -> severity -> alert router
```

Preserve failed states such as `input_incomplete`, `schema_failed`, `compute_failed`, and `published`. Never convert a failed computation into “no drift.”

```python pipeline_outline.py
run_key = f"{model_id}/{window_end}/{contract_version}"
if result_store.is_complete(run_key):
    return
batch = load_complete_window(window_end)
validate_contract(batch)
safe_batch = select_and_transform_allowed_columns(batch)
snapshot = report.run(safe_batch.current, safe_batch.reference)
result_store.publish_atomically(run_key, snapshot, manifest)
alert_once(run_key, classify(snapshot))
```

<div class="guide-try"><span class="ct">Try it</span><ol><li>Run the same window twice.</li><li>Verify one result and one notification exist.</li><li>Force compute failure and confirm it is not reported as healthy.</li></ol></div>

## 5. Scale cost and computation deliberately

Large windows increase memory, processing time, and sensitivity. Read only monitored columns, push time filtering to storage, and use deterministic stratified sampling when full precision is unnecessary. Preserve rare critical groups. Record the sample method and seed in the manifest.

| Control | Benefit | Risk to manage |
|---|---|---|
| Column projection | Less I/O and exposure | Missing diagnostic context |
| Deterministic sample | Repeatable lower cost | Rare groups disappear |
| Partitioned execution | Bounded memory | Inconsistent aggregation |
| Two-stage checks | Fast broad signal, deep follow-up | Follow-up may be delayed |
| Concurrency limits | Protect warehouse/platform | Monitoring finishes late |

Set an SLO for result freshness and apply backpressure rather than launching unlimited overlapping jobs.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Benchmark full data and a stratified sample.</li><li>Compare score and runtime differences.</li><li>Set an acceptable error and freshness budget.</li></ol></div>

## 6. Store history and build useful dashboards

Persist machine-readable snapshots and manifests in immutable or append-only storage. If you use an Evidently workspace/dashboard, organize projects by owned service or model domain, not by whoever created a notebook. Dashboard panels should show status, coverage, reference identity, trend, and links to investigation evidence.

```text
dashboard status = metric result + run status + coverage + freshness
```

A green metric from yesterday is not a current healthy state. Distinguish `healthy`, `warning`, `critical`, `no_data`, `failed`, and `stale` visually and in APIs.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Create a four-week trend view.</li><li>Mark one missing run as `no_data`, not green.</li><li>Add baseline and report versions to drill-down details.</li></ol></div>

## 7. Enforce privacy, access, and retention before execution

Allowlist columns before they enter monitoring workers. Aggregate or tokenize sensitive attributes when the diagnostic permits it. Separate protected fairness analysis from broad operational dashboards. Encrypt storage, restrict projects by team, log access, and expire artifacts according to policy.

| Control point | Required decision |
|---|---|
| Extraction | Which columns and rows are necessary? |
| Transform | Which values require tokenization or aggregation? |
| Compute | Which worker environment may process this class? |
| Store | Who can read snapshots and for how long? |
| Alert | Which safe summary can leave the monitoring system? |

<div class="guide-try"><span class="ct">Try it</span><ol><li>Write a column allowlist.</li><li>Attempt to add an email field and make policy reject it.</li><li>Test artifact expiry and access denial.</li></ol></div>

## 8. Route alerts into an owned triage process

An alert needs model, window, severity, affected metrics/slices, baseline, dashboard link, playbook, and owner. Deduplicate repeated windows and group related feature movement. First verify data readiness and schema, then establish whether the change is expected, inspect outputs and performance, and choose observe, fix data, rollback, retrain, or approve an exception.

```text
alert -> validate batch -> inspect change -> assess model impact -> action
          data owner        domain owner       model owner       incident lead
```

<div class="guide-try"><span class="ct">Try it</span><ol><li>Write one complete alert payload.</li><li>Run a tabletop where an upstream category mapping changes.</li><li>Measure time to the correct owner and diagnosis.</li></ol></div>

## 9. Roll out monitoring changes without breaking trust

A detector upgrade, threshold edit, schema revision, or new baseline can change alert behavior even when model traffic is identical. Treat monitoring changes as production releases. Build a replay set containing stable windows, seasonal peaks, known incidents, sparse slices, and failure cases. Run old and candidate contracts side by side before activation.

| Rollout stage | Evidence | Exit condition |
|---|---|---|
| Offline replay | Old/new scores on frozen windows | Differences are explained |
| Shadow | Candidate computes but does not page | Alert volume and latency fit budget |
| Limited activation | One model or tenant uses candidate | Owner confirms actionable behavior |
| General activation | Version becomes approved default | Rollback remains available |

```text change lifecycle
proposal -> replay -> shadow -> limited release -> approved default
    |          |        |             |                 |
 owner      diff report alert study  responder review  audit + rollback
```

Never rewrite prior results to the new method. Historical snapshots describe the policy active at that time. If trend continuity matters, backfill a separate candidate series and label it clearly rather than mixing versions in one line.

Monitor the monitor during rollout: completion time, computation failures, alert count, duplicate rate, responder acknowledgment, and confirmed usefulness. A statistically sophisticated detector that responders cannot interpret or operate is not production-ready.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Change one threshold or detector setting.</li><li>Replay old and new contracts over five windows and produce a row-by-row diff.</li><li>Define shadow success, activation, and rollback criteria.</li></ol></div>
## 10. Complete annotated example: production monitor specification

```python production_monitor.py
from dataclasses import dataclass
from evidently import DataDefinition, Dataset, Report
from evidently.presets import DataSummaryPreset, DataDriftPreset

@dataclass(frozen=True)
class Contract:
    model: str = "churn-v12"
    version: str = "monitor-v3"
    min_rows: int = 10_000
    allowed: tuple[str, ...] = ("tenure", "plan", "prediction")

contract = Contract()
reference, current = load_versioned_windows()  # immutable baseline + complete UTC window
if len(current) < contract.min_rows:
    raise RuntimeError("input_incomplete")
if extra := set(current) - set(contract.allowed):
    current = current[list(contract.allowed)]   # projection prevents accidental exposure

schema = DataDefinition(
    numerical_columns=["tenure"],
    categorical_columns=["plan"],
)
ref_ds = Dataset.from_pandas(reference[list(contract.allowed)], data_definition=schema)
cur_ds = Dataset.from_pandas(current[list(contract.allowed)], data_definition=schema)
report = Report([DataSummaryPreset(), DataDriftPreset()])
snapshot = report.run(cur_ds, ref_ds)

run_key = make_run_key(contract.model, window_end, contract.version)
publish_snapshot_and_manifest(run_key, snapshot, contract)  # atomic, versioned
severity = evaluate_calibrated_policy(snapshot, "thresholds-v5")
notify_once(run_key, severity, owner="retention-ml")
```

<div class="guide-try"><span class="ct">Try the complete build</span><ol><li>Connect the skeleton to test doubles for storage and notification.</li><li>Exercise incomplete input, duplicate retry, policy rejection, and successful alert paths.</li><li>Publish a manifest and explain how an operator rolls back the contract.</li></ol><em>Completion means the same window can be retried safely and every state is visible.</em></div>

This skeleton deliberately leaves storage and policy adapters local to your platform while keeping Evidently's role clear. **Continue to [part three: organization-wide monitoring governance](#senior-detailed)** for multi-tenant isolation, policy registries, SLOs, baseline approval, incidents, and audit evidence.

