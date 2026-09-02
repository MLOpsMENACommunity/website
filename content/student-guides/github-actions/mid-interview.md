One continuous review of everything a mid-level candidate is expected to know — foundations included, organised by topic rather than by level. Roughly thirty minutes. Common questions are at the end.

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

> GitHub Actions is GitHub's built-in CI/CD platform. A YAML file in `.github/workflows/` declares triggers and jobs; GitHub runs each job on a machine it creates and destroys. The pipeline lives in the repository, so it is versioned and reviewed like code.

**One workflow, many jobs, each job many steps, each job its own machine.** Mandatory keys: `on`, `jobs`, and per job `runs-on` and `steps`.

| Term | One line |
|---|---|
| **Workflow / Event / Job / Step** | File · trigger · machine · command |
| **Action** | Packaged reusable step, `owner/repo@ref` |
| **Runner** | GitHub-hosted (disposable) or self-hosted (yours) |
| **Artifact** | Files preserved off the runner |
| **Cache** | Dependencies reused by later runs |
| **Context** | Read-only run data for `${{ }}` |

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

## Triggers and filters

| Trigger | Fires when |
|---|---|
| `push` / `pull_request` | Commits land / a PR opens or updates |
| `workflow_dispatch` | A human clicks **Run workflow** |
| `schedule` | Cron matches — **UTC**, default branch only |
| `release`, `issues`, `workflow_run` | Release published, issue activity, another workflow finished |

```yaml
on:
  push:
    branches: [main]
  pull_request:
    paths-ignore: ['docs/**', '**/*.md']
```

<div class="callout warn">
  <span class="ct">The path-filter trap</span>
  A <b>required</b> status check whose workflow is skipped by a <code>paths</code> filter leaves the pull request waiting forever for a check that will never report. Remedy: a second lightweight workflow with the <b>same job name</b> on the excluded paths that succeeds immediately.
</div>

## Expressions, contexts, functions

| Context | Holds |
|---|---|
| `github` | `ref`, `ref_name`, `sha`, `actor`, `event_name`, `repository`, `run_id`, `event.*` |
| `runner` | `os`, `arch`, `temp` |
| `env` / `vars` / `secrets` | Variables and configuration |
| `needs` | `needs.<job>.outputs.*`, `needs.<job>.result` |
| `steps` | `steps.<id>.outputs.*`, `.outcome`, `.conclusion` |
| `matrix` | The current combination |

Functions: `contains`, `startsWith`, `endsWith`, `format`, `join`, `toJSON`, `fromJSON`, `hashFiles`. Status checks: `success()`, `failure()`, `cancelled()`, `always()`.

```yaml
- if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  run: ./deploy.sh

- if: failure()                       # only after something broke
  run: ./notify.sh
```

Inside `if:` the braces are optional; everywhere else required. `github.ref` is the **full** ref.

**`outcome` versus `conclusion`:** `outcome` is what the step did; `conclusion` is the result after `continue-on-error` is applied. A tolerated failure is `outcome == 'failure'`, `conclusion == 'success'`.

<div class="callout tip">
  <span class="ct">The debugging one-liner</span>
  <code>- run: echo '${{ toJSON(github) }}'</code> prints the whole event payload and answers most "why didn't my condition match" questions in one run.
</div>

## Moving values around

<div class="flow">
  <div class="node">$GITHUB_ENV<small>later steps, same job</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">$GITHUB_OUTPUT<small>step outputs</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">job outputs<small>strings across jobs</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">artifacts<small>files across jobs</small></div>
</div>

```yaml
- id: meta
  run: |
    echo "TAG=sha-$(git rev-parse --short HEAD)" >> "$GITHUB_ENV"
    echo "path=dist/app.tar.gz"                  >> "$GITHUB_OUTPUT"
    echo "| tests | 412 |"                       >> "$GITHUB_STEP_SUMMARY"

- run: echo "$TAG"                               # from GITHUB_ENV
- run: echo "${{ steps.meta.outputs.path }}"     # from GITHUB_OUTPUT
```

- `$GITHUB_ENV` → environment variables for **later steps in this job**. Not readable in the step that wrote it.
- `$GITHUB_OUTPUT` → step outputs, addressed by step `id`.
- `$GITHUB_STEP_SUMMARY` → Markdown rendered on the run page.
- `$GITHUB_PATH` → prepends to `PATH`.
- None of them cross a job boundary.

**Across jobs: outputs for strings, artifacts for files.**

