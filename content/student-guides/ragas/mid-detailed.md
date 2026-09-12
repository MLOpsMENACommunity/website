# Part two of three: Make RAGAS reliable for a team

You already know how to shape a dataset, run faithfulness, response relevancy, context precision, and context recall, inspect failed rows, compare a change, and add a basic rubric. This level turns that workflow into a repeatable engineering test with owners, privacy controls, and a budget.

## Where this picks up

| Beginner thread | Mid-level extension | Engineering outcome |
|---|---|---|
| Evaluation mental model | Map metrics to risks and failure taxonomies | Teams know what a score protects |
| Dataset fields | Enforce schemas, provenance, slices, and versioning | Runs compare the same evidence |
| Four core metrics | Calibrate judges and select variants | Thresholds have measured meaning |
| Run and inspect | Batch, retry, cache, and classify failures | Evaluation scales without hiding errors |
| Custom rubric | Test rubric agreement and edge cases | Product rules become dependable checks |
| Small hand-built set | Generate candidates, then review them | Coverage grows without trusting synthetic data blindly |
| One comparison | Add paired deltas and CI gates | Releases fail for explained regressions |
| Basic privacy | Redact, minimize, and control judge routes | Sensitive text stays within policy |
| Manual notes | Store manifests, costs, and artifacts | Another engineer can reproduce a run |

<div class="guide-arch"><strong>Team evaluation loop</strong><code>dataset contract -> slice -> score -> inspect -> calibrate -> gate -> monitor</code></div>

A team evaluation has three layers. The **evidence layer** owns cases and provenance. The **measurement layer** runs versioned metrics against a pinned judge route. The **decision layer** applies thresholds and records why a build passed or failed. Keeping these layers separate prevents a convenient CI script from quietly changing both the evidence and the rule.

```text team evaluation architecture
EVIDENCE      source docs -> reviewed cases -> immutable dataset snapshot
                                      |
MEASUREMENT                           v
              metric registry -> RAGAS workers -> row-level score artifact
                                      |
DECISION                              v
              slice thresholds -> release gate -> manifest + approval record
```

When an engineer challenges a failure, the layers provide an investigation path: open the exact case, reproduce the metric with the same judge configuration, then inspect the policy that converted scores into a decision. If any layer lacks a version, the team cannot distinguish a product regression from evaluation drift.

## 1. Turn rows into a versioned data contract

Validate every row before evaluation. Require stable IDs, source revision, language, product area, and risk slice outside the RAGAS sample when your metadata store needs them. Keep raw production text in an access-controlled location and publish a sanitized evaluation snapshot.

```python contract.py
from pydantic import BaseModel, Field

class EvalCase(BaseModel):
    case_id: str
    user_input: str = Field(min_length=3)
    retrieved_contexts: list[str] = Field(min_length=1)
    response: str = Field(min_length=1)
    reference: str
    slice: str
    source_revision: str

    def to_ragas(self):
        from ragas import SingleTurnSample
        return SingleTurnSample(
            user_input=self.user_input,
            retrieved_contexts=self.retrieved_contexts,
            response=self.response,
            reference=self.reference,
        )
```

Version the input cases separately from generated responses. That lets you rerun a candidate system on the same questions without overwriting baseline evidence.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Add IDs, slices, and source revisions to ten cases.</li><li>Reject empty contexts and duplicate IDs.</li><li>Publish a sanitized snapshot hash.</li></ol><em>A teammate should know exactly which rows a result used.</em></div>

The contract protects meaning as data moves through the system. A stable `case_id` joins baseline and candidate results. `source_revision` proves which policy or knowledge article supported the reference. A slice such as `account_security` lets a small, high-risk population block a release even when the overall mean looks healthy.

```text case lineage
source document @ revision 42
          |
          v
reviewed reference + question --sanitize--> eval case @ v7
          |                                      |
          |                                      +--> baseline response
          |                                      +--> candidate response
          v
review record -------------------------------> paired comparison by case_id
```

Do not version generated responses as if they were source cases. Inputs, references, and metadata define the test; responses are outputs of a particular candidate. Store them together in a run artifact, but preserve the distinction so a later candidate can answer the same cases.

## 2. Select and calibrate metric variants

Use a metric only when its required fields and decision match your experiment. `LLMContextPrecisionWithReference` judges ranking against a reference. `LLMContextPrecisionWithoutReference` works when no gold answer exists but shifts more judgment to the evaluator. ID-based metrics suit systems where retrieved document IDs and reference IDs are authoritative.

