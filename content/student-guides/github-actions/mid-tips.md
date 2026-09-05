Part two of three. At this level your pipelines work, so the problems change character. They are no longer "why won't this run" but "why is this slow", "why is this flaky", and "why does this break whenever someone adds a service". Start with the error table, then the practices underneath it.

## Common errors at this level

| Symptom | Real cause | Fix |
|---|---|---|
| Cache never seems to help | Key contains `github.sha`, `run_id`, or a date | Hash the lockfile, add `restore-keys` |
| CI uses stale dependencies | Fixed key that never invalidates | Same: the key must change when content does |
| Failure makes no sense against the diff | Poisoned or stale cache | Delete the entry, re-run, then fix the key |
| Restoring the cache breaks the build | You cached an installed tree, not downloads | Cache `~/.npm`, `~/.cache/pip`, not `node_modules` |
| First run fails, re-run passes | Service container with no health check | Add `--health-cmd` and retries |
| Connection refused after moving a job into `container:` | Hostname is now the service name, not `localhost` | Update the connection string |
| Two matrix cells overwrite each other's artifact | Same artifact name (v4 conflicts, not merges) | Suffix with the matrix value |
| Artifact uploaded but empty | Path matched nothing, reported success | `if-no-files-found: error` |
| PR waits forever for a required check | A path filter skipped it | Same-named stub workflow on excluded paths |
| Branch protection stopped working | A new matrix axis renamed the generated job | Set an explicit `name:` |
| A release was cancelled halfway through | CI-style `cancel-in-progress` on a deploy job | Separate group, `cancel-in-progress: false` |
| Every PR serialised behind every other | CD-style concurrency applied to CI | Key on `github.ref` |
| New composite action refuses to load | Missing `shell:` on a `run` step | Add `shell: bash` to every one |
| Matrix cells fail only when run together | Shared fixture, database, or API quota | Namespace per cell, or `max-parallel` |
| `needs.x.outputs.y` is empty | Output not declared at job level | Declare `outputs:` on the job, not just the step |
| Job output silently truncated | Job outputs are size-limited | Pass a reference; put the payload in an artifact |
| Cleanup step keeps a cancelled run alive | `always()` also runs on cancellation | Use `if: !cancelled()` |
| A tolerated failure did not trigger the alert | You checked `conclusion`, not `outcome` | `steps.x.outcome == 'failure'` |
| Reusable workflow fails on permissions | It receives the **caller's** token | Widen the caller, or narrow the callee |

## The practices that pay off most

<div class="cards">
  <div class="card"><div class="icon">✂️</div><h4>Cancel superseded runs</h4><p>Four lines of <code>concurrency</code> on pull requests. Usually the single biggest saving available on a busy repository.</p></div>
  <div class="card"><div class="icon">🔑</div><h4>Key caches on the lockfile</h4><p><code>hashFiles</code> on the lockfile and nothing more volatile, always with a <code>restore-keys</code> prefix.</p></div>
  <div class="card"><div class="icon">📊</div><h4>Write to the step summary</h4><p>Coverage, test counts, durations. Turns a pass/fail light into something you can reason about.</p></div>
  <div class="card"><div class="icon">🩺</div><h4>Health-check every service</h4><p>Five lines that permanently remove the "flaky on the first run" class of failure.</p></div>
  <div class="card"><div class="icon">♻️</div><h4>Share via a versioned workflow</h4><p>One organisation repository, a moving major tag, explicit secrets. Never copy-paste a pipeline.</p></div>
  <div class="card"><div class="icon">🔒</div><h4><code>persist-credentials: false</code></h4><p>On checkout, unless a step needs to push. Otherwise a usable token sits in the workspace.</p></div>
</div>

## Diagnosing a slow pipeline properly

The instinct is to reach for a bigger runner. Resist, because a faster machine does not fix a serial pipeline and turns a cost problem into a bigger one. Work in order of leverage.

