This is part two of three. It picks up exactly where Beginner ended and takes **every topic from there further**, then adds the machinery you have not met yet. Nothing is dropped and nothing is repeated for its own sake — where you already know the basics, we go straight to the depth.

## Where this picks up

| Topic you already use | What this level adds |
|---|---|
| Triggers and filters | Activity types, `workflow_run`, `repository_dispatch`, the required-check trap |
| `needs` | The full dependency graph, `needs.*.result`, fan-in and fan-out |
| `run` / `uses` | Shell selection, exit codes, `continue-on-error`, `outcome` vs `conclusion` |
| Expressions and `if` | Every context, operator, and function; precedence rules |
| Environment variables | Scope precedence, default variables, all four special files |
| Secrets | Secrets vs variables, three definition levels, masking, fork behaviour |
| Caching | Key design and its two failure modes, scope, `cache-hit`, per-language recipes |
| Artifacts | Retention, name collisions, empty uploads, cross-run download |
| Job outputs | Size limits, passing JSON, driving a matrix |
| Matrix | `include`, `exclude`, `fail-fast`, `max-parallel`, dynamic generation |
| Guards | Concurrency control and cancellation strategy |
| Debugging | Context dumps, debug logging, cache bypass, bisecting |
| — **new** — | Service containers · container jobs · reusable workflows · composite actions · environments and approvals |

## Expressions: the full reference

You have used `${{ }}` for a handful of values. Here is everything that is actually available.

| Context | Available in | Holds |
|---|---|---|
| `github` | Everywhere | `ref`, `ref_name`, `ref_type`, `sha`, `actor`, `event_name`, `repository`, `repository_owner`, `run_id`, `run_number`, `run_attempt`, `workspace`, `job`, `event.*` |
| `env` | Steps, `if` | Variables you defined |
| `vars` | Everywhere | Organisation, repository, and environment variables |
| `secrets` | Everywhere except step `if` | Encrypted values |
| `job` | Steps | `job.status`, `job.services.*` |
| `jobs` | Reusable workflow `outputs` | Callee job results |
| `steps` | Later steps in the job | `steps.<id>.outputs.*`, `.outcome`, `.conclusion` |
| `runner` | Steps | `os`, `arch`, `name`, `temp`, `tool_cache` |
| `needs` | Dependent jobs | `needs.<job>.outputs.*`, `needs.<job>.result` |
| `strategy` | Matrix jobs | `job-index`, `job-total`, `fail-fast` |
| `matrix` | Matrix jobs | The current combination |
| `inputs` | `workflow_dispatch`, `workflow_call` | Declared inputs |

### Operators and functions

```yaml
# Comparison and logic
if: github.event_name == 'push' && github.ref != 'refs/heads/main'
if: contains(fromJSON('["main","develop"]'), github.ref_name)
if: github.actor != 'dependabot[bot]' || inputs.force == true

# String functions
if: startsWith(github.ref, 'refs/tags/v')
if: endsWith(github.repository, '-internal')
if: contains(github.event.head_commit.message, '[skip ci]')

# format() builds strings; join() flattens arrays
- run: echo "${{ format('{0}-{1}', runner.os, matrix.python) }}"
- run: echo "${{ join(matrix.*.python, ', ') }}"

# hashFiles() is the backbone of a cache key
key: ${{ runner.os }}-${{ hashFiles('**/requirements*.txt', '**/pyproject.toml') }}

# toJSON / fromJSON convert between strings and structures
- run: echo '${{ toJSON(github.event) }}'
matrix:
  target: ${{ fromJSON(needs.discover.outputs.targets) }}
```

<div class="callout tip">
  <span class="ct">Two precedence rules worth memorising</span>
  Inside <code>if:</code> the <code>${{ }}</code> wrapper is <b>optional</b> because the value is already evaluated as an expression — everywhere else it is required, and mixing the two styles in one condition produces confusing partial evaluation. And <code>&amp;&amp;</code>/<code>||</code> return <b>operands, not booleans</b>, which is why <code>${{ inputs.tag || github.sha }}</code> works as a default-value idiom.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Print three contexts side by side in one step: <code>toJSON(github.event_name)</code>, <code>toJSON(runner)</code>, and <code>toJSON(needs)</code>.</li>
    <li>Use the default-value idiom: add a <code>workflow_dispatch</code> input <code>tag</code> and echo <code>${{ inputs.tag || github.sha }}</code>, once with the input filled and once empty.</li>
    <li>Try <code>contains(fromJSON('["main","develop"]'), github.ref_name)</code> as an <code>if</code> on a step, from two different branches.</li>
  </ol>
  <em>the <code>||</code> idiom falls back to the SHA when the input is blank — proof that these operators return operands rather than booleans. And <code>needs</code> is an empty object in a job with no dependencies, which is worth knowing before you debug an empty value.</em>
</div>

## Step results: `outcome` versus `conclusion`

Beginner used `if: failure()`. The precise mechanics matter once you tolerate failures deliberately.

```yaml
- id: flaky
  continue-on-error: true
  run: ./might-fail.sh

- name: React to the REAL result
  if: steps.flaky.outcome == 'failure'
  run: echo "it failed, but we chose to continue"
```

