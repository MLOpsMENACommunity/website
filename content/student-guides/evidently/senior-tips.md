# Senior tips and practice lab

## Common errors

| Symptom | Cause | Fix |
|---|---|---|
| Teams tune away every alert | Baseline/threshold changes lack approval | Version registry and require risk-based review |
| One tenant delays all results | Shared unbounded execution | Quotas, fair queues, tenant workers, priority tiers |
| Auditor cannot replay a gate | Incomplete lineage or mutable artifacts | Signed manifest, immutable versions, decision event |
| Monitoring stores excessive PII | “Debug later” extraction policy | Purpose-bound allowlists and restricted short retention |
| Retraining loops after drift | Single signal directly triggers retraining | Require validity, persistence, performance, and approval |
| Exception never ends | Mute has no expiry or owner | Scoped exception object with automatic expiration |
| All dashboards are green during outage | Platform state mixed with metric state | Separate failed, stale, no-data, unknown, and healthy |
| Slow shift is invisible | Rolling baseline adapts continuously | Keep stable anchors and baseline-change controls |

## Practice cards

<div class="cards">
  <div class="card"><span class="icon">I</span><strong>Design tenancy</strong><p>Test cross-tenant reads, writes, quotas, and audit logs.</p></div>
  <div class="card"><span class="icon">II</span><strong>Approve a baseline</strong><p>Backtest a candidate against seasonality and a known incident.</p></div>
  <div class="card"><span class="icon">III</span><strong>Load-test SLOs</strong><p>Burst all schedules and protect critical-tier freshness.</p></div>
  <div class="card"><span class="icon">IV</span><strong>Exercise deletion</strong><p>Remove restricted payload while retaining lawful decision metadata.</p></div>
  <div class="card"><span class="icon">V</span><strong>Expire an exception</strong><p>Verify paging and policy enforcement resume automatically.</p></div>
  <div class="card"><span class="icon">VI</span><strong>Find a blind spot</strong><p>Simulate performance loss with low data drift and improve coverage.</p></div>
</div>

## Use the complete ownership checklist

| Plane | Questions before approval |
|---|---|
| Policy | Which risk tier, signals, freshness, and authority apply? |
| Contract | Are source, schema, baseline, methods, slices, owners, and versions explicit? |
| Data | Is processing necessary, regional, minimized, and erasable? |
| Runtime | Are identity, isolation, quota, backpressure, and recovery tested? |
| Evidence | Can status and decision be reconstructed without retaining excess data? |
| Response | Can the owner acknowledge, contain, rollback, and escalate? |
| Change | Is validation, shadowing, approval, rollback, and audit complete? |

## Keep a stable anchor

Rolling baselines reduce seasonal noise but can normalize gradual harmful movement. Pair them with a longer-lived reviewed anchor and explicit performance signals. The two answer different questions: “did today differ from recent traffic?” and “how far did we move from approved behavior?”

## Test denial paths

A platform review is incomplete if it only proves allowed work succeeds. Test unapproved sources, columns, registry versions, regions, contract mutations, tenant reads, quota excess, and expired exceptions. Denials should be safe, observable, and attributable.

## Measure blind spots, not only alerts

Track confirmed incidents with no preceding useful signal, stale or failed monitor time, label coverage, slice coverage, and unowned contracts. Monitoring quality includes what the platform failed to observe.

## Run quarterly governance drills

Reconstruct an old decision, rotate workload identity, restore evidence, process a deletion, saturate queues, roll back a registry version, and expire an exception. Record owners and remediation dates for every failed control.
