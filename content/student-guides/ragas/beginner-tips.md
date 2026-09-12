# Beginner tips and practice lab

## Common errors

| Symptom | Cause | Fix |
|---|---|---|
| Context metric crashes or behaves oddly | Contexts were joined into one string | Pass `retrieved_contexts` as an ordered list of strings |
| Recall or reference precision cannot run | The row has no reference | Add a reviewed reference or choose a metric variant that does not require one |
| Scores change between runs | Judge calls are probabilistic or model aliases changed | Pin model/version, use stable settings, repeat key cases, and record the manifest |
| High mean but users still report failures | Severe rows or slices are hidden by aggregation | Inspect row-level results and segment by risk, language, and intent |
| Faithfulness is high but answer is wrong | Source context itself is wrong | Check source correctness separately; groundedness is not factual truth |
| Evaluation is unexpectedly expensive | Too many rows, metrics, or judge calls | Run a small smoke slice and estimate calls before the full run |
| Provider rejects requests | Missing credential, quota, or unsupported endpoint | Validate one synthetic row and check provider configuration |
| Sensitive text appears in artifacts | Raw fields were exported without review | Minimize, redact, restrict access, and set retention |

## Practice cards

<div class="cards">
  <div class="card"><span class="icon">1</span><strong>Label one row</strong><p>Mark question, ranked contexts, response, and reference. Identify the field each core metric reads.</p></div>
  <div class="card"><span class="icon">2</span><strong>Break retrieval</strong><p>Remove the supporting chunk. Predict context recall and faithfulness before rerunning.</p></div>
  <div class="card"><span class="icon">3</span><strong>Add noise</strong><p>Put an irrelevant chunk first. Watch context precision and explain the rank effect.</p></div>
  <div class="card"><span class="icon">4</span><strong>Write a rubric</strong><p>Define one binary citation rule. Test obvious pass and fail responses.</p></div>
  <div class="card"><span class="icon">5</span><strong>Compare top-k</strong><p>Evaluate top-k 3 and 6 on identical cases. Read paired row deltas.</p></div>
  <div class="card"><span class="icon">6</span><strong>Privacy review</strong><p>List the fields leaving your system and remove everything the metric cannot use.</p></div>
</div>

## Choose metrics from the decision

Start with the product question. If you changed retrieval, inspect context recall and precision. If you changed the prompt or model, inspect faithfulness and response relevancy. Add task-specific quality metrics only when they change a decision.

| Change | First metrics | Row inspection |
|---|---|---|
| Chunking or top-k | Context recall + precision | Missing evidence and noisy rank |
| Reranker | Context precision + recall | Rank movement by case |
| Prompt | Faithfulness + relevancy | Unsupported claims and missed intent |
| Model | All applicable plus task rubric | Quality, cost, and latency tradeoff |

## Keep references short and defensible

Write the expected answer from authoritative sources. Include enough detail to judge retrieval coverage but avoid stylistic padding. Have a domain reviewer check high-impact references.

## Save a run manifest

```json run.json
{
  "dataset": "returns-v1",
  "candidate": "top-k-6",
  "ragas": "0.3.9",
  "judge": "gpt-4.1-mini",
  "metrics": ["faithfulness", "answer_relevancy"],
  "created_at": "2026-09-12T09:00:00Z"
}
```

## Debug in the right order

```text
schema -> credentials -> one synthetic row -> five-row smoke
       -> full run -> aggregates -> slices -> failed rows
```

This order catches cheap failures before they create a large judge bill.
