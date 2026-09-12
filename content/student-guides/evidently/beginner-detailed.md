# Part one of three: Evidently for day-to-day ML monitoring

Start here if you train or operate a model and need to answer a practical question: **did the data or model behavior change after deployment?** You will compare a trusted reference period with a current batch, define column roles, run quality and drift checks, save evidence, and schedule the same check safely. Examples use the pinned `evidently==0.7.15` API; keep that version in your lock file because monitoring APIs and defaults can change.

<div class="flow"><div class="node">REFERENCE<small>known comparison baseline</small></div><span class="arrow">&rarr;</span><div class="node">CURRENT<small>new production batch</small></div><span class="arrow">&rarr;</span><div class="node">REPORT<small>metrics and conditions</small></div><span class="arrow">&rarr;</span><div class="node">ACTION<small>inspect, alert, or approve</small></div></div>

## 1. Understand what Evidently monitors

Evidently computes monitoring evidence from tabular data. It can describe **data quality** (missing values, ranges, types, duplicates), **data drift** (distribution change), and **prediction quality** when labels are available. These are related signals, not interchangeable verdicts.

| Signal | Question | What it does not prove |
|---|---|---|
| Data quality | Is the batch structurally usable? | That values match the training population |
| Data drift | Did a distribution change? | That model quality became worse |
| Prediction drift | Did predicted classes or scores change? | Why they changed |
| Model quality | Are predictions accurate once labels arrive? | That future traffic will remain stable |

A checkout model may receive a larger share of mobile users. Device features drift, yet conversion accuracy can remain stable. Conversely, a label definition can change while feature distributions look normal and accuracy collapses. Monitor the chain rather than relying on one red badge.

```text monitoring signal chain
schema/quality -> feature distributions -> prediction distributions -> delayed outcomes
      |                    |                       |                  |
 ingest failure       population shift       model response       real quality
```

<div class="guide-try"><span class="ct">Try it</span><ol><li>Choose one model.</li><li>Write one quality, drift, prediction, and performance risk.</li><li>Name the team that can act on each signal.</li></ol><em>You should end with signals tied to decisions, not a list of attractive charts.</em></div>

## 2. Install a pinned version and prepare two batches

Create an isolated environment. Never place database passwords or object-store keys in a notebook; use your platform's secret mechanism.

```bash setup
python -m venv .venv
.venv\Scripts\activate
pip install "evidently==0.7.15" "pandas==2.3.2"
```

A **reference** dataset is the comparison baseline: often a reviewed training, validation, or stable production window. A **current** dataset is the new window you want to assess. They must represent the same feature contract.

```python make_batches.py
import pandas as pd

reference = pd.DataFrame({
    "age": [22, 29, 35, 41, 48, 53, 61, 67],
    "channel": ["web", "web", "store", "web", "store", "web", "store", "web"],
    "prediction": [0, 0, 0, 1, 1, 1, 1, 1],
})
current = pd.DataFrame({
    "age": [38, 44, 49, 55, 58, 63, 70, 74],
    "channel": ["app", "app", "web", "app", "web", "app", "app", "web"],
    "prediction": [0, 1, 1, 1, 1, 1, 1, 1],
})
```

This tiny dataset teaches the mechanics but cannot justify a production threshold. Real windows need enough rows for stable estimates and must account for seasonality.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Make two 50-row CSV files with identical columns.</li><li>Shift one numeric feature and add one categorical value only to current.</li><li>Write why your chosen reference is legitimate.</li></ol></div>

## 3. Define column roles before calculating metrics

Column names alone do not explain intent. Evidently can infer many columns, but an explicit data definition prevents an integer category from being treated as continuous or an identifier from becoming a feature. Keep IDs and raw personal data out unless a diagnostic truly requires them.

```python schema.py
from evidently import DataDefinition, Dataset

schema = DataDefinition(
    numerical_columns=["age"],
    categorical_columns=["channel"],
)
reference_ds = Dataset.from_pandas(reference, data_definition=schema)
current_ds = Dataset.from_pandas(current, data_definition=schema)
```

