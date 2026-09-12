# Part two of three: Make Langfuse reliable in production

Choose this level after you can create and read a useful trace. You will make telemetry consistent across services, evaluate changes in CI, control prompt rollouts, and operate the data path under production traffic.

## Where this picks up

Part one taught you to create, find, and debug a trace. Part two keeps every earlier topic and adds the controls a team needs in production.

| Beginner established | Mid-level deepens it |
|---|---|
| A readable trace tree | A stable trace contract across services |
| `@observe` and manual observations | Framework integrations and retry boundaries |
| Propagated identity | Distributed context and tenant ownership |
| Versioned prompts | Cache, fallback, and rollout control |
| Defined scores | Calibrated evaluators and annotation workflows |
| A fixed dataset | CI regression experiments |
| Usage and latency | Reconciled cost and service targets |
| Masking and flush | Sampling, retention, RBAC, and incident ownership |

Production observability has two connected paths. The **request path** serves the customer and must remain healthy if telemetry fails. The **telemetry path** exports a bounded, privacy-filtered description of that request. Correlation IDs connect Langfuse to application logs without copying all log data into every observation.

```text production instrumentation boundary
USER -> API -> retrieval -> model -> response
         |         |          |
         +---------+----------+---- safe observations
                              |
                              v
                    SDK buffer / exporter
                              |
                         Langfuse ingest
                              |
               traces + scores + cost dashboards

An ingest failure alerts the telemetry owner; it does not block USER -> response.
```

The trace contract defines what crosses that boundary: stable names, required attributes, allowed payload fields, observation types, and error semantics. Framework integrations may create extra children, but they cannot replace the logical root or remove fields that dashboards and incident queries depend on.

## 1. Define a trace contract that survives refactors

The Beginner tree is a mental model. A team needs a contract: which observation names are allowed, which fields are required, and which operation owns each child. Keep the logical request stable when providers retry. A provider attempt can be a child event or generation; it should not create a new user-facing trace for every attempt.

| Contract field | Example | Owner |
|---|---|---|
| Root name | `support-answer` | Application team |
| Child name | `retrieve-policy` | Retrieval team |
| Release | `2026.09.3` | Release pipeline |
| Model | `gpt-4.1` | Model gateway |
| Retry policy | max 2, bounded timeout | Platform team |

<div class="callout note"><span class="ct">Scale angle</span>A trace contract is an interface. Publish it like an API so dashboards and evaluators do not break when implementation functions move.</div>
<div class="guide-try"><span class="ct">Try it</span><ol><li>Take a Beginner tree and list required fields.</li><li>Simulate a provider retry.</li><li>Decide which ID and name remain stable.</li></ol><em>Observability should describe logical work, not accidental call count.</em></div>

## 2. Keep a readable tree across framework integrations

Use native integrations where they capture model inputs, outputs, usage, and errors consistently. LangChain's callback handler belongs at the chain boundary; it no longer accepts the removed `update_trace` parameter. Keep one explicit application root around the integration.

```python langchain.py
from langfuse import get_client, propagate_attributes
from langfuse.langchain import CallbackHandler

langfuse = get_client()

def answer(question: str):
    handler = CallbackHandler()
    with langfuse.start_as_current_observation(
        as_type="span", name="support-answer", input={"question": question}
    ):
        with propagate_attributes(version="2026.09.3", environment="production"):
            return chain.invoke({"question": question}, config={"callbacks": [handler]})
```

Test the emitted tree with a fixture. Assert semantic shape and required fields, not every internal callback node. Integration upgrades can add or rename implementation observations.
<div class="guide-try"><span class="ct">Try it</span><ol><li>Run one chain with a fixed model stub.</li><li>Inspect parent and child names.</li><li>Upgrade the integration in a disposable project and compare shape.</li></ol><em>Compatibility testing is cheaper than repairing dashboards after an upgrade.</em></div>

## 3. Preserve request identity across services

When a request crosses services, propagate only the values needed to correlate work. `as_baggage=True` places attributes in outbound headers, so never use it for secrets or raw customer content. Define a tenant boundary in your application and enforce it in project access, not only in a tag.

```python baggage.py
from langfuse import propagate_attributes

with propagate_attributes(
    user_id="user-42",
    session_id="session-7",
    metadata={"tenant": "acme", "route": "support"},
    as_baggage=True,
):
    call_retrieval_service()
```

