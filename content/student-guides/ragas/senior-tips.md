# Senior tips and governance lab

## Common errors

| Symptom | Cause | Fix |
|---|---|---|
| Two teams use the same metric name differently | No central versioned registry | Publish immutable definitions, owners, routes, and calibration reports |
| Judge drift blocks healthy releases | Provider alias changed without qualification | Pin routes, run anchors, quarantine drift, and maintain a qualified fallback |
| One tenant sees another tenant's cached result | Cache key or storage path lacks tenant scope | Include authenticated tenant identity and test cross-tenant denial |
| Provider outage multiplies cost | Distributed workers retry independently | Enforce route-level circuit breakers and a global retry budget |
| Exception remains active for months | Approval has no expiry automation | Require expiration, compensating control, owner, and automatic re-blocking |
| Audit cannot reproduce a decision | Manifest omits policy or immutable inputs | Store code, data, metric, judge, authorization, result, and decision versions |
| Holdout stops detecting regressions | Teams optimized against exposed cases | Restrict access, monitor exposure, and rotate contaminated cases |
| Deletion request leaves derived text | Dataset lineage ends at source row | Track transformations, judge caches, artifacts, and backup deletion policy |

## Practice cards

<div class="cards">
  <div class="card"><span class="icon">I</span><strong>Policy workshop</strong><p>Define evaluation evidence and exception rules for three service risk tiers.</p></div>
  <div class="card"><span class="icon">II</span><strong>Judge qualification</strong><p>Design a blinded agreement study with false-pass targets by critical slice.</p></div>
  <div class="card"><span class="icon">III</span><strong>Tenant threat model</strong><p>Follow identity through queues, workers, caches, artifacts, logs, and judge routes.</p></div>
  <div class="card"><span class="icon">IV</span><strong>Capacity game day</strong><p>Remove the primary judge route during peak release traffic and apply backpressure.</p></div>
  <div class="card"><span class="icon">V</span><strong>Deletion drill</strong><p>Trace one case through generated derivatives, caches, artifacts, and backups.</p></div>
  <div class="card"><span class="icon">VI</span><strong>Audit replay</strong><p>Reconstruct last month's release decision from immutable evidence.</p></div>
</div>

## Review the whole spine at platform level

| Thread | Platform control | Proof |
|---|---|---|
| Mental model | Risk-to-metric policy | Approved tier matrix |
| Dataset fields | Schema, lineage, retention, region | Dataset manifest and deletion test |
| Core metrics | Qualified, versioned registry entries | Human agreement report |
| Interpretation | Row/slice evidence and denominator | Restricted result artifact |
| Custom rubrics | Domain approval and lifecycle | Registry history |
| Test generation | Review funnel and contamination scan | Acceptance/rejection report |
| Regression gates | Tiered policy and expiring exceptions | Signed release decision |
| Security | Tenant isolation and policy judge gateway | Access test and routing audit |
| Cost/scale | Quotas, SLOs, priorities, circuit breakers | Capacity game-day report |
| Monitoring | Anchors and evaluator quarantine | Drift incident timeline |
| Ownership | Named service, metric, data, platform owners | On-call and review records |

## Set safe platform defaults

Default to private artifacts, minimal fields, tenant-scoped caches, approved judge routes, bounded retries, hard budgets, explicit metric versions, and expiring results. Let teams request broader access or retention through review instead of asking every team to discover secure settings.

## Measure the evaluator service itself

Track queue wait, completion latency, call and token count, cost, retry rate, parse failures, policy blocks, missing-result denominator, cache hit rate, judge-route health, and result-store errors. Break these down by tenant and priority without exposing content.

## Keep deterministic checks beside judge metrics

Use code for exact requirements such as JSON schema, citation syntax, forbidden identifiers, response length, and retrieved document IDs. Use evaluator models for semantic judgments. Deterministic checks reduce cost and make failures easier to reproduce.

## Run a quarterly ownership review

Ask each metric owner whether the rubric still maps to product risk, calibration remains valid, costs fit the budget, judge route remains approved, and teams act on failures. Retire metrics that no longer affect a decision.

## Incident pocket checklist

```text
1. Stop unsafe automated decisions.
2. Preserve manifests, IDs, and route health without copying sensitive text.
3. Compare anchor cases and the qualified fallback.
4. Identify judge, data, platform, or RAG-service ownership.
5. Roll back, reroute, or move to manual review.
6. Add corrective tests, owners, and deadlines.
```