| Field | Value after a tolerated failure |
|---|---|
| `steps.flaky.outcome` | `failure` — what the step actually did |
| `steps.flaky.conclusion` | `success` — the result after `continue-on-error` is applied |

The same distinction exists at job level as `needs.<job>.result`, which is `success`, `failure`, `cancelled`, or `skipped`.

### Status functions in full

| Function | True when |
|---|---|
| `success()` | Every previous step/job succeeded — the implicit default |
| `failure()` | Any previous step/job failed |
| `cancelled()` | The run was cancelled |
| `always()` | Always, including cancellation |

<div class="callout warn">
  <span class="ct"><code>always()</code> is stronger than people expect</span>
  It runs even when the workflow is <b>cancelled</b>, which means an <code>always()</code> step can keep a run alive that someone is trying to stop. For cleanup that should respect cancellation, prefer <code>if: !cancelled()</code>.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add a step with <code>id: flaky</code>, <code>continue-on-error: true</code>, and <code>run: exit 1</code>.</li>
    <li>Follow it with a step printing both values: <code>echo "outcome=${{ steps.flaky.outcome }} conclusion=${{ steps.flaky.conclusion }}"</code>.</li>
    <li>Now add a step with <code>if: always()</code> and cancel the run from the Actions tab while it is going.</li>
  </ol>
  <em><code>outcome=failure conclusion=success</code>, and the job is green. The cancelled run still executes the <code>always()</code> step — which is exactly why <code>!cancelled()</code> exists for cleanup that should stop.</em>
</div>

## The four special files

Beginner used `$GITHUB_ENV` and `$GITHUB_STEP_SUMMARY`. There are four, and each solves a different problem.

```yaml
- id: meta
  run: |
    # 1. environment variables for LATER STEPS in this job
    echo "IMAGE_TAG=sha-$(git rev-parse --short HEAD)" >> "$GITHUB_ENV"

    # 2. step outputs, addressed by the step's id
    echo "artifact=dist/app.tar.gz" >> "$GITHUB_OUTPUT"

    # 3. prepend to PATH for later steps
    echo "$HOME/.local/bin" >> "$GITHUB_PATH"

    # 4. Markdown rendered on the run page
    echo "### Build complete" >> "$GITHUB_STEP_SUMMARY"

- run: echo "$IMAGE_TAG"                            # from GITHUB_ENV
- run: echo "${{ steps.meta.outputs.artifact }}"     # from GITHUB_OUTPUT
- run: my-tool --version                             # found via GITHUB_PATH
```

Multi-line values need a delimiter, or the file format breaks:

```yaml
- run: |
    {
      echo 'NOTES<<EOF'
      cat CHANGELOG.md
      echo 'EOF'
    } >> "$GITHUB_ENV"
```

<div class="callout warn">
  <span class="ct">Two limits</span>
  A value written to <code>$GITHUB_ENV</code> is <b>not</b> readable in the step that wrote it — only from the next step onwards. And none of these four cross a <b>job</b> boundary; that needs job outputs or artifacts.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Write one step that appends to all four files, then later steps that read each back.</li>
    <li>Include a multi-line value using the <code>EOF</code> delimiter form, then print it.</li>
    <li>Add a second job with <code>needs</code> and try to read the <code>$GITHUB_ENV</code> value there.</li>
  </ol>
  <em>the first three work from the next step onwards, the summary renders on the run page, and the second job sees nothing. That last result is the boundary you will design around for the rest of this level.</em>
</div>

## Environment variables: precedence and defaults

Three scopes, most specific wins — and there is a fourth source you did not declare.

```yaml
env:
  LOG_LEVEL: info          # 3rd priority: workflow
jobs:
  test:
    env:
      LOG_LEVEL: debug     # 2nd priority: job
    steps:
      - run: ./run.sh
        env:
          LOG_LEVEL: trace # 1st priority: step — wins
```

GitHub also injects a set of default variables into every step:

| Variable | Contains |
|---|---|
| `GITHUB_REPOSITORY` | `owner/repo` |
| `GITHUB_REF` / `GITHUB_REF_NAME` | `refs/heads/main` / `main` |
| `GITHUB_SHA` | The triggering commit |
| `GITHUB_WORKSPACE` | Checkout directory |
| `GITHUB_RUN_ID` / `GITHUB_RUN_NUMBER` / `GITHUB_RUN_ATTEMPT` | Run identity |
| `GITHUB_EVENT_PATH` | Path to the full event payload JSON |
| `RUNNER_OS` / `RUNNER_TEMP` / `RUNNER_ARCH` | Machine facts |