| Decision | Metric evidence | Calibration set |
|---|---|---|
| Reduce unsupported claims | Faithfulness | Human labels for supported/unsupported claims |
| Improve intent coverage | Response relevancy | Direct, partial, and off-topic answers |
| Improve ranking | Context precision variant | Ranked useful/noisy chunks |
| Improve retrieval coverage | Context recall variant | References with known supporting sources |

Have two reviewers label a representative sample. Measure judge agreement against those labels and investigate disagreements. Choose thresholds from the cost of false pass and false fail, not from a round number.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Human-label 20 mixed cases.</li><li>Compare the metric decision at three thresholds.</li><li>Pick the threshold that matches your release risk.</li></ol><em>Record disagreements; they reveal unclear data and rubrics.</em></div>

## 3. Build product rubrics that survive edge cases

A rubric needs one concept, observable criteria, and examples near the boundary. Split safety, tone, citation, and completeness into separate metrics so a failure points to one owner.

```python product_metrics.py
from ragas.metrics import AspectCritic

citation_present = AspectCritic(
    name="citation_present",
    definition=(
        "Return 1 when every factual policy claim in the response includes "
        "a source marker such as [1]. Return 0 when any such claim lacks one."
    ),
    llm=judge,
    strictness=3,
)
```

Odd `strictness` values allow majority voting for critic metrics that support it. More judge calls improve stability but increase cost and latency. Verify behavior against your installed version and calibration set.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Collect five boundary examples for one rubric.</li><li>Compare one vote with three votes.</li><li>Keep the cheaper setting if agreement does not improve.</li></ol><em>A custom metric earns a gate only after calibration.</em></div>

## 4. Expand coverage with testset generation

Use generated test cases to propose questions, personas, and transformations across your document corpus. Review source grounding, duplicates, ambiguity, and leakage before promotion. Synthetic generation extends a curated suite; it does not replace production failures or expert-authored cases.

```text coverage funnel
source documents
   -> generated candidates
   -> schema and duplicate checks
   -> reviewer approval
   -> versioned golden suite
   -> holdout set for final comparison
```

Keep generated prompts, generator model, source revision, and seed/configuration in the manifest. Separate the testset generator from the evaluator when possible to reduce shared-model bias.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Generate or draft 30 candidates from one document set.</li><li>Remove duplicates and unsupported references.</li><li>Promote only reviewer-approved cases.</li></ol><em>Report the rejection reasons as a data-quality metric.</em></div>

## 5. Compare candidates with paired evidence

Join baseline and candidate by stable case ID. Calculate each row's delta, then report mean, median, regression count, and important slice results. A candidate that improves the mean while breaking regulated questions should not pass.

```python compare.py
joined = baseline.merge(candidate, on="case_id", suffixes=("_base", "_cand"))
joined["faithfulness_delta"] = (
    joined["faithfulness_cand"] - joined["faithfulness_base"]
)
regressions = joined[joined["faithfulness_delta"] < -0.10]

assert candidate["faithfulness"].mean() >= baseline["faithfulness"].mean() - 0.01
assert regressions.query("slice == 'account_security'").empty
```

Use confidence intervals or repeated judge runs for close calls. Send case IDs and evidence to the pull request instead of posting a bare red status.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Join two runs by case ID.</li><li>List the five largest regressions.</li><li>Create one aggregate and one critical-slice gate.</li></ol><em>A developer should know which cases to open from the CI result.</em></div>

A paired comparison should produce an explanation before it produces a gate. Join rows by stable case ID, calculate `candidate - baseline`, and group deltas by slice. Then inspect large positive and negative changes. The aggregate answers whether the portfolio moved; row evidence explains which behavior moved.

```text paired release decision
                  +-> overall delta --------+
baseline rows ----|                         |
                  +-> slice deltas ----------+-> policy -> pass / review / fail
candidate rows ---|                         |
                  +-> critical-case deltas --+
                              |
                              +-> links to failed row evidence
```

Use three outcomes instead of forcing every run into pass or fail. **Pass** means all required evidence meets policy. **Review** covers uncertainty such as a borderline confidence interval or judge disagreement. **Fail** means a critical case or agreed threshold regressed. The review state prevents teams from weakening a threshold just to unblock an ambiguous run.

## 6. Control batch cost, retries, and concurrency

Estimate calls before running: rows × metrics × judge calls per metric × strictness/repeats. Limit concurrency to provider and project quotas. Retry transient rate limits with exponential backoff, but preserve permanent parse and policy failures as explicit missing results.

