# Senior interview review: Evidently platform governance

This review is cumulative: Beginner comparison and diagnosis, Mid-level production reliability, and Senior policy, multi-tenancy, risk ownership, platform SLOs, incidents, and auditability.

## Fast cumulative review

| Topic | Beginner | Mid-level | Senior |
|---|---|---|---|
| Purpose | Quality, drift, prediction, performance | Reliable evidence pipeline | Risk-tier monitoring policy |
| Data | Reference/current and roles | Contracts, slices, delayed joins | Purpose, region, lineage, deletion |
| Baseline | Legitimate comparison | Immutable and versioned | Approval lifecycle, anchors, rollback |
| Methods | Read column results | Calibrate by type/sample/risk | Approved metric/test registry and shadow rollout |
| Decisions | Investigate signal | Severity, owner, playbook | Release/retrain/exception authority |
| Runtime | Scheduled report | Idempotent bounded batch | Multi-tenant control/data planes and fair queues |
| Results | Snapshot and manifest | Atomic history and states | Signed decision evidence and legal retention |
| Security | Minimize fields | Policy before execution | RBAC, isolation, short-lived identity, regional route |
| Reliability | Complete windows | Freshness and compute controls | Tiered SLOs, capacity, backpressure, disaster recovery |
| Incidents | Diagnose data first | Routed triage | Incident command and blind-spot remediation |
| Ownership | Named responder | Data/model/platform owners | Accountable risk body and expiring exceptions |

## Platform architecture

```text
CONTROL: identity -> policy -> registry -> admission -> audit
                                      |
DATA:       approved source -> isolated worker -> tenant evidence -> safe alert
```

## Governance decisions

| Decision | Evidence required | Independent control |
|---|---|---|
| Change detector | Validation and shadow comparison | Registry approver |
| Replace baseline | Representativeness and incident backtest | Risk owner |
| Retrain | Persistent shift plus quality/business impact | Model validation |
| Mute/exception | Scoped reason and compensating control | Expiring approval |
| Delete evidence | Classification, retention, legal hold | Audited lineage workflow |

## Common interview questions

### How would you govern Evidently across many teams?
Offer a policy-driven control plane, approved contracts and metric registry, isolated tenant workers and evidence, scoped identity, quotas, SLOs, audited changes, and clear model/data/platform ownership.

### Who can change a baseline?
An authorized proposer submits lineage, representativeness, slice coverage, and backtests; a risk-appropriate approver activates it. The old baseline and rollback pointer remain available.

### Why separate control and data planes?
Policy and identity can be managed centrally while sensitive data is processed in isolated environments. This limits blast radius and supports regional and tenant boundaries.

### What should happen during overload?
Admission control and fair queues prioritize mandatory high-risk checks, bound workers, defer optional diagnostics, expose skipped/stale states, and protect source systems.

### How do you make an exception safe?
Scope it to a rule/model/window, document risk, require authority and compensating controls, set automatic expiry, and audit creation and closure.

### How do you prove a past decision?
Retrieve the source/baseline lineage, transformations, versions, code image, result Snapshot, status, policy evaluation, timestamps, approver, and integrity proof.

## 60-second self-test

| Seconds | Prompt | Required phrase |
|---:|---|---|
| 0–10 | Policy basis? | Model impact and risk tier |
| 10–20 | Detector change? | Registry, validation, shadow, approval |
| 20–30 | Tenant safety? | Isolation, scoped identity, quotas, RBAC |
| 30–40 | Overload response? | Fair queue, backpressure, explicit skipped state |
| 40–50 | Baseline change? | Lineage, backtest, approval, rollback |
| 50–60 | Exception rule? | Scoped, compensated, approved, expiring, audited |