```yaml
jobs:
  build:
    outputs:
      tag: ${{ steps.meta.outputs.tag }}
    steps:
      - id: meta
        run: echo "tag=sha-${GITHUB_SHA::7}" >> "$GITHUB_OUTPUT"
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: dist/ }

  deploy:
    needs: build
    steps:
      - uses: actions/download-artifact@v4
        with: { name: dist, path: dist/ }
      - run: ./deploy.sh --tag "${{ needs.build.outputs.tag }}"
```

Job outputs are not secret and are size-limited — never route a credential through one.

## Secrets and variables

| | Secrets `${{ secrets.X }}` | Variables `${{ vars.X }}` |
|---|---|---|
| Storage | Encrypted, write-only in the UI | Plain text, readable |
| In logs | Masked, best effort | Printed normally |
| Fork pull requests | **Not** provided | Provided |
| For | Tokens, keys, passwords | Regions, URLs, image names, flags |

Three levels — organisation, repository, environment — most specific wins. `GITHUB_TOKEN` is automatic, per job, repository-scoped, and expires with the job.

```yaml
# Pass secrets as data, never interpolated into a command line
- env:
    TOKEN: ${{ secrets.API_TOKEN }}
  run: ./publish.sh          # reads "$TOKEN"
```

## Caching

```yaml
- uses: actions/cache@v4
  id: deps
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements*.txt') }}
    restore-keys: ${{ runner.os }}-pip-
```

| Piece | Meaning |
|---|---|
| `key` | Exact match. A hit restores and **skips the save** |
| `restore-keys` | Prefixes tried on a miss — a partial hit |
| Immutability | An entry is never overwritten, so the key must change when content should |
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
      <li><code>github.sha</code> or <code>run_id</code> — misses every run</li>
      <li>A fixed string — never invalidates, ships stale deps</li>
      <li><code>hashFiles('**')</code> — any source edit busts it</li>
    </ul>
  </div>
</div>

Prefer the `cache:` input on `setup-node` / `setup-python` / `setup-java` / `setup-go` over `actions/cache` where it exists.

## Artifacts

*A cache is an optimisation you must be able to lose; an artifact is data you cannot.*

```yaml
- uses: actions/upload-artifact@v4
  if: always()                        # the failure case is the point
  with:
    name: coverage-${{ matrix.python }}   # unique per matrix cell
    path: reports/
    retention-days: 7                 # override the 90-day default
    if-no-files-found: error          # fail loudly, not silently empty
```

## Matrix

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
```

| Question | Answer |
|---|---|
| How many jobs? | Axes multiply (2 × 2 = 4), then `exclude` removes and `include` adds |
| `fail-fast`? | `true` by default — cancels siblings on first failure. Turn off while diagnosing |
| `max-parallel`? | Use when cells share a database, API quota, or licence |
| Ceiling? | 256 jobs per workflow run |
| Required checks? | The generated name embeds the combination, so adding an axis renames it and breaks branch protection |
| Dynamic? | `matrix: { target: ${{ fromJSON(needs.discover.outputs.list) }} }` |

## Service containers

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
  Without it the container counts as started the instant Docker returns, so your first test connects before the database is accepting connections. That is the entire explanation for <b>"fails on the first run, passes on the re-run"</b>.
</div>

Hostname is `localhost` from the runner, the **service name** from inside a `container:`. Pin the major version. More than two or three containers means bring your own Compose file.

## Reuse

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Reusable workflow — <em>job</em> level</h4>
    <ul>
      <li><code>on: workflow_call</code> with <code>inputs</code>, <code>secrets</code>, <code>outputs</code></li>
      <li>Brings its own jobs, runners, <code>permissions</code></li>
      <li>For a whole pipeline stage</li>
      <li>Gets the caller's token; cannot exceed it</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Composite action — <em>step</em> level</h4>
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

The doubled path is correct: the first `.github` is the repository, the second is the folder. Consumers pin a major tag (`@v1`); you move it on each release.

## Environments and concurrency

| Feature | Gives you |
|---|---|
| `environment: production` | Scoped secrets and variables, required reviewers, wait timers, branch restrictions, deployment history |
| `concurrency` | One active run per group, optionally cancelling the older |
| `needs` | Ordering plus outputs |
| `timeout-minutes` | A ceiling below the six-hour default |

```yaml
# CI: one run per branch, cancel superseded
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

# CD: one deploy at a time, QUEUE rather than cancel
concurrency:
  group: deploy-production
  cancel-in-progress: false
