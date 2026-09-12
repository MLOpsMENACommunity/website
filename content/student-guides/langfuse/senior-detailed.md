# Part three of three: Design and govern Langfuse as a platform

Choose this level when several teams depend on Langfuse or you own the platform. You will define organization-wide contracts, privacy and evaluation policy, rollout controls, capacity plans, SLOs, and incident ownership.

## Where this picks up

Parts one and two established the complete application and team workflow. Part three keeps that spine and turns each topic into an organization-level policy with a security boundary, scale limit, and named owner.

| Mid-level practice | Senior responsibility |
|---|---|
| Trace contract | Organization-wide contract and migration policy |
| Integration fixture | SDK compatibility and staged rollout |
| Baggage allowlist | Tenant isolation and data governance |
| Prompt rollback | Prompt supply chain and approval ownership |
| Calibrated evaluator | Evaluation platform and decision policy |
| CI threshold | Release governance and exception process |
| Cost reconciliation | FinOps controls and capacity planning |
| Sampling/RBAC/retention | SLOs, incident response, and compliance evidence |

At platform scale, Langfuse sits between application teams, security policy, evaluation standards, and infrastructure. The platform contract should let teams instrument independently while keeping traces comparable enough for shared dashboards, incident response, and cost allocation.

```text Langfuse platform ownership map
APPLICATION TEAMS                PLATFORM TEAM
stable logical spans ---------> ingest + SDK support
prompt/model metadata --------> schema compatibility
safe user/session IDs --------> access and retention enforcement
          |                              |
          +---------- traces ------------+
                         |
                 EVALUATION OWNERS
             score definitions + datasets
                         |
                    release evidence
                         |
               SECURITY / GOVERNANCE
             policy, audit, deletion, review
```

Ownership should follow failure modes. An application team owns a missing retrieval span. The platform team owns ingestion lag and an incompatible SDK rollout. Evaluation owners approve score definitions. Security owns the rules for tenant access and sensitive fields. Put escalation paths and service objectives beside the contract so teams know where to route a broken trace.

## 1. Publish an organization-wide trace contract

At senior scale, application teams should not invent incompatible telemetry schemas. Publish allowed observation types and names, required release/model fields, metadata limits, redaction rules, and ownership. Keep a compatibility window when changing names; dashboards and evaluators are consumers.

```text trace-contract
support-answer [root]
  retrieve-policy [span, owner=retrieval]
  answer-model [generation, model+usage required]
  answer-policy-score [score, owner=quality]
```

<div class="callout note"><span class="ct">Ownership angle</span>The platform team owns the contract and tooling. Product teams own the meaning of their traces and scores. Do not make one team responsible for both schema correctness and business quality.</div>
<div class="guide-try"><span class="ct">Try it</span><ol><li>Draft a contract for one critical route.</li><li>List dashboard and evaluator consumers.</li><li>Define a migration and deprecation window.</li></ol><em>A schema is reliable when its breaking changes have an owner and a path.</em></div>

## 2. Roll out SDK and schema changes safely

Pin the SDK and integration versions. In v4, the default exporter filters many non-LLM spans, which can change trace trees during migration. Use a disposable project, compare fixed fixture traces, roll out to one service or tenant, and keep a rollback version. Debug mode helps inspect dropped scopes.

```python compatibility.py
from langfuse import Langfuse
from langfuse.span_filter import is_default_export_span

def export_policy(span):
    return is_default_export_span(span) or (
        span.instrumentation_scope is not None
        and span.instrumentation_scope.name.startswith("company.agent")
    )

langfuse = Langfuse(
    debug=True,
    should_export_span=export_policy,
)
```

<div class="guide-try"><span class="ct">Try it</span><ol><li>Capture a before trace with a pinned client.</li><li>Upgrade in a disposable project.</li><li>Compare counts, tree shape, fields, latency, and delivery.</li></ol><em>A passing import is not compatibility evidence.</em></div>

## 3. Enforce tenant isolation and privacy policy

Projects and access controls are boundaries; tags are dimensions. Decide whether tenants share a project, how exports are authorized, and how deletion requests map to retained observations. Metadata values are not a place for raw prompts or personal records.

```python redaction.py
import re
from langfuse import Langfuse

EMAIL = re.compile(r"\b[\w.+-]+@[\w.-]+\.\w+\b")

def mask(value):
    if isinstance(value, str):
        return EMAIL.sub("[EMAIL]", value)
    if isinstance(value, dict):
        return {key: mask(item) for key, item in value.items()}
    if isinstance(value, list):
        return [mask(item) for item in value]
    return value

langfuse = Langfuse(mask=mask)
```