<div class="callout warn"><span class="ct">Security angle</span>Baggage is an HTTP header. It can reach systems that were never meant to receive telemetry context. Allowlist fields and scrub logs at service boundaries.</div>
<div class="guide-try"><span class="ct">Try it</span><ol><li>List every outbound hop in one request.</li><li>Choose the minimum correlation fields.</li><li>Verify a downstream service cannot read another tenant's project.</li></ol><em>Correlation and authorization are related, but a tag is not an access policy.</em></div>

Cross-service propagation carries identity, not payload. Service A creates or receives trace context, sends the supported carrier to service B, and B creates a child or linked observation under the same logical request. If a queue delays work, preserve the relationship while allowing the consumer to record its own processing duration.

```text distributed request and async work
client -> API service [trace root]
              |-- retrieval span
              |      `-- search service [remote child]
              |-- generation
              `-- enqueue job ---- trace context ----> worker
                                                     `-- notify-user span

application logs in each service include the same safe trace_id.
message payload carries trace context, never secret keys or full prompts by default.
```

Validate propagation with an integration test. Start one request, cross the real HTTP or queue boundary, and assert that the UI shows one coherent story rather than two unrelated roots. Also test a malformed or untrusted carrier; the receiving service should reject unsafe baggage fields and start a controlled trace rather than accepting arbitrary metadata.

## 4. Roll out and roll back prompts safely

Fetching a prompt by `production` label makes the selection intentional. The SDK caches prompts client-side, but a cold instance still needs a policy. Decide whether the last known version is safe, whether startup may fail closed, and how a rollback changes the label.

```python prompt_rollout.py
from langfuse import get_client

langfuse = get_client()
prompt = langfuse.get_prompt("support-answer", label="production")
compiled = prompt.compile(question="Refund window?", policy="30 days")

generation = langfuse.start_observation(
    name="answer-model", as_type="generation",
    model="gpt-4.1", input={"prompt_version": prompt.version},
)
try:
    generation.update(output=run_model(compiled))
finally:
    generation.end()
```

<div class="guide-try"><span class="ct">Try it</span><ol><li>Deploy a candidate prompt to a non-production label.</li><li>Run a fixed dataset comparison.</li><li>Write the rollback step before promotion.</li></ol><em>Prompt versions are release artifacts, even when code review does not see their text.</em></div>

## 5. Calibrate automated and human evaluation

Human feedback and automated evaluation answer different questions. An annotation queue gives reviewers a controlled set of traces and a consistent schema. An LLM-as-a-judge can scale a rubric, but it needs a calibrated reference set and a versioned judge prompt. Keep human review for disagreement and policy-critical decisions.

| Signal | Best use | Ownership |
|---|---|---|
| User feedback | Outcome and satisfaction | Product |
| Annotation queue | Consistent labeled review | Quality lead |
| Code evaluator | Deterministic rule | Engineering |
| LLM judge | Rubric-based semantic check | Evaluation owner |

<div class="guide-compare"><div class="guide-compare-col good"><h4>Calibrated</h4><ul><li>Reference examples</li><li>Named rubric</li><li>Judge version</li><li>Disagreement review</li></ul></div><div class="guide-compare-col bad"><h4>Uncalibrated</h4><ul><li>One vague score</li><li>Silent judge changes</li><li>Mixed intents</li><li>No exception owner</li></ul></div></div>
<div class="guide-try"><span class="ct">Try it</span><ol><li>Give two reviewers ten redacted traces.</li><li>Compare disagreements against a judge score.</li><li>Rewrite the rubric where humans cannot agree.</li></ol><em>Calibration comes before automation.</em></div>

## 6. Test prompt and model changes in CI

The current experiment runner supports local data and hosted datasets. Use `run_experiment` for repeatable task execution, evaluators, concurrency limits, and trace links. Promote a score threshold to a release gate only after the dataset is stable and owned.

```python ci_eval.py
from langfuse import get_client, Evaluation

langfuse = get_client()

def task(*, item, **kwargs):
    return answer_question(item.input)

def policy_match(*, output, expected_output, **kwargs):
    return Evaluation(
        name="policy-match",
        value=float(expected_output.lower() in output.lower()),
    )