```yaml
# Shell-safe short SHA, without an expression
- run: echo "tag=sha-${GITHUB_SHA::7}" >> "$GITHUB_OUTPUT"

# The whole event payload is on disk
- run: jq '.pull_request.labels[].name' "$GITHUB_EVENT_PATH"
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Set the same variable at workflow, job, and step level with three different values, then echo it from the step.</li>
    <li>Print the injected defaults: <code>echo "$GITHUB_REF_NAME $GITHUB_RUN_ATTEMPT $RUNNER_OS"</code>.</li>
    <li>Dump the raw event: <code>jq '.repository.full_name, .ref' "$GITHUB_EVENT_PATH"</code>.</li>
    <li>Re-run the same job and watch <code>GITHUB_RUN_ATTEMPT</code> change.</li>
  </ol>
  <em>the step-level value wins, and you have found the event payload on disk — often faster to explore with <code>jq</code> than through expressions.</em>
</div>

## Secrets and variables

Beginner treated secrets as one thing. There are two kinds, and conflating them is a real security problem.

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Secrets — <code>${{ secrets.NAME }}</code></h4>
    <ul>
      <li>Encrypted at rest, write-only in the interface</li>
      <li>Masked in logs on a best-effort basis</li>
      <li><b>Not</b> given to fork pull requests</li>
      <li>For tokens, keys, passwords, connection strings</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Variables — <code>${{ vars.NAME }}</code></h4>
    <ul>
      <li>Plain text, readable by anyone with repo access</li>
      <li>Printed normally in logs</li>
      <li>Available in every run, forks included</li>
      <li>For regions, image names, URLs, feature flags</li>
    </ul>
  </div>
</div>

Both exist at **three levels**, most specific winning — which is more useful than it first appears:

```text organisation  →  repository  →  environment
   AWS_REGION=eu-west-1   AWS_REGION=eu-west-2   AWS_REGION=us-east-1
   (default for 60 repos)  (this repo overrides)  (production overrides again)
```

```yaml
jobs:
  deploy:
    environment: production        # unlocks environment-scoped values
    runs-on: ubuntu-latest
    steps:
      - env:
          TOKEN: ${{ secrets.DEPLOY_TOKEN }}   # environment secret
        run: ./deploy.sh --region "${{ vars.AWS_REGION }}"
```

<div class="callout warn">
  <span class="ct">Masking is a safety net, not a mechanism</span>
  GitHub redacts <b>known</b> secret values from logs. It cannot redact a value you transformed — base64-encode a secret and print it and the redaction fails. Never print secrets, and pass them via <code>env</code> so they never appear in a command line.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Create a repository <b>variable</b> <code>REGION=eu-west-1</code> and a repository <b>secret</b> <code>TOKEN=abc123</code>.</li>
    <li>Echo both. Note which one is redacted.</li>
    <li>Create an <b>environment</b> called <code>staging</code> with its own <code>REGION=us-east-1</code>, add <code>environment: staging</code> to the job, and echo it again.</li>
    <li>Try <code>echo "$TOKEN" | rev</code> and look at the log.</li>
  </ol>
  <em>the variable prints, the secret shows <code>***</code>, the environment value overrides the repository one, and the reversed secret is printed in full. That last line is the proof that masking is a safety net rather than a mechanism.</em>
</div>

## Caching: designing the key

Beginner used `cache: pip`. Here is what that one line is doing, and how to build your own.

```yaml
- uses: actions/cache@v4
  id: deps
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements*.txt') }}
    restore-keys: |
      ${{ runner.os }}-pip-
```

| Piece | Behaviour |
|---|---|
| `key` | **Exact** match. A hit restores and **skips the save** at the end of the job |
| `restore-keys` | Ordered **prefixes** tried on a miss — a partial hit, still useful |
| `path` | What gets archived. The dependency *cache*, not the installed tree |
| Immutability | An entry is never overwritten, so the key must change when content should |
| Scope | Follows the branch graph — a branch reads its own and its base's caches |
| `cache-hit` | `'true'` **only** on an exact key match |

There are exactly two ways to get this wrong, and they fail in opposite directions:

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Keys that work</h4>
    <ul>
      <li><code>${{ runner.os }}-pip-${{ hashFiles('**/requirements*.txt') }}</code></li>
      <li>Add the tool version when it changes the layout: <code>-py${{ matrix.python }}-</code></li>
      <li>Always pair with a <code>restore-keys</code> prefix</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Keys that waste money</h4>
    <ul>
      <li><code>github.sha</code> or <code>run_id</code> — misses <b>every</b> run</li>
      <li>A fixed string — never invalidates, ships <b>stale</b> dependencies</li>
      <li><code>hashFiles('**')</code> — any source edit busts the dependency cache</li>
    </ul>
  </div>
</div>

`cache-hit` lets you skip expensive work entirely:

```yaml
- uses: actions/cache@v4
  id: models
  with:
    path: ~/.cache/huggingface
    key: hf-${{ hashFiles('models.lock') }}
    restore-keys: hf-

- name: Download only on an exact miss
  if: steps.models.outputs.cache-hit != 'true'
  run: python scripts/fetch_models.py
