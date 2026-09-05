Part three of three. The problems at this level are rarely about syntax. They are about a pipeline sixty people depend on, a credential nobody remembers creating, and a failure that started at 09:00 everywhere at once. Start with the error table, then the practices and playbooks underneath it.

## Common errors at this level

These cause incidents rather than red builds.

| Symptom | Real cause | Fix |
|---|---|---|
| A fork PR could read your secrets | `pull_request_target` checking out `head.sha` | Never check out the head ref there; split across `pull_request` + `workflow_run` |
| A PR title executed a command | `${{ github.event.* }}` interpolated into a `run` body | Pass event data through `env` and quote the variable |
| A `github-script` block ran attacker input | The payload was spliced into JavaScript source | Read from `process.env` at runtime |
| A compromised step pushed to `main` | No `permissions` block, so the token was write-capable | `contents: read` floor, widened per job |
| Any branch of any repo can assume the deploy role | OIDC `sub` claim wildcarded to `repo:org/*:*` | Constrain to a ref, or better an environment |
| An action changed under you overnight | Referenced by a mutable tag | SHA-pin, plus Dependabot so pins stay fresh |
| Pinned actions are years out of date | Pinned but never updated | Dependabot with grouped updates |
| A cache poisoned a trusted run | A PR branch wrote a cache `main` later restored | Never restore-and-execute unverified |
| Automation acts as a departed employee | A PAT instead of a scoped App token | GitHub App installation token |
| Cross-repo automation fails | `GITHUB_TOKEN` cannot reach another repository | App token, or a fine-grained PAT |
| Nobody can say what version is deployed | Deployed a moving tag | Immutable `:sha-…` tag or a digest |
| Production runs code CI never tested | Image rebuilt per environment | Build once, promote the same digest |
| Docker builds are slow despite a cache | `mode=min`, so intermediate layers are not exported | `cache-to: type=gha,mode=max` |
| A self-hosted runner was compromised | Fork PR scheduled onto a persistent machine | Ephemeral, repo-scoped, never fork-schedulable |
| One bad shared-workflow release broke every team | Major tag moved without a canary | Canary one repository on the exact patch first |
| Teams have forked the shared workflow | Upstream changes take too long | Fix turnaround time: policy will not win this |
| "CI is slow" never gets prioritised | No numbers | Track p95 duration, flake rate, queue time, cost |
| A six-hour GPU job hit the ceiling | Actions used as compute, not orchestration | Submit to a training platform and gate on the result |

## The practices that pay off most

<div class="cards">
  <div class="card"><div class="icon">🛡️</div><h4>Read-only token by default</h4><p>Set it at organisation level so every new repository is safe without anyone remembering.</p></div>
  <div class="card"><div class="icon">🔐</div><h4>OIDC instead of stored keys</h4><p>Nothing to rotate, nothing to leak. Constrain the trust policy to an environment and verify it is refused elsewhere.</p></div>
  <div class="card"><div class="icon">📌</div><h4>SHA-pin plus Dependabot</h4><p>Neither works alone. Pinning without updates is an unpatched dependency.</p></div>
  <div class="card"><div class="icon">🏷️</div><h4>Immutable deploy references</h4><p><code>:sha-…</code> or a digest for anything a deployment names; moving tags are for humans.</p></div>
  <div class="card"><div class="icon">🚦</div><h4>Canary the shared workflow</h4><p>One low-risk repository on the exact patch, green for a day, then move the major tag.</p></div>
  <div class="card"><div class="icon">📈</div><h4>Measure before optimising</h4><p>Pull run timings from the REST API. The slow step is rarely the one people assume.</p></div>
</div>

## The hardening pass every workflow should get

Apply this as a template, or better, as the shared workflow everyone calls.

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
          persist-credentials: false   # 3. no push token left in the workspace
      - env:
          TITLE: ${{ github.event.pull_request.title }}   # 4. event data as data
        run: ./scripts/check.sh
