You can already write a workflow that runs your tests. That is a script runner. This level is about the machinery that turns a script runner into a real continuous integration system — one that reacts to its own context, moves data between stages, does not repeat work it has already done, and cannot deploy two things at once by accident.

Everything here exists to solve a problem you have probably already felt. I will name the problem first, then show the mechanism.

## Making a workflow react to its own context

A pipeline that does the same thing regardless of circumstances is barely automation. You want to deploy from `main` but not from a feature branch, skip the expensive suite on a documentation change, and notify somebody only when something breaks.

The mechanism is **expressions** reading from **contexts**. An expression is anything inside `${{ }}`; a context is a read-only object of data about the current run.

```yaml
- name: Deploy
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  run: ./deploy.sh
```

The contexts you will actually use:

| Context | Holds | Reach for it when |
|---|---|---|
| `github` | `ref`, `ref_name`, `sha`, `actor`, `event_name`, `repository`, `run_id`, and the whole raw `event` payload | Branching on circumstances |
| `runner` | `os`, `arch`, `temp`, `tool_cache` | Writing cross-platform steps |
| `env` | Variables you declared | Reading configuration |
| `vars` / `secrets` | Repository, organisation, and environment configuration | Configuration and credentials |
| `needs` | `needs.<job>.outputs.*` and `needs.<job>.result` | Consuming an earlier job |
| `steps` | `steps.<id>.outputs.*`, `.outcome`, `.conclusion` | Consuming an earlier step |
| `matrix` | The current combination's values | Parameterised jobs |
| `job` | `job.status`, and service container details | Conditional cleanup |

Alongside those, a small function library: `contains()`, `startsWith()`, `endsWith()`, `format()`, `join()`, `toJSON()`, `fromJSON()`, and `hashFiles()`. Plus four status functions — `success()`, `failure()`, `cancelled()`, `always()` — which only make sense inside `if:`.

Two subtleties are worth learning now rather than discovering later.

**Inside `if:` the braces are optional**, because the value is already evaluated as an expression. Everywhere else they are mandatory. Mixing the two styles in one condition produces confusing partial evaluation.

**`outcome` and `conclusion` are different.** `outcome` is what the step actually did; `conclusion` is what it did *after* `continue-on-error` is applied. A step that fails with `continue-on-error: true` has `outcome == 'failure'` and `conclusion == 'success'`. When you want to react to a real failure that you deliberately tolerated, you need `outcome`.

<div class="callout tip">
  <span class="ct">The debugging tool you will use constantly</span>
  <code>- run: echo '${{ toJSON(github) }}'</code> prints the entire event payload. Almost every "why didn't my condition match" question is answered by one run of that step. Keep it in a scratch workflow.
</div>

## Getting values out of a step

Steps share a machine but each `run` is its own shell process, so a variable set in one is gone by the next. GitHub gives you three special files, exposed as environment variables, to bridge that gap.

```yaml
- name: Compute some values
  id: meta
  run: |
    echo "IMAGE_TAG=sha-$(git rev-parse --short HEAD)" >> "$GITHUB_ENV"
    echo "artifact=dist/app.tar.gz"                   >> "$GITHUB_OUTPUT"
    echo "### Build summary"                          >> "$GITHUB_STEP_SUMMARY"

- run: echo "$IMAGE_TAG"                              # from GITHUB_ENV
- run: echo "${{ steps.meta.outputs.artifact }}"      # from GITHUB_OUTPUT
```

`$GITHUB_ENV` sets environment variables for **every later step in the same job**. `$GITHUB_OUTPUT` sets **step outputs**, addressed by the step's `id`, which is what you need when the value has to flow into an expression. `$GITHUB_STEP_SUMMARY` accepts Markdown and renders it on the run page — the cheapest observability you will ever add. There is also `$GITHUB_PATH`, which prepends a directory to `PATH` for later steps.

The trap: a variable written to `$GITHUB_ENV` is **not** available in the step that wrote it. It applies from the next step onwards.

Environment variables themselves have three scopes, and the most specific wins:

