Part two of three. A cumulative review of **Beginner and Mid-level material**, organised by topic rather than by level, in about thirty-five minutes. Fast review first, common questions at the end.

## Foundations

<div class="flow">
  <div class="node">EVENT<small>push / PR / cron</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">WORKFLOW<small>one YAML file</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">JOB<small>one fresh machine</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">STEP<small>run or uses</small></div>
</div>

> GitHub Actions is GitHub's built-in CI/CD platform. A YAML file in `.github/workflows/` declares triggers and jobs; GitHub runs each job on a machine it creates and destroys. The pipeline lives in the repository, so it is versioned and reviewed like code.

**One workflow, many jobs, each job many steps, each job its own machine.** Mandatory: `on`, `jobs`, and per job `runs-on` and `steps`.

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Steps</h4>
    <ul>
      <li>One machine, written order</li>
      <li>Failure stops the rest of the job</li>
      <li>Share via files, <code>$GITHUB_ENV</code>, step outputs</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Jobs</h4>
    <ul>
      <li>Own machine each, parallel unless <code>needs</code></li>
      <li>No shared filesystem</li>
      <li>Share files via artifacts, strings via job outputs</li>
    </ul>
  </div>
</div>

| Trap | Cause | Fix |
|---|---|---|
| "No such file" for a repo file | Runner starts empty | `actions/checkout@v4` |
| Deploy cannot find `dist/` | Different machine | Artifact upload + download |
| `cd` has no effect next step | New shell per step | `working-directory:` |
| Variable empty next step | `export` dies with the step | `>> "$GITHUB_ENV"` |
| `if` never matches on main | `github.ref` is `refs/heads/main` | Compare the full ref |
| `python-version: 3.10` → 3.1 | YAML numeric | Quote versions |

## Triggers, filters, and chaining

| Trigger | Fires when |
|---|---|
| `push` / `pull_request` | Commits land / a PR opens, updates, reopens |
| `workflow_dispatch` | A human clicks **Run workflow**; supports typed `inputs` |
| `schedule` | Cron matches: **UTC**, default branch only, **queued** not punctual |
| `release`, `issues`, `issue_comment` | Release published, issue activity |
| `workflow_run` | Another workflow finished: runs in base-repo context |
| `repository_dispatch` | An external API call, payload in `client_payload` |

```yaml
on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
    paths-ignore: ['docs/**', '**/*.md']
  workflow_run:
    workflows: ['CI']
    types: [completed]
```

<div class="callout warn">
  <span class="ct">The path-filter trap</span>
  A <b>required</b> status check whose workflow is skipped by a <code>paths</code> filter leaves the pull request waiting forever for a report that never comes. Remedy: a second lightweight workflow with the <b>same job name</b> on the excluded paths that succeeds immediately.
</div>

## Expressions: the full reference

| Context | Holds |
|---|---|
| `github` | `ref`, `ref_name`, `sha`, `actor`, `event_name`, `repository`, `run_id`, `run_number`, `run_attempt`, `event.*` |
| `runner` | `os`, `arch`, `temp`, `tool_cache` |
| `env` / `vars` / `secrets` | Variables and configuration |
| `needs` | `needs.<job>.outputs.*`, `needs.<job>.result` |
| `steps` | `steps.<id>.outputs.*`, `.outcome`, `.conclusion` |
| `matrix` / `strategy` | Current combination; `job-index`, `job-total` |
| `inputs` | `workflow_dispatch` and `workflow_call` inputs |
| `job` | `job.status`, `job.services.*` |

Functions: `contains`, `startsWith`, `endsWith`, `format`, `join`, `toJSON`, `fromJSON`, `hashFiles`. Status: `success()`, `failure()`, `cancelled()`, `always()`.

```yaml
if: contains(fromJSON('["main","develop"]'), github.ref_name)
if: startsWith(github.ref, 'refs/tags/v') && github.actor != 'dependabot[bot]'
- run: echo "${{ format('{0}-py{1}', runner.os, matrix.python) }}"
key: ${{ runner.os }}-${{ hashFiles('**/requirements*.txt', '**/pyproject.toml') }}
```

<div class="callout tip">
  <span class="ct">Two precedence rules</span>
  Inside <code>if:</code> the <code>${{ }}</code> wrapper is <b>optional</b>, and mixing styles in one condition causes confusing partial evaluation. <code>&amp;&amp;</code>/<code>||</code> return <b>operands, not booleans</b>, which is why <code>${{ inputs.tag || github.sha }}</code> is the default-value idiom.
</div>

### `outcome` versus `conclusion`

```yaml
- id: flaky
  continue-on-error: true
  run: ./might-fail.sh
- if: steps.flaky.outcome == 'failure'    # the REAL result
  run: echo "failed, but we chose to continue"
```

