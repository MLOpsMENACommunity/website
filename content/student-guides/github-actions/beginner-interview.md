Part one of three. A fast review of **everything in the Beginner Detailed track**, in about twenty-five minutes. Fast review first, common questions at the end. Mid-level reviews this plus its own material; Senior reviews all three.

## The thirty-second answer

> GitHub Actions is GitHub's built-in CI/CD and automation platform. You commit a YAML file to `.github/workflows/`, declare which repository events trigger it, and GitHub runs the work on virtual machines it creates and destroys per job. Because the pipeline lives in the repository, it is versioned and reviewed like any other code.

Then add the sentence that shows you have used it: *"each job gets a fresh machine, so it starts empty — you check your own code out, and anything crossing a job boundary goes through artifacts or outputs."*

## The model

<div class="flow">
  <div class="node">EVENT<small>push / PR / cron</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">WORKFLOW<small>one YAML file</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">JOB<small>one fresh machine</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">STEP<small>run or uses</small></div>
</div>

**One workflow, many jobs, each job many steps, each job its own machine.**

| Term | Say this |
|---|---|
| **Workflow** | A YAML file in `.github/workflows/` describing what happens for a set of triggers |
| **Event** | Repository activity that starts a workflow |
| **Job** | A group of steps on one runner; jobs run in parallel by default |
| **Step** | One shell command (`run`) or one reusable action (`uses`) |
| **Action** | A packaged reusable step, referenced `owner/repo@ref` |
| **Runner** | The machine executing a job |
| **Artifact** | Files uploaded off the runner before it is destroyed |
| **Cache** | Stored dependencies reused by later runs |
| **Context** | Read-only run data available to `${{ }}` expressions |
| **Job output** | A string a later job can read via `needs` |

## The file to write on a whiteboard

Practise this until it is automatic, including the folder path.

```yaml .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: pytest -q
```

Mandatory keys: **`on`**, **`jobs`**, and per job **`runs-on`** and **`steps`**. Everything else, `name` included, is optional.

## Jobs, steps

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Steps</h4>
    <ul>
      <li>One machine, one filesystem</li>
      <li>Always run in written order</li>
      <li>A failure stops the rest of the job</li>
      <li>Share data via files and <code>$GITHUB_ENV</code></li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Jobs</h4>
    <ul>
      <li>Own machine each</li>
      <li>Parallel unless ordered with <code>needs</code></li>
      <li>No shared filesystem at all</li>
      <li>Share files via artifacts, strings via outputs</li>
    </ul>
  </div>
</div>

```yaml
jobs:
  lint:                        # lint and test start together
    runs-on: ubuntu-latest
    steps: [{ run: ruff check . }]
  test:
    runs-on: ubuntu-latest
    steps: [{ run: pytest -q }]
  deploy:
    needs: [lint, test]        # waits for BOTH; skipped if either fails
    runs-on: ubuntu-latest
    steps: [{ run: ./deploy.sh }]
```

## `run` versus `uses`

| | `run` | `uses` |
|---|---|---|
| Is | A shell command on the runner | A published, reusable action |
| Written | `- run: pytest -q` | `- uses: actions/checkout@v4` |
| Configured by | Arguments | The `with:` block |
| For | Anything you already type in a terminal | Setup, caching, uploads, cloud logins |

Mutually exclusive in one step — a favourite trick question. Steps also take options:

```yaml
- name: Test the backend
  working-directory: ./backend     # cd for this step only
  shell: bash
  env:
    CI: 'true'                     # step-scoped variable
  continue-on-error: false
  run: |
    npm run lint
    npm test
```

## Triggers and filters

| Trigger | Fires when |
|---|---|
| `push` | Commits reach a branch or tag |
| `pull_request` | A PR is opened, updated, reopened |
| `workflow_dispatch` | Someone clicks **Run workflow** |
| `schedule` | Cron matches — **UTC**, default branch only |
| `release` | A release is published |
| `issues` / `issue_comment` | Issue activity, for bots |

