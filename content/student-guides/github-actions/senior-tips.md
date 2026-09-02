The problems at this level are rarely about syntax. They are about a pipeline sixty people depend on, a credential nobody remembers creating, and a failure that started at 09:00 everywhere at once. Start with the error table, then the practices and playbooks underneath it.

## Common errors at this level

These are the ones that cause incidents rather than red builds.

| Symptom | Real cause | Fix |
|---|---|---|
| A fork PR could read your secrets | `pull_request_target` checking out `head.sha` | Never check out the head ref there; split across `pull_request` + `workflow_run` |
| A PR title executed a command | `${{ github.event.* }}` interpolated into a `run` body | Pass event data through `env` and quote the variable |
| A compromised step pushed to `main` | No `permissions` block, so the token was write-capable | `contents: read` floor, widened per job |
| Any branch of any repo can assume the deploy role | OIDC `sub` claim wildcarded to `repo:org/*:*` | Constrain to a ref or, better, an environment |
| An action changed under you overnight | Referenced by a mutable tag | SHA-pin, plus Dependabot so pins stay fresh |
| Pinned actions are years out of date | Pinned but never updated | Dependabot with grouped updates |
| A build "worked" but nobody can say what shipped | Deployed from a moving `:latest` tag | Deploy an immutable `:${{ github.sha }}` tag |
| A self-hosted runner was compromised | Fork PR scheduled onto a persistent machine | Ephemeral runners, repo-scoped, never fork-schedulable |
| One bad shared-workflow release broke every team | Major tag moved without a canary | Canary one repository on the exact patch first |
| Teams have forked the shared workflow | Upstream changes take too long | Fix turnaround time — policy will not win this |
| A token outlived its job and was reused | A PAT instead of a job-scoped token | GitHub App installation token, or `GITHUB_TOKEN` |
| Docker builds are slow despite a cache | `mode=min`, so intermediate layers are not exported | `cache-to: type=gha,mode=max` |
| "CI is slow" never gets prioritised | No numbers | Track p95 duration, flake rate, queue time, cost |

## The practices that pay off most

<div class="cards">
  <div class="card"><div class="icon">🛡️</div><h4>Read-only token by default</h4><p>Set it at the organisation level so every new repository is safe without anyone remembering.</p></div>
  <div class="card"><div class="icon">🔐</div><h4>OIDC instead of stored keys</h4><p>Nothing to rotate, nothing to leak. Constrain the trust policy to an environment and verify it is refused elsewhere.</p></div>
  <div class="card"><div class="icon">📌</div><h4>SHA-pin plus Dependabot</h4><p>Neither works alone. Pinning without updates is an unpatched dependency.</p></div>
  <div class="card"><div class="icon">🏷️</div><h4>Immutable deploy tags</h4><p><code>:${{ github.sha }}</code> for anything a deployment references; moving tags are for humans.</p></div>
  <div class="card"><div class="icon">🚦</div><h4>Canary the shared workflow</h4><p>One low-risk repository on the exact patch, green for a day, then move the major tag.</p></div>
  <div class="card"><div class="icon">📈</div><h4>Measure before optimising</h4><p>Pull run timings from the REST API. The slow step is rarely the one people assume.</p></div>
</div>

## The hardening pass every workflow should get

Most repositories can close most of their exposure with a small mechanical change set. Apply it as a template and stop rediscovering it.

```yaml .github/workflows/ci.yml
permissions:
  contents: read                       # 1. read-only floor for the workflow

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 20                # 2. no job may burn six hours
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false   # 3. no push token left in .git/config
      - env:
          TITLE: ${{ github.event.pull_request.title }}   # 4. event data as data
        run: ./scripts/check.sh
```

| Line | Removes |
|---|---|
| `permissions: contents: read` | A compromised step's ability to push, tag, or comment |
| `timeout-minutes` | Hung jobs, and their cost |
| `persist-credentials: false` | A usable token sitting in the workspace for every later step |
| Event data via `env` | Shell injection from titles, branch names, comment bodies |