```

<div class="callout warn">
  <span class="ct">The group key is the whole decision</span>
  CI cancellation applied to a deploy job kills a release halfway through. CD queuing applied to CI serialises every pull request behind every other one. A real pipeline declares both, at different scopes.
</div>

## The traps, in one table

| Symptom | Cause | Fix |
|---|---|---|
| "No such file" for a repo file | No checkout | `actions/checkout@v4` |
| Deploy cannot find `dist/` | Different machine | Artifact upload + download |
| `cd` has no effect next step | New shell per step | `working-directory:` |
| Variable empty next step | `export` dies with the step | `>> "$GITHUB_ENV"` |
| `python-version: 3.10` installs 3.1 | YAML reads a number | Quote it |
| Condition never matches | `github.ref` is `refs/heads/main` | Compare the full ref |
| Cache never helps | Volatile or fixed key | Hash the lockfile |
| First run fails, re-run passes | No service health check | Add `--health-cmd` |
| PR waits forever for a check | Path filter skipped a required check | Same-named stub workflow |

## Common interview questions

<ol class="guide-steps">
  <li><b>CI takes 25 minutes and people have stopped waiting. What do you do?</b>Measure first from the run timings. Then in order of leverage: <em>do less work</em> — concurrency cancellation, path filters, conditions; <em>reuse work</em> — dependency caching, prebuilt images; <em>parallelise</em> — shard the suite across a matrix, by measured duration rather than file count. Move slow end-to-end tests to a nightly schedule with a smoke subset on the PR. Reaching for a bigger runner first is the answer of someone who has not measured.</li>
  <li><b>The build job makes a binary and the deploy job cannot find it.</b>Separate jobs, separate machines. Upload an artifact and download it — or merge the jobs if splitting bought nothing.</li>
  <li><b>The cache never seems to help. How do you debug it?</b>Print the key and <code>cache-hit</code>. A key containing <code>github.sha</code> misses every run; a fixed key never invalidates and ships stale dependencies. Correct keys hash the lockfile, with <code>restore-keys</code> as a prefix fallback.</li>
  <li><b>Same twelve-step pipeline needed in eleven repositories.</b>A reusable workflow in the organisation <code>.github</code> repository, versioned with a moving major tag, driven by typed <code>inputs</code>. Composite actions for smaller repeated fragments inside it.</li>
  <li><b>Tests pass locally, fail in CI on the first run only.</b>A service container with no health check, or a dependency that happens to exist on your laptop. Add the health check, pin the setup versions.</li>
  <li><b>A deploy must wait for a human.</b>An environment with required reviewers. The job pauses before its first step, and the approval is recorded against the deployment. Put the production secret on the environment rather than the repository, so ordinary CI cannot reach it.</li>
  <li><b>Test Python 3.10 to 3.13, but 3.13 may fail.</b>Matrix with <code>fail-fast: false</code>, an <code>include</code> entry carrying <code>experimental: true</code>, and <code>continue-on-error: ${{ matrix.experimental == true }}</code>.</li>
  <li><b>Two merges deployed at once and one overwrote the other.</b>A <code>concurrency</code> group on the deploy job keyed on the environment with <code>cancel-in-progress: false</code>. Then make the deploy idempotent — concurrency is a guard, not a correctness property.</li>
  <li><b>Explain <code>outcome</code> versus <code>conclusion</code>.</b><code>outcome</code> is the raw step result; <code>conclusion</code> is after <code>continue-on-error</code>. A tolerated failure is <code>failure</code> / <code>success</code> respectively — use <code>outcome</code> when you want to react to the real result.</li>
  <li><b>Reusable workflow or composite action?</b>Reusable workflow for a whole stage that needs its own jobs, runners, or permissions. Composite action for a repeated sequence of steps inside an existing job. If you need a matrix or a different runner, it must be a workflow.</li>
  <li><b>How do you stop a workflow running on documentation-only changes?</b><code>paths-ignore</code> on the trigger — while remembering that a skipped required check blocks the PR, so add a same-named stub workflow for the excluded paths.</li>
  <li><b>How would you pass a version string from a build job to a deploy job?</b>A job <code>output</code> fed from <code>$GITHUB_OUTPUT</code>, read as <code>needs.build.outputs.tag</code>. Files would need an artifact instead.</li>
</ol>

## Final self-test

- Name the three special files and what each does.
- Give both ways a cache key can be wrong.
- Write a concurrency block for CI, then one for CD, and justify the difference.
- Choose between a reusable workflow and a composite action.
- Explain what an environment gives you that a repository secret does not.
- Describe the required-check trap created by path filters.