```yaml
on:
  push:
    branches: [main]
    tags: ['v*']
    paths-ignore: ['docs/**', '**/*.md']
  pull_request:
    types: [opened, synchronize, reopened]
  schedule:
    - cron: '0 3 * * *'            # minute hour dom month dow, UTC
  workflow_dispatch:
    inputs:
      environment:
        type: choice
        options: [staging, production]
        default: staging
```

Narrowed by `branches`, `tags`, `paths`, `paths-ignore`, `types`.

## Expressions and contexts

| Context | Gives you | Examples |
|---|---|---|
| `github` | Event and repo data | `github.ref`, `github.sha`, `github.actor`, `github.event_name`, `github.run_number` |
| `runner` | The machine | `runner.os`, `runner.temp` |
| `env` | Variables you set | `env.LOG_LEVEL` |
| `secrets` | Encrypted secrets | `secrets.GITHUB_TOKEN` |
| `inputs` | `workflow_dispatch` inputs | `inputs.environment` |
| `steps` | Earlier step outputs | `steps.build.outputs.tag` |
| `needs` | Earlier job outputs | `needs.build.outputs.version` |
| `matrix` | Current combination | `matrix.python` |

## Conditions

| You want | Write |
|---|---|
| Only on `main` | `if: github.ref == 'refs/heads/main'` |
| Only on pull requests | `if: github.event_name == 'pull_request'` |
| Only on a version tag | `if: startsWith(github.ref, 'refs/tags/v')` |
| Skip a bot | `if: github.actor != 'dependabot[bot]'` |
| Even after a failure | `if: always()` |
| Only after a failure | `if: failure()` |

Inside `if:` the `${{ }}` wrapper is **optional** — everywhere else it is required.

<div class="callout warn">
  <span class="ct">The classic gotcha</span>
  <code>github.ref</code> is the <b>full</b> ref — <code>refs/heads/main</code>, not <code>main</code>. Comparing it to <code>'main'</code> silently never matches, and this comes up in interviews as a "debug this" exercise.
</div>

## Environment variables and the special files

Three scopes; most specific wins.

```yaml
env:
  LOG_LEVEL: info            # workflow
jobs:
  test:
    env:
      LOG_LEVEL: debug       # job
    steps:
      - run: ./run.sh
        env:
          LOG_LEVEL: trace   # step — wins
```

Each `run` is a new shell, so `export` does not survive. Two files bridge that:

```yaml
- run: echo "VERSION=1.4.${{ github.run_number }}" >> "$GITHUB_ENV"   # later steps
- run: echo "tag=sha-${GITHUB_SHA::7}" >> "$GITHUB_OUTPUT"            # step output
- run: echo "### Done" >> "$GITHUB_STEP_SUMMARY"                      # run page
```

A `$GITHUB_ENV` value is **not** readable in the step that wrote it, and none of these cross a job boundary.

## Secrets

```yaml
- name: Deploy
  env:
    API_TOKEN: ${{ secrets.API_TOKEN }}    # pass as data
  run: ./deploy.sh                          # reads "$API_TOKEN"
```

`GITHUB_TOKEN` is provided automatically for every run and can act on the repository itself:

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

Three facts to state without prompting: **never echo a secret** (masking is a safety net, not a strategy); **pass secrets via `env`, not into a command line**; and **fork pull requests get no secrets**, by design.

## Caching and artifacts

```yaml
- uses: actions/setup-python@v5
  with:
    python-version: '3.11'
    cache: pip                 # dependency cache, one line
```

```yaml
- uses: actions/upload-artifact@v4
  if: always()                 # ← keep the report even when tests FAIL
  with:
    name: test-reports
    path: reports/
    retention-days: 7
```

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Artifact — data you need</h4>
    <ul>
      <li>Reports, build output, logs</li>
      <li>Downloaded by a human or a later job</li>
      <li>If missing, something is broken</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Cache — a shortcut</h4>
    <ul>
      <li>Downloaded dependencies</li>
      <li>Reused by later runs</li>
      <li>If missing, the run is just slower</li>
    </ul>
  </div>