Validate required columns, types, nullability, and accepted categories before the report. That separates ingestion defects from statistical change.

| Role | Examples | Monitoring treatment |
|---|---|---|
| Numeric feature | age, price | range, missingness, distribution |
| Categorical feature | channel, country | new categories, shares, distribution |
| Prediction | class, probability | output drift and model checks |
| Target | purchased, fraud | delayed quality when available |
| Identifier | customer_id | exclude or tokenize; use for joins only |

<div class="guide-try"><span class="ct">Try it</span><ol><li>Classify every column in one model input.</li><li>Remove direct identifiers.</li><li>Add a pre-check that fails when a required feature disappears.</li></ol></div>

## 4. Run a data summary and drift report

A `Report` is the reusable definition of what to calculate. Calling `run()` on current and reference data creates a **Snapshot**: the result for this particular pair of batches. The report definition belongs in version control; the snapshot belongs in result storage with run metadata.

```python monitor.py
from evidently import Report
from evidently.presets import DataSummaryPreset, DataDriftPreset

report = Report([
    DataSummaryPreset(),
    DataDriftPreset(),
])
snapshot = report.run(current_ds, reference_ds)
snapshot.save_html("monitoring-report.html")
snapshot.save_json("monitoring-result.json")
```

Open HTML for investigation and use JSON for automation. Read the dataset result first, then individual columns. A dataset-level drift share can tell you that several features moved, but the column views tell you which ones and how.

```text
Report definition --run(reference, current)--> Snapshot
      |                                      /       \
 versioned metrics                     HTML review   JSON automation
```

<div class="guide-try"><span class="ct">Try it</span><ol><li>Run the report on your synthetic batches.</li><li>Open the HTML and identify the shifted columns.</li><li>Save JSON and record both input row counts beside it.</li></ol></div>

## 5. Interpret drift without jumping to conclusions

A drift detector compares distributions. Numeric and categorical columns need suitable statistical methods, and sensitivity depends on sample size. Large datasets can flag tiny, harmless changes; small datasets can miss important movement. Evidently defaults are a starting point, not a policy.

Use three questions for each alert:

1. **Is the data valid?** Check schema, nulls, duplicate jobs, and time boundaries.
2. **Is the change expected?** Promotions, holidays, product launches, and geography changes create legitimate shifts.
3. **Does it matter?** Inspect prediction behavior and labeled performance, then involve the feature or model owner.

| Pattern | Likely investigation |
|---|---|
| One feature jumps suddenly | Pipeline mapping or upstream source change |
| Many related features move | Real population or product shift |
| Prediction moves, features look stable | Model/version or unmonitored feature change |
| Drift stays low, quality falls | Concept/label shift or blind spot |

<div class="guide-try"><span class="ct">Try it</span><ol><li>Pick one drift result.</li><li>Write a data-failure explanation and a real-world explanation.</li><li>Name one additional signal that distinguishes them.</li></ol></div>

## 6. Add conditions and operational thresholds

A chart supports exploration; a condition supports automation. In Evidently's current Report API, metric presets expose generated tests/conditions and can be supplemented with explicitly configured metrics. Treat every threshold as a monitoring contract: document the baseline, detector, minimum sample, severity, and response.

```yaml monitoring-contract.yaml
window: 24h
reference: approved-production-2026-08
minimum_rows: 5000
rules:
  - signal: data_drift_share
    warn: 0.20
    critical: 0.40
  - signal: missing_share
    critical: 0.02
action:
  warn: create-investigation
  critical: page-model-owner
```

Do not page someone for every statistically significant column. Use warning signals for investigation and reserve critical alerts for risks with an immediate playbook.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Write one warning and one critical rule.</li><li>Add minimum rows and an owner.</li><li>Explain the evidence behind each threshold.</li></ol></div>

## 7. Add prediction quality when outcomes arrive

Drift is available without labels, but actual model quality usually is not. When outcomes arrive, join them to stored predictions in a protected processing step, then create datasets whose data definition identifies prediction and target columns. The exact metric preset depends on whether the task is classification, regression, or ranking, but the reasoning pattern is the same: verify the join, state coverage, calculate task metrics, and compare them with an appropriate reference.

