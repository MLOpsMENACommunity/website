/** Content for the dedicated course page at /courses/mlops-practitioner. */

export const course = {
  slug: 'mlops-practitioner',
  title: 'The MLOps Practitioner',
  number: '01',
  status: 'Cohort 1 · Running now',
  format: '5 interactive live lessons · 7 weeks · Aug 15 → Oct 2 · free',
  dates: { start: '2026-08-15', end: '2026-10-02' },
  enrollUrl: 'https://zomra.io/courses/the-mlops-practitioner',
  repoUrl: 'https://github.com/MLOpsMENACommunity/mlops_practitioner_course',
  summary:
    'By the end of this course, students will take a machine learning model from notebook to production — building automated CI/CD pipelines, experiment tracking, and scheduled retraining. They will serve predictions at scale using FastAPI, BentoML, Triton, and vLLM, monitor for drift before users notice, and optimize models for GPU, CPU, and edge devices. They will think and work like production ML engineers.',
  facts: [
    { label: 'Live lessons', value: '5' },
    { label: 'Duration', value: '7 weeks' },
    { label: 'Runs', value: 'Aug 15 → Oct 2' },
    { label: 'Price', value: 'Free' },
  ],
  rating: { score: 4.9, count: 7 },
  students: 1200,

  /**
   * Next live lesson for the running cohort.
   * TODO: confirm — the week grid puts Week 2 at Sat 8/22, but you said the
   * Session 2 call is Sunday 7:00 PM. Sunday is used here.
   */
  nextLesson: {
    title: 'Session 2 — MLOps Core',
    startsAt: '2026-08-23T19:00:00+03:00',
    dateLabel: 'Sunday, 23 Aug · 7:00 PM Cairo',
  },

  instructor: {
    name: 'Aya Nasser Salama',
    role: 'Founder of MLOps MENA Community and Senior MLOps Engineer',
  },

  objectives: [
    'Structure ML projects professionally using Python packaging, OOP, type hints, and build production-grade REST APIs with FastAPI or Litestar — containerized with Docker and tested with pytest',
    'Track experiments, version data, and manage model lifecycle using MLflow and DVC — and automate the full train → test → build → push pipeline with GitHub Actions and Terraform',
    'Implement Continuous Training pipelines that automatically retrain, evaluate, and promote models to production when data drifts or performance degrades — without any human intervention',
    'Choose the right inference pattern and serve models in production using the full serving stack: FastAPI → BentoML → TensorRT/Triton for GPU → ONNX Runtime/OpenVINO for CPU → vLLM for LLMs',
    'Release models safely using canary rollouts, A/B testing, blue/green deployments, and shadow mode — with automatic rollback when metrics degrade',
    'Detect data drift, concept drift, label drift, and embedding drift using PSI, KS test, Page-Hinkley, and MMD — and monitor production systems with Prometheus, Grafana, Langfuse, and RAGAS',
    'Optimize trained models using pruning, quantization (PTQ and QAT), knowledge distillation, TensorRT, OpenVINO, and TFLite — measuring the accuracy vs latency vs size tradeoff at every step',
  ],

  includes: [
    '5 interactive live lessons',
    'Lifetime access to all course materials',
    'Community of peers',
    'Certificate of completion',
  ],

  /** Course resources. */
  resources: [
    {
      label: 'Course repository',
      desc: 'All code, notebooks, and module projects.',
      href: 'https://github.com/MLOpsMENACommunity/mlops_practitioner_course',
      icon: 'Github',
    },
    {
      label: 'All session slides',
      desc: 'Google Drive folder with the slides for all five sessions.',
      href: 'https://drive.google.com/drive/folders/1o8qowW7QRfpDyZXKxKLs7dx5QQqZhHKG?usp=sharing',
      icon: 'Presentation',
    },
    {
      label: 'Session 1 slides',
      desc: 'Direct link to the first session deck.',
      href: 'https://docs.google.com/presentation/d/1ZPqFlrnJuruHvWlt4HG--zixQPQLMBlx2LLGSop8W70/edit?usp=sharing',
      icon: 'Presentation',
    },
    {
      label: 'Mini projects & final project',
      desc: 'Handbook PDF covering every module project and the final project.',
      // TODO: paste the Google Drive link for the projects PDF.
      href: '',
      icon: 'FileText',
    },
    {
      label: 'Session recordings',
      desc: 'All five live lessons on YouTube.',
      href: 'https://www.youtube.com/@MLOpsMENACommunity',
      icon: 'Youtube',
    },
  ],

  /** Live session recordings on YouTube. Source: master reference §2. */
  recordings: [
    { n: 1, module: 'From Notebook to Production-Ready Code',
      href: 'https://www.youtube.com/live/rJFIn83w0Dc' },
    { n: 2, module: 'MLOps Core — Experiment Tracking, Versioning & Automation',
      href: 'https://www.youtube.com/live/slxkWpCAqI8' },
    { n: 3, module: 'Inference, Serving & Release Strategies',
      href: 'https://www.youtube.com/live/N3v8va_P0DE' },
    { n: 4, module: 'Model Optimization — Faster, Smaller, Cheaper',
      href: 'https://www.youtube.com/live/i7jT4Dr6qgE' },
    { n: 5, module: 'Observability & Drift Detection',
      href: 'https://www.youtube.com/live/_rfZUcMQFeg' },
  ],

  /** Week-by-week outline. Source: master reference §2. */
  outline: [
    {
      week: 1,
      dates: 'Sat 8/15 – Fri 8/21',
      title: 'From Notebook to Production-Ready Code',
      lessons: [
        'The MLOps Maturity Model',
        'Python Packaging & Project Structure',
        'Building ML APIs (FastAPI vs Litestar)',
        'Serialization Formats',
        'Docker & Containerization',
        'Structured Logging',
        'Testing ML Code with pytest',
      ],
      project:
        'A fully containerized ML API with a test suite, structured logs, and a 3-command README.',
    },
    {
      week: 2,
      dates: 'Sat 8/22 – Fri 8/28',
      title: 'MLOps Core — Experiment Tracking, Versioning & Automation',
      lessons: [
        'MLflow Experiment Tracking',
        'MLflow Model Registry',
        'Continuous Training with MLflow',
        'Data Versioning with DVC',
        'CI/CD with GitHub Actions',
        'Infrastructure as Code with Terraform',
      ],
      project:
        'A fully automated pipeline triggered by GitHub Actions — trains, evaluates against production, promotes only if metrics improve, builds a Docker image. Every run in MLflow, every dataset version in DVC.',
    },
    {
      week: 3,
      dates: 'Sat 8/29 – Fri 9/4',
      title: '1st half of the project (Implementation + Revise)',
      lessons: [],
      note: 'No lecture. Start working on your chosen project and apply the principles from the first two lectures.',
    },
    {
      week: 4,
      dates: 'Sat 9/5 – Fri 9/11',
      title: 'Inference, Serving & Release Strategies',
      lessons: [
        'Orchestration with Apache Airflow',
        'Why Inference Patterns Matter',
        'Three Inference Patterns',
        'What is Model Serving',
        'CAT 1 FastAPI',
        'CAT 2 BentoML',
        'CAT 3 TensorRT + Triton',
        'CAT 4 ONNX Runtime + OpenVINO',
        'CAT 5 vLLM',
        'Load Testing with Locust',
        'Release Strategies',
      ],
      project:
        'Serve the ride-duration model three ways, load test to 100 concurrent users, document the bottleneck, deploy a new version via canary rollout with automatic rollback.',
    },
    {
      week: 5,
      dates: 'Sat 9/12 – Fri 9/18',
      title: 'Model Optimization — Faster, Smaller, Cheaper Without Losing Accuracy',
      lessons: [
        'Why Optimization Matters',
        'Pruning',
        'Post-Training Quantization',
        'Quantization-Aware Training',
        'Knowledge Distillation',
        'TensorRT',
        'ONNX Runtime',
        'OpenVINO',
        'Edge Deployment',
        'LLM-Specific Quantization (AWQ, GPTQ)',
        'Benchmarking and the Optimization Decision',
      ],
    },
    {
      week: 6,
      dates: 'Sat 9/19 – Fri 9/25',
      title: 'Observability & Drift Detection — Know Before Your Users Do',
      lessons: [
        'Why Production Models Degrade',
        'Drift Taxonomy',
        'Statistical Detection Methods',
        'Evidently AI',
        'Page-Hinkley and ADWIN',
        'Label and Prediction Drift',
        'Embedding Drift',
        'Prometheus + Grafana',
        'Langfuse',
        'RAGAS',
        'Cost and Token Monitoring',
        'Guardrails',
      ],
    },
    {
      week: 7,
      dates: 'Sat 9/26 – Fri 10/2',
      title: 'Final project',
      lessons: [],
      note: 'Ship the project end to end, present it to the community, and get the repo reviewed.',
    },
  ],

  requirements: [
    'Basic Python programming knowledge — you should be comfortable writing functions, classes, and working with libraries like pandas and scikit-learn',
    'Familiarity with machine learning concepts — you should have trained at least one model before (linear regression, classification, etc.)',
    'A laptop with Docker installed and at least 8GB RAM — all tools used are free and open-source',
  ],

  description: {
    hook: 'Most ML engineers know how to train a model. Almost none know how to ship it.',
    body: [
      'This course bridges the gap between data science and production engineering. You will take a machine learning model from a research notebook all the way to a live, monitored, auto-retrained production system — step by step, with real code and real tools used by companies like Uber, Spotify, Meta, and Netflix.',
    ],
    learnIntro: 'Across 5 sessions you will learn how to:',
    learn: [
      'Package ML code professionally and build REST APIs with FastAPI and Litestar — fully containerized with Docker and tested with pytest',
      'Track experiments with MLflow, version data with DVC, and automate your entire pipeline with GitHub Actions and Terraform',
      'Orchestrate retraining with Apache Airflow, serve models at scale using BentoML, Triton, and vLLM, and release safely with canary and shadow deployments',
      'Monitor production models for data drift, concept drift, and embedding drift using Evidently AI, Prometheus, Grafana, and Langfuse',
      'Optimize models for speed and size using pruning, quantization, knowledge distillation, TensorRT, and OpenVINO — and measure every tradeoff',
    ],
    outro:
      'Every session ends with a deployable project that builds on the previous one. By the end you will have a full MLOps portfolio that demonstrates real production engineering skills.',
  },

  audience: [
    'ML engineers and data scientists who can train models but struggle to deploy and maintain them in production',
    'Software engineers, DevOps Engineers, transitioning into MLOps or AI infrastructure roles who want a structured, hands-on path',
    'Technical leads and architects who need to understand the full ML production stack to make better tooling and infrastructure decisions',
  ],

  /** Tool logos rendered as a marquee — names only, no external assets needed. */
  stack: [
    'FastAPI', 'Litestar', 'Docker', 'pytest', 'MLflow', 'DVC', 'GitHub Actions',
    'Terraform', 'Apache Airflow', 'BentoML', 'Triton', 'vLLM', 'TensorRT',
    'ONNX Runtime', 'OpenVINO', 'TFLite', 'Evidently AI', 'Prometheus',
    'Grafana', 'Langfuse', 'RAGAS',
  ],
} as const

export type Course = typeof course
