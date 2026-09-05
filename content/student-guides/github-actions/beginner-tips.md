Part one of three. Almost every beginner problem comes from one of two things: a YAML mistake, or forgetting the runner is a brand-new empty machine. Start with the error table, then work through the habits underneath it.

## Common errors at this level

| Symptom | Real cause | Fix |
|---|---|---|
| Nothing appears in the Actions tab | File not in `.github/workflows/` | Fix the path: no error is reported |
| "No such file or directory" for a repo file | The runner starts empty | `- uses: actions/checkout@v4` first |
| Cryptic YAML parse error | A tab character, or uneven indentation | Spaces only, two per level |
| `python-version: 3.10` installs 3.1 | YAML read it as a number | Quote it: `'3.10'` |
| Build hangs forever | App start command placed in a `run` step | Long-running servers do not belong in CI steps |
| Deploy job cannot find `dist/` | Different job = different machine | Upload an artifact, download it |
| `cd` has no effect on the next step | New shell per step | `working-directory:` on the step |
| Variable empty in the next step | `export` dies with the step | `echo "K=v" >> "$GITHUB_ENV"` |
| Variable empty in the *same* step | `$GITHUB_ENV` applies from the next step | Use a local shell variable too |
| `if` never matches on main | `github.ref` is `refs/heads/main` | Compare the full ref |
| Test report missing after a failure | The failed step stopped the job | `if: always()` on the upload |
| Cron job never fires | UTC, and default branch only | Add `workflow_dispatch` to test it |
| Secrets empty on a contributor's PR | Fork PRs get no secrets, by design | Expected: do not work around it |
| Matrix job disappeared from checks | Adding an axis renamed the job | Set an explicit `name:` |
| Second run is as slow as the first | No dependency cache | `cache:` on the setup action |
| Job ran for hours | No timeout; default ceiling is six hours | `timeout-minutes:` on every job |

## The habits that pay off most

<div class="cards">
  <div class="card"><div class="icon">🧩</div><h4>Install a YAML linter</h4><p>The Red Hat YAML extension knows the workflow schema and catches errors as you type, not five minutes into a run.</p></div>
  <div class="card"><div class="icon">🖐️</div><h4>Add <code>workflow_dispatch</code></h4><p>Costs nothing and lets you re-run without inventing a commit. Put it on anything you are developing.</p></div>
  <div class="card"><div class="icon">⚡</div><h4>Add <code>cache:</code></h4><p>One line on your setup action makes every run after the first noticeably faster.</p></div>
  <div class="card"><div class="icon">💾</div><h4>Add <code>if: always()</code></h4><p>On anything that saves a report. A red run's diagnostics are the ones you need.</p></div>
  <div class="card"><div class="icon">⏱️</div><h4>Add <code>timeout-minutes</code></h4><p>The default ceiling is six hours. One hung job eats your allowance.</p></div>
  <div class="card"><div class="icon">🔎</div><h4>Print what you doubt</h4><p>A step is a shell. <code>pwd</code>, <code>ls -la</code>, <code>echo "$VAR"</code> resolve most confusion in one run.</p></div>
</div>

## Set your editor up so it catches YAML for you

Do this before anything else. It removes an entire category of wasted runs.

```text .editorconfig
[*.{yml,yaml}]
indent_style = space
indent_size = 2
```

Install the Red Hat **YAML** extension for VS Code, then turn on **View → Render Whitespace → All** so alignment problems become visible instead of mysterious. The `.editorconfig` prevents the nastiest error, because a tab in YAML is a hard parse failure whose message never says the word "tab".

<div class="callout tip">
  <span class="ct">You can also just edit on github.com</span>
  Editing a workflow file in the browser gives you the same schema hints and a syntax check before you commit. For a one-line fix that is faster than cloning.
</div>

## "My workflow isn't running"

The most reported problem, and almost never a broken workflow. Work through these in order.

<ol class="guide-steps">
  <li><b>Check the folder path character by character</b>It must be <code>.github/workflows/</code>, not <code>.github/workflow/</code>, not <code>github/workflows/</code>, not the repository root. A file in the wrong place is silently ignored: no error, no warning, nothing in the Actions tab.</li>
  <li><b>Check the file extension</b><code>.yml</code> or <code>.yaml</code>. A file saved as <code>ci.yml.txt</code> looks right in a listing and does nothing.</li>
  <li><b>Read your <code>on:</code> block</b>A <code>branches: [main]</code> filter means pushes to your feature branch do nothing. Correct behaviour that looks like a bug.</li>
  <li><b>Check the file is on the branch you pushed</b>A workflow only runs if it exists on the triggering branch. Adding CI on a feature branch and pushing elsewhere runs nothing.</li>
  <li><b>If it is a schedule, check the timezone</b><code>cron</code> is UTC, only runs from the default branch, and is queued rather than punctual. Never test a schedule by waiting. Add <code>workflow_dispatch</code> and click the button.</li>
  <li><b>Look for a parse error</b>A file that fails to parse appears in the Actions tab as a failed run with a YAML error. If you see <em>nothing at all</em>, it is one of the reasons above.</li>