<ol class="guide-steps">
  <li><b>Measure before you touch anything</b>Open the run view and toggle step timestamps. Almost every pipeline has one step that is most of the wall clock, and it is rarely the one people assume. For trends, the REST API exposes timing for every run, so pull the last few hundred and take the p95 per job.</li>
  <li><b>Stop work nobody needs</b>Cancel superseded runs with <code>concurrency</code>. Add <code>paths-ignore</code> for documentation. Put expensive suites behind an <code>if</code> or a schedule. Free, and usually the largest single win.</li>
  <li><b>Stop repeating work you already did</b>Dependency caching, and a prebuilt container image for anything with a long install. If installing dependencies is two minutes of a four-minute run, that is your whole problem.</li>
  <li><b>Only then parallelise</b>Split the suite across a matrix. A matrix is bounded by its slowest shard, so shard by measured duration rather than file count.</li>
  <li><b>Consider a larger runner last</b>After the above, if the job is CPU-bound, more cores help. Before the above, it just costs more.</li>
</ol>

```yaml
# Shard a slow suite, then merge the reports
strategy:
  fail-fast: false
  matrix:
    shard: [1, 2, 3, 4]
steps:
  - run: pytest -q --splits 4 --group ${{ matrix.shard }}
```

<div class="callout tip">
  <span class="ct">The cheapest optimisation nobody applies</span>
  <code>concurrency</code> with <code>cancel-in-progress</code> on pull requests. Every force-push currently runs a full pipeline whose result nobody will read. On an active repository this alone can cut total minutes substantially, and it is four lines.
</div>

## Cache problems and how to spot them

A cache that silently does nothing is worse than none, because you pay the archive-and-upload cost for no benefit.

**"The cache never hits."** Your key contains something that changes every run: `github.sha`, `run_id`, a date, or `hashFiles('**')` which includes your source.

**"CI is using stale dependencies."** Your key contains nothing that changes when dependencies change. The entry was written once and is immutable, so it is restored forever.

```yaml
- id: cache
  uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements*.txt') }}
    restore-keys: ${{ runner.os }}-pip-

- run: |
    echo "hash    : ${{ hashFiles('**/requirements*.txt') }}"
    echo "exact hit: ${{ steps.cache.outputs.cache-hit }}"
```

<div class="callout warn">
  <span class="ct">When a failure makes no sense against the diff</span>
  Suspect the cache before the code. The <b>Caches</b> page under Actions lets you delete an entry; delete it and re-run. If the failure disappears you had a stale or poisoned cache, and the real fix is a better key, not a manual deletion every fortnight.
</div>

Two more rules. Cache the **download** directory, not an installed tree, because restoring `node_modules` or a virtualenv brings platform-specific binaries and half-resolved state. Never restore something and then execute it without verification, because a pull request branch can write a cache that a later `main` run restores.

## Making flaky tests stop being normal

Flakiness is the most expensive problem at this level, because the usual response, re-run until green, destroys the signal CI exists to provide. Once a team habitually re-runs, a genuine regression is indistinguishable from noise.

| Cause | Symptom | Fix |
|---|---|---|
| Service container with no health check | Fails on the first run, passes on re-run | Add `--health-cmd` and retries |
| Matrix cells sharing a fixture or database | Fails only when several cells run at once | Namespace per cell, or `max-parallel: 1` |
| Tests depending on execution order | Fails when the suite is sharded | Fix isolation; do not just pin the order |
| Unpinned external services or images | Fails on a day you changed nothing | Pin image tags and API versions |
| Timing assumptions and fixed sleeps | Fails under load | Poll for a condition instead of sleeping |
| Leftover state on a self-hosted runner | Fails on one runner only | Make runners ephemeral |

<div class="callout tip">
  <span class="ct">Quarantine rather than tolerate</span>
  If you cannot fix a flaky test today, move it to a separate non-blocking job with a clear name. That keeps the main signal trustworthy and makes the debt visible, better than a retry loop that hides it forever.
</div>

## Matrix hygiene