```

### Per-language recipes

| Language | Path to cache | Key on |
|---|---|---|
| Python (pip) | `~/.cache/pip` | `requirements*.txt`, `poetry.lock` |
| Node | `~/.npm` | `package-lock.json` |
| Java (Maven) | `~/.m2/repository` | `pom.xml` |
| Go | `~/.cache/go-build`, `~/go/pkg/mod` | `go.sum` |
| Rust | `~/.cargo`, `target/` | `Cargo.lock` |

<div class="callout warn">
  <span class="ct">Do not cache an installed tree</span>
  Cache the <b>download</b> directory, not <code>node_modules</code> or a virtualenv. Restoring an installed tree brings platform-specific binaries and half-resolved state with it, and produces failures that make no sense against the diff.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add <code>actions/cache</code> with a good key and print <code>steps.deps.outputs.cache-hit</code>. Run twice.</li>
    <li>Now change the key to include <code>${{ github.sha }}</code> and run twice more.</li>
    <li>Change it to a fixed string like <code>deps-cache</code>, edit your lockfile, and run again.</li>
    <li>Open <b>Actions → Caches</b> and look at what has accumulated.</li>
  </ol>
  <em>the good key misses then hits. The SHA key misses both times. The fixed key hits even though the lockfile changed — silently shipping stale dependencies. Seeing all three once makes key design obvious forever.</em>
</div>

## Artifacts: retention, collisions, and emptiness

```yaml
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: coverage-${{ matrix.python }}   # unique per matrix cell
    path: |
      htmlcov/
      reports/junit.xml
    retention-days: 7                    # override the 90-day default
    if-no-files-found: error             # fail loudly, not silently empty
    compression-level: 9
```

| Habit | Reason |
|---|---|
| `if: always()` | A green run's report is nice; a red run's report is the point |
| Unique name per matrix cell | In v4, two uploads with the same name **conflict** rather than merging |
| Short `retention-days` for CI noise | Artifacts count against repository storage |
| `if-no-files-found: error` | Turns a silently empty artifact into a visible failure |

Downloading is the mirror image, and can reach across runs:

```yaml
# Everything from this run
- uses: actions/download-artifact@v4
  with:
    path: ./all-artifacts
    merge-multiple: true

# One artifact from a DIFFERENT run
- uses: actions/download-artifact@v4
  with:
    name: dist
    run-id: ${{ github.event.workflow_run.id }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run a two-cell matrix where both cells upload an artifact with the <b>same</b> name.</li>
    <li>Fix it by suffixing with <code>${{ matrix.python }}</code>.</li>
    <li>Point <code>path:</code> at a directory that does not exist, first without and then with <code>if-no-files-found: error</code>.</li>
  </ol>
  <em>the duplicate name produces a conflict error in v4 rather than merging. And the missing path silently succeeds until you add <code>if-no-files-found: error</code> — which is why it belongs on every upload.</em>
</div>

## The job dependency graph

`needs` does more than order jobs. It builds a graph you can fan out from and fan back into.

```yaml
jobs:
  setup:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.v.outputs.version }}
      targets: ${{ steps.v.outputs.targets }}
    steps:
      - id: v
        run: |
          echo "version=1.4.${{ github.run_number }}" >> "$GITHUB_OUTPUT"
          echo 'targets=["api","worker","web"]'       >> "$GITHUB_OUTPUT"

  build:                                    # fan out: three parallel jobs
    needs: setup
    strategy:
      matrix:
        target: ${{ fromJSON(needs.setup.outputs.targets) }}
    runs-on: ubuntu-latest
    steps:
      - run: make build TARGET=${{ matrix.target }} VERSION=${{ needs.setup.outputs.version }}

  report:                                   # fan in: runs whatever happened
    needs: [setup, build]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - run: |
          echo "setup : ${{ needs.setup.result }}"
          echo "build : ${{ needs.build.result }}"
      - if: needs.build.result == 'failure'
        run: ./notify.sh
```

Two things to note. `needs.<job>.result` is `success`, `failure`, `cancelled`, or `skipped` — and a job that `needs` a matrix job sees a **single** aggregated result. And `if: always()` is what lets a reporting job run even when the thing it reports on failed.

<div class="callout warn">
  <span class="ct">Job outputs are small and not secret</span>
  They are size-limited and stored in plain text in the run metadata. Pass identifiers, versions, and JSON manifests — never a credential, and never a file. Files need artifacts.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Build the fan-out/fan-in example: a <code>setup</code> job emitting JSON, a matrix <code>build</code> consuming it, and a <code>report</code> job with <code>if: always()</code>.</li>
    <li>Print <code>needs.build.result</code> in the report job.</li>
    <li>Make one matrix cell fail, then re-run and inspect the reported result.</li>
  </ol>
  <em>the report job runs despite the failure, and <code>needs.build.result</code> is a single aggregated <code>failure</code> for the whole matrix — not one result per cell. That aggregation surprises people the first time they rely on it.</em>
</div>

## Matrix in depth

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      max-parallel: 4
      matrix:
        os: [ubuntu-latest, macos-latest]
        python: ['3.11', '3.12']
        include:
          - os: ubuntu-latest        # add one non-cartesian combination
            python: '3.13'
            experimental: true
          - os: ubuntu-latest        # or attach extra values to an existing one
            python: '3.12'
            coverage: true
        exclude:
          - os: macos-latest
            python: '3.11'
    continue-on-error: ${{ matrix.experimental == true }}
    name: test (${{ matrix.os }}, py${{ matrix.python }})
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python }}
      - run: pytest -q
      - if: matrix.coverage == true
        run: pytest --cov --cov-report=xml
