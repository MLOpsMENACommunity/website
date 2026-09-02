This is part one of three. It covers **everything you need to do real work with GitHub Actions** — not a teaser. By the end you can write, read, debug, and ship a production CI/CD pipeline. Mid-level and Senior take the same topics further; nothing here is thrown away.

<div class="flow">
  <div class="node">YOU PUSH<small>git push</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">EVENT FIRES<small>GitHub notices</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">MACHINE RUNS<small>fresh VM, your steps</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">GREEN OR RED<small>in ~2 minutes</small></div>
</div>

**CI** (continuous integration) = every change is built and tested automatically. **CD** (continuous deployment) = anything that passed ships automatically. GitHub Actions does both, from a file inside your repository.

## Where workflow files live

This path is exact. Get it wrong and GitHub silently ignores the file — no error, nothing in the Actions tab.

```text your repository
my-project/
├── .github/
│   └── workflows/          ← must be exactly this
│       ├── ci.yml          ← becomes active on commit
│       └── release.yml     ← so does this
├── src/
└── README.md
```

<div class="callout warn">
  <span class="ct">Three ways people get this wrong</span>
  <code>.github/workflow/</code> (missing the <b>s</b>) · <code>github/workflows/</code> (missing the dot) · <code>ci.yml</code> in the repository root. All three do nothing at all.
</div>

## YAML, in one table

| Rule | Looks like | Means |
|---|---|---|
| Key and value | `name: CI` | Setting `name` is `CI` |
| Two-space indent nests | `jobs:` then `  build:` | `build` belongs to `jobs` |
| Dash makes a list item | `- run: npm test` | One item in a list |
| Hash is a comment | `# runs on PRs` | Ignored |
| Quote version numbers | `'3.11'` not `3.11` | Unquoted becomes the number 3.1 |
| `|` keeps a multi-line block | `run: |` | Everything indented below is one string |

**Never use Tab.** Spaces only. A tab is a parse error and the message will not mention tabs.

## Your first workflow

Create `.github/workflows/hello.yml` — you can do it in the browser via **Add file → Create new file**.

```yaml .github/workflows/hello.yml
name: My First Workflow      # label in the Actions tab

on: push                     # the trigger: run on every push

jobs:
  greet:                     # job id — you pick this
    runs-on: ubuntu-latest   # ask GitHub for a Linux machine
    steps:
      - name: Say hello
        run: echo "Hello from a machine that did not exist a minute ago"

      - name: Show run info
        run: |
          echo "OS         : ${{ runner.os }}"
          echo "Repo       : ${{ github.repository }}"
          echo "Pushed by  : ${{ github.actor }}"
```

Commit it. Committing *is* a push, so it runs immediately. Open the **Actions** tab and watch.

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>0s</span><strong>Event fires</strong><small>Your commit creates a <code>push</code> event.</small></div>
  <div class="guide-timeline-item"><span>1s</span><strong>Workflow matched</strong><small>GitHub scans <code>.github/workflows/</code> for a matching <code>on:</code>.</small></div>
  <div class="guide-timeline-item"><span>5s</span><strong>Machine created</strong><small>A clean Ubuntu VM boots. Your code is <b>not</b> on it yet.</small></div>
  <div class="guide-timeline-item"><span>8s</span><strong>Steps run in order</strong><small><code>${{ }}</code> expressions are replaced with real values first.</small></div>
  <div class="guide-timeline-item"><span>14s</span><strong>Machine destroyed</strong><small>Everything on it is gone. Next push gets a brand-new one.</small></div>
</div>

## The six building blocks

<div class="flow">
  <div class="node">EVENT<small>push / PR / cron</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">WORKFLOW<small>one YAML file</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">JOB<small>one machine</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">STEP<small>one command</small></div>
</div>

The distinction that matters most:

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Steps share everything</h4>
    <ul>
      <li>Same machine, same files</li>
      <li>Run in the order written</li>
      <li>Files one step creates, the next can read</li>
      <li>A failure stops the rest</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Jobs share nothing</h4>
    <ul>
      <li>Each gets its own fresh machine</li>
      <li>Run <em>at the same time</em> by default</li>
      <li>Files do not cross between them</li>
      <li>Ordered only by <code>needs</code></li>
    </ul>
  </div>
</div>

That is why `runs-on` sits on the job — each job is asking for its own computer.

## Triggers: what starts a workflow