```

| Line | Removes |
|---|---|
| `permissions: contents: read` | A compromised step's ability to push, tag, or comment |
| `timeout-minutes` | Hung jobs, and their cost |
| `persist-credentials: false` | A usable token sitting in the workspace for later steps |
| Event data via `env` | Shell injection from titles, branch names, comment bodies |

<div class="callout tip">
  <span class="ct">Set the organisation default once</span>
  In organisation settings, make the default <code>GITHUB_TOKEN</code> permission <b>read repository contents</b> and require workflows to opt in. That single change makes every new repository safe by default instead of depending on every author remembering.
</div>

## Pinning that stays fresh

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Do</h4>
    <ul>
      <li>Pin every third-party action to a full 40-character SHA, version in a comment</li>
      <li>Enable Dependabot for <code>github-actions</code> and group the updates</li>
      <li>Restrict the organisation to selected actions plus verified creators</li>
      <li>Fork and vendor anything you depend on critically</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Do not</h4>
    <ul>
      <li>Reference <code>@main</code> or any branch on code you do not own</li>
      <li>Pin and then never update: a frozen action is an unpatched one</li>
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

<ol class="guide-steps">
  <li><b>Register GitHub as an identity provider in the cloud account</b>One-time setup per account, for <code>token.actions.githubusercontent.com</code>.</li>
  <li><b>Create a role whose trust policy names your repository precisely</b>Constrain the <code>sub</code> claim to a ref, or better an environment: <code>repo:my-org/my-repo:environment:production</code>. A wildcard like <code>repo:my-org/*:*</code> lets any branch of any repository assume the role.</li>
  <li><b>Grant the role only what deploying needs</b>Not what the team has. This is the step people skip, and the one that bounds the damage.</li>
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

## Verify controls rather than trusting them

```bash
# Which workflows use a dangerous trigger?
grep -rl 'pull_request_target\|workflow_run\|issue_comment' .github/workflows/

# Which third-party actions are NOT SHA-pinned?
grep -rhoP 'uses:\s*\K(?!actions/)[\w.-]+/[\w.-]+@[\w.-]+' .github/workflows/ \
  | grep -v '@[0-9a-f]\{40\}$' | sort -u

# Does any run body interpolate event data?
grep -rn 'run:.*\${{\s*github\.event\.' .github/workflows/