```yaml
env:
  LOG_LEVEL: info          # every job, every step

jobs:
  test:
    env:
      LOG_LEVEL: debug     # every step in this job
    steps:
      - run: ./run.sh
        env:
          LOG_LEVEL: trace # this step only
```

## Secrets and variables

Configuration splits cleanly into two kinds, and conflating them is a real security problem.

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Secrets — <code>${{ secrets.NAME }}</code></h4>
    <ul>
      <li>Encrypted at rest, write-only in the interface</li>
      <li>Masked in logs on a best-effort basis</li>
      <li>Not given to workflows triggered by a fork's pull request</li>
      <li>For tokens, API keys, passwords, connection strings</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Variables — <code>${{ vars.NAME }}</code></h4>
    <ul>
      <li>Plain text and readable by anyone with repository access</li>
      <li>Printed normally in logs</li>
      <li>Available in every run, including fork pull requests</li>
      <li>For regions, image names, URLs, feature flags</li>
    </ul>
  </div>
</div>

Both exist at three levels — organisation, repository, and environment — with the most specific definition winning. That layering is more useful than it first appears: an organisation variable sets a default for sixty repositories, and one repository overrides it.

`GITHUB_TOKEN` is provided automatically for every run without you configuring anything. It is minted per job, scoped to that repository, and expires when the job ends. Use it for anything that talks to the repository itself — pushing a tag, commenting on a pull request, publishing to GitHub Packages.

<div class="callout warn">
  <span class="ct">Pass secrets as data, never as shell source</span>
  Write <code>env: TOKEN: ${{ secrets.TOKEN }}</code> and then use <code>"$TOKEN"</code> in the script. Interpolating a secret directly into a command line puts it in the shell's argument list and makes it far easier to leak accidentally through <code>set -x</code>, an error message, or a crash dump.
</div>

## Not doing the same work twice

Installing dependencies from scratch on every run is usually the largest single waste in a pipeline. Caching fixes it, and caching is entirely about designing one string: the key.

```yaml
- uses: actions/cache@v4
  id: deps
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements*.txt') }}
    restore-keys: |
      ${{ runner.os }}-pip-
```

The model, which answers every cache question you will ever have:

`key` is an **exact** lookup. A hit restores the cache and skips saving at the end of the job. A miss runs your install normally and saves the result under that key when the job succeeds.

`restore-keys` is a list of **prefixes** tried in order when the exact key misses. This gives you a partial hit — yesterday's dependency cache, which still saves most of the download even though the lockfile changed.

Cache entries are **immutable**. You cannot overwrite a key. This is why the key must change whenever the content should change, and it is why `hashFiles()` on your lockfile is the correct answer: the hash changes exactly when the dependencies change.

Cache **scope** follows the branch graph. A cache saved on a branch is readable by that branch and by pull requests targeting it; unrelated branches do not see each other's caches.

There are exactly two ways to get this wrong, and they fail in opposite directions:

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Keys that work</h4>
    <ul>
      <li><code>${{ runner.os }}-pip-${{ hashFiles('**/requirements*.txt') }}</code></li>
      <li>Include the tool version when it changes the layout: <code>-py${{ matrix.python }}-</code></li>
      <li>Always pair with a <code>restore-keys</code> prefix</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Keys that waste money</h4>
    <ul>
      <li><code>${{ github.sha }}</code> or <code>run_id</code> — a guaranteed miss every single run</li>
      <li>A fixed string like <code>node-cache</code> — never invalidates, ships stale dependencies</li>
      <li><code>hashFiles('**')</code> — any source edit busts the dependency cache</li>
    </ul>
  </div>
</div>

For mainstream languages you often do not need `actions/cache` at all. `setup-node`, `setup-python`, `setup-java`, and `setup-go` all take a `cache:` input that handles the path, the key, and lockfile detection for you. Use the built-in one unless you are caching something they do not know about — a compiler cache, a downloaded model, a Rust `target/` directory.

The `cache-hit` output is worth knowing: it is the string `'true'` only on an exact match, which lets you skip expensive work entirely.

