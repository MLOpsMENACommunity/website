# Mid-level tips and production practice lab

Use these drills when a working integration starts serving real traffic. Keep the Beginner habits, then add stable trace contracts, safe context propagation, controlled prompt changes, and delivery under failure.

## Common errors

| Symptom | Cause | Fix |
|---|---|---|
| Retry cost is doubled | Every attempt is a new root | Keep one logical trace and mark attempts |
| Dashboard broke after upgrade | It depended on internal node names | Test the published contract |
| Downstream sees sensitive baggage | Context was propagated wholesale | Use an allowlist and scrub headers |
| Prompt rollout is risky | No cold-cache fallback | Define last-known-good and rollback |
| Judge score drifts | Rubric or dataset changed silently | Version both and review disagreement |
| CI gate blocks useful work | Threshold has no owner or appeal | Separate exploration from release policy |
| Spend cannot reconcile | Missing model/pricing/release fields | Add dimensions before changing prices |
| Rare failures vanish | Sampling is indiscriminate | Preserve errors and baseline samples |

## Practice cards

<div class="cards"><div class="card"><div class="icon">01</div><h4>Retry map</h4><p>Draw one request with two provider attempts. Mark the stable trace and attempt-specific generation fields.</p></div><div class="card"><div class="icon">02</div><h4>Contract test</h4><p>Assert root, retrieval, generation, release, and error behavior while ignoring incidental callback nodes.</p></div><div class="card"><div class="icon">03</div><h4>Judge calibration</h4><p>Have reviewers label a reference set, then compare judge disagreements before trusting automation.</p></div><div class="card"><div class="icon">04</div><h4>Cost variance</h4><p>Reconcile one route against a provider invoice and assign every mismatch to an owner.</p></div></div>

## Cumulative practice map

| Beginner habit | Mid-level extension |
|---|---|
| Read one trace tree | Test a published trace contract across upgrades |
| Record prompt and model versions | Run a controlled rollout with fallback and rollback |
| Define one score | Calibrate the evaluator and assign a gate owner |
| Inspect usage and latency | Reconcile route cost and set service targets |
| Mask and flush | Govern sampling, access, retention, and incidents |

## 1. Test the boundary your framework hides

Native wrappers are convenient, but the application still owns the root and its context. Put the handler inside a named operation and test one representative trace after dependency upgrades.
<ol class="guide-steps"><li><b>Pin</b>Record SDK and integration versions.</li><li><b>Fixture</b>Run one deterministic request.</li><li><b>Compare</b>Inspect tree shape, fields, delivery, and latency.</li></ol>

## 2. Pass only safe, stable request context

Use `as_baggage=True` only for a small, non-sensitive allowlist. Tenant authorization belongs in service policy and project access. Add a test that attempts cross-tenant lookup and export.

## 3. Release prompt versions like code

A label promotion needs a candidate, fixed evaluation set, approval, rollback version, and owner. Prompt caching improves latency; it does not replace rollout policy.

## 4. Separate exploratory scores from release gates

Exploratory scores answer questions. Release scores block or permit change. Use different names and dashboards so an experimental judge does not silently become a deployment dependency.

## 5. Test queues, flushes, and ingestion failure

Pin a sampling policy, keep error visibility, test masking before ingestion, and run an access review. When traces disappear, check destination, keys, SDK execution, filter, network, and flush in that order.

Next: **Senior Tips & Tricks** adds platform-level controls and failure drills.

## Intermediate practice checkpoint

Every production route should have a trace contract, fixture trace, retry policy, prompt rollback, evaluator owner, cost dimensions, sampling rule, and incident responder.
