# Part one of three: Build and read your first Langfuse trace

Start here if Langfuse is new to you. You need basic Python and one application that calls an LLM. By the end, you will capture a request, read its trace, compare a prompt change, and protect sensitive data.

<div class="flow">
  <div class="node">OBSERVE<small>capture work</small></div><span class="arrow">&rarr;</span>
  <div class="node">TRACE<small>group a request</small></div><span class="arrow">&rarr;</span>
  <div class="node">SCORE<small>measure quality</small></div><span class="arrow">&rarr;</span>
  <div class="node">DECIDE<small>change safely</small></div>
</div>

## 1. Understand a trace before writing code

Langfuse is an observability and evaluation system for applications that call language models. A **trace** represents one user request or workflow. Inside it, **observations** describe work: a span for retrieval, a generation for a model call, a tool for an external action, or an event for a small point-in-time fact.

Do not treat every model call as a separate story. A support request might retrieve policy documents, assemble a prompt, call a model, and format an answer. The trace keeps those observations together so you can ask, “why was this answer slow or wrong?”

| Object | Meaning | Example |
|---|---|---|
| Trace | End-to-end request | `support-answer` |
| Span | A unit of application work | `retrieve-policy` |
| Generation | A model or completion call | `answer-model` |
| Event | A point-in-time occurrence | `cache-hit` |
| Score | A quality or outcome measurement | `correctness = 1` |

<div class="callout note"><span class="ct">The rule</span>Start with the user request as the root. Children should explain the work needed to produce the answer, not mirror every internal helper function.</div>

<div class="guide-try"><span class="ct">Try it</span><ol><li>Draw one request as a root box.</li><li>Add retrieval, prompt assembly, and model call as children.</li><li>Mark the one value you would need to debug a bad answer.</li></ol><em>If the tree cannot explain the answer, rename or regroup the observations.</em></div>

A useful trace tells a causal story. The root names the user-visible operation. Children name the work that contributed to it, and their nesting explains dependency. If retrieval finishes before generation starts, the tree should show the retrieval span and generation as siblings under the same request, with timestamps that reveal the sequence.

```text trace tree for one support request
support-answer                         TRACE: one user-visible request
|-- validate-input                     SPAN: application work
|-- retrieve-policy                    SPAN: search and ranking
|   |-- vector-search                  SPAN: database call
|   `-- rerank                         SPAN: ranking work
|-- compose-answer                     GENERATION: model input/output/usage
`-- format-response                    SPAN: final application work

Total request time is the root duration.
Model time is the generation duration, not the sum of every child.
```

The tree answers several questions without reading every payload. A long `vector-search` child points to retrieval latency. A fast generation with the wrong prompt version points to release configuration. A failed `format-response` after a successful generation explains why the user saw an error even though the model call completed.

Choose boundaries that match ownership. If the search team owns retrieval, give retrieval a stable span. If one helper function only converts a list to a tuple, tracing it adds noise. Instrument work that can fail, consume material time or cost, cross a service boundary, or answer a recurring debugging question.

## 2. Capture your first request with Python

Install the SDK and configure credentials outside source control. The v4 API uses one observation API instead of separate span and generation constructors. The `@observe` decorator is the quickest safe starting point; it records timing, input, output, and errors around a function.

```bash .env
pip install langfuse
export LANGFUSE_PUBLIC_KEY="pk-lf-..."
export LANGFUSE_SECRET_KEY="sk-lf-..."
export LANGFUSE_BASE_URL="https://cloud.langfuse.com"
```

```python app.py
from langfuse import observe, get_client

langfuse = get_client()

@observe(name="support-answer")
def answer_question(question: str) -> str:
    documents = retrieve_policy(question)
    return call_model(question, documents)

@observe(name="retrieve-policy")
def retrieve_policy(question: str) -> list[str]:
    return ["Refunds are available within 30 days."]

@observe(name="call-chat-model", as_type="generation")
def call_model(question: str, documents: list[str]) -> str:
    return "The refund window is 30 days."
```