```yaml
- name: Download the model only if the cache missed
  if: steps.deps.outputs.cache-hit != 'true'
  run: python scripts/fetch_model.py
```

## Keeping the things a run produced

A cache is an optimisation you must be able to lose. An **artifact** is data you cannot. That one sentence is the whole distinction, and it decides which one you reach for.

```yaml
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: coverage-${{ matrix.python }}
    path: |
      htmlcov/
      reports/junit.xml
    retention-days: 7
    if-no-files-found: error
```

| | Artifact | Cache |
|---|---|---|
| Purpose | Preserve a **result** | Speed up **recreating** something |
| Consumed by | Humans, and later jobs | Later runs |
| If it is missing | Broken — the data is gone | Fine, just slower |
| Lifetime | A retention period, 90 days by default | Evicted by age and by a repository size limit |
| Typical contents | Build output, coverage report, model file, logs | `~/.npm`, `~/.cache/pip`, `~/.m2` |

Four habits make artifacts pleasant rather than a source of confusion. `if: always()` so a failed run still produces its report. A **unique name per matrix combination**, because same-name uploads from parallel jobs collide. Short `retention-days` for CI noise, since ninety days of every pull request's coverage report is pure waste. And `if-no-files-found: error`, which turns a silently empty artifact into a visible failure.

## Moving data between jobs

Now that you have both mechanisms, the pattern for a multi-job pipeline falls out naturally: **outputs for strings, artifacts for files.**

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      tag: ${{ steps.meta.outputs.tag }}
    steps:
      - uses: actions/checkout@v4
      - id: meta
        run: echo "tag=sha-${GITHUB_SHA::7}" >> "$GITHUB_OUTPUT"
      - run: make build                       # produces dist/
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
      - run: ./deploy.sh --tag "${{ needs.build.outputs.tag }}"
```

`needs: build` does two jobs at once: it forces the ordering, and it makes `needs.build.outputs.*` available. Job outputs are not secret and are size-limited, so never route a credential through one — the deploy job should read the secret itself.

## Running the same job many ways

You want to test against four Python versions, or on both Linux and macOS. Writing four near-identical jobs is the wrong answer; a **matrix** generates them for you.

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      max-parallel: 4
      matrix:
        os: [ubuntu-latest, macos-latest]
        python: ['3.11', '3.12']
        include:
          - os: ubuntu-latest      # one extra, non-cartesian combination
            python: '3.13'
            experimental: true
        exclude:
          - os: macos-latest
            python: '3.11'
    continue-on-error: ${{ matrix.experimental == true }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python }}
```

The axes multiply: two operating systems by two Python versions is four jobs, minus one `exclude`, plus one `include`, so four in total. `include` adds a specific combination and can attach extra values to it; `exclude` removes one.

`fail-fast` defaults to `true`, which cancels every sibling as soon as one fails. That is right when you want a fast red signal and wrong when you are diagnosing a pattern — a single red cell cancelling the rest hides exactly the information you need. Turn it off while debugging.

`max-parallel` matters when the matrix hits a shared resource: a staging database, a rate-limited API, a licence server. Without it, all combinations start at once.

Two practical notes. The generated job name has the combination appended, so if a matrix job is a **required status check**, adding an axis renames it and quietly breaks branch protection — set an explicit `name:` if you rely on that. And the ceiling is 256 jobs per workflow run, which sounds generous until someone adds a third axis.

You can also build a matrix at runtime, which is how monorepo pipelines discover what changed:

```yaml
jobs:
  discover:
    runs-on: ubuntu-latest
    outputs:
      services: ${{ steps.list.outputs.services }}
    steps:
      - uses: actions/checkout@v4
      - id: list
        run: echo "services=$(ls services | jq -Rsc 'split("\n")[:-1]')" >> "$GITHUB_OUTPUT"

  build:
    needs: discover
    strategy:
      matrix:
        service: ${{ fromJSON(needs.discover.outputs.services) }}
    runs-on: ubuntu-latest
    steps:
      - run: make build SERVICE=${{ matrix.service }}
```

