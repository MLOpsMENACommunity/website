# Senior interview review: Langfuse platform governance

Use this review for staff, platform, and architecture interviews. Build each answer from fundamentals, then state the policy, owner, failure mode, and rollback path.

## Fast cumulative review

| Thread | Beginner | Mid-level | Senior |
|---|---|---|---|
| Trace | Readable tree | Cross-service contract | Organization schema |
| Instrumentation | Decorator/context | Integrations and fixtures | Compatibility rollout |
| Context | User/session | Safe baggage | Tenant governance |
| Prompts | Version and label | Cache and rollback | Supply chain ownership |
| Scores | Defined measure | Calibration | Taxonomy and gates |
| Datasets | Fixed cases | CI experiments | Provenance and policy |
| Cost | Usage/latency | Reconciliation | FinOps/capacity |
| Operations | Mask/flush | Sampling/RBAC | SLO/incident/compliance |

## Platform architecture questions

### What belongs in a trace contract?

Stable root and child names, observation types, required model/release fields, safe metadata, redaction rules, ownership, and migration policy. Dashboards and evaluators consume it.

### What changed in the Python v4 data model?

Observations are primary. `start_observation` replaces separate span/generation constructors, and `propagate_attributes` applies correlating fields to current and child observations. Export filtering can change non-LLM span visibility.

### How do you roll out an SDK upgrade?

Pin, capture a fixture, compare tree shape and fields in a disposable project, stage to one service or tenant, monitor delivery and dashboards, then widen with rollback ready.

## Governance and evaluation questions

### How do you make an LLM judge trustworthy?

Use a versioned rubric, calibration references, fixed redacted data, evaluator metadata, human disagreement review, and a named owner. Keep judge output separate from release policy until validated.

### When is an experiment a release gate?

When dataset provenance, metric definition, threshold, evaluator version, exception path, and owner are stable. Otherwise it is useful exploratory evidence but not a blocking policy.

### How do you protect multi-tenant telemetry?

Enforce project and export authorization, minimize and mask content, allowlist baggage, review roles, and test cross-tenant access. Tags help filtering; they do not enforce isolation.

## Reliability and incident questions

| Failure | Diagnosis path |
|---|---|
| Missing data | Destination → keys → SDK execution → filter → network → flush |
| Tree changed | SDK/integration version → exporter filter → fixture comparison |
| Cost spike | Route → model → release → retries → usage reconciliation |
| Score drift | Dataset → prompt → model → evaluator/rubric → release |
| Stale dashboard | Ingestion queue → worker → analytical store → UI |

## Common questions to rehearse

| Question | Strong answer should cover |
|---|---|
| What belongs in the organization trace contract? | Stable schema, consumers, owner, migration window |
| How do you qualify an evaluator? | Versioned rubric, human agreement, slices, reapproval trigger |
| How do you isolate tenants? | Authorized projects and exports, masking, access tests, retention |
| How do you roll out an SDK change? | Fixture evidence, canary, SLOs, rollback, compatibility owner |
| What does a self-hosted team own? | Data stores, queues, object storage, backups, encryption, capacity |

## 60-second self-test

| Seconds | Prompt | Required idea |
|---:|---|---|
| 0-10 | Three-level spine? | Application workflow, team reliability, platform governance |
| 10-20 | Contract consumers? | Services, dashboards, evaluators, incident responders |
| 20-30 | Baggage risk? | Sensitive headers can cross an untrusted boundary |
| 30-40 | Release-gate evidence? | Provenance, versions, threshold, owner, exception path |
| 40-50 | Usage versus invoice? | Telemetry estimate needs provider reconciliation |
| 50-60 | Missing traces? | Destination, keys, execution, filter, network, flush |

<div class="callout tip"><span class="ct">Interview frame</span>Answer in layers: object model, implementation, failure mode, scale tradeoff, security boundary, and owner. Senior answers make the decision process explicit.</div>

Next: **Senior Tips & Tricks** turns the model into drills and operating habits.

## Advanced scenario: govern a multi-team rollout

| Scenario | Decision frame |
|---|---|
| Self-hosting proposal | Components, backups, encryption, capacity, responders |
| Schema migration | Consumers, compatibility window, evidence, rollback |
| Tenant isolation issue | Stop export, enforce authorization, investigate copies |
| Quality/cost tradeoff | Compare score, latency, usage, route, and owner |