A delayed join can be biased. Fraud labels may arrive quickly for obvious cases and slowly for disputed ones; churn is known only after a waiting period. If only 40% of predictions have labels, an accuracy value describes that observed 40%, not the complete production population.

| Before trusting performance | Question to answer |
|---|---|
| Join validity | Did each prediction receive the correct outcome? |
| Coverage | What share of eligible predictions has a label? |
| Delay | How long after prediction is the metric mature? |
| Slice coverage | Are important groups represented among labeled rows? |
| Definition | Did target meaning or measurement policy change? |

```text delayed-quality path
prediction event --tokenized key--> protected outcome join <--label event
                                      |
                            labeled monitoring batch
                                      |
                       quality metric + coverage + delay
```

Use drift as an early-warning signal and labeled quality as stronger outcome evidence. Neither replaces the other: labels arrive late, while drift can miss concept changes that leave input distributions stable.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Add a target column to a copy of your example data.</li><li>Remove outcomes from several rows to imitate delay.</li><li>Report metric coverage and explain why an unlabeled row cannot silently disappear.</li></ol></div>
## 8. Schedule, store, and diagnose recurring checks

Run monitoring after a complete batch lands. Save a manifest that identifies model version, feature schema, baseline, current window, Evidently version, report version, and outcome. Store protected artifacts with limited access and retention; report HTML can contain actual values.

```text recurring batch
warehouse ready -> schema check -> privacy transform -> Evidently report
                                             |              |
                                      safe feature set   snapshot + manifest
                                                             |
                                                alert router -> owner
```

Debug in this order: batch completeness, time zones, schema, row count, reference identity, report execution, then statistical meaning. This avoids treating an incomplete partition as model drift.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Schedule a daily local job.</li><li>Make it refuse an incomplete batch.</li><li>Save a timestamped JSON result and manifest without raw identifiers.</li></ol></div>

## 9. Complete annotated example: a first safe monitor

The example below keeps configuration separate from execution and records enough context to reproduce a result.

```python daily_monitor.py
from pathlib import Path
import json, hashlib
import pandas as pd
from evidently import DataDefinition, Dataset, Report
from evidently.presets import DataSummaryPreset, DataDriftPreset

OUT = Path("artifacts")
OUT.mkdir(exist_ok=True)
reference = pd.read_parquet("approved/reference.parquet")  # reviewed baseline
current = pd.read_parquet("landing/current.parquet")       # completed batch
required = {"age", "channel", "prediction"}
if missing := required - set(current.columns):
    raise ValueError(f"missing required columns: {sorted(missing)}")
if len(current) < 500:
    raise ValueError("current batch is too small for this contract")

schema = DataDefinition(
    numerical_columns=["age"],
    categorical_columns=["channel"],
)
ref_ds = Dataset.from_pandas(reference[list(required)], data_definition=schema)
cur_ds = Dataset.from_pandas(current[list(required)], data_definition=schema)
report = Report([DataSummaryPreset(), DataDriftPreset()])
snapshot = report.run(cur_ds, ref_ds)
snapshot.save_html(OUT / "daily.html")       # human investigation
snapshot.save_json(OUT / "daily.json")       # automation input

manifest = {
    "evidently": "0.7.15",
    "report": "daily-drift-v1",
    "reference": "approved/reference.parquet",
    "current_rows": len(current),
    "schema_hash": hashlib.sha256(",".join(sorted(required)).encode()).hexdigest(),
}
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
```

<div class="guide-try"><span class="ct">Try the complete build</span><ol><li>Replace the sample files with privacy-safe data from one owned model.</li><li>Run twice and compare the saved manifests.</li><li>Explain one drift result, one unknown limitation, and the next action to a teammate.</li></ol><em>Completion means another learner can reproduce your result and understand its limits.</em></div>

You can now create and explain a repeatable monitor. **Continue to [part two: production monitoring contracts](#mid-detailed)**, where you will calibrate detectors, monitor slices and delayed labels, operate batch pipelines, and route secure alerts at scale.

