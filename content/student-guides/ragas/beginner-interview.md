# Beginner interview review: RAGAS essentials

Read this before an interview for a role that uses RAG evaluation. Start with the tables, then answer the questions without notes.

## Fast review by topic

| Topic | Morning-of-interview answer |
|---|---|
| Purpose | RAGAS measures relationships among the question, retrieved contexts, response, and reference so you can locate RAG failures. |
| Dataset | Use one row per case; keep contexts as an ordered list; include a reviewed reference when the metric requires it. |
| Faithfulness | Checks whether response claims are supported by retrieved context. |
| Response relevancy | Checks whether the response addresses the user input. |
| Context precision | Checks whether retrieval ranks useful evidence ahead of noise. |
| Context recall | Checks whether retrieved contexts contain evidence needed for the reference. |
| Interpretation | Read row-level failures and slices, not only averages. |
| Custom metric | Add one precise product rubric and test clear passes and failures. |
| Comparison | Freeze dataset, judge, metrics, and versions; compare paired rows. |
| Security | Minimize and redact content before sending it to an evaluator model. |

## Failure map

```text
                 RETRIEVAL                         GENERATION
missed evidence: low context recall     unsupported claim: low faithfulness
ranked noise:    low context precision  missed intent:      low relevancy
```

## Required fields at a glance

| Metric | User input | Contexts | Response | Reference |
|---|:---:|:---:|:---:|:---:|
| Faithfulness |  | ✓ | ✓ |  |
| Response relevancy | ✓ |  | ✓ |  |
| Context precision with reference | ✓ | ✓ |  | ✓ |
| LLM context recall |  | ✓ |  | ✓ |

Implementations evolve, so state the exact RAGAS version and metric variant in real work.

## Minimal workflow

```python
samples = [SingleTurnSample(
    user_input=question,
    retrieved_contexts=contexts,
    response=answer,
    reference=expected,
)]
dataset = EvaluationDataset(samples=samples)
result = evaluate(dataset=dataset, metrics=[
    Faithfulness(llm=judge),
    ResponseRelevancy(llm=judge, embeddings=embeddings),
])
rows = result.to_pandas()
```

## Common interview questions

### Why not use one overall quality score?
It hides the failed component. Separate retrieval coverage, ranking, groundedness, and intent alignment so the team knows what to change.

### Can a RAGAS score be wrong?
Yes. Judge behavior, ambiguous rubrics, poor references, malformed fields, and model variance can distort it. Inspect rows and calibrate against human labels.

### How would you compare two retrievers?
Use the same questions, references, generation settings, judge, metric versions, and package lock. Compare context precision and recall per row and by risk slice.

### What is the difference between faithfulness and correctness?
Faithfulness asks whether the answer is supported by supplied contexts. A faithful answer can repeat incorrect source material. Correctness compares the answer with expected truth or a reference.

### When do you write a custom metric?
When product requirements such as citation format, policy adherence, or tone are not represented by core metrics. Define one observable concept and test boundary cases.

### How do you protect user data?
Collect only required fields, redact or tokenize identifiers, route sensitive cases to approved judges, restrict artifacts, and set retention.

## 60-second self-test

| Seconds | Prompt | Your answer should include |
|---:|---|---|
| 0–10 | Name the four fields. | Question, contexts, response, optional/required reference |
| 10–20 | Low context recall means? | Retrieval missed needed evidence |
| 20–30 | Low faithfulness means? | Response contains unsupported claims |
| 30–40 | Fair comparison needs? | Same cases, judge, metrics, versions |
| 40–50 | Why inspect rows? | Means hide severe or sliced failures |
| 50–60 | First privacy action? | Minimize fields before redaction and routing |