The decorator creates a root observation when the function is first entered. Nested decorated functions become children through the active OpenTelemetry context. Use `start_as_current_observation` when the boundary is clearer in a block.

```python block.py
from langfuse import get_client

langfuse = get_client()

with langfuse.start_as_current_observation(
    as_type="span", name="support-answer", input={"question": question}
) as root:
    with langfuse.start_as_current_observation(
        as_type="generation", name="answer-model", model="gpt-4.1"
    ) as generation:
        response = run_model(question)
        generation.update(output=response)
    root.update(output={"answer": response})
```

<div class="guide-try"><span class="ct">Try it</span><ol><li>Decorate the HTTP handler.</li><li>Decorate retrieval and the model call with stable names.</li><li>Open a trace and verify the parent-child tree.</li></ol><em>The first useful milestone is a readable tree, not a dashboard.</em></div>

## 3. Choose the right observation type

Use `span` for application work and `generation` for model calls. Use `tool` for an external action when the integration supports it. Set a useful status message and error level when a child fails; do not hide failure inside a successful root output.

| Field | Meaning |
|---|---|
| `as_type` | Semantic kind of observation |
| `level` | Severity such as `DEBUG`, `DEFAULT`, `WARNING`, or `ERROR` |
| `status_message` | Human-readable failure or state |

<div class="guide-try"><span class="ct">Try it</span><ol><li>Mark retrieval as a span.</li><li>Mark the provider call as a generation.</li><li>Give a failed child a useful status message.</li></ol><em>Types and levels help a reader scan a trace quickly.</em></div>

## 4. Find traces by user, session, and release

A trace is useful only when you can locate the user, session, release, and environment behind it. Use `propagate_attributes` near the request boundary so every child observation receives the same correlating fields. Keep metadata small, stable, and non-sensitive.

```python context.py
from langfuse import observe, propagate_attributes

@observe(name="support-answer")
def handle_request(user_id: str, session_id: str, question: str):
    # 2. Shared fields make the trace searchable without changing node names.
    with propagate_attributes(
        user_id=user_id,
        session_id=session_id,
        metadata={"channel": "web"},
        tags=["support"],
        version="2026.09",
        environment="production",
        trace_name="support-answer",
    ):
        return answer_question(question)
```

| Field | Put there | Avoid |
|---|---|---|
| `user_id` | Stable application user key | Email address when not needed |
| `session_id` | Conversation or workflow key | A new random value per child |
| `version` | Application release | A mutable branch name |
| `environment` | `production`, `staging`, or `dev` | User-provided arbitrary text |
| `metadata` | Small labels for filtering | Prompts, tokens, or secrets |

<div class="callout warn"><span class="ct">Privacy boundary</span>Context fields are searchable. Use internal identifiers and redact user content before capture. A public key identifies a project; it is not permission to expose customer data.</div>

<div class="guide-try"><span class="ct">Try it</span><ol><li>Choose one stable user identifier and one session identifier.</li><li>Add a release value to a local trace.</li><li>Search the UI by session and confirm children share the context.</li></ol><em>Context should help you find a request without becoming the request payload.</em></div>

Correlation fields form an index over your traces. `user_id` groups a person's requests, `session_id` reconstructs a conversation, `release` separates deployments, and `environment` keeps test traffic out of production analysis. These values should describe the request, not duplicate the full request body.

```text how shared attributes propagate
HTTP request
  |  user_id=u_42, session_id=s_9, release=2026.09.12
  v
support-answer trace
  |-- retrieve-policy      inherits the same safe attributes
  |-- compose-answer       inherits the same safe attributes
  `-- format-response      inherits the same safe attributes