```

| Setting | Meaning |
|---|---|
| Axes | Multiply — 2 OSes × 2 Pythons = 4 jobs |
| `include` | Adds a combination, or attaches extra keys to an existing one |
| `exclude` | Removes a generated combination |
| `fail-fast` | `true` by default: one failure cancels every sibling |
| `max-parallel` | Caps concurrent cells — use when they share a database or API quota |
| Ceiling | 256 jobs per workflow run |

<div class="callout warn">
  <span class="ct">Adding an axis renames a required check</span>
  The generated job name embeds the combination, so branch protection that requires <code>test (3.11)</code> starts waiting forever when the name becomes <code>test (ubuntu-latest, 3.11)</code>. Set an explicit <code>name:</code> on any matrix job used as a required check.
</div>

### Dynamic matrices

The monorepo pattern: discover what changed, then build only that.

```yaml
jobs:
  discover:
    runs-on: ubuntu-latest
    outputs:
      services: ${{ steps.list.outputs.services }}
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - id: list
        run: |
          CHANGED=$(git diff --name-only origin/main... \
            | awk -F/ '/^services\//{print $2}' | sort -u | jq -Rsc 'split("\n")[:-1]')
          echo "services=$CHANGED" >> "$GITHUB_OUTPUT"

  build:
    needs: discover
    if: needs.discover.outputs.services != '[]'
    strategy:
      matrix:
        service: ${{ fromJSON(needs.discover.outputs.services) }}
    runs-on: ubuntu-latest
    steps:
      - run: make build SERVICE=${{ matrix.service }}
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Build a 2 × 2 matrix, then add one <code>include</code> and one <code>exclude</code>. Count the resulting jobs before you run it, then check.</li>
    <li>Attach <code>experimental: true</code> via <code>include</code> and wire up <code>continue-on-error</code>.</li>
    <li>Add a third axis temporarily and look at how many jobs appear.</li>
    <li>Set an explicit <code>name:</code> and note how the Actions tab changes.</li>
  </ol>
  <em>four jobs, minus one, plus one. The third axis produces a wall of jobs that makes the "keep it to two axes" advice self-evident, and the explicit name is what keeps branch protection working.</em>
</div>

## Service containers

Mocking a database in integration tests is a compromise. `services` starts real containers on the job's network before your steps run.

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: app_test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        ports: ['6379:6379']
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-retries 5
    env:
      DATABASE_URL: postgres://postgres:postgres@localhost:5432/app_test
      REDIS_URL: redis://localhost:6379
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11', cache: pip }
      - run: pip install -r requirements.txt
      - run: pytest -q tests/integration
```

<div class="callout warn">
  <span class="ct">The health check is not decoration</span>
  Without it the container counts as started the instant Docker returns, so your first test connects before Postgres accepts connections. That is the whole explanation for <b>"fails on the first run, passes on the re-run"</b> — which teams then dismiss as flakiness.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add a Postgres service <b>without</b> a health check and have the first step connect immediately.</li>
    <li>Run it several times.</li>
    <li>Add the <code>--health-cmd</code> options and run several times again.</li>
  </ol>
  <em>the first version fails intermittently — the classic "fails on the first run, passes on the re-run". With the health check it never does. You have just reproduced and fixed the most common source of CI flakiness.</em>
</div>

## Container jobs

You can also run the **job itself** inside a container, which pins the entire toolchain rather than installing it per run.

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    container:
      image: python:3.11-slim
      options: --user 1001
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: postgres }
    env:
      DATABASE_URL: postgres://postgres:postgres@postgres:5432/postgres
    steps:
      - uses: actions/checkout@v4
      - run: pip install -r requirements.txt
      - run: pytest -q
```

<div class="callout warn">
  <span class="ct">The hostname changes</span>
  With no <code>container:</code>, services are reachable at <code>localhost</code>. Once the job runs <em>inside</em> a container, they are reachable at the <b>service name</b> — <code>postgres:5432</code>. Moving a job into a container silently breaks every connection string that said <code>localhost</code>.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Take a working job with a Postgres service and add <code>container: { image: python:3.11-slim }</code>.</li>
    <li>Run it without changing the connection string.</li>
    <li>Change <code>localhost</code> to <code>postgres</code> and run again.</li>
  </ol>
  <em>the first run fails with a connection error even though nothing else changed. That hostname switch is invisible in a diff and costs people an afternoon — now it will cost you nothing.</em>
</div>

## Reusable workflows

Once several repositories need the same pipeline, copy-paste becomes the problem. A reusable workflow is called at the **job** level and brings its own jobs and runners.

```yaml .github/workflows/reusable-ci.yml
on:
  workflow_call:
    inputs:
      python-version:
        description: Python version for lint and tests
        type: string
        default: '3.11'
      run-e2e:
        description: Also run the end-to-end suite
        type: boolean
        default: false
    secrets:
      CODECOV_TOKEN:
        required: false
    outputs:
      coverage:
        description: Line coverage percentage
        value: ${{ jobs.test.outputs.coverage }}

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    outputs:
      coverage: ${{ steps.cov.outputs.pct }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ inputs.python-version }}
          cache: pip
      - run: pip install -r requirements.txt
      - id: cov
        run: |
          pytest -q --cov --cov-report=term
          echo "pct=$(coverage report --format=total)" >> "$GITHUB_OUTPUT"
      - if: inputs.run-e2e
        run: pytest -q tests/e2e
```