| Control | Why it matters |
|---|---|
| Small smoke slice | Finds schema and credential errors cheaply |
| Batched execution | Matches provider throughput limits |
| Bounded retries | Prevents runaway bills |
| Result checkpointing | Avoids paying twice after interruption |
| Token/cost log | Makes evaluation budget visible |
| Cache keyed by full inputs | Reuses only identical judge work |

RAGAS exposes runtime configuration for timeouts, retries, and worker limits; names can differ by release. Pin your version and test cancellation before relying on it in CI.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Estimate calls and tokens for the full suite.</li><li>Run a five-row smoke test.</li><li>Simulate one rate limit and confirm the run terminates.</li></ol><em>Failed rows belong in the result artifact, not only in logs.</em></div>

## 7. Protect data sent to evaluator models

Minimize before redacting: do not include metadata or context chunks a metric does not need. Replace direct identifiers with stable tokens only when relationships must survive. Route sensitive slices to approved self-hosted or private endpoints, and block them from unapproved judges.

```text privacy boundary
raw trace -> field allowlist -> redact/tokenize -> policy route -> judge
              |                                      |
              +-> audit record                       +-> no-retention endpoint
```

Keep secrets out of datasets and CI artifacts. Encrypt stored cases, restrict result access, set retention, and review provider logging terms. Assign a data owner who can approve new fields and judge routes.

<div class="guide-try"><span class="ct">Try it</span><ol><li>List every field sent for faithfulness.</li><li>Remove fields the metric cannot use.</li><li>Test a sensitive row against the routing policy.</li></ol><em>The audit record should show the policy decision without storing the secret text.</em></div>

Privacy controls should follow the row through every copy, not stop at the initial judge request. A redacted input can still appear in worker logs, retry queues, result artifacts, notebooks, or CI attachments. Draw the data path and assign retention and access rules at each hop.

```text controlled evaluator route
production sample
      |
      v
allowlist -> tokenization -> policy classifier -> approved judge region
      |             |                |                    |
      v             v                v                    v
audit ID      token vault ACL   route decision      score only
      \_____________|________________|____________________/
                            |
                     restricted artifact
```

A useful audit record stores case ID, policy version, route, and transformation result without duplicating raw text. The raw sample remains in its protected source store. Reviewers receive temporary access only when row-level investigation requires it.

## 8. Monitor production samples and drift

Offline gates cover known cases. Sample production traffic to find new intents, retrieval misses, language shifts, and judge failures. Separate product-quality drift from changes in evaluator model behavior. Promote reviewed incidents into the regression suite.

| Signal | Owner | Response |
|---|---|---|
| Faithfulness drop | Generation team | Inspect prompt/model and contexts |
| Context recall drop | Retrieval team | Check index freshness and source coverage |
| Judge parse failures | Evaluation owner | Pause gate, inspect provider/version |
| Slice volume shift | Product/data owner | Refresh representative suite |

<div class="guide-try"><span class="ct">Try it</span><ol><li>Define a privacy-safe sampling rule.</li><li>Graph one metric by release and slice.</li><li>Turn one reviewed incident into a fixed case.</li></ol><em>Attach each alert to an owner and response.</em></div>

## 9. Complete annotated example: a reproducible regression gate

```python regression_gate.py
import json
from pathlib import Path
from ragas import EvaluationDataset, evaluate
from ragas.metrics import Faithfulness, LLMContextRecall

# 1. The loader validates and converts a versioned snapshot.
cases = load_contract("eval/cases-v7.jsonl")
dataset = EvaluationDataset(samples=[case.to_ragas() for case in cases])

# 2. The pinned judge and explicit metrics form part of the test definition.
metrics = [Faithfulness(llm=judge), LLMContextRecall(llm=judge)]
result = evaluate(dataset=dataset, metrics=metrics)
rows = attach_case_ids(result.to_pandas(), cases)

# 3. Save row evidence before enforcing thresholds.
Path("artifacts").mkdir(exist_ok=True)
rows.to_json("artifacts/ragas-rows.jsonl", orient="records", lines=True)
manifest = {
    "dataset": "cases-v7",
    "dataset_sha256": dataset_hash("eval/cases-v7.jsonl"),
    "judge": "gpt-4.1-mini",
    "ragas": "0.3.9",
    "metrics": [metric.name for metric in metrics],
}
Path("artifacts/run.json").write_text(json.dumps(manifest, indent=2))

# 4. A critical slice can block even when the overall mean passes.
assert rows["faithfulness"].mean() >= 0.85
assert (rows.query("slice == 'account_security'")["faithfulness"] >= 0.90).all()
```

**Next:** continue to [Part three: govern RAG evaluation as a platform](#senior-detailed) to define organization policy, tenant isolation, capacity, audit evidence, and incident response.