Search "release=2026.09.12 AND environment=production"
then group failures by observation name or user-safe segment.
```

Use opaque internal identifiers rather than email addresses or customer names. A searchable field spreads across indexes, exports, dashboards, and retained telemetry. If an operator needs to resolve an opaque ID to a person, keep that mapping in the application system with its existing access controls.

## 5. Capture failures you can debug

Let exceptions remain visible to the observation boundary. Add a short status message for expected failures, but do not replace the exception with a vague “failed”. Include a stable error category in metadata, never a secret or full customer payload.

<div class="callout warn"><span class="ct">Do not swallow</span>A caught exception with no observation update produces a green-looking request and a missing explanation. Preserve the error path and test it.</div>
<div class="guide-try"><span class="ct">Try it</span><ol><li>Force the model stub to raise.</li><li>Open the resulting trace.</li><li>Confirm the failing child and root outcome are understandable.</li></ol><em>Failure visibility is more valuable than a perfect happy-path demo.</em></div>

## 6. Track the prompt and model behind an answer

Hard-coded prompts make changes difficult to compare. Prompt Management stores a named template with versions and labels. Fetch the intentional production label, compile variables, and link the prompt version to the generation that used it.

```python prompts.py
from langfuse import get_client

langfuse = get_client()
prompt = langfuse.get_prompt("support-answer", label="production")
compiled = prompt.compile(
    company_policy="Refunds are available within 30 days.",
    question="Can I return this item?",
)

with langfuse.start_as_current_observation(
    as_type="generation", name="answer-model", model="gpt-4.1",
    input={"prompt_name": "support-answer", "prompt_version": prompt.version},
) as generation:
    output = run_model(compiled)
    generation.update(output=output)
```

| Practice | Why it matters |
|---|---|
| Name prompts by domain | Refactors do not erase meaning |
| Use `production` deliberately | A random latest version is not a release policy |
| Record prompt version | Quality changes need an explanation |
| Keep variables explicit | Reviewers can reproduce the request |

Prompt caching keeps retrieval off the critical path after the first fetch. Still design a fallback for a cold instance and decide which last-known version is safe.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Create two versions of a short support prompt.</li><li>Send the same question through both versions.</li><li>Compare prompt version, latency, model, and output in the trace.</li></ol><em>A prompt change is a deployment input even when application code did not change.</em></div>

## 7. Add a score that measures one outcome

A trace tells you what happened; a score tells you whether the result was useful. Use numeric scores for a measurable range, categorical scores for a named class, and boolean scores for a yes/no outcome. Keep the score name and definition stable.

```python score.py
from langfuse import get_client

langfuse = get_client()

langfuse.create_score(
    trace_id=trace_id,
    name="correctness",
    value=1.0,
    data_type="NUMERIC",
    comment="Matches the policy answer",
)

langfuse.create_score(
    trace_id=trace_id,
    name="route",
    value="refunds",
    data_type="CATEGORICAL",
)
```

Start with one score that answers one decision. “Quality” is too broad; “policy-correct” has an observable meaning. Human reviewers can add scores through annotation workflows, while automated evaluators can apply the same named score to many traces.

<div class="guide-compare"><div class="guide-compare-col good"><h4>Useful score</h4><ul><li>Has a definition</li><li>Has a stable name</li><li>Explains disagreements</li></ul></div><div class="guide-compare-col bad"><h4>Weak score</h4><ul><li>Combines five ideas</li><li>Changes meaning weekly</li><li>Has no owner</li></ul></div></div>

<div class="guide-try"><span class="ct">Try it</span><ol><li>Write a binary correctness rule for one answer type.</li><li>Apply it to five traces.</li><li>Read every disagreement before changing the prompt.</li></ol><em>Measurement improves only after its definition is reviewable.</em></div>

Scores need a subject and a definition. A trace-level score can describe the final task outcome. An observation-level score can target retrieval or one generation. Put the score at the narrowest level that still matches the claim; otherwise an engineer opens a poor trace and cannot tell which stage earned the result.

<div class="flow"><div class="node">TRACE<small>one support request</small></div><span class="arrow">&rarr;</span><div class="node">GENERATION<small>model answer</small></div><span class="arrow">&rarr;</span><div class="node">SCORE<small>groundedness = 0.82</small></div><span class="arrow">&rarr;</span><div class="node">DATASET ITEM<small>expected policy behavior</small></div></div>

Keep the scoring rule beside its name. `quality=0.8` means little without a scale, rubric version, evaluator, and target. Prefer a name such as `policy_groundedness_v2`, document that `1.0` means every factual claim has policy support, and attach evaluator metadata. Human labels and automated scores may share a concept, but they should retain their source so you can compare agreement.

## 8. Compare a change on a small test dataset

A dataset is a named collection of test cases. Each item should include an input and, when possible, an expected output or evaluation criterion. Run the same task against fixed cases so prompt and model changes are comparable.

```python experiment.py
from langfuse import get_client, Evaluation