# Which workflows have no permissions block?
for f in .github/workflows/*.yml; do
  grep -q '^permissions:' "$f" || echo "no permissions floor: $f"
done
```

<div class="callout warn">
  <span class="ct">Test that the control blocks something</span>
  After tightening an OIDC trust policy, try the assume-role from a branch that should be refused. After setting <code>permissions: contents: read</code>, confirm a push step now fails. A security control you have never seen refuse anything is decoration.
</div>

## The review checklist

Most incidents are prevented at review time, not runtime. A checklist is the only thing that survives a busy week.

| Check | Looking for |
|---|---|
| `on:` triggers | Any `pull_request_target`, `workflow_run`, or `issue_comment` |
| Checkout ref | A `pull_request_target` job checking out `head.sha` |
| `permissions` | Present, minimal, widened per job rather than per workflow |
| Third-party `uses:` | SHA-pinned, recognisable source, Dependabot-covered |
| Interpolation | No `${{ github.event.* }}` in a `run` body or `github-script` |
| Secrets | Never echoed, never in a job running untrusted code, environment-scoped where possible |
| `concurrency` | Present; cancelling on CI, **not** cancelling on deploys |
| `timeout-minutes` | Present on every job |
| Cache | Key hashes a lockfile; nothing executable restored and then run |
| Required checks | Job names unchanged, or branch protection updated in the same change |

<div class="callout note">
  <span class="ct">Make the checklist enforceable</span>
  CODEOWNERS on <code>.github/workflows/**</code> routes every workflow change to the team that owns CI. Combined with an organisation policy allowing only selected actions, it stops depending on whoever picks up the review.
</div>

## Incident playbooks

### A secret leaked into a log

**Rotate first.** The log is already scraped; assume the credential is compromised regardless of how quickly you deleted it. Then revoke the old credential, delete the log and the run, find the line that printed it, and close the class of problem: secrets through `env`, never interpolated, and OIDC wherever possible so there is nothing to leak.

Deleting the log first and rotating later optimises for the wrong thing.

### A third-party action was compromised

Determine which repositories reference it and at what ref. Revoke every secret those workflows could reach, not just the ones you think were used. Replace the reference with a vetted SHA or an internal fork. Then close the class: SHA pinning, an allow-list policy, and Dependabot.

### Deploys have been shipping the wrong build

Look at the **cache and artifact names before the code**. A key that never invalidates, or two matrix cells uploading the same artifact name, both produce exactly this and neither appears in a diff. Then make the deployed artifact identifiable by an immutable `sha-` tag or digest so "what is running" has an answer.

### Everything went red at once

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>0m</span><strong>Establish the blast radius</strong><small>One repository or all of them? Simultaneous failure everywhere is a shared workflow release, an action release, or a runner image change, not your diff.</small></div>
  <div class="guide-timeline-item"><span>2m</span><strong>Compare against the last green run</strong><small>Side by side. Look at the environment, not just the code: runner image version, action versions, cache hit or miss.</small></div>
  <div class="guide-timeline-item"><span>5m</span><strong>Re-run the failed job with debug logging</strong><small>Only the failed job, so you get an answer in two minutes rather than twenty.</small></div>
  <div class="guide-timeline-item"><span>8m</span><strong>Bypass the cache</strong><small>Delete the suspect entry or change the key. A poisoned cache explains failures that make no sense against the diff.</small></div>
  <div class="guide-timeline-item"><span>12m</span><strong>Reproduce in the runner image locally</strong><small>If the command passes in the same image, the difference is credentials, network, or an environment variable.</small></div>
  <div class="guide-timeline-item"><span>after</span><strong>Close the loop</strong><small>Pin what moved, add the assertion that would have caught it, and push the finding into the shared workflow so no other team rediscovers it.</small></div>
</div>

## Auditing what earlier levels taught

The habits from Beginner and Mid do not stop mattering. They become things you verify across a fleet rather than remember per workflow. These one-liners are worth running over any repository you inherit.

```bash
# Triggers and filters: which workflows can be started by fork-influenced events?
grep -rln 'pull_request_target\|workflow_run\|issue_comment' .github/workflows/

# Conditions: any job with no guard at all, deploying from any branch?
grep -rn -A3 'environment:' .github/workflows/ | grep -c 'if:' || echo 'ungated deploys'

# Job outputs: is anything secret-looking being routed through one?
grep -rn -B2 'outputs:' .github/workflows/ | grep -i 'token\|secret\|password'

# Reuse: which repositories still copy-paste instead of calling the standard?
grep -rL 'uses: my-org/.github/.github/workflows/' .github/workflows/*.yml

# Guards: any job without a timeout?
for f in .github/workflows/*.yml; do
  grep -q 'timeout-minutes' "$f" || echo "no timeout: $f"
done
```

| Earlier habit | What it becomes at this level |
|---|---|
| `paths-ignore` on triggers | A fleet-wide policy, plus stub workflows so required checks still report |
| `if: github.ref == …` on deploys | An **environment** with branch restrictions, so the gate is not one editable line |
| Job outputs for strings | An audited boundary: outputs are plain text in run metadata, never credentials |
| A reusable workflow you wrote | A versioned product with a canary, CODEOWNERS, and a deprecation path |
| `timeout-minutes` per job | A default in the shared workflow, so no team has to remember |
| `cache:` on a setup action | Layer caching with `mode=max`, plus awareness that caches are a write surface |

<div class="callout tip">
  <span class="ct">Encode, do not document</span>
  Every item above is more reliable as a default in the shared reusable workflow than as a line in a wiki. If the compliant path is the one teams already call, compliance stops being a review burden.
</div>

## Running a shared pipeline as a product

The moment other teams depend on your workflow, you are running a platform.

**One repository owns the standard**, with CODEOWNERS on the workflow folder so changes are reviewed by whoever carries the pager.

**Consumers pin a major tag; you move it.** Release `v2.7.0`, move `v2`. A fix reaches sixty repositories without sixty pull requests. Breaking changes become `v3` with a migration note, never a silent change inside `v2`.

**Canary before moving the tag.** One low-risk repository pins the exact patch. Green for a day, then move the major tag. Skip this and one bad release breaks every team at once.

**Inputs are a public API.** Types, defaults, descriptions. Removing an input is a breaking change even if one repository used it, and the failure lands on somebody else's pull request.

**Pass secrets explicitly.** `secrets: inherit` hands the callee everything the caller can see. Listing the two it needs documents the contract and bounds the damage from a bad release.

**Make the compliant path the easy path.** If using the shared workflow is harder than writing a local one, teams fork it and you have sixty variants with your name on them.

<div class="callout warn">
  <span class="ct">The failure mode of shared pipelines</span>
  A team needs one small change, cannot get it upstream quickly, and forks. Six months later there are eleven forks and no standard. The fix is <b>turnaround time</b>, not a policy. If a reasonable request takes two weeks, forking is the rational choice and you will lose.
</div>

## Runners and cost

| Rule | Why |
|---|---|
| Hosted by default | Free on public repos, fresh machine, no state to leak |
| Larger hosted before self-hosted | Same isolation, more cores, no fleet to operate |
| Self-hosted only for GPU, licences, or VPC reach | And then **ephemeral**: one job per runner |
| Never fork-schedulable | Untrusted code plus persistent state is a compromised machine |
| Repository-scoped, network-segmented | A compromised runner should not reach production |

Windows minutes bill at roughly twice Linux and macOS at roughly ten times. A matrix that includes macOS "for completeness" can become most of your bill, and larger hosted runners are almost always cheaper than the engineering time to run your own fleet.

## Performance levers that pay

| Lever | Typical gain | Note |
|---|---|---|
| Cancel superseded runs | Large on busy repositories | `cancel-in-progress` on pull requests only |
| Registry or GHA layer cache with `mode=max` | Minutes per build | `mode=min` barely helps a multi-stage build |
| Shard slow suites across a matrix | Near-linear | Bounded by the slowest shard: shard by duration |
| Move end-to-end tests to a schedule | Removes them from the critical path | Keep a smoke subset on the PR |
| Prebuilt job image | Removes install time entirely | `container:` with an image you build nightly |
| Larger runners | Sub-linear | Only after measuring |

## Making pipeline health visible

Four numbers turn "CI is slow" from an opinion into a funded priority: **median and p95 duration per workflow**, **failure rate split into real failures and flakes**, **queue time**, and **cost by workflow and runner label**.

```yaml
- name: Weekly CI health report
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    gh api -X GET '/repos/${{ github.repository }}/actions/runs' \
      -f per_page=100 --jq '
        [.workflow_runs[] | select(.conclusion != null)
         | { name, conclusion,
             mins: (((.updated_at|fromdate) - (.run_started_at|fromdate)) / 60) }]
        | group_by(.name)[]
        | { workflow: .[0].name, runs: length,
            failed: ([.[] | select(.conclusion == "failure")] | length),
            p95: (sort_by(.mins) | .[(length * 0.95) | floor].mins) }' \
      | tee -a "$GITHUB_STEP_SUMMARY"
```

One caution: debugging actions that open an interactive shell on a runner are useful and are also a live session on a machine holding your secrets. Restrict them to jobs that have none.

## Machine-learning pipelines

**Validate before you spend.** A schema, drift, or row-count check on a cheap runner protects an expensive one. Failing after forty minutes of GPU time on a malformed dataset is an avoidable cost.

**Gate on a comparison, not an absolute.** "Better than what is deployed" survives a changing dataset; a hard-coded threshold silently becomes either meaningless or a permanent blocker.

**Publish metrics to the step summary.** The person approving a promotion should not download an artifact to see the numbers.

**Promote from a separate job behind an environment.** That buys the approval, the scoped credentials, and a deployment record naming the commit, the dataset version, and the run.

```yaml
- name: Gate on a comparison with production
  run: |
    python -m pipeline.compare \
      --candidate "${{ needs.train.outputs.run-id }}" \
      --baseline production \
      --min-delta 0.0
```

The architectural habit underneath all of it: **Actions orchestrates, it does not compute.** The six-hour ceiling is not the real constraint. A CI runner is the wrong place for a long, expensive, retryable workload. Submit it to a platform built for that, wait, and gate on the result.
