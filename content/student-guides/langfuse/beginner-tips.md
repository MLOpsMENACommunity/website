# Beginner tips and practice lab

Use this lab while instrumenting your first application. Each exercise targets a mistake that makes traces hard to find, read, or trust.

## Common errors

| Symptom | Cause | Fix |
|---|---|---|
| No trace appears | Wrong keys, host, or process exits early | Check environment and call `flush()` |
| One flat trace | Only the handler is instrumented | Instrument retrieval and model boundaries |
| Children have wrong user | Context added too late | Use `propagate_attributes` at the request boundary |
| Prompt changes cannot be explained | Version not recorded | Fetch by label and record prompt version |
| Scores disagree | Rubric is vague | Define one observable criterion |
| Customer text is visible | Capture was not minimized or masked | Redact before ingestion |
| Cost report is unreliable | Usage lacks model or pricing context | Store model, route, release, and usage |
| Short script loses data | Background queue was not drained | `flush()` in `finally` |

## Practice cards

<div class="cards">
<div class="card"><div class="icon">01</div><h4>Draw the tree</h4><p>Take one request and label root, retrieval, prompt, generation, and output. Remove helpers that do not help diagnosis.</p></div>
<div class="card"><div class="icon">02</div><h4>Name the decision</h4><p>Replace “quality” with a score that answers one decision, such as policy-correct or citation-present.</p></div>
<div class="card"><div class="icon">03</div><h4>Break delivery</h4><p>Run a short process with and without flush. Record what disappears and add shutdown ownership to the runbook.</p></div>
<div class="card"><div class="icon">04</div><h4>Find the slow child</h4><p>Add a slow retriever, then use the trace tree instead of guessing from total request latency.</p></div>
</div>

## 1. Give observations stable, readable names

Name observations by domain boundary: `support-answer`, `retrieve-policy`, and `answer-model`. Do not put random request IDs in names; IDs belong in context. Stable names make filters and comparisons useful after a function is renamed.

<ol class="guide-steps"><li><b>Root the request</b>Use one name for the user-visible operation.</li><li><b>Separate work</b>Make retrieval and model calls visible children.</li><li><b>Explain exceptions</b>Use status and error information when work fails.</li></ol>

## 2. Capture only the data you need

Inputs and outputs are powerful but can contain secrets and personal data. Decide what each observation needs before enabling broad capture. Use metadata for labels, not as a second database.

<div class="callout note"><span class="ct">Practice</span>Start with a redacted fixture. If a field is not needed to answer a debugging or evaluation question, do not capture it.</div>

## 3. Repeat one prompt comparison

Fix the input, prompt label, model, release, and score definition. Change one variable. If all five change together, the trace may be detailed while the experiment remains uninterpretable.

<div class="guide-compare"><div class="guide-compare-col good"><h4>Good comparison</h4><ul><li>Same cases</li><li>One prompt change</li><li>Versioned score rule</li></ul></div><div class="guide-compare-col bad"><h4>Bad comparison</h4><ul><li>New dataset</li><li>New model and prompt</li><li>Unnamed human opinion</li></ul></div></div>

Next: **Mid-level Tips & Tricks** adds failure isolation, safe integrations, and release gates.

## Beginner practice checkpoint

Keep a one-page runbook with the request boundary, required environment variables, masking rule, score definition, and flush behavior. Review it whenever the integration or model provider changes.