Matrices grow. A team adds an axis, then another, and a pull request suddenly generates fifty jobs nobody reads.

```yaml
strategy:
  fail-fast: false
  max-parallel: 6
  matrix:
    python: ['3.11', '3.12']
    include:
      - python: '3.13'
        experimental: true
name: test (py${{ matrix.python }})       # stable name for branch protection
continue-on-error: ${{ matrix.experimental == true }}
```

**Keep it to two axes.** Three multiply into a wall of jobs and real cost. If you need a third dimension, ask whether it belongs in a nightly run instead.

**Use `include` for the odd one out** rather than adding an axis and excluding most of it.

**Set an explicit `name:`** on any matrix job that is a required status check, because the generated name embeds the combination, so adding an axis renames it and branch protection waits for a check that no longer exists.

**Turn `fail-fast` off while debugging, on afterwards.** During diagnosis you need every cell's result; in steady state you want a fast red signal.

**Use `max-parallel` when cells share anything**: a staging database, a rate-limited API, a licence server.

## Artifacts and outputs that stay tidy

```yaml
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: coverage-${{ matrix.python }}   # unique — v4 conflicts on duplicates
    path: |
      htmlcov/
      reports/junit.xml
    retention-days: 7
    if-no-files-found: error
```

For anything a human reads, prefer the step summary. Nobody downloads a zip to see three numbers:

```yaml
- if: always()
  run: |
    {
      echo "### Test results"
      echo "| metric | value |"
      echo "|---|---|"
      echo "| tests | $(jq '.total' reports/summary.json) |"
      echo "| coverage | $(coverage report --format=total)% |"
    } >> "$GITHUB_STEP_SUMMARY"
```

<div class="callout warn">
  <span class="ct">Job outputs are small and not secret</span>
  They are size-limited and stored in plain text in run metadata. Pass identifiers, versions, and JSON manifests, never a credential, and never a file. Remember too that the output must be declared at <b>job</b> level, not only written to <code>$GITHUB_OUTPUT</code> in a step.
</div>

## Service containers that do not flake

```yaml
services:
  postgres:
    image: postgres:16                     # pin the major version
    env: { POSTGRES_PASSWORD: postgres }
    ports: ['5432:5432']
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

Without the health check the container counts as started the instant Docker returns, and your first test connects before Postgres accepts connections. That is the entire explanation for "fails on the first run, passes on the re-run", and five lines removes it permanently.

Two details that cost an afternoon: the hostname is `localhost` when steps run on the runner but the **service name** when the job runs inside a `container:`, so moving a job into a container breaks every connection string with no warning. If you need four or five containers, stop using `services` and start your own Compose stack in a `run` step.

## Reuse without building a maze

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Do</h4>
    <ul>
      <li>One organisation <code>.github</code> repository owns the standards</li>
      <li>CODEOWNERS on the workflow folder</li>
      <li>Consumers pin a major tag; you move it on release</li>
      <li>Canary one low-risk repository on the exact patch first</li>
      <li>Every input has a type, default, and description</li>
      <li>Pass secrets explicitly</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Do not</h4>
    <ul>
      <li>Let each team fork "just for one change"</li>
      <li>Use <code>secrets: inherit</code> as the default</li>
      <li>Change behaviour inside an existing major tag</li>
      <li>Nest reusable workflows several layers deep</li>
      <li>Remove or rename an input without a major bump</li>
      <li>Point consumers at <code>@main</code></li>
    </ul>
  </div>
</div>

Treat the callee as a public API, because it is. Removing an input is a breaking change even if only one repository used it, and the failure lands on somebody else's pull request rather than yours.

Also remember `shell:` is mandatory on every `run` step inside a composite action. It is the most common reason a new one refuses to load, and the error does not say so.

## Concurrency mistakes

```yaml
# CI: one run per branch, cancel the superseded one
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

# CD: one deploy at a time, queue rather than cancel
concurrency:
  group: deploy-production
  cancel-in-progress: false
