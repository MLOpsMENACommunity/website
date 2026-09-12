# Senior tips and platform governance lab

Use these drills when teams depend on Langfuse for release decisions, debugging, or compliance evidence. Test the policy and failure path, not only the happy-path SDK call.

## Common errors

| Symptom | Cause | Fix |
|---|---|---|
| Upgrade disconnected traces | Export filter dropped a parent scope | Compare fixture traces and allowlist required scopes |
| Tenant export crossed boundaries | Tags were used as authorization | Enforce project and export policy |
| Prompt outage changed answers | Cold-cache behavior was undefined | Keep last-known-good or fail closed intentionally |
| Gate passed after data drift | Dataset changed without provenance | Version cases and expected criteria |
| Judge quality fell | Rubric or evaluator changed silently | Version, calibrate, and review disagreements |
| Cost is “close enough” | Estimates were treated as invoices | Reconcile by model, route, provider, and pricing version |
| Compliance review is slow | Retention and access decisions are undocumented | Publish policy and evidence owners |
| Incident has no responder | Dashboard ownership was implicit | Put service and platform owners in the runbook |

## Practice cards

<div class="cards"><div class="card"><div class="icon">01</div><h4>Schema migration</h4><p>Rename one observation while keeping dashboards alive through a compatibility window. Write the deprecation date.</p></div><div class="card"><div class="icon">02</div><h4>Tenant drill</h4><p>Attempt a cross-tenant browse and export. Prove that tags cannot bypass the authorization boundary.</p></div><div class="card"><div class="icon">03</div><h4>Upgrade canary</h4><p>Compare pinned and candidate SDK traces from one fixed fixture before widening the rollout.</p></div><div class="card"><div class="icon">04</div><h4>Gate appeal</h4><p>Fail a release score and practice the exception, owner, evidence, and rollback path.</p></div></div>

## Cumulative practice map

| Topic spine | Beginner practice | Mid-level practice | Senior practice |
|---|---|---|---|
| Traces | Read one request | Test the service contract | Govern schema and migrations |
| Prompts and scores | Version and compare | Calibrate and gate | Approve policy and exceptions |
| Data and security | Minimize capture | Control access and retention | Prove tenant isolation and deletion |
| Cost and reliability | Inspect usage and flush | Reconcile and alert | Plan capacity, SLOs, and backpressure |
| Ownership | Keep a small runbook | Assign service responders | Audit platform decisions and incidents |

## 1. Enforce trace contracts in CI

Check required root names, observation types, release fields, redaction behavior, and error traces in CI. Ignore incidental nodes that integrations may add. Store the contract beside the service ownership metadata.

## 2. Canary SDK and schema upgrades

Capture before/after traces, compare delivery and dashboard freshness, and stage by service or tenant. Keep debug logging available during the canary, then remove broad verbosity after the decision.

## 3. Test privacy and tenant boundaries

Test nested inputs, metadata, baggage, exports, access roles, retention deletion, and logs. A masking callback that only handles one string shape is not a privacy program.

## 4. Assign owners to evaluation policy

Keep evaluator, rubric, dataset, prompt, model, and release versions together. Separate exploratory metrics from gates. Every exception needs a person, a reason, and an expiry.

## 5. Review cost beside quality and latency

Pair cost with quality and latency. A cheaper model that increases retries or support failures may increase total cost. Reconcile telemetry estimates with provider billing and document pricing changes.

## 6. Rehearse the incident path

For missing traces: destination, credentials, SDK execution, filter, network, queue, and flush. For quality drift: dataset, prompt, model, evaluator, release. For cost drift: route, model, retries, usage, pricing.

<div class="guide-timeline"><div class="guide-timeline-item"><span>0m</span><strong>Preserve evidence</strong><small>Pin the release and save representative traces.</small></div><div class="guide-timeline-item"><span>5m</span><strong>Identify the dimension</strong><small>Separate code, model, prompt, data, evaluator, and ingestion.</small></div><div class="guide-timeline-item"><span>10m</span><strong>Choose the owner</strong><small>Assign service, platform, security, or quality response.</small></div><div class="guide-timeline-item"><span>15m</span><strong>Decide and record</strong><small>Rollback, gate, mask, or continue with an explicit reason.</small></div></div>

Next: return to Beginner when a new teammate needs the model; return to Mid-level when a service needs reliability; return to Senior when the organization needs a policy.

## Advanced platform checkpoint

Review platform health as a quarterly ownership exercise: compatibility matrix, capacity forecast, access review, retention evidence, evaluator calibration, cost variance, and rollback rehearsal.