<div class="guide-try"><span class="ct">Try it</span><ol><li>Define fields allowed in metadata and baggage.</li><li>Test nested redaction with representative fixtures.</li><li>Review browse and export permissions separately.</li></ol><em>Least privilege applies to observation content as well as infrastructure.</em></div>

Tenant isolation needs controls at collection, storage, query, export, and deletion. Filtering the UI by tenant after loading mixed data is not an isolation boundary. Bind tenant identity at ingestion, authorize every query against it, and test that exports and evaluator jobs cannot cross the boundary.

```text tenant-scoped data path
request identity -> ingest policy -> tenant project/store -> authorized query
       |                 |                  |                 |
   authenticated    redact/allowlist    encryption/ACL    audited export
       |                 |                  |                 |
       +---------------- deletion index ---------------------+
                              |
                    retention or legal hold
```

Use synthetic canary records to test isolation. Place a unique marker in tenant A, query as tenant B through UI, API, export, and evaluation paths, and require zero matches. Run the same test after SDK, server, role, or data-pipeline changes. A successful UI test alone leaves background jobs and exports untested.

## 4. Govern the prompt supply chain and rollback path

Treat prompts as deployable dependencies. A production label should point to a reviewed version with an owner, evaluation evidence, model assumptions, and rollback instructions. Cache behavior must be part of the availability design: cold instances, stale values, and unavailable Langfuse need explicit outcomes.

| Artifact | Required evidence |
|---|---|
| Prompt version | Dataset result and reviewer |
| Model config | Usage, latency, and safety result |
| Label promotion | Approval and timestamp |
| Rollback | Known-good version and trigger |
| Cache policy | Cold-start and outage behavior |

<div class="guide-try"><span class="ct">Try it</span><ol><li>Promote a candidate only after a fixed evaluation.</li><li>Simulate an empty cache.</li><li>Execute the rollback and record the owner.</li></ol><em>Availability and quality are coupled when prompts are fetched at runtime.</em></div>

## 5. Own evaluation standards and score policy

An organization needs a score taxonomy, evaluator versioning, calibration sets, annotation ownership, and a rule for disagreements. Separate human feedback, deterministic code evaluators, LLM judges, and release gates. Keep the evaluator prompt and rubric beside the result.

```python evaluator_policy.py
from langfuse import Evaluation

def grounded(*, output, expected_output, **kwargs):
    return Evaluation(
        name="groundedness-v2",
        value=float(expected_output.lower() in output.lower()),
        comment="Deterministic baseline; human review required for exceptions",
    )
```

<div class="guide-compare"><div class="guide-compare-col good"><h4>Governed gate</h4><ul><li>Versioned rubric</li><li>Stable dataset</li><li>Calibration evidence</li><li>Named exception owner</li></ul></div><div class="guide-compare-col bad"><h4>Dangerous gate</h4><ul><li>Silent judge prompt</li><li>Changing cases</li><li>One blended score</li><li>No appeal path</li></ul></div></div>
<div class="guide-try"><span class="ct">Try it</span><ol><li>Define an exploratory score and a release score separately.</li><li>Review false positives and false negatives.</li><li>Document who can override a failed gate.</li></ol><em>Governance makes a metric safe to use under pressure.</em></div>

## 6. Turn experiments into auditable release evidence

Use the experiment runner for repeatable tasks, item evaluators, run evaluators, concurrency controls, and trace links. A senior platform should publish dataset provenance, expected criteria, evaluator versions, and threshold changes. A failing experiment should identify whether code, prompt, model, data, or evaluator changed.

```python release_experiment.py
result = langfuse.run_experiment(
    name="support-release-2026-09",
    data=versioned_redacted_dataset,
    task=task,
    evaluators=[grounded],
    run_evaluators=[aggregate_quality],
    max_concurrency=10,
    metadata={"candidate": "2026.09.3", "dataset": "support-v4"},
)
```

<div class="guide-try"><span class="ct">Try it</span><ol><li>Run the same dataset against the current and candidate release.</li><li>Inspect aggregate and representative traces.</li><li>Write the decision and exception owner into the release record.</li></ol><em>A score is evidence; the release decision is a human-owned policy.</em></div>

Promotion should consume evidence rather than a verbal claim. The release record joins the candidate, dataset, evaluator policy, score artifact, approver, production label change, and rollback target. This chain lets an incident commander reconstruct what changed without searching chat history.

