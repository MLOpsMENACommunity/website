# Part three of three: Govern RAG evaluation as a platform

You can now evaluate typed datasets, calibrate core and custom metrics, generate reviewed cases, compare paired runs, enforce CI gates, control judge cost, protect sensitive content, and sample production drift. At senior level, you set the contracts and operating model that let many teams do that safely.

## Where this picks up

| Existing thread | Senior extension | Accountable owner |
|---|---|---|
| RAG evaluation model | Organization risk-to-metric policy | Evaluation council |
| Dataset contract | Lineage, tenant isolation, retention, legal holds | Data governance |
| Core metrics | Human agreement studies and judge qualification | Measurement owner |
| Run interpretation | Platform APIs, SLOs, backpressure, evidence | Evaluation platform |
| Product rubrics | Versioned metric registry and approval workflow | Domain owner |
| Test generation | Coverage portfolio and contamination controls | Test data owner |
| Regression gates | Tiered release policy and exceptions | Service owner |
| Privacy controls | Regional routing, encryption, access reviews | Security/privacy |
| Cost and retries | Capacity planning, quotas, chargeback | Platform operations |
| Drift monitoring | Incident response and metric retirement | Quality owner |

<div class="flow"><div class="node">POLICY<small>what must be measured</small></div><span class="arrow">&rarr;</span><div class="node">PLATFORM<small>how teams run it</small></div><span class="arrow">&rarr;</span><div class="node">EVIDENCE<small>why release passed</small></div><span class="arrow">&rarr;</span><div class="node">RESPONSE<small>who acts on drift</small></div></div>

A senior operating model separates policy, execution, and evidence. Policy owners decide what must be measured. Platform owners provide a dependable path to run it. Service owners decide whether the evaluated candidate should ship within that policy. Security and measurement owners can stop a route when data handling or judge quality falls outside approval.

```text organization evaluation control planes
POLICY     risk tier -> required suites -> metric versions -> gate rules
                             |                    |
                             v                    v
PLATFORM   identity -> authorize -> schedule -> judge route -> score
                             |                    |
                             v                    v
EVIDENCE   dataset lineage -> run manifest -> decision -> deployment outcome
                             |                    |
                             +------ audit -------+
```

No single team should silently control all three planes for a high-impact system. A metric owner can approve a calibrated judge, but the service owner owns the product regression. The platform team can enforce retention, but data governance defines the retention period. Write these boundaries into the service contract and incident runbook.

## 1. Publish an evaluation policy tied to risk

Define service tiers. A low-risk internal summarizer does not need the same evidence as an assistant that changes an account. For each tier, name required datasets, slices, metrics, minimum calibration, gate behavior, approver, and exception expiry.

| Policy field | Example for high-risk RAG |
|---|---|
| Required evidence | Golden suite, adversarial suite, production replay |
| Core checks | Faithfulness, context recall, task success, safety rubric |
| Human study | Quarterly stratified agreement review |
| Gate | No critical-row regressions; bounded aggregate floor |
| Exception | Named owner, compensating control, 14-day expiry |
| Retention | Manifest and decisions retained for audit period |

Treat metric names as versioned interfaces. `faithfulness@2` should identify its RAGAS version, judge class, model route, prompt configuration, and interpretation.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Classify three RAG services by impact.</li><li>Write required evidence for each tier.</li><li>Assign one executive owner and one technical owner.</li></ol><em>A team should know its release obligations before it changes the model.</em></div>

## 2. Qualify judges with human agreement studies

Build a blinded, stratified sample across languages, products, risk, and answer quality. Have trained reviewers label it independently. Measure inter-reviewer agreement first; a judge cannot resolve a rubric humans do not share. Then measure judge agreement, false-pass rate, false-fail rate, stability across reruns, and performance by slice.

```text qualification
rubric -> reviewer training -> double labels -> adjudication
       -> judge candidates -> slice metrics -> approval or rejection
```

Requalify after judge-model, prompt, metric-library, or material domain changes. Keep a champion judge and a tested fallback. Do not silently accept provider model aliases that can change behavior.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Design a 100-case stratified study.</li><li>Set the maximum false-pass rate for critical cases.</li><li>Write triggers for judge requalification.</li></ol><em>Report slice failures even when overall agreement looks strong.</em></div>

Agreement studies produce more than one accuracy number. For a release gate, a **false pass** is usually the expensive mistake: the judge approves an answer that trained reviewers marked unsafe or unsupported. A **false fail** wastes engineering time and slows releases. Set acceptable rates by risk tier and report them for each important slice.

```text judge qualification decision
                         HUMAN ADJUDICATION
                       acceptable   unacceptable
JUDGE   pass              true pass    FALSE PASS  <- release risk
        fail              FALSE FAIL   true fail   <- developer friction

Measure each cell by language, product, and risk slice.
Overall agreement can hide one dangerous slice.
```

Stability also matters. Run the same anchor cases several times and measure label or score movement. A judge with good average agreement but unstable critical-case decisions cannot own an automated gate. Route such cases to human review or use a deterministic check where possible.