## Tests that need a real database

Mocking a database in integration tests is a compromise. `services` starts real containers on the job's network before your steps run.

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        ports: ['6379:6379']
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-retries 5
    env:
      DATABASE_URL: postgres://postgres:postgres@localhost:5432/postgres
      REDIS_URL: redis://localhost:6379
    steps:
      - uses: actions/checkout@v4
      - run: pytest -q tests/integration
```

The health check is not optional decoration. Without it the container is considered "started" the moment Docker returns, and your first test connects before Postgres is accepting connections. That produces the classic bug where the first run fails and the re-run passes, which people then dismiss as flakiness.

Two more details. The hostname is `localhost` when your steps run directly on the runner, but the **service name** when the job itself runs inside a container via `container:`. And pin the image to the same major version as production — `postgres:latest` silently becoming a new major release is a debugging session nobody scheduled.

If you need more than two or three containers, stop using `services` and bring your own Compose file started in a `run` step. `services` is for dependencies, not for an entire application stack.

## Writing the pipeline once instead of eleven times

Once you own several repositories with similar pipelines, copy-paste becomes the problem. There are two reuse mechanisms and choosing correctly between them is a real skill.

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Reusable workflow — called at the <em>job</em> level</h4>
    <ul>
      <li>Brings its own jobs, runners, and <code>permissions</code></li>
      <li>Takes typed <code>inputs</code> and explicit <code>secrets</code></li>
      <li>Can return <code>outputs</code> to the caller</li>
      <li>Right for a whole stage: "build, scan, and publish an image"</li>
      <li>Nesting depth is limited; cannot be called from a step</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Composite action — called at the <em>step</em> level</h4>
    <ul>
      <li>Runs inside the caller's job, on the caller's runner</li>
      <li>Takes <code>inputs</code>, returns <code>outputs</code></li>
      <li>Cannot define jobs, matrices, or its own runner</li>
      <li>Right for a repeated sequence: "set up our toolchain"</li>
      <li><code>shell:</code> is mandatory on every <code>run</code> step inside it</li>
    </ul>
  </div>
</div>

A reusable workflow declares `workflow_call` and its interface:

```yaml .github/workflows/reusable-ci.yml
on:
  workflow_call:
    inputs:
      python-version:
        description: Python version used for lint and tests
        type: string
        default: '3.11'
      run-e2e:
        description: Whether to run the end-to-end suite
        type: boolean
        default: false
    secrets:
      CODECOV_TOKEN:
        required: false
    outputs:
      coverage:
        description: Line coverage percentage
        value: ${{ jobs.test.outputs.coverage }}

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    outputs:
      coverage: ${{ steps.cov.outputs.pct }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ inputs.python-version }}
          cache: pip
      - run: pip install -r requirements.txt
      - id: cov
        run: |
          pytest -q --cov --cov-report=term
          echo "pct=$(coverage report --format=total)" >> "$GITHUB_OUTPUT"
```

And the caller shrinks to almost nothing:

```yaml .github/workflows/ci.yml
name: CI

on:
  push: { branches: [main] }
  pull_request:

jobs:
  ci:
    uses: my-org/.github/.github/workflows/reusable-ci.yml@v1
    with:
      python-version: '3.12'
    secrets:
      CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}
```

That doubled path — `my-org/.github/.github/workflows/...` — is correct and surprises everyone exactly once: the first `.github` is the repository name, the second is the folder inside it.

A composite action is the step-level equivalent, and it lives in its own directory:

```yaml .github/actions/setup/action.yml
name: Set up project
description: Checkout-adjacent setup shared by every workflow here
inputs:
  python-version:
    description: Python version to install
    default: '3.11'
outputs:
  cache-hit:
    description: Whether the dependency cache was an exact hit
    value: ${{ steps.py.outputs.cache-hit }}
runs:
  using: composite
  steps:
    - id: py
      uses: actions/setup-python@v5
      with:
        python-version: ${{ inputs.python-version }}
        cache: pip
    - run: pip install -r requirements.txt
      shell: bash