langfuse = get_client()

def task(*, item, **kwargs):
    return answer_question(item.input)

def exact_match(*, input, output, expected_output, **kwargs):
    value = float(output.strip().lower() == expected_output.strip().lower())
    return Evaluation(name="exact-match", value=value)

result = langfuse.run_experiment(
    name="support-baseline",
    data=[
        {"input": "Refund window?", "expected_output": "30 days"},
    ],
    task=task,
    evaluators=[exact_match],
    max_concurrency=2,
)
print(result.format())
```

Keep evaluation data redacted and versioned. A production trace can become a regression case after an incident, but only after an owner removes unnecessary identifiers and writes a clear expected behavior.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Create three redacted cases for one support intent.</li><li>Run the current prompt against them.</li><li>Save the result as a baseline before editing.</li></ol><em>Your first experiment is a comparison instrument, not a claim that one score defines quality.</em></div>

## 9. Inspect latency, tokens, and estimated cost

Generations can record model and usage details. A token count without the model, route, and release is difficult to price or explain. Capture provider usage when available, then reconcile estimates against the provider invoice.

```python usage.py
with langfuse.start_as_current_observation(
    as_type="generation", name="answer-model", model="gpt-4.1",
) as generation:
    response = run_model(question)
    generation.update(
        output=response.text,
        usage_details={
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
        },
    )
```

Use the UI first: filter by release, model, environment, and score. Add a custom report only when the built-in view cannot answer a recurring operational question. A useful first dashboard has request volume, p95 latency, error rate, cost estimate, and quality score by release.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Compare one model across two releases.</li><li>Find the slowest representative trace.</li><li>Check whether its prompt or retrieval child is responsible.</li></ol><em>Aggregate metrics find the area; a trace explains the cause.</em></div>

## 10. Protect keys, customer data, and trace delivery

Use separate projects or environments for development and production. Store the secret key in the deployment secret manager. Public and secret keys must never appear in browser code or committed examples. Langfuse queues data in the background, so short-lived jobs must flush before exit.

```python safe_client.py
from langfuse import Langfuse

def mask(value):
    if isinstance(value, str):
        return value.replace("alice@example.com", "[EMAIL]")
    return value

langfuse = Langfuse(mask=mask)

try:
    run_job()
finally:
    langfuse.flush()