`outcome` is what the step did; `conclusion` is the result after `continue-on-error`. A tolerated failure is `failure` / `success`. At job level the equivalent is `needs.<job>.result`: `success`, `failure`, `cancelled`, or `skipped`.

<div class="callout warn">
  <span class="ct"><code>always()</code> is stronger than expected</span>
  It runs even when the workflow is <b>cancelled</b>, so an <code>always()</code> step can keep alive a run someone is trying to stop. For cleanup that should respect cancellation, use <code>if: !cancelled()</code>.
</div>

## The four special files

```yaml
- id: meta
  run: |
    echo "IMAGE_TAG=sha-${GITHUB_SHA::7}" >> "$GITHUB_ENV"        # later steps
    echo "artifact=dist/app.tar.gz"       >> "$GITHUB_OUTPUT"      # step output
    echo "$HOME/.local/bin"               >> "$GITHUB_PATH"        # PATH
    echo "### Build complete"             >> "$GITHUB_STEP_SUMMARY" # run page
```

Multi-line values need a delimiter:

```yaml
- run: |
    { echo 'NOTES<<EOF'; cat CHANGELOG.md; echo 'EOF'; } >> "$GITHUB_ENV"
```

A `$GITHUB_ENV` value is not readable in the step that wrote it, and **none of the four cross a job boundary.**

GitHub also injects defaults: `GITHUB_REPOSITORY`, `GITHUB_REF`, `GITHUB_REF_NAME`, `GITHUB_SHA`, `GITHUB_WORKSPACE`, `GITHUB_RUN_ID`, `GITHUB_EVENT_PATH`, `RUNNER_OS`, `RUNNER_TEMP`.

## Secrets versus variables

| | Secrets `${{ secrets.X }}` | Variables `${{ vars.X }}` |
|---|---|---|
| Storage | Encrypted, write-only in UI | Plain text, readable |
| In logs | Masked, best effort | Printed normally |
| Fork pull requests | **Not** provided | Provided |
| For | Tokens, keys, passwords | Regions, URLs, image names, flags |

Both exist at **three levels**, organisation → repository → environment, most specific winning. `GITHUB_TOKEN` is automatic, per job, repository-scoped, and expires with the job.

<div class="callout warn">
  <span class="ct">Masking is a safety net, not a mechanism</span>
  GitHub redacts <b>known</b> values. It cannot redact one you transformed: base64-encode a secret, print it, and the redaction fails. Never print secrets; pass them via <code>env</code> so they never reach a command line.
</div>

## Caching

```yaml
- uses: actions/cache@v4
  id: deps
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements*.txt') }}
    restore-keys: ${{ runner.os }}-pip-
```

| Piece | Behaviour |
|---|---|
| `key` | **Exact** match; a hit restores and **skips the save** |
| `restore-keys` | Ordered **prefixes** tried on a miss: a partial hit |
| Immutability | Never overwritten, so the key must change when content should |
| Scope | Follows the branch graph; unrelated branches do not share |
| `cache-hit` | `'true'` **only** on an exact match |

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Keys that work</h4>
    <ul>
      <li><code>${{ runner.os }}-pip-${{ hashFiles('**/requirements*.txt') }}</code></li>
      <li>Add the tool version when it changes the layout</li>
      <li>Always pair with a <code>restore-keys</code> prefix</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Keys that waste money</h4>
    <ul>
      <li><code>github.sha</code> / <code>run_id</code>: misses <b>every</b> run</li>
      <li>A fixed string: never invalidates, ships <b>stale</b> deps</li>
      <li><code>hashFiles('**')</code>: any source edit busts it</li>
    </ul>
  </div>
</div>

Cache the **download** directory (`~/.npm`, `~/.cache/pip`, `~/.m2`), never an installed tree, because restoring `node_modules` or a virtualenv brings platform-specific binaries and half-resolved state.

## Artifacts

```yaml
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: coverage-${{ matrix.python }}   # unique per matrix cell
    path: reports/
    retention-days: 7                     # override the 90-day default
    if-no-files-found: error              # fail loudly, not silently empty
```

In v4, two uploads with the **same name conflict** rather than merging. Downloads can also reach across runs with `run-id` plus a token.

*A cache is an optimisation you must be able to lose; an artifact is data you cannot.*

## The job dependency graph

```yaml
jobs:
  setup:
    outputs:
      targets: ${{ steps.v.outputs.targets }}
    steps:
      - id: v
        run: echo 'targets=["api","worker"]' >> "$GITHUB_OUTPUT"

  build:                                  # fan out
    needs: setup
    strategy:
      matrix:
        target: ${{ fromJSON(needs.setup.outputs.targets) }}

  report:                                 # fan in, whatever happened
    needs: [setup, build]
    if: always()
    steps:
      - run: echo "build: ${{ needs.build.result }}"
```