```

You then use it with `- uses: ./.github/actions/setup`. Forgetting `shell:` on a composite `run` step is the most common reason a new one refuses to load.

<div class="callout tip">
  <span class="ct">How to version shared workflows</span>
  Consumers pin a major tag — <code>@v1</code>. You release <code>v1.4.2</code> and move the <code>v1</code> tag to it. A fix reaches eleven repositories without eleven pull requests, and a breaking change becomes <code>v2</code> rather than a silent surprise.
</div>

## Gating and protecting deployments

Two features control *when* something is allowed to happen, and they solve different problems.

An **environment** is a named deployment target with its own configuration and protection rules. Attach one to a job and you get scoped secrets and variables, optional required reviewers, an optional wait timer, branch restrictions, and a recorded deployment history.

```yaml
jobs:
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://app.example.com
    steps:
      - run: ./deploy.sh
```

With required reviewers configured, that job pauses before its first step until a human approves it — and the secrets attached to the environment are only reachable from a job that was released. This is the correct answer to "how do I keep a production credential away from ordinary CI": put it on the environment, not the repository.

**Concurrency** stops runs colliding. It defines a named group in which only one run may be active.

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

The group key is the entire decision. Keyed on `github.ref` you get one run per branch, so a force-push cancels the superseded run — correct for CI, and often the single biggest saving available on a busy repository. Keyed on an environment name with `cancel-in-progress: false` you get one deploy at a time, queued rather than killed — correct for CD. Getting these backwards is how a release gets cancelled halfway through.

Because these are different keys, a real pipeline usually declares both: workflow-level concurrency for CI, and a separate group on the deploy job.

## Doing less work in the first place

Before optimising how fast the work runs, ask whether it needs to run at all. Path filters are the bluntest and most effective tool:

```yaml
on:
  pull_request:
    paths-ignore:
      - 'docs/**'
      - '**/*.md'
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'requirements.txt'
```

<div class="callout warn">
  <span class="ct">The path-filter trap on required checks</span>
  If a check is <b>required</b> for merging and its workflow gets skipped by a path filter, the pull request waits forever for a check that will never report. The standard remedy is a second lightweight workflow with the same job name, triggered on the excluded paths, that succeeds immediately.
</div>

## Putting it together

Here is a pipeline using everything from this level. Read it as a whole; each piece should now be recognisable.

```yaml .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    paths-ignore: ['docs/**', '**/*.md']

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

env:
  PYTHONUNBUFFERED: '1'

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    strategy:
      fail-fast: false
      matrix:
        python: ['3.11', '3.12']
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: postgres }
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready --health-interval 10s --health-retries 5
    env:
      DATABASE_URL: postgres://postgres:postgres@localhost:5432/postgres
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python }}
          cache: pip
      - run: pip install -r requirements.txt
      - run: pytest -q --junitxml=reports/junit-${{ matrix.python }}.xml
      - if: always()
        uses: actions/upload-artifact@v4
        with:
          name: reports-${{ matrix.python }}
          path: reports/
          retention-days: 7

  build:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    outputs:
      tag: ${{ steps.meta.outputs.tag }}
    steps:
      - uses: actions/checkout@v4
      - id: meta
        run: echo "tag=sha-${GITHUB_SHA::7}" >> "$GITHUB_OUTPUT"
      - run: make build
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: dist/ }

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://app.example.com
    concurrency:
      group: deploy-production      # one at a time, never cancelled
    steps:
      - uses: actions/download-artifact@v4
        with: { name: dist, path: dist/ }
      - run: ./deploy.sh --tag "${{ needs.build.outputs.tag }}"
```

## Where you are now

You can build a pipeline that is fast, that does not repeat itself, that moves data between stages deliberately, that tests against a real database and several language versions, that is shared across repositories rather than copy-pasted, and that cannot deploy two releases simultaneously.

What is still missing is the security model — who is allowed to make your workflow run, what token it holds, and what an attacker could do with a pull request. That is where the senior material starts, and it is the part that carries real consequences.