```

Applying the CI pattern to a deploy job kills a release halfway through, at the worst possible time. Applying the CD pattern to CI serialises every pull request behind every other. Because they need different keys, a real pipeline declares workflow-level concurrency for CI and a separate group on the deploy job.

Concurrency is a guard, not a correctness property. If two deploys running together would corrupt something, make the deploy idempotent as well.

## The path-filter trap

This produces a pull request that can never merge, with no visible error. If a status check is **required** and its workflow is skipped by a `paths` filter, the PR waits forever for a report that never comes.

```yaml .github/workflows/ci-skip.yml
name: CI
on:
  pull_request:
    paths: ['docs/**', '**/*.md']
jobs:
  test:                       # same job name the required check expects
    runs-on: ubuntu-latest
    steps:
      - run: echo "No code changed; nothing to test."
```

## Debugging a workflow you did not write

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>1</span><strong>Read the trigger before the steps</strong><small>Half of "it did not run" is a branch filter, a path filter, or a fork pull request.</small></div>
  <div class="guide-timeline-item"><span>2</span><strong>Dump the context</strong><small><code>run: echo '${{ toJSON(github) }}'</code> answers most "why did the condition not match" questions in one run.</small></div>
  <div class="guide-timeline-item"><span>3</span><strong>Re-run with debug logging</strong><small>The <b>Re-run</b> menu has a checkbox. Re-run only the failed job for a two-minute answer.</small></div>
  <div class="guide-timeline-item"><span>4</span><strong>Compare against the last green run</strong><small>The difference is often environmental: runner image version, an action release, a cache hit that became a miss.</small></div>
  <div class="guide-timeline-item"><span>5</span><strong>Bypass the cache</strong><small>Delete the entry or change the key. Stale caches produce failures that make no sense against the code.</small></div>
  <div class="guide-timeline-item"><span>6</span><strong>Bisect in a scratch workflow</strong><small>Copy the failing job into its own file with <code>workflow_dispatch</code> and delete half the steps at a time.</small></div>
</div>

```yaml
# Worth keeping permanently: diagnostics that only run after a failure
- name: Diagnostics
  if: failure()
  run: |
    echo "runner image : $ImageVersion"
    echo "ref / sha    : $GITHUB_REF / $GITHUB_SHA"
    echo "cache hit    : ${{ steps.cache.outputs.cache-hit }}"
    df -h && free -m
```

## Habits that compound

**Put `timeout-minutes` on every job.** The default is six hours; one hung job consumes your allowance.

**Add a `permissions` floor to every workflow.** One line, `permissions: { contents: read }`, removes the token's ability to push, tag, or comment, and you widen it per job where needed. Declaring any scope zeroes the rest, which is the whole mechanism.

**Add `persist-credentials: false` to checkout** unless a later step needs to push. Otherwise a usable token sits in `.git/config` for every subsequent step, including third-party ones.

**Pin third-party actions and keep the pins fresh.** A tag can be moved under you, so pin anything you do not own to a SHA, and enable Dependabot for `github-actions`, because a pinned-and-forgotten action is an unpatched one. Neither control works alone.

**Pass event data through `env`, never into a shell.** A pull request title containing shell metacharacters becomes a command otherwise. This matters more at senior level, but the habit belongs here.

**Write metrics to the step summary.** Coverage, test counts, durations, image size. One line, and your pipeline becomes something you can reason about.

**Review workflow diffs as carefully as code.** An unreviewed pipeline change is how a two-minute job becomes a twenty-minute one over six months.

```yaml
permissions:
  contents: read                      # least-privilege floor

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false  # no push token left in the workspace
      - uses: actions/setup-node@v4   # official action, major tag is fine
        with: { node-version: '20', cache: npm }
      - uses: some-vendor/scan@3f8a1c9d5b2e7f04a6c8d1e3b5a7c9e1f3d5b7a9  # v2.1.0
      - env:
          TITLE: ${{ github.event.pull_request.title }}
        run: ./scripts/check-title.sh
```
