# Mid-level interview review: dependable RAGAS evaluation

This review includes Beginner foundations and adds team-scale contracts, calibration, CI gates, cost controls, privacy, and production sampling.

## Fast cumulative review

| Topic | Beginner foundation | Mid-level answer |
|---|---|---|
| Mental model | Locate retrieval or generation failure | Map every metric to a product risk and owner |
| Dataset | Question, contexts, response, reference | Validate stable IDs, provenance, slices, source revision, and snapshot hash |
| Core metrics | Faithfulness, relevancy, precision, recall | Choose the correct variant and calibrate thresholds against human labels |
| Interpretation | Inspect weak rows | Compare paired deltas, distributions, failure classes, and critical slices |
| Custom metrics | One clear rubric | Test boundary cases, agreement, strictness, cost, and version |
| Testsets | Five curated rows | Generate candidates, review them, deduplicate, and protect a holdout |
| Regression | Freeze comparison inputs | Add aggregate and must-pass slice gates in CI |
| Security | Minimize and redact | Enforce field allowlists, approved judge routes, access, and retention |
| Scale | Run locally | Smoke test, bound concurrency/retries, checkpoint, and budget tokens |
| Monitoring | Manual comparison | Sample production drift and promote reviewed incidents into tests |
| Ownership | Keep notes | Store manifests and assign data, metric, platform, and service owners |

## Contract and run diagram

```text
versioned cases -> schema check -> privacy transform -> RAGAS workers
       |                                              |
       +-> case IDs + slices                 row scores + failures
                                                      |
                                   paired comparison -> CI decision
```

## Gate design table

| Gate | Good use | Risk if used alone |
|---|---|---|
| Mean score floor | Broad health | Hides critical regressions |
| Paired delta | Measures candidate change | Can be noisy on small sets |
| Must-pass cases | Protects known severe risks | Overfits known incidents |
| Critical-slice floor | Protects languages/products/risks | Needs enough representative cases |
| Human review | Resolves material ambiguity | Costs time and needs trained reviewers |

## Cost equation

```text
estimated judge calls = cases × metrics × calls per metric × repeats/strictness
```

Bound concurrency, retry transient errors, record permanent failures, and cache only when all metric inputs and versions match.

## Common interview questions

### How do you set a threshold?
Label a representative calibration set, measure judge false passes and false fails at candidate thresholds, then select the tradeoff that matches release risk. Record performance by slice.

### Why use stable case IDs?
They support paired comparison, deduplication, lineage, incident promotion, and evidence links. Joining by row order can compare different cases accidentally.

### How do you use synthetic test generation safely?
Use it to propose coverage. Preserve source and generator provenance, reject duplicates and unsupported references, require reviewer approval, and keep production failures and expert cases.

### A metric changed after an upgrade. What do you do?
Stop comparing it with the old version as if nothing changed. Rerun calibration and anchor cases, version the metric, inspect migration notes, and update thresholds only with evidence.

### How should CI report failure?
Publish aggregate and slice results, failed case IDs, paired deltas, judge/runtime failures, and the manifest. Keep protected text in access-controlled artifacts.

### How do you distinguish product drift from judge drift?
Run stable anchor cases alongside production samples. Anchor movement suggests evaluator drift; input-slice movement with stable anchors suggests product or traffic drift.

## 60-second self-test

| Seconds | Prompt | Required phrase |
|---:|---|---|
| 0–10 | Dataset contract? | IDs, schema, provenance, slices, version |
| 10–20 | Threshold basis? | Human calibration and risk |
| 20–30 | Fair gate? | Paired rows plus critical slices |
| 30–40 | Synthetic data rule? | Generate, validate, review, then promote |
| 40–50 | Cost controls? | Smoke, concurrency, retries, checkpoint, budget |
| 50–60 | Drift split? | Stable anchors separate judge from product |
