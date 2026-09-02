Every push should build, test, and ship itself. Here is the whole idea in one line:

<div class="flow">
  <div class="node">YOU PUSH<small>git push</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">GITHUB REACTS<small>an event fires</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">A MACHINE RUNS<small>fresh VM, your steps</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">GREEN OR RED<small>in ~2 minutes</small></div>
</div>

**CI** (continuous integration) = every change is built and tested automatically. **CD** (continuous deployment) = anything that passed ships automatically. GitHub Actions does both, from a file inside your repository.

## Where the file lives

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

<div class="callout tip">
  <span class="ct">Three experiments, five minutes each</span>
  Add <code>- run: date</code> and find its output · swap <code>on: push</code> for <code>on: workflow_dispatch</code> and use the <b>Run workflow</b> button · break it with <code>- run: exit 1</code> and read the red log. Causing failures on purpose is the fastest way to get comfortable.
</div>

## The building blocks

<div class="flow">
  <div class="node">EVENT<small>push / PR / cron</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">WORKFLOW<small>one YAML file</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">JOB<small>one machine</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">STEP<small>one command</small></div>
</div>

The one distinction that matters most:

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Steps share everything</h4>
    <ul>
      <li>Same machine, same files</li>
      <li>Run in the order written</li>
      <li>Files one step makes, the next can read</li>
      <li>A failure stops the rest</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Jobs share nothing</h4>
    <ul>
      <li>Each gets its own machine</li>
      <li>Run <em>at the same time</em> by default</li>
      <li>Files do not cross between them</li>
      <li>Ordered only by <code>needs</code></li>
    </ul>
  </div>
</div>

That is why `runs-on` sits on the job — each job is asking for its own computer.

```yaml
jobs:
  build:                    # these two start together
    runs-on: ubuntu-latest
    steps: [{ run: make build }]

  lint:
    runs-on: ubuntu-latest
    steps: [{ run: make lint }]

  deploy:
    needs: [build, lint]    # waits for both to pass
    runs-on: ubuntu-latest
    steps: [{ run: make deploy }]
```

**Start with one job and several steps.** Split into jobs when you want real parallelism or a hard gate.

## Triggers

| Trigger | Fires when | Use it for |
|---|---|---|
| `push` | Commits reach a branch or tag | Test every change |
| `pull_request` | A PR opens or updates | Check *before* merging |
| `workflow_dispatch` | You click **Run workflow** | Manual runs |
| `schedule` | A cron time matches (**UTC**) | Nightly jobs |
| `release` | You publish a release | Build downloads |

```yaml
on:
  push:
    branches: [main]          # only main, not every branch
  pull_request:
  schedule:
    - cron: '0 3 * * *'       # 03:00 UTC daily
  workflow_dispatch:          # and a manual button
```

Cron fields are `minute hour day-of-month month day-of-week`.

<div class="callout warn">
  <span class="ct">"My workflow isn't running"</span>
  Read <code>on:</code> before reading anything else. It is nearly always a <code>branches</code> filter, a wrong folder, or a <code>schedule</code> you are waiting for in the wrong timezone. Schedules are UTC and only run from the default branch.
</div>

## Two kinds of step

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

  - run: npm ci                      # plain commands
  - run: npm test