## 3. Operate a versioned metric registry

A central registry stores metric definitions, owners, required fields, approved judge routes, calibration reports, cost estimates, thresholds, and lifecycle status. Teams reference immutable versions from evaluation manifests.

```yaml metric-registry.yaml
metrics:
  - id: grounded_support@2.1
    implementation: ragas.metrics.Faithfulness
    ragas_version: 0.3.9
    required_fields: [response, retrieved_contexts]
    judge_route: approved-us-judge-v4
    owner: search-quality
    calibration_report: cal/grounded-support-2.1.pdf
    status: approved
    review_by: 2026-12-01
```

Use change review for threshold or rubric edits. A threshold change can alter release behavior as much as a code change.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Register the four core metrics and one rubric.</li><li>Add owner, required fields, route, and review date.</li><li>Attempt a run with a retired metric and confirm it fails closed.</li></ol><em>The manifest should resolve every metric to an immutable definition.</em></div>

## 4. Design the multi-tenant evaluation platform

Separate the control plane from execution. The control plane validates policy, resolves datasets and metric versions, authorizes judge routes, and records manifests. Workers pull sanitized tasks, call approved judges, checkpoint results, and write tenant-scoped artifacts.

```text platform architecture
team/CI -> evaluation API -> policy + metric registry
                         -> scheduler -> tenant queue -> workers -> judge gateway
                         -> artifact store + lineage catalog
                         -> metrics/cost/audit stream
```

Enforce tenant identity at every storage key, queue, cache key, and log event. Use per-tenant encryption keys where impact requires them. Never share a semantic cache across tenants unless security has approved a content-safe key and threat model.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Trace tenant identity through each component.</li><li>Test an attempted cross-tenant artifact read.</li><li>Verify cache keys include metric, judge, and sanitized input hashes.</li></ol><em>Keep the denial in the audit stream without logging protected content.</em></div>

The platform must authorize a request before loading restricted cases or reserving judge capacity. Tenant identity selects allowed datasets, metric versions, regions, and budget. Workers should receive opaque artifact references and short-lived credentials rather than broad access to the evaluation store.

```text multi-tenant request path
team identity -> policy API -> evaluation plan -> quota reservation
                      |               |                 |
                 deny early      immutable IDs     budget ledger
                                      |
                                      v
                             isolated worker pool
                               /             \
                    approved judge route   result store
                               \             /
                                signed manifest
```

Backpressure belongs at admission and scheduling boundaries. If a premium judge route is saturated, queue work within the tenant quota, switch only to a qualified fallback, or reject with a retryable status. Never substitute an unqualified model because capacity is low; that would change the measuring instrument during a release decision.

## 5. Plan capacity, quotas, and backpressure

Model demand as cases × metrics × calls per metric × repetitions. Add token distributions, provider quotas, worker concurrency, queue wait, retry rate, and artifact growth. Reserve capacity for release-blocking suites and throttle exploratory jobs first.

| SLO or control | Example |
|---|---|
| Gate completion | 95% of tier-1 suites finish within 12 minutes |
| Queue age | Alert when release queue p95 exceeds 3 minutes |
| Judge errors | Stop route after sustained policy or parse failures |
| Budget | Team token quota with warning and hard ceiling |
| Backpressure | Reject or defer low-priority jobs before worker saturation |

Provide cancellation that stops queued and in-flight work where the provider supports it. Cap retries globally so a provider outage cannot multiply cost.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Forecast peak release-hour demand.</li><li>Remove one judge route and model queue growth.</li><li>Define which jobs the scheduler sheds first.</li></ol><em>Include retry amplification in the capacity model.</em></div>

## 6. Govern datasets from collection to deletion

Store source lineage, consent or lawful basis where applicable, transformation history, reviewers, quality checks, access policy, region, retention, and deletion state. Keep golden, adversarial, replay, and holdout suites separate. Restrict holdout visibility to reduce optimization against the test.

Protect against contamination: search for benchmark questions in training, prompt examples, caches, and generated testsets. Rotate holdouts when repeated exposure weakens their value.

<div class="callout warning"><span class="ct">Security boundary</span>Deleting a source record may require deleting derived evaluation rows, cached judge requests, artifacts, and backups according to policy. Lineage makes that possible.</div>

<div class="guide-try"><span class="ct">Try it</span><ol><li>Follow one case back to its source.</li><li>List every derived copy and cache.</li><li>Run a deletion drill and record unresolved copies.</li></ol><em>The drill ends when the owner verifies evidence, not when the first row disappears.</em></div>

## 7. Use tiered gates and controlled exceptions

Run cheap deterministic checks and a smoke slice first. Run judge-heavy suites only after schema, retrieval, and contract checks pass. High-risk releases may require no regressions on must-pass cases, statistical non-inferiority by slice, and human approval for material changes.

```text release ladder
schema -> deterministic checks -> smoke RAGAS -> full paired suite
       -> critical slices -> human review when required -> deploy -> canary
```

