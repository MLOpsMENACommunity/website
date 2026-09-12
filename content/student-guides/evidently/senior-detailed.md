# Part three of three: Govern Evidently as a monitoring platform

Senior ownership means deciding which signals the organization trusts, who may change them, how tenants are isolated, what happens under load, and how monitoring evidence supports releases, incidents, audits, and retirement. You still need the complete Beginner and Mid-level spine; the difference is that every choice now has policy, service-level, and accountability consequences.

## Where this picks up

| Earlier capability | Senior extension | Ownership question |
|---|---|---|
| Reference/current comparison | Baseline approval and lifecycle | Who may redefine “normal”? |
| Schema and column roles | Organization contracts and compatibility policy | Who owns a breaking feature change? |
| Quality, drift, prediction, performance | Approved metric/test registry | Which evidence may gate a model? |
| Calibrated thresholds and slices | Risk-tier policies and exception workflow | What false-negative risk is accepted? |
| Idempotent batch jobs | Multi-tenant control/data plane with SLOs | How is noisy-neighbor impact contained? |
| Snapshots and dashboards | Lineage, immutability, retention, deletion | Can a decision be reconstructed lawfully? |
| Alert triage | Incident command and blind-spot review | Who can stop or roll back a model? |
| Privacy allowlists | RBAC, purpose limits, regional routing | Who may process protected data where? |

```text organization monitoring control loop
policy -> approved contract -> isolated execution -> evidence -> decision
  ^                                                      |
  +---- incidents + calibration + audit findings --------+
```

## 1. Publish an organization-wide monitoring policy

Define monitoring tiers from model impact. A low-risk recommender may require daily data checks; a high-impact decision system may require pre-release validation, near-real-time input checks, delayed outcome review, protected-slice analysis, and a staffed response path. State mandatory signals, freshness, evidence retention, escalation, exception authority, and retirement requirements.

| Tier | Typical controls | Decision authority |
|---|---|---|
| Standard | Quality, drift, prediction trend, daily freshness | Service owner |
| Material | Calibrated slices, delayed performance, on-call | Model-risk owner |
| Critical | Independent review, strict change control, rollback drill | Named accountable executive/body |

Policy should describe outcomes, not force one detector on every feature. Platform defaults can help, while domain owners justify risk-specific settings.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Classify three models by impact.</li><li>Set evidence and response requirements for each tier.</li><li>Find one requirement that should vary by domain and document the approval path.</li></ol></div>

## 2. Operate a metric and test registry

Every approved check needs a stable ID, Evidently/library version, input contract, calculation or detector, threshold source, validation report, owner, applicable tiers, change history, and retirement status. A threshold edit is a new version because it changes automated decisions.

```yaml registry/data-drift-share-v5.yaml
id: data-drift-share
version: 5
implementation: evidently-0.7.15
inputs: feature-schema-v8
calibration: cal-2026-q3-17
applies_to: [material, critical]
owner: monitoring-methods
status: approved
```

Test changes against stable no-change windows, synthetic shifts, historical incidents, sparse categories, missing data, and large samples. Use shadow mode before a new version pages teams or blocks releases.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Draft one registry entry.</li><li>Add validation and rollback criteria.</li><li>Run old and new versions in shadow and compare alert changes.</li></ol></div>

## 3. Govern baselines as decision inputs

Baselines age. Product mix, policy, sensors, and model versions change legitimately, but replacing a baseline whenever drift appears hides incidents. Require proposals with lineage, representativeness analysis, slice coverage, known exclusions, backtests, approver, activation date, and rollback pointer.

```text
candidate baseline -> data review -> backtest old/new -> risk approval -> activate
       |                                                         |
       +---------------- immutable lineage + rollback ------------+
```

Use rolling references only where their gradual adaptation matches the risk. Keep a stable anchor to detect slow movement that rolling windows absorb. Retraining triggers should combine drift, performance, business impact, and data validity rather than automatically retrain on one statistic.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Propose a baseline after a product launch.</li><li>Backtest it against one incident.</li><li>Require an approver other than the person suppressing the alert.</li></ol></div>

## 4. Design a multi-tenant monitoring architecture

Separate a **control plane** that manages identity, policy, contracts, registry versions, scheduling, and audit from a **data plane** that extracts approved fields, runs Evidently, and writes evidence. Isolate tenants with scoped identities, storage prefixes/projects, encryption boundaries, quotas, and regional routing.