```text auditable prompt promotion
candidate prompt v18
       |
       +-> dataset support-golden@12
       +-> evaluator policy groundedness@3
       +-> row results + critical-slice decision
       +-> reviewer approval
       v
production label: v17 -> v18
rollback label:   v17 retained
       |
deployment monitor -> trace/score/cost evidence
```

Require separation of duties for high-impact changes. The author can create the candidate and run the experiment; a designated owner reviews the evidence and promotes the label. Emergency rollback should need fewer steps than promotion, but it must still write an audit event and open follow-up work.

## 7. Plan capacity and control LLM observability cost

At scale, usage is a budget signal and a capacity signal. Aggregate input/output tokens by model, provider, route, release, tenant, and pricing version. Reconcile against invoices. Watch concurrency, queue latency, ingestion failures, and ClickHouse growth if self-hosted. Assign a responder for unexpected variance.

<div class="guide-arch" style="--arch-cols:3"><div class="arch-lane" style="--lane-cols:3"><span class="arch-label">dimensions</span><div class="arch-node" data-kind="entry"><b>Route</b><small>business owner</small></div><div class="arch-node" data-kind="entry"><b>Model</b><small>provider cost</small></div><div class="arch-node" data-kind="entry"><b>Release</b><small>change context</small></div></div><i class="arch-edge" data-dir="down"></i><div class="arch-lane" style="--lane-cols:1"><div class="arch-node" data-kind="store"><b>Budget decision</b><small>usage, quality, latency, and owner</small></div></div></div>
<div class="guide-try"><span class="ct">Try it</span><ol><li>Set a route-level cost budget.</li><li>Reconcile estimated and invoiced spend.</li><li>Page an owner when quality falls while cost rises.</li></ol><em>Cost alone is not an optimization target if it damages quality or reliability.</em></div>

## 8. Set SLOs, retention rules, and incident ownership

Define SLOs for ingestion delay, trace availability, dashboard freshness, and evaluation completion. Retention should reflect legal, product, and debugging needs. Self-hosted deployments add responsibility for Postgres, ClickHouse, Redis or Valkey, blob storage, web, worker, encryption keys, backups, and upgrades.

```text operations
request -> SDK queue -> ingestion -> ClickHouse / blob storage
                       |             |
                       +-> worker ---+-> dashboards and evaluations
```

| Incident | First question | Owner |
|---|---|---|
| Traces missing | Did SDK, network, filter, or queue fail? | Platform |
| Dashboard stale | Is ingestion or worker delayed? | Observability |
| PII captured | Did mask run before export? | Security |
| Cost spike | Which route/model/release changed? | Service owner |
| Score drift | Did data, rubric, judge, or model change? | Quality |

<div class="guide-try"><span class="ct">Try it</span><ol><li>Run a missing-trace incident drill.</li><li>Measure ingestion delay and dashboard freshness.</li><li>Practice rollback with a documented responder.</li></ol><em>Senior operation means the failure path is tested before it becomes an outage.</em></div>

Operate telemetry with explicit SLOs. Availability measures whether accepted events become queryable. Freshness measures ingestion delay. Completeness compares expected and observed traces. Query latency protects incident response. Each SLO needs an error budget and an action when the budget burns too quickly.

```text observability incident loop
SDK health -> ingest queue -> worker -> analytical store -> query/API
    |            |            |            |              |
 dropped      queue age    failure rate   merge lag     latency/errors
    \____________|____________|____________|______________/
                              |
                         SLO dashboard
                              |
              alert -> incident owner -> mitigate
                              |
                 replay / rollback / capacity change
```

Preserve the application path during telemetry incidents. Apply bounded buffers, sampling, or dropping according to policy rather than exhausting application memory. If completeness falls below the release-evidence requirement, pause automated decisions that depend on traces even while the product continues serving traffic.

## 9. Maintain an SDK and server compatibility policy

Separate SDK compatibility from server compatibility. Pin both where possible, record the tested matrix, and use legacy API namespaces only when a self-hosted server version requires them. A migration note should name removed methods, changed fields, and rollback conditions.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Write the current SDK and server versions.</li><li>List one deprecated method in your estate.</li><li>Define a canary and rollback test.</li></ol><em>Compatibility is a documented operating decision.</em></div>

## 10. Decide what your self-hosted team owns

A self-hosted installation adds Postgres for application state, ClickHouse for analytical observations, Redis or Valkey for queues and coordination, and S3-compatible storage for blobs. The web service serves the UI and API; the worker processes background ingestion and jobs. Operators own backups, encryption secrets, upgrades, and capacity.