A job that `needs` a matrix job sees a **single aggregated result**. Job outputs are size-limited and **not secret**, so pass identifiers and JSON, never credentials or files.

## Matrix in depth

```yaml
strategy:
  fail-fast: false
  max-parallel: 4
  matrix:
    os: [ubuntu-latest, macos-latest]
    python: ['3.11', '3.12']
    include: [{ os: ubuntu-latest, python: '3.13', experimental: true }]
    exclude: [{ os: macos-latest, python: '3.11' }]
runs-on: ${{ matrix.os }}
continue-on-error: ${{ matrix.experimental == true }}
name: test (${{ matrix.os }}, py${{ matrix.python }})
```

Axes multiply, then `exclude` removes and `include` adds (or attaches extra keys to an existing combination). `fail-fast: true` is the default. Ceiling is 256 jobs per run.

<div class="callout warn">
  <span class="ct">Adding an axis renames a required check</span>
  The generated job name embeds the combination, so branch protection requiring <code>test (3.11)</code> waits forever once the name becomes <code>test (ubuntu-latest, 3.11)</code>. Set an explicit <code>name:</code> on any matrix job used as a required check.
</div>

## Service containers and container jobs

```yaml
services:
  postgres:
    image: postgres:16
    env: { POSTGRES_PASSWORD: postgres }
    ports: ['5432:5432']
    options: >-
      --health-cmd pg_isready --health-interval 10s --health-retries 5
```

<div class="callout warn">
  <span class="ct">The health check is the whole answer</span>
  Without it the container counts as started the instant Docker returns, so your first test connects before Postgres accepts connections. That is the entire explanation for <b>"fails on the first run, passes on the re-run"</b>.
</div>

Hostname is `localhost` when steps run on the runner, but the **service name** once the job itself runs inside a `container:`. Moving a job into a container silently breaks every `localhost` connection string.

## Reuse

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Reusable workflow: <em>job</em> level</h4>
    <ul>
      <li><code>on: workflow_call</code> with typed <code>inputs</code>, <code>secrets</code>, <code>outputs</code></li>
      <li>Brings its own jobs, runners, <code>permissions</code></li>
      <li>For a whole pipeline stage</li>
      <li>Gets the caller's token; cannot exceed it</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Composite action: <em>step</em> level</h4>
    <ul>
      <li>Runs in the caller's job on the caller's runner</li>
      <li>No jobs, no matrices, no own runner</li>
      <li>For a repeated step sequence</li>
      <li><code>shell:</code> mandatory on every <code>run</code></li>
    </ul>
  </div>
</div>

```yaml
jobs:
  ci:
    uses: my-org/.github/.github/workflows/reusable-ci.yml@v1
    with:
      python-version: '3.12'
    secrets:
      CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}   # explicit beats `inherit`
```

The doubled path is correct: the first `.github` is the repository, the second the folder. Consumers pin a major tag; you move it on release.

## Environments, permissions, and concurrency

| Feature | Gives you |
|---|---|
| `environment: production` | Scoped secrets and variables, required reviewers, wait timers, branch restrictions, deployment history |
| `permissions` | The token's scope: declaring **any** scope sets every undeclared one to `none` |
| `concurrency` | One active run per group, optionally cancelling the older |
| `needs` | Ordering plus outputs |
| `timeout-minutes` | A ceiling below the six-hour default |

```yaml
permissions:
  contents: read              # read-only floor for the whole workflow

jobs:
  release:
    permissions:
      contents: write         # widened for exactly one job
      packages: write
    runs-on: ubuntu-latest
```

Worth knowing now, because it explains a class of confusing failure: a **reusable workflow receives the caller's token**, so its `permissions` can never exceed the caller's. A callee that declares `packages: write` fails when the caller only granted `contents: read`. Senior covers the full least-privilege model and OIDC.

```yaml
# CI: one run per branch, cancel superseded
concurrency: { group: '${{ github.workflow }}-${{ github.ref }}', cancel-in-progress: true }

# CD: one deploy at a time, QUEUE rather than cancel
concurrency: { group: deploy-production, cancel-in-progress: false }
```

<div class="callout warn">
  <span class="ct">The group key is the whole decision</span>
  CI cancellation applied to a deploy kills a release halfway through. CD queuing applied to CI serialises every PR behind every other. A real pipeline declares both, at different scopes.
</div>

## Common interview questions