<div class="guide-arch" style="grid-template-columns:1fr auto 1fr auto 1fr"><div class="arch-node" data-kind="entry"><b>Control plane</b><small>policy, registry, schedule</small></div><i class="arch-edge" data-dir="right"></i><div class="arch-node" data-kind="worker"><b>Tenant workers</b><small>allowlisted Evidently runs</small></div><i class="arch-edge" data-dir="right"></i><div class="arch-node" data-kind="store"><b>Tenant evidence</b><small>isolated snapshots</small></div><div class="arch-note">Short-lived workload identity replaces shared warehouse and object-store credentials.</div></div>

RBAC roles may include contract author, approver, operator, incident responder, auditor, and reader. Test denial: a team must not read another tenant's report, alter an approved metric, or point a worker at an unapproved source.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Draw trust boundaries and identities.</li><li>Attempt cross-tenant read and contract mutation.</li><li>Verify denials are logged without leaking protected values.</li></ol></div>

## 5. Define platform SLOs, capacity, and backpressure

Monitoring is useful only when it arrives before the decision it supports. Track input-to-result freshness, successful-run ratio, alert-delivery latency, result durability, and false-alert burden. Separate platform failures from healthy model results.

| SLO | Example indicator | Failure action |
|---|---|---|
| Freshness | 99% of daily results within 3 hours | Prioritize critical tier, flag stale |
| Completion | 99.5% valid scheduled runs | Retry boundedly, page platform |
| Alert delivery | Critical event delivered in 5 minutes | Secondary route |
| Evidence durability | Snapshot and manifest retrievable | Restore/test backup |

Estimate peak rows, monitored columns, methods, slices, schedule bursts, and retention. Apply per-tenant quotas and fair queues. Shed optional deep diagnostics before mandatory checks, but never mark skipped work healthy.

```text overload
admission -> tier queue -> bounded workers -> evidence publish
              |                 |
         fair tenant share   backpressure, not job storms
```

<div class="guide-try"><span class="ct">Try it</span><ol><li>Load-test a schedule boundary.</li><li>Throttle one noisy tenant.</li><li>Confirm critical work remains fresh and deferred checks show `skipped_capacity`.</li></ol></div>

## 6. Make evidence secure, reproducible, and erasable

Decision-grade evidence links source snapshots, transformations, schema, model, baseline, metric versions, code image, environment, timestamps, statuses, results, policy decision, and approver. Sign or checksum manifests and keep them append-only where required.

Security and deletion can conflict with audit retention. Classify artifacts, minimize raw values, separate restricted payload from long-lived aggregate evidence, enforce legal holds, and support deletion through indexed lineage. A checksum proves bytes are unchanged; it does not prove source data or policy was correct.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Reconstruct a six-month-old alert from manifests.</li><li>Delete one subject's restricted payload through lineage.</li><li>Keep lawful aggregate decision evidence and record the deletion.</li></ol></div>

## 7. Control release gates, retraining triggers, and exceptions

Use tiered decisions: deterministic schema rules first, calibrated monitoring and performance rules next, then human review for ambiguous high-impact cases. Fail closed only where risk and operational readiness justify it; otherwise expose `unknown` explicitly.

| Decision | Required evidence | Guardrail |
|---|---|---|
| Continue | Fresh valid signals within limits | Coverage and sample minimums |
| Investigate | Warning drift or slice change | Owner and due date |
| Roll back | Confirmed harmful model/deployment change | Tested rollback path |
| Retrain | Persistent shift plus quality/business evidence | Approved data and validation |
| Exception | Documented risk acceptance | Scope, compensating control, expiry |

Exceptions need requester, reason, affected contract version, impact assessment, approver, compensating monitoring, expiration, and audit event. Permanent mute buttons are unmanaged policy changes.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Create a seven-day exception.</li><li>Add compensating manual review and an owner.</li><li>Verify it expires automatically and paging resumes.</li></ol></div>

## 8. Run incidents and investigate monitoring blind spots

Name incident commander, data owner, model owner, platform operator, domain expert, security/privacy contact, and communications owner. Preserve evidence before changing baselines. Establish whether the batch and monitor are trustworthy, assess customer impact, contain the issue, recover, then review.

```text
signal -> validate monitor -> scope impact -> contain -> recover -> learn
             |                   |                         |
       platform/data owner   incident command      policy + tests + baseline
```