| Trigger | Fires when | Use it for |
|---|---|---|
| `push` | Commits reach a branch or tag | Test every change |
| `pull_request` | A PR opens, updates, or reopens | Check *before* merging |
| `workflow_dispatch` | You click **Run workflow** | Manual runs, deploys |
| `schedule` | A cron time matches (**UTC**) | Nightly jobs, cleanups |
| `release` | You publish a release | Build and attach downloads |
| `issues`, `issue_comment` | Issue activity | Triage bots |

```yaml
on:
  push:
    branches: [main]                  # only main
    tags: ['v*']                      # and any v-prefixed tag
    paths-ignore: ['docs/**', '**/*.md']   # but not doc-only changes
  pull_request:
    branches: [main]                  # PRs targeting main
    types: [opened, synchronize, reopened]
  schedule:
    - cron: '0 3 * * *'               # 03:00 UTC daily
  workflow_dispatch:                  # and a manual button
```

Cron fields are `minute hour day-of-month month day-of-week`.

### Manual runs with inputs

`workflow_dispatch` can ask for values, which turns a workflow into a small internal tool:

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: Where to deploy
        type: choice
        options: [staging, production]
        default: staging
      dry-run:
        description: Print actions without doing them
        type: boolean
        default: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: |
          echo "target : ${{ inputs.environment }}"
          echo "dry run: ${{ inputs.dry-run }}"
```

<div class="callout warn">
  <span class="ct">The most common reason a workflow "does not run"</span>
  Read <code>on:</code> before reading anything else. It is nearly always a <code>branches</code> filter, a wrong folder, or a <code>schedule</code> you are waiting for in the wrong timezone. Schedules are UTC and only run from the default branch.
</div>

## Jobs: parallel by default, ordered with `needs`

```yaml
jobs:
  lint:                        # these two start at the same time
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ruff check .

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pytest -q

  deploy:
    needs: [lint, test]        # waits for BOTH to succeed
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
```

`needs` builds a dependency graph. A job with no `needs` starts immediately; a job with `needs` waits for every listed job to succeed. If any of them fails, the dependent job is skipped.

<div class="callout tip">
  <span class="ct">Start with one job</span>
  Two jobs run in parallel and finish sooner, but they cannot hand files to each other without extra work. Use one job with several steps until you actually want parallelism or a hard gate.
</div>

## Steps: `run` versus `uses`

| | `run` | `uses` |
|---|---|---|
| Is | A shell command | A prebuilt action |
| Written | `- run: pytest -q` | `- uses: actions/checkout@v4` |
| Configured by | Arguments | A `with:` block |
| For | What you already type in a terminal | Setup, caching, uploads, logins |

One step is one or the other — never both.

```yaml
steps:
  - uses: actions/checkout@v4        # action, no config

  - uses: actions/setup-node@v4      # action, configured
    with:
      node-version: '20'

  - name: Install                    # plain command with a label
    run: npm ci

  - name: Test with options          # multi-line, custom shell, working dir
    working-directory: ./backend
    shell: bash
    env:
      CI: 'true'
    run: |
      npm run lint
      npm test -- --coverage