```text self-hosted
web/API -> Postgres       configuration and users
       -> ClickHouse      observations and analytics
       -> Redis/Valkey     queue and coordination
       -> object storage  media and blobs
worker -> ingestion, jobs, exports, evaluations
```
<div class="guide-try"><span class="ct">Try it</span><ol><li>Assign an owner to each dependency.</li><li>Test restore of state and analytical data.</li><li>Document encryption key rotation.</li></ol><em>Self-hosting changes the org chart as much as the deployment diagram.</em></div>

## 11. Design for capacity limits and backpressure

Estimate event volume from request rate, observations per request, payload size, and retention. Watch queue depth, worker latency, ClickHouse merges, object storage growth, and API response time. Apply sampling and payload limits deliberately; do not let ingestion failure silently impact the application path.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Estimate a peak hour from production traffic.</li><li>Multiply by observations per request.</li><li>Set an alert on queue depth and ingestion delay.</li></ol><em>Capacity planning starts with the shape of the trace.</em></div>

Self-hosted capacity begins with trace shape. Estimate `requests per second × observations per request × bytes per observation`, then apply peak factor and retention. Large prompts or media may move cost from analytical storage to object storage, while high-cardinality metadata increases query and index pressure.

```text self-hosted ingestion and backpressure
SDKs -> load balancer -> web/API -> queue/Redis -> workers -> ClickHouse
                            |                         |          |
                            +-> Postgres config       |       analytics
                                                      +-> object storage

pressure signals: API latency, queue age, worker saturation,
ClickHouse merge backlog, object growth, and query latency.
```

Choose a degradation order before an incident. Drop debug observations before release evidence, cap oversized payloads before rejecting whole traces, and preserve error traces according to security policy. If the queue reaches its hard limit, clients must fail telemetry calls safely and increment a local drop counter. They must not retry without bounds or block customer requests.

## 12. Keep evidence for changes, incidents, and audits

A governed platform keeps before/after traces, evaluator results, access reviews, retention decisions, incident timelines, and rollback evidence. Store the decision next to the release or policy it explains. Dashboards without provenance are difficult to defend during an incident or audit.

<div class="callout note"><span class="ct">Ownership angle</span>Evidence should answer who changed what, why the change was safe, what was monitored, and how to reverse it.</div>
<div class="guide-try"><span class="ct">Try it</span><ol><li>Pick one recent telemetry change.</li><li>Collect its approval, fixture, and rollout evidence.</li><li>Identify the missing artifact.</li></ol><em>Governance is operational memory.</em></div>

## Advanced checkpoint: can you defend the platform?

Senior practice connects every object to a decision: trace contracts protect consumers, instrumentation exposes work, context protects correlation, prompts control behavior, scores measure outcomes, datasets test change, cost informs budgets, and operations protects the data path.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Present the eight-thread model to a platform and product audience.</li><li>Defend one security and one scale tradeoff.</li><li>Name the owner and rollback for each.</li></ol><em>Senior observability work is a system of decisions, not a collection of SDK calls.</em></div>

## 13. Complete annotated example: enforce the platform boundary

```python platform_boundary.py
from langfuse import get_client, observe, propagate_attributes

langfuse = get_client()

# 1. The organization contract gives every service a stable logical root.
@observe(name="support-answer")
def serve(request):
    # 2. The service supplies approved identity, release, route, and tenant fields.
    with propagate_attributes(
        user_id=request.user_id,
        session_id=request.session_id,
        version=request.release,
        environment="production",
        metadata={"route": "support", "tenant": request.tenant},
    ):
        # 3. The model gateway owns model choice and usage reporting.
        with langfuse.start_as_current_observation(
            as_type="generation", name="answer-model",
            model=request.model, input={"prompt_version": request.prompt_version},
        ) as generation:
            answer = model_gateway(request)
            # 4. The generation records only content allowed by the masking policy.
            generation.update(output=answer.text, usage_details=answer.usage)
        return answer.text

# 5. Application shutdown owns delivery; platform SLOs monitor ingestion.
try:
    serve(request)
finally:
    langfuse.flush()
```

The platform contract makes the ownership visible: deployment supplies release and model context, the application supplies the logical root, the mask policy controls capture, evaluation owns scores, and shutdown owns delivery.

**Next:** use all three parts as one operating model. Return to [Part one](#beginner-detailed) for application onboarding and [Part two](#mid-detailed) for service reliability; use this part for platform policy, incidents, and ownership reviews.
