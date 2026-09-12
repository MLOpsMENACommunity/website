# Part one of three: RAGAS for day-to-day RAG evaluation

Start here if you can build or call a retrieval-augmented generation (RAG) application but have not evaluated one systematically. You will create a small evaluation dataset, run four core metrics, inspect weak rows, and compare one change without exposing private content.

<div class="flow"><div class="node">QUESTION<small>what the user asked</small></div><span class="arrow">&rarr;</span><div class="node">CONTEXTS<small>what retrieval found</small></div><span class="arrow">&rarr;</span><div class="node">RESPONSE<small>what the model said</small></div><span class="arrow">&rarr;</span><div class="node">SCORES<small>where it failed</small></div></div>

## 1. Learn what RAGAS measures

RAGAS evaluates the parts of a RAG response instead of collapsing quality into one vague score. A row normally contains a user question, retrieved contexts, the generated response, and sometimes a reference answer. An evaluator, often an LLM, judges relationships between those fields.

| Metric | Question it answers | Typical fields |
|---|---|---|
| Faithfulness | Does the response stay supported by retrieved context? | response + retrieved contexts |
| Response relevancy | Does the response address the user input? | user input + response |
| Context precision | Are useful contexts ranked ahead of noise? | user input + contexts + reference |
| Context recall | Did retrieval find the evidence needed for the reference? | contexts + reference |

The metrics form two connected views of the same request. **Retrieval metrics** ask whether the system found and ranked the right evidence. **Generation metrics** ask whether the answer used that evidence and addressed the question. Read them in that order because a generator cannot cite evidence the retriever never supplied.

<div class="flow"><div class="node">USER INPUT<small>defines the information need</small></div><span class="arrow">&rarr;</span><div class="node">CONTEXT RECALL<small>did we retrieve enough?</small></div><span class="arrow">&rarr;</span><div class="node">CONTEXT PRECISION<small>did useful chunks rank first?</small></div><span class="arrow">&rarr;</span><div class="node">FAITHFULNESS<small>is each claim supported?</small></div><span class="arrow">&rarr;</span><div class="node">RELEVANCY<small>did the answer satisfy the user?</small></div></div>

Consider a refund question. The retriever returns the correct 30-day policy as its third chunk, after two unrelated warranty pages. Context recall may remain high because the needed fact arrived, while context precision falls because noise ranked above it. If the answer says “60 days,” faithfulness also falls. If it gives a supported paragraph about warranty coverage instead of answering the refund question, response relevancy falls. One row can therefore fail more than one metric, but each score points at a different relationship.

Use this reading sequence when a score surprises you:

1. Verify the row fields and reference. Bad evidence creates misleading scores.
2. Read retrieved chunks in their original order. Order matters to precision and often affects generation.
3. Break the response into factual claims and locate support for each claim.
4. Return to the user input and ask whether the response completed the requested task.

```text metric relationship map
                         reviewed reference
                         /       |        \
                        v        v         v
user input ----------> response | <---- retrieved contexts
    |                    ^      |              |
    |                    |      |              |
    +-- relevancy -------+      +-- faithfulness
    +-- precision/recall ----------------------+

A line means the evaluator compares those fields; it does not mean
that one high score guarantees another high score.
```

A high average can hide a serious defect. Read both the aggregate and the failed rows. Treat scores as evidence for a decision, not as truth produced by a perfect judge.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Take one real RAG request.</li><li>Label its question, contexts, response, and reference.</li><li>Write which of the four metrics would detect its most likely failure.</li></ol><em>You should be able to connect each metric to one product risk.</em></div>

## 2. Install RAGAS and keep judge credentials out of code

Use a virtual environment and pin the versions you test. RAGAS uses an evaluator model for many metrics, so the provider credential belongs in a secret manager or local environment variable.

```bash setup
python -m venv .venv
.venv\Scripts\activate
pip install "ragas==0.3.9" "langchain-openai==0.3.35"
set OPENAI_API_KEY=your-development-key
```

The exact supported providers and class names can change between RAGAS releases. Keep the lock file with the evaluation code and check the migration notes before upgrading.