The caller shrinks to almost nothing:

```yaml .github/workflows/ci.yml
name: CI

on:
  push: { branches: [main] }
  pull_request:

jobs:
  ci:
    uses: my-org/.github/.github/workflows/reusable-ci.yml@v1
    with:
      python-version: '3.12'
      run-e2e: ${{ github.ref == 'refs/heads/main' }}
    secrets:
      CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}   # explicit beats `inherit`

  notify:
    needs: ci
    runs-on: ubuntu-latest
    steps:
      - run: echo "coverage ${{ needs.ci.outputs.coverage }}%"
```

That doubled path — `my-org/.github/.github/workflows/…` — is correct and surprises everyone exactly once: the first `.github` is the **repository** name, the second is the folder inside it.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Create a <code>reusable-ci.yml</code> in the same repository with one <code>input</code> and one <code>output</code>, then call it from another workflow with <code>uses: ./.github/workflows/reusable-ci.yml</code>.</li>
    <li>Read its output in a following job via <code>needs</code>.</li>
    <li>Add <code>permissions: { contents: read }</code> to the caller and <code>packages: write</code> to the callee, then run it.</li>
    <li>Now pass a secret two ways: explicitly, then with <code>secrets: inherit</code>.</li>
  </ol>
  <em>the local path form works for practice without publishing anything. The permissions experiment fails — the callee cannot exceed the caller's token, which is the constraint that explains most reusable-workflow permission errors.</em>
</div>

## Composite actions

The step-level equivalent: a reusable sequence that runs inside the caller's job.

```yaml .github/actions/setup/action.yml
name: Set up project
description: Python, cached dependencies, and our standard tooling
inputs:
  python-version:
    description: Python version to install
    default: '3.11'
  install-dev:
    description: Also install dev requirements
    default: 'false'
outputs:
  cache-hit:
    description: Whether the dependency cache was an exact hit
    value: ${{ steps.py.outputs.cache-hit }}
runs:
  using: composite
  steps:
    - id: py
      uses: actions/setup-python@v5
      with:
        python-version: ${{ inputs.python-version }}
        cache: pip

    - run: pip install -r requirements.txt
      shell: bash            # ← MANDATORY on every composite run step

    - if: inputs.install-dev == 'true'
      run: pip install -r requirements-dev.txt
      shell: bash
```

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: ./.github/actions/setup          # local path
    with:
      python-version: '3.12'
      install-dev: 'true'
```

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Reusable workflow — job level</h4>
    <ul>
      <li>Brings its own jobs, runners, <code>permissions</code></li>
      <li>Typed <code>inputs</code>, explicit <code>secrets</code>, <code>outputs</code></li>
      <li>For a whole pipeline stage</li>
      <li>Receives the caller's token and cannot exceed it</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Composite action — step level</h4>
    <ul>
      <li>Runs in the caller's job on the caller's runner</li>
      <li>Cannot define jobs, matrices, or its own runner</li>
      <li>For a repeated sequence of steps</li>
      <li><code>shell:</code> required on every <code>run</code></li>
    </ul>
  </div>
</div>

Forgetting `shell:` is the most common reason a new composite action refuses to load, and the error does not say so.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Create <code>.github/actions/setup/action.yml</code> as above but <b>omit</b> <code>shell: bash</code> on one <code>run</code> step.</li>
    <li>Reference it with <code>- uses: ./.github/actions/setup</code> and run.</li>
    <li>Add the missing <code>shell:</code> and run again.</li>
    <li>Read one of its <code>outputs</code> in the calling workflow.</li>
  </ol>
  <em>the first run fails to even load the action, with a message that does not mention <code>shell</code>. This is the single most common reason a new composite action refuses to work.</em>
</div>

## Environments and approvals

An **environment** is a named deployment target with its own configuration and protection rules.

```yaml
jobs:
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://app.example.com      # shown on the run and the deployment
    steps:
      - env:
          TOKEN: ${{ secrets.DEPLOY_TOKEN }}   # environment-scoped secret
        run: ./deploy.sh
```

Configured in **Settings → Environments**, an environment gives you:

| Feature | Effect |
|---|---|
| Required reviewers | The job pauses before its first step until a human approves |
| Wait timer | A forced delay before the job starts |
| Deployment branches | Only listed branches or tags may deploy |
| Scoped secrets and variables | Reachable **only** from a job that declared this environment |
| Deployment history | A record per deploy, with commit, actor, and URL |

<div class="callout tip">
  <span class="ct">The right answer to "keep this credential away from CI"</span>
  Put it on the <b>environment</b>, not the repository. Ordinary test jobs then cannot read it at all, because only a job that declares <code>environment: production</code> — and passed its approval gate — gets it.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Create an environment called <code>production</code> and add yourself as a required reviewer.</li>
    <li>Add <code>environment: production</code> to a deploy job and trigger the workflow.</li>
    <li>Watch the job pause, then approve it.</li>
    <li>Add a secret to the environment and try to read it from a job that does <b>not</b> declare the environment.</li>
  </ol>
  <em>the job waits before its first step and records who approved it. The environment secret is empty in the other job — the mechanism for keeping a production credential away from ordinary CI.</em>
</div>

## Concurrency

Beginner added `timeout-minutes` as a guard. Concurrency is the other one, and it is usually the single biggest saving available on a busy repository.

```yaml
# Workflow level: one run per branch, cancel the superseded one
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    concurrency:
      group: deploy-production     # job level: one deploy at a time
      cancel-in-progress: false    # QUEUE rather than kill a release
    steps:
      - run: ./deploy.sh
