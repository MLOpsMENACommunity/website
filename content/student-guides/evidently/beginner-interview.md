# Beginner interview review: Evidently essentials

Read this before an interview when you need a fast, practical account of reference/current comparison, data quality, drift, prediction behavior, result export, and recurring checks.

## Fast cumulative review

| Topic | Interview-ready answer |
|---|---|
| Purpose | Evidently calculates monitoring evidence for tabular ML data: quality, drift, prediction behavior, and model quality when labels exist |
| Reference | Trusted comparison population such as reviewed training or stable production window |
| Current | New batch or window being assessed |
| Report vs Snapshot | Report defines metrics; running it produces a result Snapshot for specific data |
| Schema | Explicit numeric, categorical, prediction, target, and ID roles prevent misleading treatment |
| Data quality | Checks usability: types, nulls, ranges, categories, duplicates |
| Data drift | Detects distribution change; it does not prove performance degradation |
| Prediction drift | Detects output-distribution movement; investigate inputs, model version, and product changes |
| Model quality | Requires joined labels/targets and valid coverage |
| Automation | Save JSON for systems, HTML for investigation, plus a versioned manifest |
| Security | Allowlist required columns, exclude identifiers, restrict artifacts, set retention |
| Operations | Validate batch completeness before statistics and distinguish failed/no-data from healthy |

## Signal diagram

```text
input validity -> feature drift -> prediction drift -> delayed quality
     schema       population      model output       labels required
```

## Comparison checklist

| Check | Why it matters |
|---|---|
| Same feature meaning | Distribution comparison otherwise has no meaning |
| Complete time windows | Partial data looks like drift |
| Enough rows | Estimates can be unstable |
| Legitimate reference | “Normal” must match the decision |
| Individual columns | Dataset summary can hide the cause |
| Business context | Expected shifts need different action |

## Common interview questions

### What is the difference between data quality and data drift?
Data quality asks whether a batch is structurally usable; drift asks whether its distribution differs from a reference. A valid batch can drift, and a broken batch can appear statistically different.

### Does drift mean a model is inaccurate?
No. Drift is a risk signal. Confirm data validity, inspect affected columns and predictions, then use labels and business impact when available.

### Why define a reference dataset?
A detector requires a comparison population. The reference represents accepted behavior for a specific model, population, and period, so it must be versioned and justified.

### What is a Snapshot?
It is the result created by running a Report definition on current data and optionally reference data. Persist it with run metadata for investigation and history.

### How do you automate Evidently safely?
Check readiness and schema, select only allowed columns, run a pinned report, store JSON/HTML and a manifest, evaluate documented thresholds, and alert an owner.

### What do you do when an alert fires?
Verify completeness and schema first, determine whether change is expected, inspect columns and predictions, check delayed quality, then choose observe, fix data, rollback, or investigate further.

## 60-second self-test

| Seconds | Prompt | Required answer |
|---:|---|---|
| 0–10 | Two compared datasets? | Reference and current |
| 10–20 | Three signal families? | Quality, drift, model/prediction quality |
| 20–30 | Does drift prove harm? | No; it is evidence to investigate |
| 30–40 | Report versus Snapshot? | Definition versus executed result |
| 40–50 | First alert check? | Batch completeness and schema |
| 50–60 | First privacy control? | Allowlist and minimize columns |