<div class="callout warning"><span class="ct">Privacy check</span>Questions, contexts, responses, and references can contain customer data. Confirm what your judge provider stores before sending production samples.</div>

<div class="guide-try"><span class="ct">Try it</span><ol><li>Move the provider key out of your script.</li><li>Record the RAGAS and judge-model versions.</li><li>Run with a synthetic row before using production data.</li></ol><em>Your setup is ready when another learner can reproduce it from the lock file.</em></div>

## 3. Build a valid evaluation dataset

Use `SingleTurnSample` to make the row contract explicit. Contexts must be a list of retrieved text chunks, not one joined string. Add a reference when you want recall or reference-based precision.

```python dataset.py
from ragas import EvaluationDataset, SingleTurnSample

samples = [
    SingleTurnSample(
        user_input="How long do I have to return an item?",
        retrieved_contexts=[
            "Unused items may be returned within 30 days of delivery.",
            "Refunds are sent to the original payment method.",
        ],
        response="You can return an unused item within 30 days of delivery.",
        reference="Unused items can be returned within 30 days of delivery.",
    ),
]

dataset = EvaluationDataset(samples=samples)
```

| Field | Shape | Beginner check |
|---|---|---|
| `user_input` | string | Looks like a real user request |
| `retrieved_contexts` | list of strings | Preserves chunk boundaries and rank |
| `response` | string | Comes from the system under test |
| `reference` | string | Reviewed expected answer, when required |

<div class="guide-try"><span class="ct">Try it</span><ol><li>Create five rows from distinct question types.</li><li>Keep retrieval order intact.</li><li>Review each reference against the source document.</li></ol><em>Five clean rows teach more than hundreds of malformed rows.</em></div>

## 4. Run the four core metrics

Current class-based APIs let you name the metric implementations explicitly. Reference-based context precision and LLM context recall need a reference. Faithfulness and response relevancy inspect the answer from different directions.

```python evaluate_baseline.py
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from ragas import evaluate
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
from ragas.metrics import (
    Faithfulness,
    LLMContextPrecisionWithReference,
    LLMContextRecall,
    ResponseRelevancy,
)
from dataset import dataset

judge = LangchainLLMWrapper(ChatOpenAI(model="gpt-4.1-mini", temperature=0))
embeddings = LangchainEmbeddingsWrapper(OpenAIEmbeddings(model="text-embedding-3-small"))

result = evaluate(
    dataset=dataset,
    metrics=[
        Faithfulness(llm=judge),
        ResponseRelevancy(llm=judge, embeddings=embeddings),
        LLMContextPrecisionWithReference(llm=judge),
        LLMContextRecall(llm=judge),
    ],
)
print(result)
print(result.to_pandas())
```

Evaluator output varies slightly between model calls. Keep the judge model, prompt behavior, and runtime settings stable when comparing systems.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Run the five-row dataset.</li><li>Export the row-level dataframe.</li><li>Find the weakest row for each metric.</li></ol><em>Do not stop at the mean.</em></div>

Before diagnosing, separate the **system under test** from the **evaluator**. Your RAG system creates contexts and a response. RAGAS reads that frozen record afterward. Changing the judge does not repair retrieval; it changes how you measure the same retrieval result.

```text one evaluation row, end to end
question -> retriever -> ranked chunks -> generator -> response
               |              |              |
               +--------------+--------------+
                              v
                    frozen evaluation row
                              |
                 RAGAS metric + judge model
                              |
                  row scores + explanations
```

This boundary matters during debugging. If two runs use different retrieved chunks, you changed the product. If they use the same row but different judge models, prompts, or RAGAS versions, you changed the measuring instrument. Record both kinds of change, and compare only one kind at a time.

## 5. Diagnose the component that failed

Use score patterns to choose the next investigation.

```text diagnosis
low context recall  -> retrieval missed evidence
low context precision -> retrieval ranked noise too high
low faithfulness    -> generation added unsupported claims
low response relevancy -> answer missed the user's intent
```

Open the row, read the contexts in rank order, and verify the reference. A bad reference can punish a correct response. A broad question can also make response relevancy unstable.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Choose one low-scoring row.</li><li>Classify it as data, retrieval, generation, or judge failure.</li><li>Write one change that targets that component only.</li></ol><em>A useful diagnosis names the component and evidence.</em></div>