```

For larger systems, add retention, access review, sampling, alert ownership, and a documented self-hosting decision. Do not sample away every error trace. A dropped trace is an operational tradeoff, not a free optimization.

| Control | Beginner decision |
|---|---|
| Secrets | Deployment environment only |
| PII | Mask before ingestion |
| Delivery | `flush()` short-lived workers |
| Ownership | Name the dashboard and incident owner |
| Retention | Match policy, not convenience |

<div class="guide-try"><span class="ct">Try it</span><ol><li>Put keys in local environment variables.</li><li>Send a deliberately sensitive test value through the mask callback.</li><li>Run a short script and verify it flushes before exit.</li></ol><em>Telemetry is production data. Give it the same care as application data.</em></div>

## 11. Separate development from production

Use a development project for experiments and a production project for customer traffic. Keep environment names explicit and rotate credentials through the secret manager. Never solve a local setup problem by copying production keys into a notebook.

| Environment | Data | Key policy |
|---|---|---|
| Development | Synthetic or redacted | Individual development credential |
| Staging | Test fixtures | Separate project or environment |
| Production | Minimized customer telemetry | Managed secret and reviewed access |

<div class="guide-try"><span class="ct">Try it</span><ol><li>Create a synthetic local request.</li><li>Verify its environment field.</li><li>Remove the key from shell history after testing.</li></ol><em>Environment separation prevents a teaching example from becoming a data incident.</em></div>

Delivery is asynchronous in many SDK paths. Your request code records observations in memory, the client batches them, and a background worker sends them to Langfuse. This keeps telemetry latency away from the user path, but a short-lived process can exit before the batch leaves.

```text telemetry delivery path
application thread -> SDK buffer -> background batch -> Langfuse ingest -> UI/index
       |                 |               |                    |
   never block       bounded memory   retry policy       searchable trace
       |
       +-> on shutdown: flush with a bounded timeout
```

Treat telemetry as a secondary path. An ingestion outage should not make the support API unavailable. Log or measure dropped batches, expose queue health, and flush during worker or CLI shutdown. For a long-running web process, let batching work normally; flushing after every request removes the performance benefit and can amplify an outage.

## 12. Debug a trace in a repeatable order

Start at the root input and output, then inspect the slowest or failed child, then compare a known-good trace. This order keeps debugging focused. A dashboard tells you where to look; the trace tells you what changed.

<div class="guide-compare"><div class="guide-compare-col good"><h4>Outside in</h4><ul><li>Request outcome</li><li>Child timing</li><li>Model input/output</li><li>Score and version</li></ul></div><div class="guide-compare-col bad"><h4>Guess first</h4><ul><li>Read random logs</li><li>Change the prompt</li><li>Rerun one example</li><li>Declare fixed</li></ul></div></div>
<div class="guide-try"><span class="ct">Try it</span><ol><li>Choose one failed and one successful trace.</li><li>Compare their tree shape.</li><li>Write the smallest changed field.</li></ol><em>Comparison beats intuition.</em></div>

## Beginner checkpoint: can you do these tasks?

Before moving on, you should be able to instrument one request, identify its model generation, find it by session, compare a prompt version, attach a defined score, run a fixed case, inspect usage, and flush a short process.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Run the complete example from this pane.</li><li>Open its trace and locate every field in the checklist.</li><li>Explain one safe next change.</li></ol><em>Mid-level work begins when the basic path is repeatable.</em></div>

## 13. Complete annotated example: trace one support answer

The following combines the beginner path: one root, propagated context, a child generation, explicit usage, and a final flush.

```python complete.py
from langfuse import get_client, observe, propagate_attributes

langfuse = get_client()

# 1. One root represents the user-visible request.
@observe(name="support-answer")
def answer(*, user_id: str, session_id: str, question: str) -> str:
    # 2. Shared fields make the trace searchable without changing node names.
    with propagate_attributes(
        user_id=user_id,
        session_id=session_id,
        version="2026.09",
        environment="staging",
        metadata={"channel": "web"},
    ):
        # 3. Record the model call as a generation with model and input context.
        with langfuse.start_as_current_observation(
            as_type="generation", name="answer-model", model="gpt-4.1",
            input={"question": question},
        ) as generation:
            output = "Refunds are available within 30 days."
            # 4. Usage and output explain cost and behavior for this call.
            generation.update(
                output=output,
                usage_details={"input_tokens": 18, "output_tokens": 9},
            )
        return output

try:
    answer(user_id="user-42", session_id="session-7", question="Refund window?")
# 5. Short-lived processes must drain buffered telemetry before exit.
finally:
    langfuse.flush()
```

**Next:** continue to [Part two: reliable production tracing](#mid-detailed) for contracts, experiment gates, cost reconciliation, privacy controls, and rollout ownership.