```

<div class="callout warn">
  <span class="ct">The number-one beginner failure</span>
  <b>The runner starts empty.</b> Your repository is not on it. <code>actions/checkout</code> clones it. If you see "no such file or directory" for a file you can see on GitHub, this is why — and it is why almost every workflow starts with that line.
</div>

## Actions and the Marketplace

<div class="cards">
  <div class="card"><div class="icon">📥</div><h4>actions/checkout</h4><p>Clones your repository onto the runner. First step of nearly every job.</p></div>
  <div class="card"><div class="icon">🐍</div><h4>actions/setup-*</h4><p>Installs a language version. <code>setup-node</code>, <code>setup-python</code>, <code>setup-java</code>, <code>setup-go</code>.</p></div>
  <div class="card"><div class="icon">📦</div><h4>actions/cache</h4><p>Reuses downloaded dependencies between runs, so later runs are much faster.</p></div>
  <div class="card"><div class="icon">📤</div><h4>actions/upload-artifact</h4><p>Saves files off the machine before it is destroyed, so you can download them.</p></div>
  <div class="card"><div class="icon">📥</div><h4>actions/download-artifact</h4><p>Pulls those files into a later job.</p></div>
  <div class="card"><div class="icon">🐙</div><h4>actions/github-script</h4><p>Runs JavaScript against the GitHub API — comment on a PR, add a label.</p></div>
</div>

An action is referenced as `owner/repo@ref`, and the ref decides what you actually run:

| Reference | Meaning | When |
|---|---|---|
| `actions/checkout@v4` | Major-version tag, moves with patches | Default for official actions |
| `actions/checkout@v4.1.7` | One exact release | You want reproducibility |
| `actions/checkout@8f4b7f8…` | An exact commit | Third-party actions |
| `actions/checkout@main` | A branch | Almost never |

<div class="callout warn">
  <span class="ct">Never point at a branch on someone else's action</span>
  <code>@main</code> means "whatever is on that branch the instant my job starts" — a remote-code-execution surface aimed at your repository. Use a tag at minimum.
</div>

## Runners

| | GitHub-hosted | Self-hosted |
|---|---|---|
| Who runs it | GitHub | You |
| Lifetime | New per job, then destroyed | Persistent |
| Cost | Free on public repos | Your hardware |
| Pick it | Almost always | GPU, licence, private network |

Labels: `ubuntu-latest`, `windows-latest`, `macos-latest`. Ubuntu is fastest and cheapest, and ships with Git, Docker, Node, Python, and the `gh` CLI already installed.

## Expressions and contexts

Expressions live inside `${{ }}` and read from **contexts** — read-only objects describing the run.

| Context | Gives you | Examples |
|---|---|---|
| `github` | Event and repo data | `github.ref`, `github.sha`, `github.actor`, `github.event_name`, `github.repository` |
| `runner` | The machine | `runner.os`, `runner.temp` |
| `env` | Variables you set | `env.LOG_LEVEL` |
| `secrets` | Encrypted secrets | `secrets.GITHUB_TOKEN` |
| `inputs` | `workflow_dispatch` inputs | `inputs.environment` |
| `steps` | Earlier step outputs | `steps.build.outputs.tag` |
| `needs` | Earlier job outputs | `needs.build.outputs.tag` |
| `matrix` | The current combination | `matrix.python` |

```yaml
- name: Print useful context values
  run: |
    echo "ref        : ${{ github.ref }}"        # refs/heads/main
    echo "short sha  : ${{ github.sha }}"
    echo "event      : ${{ github.event_name }}"  # push / pull_request
    echo "actor      : ${{ github.actor }}"
    echo "run number : ${{ github.run_number }}"
    echo "workspace  : ${{ github.workspace }}"
```

## Conditions with `if`

`if:` decides whether a step or a whole job runs. Inside `if:` the `${{ }}` wrapper is optional.

```yaml
jobs:
  deploy:
    if: github.ref == 'refs/heads/main'      # job-level condition
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Only on pull requests
        if: github.event_name == 'pull_request'
        run: ./pr-comment.sh

      - name: Only for version tags
        if: startsWith(github.ref, 'refs/tags/v')
        run: ./publish.sh

      - name: Run even if an earlier step failed
        if: always()
        run: ./collect-logs.sh

      - name: Only when something failed
        if: failure()
        run: ./notify-team.sh
```

| You want | Write |
|---|---|
| Only on `main` | `if: github.ref == 'refs/heads/main'` |
| Only on pull requests | `if: github.event_name == 'pull_request'` |
| Only on a tag | `if: startsWith(github.ref, 'refs/tags/v')` |
| Skip on a specific author | `if: github.actor != 'dependabot[bot]'` |
| Even after a failure | `if: always()` |
| Only after a failure | `if: failure()` |

<div class="callout warn">
  <span class="ct">The gotcha that costs an hour</span>
  <code>github.ref</code> is the <b>full</b> ref: <code>refs/heads/main</code>, not <code>main</code>. Comparing it to <code>'main'</code> silently never matches. When a condition misbehaves, print it: <code>- run: echo "${{ github.ref }}"</code>.
</div>

## Environment variables

Three scopes, most specific wins:

```yaml
env:
  APP_NAME: checkout-api        # every job, every step

jobs:
  test:
    runs-on: ubuntu-latest
    env:
      LOG_LEVEL: debug          # every step in this job
    steps:
      - run: ./run.sh
        env:
          LOG_LEVEL: trace      # this step only
```

Each `run` is a **new shell**, so `export` does not survive. To pass a value to later steps, append to the file at `$GITHUB_ENV`:

```yaml
- name: Compute a version and share it
  run: echo "VERSION=1.4.${{ github.run_number }}" >> "$GITHUB_ENV"

- name: Use it in a later step
  run: echo "building $VERSION"