</ol>

## The empty-machine problems

Four failures, one root cause. Internalise "the runner starts with nothing and dies at the end" and they all become obvious.

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>1</span><strong>Missing <code>actions/checkout</code></strong><small>Symptom: "no such file or directory" for a file you can plainly see in your repository. Fix: make it the first step.</small></div>
  <div class="guide-timeline-item"><span>2</span><strong>Expecting files to survive between jobs</strong><small>Symptom: the deploy job cannot find the <code>dist/</code> the build job created. Fix: upload an artifact and download it, or merge the jobs.</small></div>
  <div class="guide-timeline-item"><span>3</span><strong><code>cd</code> in one step, the command in the next</strong><small>Each <code>run</code> is a fresh shell starting at the workspace root. Fix: <code>working-directory:</code>.</small></div>
  <div class="guide-timeline-item"><span>4</span><strong><code>export</code> a variable and read it later</strong><small>Symptom: empty in the next step. Fix: append to <code>$GITHUB_ENV</code>.</small></div>
</div>

```yaml
# Does not work — the variable dies with the step
- run: export VERSION=1.2.3
- run: echo "$VERSION"          # prints nothing

# Works — written to the job's environment
- run: echo "VERSION=1.2.3" >> "$GITHUB_ENV"
- run: echo "$VERSION"          # 1.2.3

# Does not work — the directory change does not persist
- run: cd frontend
- run: npm ci

# Works
- run: npm ci
  working-directory: frontend
```

<div class="callout warn">
  <span class="ct">The one that catches people twice</span>
  A value written to <code>$GITHUB_ENV</code> is <b>not</b> readable in the step that wrote it, only from the next step onwards. If you need it in the same step, set a normal shell variable as well.
</div>

## YAML gotchas that produce baffling errors

| What you wrote | What happens | Fix |
|---|---|---|
| A tab character for indentation | Hard parse error, unhelpful message | Spaces only, two per level |
| `on: [push]` and later another `on:` | The second silently replaces the first | One `on:` block with both |
| `version: 3.10` | YAML reads the number 3.1 | Quote it: `'3.10'` |
| `run: echo hello: world` | The colon looks like a nested key | Quote the string |
| Uneven indentation in `steps:` | Steps silently merge or disappear | Every `- ` at the same column |
| `if: ${{ a }} && b` | Confusing partial evaluation | Put the whole condition inside, or omit braces entirely in `if:` |

## Handle secrets correctly from day one

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Do</h4>
    <ul>
      <li>Pass via <code>env:</code> and read <code>"$TOKEN"</code> in the script</li>
      <li>Use <code>GITHUB_TOKEN</code> for anything acting on the repository</li>
      <li>Expect fork pull requests to have none</li>
      <li>Use <code>vars</code> for non-secret configuration</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Do not</h4>
    <ul>
      <li><code>echo "$TOKEN"</code> to "check it is set"</li>
      <li>Interpolate a secret into a command line</li>
      <li>Commit a <code>.env</code> and read it in CI</li>
      <li>Assume masking protects a transformed value</li>
    </ul>
  </div>
</div>

```yaml
# Right: the secret never appears in a command line
- name: Deploy
  env:
    API_TOKEN: ${{ secrets.API_TOKEN }}
  run: ./deploy.sh

# To check a secret exists without printing it
- run: |
    if [ -z "${API_TOKEN:-}" ]; then echo "API_TOKEN is not set" >&2; exit 1; fi
  env:
    API_TOKEN: ${{ secrets.API_TOKEN }}
```

## Cache and artifact habits

```yaml
# Free speed — use the built-in cache before reaching for actions/cache
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: npm

# Diagnostics that survive a red run
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: reports-${{ matrix.python }}    # unique per matrix cell
    path: reports/
    retention-days: 7                     # do not keep CI noise for 90 days
    if-no-files-found: error              # fail loudly, not silently empty
```

| Habit | Reason |
|---|---|
| `cache:` on every setup action | One line, large payoff, no key to design |
| `if: always()` on report uploads | A red run's report is the whole point |
| Unique artifact name per matrix cell | Same-name uploads collide rather than merge |
| Short `retention-days` for CI | Artifacts count against repository storage |
| `if-no-files-found: error` | A silently empty artifact wastes an afternoon later |

## Debug like the runner is a terminal, because it is

```yaml
- name: What am I actually working with
  run: |
    echo "ref        : ${{ github.ref }}"
    echo "event      : ${{ github.event_name }}"
    echo "actor      : ${{ github.actor }}"
    pwd
    ls -la
    python --version
```

