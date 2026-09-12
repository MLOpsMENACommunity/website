# Mid-level tips and practice lab

## Common errors

| Symptom | Cause | Fix |
|---|---|---|
| Yesterday's alert repeats after retry | No deterministic run key | Key by model/window/contract and notify once |
| New baseline makes history look fixed | Baseline was replaced without governance | Version, backtest, approve, and retain lineage |
| Threshold works for one feature only | Same method/rule copied everywhere | Calibrate by type, sample, and product risk |
| Minority slice disappears | Uniform sample removed rare groups | Use deterministic stratified sampling |
| Performance looks excellent | Only fast-arriving labels were joined | Report coverage/delay and analyze missing-label bias |
| Dashboard shows stale green | Freshness is not modeled | Add healthy, warning, critical, no-data, failed, stale |
| Compute jobs overload warehouse | Schedules and retries are unbounded | Admission limits, fair queues, backpressure, retry caps |
| Alert includes sensitive values | Raw diagnostic payload enters notifier | Send safe summaries and link to restricted evidence |

## Practice cards

<div class="cards">
  <div class="card"><span class="icon">A</span><strong>Calibrate drift</strong><p>Backtest ten stable and three shifted windows, then justify a threshold.</p></div>
  <div class="card"><span class="icon">B</span><strong>Build idempotency</strong><p>Retry a failed window without duplicating evidence or alerts.</p></div>
  <div class="card"><span class="icon">C</span><strong>Protect a slice</strong><p>Preserve a low-volume critical group during sampling.</p></div>
  <div class="card"><span class="icon">D</span><strong>Join outcomes</strong><p>Measure label coverage and performance seven days later.</p></div>
  <div class="card"><span class="icon">E</span><strong>Test privacy</strong><p>Reject an unapproved email column before a worker reads it.</p></div>
  <div class="card"><span class="icon">F</span><strong>Run triage</strong><p>Separate partial partition, mapping error, and real population shift.</p></div>
</div>

## Apply the cumulative checklist

| Layer | Beginner | Mid-level |
|---|---|---|
| Inputs | Reference/current | Immutable baseline, complete windows, schema version |
| Statistics | Read drift | Method and threshold calibration |
| Coverage | Overall columns | Product-risk slices and delayed labels |
| Runtime | Scheduled script | Idempotency, retries, backpressure, freshness |
| Evidence | HTML/JSON | Atomic Snapshot, manifest, history, statuses |
| Security | Remove IDs | Policy allowlist, scoped identity, access, retention |
| Action | Investigate | Severity, owner, playbook, alert dedupe |

## Prefer two-stage monitoring

Run inexpensive readiness and broad distribution checks first. Trigger deeper slice or performance diagnostics only when policy requires them. Store both stages and never hide a skipped stage.

## Preserve status and denominator

Every aggregate must state rows, successful columns/checks, missing labels, and failed calculations. `0 drifted columns out of 0 calculated` is not a healthy run.

## Review contracts like production code

Require an owner, tests, calibration evidence, privacy review, rollout plan, and rollback. Shadow a changed detector before it pages a team. A YAML edit can alter operational behavior as much as application code.