<div class="callout tip">
  <span class="ct">Set the organisation default once and the problem stops recurring</span>
  In organisation settings, make the default <code>GITHUB_TOKEN</code> permission <b>read repository contents</b> and require workflows to opt in to more. That single change makes every new repository safe by default instead of depending on every author remembering.
</div>

## Pinning that stays fresh

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Do</h4>
    <ul>
      <li>Pin every third-party action to a full 40-character SHA, version in a trailing comment</li>
      <li>Enable Dependabot for <code>github-actions</code> and group the updates</li>
      <li>Restrict the organisation to selected actions plus verified creators</li>
      <li>Fork and vendor anything you depend on critically</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Do not</h4>
    <ul>
      <li>Reference <code>@main</code> or any branch on code you do not own</li>
      <li>Pin and then never update — a frozen action is an unpatched one</li>
      <li>Assume a major tag is immutable; tags can be moved</li>
      <li>Run an unvetted action in a job holding production secrets</li>
    </ul>
  </div>
</div>

```yaml .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
    groups:
      actions:
        patterns: ['*']       # one pull request a week instead of fifteen
```

The grouping matters more than it looks. Fifteen separate Dependabot pull requests a week get ignored, and ignored updates are the same as no updates.

## Getting rid of stored cloud keys

Every long-lived cloud key in a repository secret is a rotation task you will forget and a credential that outlives the job it was for.

