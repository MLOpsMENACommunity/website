# Mid-level interview review: production Evidently monitoring

This review includes all Beginner foundations and adds versioned contracts, calibrated detectors, slices, delayed labels, idempotent pipelines, scale, privacy, result history, and owned triage.

## Fast cumulative review

| Topic | Beginner foundation | Mid-level answer |
|---|---|---|
| Data pair | Reference versus current | Immutable baseline plus complete, versioned window contract |
| Schema | Explicit roles | Compatibility check and allowlisted feature version |
| Quality | Validate batch structure | Block execution on readiness/schema failure |
| Drift | Inspect changed distributions | Calibrate method and threshold by feature, sample, and risk |
| Predictions | Watch output change | Link model/version and inspect by slice |
| Performance | Compute with labels | Delayed join, coverage, delay, and bias checks |
| Results | Save HTML/JSON Snapshot | Atomic evidence store with manifest and statuses |
| Scheduling | Recurring job | Idempotent run key, bounded retry, notify once |
| Scale | Run a batch | Projection, deterministic stratified sampling, quotas, freshness SLO |
| Security | Minimize data | Pre-execution policy, tokenization, access, retention, regional route |
| Ownership | Manual diagnosis | Actionable severity, playbook, data/model/platform owners |

## Pipeline diagram

```text
complete window -> contract/privacy -> Evidently workers -> evidence store
       |                                      |                |
  no data != healthy                  bounded compute    severity + owner
```

## Detector selection

| Question | Good answer |
|---|---|
| Why not use defaults forever? | Sensitivity varies by data type, sample size, and business risk |
| How calibrate? | Stable windows for false alerts; known/injected shifts for detection |
| How handle seasonality? | Comparable references or explicit seasonal policy |
| Why slices? | Aggregate stability can hide localized harm |
| How sample? | Deterministic and stratified, preserving rare critical groups |

## Common interview questions

### How do you choose a drift threshold?
Backtest stable windows and known shifts, assess false alerts and misses by feature/slice, then choose warning and critical boundaries tied to response cost. Version the result.

### How do you prevent duplicate alerts?
Use a deterministic key from model, window, and contract version; publish atomically and mark notification delivery for that key.

### How do you monitor when labels arrive late?
Run early quality/drift checks, then a delayed protected join for outcomes. Report label coverage and delay with performance.

### How do you reduce cost on large tables?
Project monitored columns, filter at storage, sample deterministically by important strata, use a broad first stage, and bound worker concurrency.

### What belongs in a run manifest?
Model, schema, reference, current boundaries, rows/sample, report and threshold versions, Evidently version, code image, status, and timestamps.

### How do you secure monitoring data?
Authorize source purpose, allowlist and transform before execution, use scoped identities, encrypt and isolate evidence, limit access, and expire it.

## 60-second self-test

| Seconds | Prompt | Required phrase |
|---:|---|---|
| 0–10 | Contract essentials? | Schema, windows, minimum rows, metrics, owners |
| 10–20 | Threshold basis? | Backtest, risk, false alerts and misses |
| 20–30 | Hidden subgroup? | Approved slices plus minimum sample |
| 30–40 | Retry safety? | Idempotent key and atomic publish |
| 40–50 | Large-window controls? | Projection, stratified sample, concurrency |
| 50–60 | Unknown state? | Failed, stale, no data are not healthy |