```

<div class="callout warn">
  <span class="ct">The group key is the whole decision</span>
  Keyed on <code>github.ref</code> with cancellation you get one run per branch — correct for CI, and every force-push stops wasting a full pipeline. Keyed on an environment <b>without</b> cancellation you get one deploy at a time, queued — correct for CD. Getting these backwards either kills a release halfway through or serialises every pull request behind every other one.
</div>

Because they need different keys, a real pipeline declares both, at different scopes.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add workflow-level concurrency keyed on <code>github.ref</code> with <code>cancel-in-progress: true</code>, and a job that sleeps 60 seconds.</li>
    <li>Push twice in quick succession and watch the first run.</li>
    <li>Now add a deploy job with its own group and <code>cancel-in-progress: false</code>, and push twice again.</li>
  </ol>
  <em>the first CI run is cancelled the moment the second starts — that is the saving. The deploy job instead <b>queues</b>, which is what you want for a release. Seeing both makes the group-key decision concrete.</em>
</div>

## Path filters and the required-check trap

```yaml
on:
  pull_request:
    paths-ignore: ['docs/**', '**/*.md']
  push:
    branches: [main]
    paths: ['src/**', 'requirements.txt']
```

<div class="callout warn">
  <span class="ct">A skipped required check blocks the pull request forever</span>
  If branch protection <b>requires</b> a check and a path filter skips its workflow, the PR waits for a report that will never come. The standard remedy is a second lightweight workflow with the <b>same job name</b>, triggered on the excluded paths, that succeeds immediately.
</div>

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

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Make your <code>test</code> job a required status check in branch protection.</li>
    <li>Add <code>paths-ignore: ['**/*.md']</code> to the <code>pull_request</code> trigger.</li>
    <li>Open a pull request that changes only the README.</li>
    <li>Add the same-named stub workflow and re-open the pull request.</li>
  </ol>
  <em>the doc-only pull request sits on "Expected — waiting for status" forever, unmergeable, with no error anywhere. The stub reports immediately and unblocks it. Worth causing once on purpose.</em>
</div>

## Triggers in depth

Beyond the basics, three triggers unlock patterns you cannot build otherwise.

```yaml
# Chain workflows: run after another one finishes
on:
  workflow_run:
    workflows: ['CI']
    types: [completed]
    branches: [main]