<ol class="guide-steps">
  <li><b>Register GitHub as an identity provider in the cloud account</b>One-time setup per account, for <code>token.actions.githubusercontent.com</code>.</li>
  <li><b>Create a role whose trust policy names your repository precisely</b>Constrain the <code>sub</code> claim to a ref, or better an environment: <code>repo:my-org/my-repo:environment:production</code>. A wildcard like <code>repo:my-org/*:*</code> lets any branch of any repository assume the role.</li>
  <li><b>Grant the role only what deploying needs</b>Not what the team has. This is the step people skip, and it is the one that bounds the damage.</li>
  <li><b>Put <code>id-token: write</code> on the job, not the workflow</b>Only the deploying job needs to mint an identity.</li>
  <li><b>Prove the constraint holds</b>Open a pull request from a throwaway branch with a workflow that tries to assume the role. It must be refused. If it succeeds, the condition is too broad and your approval gate is decorative.</li>
  <li><b>Delete the old access keys</b>Not "leave them for now". An unused key is an unmonitored key.</li>
</ol>

```yaml
jobs:
  deploy:
    environment: production        # the approval becomes part of the identity
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.DEPLOY_ROLE_ARN }}
          aws-region: ${{ vars.AWS_REGION }}
      - run: aws sts get-caller-identity    # confirm identity before acting
```

## The review checklist

Print this. Most incidents are prevented at review time rather than at runtime, and a checklist is the only thing that survives a busy week.

| Check | Looking for |
|---|---|
| `on:` triggers | Any `pull_request_target`, `workflow_run`, or `issue_comment` — each gives fork-influenced runs a privileged token |
| Checkout ref | A `pull_request_target` job checking out `head.sha` — the classic exfiltration pattern |
| `permissions` | Present, minimal, widened per job rather than per workflow |
| Third-party `uses:` | SHA-pinned, recognisable source, covered by Dependabot |
| Interpolation | No `${{ github.event.* }}` inside a `run` body |
| Secrets | Never echoed, never in a job running untrusted code, environment-scoped where possible |
| `concurrency` | Present; cancelling on CI, not cancelling on deploys |
| `timeout-minutes` | Present on every job |
| Cache | Key hashes a lockfile; nothing executable is restored and then run unverified |
| Required checks | Job names unchanged, or branch protection updated in the same change |

<div class="callout note">
  <span class="ct">Make the checklist enforceable</span>
  CODEOWNERS on <code>.github/workflows/**</code> routes every workflow change to the team that owns CI. Combined with an organisation policy allowing only selected actions, the checklist stops depending on whoever happens to pick up the review.
</div>

## Incident playbooks

These are the four situations you will actually be paged for. Knowing the order of operations matters more than knowing the tooling.

### A secret leaked into a log

**Rotate first.** The log is already scraped; assume the credential is compromised regardless of how quickly you deleted it. Then revoke the old credential, delete the log and the run, find the line that printed it, and close the class of problem — secrets through `env`, never interpolated into a command, and OIDC wherever possible so there is nothing to leak.

Deleting the log first and rotating later is the common mistake, and it optimises for the wrong thing.

### Deploys have been shipping the wrong build

Look at the **cache and the artifact names before the code**. A key that never invalidates, or two matrix cells uploading the same artifact name, both produce exactly this symptom and neither shows up in a diff. Then make the deployed artifact identifiable by an immutable `:${{ github.sha }}` tag so the question "what is actually running" has an answer.

### A third-party action was compromised

Determine which repositories reference it and at what ref. Revoke every secret those workflows could reach — not just the ones you think were used. Replace the reference with a vetted SHA or an internal fork. Then close the class: SHA pinning, an allow-list policy, and Dependabot.

### Everything went red at once

A failure that starts everywhere simultaneously is **not your diff**. It is a shared workflow release, a third-party action release, or a runner image change.

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>0m</span><strong>Establish the blast radius</strong><small>One repository or all of them? That single question eliminates most hypotheses immediately.</small></div>
  <div class="guide-timeline-item"><span>2m</span><strong>Compare against the last green run</strong><small>Side by side. Look at the environment, not just the code: runner image version, action versions, cache hit or miss.</small></div>
  <div class="guide-timeline-item"><span>5m</span><strong>Re-run the failed job with debug logging</strong><small>Only the failed job, so you get an answer in two minutes rather than twenty.</small></div>
  <div class="guide-timeline-item"><span>8m</span><strong>Bypass the cache</strong><small>Delete the suspect entry or change the key. A poisoned cache explains failures that make no sense against the diff.</small></div>
  <div class="guide-timeline-item"><span>12m</span><strong>Reproduce in the runner image locally</strong><small>If the command passes in the same image, the difference is credentials, network, or an environment variable.</small></div>
  <div class="guide-timeline-item"><span>after</span><strong>Close the loop</strong><small>Pin whatever moved, add the assertion that would have caught it, and push the finding into the shared workflow so no other team rediscovers it.</small></div>
</div>

```yaml
# Worth keeping permanently in the shared workflow
- name: Diagnostics
  if: failure()
  run: |
    echo "runner image : $ImageVersion"
    echo "ref / sha    : $GITHUB_REF / $GITHUB_SHA"
    echo "cache hit    : ${{ steps.cache.outputs.cache-hit }}"
    df -h && free -m
```

## Running a shared pipeline as a product

The moment other teams depend on your workflow, you are running a platform, and platform rules apply.

**One repository owns the standard**, with CODEOWNERS on the workflow folder so changes are reviewed by whoever carries the pager.

**Consumers pin a major tag; you move it.** Release `v2.7.0`, move `v2`. A fix reaches sixty repositories without sixty pull requests. Breaking changes become `v3` with a migration note, never a silent change inside `v2`.

**Canary before moving the tag.** One low-risk repository pins the exact patch. Green for a day, then move the major tag. Skip this and one bad release breaks every team at once.

**Inputs are a public API.** Types, defaults, descriptions. Removing an input is a breaking change even if one repository used it — and the failure lands on somebody else's pull request, not yours.

**Pass secrets explicitly.** `secrets: inherit` is convenient and hands the callee everything the caller can see. Listing the two it needs documents the contract and bounds the damage from a bad release.

**Make the compliant path the easy path.** If using the shared workflow is harder than writing a local one, teams will fork it and you will have sixty variants with your name on them.

<div class="callout warn">
  <span class="ct">The failure mode of shared pipelines</span>
  A team needs one small change, cannot get it upstream quickly, and forks. Six months later there are eleven forks and no standard. The fix is not policy — it is turnaround time on upstream changes. If a reasonable request takes two weeks, forking is the rational choice and you will lose.
</div>

## Self-hosted runners, if you must

| Rule | Why |
|---|---|
| **Ephemeral** — one job, then destroy the VM or container | Persistent state is how one job poisons the next |
| Scoped to specific repositories, not the organisation | Limits which workflows can schedule onto them |
| Network-segmented, no direct production access | A compromised runner should not be a compromised environment |
| Never reachable by fork-triggered workflows | Untrusted code plus persistent state is a compromised machine |
| Autoscaled from an immutable image | Hand-configured runners drift and become unreproducible |

And check the arithmetic before you commit. A self-hosted fleet costs hardware plus patching plus isolation plus on-call. Larger hosted runners are almost always cheaper than the engineering time, and they keep the isolation model you get for free.

## Performance work that actually pays

| Lever | Typical gain | Note |
|---|---|---|
| Cancel superseded runs | Large on busy repositories | `cancel-in-progress` on pull requests only |
| Registry or GHA layer cache for Docker | Minutes per build | `mode=max` exports intermediate layers |
| Shard slow suites across a matrix | Near-linear | Bounded by the slowest shard — shard by duration, not file count |
| Move end-to-end tests to a schedule | Removes them from the critical path | Keep a smoke subset on the pull request |
| Prebuilt job image | Removes install time entirely | `container:` with an image your own pipeline builds nightly |
| Larger hosted runners | Sub-linear | Only after measuring |

<div class="callout tip">
  <span class="ct">Measure with data you already have</span>
  The REST API exposes timing for every run. Pull the last few hundred runs of your slowest workflow, group by job, and take the p95. The slow step is rarely the one people assume, and "we measured" ends the argument in a way that "I think" never does.
</div>

## Making pipeline health visible

Four numbers turn "CI is slow" from an opinion into a funded priority: **median and p95 duration per workflow**, **failure rate split into real failures and flakes**, **queue time**, and **cost by workflow and runner label**. Without them, nobody can prioritise the work and it never gets done.

Per run, two cheap tools do most of the work. Job summaries put the numbers a reviewer needs directly on the run page. Step timestamps find the slow step in seconds.

```yaml
- name: Publish the numbers where they will be read
  if: always()
  run: |
    {
      echo "### Build report"
      echo ""
      echo "| metric | value |"
      echo "|---|---|"
      echo "| duration | ${{ steps.timer.outputs.seconds }}s |"
      echo "| image size | $(docker image inspect app:ci --format '{{.Size}}' | numfmt --to=iec) |"
      echo "| coverage | $(coverage report --format=total)% |"
    } >> "$GITHUB_STEP_SUMMARY"
```

One caution: debugging actions that open an interactive shell on a runner are genuinely useful and are also a live session on a machine holding your secrets. Restrict them to jobs that have none.

## Machine-learning pipelines

Four habits separate a working ML pipeline from one you can defend in a review.

**Validate before you spend.** A schema, drift, or row-count check on a cheap runner protects an expensive one. Failing after forty minutes of GPU time on a malformed dataset is an avoidable cost.

**Gate on a comparison, not an absolute.** "Better than what is deployed" survives a changing dataset; a hard-coded threshold silently becomes either meaningless or a permanent blocker.

**Publish metrics to the step summary.** The person approving a promotion should not have to download an artifact to see the numbers.

**Promote from a separate job behind an environment.** That buys the approval, the scoped credentials, and a deployment record naming the commit, the dataset version, and the run.

```yaml
- name: Gate on a comparison with production
  run: |
    python -m pipeline.compare \
      --candidate "${{ needs.train.outputs.run-id }}" \
      --baseline production \
      --min-delta 0.0
```

And the architectural habit underneath all of it: **Actions orchestrates, it does not compute.** The six-hour job ceiling is not the real constraint — the real constraint is that a CI runner is the wrong place to hold a long, expensive, retryable workload. Submit it to a platform built for that, wait, and gate on the result.
