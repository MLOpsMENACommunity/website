Read this in twenty minutes before an interview. Fast review first, common questions at the end.

## The thirty-second answer

> GitHub Actions is GitHub's built-in CI/CD and automation platform. You commit a YAML file to `.github/workflows/`, declare which repository events trigger it, and GitHub runs the work on virtual machines it creates and destroys per job. Because the pipeline lives in the repository, it is versioned and reviewed like any other code.

Then add the sentence that shows you have used it: *"each job gets a fresh machine, so it starts empty — you check your own code out, and anything crossing a job boundary goes through artifacts."*

## The model in one picture

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

## Vocabulary

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

## Jobs versus steps

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
      <li>Share files only via artifacts</li>
    </ul>
  </div>
</div>

```yaml
jobs:
  build:                       # build and lint start together
    runs-on: ubuntu-latest
    steps: [{ run: make build }]
  lint:
    runs-on: ubuntu-latest
    steps: [{ run: make lint }]
  deploy:
    needs: [build, lint]       # waits for both
    runs-on: ubuntu-latest
    steps: [{ run: make deploy }]
```

## `run` versus `uses`

| | `run` | `uses` |
|---|---|---|
| Is | A shell command on the runner | A published, reusable action |
| Written | `- run: pytest -q` | `- uses: actions/checkout@v4` |
| Configured by | Arguments | The `with:` block |
| For | Anything you already type in a terminal | Setup, caching, uploads, cloud logins |

Mutually exclusive in one step — a favourite trick question.

## Triggers

| Trigger | Fires when |
|---|---|
| `push` | Commits reach a branch or tag |
| `pull_request` | A PR is opened, updated, reopened |
| `workflow_dispatch` | Someone clicks **Run workflow** |
| `schedule` | A cron time matches — **UTC**, default branch only |
| `release` | A release is published |
| `issues` / `issue_comment` | Issue activity, for bots |

```yaml
on:
  push:
    branches: [main]
  pull_request:
    paths-ignore: ['docs/**', '**/*.md']   # skip docs-only changes
  schedule:
    - cron: '0 3 * * *'
  workflow_dispatch:
```

Narrowed by `branches`, `tags`, `paths`, `paths-ignore`.

## Expressions and contexts

| Context | Gives you | Examples |
|---|---|---|
| `github` | Event and repo data | `github.ref`, `github.sha`, `github.actor`, `github.event_name` |
| `runner` | The machine | `runner.os`, `runner.temp` |
| `env` | Variables you set | `env.LOG_LEVEL` |
| `secrets` | Encrypted secrets | `secrets.GITHUB_TOKEN` |
| `steps` | Earlier step outputs | `steps.build.outputs.tag` |

```yaml
- name: Deploy only from main, only on push
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  run: ./deploy.sh
```

Two facts that get probed: inside `if:` the `${{ }}` wrapper is **optional**; everywhere else it is required. And `github.ref` is the **full** ref — `refs/heads/main`, not `main`.

Status functions for `if:` — `success()`, `failure()`, `cancelled()`, `always()`.

## Cache versus artifact

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Artifact — data you need</h4>
    <ul>
      <li>Reports, build output, logs</li>
      <li>Downloaded by a human or a later job</li>
      <li>If missing, something is broken</li>
      <li><code>actions/upload-artifact</code></li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Cache — a shortcut</h4>
    <ul>
      <li>Downloaded dependencies</li>
      <li>Reused by later runs</li>
      <li>If missing, the run is just slower</li>
      <li><code>cache:</code> on <code>setup-*</code>, or <code>actions/cache</code></li>
    </ul>
  </div>
</div>

One line: *a cache is an optimisation you must be able to lose; an artifact is data you cannot.*

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: npm                      # dependency cache, one line

- uses: actions/upload-artifact@v4
  if: always()                      # keep the report even on failure
  with:
    name: test-report
    path: reports/
```

## Runners

| | GitHub-hosted | Self-hosted |
|---|---|---|
| Maintained by | GitHub | You |
| Lifetime | Per job, then destroyed | Persistent, state can leak |
| Cost | Free on public repos | Your hardware |
| Pick it for | Almost everything | GPU, paid licence, private network |

Labels: `ubuntu-latest`, `windows-latest`, `macos-latest`. Ubuntu runners already have Git, Docker, Node, Python, and `gh` — so no, you do not install Docker first.

## The four traps, and why they all have one cause

The runner is new per job; the shell is new per step.

| Symptom | Cause | Fix |
|---|---|---|
| "No such file or directory" for a repo file | No checkout | `actions/checkout@v4` |
| Deploy job cannot find `dist/` | Different machine | Artifact upload + download |
| `cd` has no effect on the next step | New shell per step | `working-directory:` |
| Variable empty in the next step | `export` dies with the step | `>> "$GITHUB_ENV"` |

```yaml
# Wrong / right, for both
- run: export VERSION=1.2.3
- run: echo "$VERSION"                       # empty