Three habits resolve most beginner failures with no special tooling:

**Print the value you are branching on.** Nine out of ten "my `if` doesn't work" cases are `github.ref` being `refs/heads/main` while you compared to `main`.

**Run the failing command locally first.** If `pytest -q` fails on your laptop too, the workflow is innocent and you are debugging your project.

**Read the log from the top of the failing step.** Tools print a summary at the end; the cause is usually much earlier. GitHub expands the failed step, so scroll up inside it.

<div class="callout tip">
  <span class="ct">Two switches worth knowing early</span>
  Re-run with <b>Enable debug logging</b> ticked for far more detail. Inside a <code>run</code> block, <code>set -x</code> makes the shell print each command before executing it, showing exactly where a script died.
</div>

## Make your feedback loop shorter

Add `workflow_dispatch` to anything you are actively developing, so you can re-run from the Actions tab without inventing a commit. Use **Re-run failed jobs** rather than re-running everything. Develop on a scratch workflow with an unfiltered trigger so you never wonder whether it matched.

```yaml .github/workflows/scratch.yml
name: Scratch

on:
  push:               # every push on every branch, while experimenting
  workflow_dispatch:  # plus a manual button

jobs:
  try:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - run: echo "trying something"
```

Delete or tighten it before merging, because an unfiltered trigger on a shared repository burns minutes for nobody's benefit.

## Name things so the Actions tab stays readable

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Readable</h4>
    <ul>
      <li><code>name: CI</code> on every workflow</li>
      <li>Files called <code>ci.yml</code>, <code>release.yml</code>, <code>nightly.yml</code></li>
      <li><code>- name: Install dependencies</code> on non-obvious steps</li>
      <li>Job ids that read as nouns: <code>build</code>, <code>test</code>, <code>deploy</code></li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Unreadable</h4>
    <ul>
      <li>No <code>name</code>, so the tab shows a file path</li>
      <li><code>main.yml</code>, <code>main2.yml</code>, <code>test-copy.yml</code></li>
      <li>Steps shown as a raw command, truncated mid-pipe</li>
      <li>Job ids like <code>job1</code>, <code>build2</code></li>
    </ul>
  </div>
</div>

`run-name` sets the title of an individual run, which pays off for manual workflows: `run-name: Deploy ${{ inputs.environment }} by @${{ github.actor }}`.

## Version references: what to copy and what to avoid

| Reference | Meaning | When |
|---|---|---|
| `actions/checkout@v4` | Major-version tag, moves with patches | Default for official actions |
| `actions/checkout@v4.1.7` | One exact release | You want reproducibility |
| `actions/checkout@8f4b7f8…` | An exact commit | Third-party actions |
| `actions/checkout@main` | A branch | Almost never |

<div class="callout warn">
  <span class="ct">Never point at a branch on somebody else's action</span>
  <code>@main</code> means "whatever is on that branch the instant my job starts", a remote-code-execution surface aimed at your own repository. Use a tag at minimum, and a commit SHA if the action is not from a name you recognise.
</div>

## Getting around the interface quickly

| Where | Do this |
|---|---|
| A failed run | Click the red job, then the red step. It expands automatically |
| A long log | Press <code>/</code> to search inside it; the gear icon downloads raw text |
| The run list | Filter with `status:failure`, `branch:main`, `event:schedule`, `actor:username` |
| Any run | **Re-run failed jobs** to retry; **Re-run all jobs** to start clean |
| Any step | Toggle timestamps to see how long each line took |

`github.com/OWNER/REPO/actions/workflows/ci.yml` jumps straight to one workflow's history, worth bookmarking for the pipeline you watch most.

## A starter workflow worth keeping

Every line here is something from this page.

```yaml .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    paths-ignore: ['docs/**', '**/*.md']    # docs changes skip the suite
  workflow_dispatch:                        # always re-runnable by hand

permissions:
  contents: read                            # least privilege, one line

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15                     # never six hours
    strategy:
      fail-fast: false                      # every version reports
      matrix:
        python: ['3.11', '3.12']
    steps:
      - uses: actions/checkout@v4           # the runner starts empty

      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python }}   # quoted in the matrix
          cache: pip                        # free speed-up

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Lint
        run: ruff check .

      - name: Test
        run: pytest -q --junitxml=reports/junit-${{ matrix.python }}.xml

      - name: Keep the report
        if: always()                        # especially when tests fail
        uses: actions/upload-artifact@v4
        with:
          name: reports-${{ matrix.python }}
          path: reports/
          retention-days: 7
          if-no-files-found: error
```

Seven details in there are the whole lesson of this page: checkout first, quoted versions, `cache:` for free speed, `timeout-minutes` as a guard, `fail-fast: false` so you see the pattern, `if: always()` so diagnostics survive, and a unique artifact name per matrix cell.