result = langfuse.run_experiment(
    name="support-release-candidate",
    data=redacted_cases,
    task=task,
    evaluators=[policy_match],
    max_concurrency=5,
    metadata={"release": "2026.09.3"},
)
if result.summary["policy-match"] < 0.95:
    raise SystemExit("evaluation gate failed")
```

<div class="guide-try"><span class="ct">Try it</span><ol><li>Turn an incident into a redacted dataset item.</li><li>Run old and candidate prompts against it.</li><li>Require an owner to approve threshold changes.</li></ol><em>A CI gate is a policy with an appeal path, not merely a number.</em></div>

A release evaluation connects four immutable identities: dataset version, candidate prompt or model version, evaluator version, and code revision. Without all four, a score difference cannot be reproduced. The CI job should publish row evidence and a compact decision, while restricted payloads remain in the evaluation store.

```text controlled prompt release
fixed dataset v12
      |---------------------|
      v                     v
prompt baseline v7     prompt candidate v8
      |                     |
      +---- same model -----+
              |
        scored by evaluator v3
              |
      paired rows by item ID
              |
   pass / review / fail + rollback label
```

Read disagreements before enforcing the mean. A candidate can improve ten easy rows and break one account-security case. Slice gates and must-pass items protect high-impact behavior; a human review state handles borderline evaluator disagreement. Store the production prompt label before promotion so rollback changes one controlled label rather than requiring a code deployment.

## 7. Reconcile cost, usage, and latency

Token fields support estimates, not invoices. Join usage to model, provider, route, release, and pricing-version metadata. Compare Langfuse aggregates with provider billing. Define p95 latency and error budgets by route rather than using one global average.

```python usage_fields.py
generation.update(
    model="gpt-4.1",
    usage_details={"input_tokens": 1200, "output_tokens": 180},
    metadata={"route": "support", "pricing_version": "2026-09"},
)
```

<div class="guide-try"><span class="ct">Try it</span><ol><li>Choose one route and one release.</li><li>Reconcile a day's estimated spend with provider billing.</li><li>Assign the difference to a data, pricing, or provider owner.</li></ol><em>Cost visibility becomes FinOps only when someone owns the variance.</em></div>

## 8. Set sampling, retention, and access rules

Sampling reduces ingestion volume but can hide rare failures. Preserve errors and a deliberate baseline sample, then document the rate. Retention and RBAC should follow policy and project boundaries. A production project needs an owner, access review, and an incident runbook.

| Control | Mid-level question |
|---|---|
| Sampling | Which errors are never sampled away? |
| Retention | How long is each data class needed? |
| RBAC | Who can browse, score, export, or administer? |
| Masking | Does redaction run before the network boundary? |
| Delivery | Who owns flush and shutdown behavior? |

<div class="guide-try"><span class="ct">Try it</span><ol><li>Write a sampling policy for normal and error traffic.</li><li>Run an access review on one project.</li><li>Test masking with realistic fixtures.</li></ol><em>Scale controls are part of application ownership, not a final platform checklist.</em></div>


## 9. Handle async work and manual observation lifecycles

Manual observations are useful for work that begins and ends in different callbacks. They do not become the active context automatically, so create children from the parent when nesting matters and always call `.end()` in a `finally` block. Concurrency limits protect providers and the ingestion path.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Create a manual span around a queued task.</li><li>End it after the worker finishes.</li><li>Run an experiment with a conservative concurrency limit.</li></ol><em>Explicit lifecycle is the price of asynchronous control.</em></div>

## 10. Correlate Langfuse traces with application logs

Use deterministic trace IDs when an external ticket or workflow ID must correlate with telemetry. Do not put that identifier in every observation name. W3C trace context connects services; a trace ID is not an authorization token.

```python correlation.py
trace_id = langfuse.create_trace_id(seed="ticket-54321")
with langfuse.start_as_current_observation(
    as_type="span", name="process-ticket",
    trace_context={"trace_id": trace_id},
):
    process_ticket()