- run: echo "VERSION=1.2.3" >> "$GITHUB_ENV"
- run: echo "$VERSION"                       # 1.2.3
```

## Snippets to have ready

```yaml
# Nothing is on the runner until this
- uses: actions/checkout@v4

# Setup with caching built in
- uses: actions/setup-python@v5
  with: { python-version: '3.11', cache: pip }

# Preserve diagnostics even on failure
- uses: actions/upload-artifact@v4
  if: always()
  with: { name: reports, path: reports/ }

# A multi-line script in one step
- run: |
    echo "commit ${{ github.sha }}"
    make test

# A guard so a hung job cannot run for six hours
timeout-minutes: 15
```

## Common interview questions

<ol class="guide-steps">
  <li><b>Where do workflow files live, and what if the path is wrong?</b><code>.github/workflows/*.yml</code>. A wrong path means the file is inert — GitHub never reads it and reports no error, which is why "my workflow isn't running" is usually a path or trigger problem, not a broken workflow.</li>
  <li><b>Why does <code>actions/checkout</code> exist? Isn't my code already there?</b>No. The runner boots empty. Checkout clones the repository at the triggering commit.</li>
  <li><b>Do jobs run in order?</b>No — in parallel. <code>needs</code> creates ordering, and also gives the later job access to the earlier one's outputs.</li>
  <li><b>How do you pass a file from one job to another?</b>Upload an artifact, download it in the second job. Jobs never share a filesystem.</li>
  <li><b>What is the difference between a cache and an artifact?</b>A cache speeds up recreating something and is safe to lose; an artifact preserves a result you cannot recreate. Caches are keyed and restored automatically; artifacts are named and downloaded.</li>
  <li><b>How do you keep the test report when tests fail?</b><code>if: always()</code> on the upload step. Without it the failed test stops the job before the upload runs.</li>
  <li><b>Why did my variable disappear between steps?</b><code>export</code> only lives for that step's shell. Append to <code>$GITHUB_ENV</code> to share it with later steps in the same job.</li>
  <li><b>Why doesn't <code>cd</code> stick?</b>Each <code>run</code> is a fresh shell starting in the workspace root. Use <code>working-directory:</code> or chain commands in one <code>run</code>.</li>
  <li><b>What does <code>@v4</code> mean, and would you ever use <code>@main</code>?</b>It is a Git ref — a moving major-version tag that receives patches. Never <code>@main</code> on someone else's action: that runs whatever is on their branch when your job starts.</li>
  <li><b>How do you make a workflow run only on <code>main</code>?</b>Either a <code>branches: [main]</code> filter on the trigger, or <code>if: github.ref == 'refs/heads/main'</code> on the job. Note the value is the full ref.</li>
  <li><b>How do you trigger a workflow manually?</b>Add <code>workflow_dispatch</code> to <code>on:</code>. A **Run workflow** button appears in the Actions tab.</li>
  <li><b>Free or paid?</b>Unlimited minutes on public repositories. Private repositories get a monthly allowance; Windows and macOS minutes bill at a multiple of Linux.</li>
  <li><b>How do you avoid leaking a secret?</b>Never echo it. Read it via <code>${{ secrets.NAME }}</code> or pass it through <code>env</code>. GitHub masks known secret values as a safety net, not a strategy.</li>
  <li><b>Your workflow file is committed but nothing happens. Walk me through it.</b>Check the folder path is exactly <code>.github/workflows/</code>; check the extension is <code>.yml</code>; read <code>on:</code> for a branch or path filter; confirm the file exists on the branch you pushed; if it is a schedule, remember UTC and default-branch-only.</li>
</ol>

## Sixty-second self-test

- Name the four nesting levels from event to step.
- List the mandatory keys of a workflow.
- Explain why files vanish between jobs but not between steps.
- State the difference between `run` and `uses`.
- Give the one-line difference between a cache and an artifact.
- Say what `if: always()` is for.
- Name the action that clones your repo and the one that saves a file.
