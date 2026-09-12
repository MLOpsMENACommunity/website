# Beginner interview review: Langfuse essentials

Use this review after the beginner lesson. Practise short answers first, then explain one trace from request to score in your own words.

## Fast review by topic

| Question | Short answer |
|---|---|
| What is a trace? | One end-to-end request or workflow. |
| What is an observation? | A unit of work inside a trace. |
| Span vs generation? | A span is application work; a generation is a model call. |
| What is a score? | A measurement attached to a trace or observation. |
| Why names matter? | Stable names make filtering and comparisons survive refactors. |

<div class="flow"><div class="node">REQUEST<small>root trace</small></div><span class="arrow">&rarr;</span><div class="node">RETRIEVE<small>span</small></div><span class="arrow">&rarr;</span><div class="node">MODEL<small>generation</small></div><span class="arrow">&rarr;</span><div class="node">SCORE<small>decision input</small></div></div>

## Python SDK patterns to remember

| Need | Python v4 pattern |
|---|---|
| Automatic boundary | `@observe(name="...")` |
| Manual scoped work | `start_as_current_observation(...)` |
| Model type | `as_type="generation"` |
| Shared context | `propagate_attributes(...)` |
| Short process delivery | `langfuse.flush()` |

```python
with langfuse.start_as_current_observation(as_type="generation", name="model") as generation:
    result = call_model(prompt)
    generation.update(output=result)
```

## How prompts, scores, and experiments connect

| Topic | Interview line |
|---|---|
| Prompt version | Fetch a deliberate label and record the version used. |
| Numeric score | Use a number with a defined range and rubric. |
| Categorical score | Use a stable named class such as `refunds`. |
| Dataset | Fixed, redacted cases for repeatable comparison. |
| Experiment | Same task and dataset, different controlled input. |

## Beginner operations checklist

| Risk | First control |
|---|---|
| PII | Mask before capture; minimize metadata. |
| Missing short-job data | Flush before the process exits. |
| Secret leak | Secret key only in server-side environment. |
| Cost confusion | Record model, usage, release, and route. |
| Noisy traces | Stable names and intentional sampling. |

## Common beginner interview questions

### How would you debug a bad answer?

Open the trace, inspect the root input and output, then walk retrieval, prompt, and generation children. Compare the prompt version, model, release, and score with a known-good trace.

### Why not create one trace per model call?

That loses the request story. One trace lets you see retrieval, tool calls, retries, and model generations together.

### How do you compare two prompts?

Use the same redacted dataset, version both prompts, record model and release, run an experiment, and compare a defined score.

### How do you protect customer data?

Minimize capture, mask known identifiers, restrict project access, separate environments, and define retention. Never place secret keys in frontend code.

### What happens when the process is short-lived?

The SDK buffers asynchronously, so call `flush()` or `shutdown()` before exit.

## 60-second self-test

| Seconds | Prompt | Your answer should include |
|---:|---|---|
| 0-12 | Trace, observation, span, generation, score? | One request, its work, model calls, and a defined outcome |
| 12-24 | How do you mark a model call? | `as_type="generation"` |
| 24-36 | Which fields help you find a trace? | User, session, release, environment |
| 36-48 | Why record prompt version? | Reproduce and compare behavior |
| 48-60 | Why can a precise score be useless? | Vague rubric or no decision tied to it |

<div class="callout tip"><span class="ct">Answer key</span>A good answer connects the tree to a decision: identify the request, inspect the work, measure the outcome, and choose the next change with evidence.</div>

Next: **Mid-level Interview Review** adds integration boundaries, retries, evaluation design, and production ownership.

## Beginner scenario: debug one bad answer

| Scenario | First move |
|---|---|
| Bad answer | Open trace, inspect retrieval, prompt, generation |
| Missing trace | Check keys, destination, execution, network, flush |
| Cost spike | Group usage by model, route, release |
| PII concern | Stop broad capture and verify masking |
| Score disagreement | Read rubric and compare human examples |