</div>

One line: *a cache is an optimisation you must be able to lose; an artifact is data you cannot.*

## Passing data between jobs

**Outputs for strings, artifacts for files.**

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.meta.outputs.version }}     # declare it
    steps:
      - id: meta                                     # step needs an id
        run: echo "version=1.4.${{ github.run_number }}" >> "$GITHUB_OUTPUT"
      - run: make build
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: dist/ }

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with: { name: dist, path: dist/ }
      - run: ./deploy.sh --version "${{ needs.build.outputs.version }}"
```

## Matrix

```yaml
strategy:
  fail-fast: false                     # let every version report
  matrix:
    python: ['3.10', '3.11', '3.12']   # → three parallel jobs
runs-on: ubuntu-latest
steps:
  - uses: actions/setup-python@v5
    with:
      python-version: ${{ matrix.python }}
```

Add a second axis and they multiply: two OSes × two Pythons = four jobs. `fail-fast: true` is the default and cancels every sibling on the first failure.

## Guards and runners

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15            # default ceiling is SIX HOURS
    steps:
      - continue-on-error: true    # non-critical step may fail
        run: ./experimental.sh
```

| | GitHub-hosted | Self-hosted |
|---|---|---|
| Maintained by | GitHub | You |
| Lifetime | Per job, then destroyed | Persistent, state can leak |
| Cost | Free on public repos | Your hardware |
| Pick it for | Almost everything | GPU, paid licence, private network |

Ubuntu runners already have Git, Docker, Node, Python, and `gh` — so no, you do not install Docker first.

## The four traps, and why they share one cause

The runner is new per job; the shell is new per step.

| Symptom | Cause | Fix |
|---|---|---|
| "No such file or directory" for a repo file | No checkout | `actions/checkout@v4` |
| Deploy job cannot find `dist/` | Different machine | Artifact upload + download |
| `cd` has no effect on the next step | New shell per step | `working-directory:` |
| Variable empty in the next step | `export` dies with the step | `>> "$GITHUB_ENV"` |

```yaml
- run: export VERSION=1.2.3
- run: echo "$VERSION"                       # empty

- run: echo "VERSION=1.2.3" >> "$GITHUB_ENV"
- run: echo "$VERSION"                       # 1.2.3
```

## Snippets to have ready

```yaml
- uses: actions/checkout@v4                       # nothing is there until this

- uses: actions/setup-node@v4                     # setup + cache in one
  with: { node-version: '20', cache: npm }

- uses: actions/upload-artifact@v4                # diagnostics survive failure
  if: always()
  with: { name: reports, path: reports/ }

- run: echo "K=v" >> "$GITHUB_ENV"                # share with later steps
- run: echo "k=v" >> "$GITHUB_OUTPUT"             # expose as a step output

timeout-minutes: 15                               # never burn six hours
if: github.ref == 'refs/heads/main'               # main only
```

## Common interview questions