An exception includes the failed metric version, affected slices, rationale, compensating monitor, approver, expiration, and rollback. The platform should expire exceptions automatically.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Write gates for low-, medium-, and high-risk services.</li><li>Create a time-limited exception.</li><li>Confirm expiration blocks the next release.</li></ol><em>Count active exceptions as operational risk.</em></div>

A tiered gate reduces cost while preserving strong evidence. Each stage consumes the prior stage's artifact, so a schema failure never launches expensive judge calls and a failed critical slice never proceeds as if the aggregate had passed.

<div class="flow"><div class="node">VALIDATE<small>schema, lineage, policy</small></div><span class="arrow">&rarr;</span><div class="node">SMOKE<small>small balanced slice</small></div><span class="arrow">&rarr;</span><div class="node">FULL SUITE<small>paired and stratified</small></div><span class="arrow">&rarr;</span><div class="node">CRITICAL REVIEW<small>must-pass evidence</small></div><span class="arrow">&rarr;</span><div class="node">CANARY<small>production monitor</small></div></div>

An exception branches around one policy condition; it does not erase the failed evidence. The decision record must retain the failed metric, scope, approver, expiry, compensating monitor, and rollback trigger. When the exception expires, admission should fail closed until the owner renews it with new evidence or repairs the regression.

## 8. Detect evaluator drift separately from product drift

Use anchor cases with stable human labels to monitor the judge. Run them on a schedule and around provider or library changes. If anchor behavior changes while product inputs remain fixed, quarantine the evaluator route and stop automated release decisions.

| Signal | Likely cause | Action |
|---|---|---|
| Anchor score shift | Judge or metric drift | Freeze gates; compare fallback judge |
| Product-only slice shift | RAG behavior or traffic drift | Route to service owner |
| Parse/error spike | Provider/API compatibility | Stop route and inspect upgrade |
| Cost jump with stable volume | Prompt/tokenization/model change | Enforce budget and investigate |

<div class="guide-try"><span class="ct">Try it</span><ol><li>Select stable anchor cases.</li><li>Define quarantine thresholds.</li><li>Practice switching to the qualified fallback judge.</li></ol><em>Preserve both outputs for the incident record.</em></div>

## 9. Run incidents with explicit roles

Define an incident commander, evaluation-platform lead, service owner, security/privacy contact, and communications owner. Stop unsafe gates or judge routes, preserve manifests and affected case IDs, estimate release impact, and choose rollback or manual review. Do not copy sensitive prompts into chat channels.

After recovery, add the failure to tests, update capacity or policy, and document whether the judge, dataset, RAG service, or platform caused the incident.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Simulate a judge route returning malformed scores.</li><li>Pause automated gates and activate the fallback.</li><li>Produce a timeline without exposing case text.</li></ol><em>Close the incident only after corrective actions have owners and dates.</em></div>

## 10. Preserve decision-grade audit evidence

For each run, retain identity, authorization, code and dataset revisions, metric registry versions, judge route, package lock, policy decision, row results, failures, costs, timestamps, approvals, exceptions, and deployment outcome. Sign or make manifests tamper-evident for high-risk systems.

Audit evidence answers four questions: who requested the evaluation, what exact system and evidence were tested, which policy produced the decision, and who accepted any remaining risk.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Sample a release from last month.</li><li>Reconstruct its evaluation decision.</li><li>Record every missing artifact and assign remediation.</li></ol><em>Test retrieval of evidence before an auditor or incident requires it.</em></div>

## 11. Complete annotated example: policy-controlled platform request

```python platform_request.py
from dataclasses import asdict

request = EvaluationRequest(
    tenant_id=identity.tenant_id,              # 1. Identity scopes all work.
    service="account-support-rag",
    risk_tier="high",
    dataset="golden-support@12",               # 2. Immutable evidence version.
    candidate_revision=deployment.git_sha,
    metrics=["grounded_support@2.1", "context_recall@1.4"],
    judge_route="approved-us-judge-v4",        # 3. Policy-approved data route.
)

policy.authorize(identity, request)
plan = planner.resolve(request)                 # 4. Expands metrics and required suites.
budget.reserve(plan.estimated_tokens)
run = scheduler.submit(plan, priority="release")
result = run.wait(timeout_seconds=900)

decision = policy.decide(                       # 5. Applies tier and slice rules.
    result=result,
    active_exceptions=exceptions.for_service(request.service),
)
audit.write_tamper_evident({                    # 6. Keeps evidence without secrets.
    "request": asdict(request),
    "manifest": result.manifest,
    "decision": decision.to_dict(),
    "artifact_uri": result.restricted_artifact_uri,
})

if not decision.approved:
    raise ReleaseBlocked(decision.summary)
```

**Next:** use all three parts as one operating model. Revisit [Part one](#beginner-detailed) when onboarding a developer and [Part two](#mid-detailed) when a team adds a new gate; use this part to review platform policy, incidents, and ownership.
