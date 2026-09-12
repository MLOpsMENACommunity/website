# Senior interview review: RAG evaluation governance

This review includes Beginner and Mid-level practice, then adds organization policy, judge qualification, multi-tenant architecture, capacity, auditability, and incident ownership.

## Fast cumulative review

| Thread | Beginner | Mid-level | Senior |
|---|---|---|---|
| Evaluation model | Four component metrics | Risk and failure taxonomy | Service tiers and organization metric policy |
| Data | Typed rows | Versioned contracts and slices | Lineage, region, retention, deletion, holdout controls |
| Metrics | Core classes | Calibrated variants | Versioned registry and lifecycle |
| Judges | Stable settings | Human-labeled calibration | Qualification studies, champions, fallbacks, reapproval |
| Custom rubrics | Clear definition | Boundary and agreement tests | Domain-owner approval and immutable versions |
| Test generation | Curated examples | Reviewed synthetic candidates | Portfolio coverage and contamination controls |
| Gates | Fair one-change comparison | Paired CI and slice gates | Tiered policy, exceptions, canary, rollback |
| Security | Minimize and redact | Approved routes and access | Tenant isolation, regional routing, encryption, access review |
| Scale | Small run | Bounded batch execution | SLOs, quotas, priority queues, backpressure, chargeback |
| Monitoring | Read failed rows | Sample production and anchors | Evaluator quarantine and incident command |
| Evidence | Save result | Reproducible manifest | Tamper-evident audit decision record |

## Platform boundary

```text
CONTROL PLANE                         DATA PLANE
identity + policy                     tenant queues
metric registry      -> plan ->       isolated workers -> judge gateway
lineage catalog                        checkpointed artifacts
         \____________ audit + cost + SLO stream ____________/
```

## Judge qualification scorecard

| Evidence | Question |
|---|---|
| Human inter-reviewer agreement | Do trained humans share the rubric? |
| False-pass rate | How often does the judge approve a dangerous failure? |
| False-fail rate | How often does it block an acceptable answer? |
| Slice performance | Does it work across language, product, and risk? |
| Rerun stability | Does the same case receive a stable decision? |
| Cost and latency | Can the route meet release SLOs? |

## Incident decision tree

```text
score shift
├─ anchors also shift -> quarantine judge -> activate qualified fallback
└─ anchors stable
   ├─ one product slice -> service owner investigates RAG/input drift
   └─ platform errors -> stop route, preserve manifests, control retries
```

## Common interview questions

### What belongs in a metric registry?
Immutable ID, implementation and library version, required fields, judge route, owner, calibration report, thresholds, cost estimate, lifecycle state, and review date.

### How do you isolate tenants?
Carry authenticated tenant identity through authorization, queues, workers, object keys, encryption, logs, and cache keys. Test cross-tenant denial and avoid shared content caches without an approved threat model.

### What makes an exception governable?
It names the failed policy and slices, accountable approver, rationale, compensating control, expiry, and rollback. The platform expires it automatically and reports active exception risk.

### How do you plan capacity?
Model cases, metrics, judge calls, token distributions, retries, queue wait, worker concurrency, provider quotas, and artifact growth. Reserve capacity for release gates and shed exploratory work first.

### What triggers judge requalification?
Judge-model or prompt changes, RAGAS/metric changes, domain shifts, anchor drift, material rubric edits, or scheduled review for high-risk use.

### What evidence must survive a release?
Requester and authorization, code and dataset revisions, metric and judge versions, policy decision, row artifacts, failures, cost, approvals, exceptions, timestamps, and deployment result.

## 60-second self-test

| Seconds | Prompt | Required idea |
|---:|---|---|
| 0–10 | Policy unit? | Risk tier with evidence, gates, owner |
| 10–20 | Judge approval? | Human agreement and slice false-pass study |
| 20–30 | Isolation? | Tenant identity at every boundary and cache |
| 30–40 | Capacity? | Calls, tokens, retries, priority, backpressure |
| 40–50 | Drift response? | Anchors, quarantine, qualified fallback |
| 50–60 | Audit proof? | Immutable manifest plus accountable decision |