```

There is also `$GITHUB_STEP_SUMMARY`, which renders Markdown on the run page — the cheapest reporting you will ever add:

```yaml
- name: Publish a summary
  run: |
    {
      echo "### Test results"
      echo "| metric | value |"
      echo "|---|---|"
      echo "| tests | 412 |"
    } >> "$GITHUB_STEP_SUMMARY"
```

## Secrets

Secrets are encrypted values you set in **Settings → Secrets and variables → Actions**. Read them with `${{ secrets.NAME }}`.

```yaml
- name: Deploy
  env:
    API_TOKEN: ${{ secrets.API_TOKEN }}     # pass as data
  run: ./deploy.sh                          # script reads "$API_TOKEN"
```

`GITHUB_TOKEN` is provided automatically for every run — no setup — and can act on the repository itself:

```yaml
permissions:
  contents: read
  pull-requests: write

steps:
  - uses: actions/github-script@v7
    with:
      script: |
        github.rest.issues.createComment({
          issue_number: context.issue.number,
          owner: context.repo.owner,
          repo: context.repo.repo,
          body: 'Build passed ✅'
        })
```

<div class="callout warn">
  <span class="ct">Two rules, from day one</span>
  <b>Never <code>echo</code> a secret.</b> GitHub masks known values in logs, but that is a safety net, not a strategy. <br>
  <b>Pass secrets through <code>env</code>, not into the command line.</b> Interpolating one directly into a shell makes it far easier to leak through an error message or <code>set -x</code>.
</div>

Also note: a pull request from a **fork** gets **no secrets**, by design. That is not a bug to work around.

## Caching

The runner is new every time, so dependencies download every time. For most languages, caching is one line:

```yaml
- uses: actions/setup-python@v5
  with:
    python-version: '3.11'
    cache: pip                 # ← the whole thing
```

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: npm
```

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>run 1</span><strong>Cache miss</strong><small>Dependencies download normally, then get saved at the end of the job.</small></div>
  <div class="guide-timeline-item"><span>run 2</span><strong>Cache hit</strong><small>Dependencies are restored instead of downloaded.</small></div>
  <div class="guide-timeline-item"><span>lockfile changes</span><strong>Miss again</strong><small>The key includes your lockfile, so new dependencies are picked up automatically.</small></div>
</div>

For anything the setup actions do not know about, use `actions/cache` directly:

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.cache/my-tool
    key: ${{ runner.os }}-mytool-${{ hashFiles('tool.lock') }}
    restore-keys: |
      ${{ runner.os }}-mytool-
```

The key must change when the content should change — that is what `hashFiles` on the lockfile does. Mid-level goes much deeper on key design.

## Artifacts

The machine is destroyed when the job ends. Anything you want to keep must be uploaded.

```yaml
- name: Run tests
  run: pytest -q --junitxml=reports/junit.xml --cov --cov-report=html

- name: Keep the reports
  if: always()                 # ← save them even when tests FAIL
  uses: actions/upload-artifact@v4
  with:
    name: test-reports
    path: |
      reports/
      htmlcov/
    retention-days: 7
```

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Artifact = data you need</h4>
    <ul>
      <li>Test reports, build output, logs</li>
      <li>You download it, or a later job does</li>
      <li>If it is missing, something is broken</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Cache = a shortcut</h4>
    <ul>
      <li>Downloaded dependencies</li>
      <li>Reused by the next run</li>
      <li>If it is missing, the run is just slower</li>
    </ul>
  </div>
</div>

## Passing data between jobs

Jobs are separate machines. Strings travel as **outputs**; files travel as **artifacts**.

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.meta.outputs.version }}     # declare the output
    steps:
      - uses: actions/checkout@v4

      - id: meta                                     # step needs an id
        run: echo "version=1.4.${{ github.run_number }}" >> "$GITHUB_OUTPUT"

      - run: make build                              # produces dist/

      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/

      - run: ./deploy.sh --version "${{ needs.build.outputs.version }}"
```

## Matrix: testing several versions at once

Instead of copying a job four times, generate it:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false                 # let every version report
      matrix:
        python: ['3.10', '3.11', '3.12']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python }}
          cache: pip
      - run: pip install -r requirements.txt
      - run: pytest -q
```

That produces three parallel jobs. Add a second axis and they multiply:

```yaml
      matrix:
        os: [ubuntu-latest, windows-latest]
        python: ['3.11', '3.12']        # 2 × 2 = four jobs
    runs-on: ${{ matrix.os }}