A post-incident review must ask what the monitor missed: unobserved feature, inadequate slice, delayed label bias, threshold weakness, stale result, alert-routing failure, or ownership gap. Promote the lesson into a contract, test, playbook, or policy change with an owner.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Simulate quality loss with no feature drift.</li><li>Escalate despite a green drift dashboard.</li><li>Add the missing signal without pretending drift predicts all quality failures.</li></ol></div>

## 9. Measure the monitoring program itself

Report coverage of in-scope models, freshness by tier, unowned contracts, stale baselines, alert precision, acknowledgment and resolution time, exception age, calibration age, and recurring causes. Do not reward teams for fewer alerts if they can achieve that by weakening checks.

| Weak KPI | Better paired view |
|---|---|
| Number of monitors | Risk-weighted model and signal coverage |
| Alerts per month | Actionable rate plus confirmed misses |
| Green dashboard rate | Fresh valid results plus unknown/failure rate |
| Mean resolution time | By severity, owner, and root cause |

<div class="guide-try"><span class="ct">Try it</span><ol><li>Build a quarterly scorecard.</li><li>Include one detection-quality and one ownership measure.</li><li>Assign remediation for stale baselines and expired calibration.</li></ol></div>

## 10. Validate platform changes independently

The team that builds the monitoring platform should not be the only team deciding whether its controls work for high-impact models. Establish independent validation proportional to risk. Review method assumptions, calibration data, access boundaries, failure handling, evidence integrity, deletion behavior, and responder readiness. Independence can come from model risk, security, privacy, internal audit, or a qualified domain review body.

| Change | Independent challenge |
|---|---|
| New approved detector | Does validation cover realistic stable and harmful shifts? |
| Tenant isolation change | Can unauthorized access or mutation cross the boundary? |
| New storage/retention policy | Are legal hold, expiry, and deletion all testable? |
| Critical-tier SLO change | Does the weaker target increase unobserved decision risk? |
| Automated retraining link | Can bad monitoring evidence trigger unsafe model change? |

Use evidence-based sign-off, not a ceremonial checklist. Findings need severity, owner, deadline, and verification. Material unresolved findings either block activation or enter the formal exception process with compensating controls.

```text assurance layers
team tests -> platform verification -> independent challenge -> controlled approval
     |                |                       |
 code behavior   tenancy/SLO/failure      risk and legal fitness
```

This does not remove service-team responsibility. The model owner remains accountable for domain coverage and response; the platform owner remains accountable for service behavior; the independent reviewer challenges whether the combined system supports the claimed control.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Choose one critical monitoring change.</li><li>Assign a reviewer outside the implementation team and define evidence they receive.</li><li>Record one simulated finding through remediation and verification.</li></ol></div>
## 11. Complete annotated example: policy-controlled platform request

```yaml monitor-request.yaml
apiVersion: monitoring.company/v1
kind: EvidentlyMonitor
metadata:
  tenant: retention
  model: churn-v12
  contractVersion: 3
spec:
  riskTier: material
  schema: feature-schema-v8
  reference: baseline://churn/approved/2026-08
  current: warehouse://features/churn/${WINDOW}
  allowlistedColumns: [tenure, plan, prediction]
  checks:
    - {registryId: data-quality, version: 4}
    - {registryId: data-drift-share, version: 5}
    - {registryId: prediction-drift, version: 3}
  slices:
    - {column: region_group, minimumRows: 500}
  runtime:
    region: eu
    maximumRows: 200000
    deadlineMinutes: 90
  evidence:
    retentionDays: 90
    classification: confidential
  alert:
    owner: retention-ml
    playbook: runbook://model-drift/v6
```

The admission service validates policy, registry approvals, source purpose, region, identity, quotas, and ownership. An isolated worker projects allowed columns, builds explicit Evidently datasets, runs pinned report definitions, publishes snapshot plus signed manifest, and sends a safe decision summary. The audit event records admission, versions, statuses, and any approved exception—never unrestricted source rows.

<div class="guide-try"><span class="ct">Try the complete platform review</span><ol><li>Submit this request through a mock admission policy.</li><li>Test cross-tenant denial, overload, stale input, evidence deletion, and an expiring exception.</li><li>Ask an independent reviewer to reconstruct and challenge the final decision.</li></ol><em>Completion means the platform remains understandable when data, infrastructure, or governance controls fail.</em></div>

You have completed the spine: **compare and explain**, **operate and calibrate**, then **govern and own**. Revisit the earlier examples whenever a platform abstraction makes the underlying reference/current comparison unclear.