jobs:
  publish:
    if: github.event.workflow_run.conclusion == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist
          run-id: ${{ github.event.workflow_run.id }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

```yaml
# Triggered from outside GitHub, by an API call
on:
  repository_dispatch:
    types: [deploy-request]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh --env "${{ github.event.client_payload.environment }}"
```

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/OWNER/REPO/dispatches \
  -d '{"event_type":"deploy-request","client_payload":{"environment":"staging"}}'
```

| Trigger | Note |
|---|---|
| `pull_request` `types` | Default is `opened`, `synchronize`, `reopened`. Add `ready_for_review`, `labeled` as needed |
| `schedule` | UTC only, default branch only, and **queued** rather than punctual on busy repositories |
| `workflow_run` | Runs in the **base** repository context with a writable token — see Senior |
| `repository_dispatch` | Needs a token with `contents: write`; payload arrives as `client_payload` |

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Build a two-workflow chain: the first uploads an artifact, the second uses <code>workflow_run</code> and downloads it with <code>run-id</code>.</li>
    <li>Gate the second on <code>github.event.workflow_run.conclusion == 'success'</code>, then make the first one fail.</li>
    <li>Add a <code>repository_dispatch</code> trigger and fire it with the <code>curl</code> command above.</li>
  </ol>
  <em>the chained workflow runs only after success, and the dispatch fires from outside GitHub entirely. Note the second workflow runs against the <b>default branch</b> version of itself — the detail that matters for security at Senior level.</em>
</div>

## Debugging, one level deeper

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>1</span><strong>Read the trigger first</strong><small>Half of "it did not run" is a branch filter, a path filter, or a fork pull request.</small></div>
  <div class="guide-timeline-item"><span>2</span><strong>Dump the context</strong><small><code>run: echo '${{ toJSON(github) }}'</code> answers most "why didn't my condition match" questions in one run.</small></div>
  <div class="guide-timeline-item"><span>3</span><strong>Re-run with debug logging</strong><small>The <b>Re-run</b> menu has a checkbox. Re-run only the failed job for a two-minute answer.</small></div>
  <div class="guide-timeline-item"><span>4</span><strong>Compare against the last green run</strong><small>The difference is often environmental — runner image version, an action release, a cache hit that became a miss.</small></div>
  <div class="guide-timeline-item"><span>5</span><strong>Bypass the cache</strong><small>Delete the entry from the Caches page or change the key. Stale caches produce failures that make no sense against the code.</small></div>
  <div class="guide-timeline-item"><span>6</span><strong>Bisect in a scratch workflow</strong><small>Copy the failing job into its own file with <code>workflow_dispatch</code> and delete half the steps at a time.</small></div>
</div>

```yaml
# Worth keeping permanently: diagnostics that only run after a failure
- name: Diagnostics
  if: failure()
  run: |
    echo "runner image : $ImageVersion"
    echo "ref / sha    : $GITHUB_REF / $GITHUB_SHA"
    echo "cache hit    : ${{ steps.deps.outputs.cache-hit }}"
    df -h && free -m
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add a step that dumps <code>toJSON(github.event)</code> and run it on both a push and a pull request.</li>
    <li>Re-run one job with <b>Enable debug logging</b> ticked and compare the log length.</li>
    <li>Add the <code>if: failure()</code> diagnostics step and force a failure.</li>
    <li>Delete a cache entry from <b>Actions → Caches</b> and re-run.</li>
  </ol>
  <em>the event payloads are strikingly different between the two triggers, which explains most condition bugs. And the diagnostics step gives you runner image, ref, and cache state for free on every future failure.</em>
</div>

## Putting it all together

Every topic from this level in one pipeline.

```yaml .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    paths-ignore: ['docs/**', '**/*.md']
  workflow_dispatch:
    inputs:
      run-e2e:
        type: boolean
        default: false

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    strategy:
      fail-fast: false
      matrix:
        python: ['3.11', '3.12']
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: postgres }
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready --health-interval 10s --health-retries 5
    env:
      DATABASE_URL: postgres://postgres:postgres@localhost:5432/postgres
    outputs:
      coverage: ${{ steps.cov.outputs.pct }}
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup
        with:
          python-version: ${{ matrix.python }}
      - id: cov
        run: |
          pytest -q --cov --cov-report=xml --junitxml=reports/junit-${{ matrix.python }}.xml
          echo "pct=$(coverage report --format=total)" >> "$GITHUB_OUTPUT"
      - if: always()
        uses: actions/upload-artifact@v4
        with:
          name: reports-${{ matrix.python }}
          path: reports/
          retention-days: 7
          if-no-files-found: error
      - if: always()
        run: echo "| py${{ matrix.python }} | ${{ steps.cov.outputs.pct }}% |" >> "$GITHUB_STEP_SUMMARY"

  build:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.meta.outputs.version }}
    steps:
      - uses: actions/checkout@v4
      - id: meta
        run: echo "version=1.4.${{ github.run_number }}" >> "$GITHUB_OUTPUT"
      - run: make build
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: dist/ }

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://app.example.com
    concurrency:
      group: deploy-production
      cancel-in-progress: false
    steps:
      - uses: actions/download-artifact@v4
        with: { name: dist, path: dist/ }
      - env:
          TOKEN: ${{ secrets.DEPLOY_TOKEN }}
        run: ./deploy.sh --version "${{ needs.build.outputs.version }}" --region "${{ vars.AWS_REGION }}"

  report:
    needs: [test, build, deploy]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - run: |
          echo "test   : ${{ needs.test.result }}"
          echo "build  : ${{ needs.build.result }}"
          echo "deploy : ${{ needs.deploy.result }}"
```

<div class="guide-try">
  <span class="ct">Try it — the one that matters</span>
  <ol>
    <li>Take this pipeline into a real project and get it green.</li>
    <li>Confirm the concurrency cancellation works by pushing twice quickly.</li>
    <li>Confirm the deploy job pauses for approval and that the report job runs even when something fails.</li>
    <li>Then remove one safeguard at a time — the health check, the cache key, the unique artifact name — and observe exactly what breaks.</li>
  </ol>
  <em>a production-shaped pipeline you built rather than copied, plus first-hand knowledge of what each safeguard prevents. That last step turns this from a recipe into understanding.</em>
</div>

## What continues in Senior

You can now build a pipeline that is fast, that does not repeat work, that moves data between stages deliberately, that tests against a real database and several language versions, that is shared across repositories rather than copy-pasted, that gates deployment behind a human, and that cannot ship two releases simultaneously.

**Senior takes the same topics one level further and adds what you own when CI/CD is your responsibility.** Every topic above reappears with a security or scale dimension:

| This level | Senior adds |
|---|---|
| Triggers | The **trust model** — which triggers give fork code a privileged token |
| Secrets | OIDC, so there is no stored credential to leak |
| `permissions` (mentioned only) | Least privilege in full, and why declaring one scope zeroes the rest |
| Actions you consume | Actions you **author** — composite, JavaScript, Docker |
| Reusable workflows | Running them as a versioned platform across sixty repositories |
| Runners | Self-hosted strategy, ephemerality, and the cost model |
| Caching | Container layer caching with Buildx, and cache poisoning |
| Debugging | Observability metrics, and incident playbooks |
| Expressions | Script injection, and why event data never touches a shell |