```
<div class="guide-try"><span class="ct">Try it</span><ol><li>Choose one external ticket ID.</li><li>Generate a deterministic trace ID.</li><li>Verify repeated runs can be correlated without renaming nodes.</li></ol><em>Correlation belongs in context.</em></div>

The observability control loop starts with a signal and ends with an owned change. A dashboard that has no threshold, runbook, or owner reports history but does not operate the system. Define each chart in terms of a decision someone can make.

<div class="flow"><div class="node">TRACE SIGNAL<small>latency, errors, quality, cost</small></div><span class="arrow">&rarr;</span><div class="node">SLICE<small>release, route, tenant tier</small></div><span class="arrow">&rarr;</span><div class="node">THRESHOLD<small>SLO or regression rule</small></div><span class="arrow">&rarr;</span><div class="node">OWNER<small>retrieval, model, platform</small></div><span class="arrow">&rarr;</span><div class="node">ACTION<small>rollback, tune, investigate</small></div></div>

For example, p95 trace latency by release can trigger rollback when a new version adds 800 ms. Generation cost per successful task can reveal a prompt that uses more tokens without improving scores. Ingestion delay belongs to the platform owner because it affects visibility, while low groundedness belongs to the product team because it describes application behavior.

## 11. Build metrics teams can act on

Use built-in views for common questions. When a custom report is required, query dimensions that map to the trace contract: name, model, release, environment, score, and time. Keep queries bounded and cache reports rather than making every request scan raw observations.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Write a question about p95 latency by release.</li><li>List the dimensions needed to answer it.</li><li>Confirm each dimension is actually captured.</li></ol><em>A metric cannot recover a field the trace never stored.</em></div>

## 12. Support retention and deletion requests

Retention is a product and policy decision. Classify raw inputs, outputs, scores, and aggregate metrics separately. Define how a deletion request is located, who approves it, and how backups or exports are handled. Do not keep raw content merely because storage is cheap.

<div class="callout warn"><span class="ct">Security angle</span>Removing a trace from the UI is not automatically proof that every export, backup, and downstream copy is gone. Document the full data lifecycle.</div>
<div class="guide-try"><span class="ct">Try it</span><ol><li>Inventory every place telemetry is copied.</li><li>Assign a retention owner per data class.</li><li>Walk through a redacted deletion request.</li></ol><em>Retention is an operating contract.</em></div>

## Intermediate checkpoint: production readiness

You are ready for Senior when you can explain a trace contract, integration fixture, retry boundary, baggage risk, prompt rollback, evaluator calibration, CI gate, cost variance, sampling policy, and incident owner.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Choose one production route.</li><li>Write its failure and ownership matrix.</li><li>Ask another engineer to challenge the assumptions.</li></ol><em>Depth is proven when another team can operate your design.</em></div>

## 13. Complete annotated example: run a controlled release evaluation

This example joins the Mid-level topics in one release check: a fixed redacted dataset, a named evaluator, bounded concurrency, release metadata, and an owned threshold.

```python production_release_check.py
from langfuse import Evaluation, get_client

langfuse = get_client()

# 1. Keep test cases redacted, versioned, and unchanged between candidates.
release_cases = load_redacted_cases("support-cases-v7.jsonl")

def task(*, item, **kwargs):
    # 2. The task records the same trace contract used by production traffic.
    return answer_question(item.input, prompt_label="candidate")

def policy_match(*, output, expected_output, **kwargs):
    # 3. A named deterministic rule is easier to audit than a vague quality score.
    passed = expected_output.lower() in output.lower()
    return Evaluation(name="policy-match", value=float(passed))

result = langfuse.run_experiment(
    name="support-2026.09.3",
    data=release_cases,
    task=task,
    evaluators=[policy_match],
    max_concurrency=5,                 # 4. Bound provider and ingestion load.
    metadata={
        "release": "2026.09.3",
        "dataset": "support-cases-v7",
        "owner": "support-quality",  # 5. Name the team that handles failure.
    },
)

if result.summary["policy-match"] < 0.95:
    raise SystemExit("release blocked; review failed cases and the exception path")

langfuse.flush()                       # 6. Preserve the final experiment traces.
```

The dataset owner controls case changes, the evaluation owner controls the rule, and the service owner responds when the gate fails. Save the experiment link and versions with the release record.

**Next:** continue to [Part three: Langfuse platform governance](#senior-detailed) for organization contracts, tenant isolation, capacity planning, audit evidence, and incident ownership.