<ol class="guide-steps">
  <li><b>Where do workflow files live, and what if the path is wrong?</b><code>.github/workflows/*.yml</code>. A wrong path means the file is inert — GitHub never reads it and reports no error, which is why "my workflow isn't running" is usually a path or trigger problem, not a broken workflow.</li>
  <li><b>Why does <code>actions/checkout</code> exist? Isn't my code already there?</b>No. The runner boots empty. Checkout clones the repository at the triggering commit.</li>
  <li><b>Do jobs run in order?</b>No — in parallel. <code>needs</code> creates ordering, and also gives the later job access to the earlier one's outputs.</li>
  <li><b>How do you pass a file from one job to another? And a string?</b>A file needs an artifact — upload in one job, download in the other. A string uses a job <code>output</code> fed from <code>$GITHUB_OUTPUT</code> and read as <code>needs.build.outputs.version</code>.</li>
  <li><b>Cache versus artifact?</b>A cache speeds up recreating something and is safe to lose; an artifact preserves a result you cannot recreate. Caches are keyed and restored automatically; artifacts are named and downloaded.</li>
  <li><b>How do you keep the test report when tests fail?</b><code>if: always()</code> on the upload step. Without it the failed test stops the job before the upload runs.</li>
  <li><b>Why did my variable disappear between steps? And why doesn't <code>cd</code> stick?</b>Both because each <code>run</code> is a fresh shell. Use <code>>> "$GITHUB_ENV"</code> for variables and <code>working-directory:</code> for the directory.</li>
  <li><b>What does <code>@v4</code> mean, and would you use <code>@main</code>?</b>A Git ref — a moving major-version tag that receives patches. Never <code>@main</code> on someone else's action: that runs whatever is on their branch when your job starts, which is a remote-code-execution surface.</li>
  <li><b>How do you make something run only on <code>main</code>?</b>A <code>branches: [main]</code> filter on the trigger, or <code>if: github.ref == 'refs/heads/main'</code> on the job — noting the value is the full ref.</li>
  <li><b>How do you trigger a workflow by hand, and can it take parameters?</b>Add <code>workflow_dispatch</code> to <code>on:</code>; a **Run workflow** button appears. Declare <code>inputs</code> with types (`string`, `boolean`, `choice`) and read them as <code>inputs.name</code>.</li>
  <li><b>How do you test against several language versions?</b>A matrix. Axes multiply into parallel jobs, and <code>fail-fast: false</code> stops one failure cancelling the rest — which you want while diagnosing.</li>
  <li><b>How do you handle secrets safely?</b>Store them in repository or environment secrets, read via <code>${{ secrets.NAME }}</code>, and pass them through <code>env</code> rather than into a command line. Never echo them. Note that fork pull requests deliberately receive none.</li>
  <li><b>What is <code>GITHUB_TOKEN</code>?</b>A token minted automatically per job, scoped to that repository, expiring when the job ends. Use it for anything acting on the repository — commenting on a PR, pushing a tag, publishing to GitHub Packages.</li>
  <li><b>How do you stop a runaway job?</b><code>timeout-minutes</code> on the job. The default ceiling is six hours, so a hung job otherwise consumes your allowance silently.</li>
  <li><b>Free or paid?</b>Unlimited minutes on public repositories. Private repositories get a monthly allowance; Windows and macOS minutes bill at a multiple of Linux.</li>
  <li><b>Walk me through debugging a red run.</b>Click the red job then the red step; read from the <em>top</em> of the failure, not the last line; reproduce the command locally to see whether the workflow is even implicated; print the values you are branching on; then re-run only the failed job, with debug logging if needed.</li>
  <li><b>Your workflow is committed but nothing happens.</b>Check the folder is exactly <code>.github/workflows/</code>; check the extension; read <code>on:</code> for a branch or path filter; confirm the file exists on the branch you pushed; if it is a schedule, remember UTC and default-branch-only.</li>
  <li><b>How would you speed up a slow pipeline, at this level?</b>Add <code>cache:</code> to the setup action, add a <code>paths-ignore</code> filter so documentation changes skip the suite, split independent work into parallel jobs, and put <code>timeout-minutes</code> on everything so a hung job is not mistaken for a slow one.</li>
</ol>

## Sixty-second self-test

- Name the four nesting levels from event to step.
- List the mandatory keys of a workflow.
- Explain why files vanish between jobs but not between steps.
- State the difference between `run` and `uses`.
- Give the one-line difference between a cache and an artifact.
- Say how a string travels between jobs, and how a file does.
- Write the `if` for "main only" and explain the full-ref trap.
- Say what `if: always()` is for and where you would put it.
- Name the two files that move values out of a `run` step.
- Explain what a matrix generates and what `fail-fast: false` changes.