```

`fail-fast: false` is worth knowing now: by default, one failing combination cancels all the others, which hides the pattern you need while debugging.

## Guards every workflow should have

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15              # default ceiling is SIX HOURS
    steps:
      - uses: actions/checkout@v4

      - name: Optional check
        continue-on-error: true      # a failure here does not fail the job
        run: ./experimental-lint.sh
```

| Guard | Why |
|---|---|
| `timeout-minutes` | A hung job otherwise burns up to six hours of your allowance |
| `continue-on-error` | Lets a non-critical step fail without failing the build |
| `if: always()` on uploads | Diagnostics survive a red run |
| A `paths-ignore` filter | Documentation changes do not run the full suite |

## Reading a failed run

<ol class="guide-steps">
  <li><b>Click the red job, then the red step</b>GitHub expands the failure for you.</li>
  <li><b>Scroll up, not down</b>Logs end with a tool's summary. The real cause is usually well above it.</li>
  <li><b>Run the command on your own machine</b>If it fails there too, the workflow is innocent.</li>
  <li><b>Print what you are unsure about</b><code>pwd</code>, <code>ls -la</code>, <code>echo "$VAR"</code>. A step is just a shell.</li>
  <li><b>Use "Re-run failed jobs"</b>Retries only the red job instead of the whole pipeline.</li>
  <li><b>Re-run with debug logging</b>The <b>Re-run</b> menu has a checkbox for it.</li>
</ol>

Four traps, all caused by the same thing — a new machine each job, a new shell each step:

| Symptom | Cause | Fix |
|---|---|---|
| "File not found" for a file in your repo | No checkout | Add `actions/checkout@v4` |
| The deploy job cannot find `dist/` | Different machine | Upload/download an artifact |
| `cd` in one step has no effect on the next | New shell per step | `working-directory:` on the step |
| A variable is empty in the next step | `export` dies with the step | `echo "K=v" >> "$GITHUB_ENV"` |

```yaml
# Does not work
- run: export VERSION=1.2.3
- run: echo "$VERSION"        # empty

# Works
- run: echo "VERSION=1.2.3" >> "$GITHUB_ENV"
- run: echo "$VERSION"        # 1.2.3

# Does not work
- run: cd frontend
- run: npm ci

# Works
- run: npm ci
  working-directory: frontend
```

## A complete pipeline

Everything above, in one file. Nothing here is new.

```yaml .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    paths-ignore: ['docs/**', '**/*.md']
  workflow_dispatch:

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    strategy:
      fail-fast: false
      matrix:
        python: ['3.11', '3.12']
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python }}
          cache: pip

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Lint
        run: ruff check .

      - name: Test
        run: pytest -q --junitxml=reports/junit-${{ matrix.python }}.xml

      - name: Keep the report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: reports-${{ matrix.python }}
          path: reports/
          retention-days: 7

  build:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    outputs:
      version: ${{ steps.meta.outputs.version }}
    steps:
      - uses: actions/checkout@v4
      - id: meta
        run: echo "version=1.4.${{ github.run_number }}" >> "$GITHUB_OUTPUT"
      - run: make build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/
      - name: Deploy
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
        run: ./deploy.sh --version "${{ needs.build.outputs.version }}"
      - name: Report
        run: echo "Deployed ${{ needs.build.outputs.version }}" >> "$GITHUB_STEP_SUMMARY"
```

The same shape for a JavaScript project — only the setup action and the commands change:

```yaml
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --coverage
      - run: npm run build
```

## Show it off: a status badge

```text README.md
![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)
```

The badge reflects the latest run on the default branch, and links to the workflow's history.

## What you can now do, and what comes next

You can write a workflow from scratch, choose triggers precisely, run jobs in parallel and order them, use and version Marketplace actions, branch on context values, manage environment variables and secrets, cache dependencies, keep artifacts, move data between jobs, test a matrix of versions, guard against hung jobs, and debug a red run. That is a working practitioner's toolkit.

**Mid-level takes every one of those topics further** — the full context and function reference, cache key design and its two failure modes, artifact retention and collisions, matrix `include`/`exclude`/dynamic generation, plus the machinery you have not met yet: service containers for real databases, reusable workflows and composite actions, environments with approvals, and concurrency control.

**Senior then covers what you own when CI/CD is your responsibility**: the trust model and script injection, least-privilege permissions, OIDC instead of stored cloud keys, supply-chain controls, container builds, custom actions, self-hosted runners, and running Actions as a platform across many repositories.

Before moving on, put a CI workflow on a project you actually care about. Reading this is not the same as having debugged your own indentation error at eleven at night — and the second one is what makes it stick.