```

<div class="callout warn">
  <span class="ct">The number-one beginner failure</span>
  <b>The runner starts empty.</b> Your repository is not on it. <code>actions/checkout</code> clones it. If you see "no such file or directory" for a file you can see on GitHub, this is why — and it is why almost every workflow starts with that line.
</div>

### The four actions you will use immediately

<div class="cards">
  <div class="card"><div class="icon">📥</div><h4>actions/checkout</h4><p>Clones your repository onto the runner. First step of nearly every job.</p></div>
  <div class="card"><div class="icon">🐍</div><h4>actions/setup-*</h4><p>Installs a language version. <code>setup-node</code>, <code>setup-python</code>, <code>setup-java</code>, <code>setup-go</code>.</p></div>
  <div class="card"><div class="icon">📦</div><h4>actions/cache</h4><p>Reuses downloaded dependencies between runs, so later runs are much faster.</p></div>
  <div class="card"><div class="icon">📤</div><h4>actions/upload-artifact</h4><p>Saves files off the machine before it is destroyed, so you can download them.</p></div>
</div>

The `@v4` is a version tag. For official `actions/*` the major tag is the normal choice. Never use `@main` on someone else's action — that runs whatever is on their branch right now.

## Runners

| | GitHub-hosted | Self-hosted |
|---|---|---|
| Who runs it | GitHub | You |
| Lifetime | New per job, then destroyed | Persistent |
| Cost | Free on public repos | Your hardware |
| Pick it | Almost always | GPU, licence, private network |

Labels: `ubuntu-latest`, `windows-latest`, `macos-latest`. Ubuntu is fastest and cheapest. It ships with Git, Docker, Node, Python, and the `gh` CLI already installed.

## Caching: the one-line speed-up

The runner is new every time, so dependencies download every time. Caching fixes that, and for most languages it is a single line.

```yaml
- uses: actions/setup-python@v5
  with:
    python-version: '3.11'
    cache: pip                 # ← this is the whole thing
```

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: npm                 # same idea for npm
```

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>run 1</span><strong>Cache miss</strong><small>Dependencies download normally, then get saved at the end of the job.</small></div>
  <div class="guide-timeline-item"><span>run 2</span><strong>Cache hit</strong><small>Dependencies are restored from the cache instead of downloaded.</small></div>
  <div class="guide-timeline-item"><span>lockfile changes</span><strong>Miss again</strong><small>The cache key includes your lockfile, so new dependencies are picked up automatically.</small></div>
</div>

<div class="callout tip">
  <span class="ct">Use the built-in one</span>
  There is a general-purpose <code>actions/cache</code> for anything else, but at this stage the <code>cache:</code> input on your setup action does the right thing for free. Add it to every workflow you write.
</div>

## Artifacts: keep what the run produced

The machine is destroyed when the job ends. Anything you want to keep — a test report, a build output, a log — has to be uploaded.

```yaml
- name: Run tests
  run: pytest -q --junitxml=reports/junit.xml

- name: Keep the report
  if: always()                 # ← save it even when tests FAIL
  uses: actions/upload-artifact@v4
  with:
    name: test-report
    path: reports/
```

Artifacts appear as downloadable files at the bottom of the run page.

<div class="callout warn">
  <span class="ct"><code>if: always()</code> is the point</span>
  Without it, a failing test stops the job and the upload never happens — so you lose the report exactly when you need it. Put <code>if: always()</code> on anything that saves diagnostics.
</div>

Cache and artifacts are easy to confuse, so:

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

## Conditions

`if:` decides whether a step or job runs. Inside `if:` the `${{ }}` wrapper is optional.

```yaml
- name: Deploy
  if: github.ref == 'refs/heads/main'
  run: ./deploy.sh
```

| You want | Write |
|---|---|
| Only on `main` | `if: github.ref == 'refs/heads/main'` |
| Only on pull requests | `if: github.event_name == 'pull_request'` |
| Even after a failure | `if: always()` |
| Only after a failure | `if: failure()` |

<div class="callout warn">
  <span class="ct">The gotcha that costs an hour</span>
  <code>github.ref</code> is the <b>full</b> ref: <code>refs/heads/main</code>, not <code>main</code>. Comparing it to <code>'main'</code> silently never matches. When a condition misbehaves, print it: <code>- run: echo "${{ github.ref }}"</code>.
</div>

## Reading a failed run

<ol class="guide-steps">
  <li><b>Click the red job, then the red step</b>GitHub expands the failure for you.</li>
  <li><b>Scroll up, not down</b>Logs end with a tool's summary. The real cause is usually well above it.</li>
  <li><b>Run the command on your own machine</b>If it fails there too, the workflow is innocent.</li>
  <li><b>Print what you are unsure about</b><code>pwd</code>, <code>ls -la</code>, <code>echo "$VAR"</code>, <code>python --version</code>. A step is just a shell.</li>
  <li><b>Use "Re-run failed jobs"</b>Retries only the red job instead of the whole pipeline.</li>
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

## Putting it all together

Everything above, in one file you can copy into a real project. Nothing here is new.

```yaml .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15                    # never burn hours on a hung job
    steps:
      - uses: actions/checkout@v4          # the runner starts empty

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'           # quoted
          cache: pip                       # free speed-up

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Check formatting
        run: ruff format --check .

      - name: Run tests
        run: pytest -q --junitxml=reports/junit.xml

      - name: Keep the report
        if: always()                       # even when tests fail
        uses: actions/upload-artifact@v4
        with:
          name: test-report
          path: reports/

  deploy:
    needs: test                            # only if tests passed
    if: github.ref == 'refs/heads/main'    # and only from main
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./deploy.sh
```

The same shape for a JavaScript project — only the setup action and the commands change:

```yaml
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test
```

## Checklist before you move on

| Can you… | |
|---|---|
| Name the path workflow files must live in? | `.github/workflows/` |
| Say why `actions/checkout` is needed? | The runner starts empty |
| Explain why jobs cannot share files? | Separate machines |
| Explain why `cd` does not persist? | New shell per step |
| Make a second run faster? | `cache:` on the setup action |
| Keep a report from a failed run? | `upload-artifact` + `if: always()` |
| Deploy only from `main`? | `if: github.ref == 'refs/heads/main'` |

Now put a CI workflow on a project you actually care about. Reading this is not the same as having debugged your own indentation error at eleven at night — and the second one is what makes it stick.
