# Mid-level interview review: reliable production Langfuse

Use this review after the production lesson. Interviewers at this level expect tradeoffs, failure modes, and a clear reason for each design choice.

## Fast cumulative review

| Topic | Beginner answer | Mid-level extension |
|---|---|---|
| Trace | End-to-end request | Contracted logical operation across services |
| Observation | Work inside trace | Stable type/name boundary with required fields |
| Context | User and session | Baggage allowlist and tenant ownership |
| Prompt | Versioned template | Cache, fallback, rollout, rollback |
| Score | Defined measurement | Calibrated human and automated evaluators |
| Dataset | Fixed cases | CI experiment and governed threshold |
| Cost | Usage and latency | Provider reconciliation and route SLO |
| Safety | Mask and flush | Sampling, retention, RBAC, incident runbook |

## Integration and failure-mode questions

### How should retries appear?

Keep one logical trace. Represent provider attempts as children or events with bounded retry metadata. Do not create a new user-facing trace per attempt or aggregate latency and cost will be misleading.

### Why test tree shape instead of node count?

Integrations add internal nodes across versions. The contract should assert the root, important child boundaries, required fields, and error behavior, not brittle implementation details.

### When is baggage unsafe?

Whenever values could be sensitive or reach untrusted downstream systems. Baggage is sent in outbound headers; allowlist non-sensitive correlation fields.

## Evaluation and release questions

### What makes an LLM judge credible?

A named rubric, reference examples, evaluator version, fixed dataset, and reviewed human disagreement. A judge is an aid to measurement, not an objective oracle.

### When should a score block deployment?

Only after the dataset, metric, threshold, and exception owner are stable. Keep exploratory scores separate from release gates.

### How do you compare prompts?

Hold dataset, model, release context, and evaluator constant. Change the prompt version, run the experiment, inspect representative traces, and document the decision.

## Production operations review

| Symptom | Likely cause | First action |
|---|---|---|
| Counts fell after upgrade | SDK filter or integration change | Compare fixture traces and versions |
| Spend rose | Model, retry, or token shift | Group by route, model, and release |
| Tenant data appears together | Project or access boundary wrong | Stop export and review authorization |
| Errors are absent | Sampling policy or filter | Preserve error path and inspect debug logs |

## Common questions to rehearse

| Question | Strong answer should cover |
|---|---|
| How do you keep retries readable? | One logical trace, attempt children, bounded policy |
| When can a score block a release? | Stable data, calibrated rule, owner, exception path |
| How do you protect distributed context? | Baggage allowlist, masking, authorization, access tests |
| How do you explain a cost increase? | Route, model, release, retries, pricing version, owner |

## 60-second self-test

| Seconds | Prompt | Required idea |
|---:|---|---|
| 0-10 | Eight-topic spine? | Trace, instrumentation, context, prompts, scores, datasets, cost, operations |
| 10-20 | Trace contract? | Stable interface for dashboards and evaluators |
| 20-30 | Cold prompt cache? | Last-known-good or explicit fail-closed policy |
| 30-40 | Judge calibration? | Compare a versioned rubric with reviewed labels |
| 40-50 | Fair CI experiment? | Fixed cases, model, evaluator, and one controlled change |
| 50-60 | Cost variance owner? | Named service, data, pricing, or provider owner |

<div class="callout tip"><span class="ct">Strong answer</span>Connect every technical choice to scale, security, or ownership: what is stable, what is allowed to vary, who can see it, and who responds when it fails.</div>

Next: **Senior Interview Review** adds platform governance, capacity, compatibility, and organizational decision-making.

## Intermediate scenario: repair unreliable telemetry

| Scenario | Strong response |
|---|---|
| Retry inflation | One logical trace, attempt-specific children, bounded policy |
| Upgrade changed trees | Fixture comparison, pinned versions, staged rollout |
| Prompt outage | Cache policy, last-known-good, rollback owner |
| Gate failure | Inspect data, rubric, evaluator, model, and exception path |
