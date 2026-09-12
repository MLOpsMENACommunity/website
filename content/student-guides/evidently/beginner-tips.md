# Beginner tips and practice lab

## Common errors

| Symptom | Cause | Fix |
|---|---|---|
| Almost every feature drifts | Current window is partial or reference is inappropriate | Validate completeness and baseline identity first |
| Category is treated as numeric | Role inference misread encoded values | Declare categorical columns explicitly |
| Report is green after job failure | Failure was converted to empty/no drift | Preserve `failed` and `no_data` states |
| Drift fires on harmless tiny movement | Large sample makes detector too sensitive | Calibrate magnitude and operational threshold |
| Severe subgroup change is hidden | Only aggregate dataset signal is checked | Monitor approved risk slices with minimum rows |
| HTML leaks customer values | Raw sensitive fields entered artifacts | Allowlist, aggregate/tokenize, restrict, and expire |
| Results cannot be reproduced | Baseline, schema, or version was not stored | Save an immutable manifest with every Snapshot |
| Alert has no response | Threshold has no owner or playbook | Add severity, owner, and action to the contract |

## Practice cards

<div class="cards">
  <div class="card"><span class="icon">1</span><strong>Shift a feature</strong><p>Move one numeric distribution and explain the column-level result.</p></div>
  <div class="card"><span class="icon">2</span><strong>Add a category</strong><p>Introduce a new channel in current data and inspect quality and drift.</p></div>
  <div class="card"><span class="icon">3</span><strong>Break the schema</strong><p>Delete a required column and fail before report execution.</p></div>
  <div class="card"><span class="icon">4</span><strong>Make a manifest</strong><p>Record baseline, window, rows, schema, report, and Evidently version.</p></div>
  <div class="card"><span class="icon">5</span><strong>Delay labels</strong><p>Separate early feature checks from later performance checks.</p></div>
  <div class="card"><span class="icon">6</span><strong>Protect a report</strong><p>Remove IDs and set access plus expiry for artifacts.</p></div>
</div>

## Use a diagnostic order

```text
readiness -> schema -> row count -> reference -> report status
          -> changed columns -> predictions -> labels/business impact
```

This order catches data-pipeline errors before you debate statistics.

## Keep windows comparable

Use the same timezone and aggregation boundary. Compare weekdays with comparable weekdays when seasonality matters. Store window start/end and label coverage rather than relying on filenames.

## Separate three outcomes

| State | Meaning | Response |
|---|---|---|
| Healthy | Valid fresh run within contract | Continue |
| Warning/critical | Valid evidence crossed a rule | Investigate or act |
| Unknown | No data, failed, stale, or insufficient sample | Repair monitor; do not claim health |

## Start small, then automate

Run one synthetic batch, inspect HTML, save JSON, and verify the manifest. Only then schedule the job and connect alerting. A fast local feedback loop prevents a broken monitor from producing a week of misleading history.
