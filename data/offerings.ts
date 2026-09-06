/**
 * The upcoming course.
 *
 * Community and company offerings used to live beside this in `data/services.ts`,
 * which went with the services page.
 */

/** Course 02 — announced, not yet scheduled. */
export const upcomingCourse = {
  slug: 'llmops',
  number: '02',
  title: 'LLMOps',
  status: 'Coming soon',
  summary:
    'Serving, evaluating, and operating LLM systems in production — the operational half of GenAI that almost nobody teaches.',
  topics: [
    'High-throughput serving with vLLM',
    'RAG architecture and retrieval quality',
    'Evaluation without ground truth',
    'Tracing and observability with Langfuse',
    'Token cost and latency budgets',
    'Guardrails and safety filtering',
  ],
} as const