<ol class="guide-steps">
  <li><b>CI takes 25 minutes and people have stopped waiting.</b>Measure first from the run timings. Then in order of leverage: <em>do less work</em> with concurrency cancellation, path filters, and conditions; <em>reuse work</em> with dependency caching and prebuilt images; <em>parallelise</em> by sharding the suite across a matrix, by measured duration rather than file count. Move slow end-to-end tests to a nightly schedule with a smoke subset on the PR. Reaching for a bigger runner first is the answer of someone who has not measured.</li>
  <li><b>The build job makes a binary and the deploy job cannot find it.</b>Separate jobs, separate machines. Upload an artifact and download it, or merge the jobs if splitting bought nothing.</li>
  <li><b>The cache never helps. Debug it.</b>Print the key and <code>cache-hit</code>. A key containing <code>github.sha</code> misses every run; a fixed key never invalidates and ships stale dependencies. Correct keys hash the lockfile with <code>restore-keys</code> as a prefix fallback. Also check you are caching the download directory, not an installed tree.</li>
  <li><b>Same twelve-step pipeline in eleven repositories.</b>A reusable workflow in the organisation <code>.github</code> repository, versioned with a moving major tag, driven by typed <code>inputs</code>. Composite actions for the smaller repeated fragments inside it. Pass secrets explicitly rather than with <code>inherit</code>.</li>
  <li><b>Tests pass locally, fail in CI on the first run only.</b>A service container with no health check, or a dependency that happens to exist on your laptop. Add the health check and pin the setup versions.</li>
  <li><b>A deploy must wait for a human.</b>An environment with required reviewers: the job pauses before its first step and the approval is recorded. Put the production credential on the <b>environment</b> rather than the repository, so ordinary CI cannot read it at all.</li>
  <li><b>Test Python 3.10–3.13, but 3.13 may fail.</b>Matrix with <code>fail-fast: false</code>, an <code>include</code> entry carrying <code>experimental: true</code>, and <code>continue-on-error: ${{ matrix.experimental == true }}</code>.</li>
  <li><b>Two merges deployed at once and one overwrote the other.</b>A <code>concurrency</code> group on the deploy job keyed on the environment with <code>cancel-in-progress: false</code>. Then make the deploy idempotent, because concurrency is a guard, not a correctness property.</li>
  <li><b>Explain <code>outcome</code> versus <code>conclusion</code>.</b><code>outcome</code> is the raw step result; <code>conclusion</code> is after <code>continue-on-error</code>. A tolerated failure is <code>failure</code>/<code>success</code> respectively, so use <code>outcome</code> to react to the real result.</li>
  <li><b>Reusable workflow or composite action?</b>Reusable workflow for a whole stage needing its own jobs, runners, or permissions. Composite action for a repeated step sequence inside an existing job. If you need a matrix or a different runner, it must be a workflow.</li>
  <li><b>A required check never reports and the PR cannot merge.</b>A path filter skipped its workflow. Add a same-named lightweight workflow on the excluded paths that succeeds immediately, or make the check not required.</li>
  <li><b>How do you build a matrix from something computed at runtime?</b>An earlier job emits JSON to <code>$GITHUB_OUTPUT</code>; the matrix reads it with <code>fromJSON(needs.discover.outputs.list)</code>. The monorepo pattern: diff against the base to find changed services, then build only those.</li>
  <li><b>How do you run a job against a real database?</b><code>services:</code> with a health check, connecting on <code>localhost</code>, or the service name if the job runs in a container. Beyond two or three containers, bring your own Compose file started in a <code>run</code> step.</li>
  <li><b>How would you chain two workflows?</b><code>workflow_run</code> on the second, gated by <code>github.event.workflow_run.conclusion == 'success'</code>, downloading the first run's artifacts with <code>run-id</code>. Note this runs in the base-repository context with a writable token, which matters for security.</li>
  <li><b>What does <code>always()</code> do, and when is it wrong?</b>It runs even when the workflow is cancelled, so an <code>always()</code> step can keep alive a run someone is stopping. For cleanup that should respect cancellation, use <code>!cancelled()</code>.</li>
  <li><b>How do you report results without making people download a zip?</b>Write Markdown to <code>$GITHUB_STEP_SUMMARY</code>. It renders on the run page and costs one line.</li>
</ol>

## Final self-test

- Name the four special files and what each does.
- Give both ways a cache key can be wrong, and what to cache instead of an installed tree.
- Write a concurrency block for CI and one for CD, and justify the difference.
- Choose between a reusable workflow and a composite action.
- Explain `outcome` versus `conclusion`, and `needs.<job>.result`.
- Say what an environment gives you that a repository secret does not.
- Describe the required-check trap from path filters and its remedy.
- Explain why a service container needs a health check.
- Say what changes about service hostnames when a job runs in a container.
