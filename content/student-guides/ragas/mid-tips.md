# Mid-level tips and practice lab

## Common errors

| Symptom | Cause | Fix |
|---|---|---|
| CI compares different cases | Rows lack stable IDs or snapshots drifted | Version cases and join baseline/candidate by case ID |
| Threshold blocks acceptable answers | Chosen as a round number | Calibrate against human labels and release risk |
| Synthetic suite looks excellent | Generator and judge share bias; weak cases were accepted | Review candidates, use diverse models, and keep expert/production cases |
| Retries inflate the bill | Permanent failures are retried | Retry only transient errors and cap attempts and total budget |
| Cache returns stale scores | Key omits metric, prompt, judge, or input version | Hash the complete sanitized evaluation request |
| Critical language regresses while mean rises | Gate checks aggregate only | Add minimum sample sizes and slice-specific rules |
| Sensitive case reaches public judge | Routing occurs after submission | Authorize and transform before queueing any call |
| Upgrade changes scores silently | Metric/library version missing from artifacts | Version the metric, run anchors, recalibrate, and preserve old evidence |

## Practice cards

<div class="cards">
  <div class="card"><span class="icon">A</span><strong>Write a contract</strong><p>Validate IDs, contexts, references, slice, and source revision before RAGAS runs.</p></div>
  <div class="card"><span class="icon">B</span><strong>Calibrate a gate</strong><p>Compare one metric with 20 human labels and calculate false passes at three thresholds.</p></div>
  <div class="card"><span class="icon">C</span><strong>Build paired CI</strong><p>Report row deltas and block a regression in a critical account-security slice.</p></div>
  <div class="card"><span class="icon">D</span><strong>Bound a batch</strong><p>Set concurrency, timeout, retry cap, token budget, and cancellation behavior.</p></div>
  <div class="card"><span class="icon">E</span><strong>Review generation</strong><p>Reject duplicate, ambiguous, unsupported, or leaked synthetic cases.</p></div>
  <div class="card"><span class="icon">F</span><strong>Drift drill</strong><p>Run stable anchor cases beside a changed production slice and identify the moving component.</p></div>
</div>

## Apply the cumulative evaluation checklist

| Layer | Beginner check | Mid-level check |
|---|---|---|
| Data | Correct four fields | Schema, IDs, provenance, slices, snapshot hash |
| Metrics | Match field relationships | Variant, calibration, version, boundary cases |
| Execution | Small reproducible run | Smoke, concurrency, retries, checkpoints, cost |
| Comparison | Same rows and judge | Paired statistics, critical slices, CI artifact |
| Security | Minimize and redact | Allowlist, policy route, access, retention, audit |
| Monitoring | Read failed rows | Production samples, anchors, incident promotion |

## Use a two-stage suite

Run deterministic validation and a tiny RAGAS smoke set first. Run the expensive full suite after those checks pass. This reduces feedback time and prevents avoidable judge calls.

```yaml ci-plan.yaml
stages:
  - schema-and-contract
  - deterministic-retrieval-checks
  - ragas-smoke-5-cases
  - ragas-full-paired-suite
  - publish-restricted-artifact
```

## Preserve missing results

Do not convert evaluator errors to zero or silently remove the row. Store status such as `success`, `rate_limited`, `parse_error`, `policy_blocked`, or `cancelled`. Report the successful denominator with every aggregate.

## Review custom metrics like code

Require a domain owner, rubric text, examples, required fields, judge route, calibration report, version, and retirement date. A wording edit creates a new metric version because it can change release behavior.

## Promote incidents carefully

Turn a production failure into a regression case only after privacy review, source verification, and reference approval. Store a sanitized case and link its restricted incident record through an opaque ID.