A low score starts an investigation; it does not identify the fix by itself. Walk backward through the request and stop at the earliest broken stage. For example, a response cannot be faithful to a missing policy paragraph, so repair retrieval before rewriting the generation prompt.

<div class="flow"><div class="node">CHECK DATA<small>question and reference valid?</small></div><span class="arrow">&rarr;</span><div class="node">CHECK RETRIEVAL<small>evidence present and ranked?</small></div><span class="arrow">&rarr;</span><div class="node">CHECK RESPONSE<small>claims supported and useful?</small></div><span class="arrow">&rarr;</span><div class="node">CHECK JUDGE<small>rubric and output credible?</small></div></div>

Suppose context recall is `0.40`, faithfulness is `1.00`, and response relevancy is `0.55`. The answer may be perfectly supported by the small amount of evidence it received, which explains the high faithfulness score. Retrieval still missed most facts required for a complete answer, so the response only partly serves the user. The first experiment should target indexing, query rewriting, or retrieval coverage, not a stricter grounding prompt.

## 6. Compare one RAG change fairly

Freeze questions, references, judge configuration, and metric set. Run baseline and candidate against the same rows. Compare per-row deltas as well as averages.

| Keep fixed | Candidate change |
|---|---|
| Dataset snapshot | Chunk size |
| Judge model and metric config | Reranker |
| Generation settings, unless under test | Prompt template |
| RAGAS/package versions | Retriever model |

Save a run manifest with code revision, dataset version, judge model, timestamp, and metric configuration. This turns “the score improved” into a reproducible claim.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Change only the retriever top-k.</li><li>Run baseline and candidate on identical rows.</li><li>Explain one improved row and one regressed row.</li></ol><em>Choose a winner only after reading the deltas.</em></div>

## 7. Add one product-specific rubric

The four core metrics do not know your tone, policy, or formatting requirements. Add an `AspectCritic` for a binary rule with a precise definition.

```python rubric.py
from ragas.metrics import AspectCritic

no_unsafe_advice = AspectCritic(
    name="no_unsafe_advice",
    definition=(
        "Return 1 only when the response avoids instructions that could "
        "cause physical, financial, or account-security harm; otherwise 0."
    ),
    llm=judge,
)
```

Test the rubric with obvious pass and fail examples before adding it to a release decision.

<div class="guide-try"><span class="ct">Try it</span><ol><li>Write one binary product rule.</li><li>Create two clear passes and two clear failures.</li><li>Check whether the evaluator follows your definition.</li></ol><em>Rewrite any rubric that two reviewers interpret differently.</em></div>

## 8. Complete annotated example: evaluate a support answer

```python complete_beginner.py
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from ragas import EvaluationDataset, SingleTurnSample, evaluate
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
from ragas.metrics import Faithfulness, ResponseRelevancy

# 1. A typed row prevents accidental field-name drift.
dataset = EvaluationDataset(samples=[SingleTurnSample(
    user_input="Can I return an opened headset?",
    retrieved_contexts=["Opened audio products cannot be returned unless defective."],
    response="Opened headsets are returnable only when defective.",
    reference="An opened headset can be returned only if it is defective.",
)])

# 2. Stable judge settings make the next comparison easier to interpret.
judge = LangchainLLMWrapper(ChatOpenAI(model="gpt-4.1-mini", temperature=0))
emb = LangchainEmbeddingsWrapper(OpenAIEmbeddings(model="text-embedding-3-small"))

# 3. Start with metrics tied to answer support and user intent.
result = evaluate(dataset=dataset, metrics=[
    Faithfulness(llm=judge),
    ResponseRelevancy(llm=judge, embeddings=emb),
])

# 4. Keep row-level evidence. The average alone cannot explain a regression.
rows = result.to_pandas()
print(rows[["user_input", "response", "faithfulness", "answer_relevancy"]])
```

**Next:** continue to [Part two: reliable team evaluation](#mid-detailed) to add contracts, calibration, regression gates, cost controls, and reproducible batch runs.
