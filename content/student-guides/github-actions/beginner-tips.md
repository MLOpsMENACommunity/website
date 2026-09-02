Almost every problem a beginner hits comes from one of two things: a YAML mistake, or forgetting that the runner is a brand-new empty machine. Start with the error table, then work through the habits underneath it.

## Common errors at this level

Find your symptom. Nearly all of these are one of the two root causes above.

| Symptom | Real cause | Fix |
|---|---|---|
| Nothing appears in the Actions tab | File is not in `.github/workflows/` | Fix the path — no error is reported for this |
| "No such file or directory" for a file you can see | The runner starts empty | Add `- uses: actions/checkout@v4` first |
| Cryptic YAML parse error | A tab character, or uneven indentation | Spaces only, two per level |
| `python-version: 3.10` installs Python 3.1 | YAML read it as a number | Quote it: `'3.10'` |
| Deploy job cannot find `dist/` | Different job = different machine | Upload an artifact, download it |
| `cd` in one step has no effect on the next | New shell per step | `working-directory:` on the step |
| A variable is empty in the next step | `export` dies with the step | `echo "K=v" >> "$GITHUB_ENV"` |
| `if:` never matches on `main` | `github.ref` is `refs/heads/main` | Compare the full ref |
| Test report missing after a failure | The failed step stopped the job | `if: always()` on the upload |
| Cron job never fires | UTC, and default branch only | Add `workflow_dispatch` to test it |
| Secrets empty on a contributor's PR | Fork PRs get no secrets, by design | Expected — do not work around it |

## The tips that pay off most

<div class="cards">
  <div class="card"><div class="icon">🧩</div><h4>Install a YAML linter</h4><p>The Red Hat YAML extension knows the workflow schema and catches errors as you type, not five minutes into a run.</p></div>
  <div class="card"><div class="icon">🖐️</div><h4>Add <code>workflow_dispatch</code></h4><p>Costs nothing and lets you re-run without inventing a commit. Put it on anything you are developing.</p></div>
  <div class="card"><div class="icon">⚡</div><h4>Add <code>cache:</code></h4><p>One line on your setup action makes every run after the first noticeably faster. There is no reason to skip it.</p></div>
  <div class="card"><div class="icon">💾</div><h4>Add <code>if: always()</code></h4><p>On anything that saves a report. A red run's diagnostics are the ones you actually need.</p></div>
  <div class="card"><div class="icon">⏱️</div><h4>Add <code>timeout-minutes</code></h4><p>The default ceiling is six hours. One hung job with no timeout quietly eats your allowance.</p></div>
  <div class="card"><div class="icon">🔎</div><h4>Print what you doubt</h4><p>A step is a shell. <code>pwd</code>, <code>ls -la</code>, <code>echo "$VAR"</code> resolve most confusion in one run.</p></div>
</div>

## Set your editor up so it catches YAML for you

Do this before anything else. It removes an entire category of wasted runs.

Install the Red Hat **YAML** extension for VS Code. It understands the workflow schema, so a misplaced key or a bad indent is underlined while you type rather than discovered five minutes into a run. Then add an `.editorconfig` at your repository root:

```text .editorconfig
[*.{yml,yaml}]
indent_style = space
indent_size = 2
```

That single file prevents the nastiest beginner error, because a tab character in YAML is a hard parse failure and the error message never says the word "tab". While you are in there, turn on **View → Render Whitespace → All** so alignment problems become visible instead of mysterious.

<div class="callout tip">
  <span class="ct">You can also just edit on github.com</span>
  Editing a workflow file in the browser gives you the same schema hints and a syntax check before you commit. For a one-line fix that is faster than cloning.
</div>

## "My workflow isn't running"

This is the most reported problem and it is almost never a broken workflow. Work through these in order.

<ol class="guide-steps">
  <li><b>Check the folder path character by character</b>It must be <code>.github/workflows/</code>. Not <code>.github/workflow/</code>, not <code>github/workflows/</code>, not the repository root. A file in the wrong place is silently ignored — no error, no warning, nothing in the Actions tab.</li>
  <li><b>Check the file extension</b><code>.yml</code> or <code>.yaml</code>. A file saved as <code>ci.yml.txt</code> looks right in a file listing and does nothing.</li>
  <li><b>Read your <code>on:</code> block</b>A <code>branches: [main]</code> filter means pushes to your feature branch do nothing. This is correct behaviour that looks like a bug.</li>
  <li><b>Check whether the file is on the branch you pushed</b>A workflow only runs if it exists on the branch that triggered it. Adding CI on a feature branch and pushing to a different branch runs nothing.</li>
  <li><b>If it is a schedule, wait longer and check the timezone</b><code>cron</code> is UTC, only runs from the default branch, and on busy repositories is queued rather than punctual. Never test a schedule by waiting for it — add <code>workflow_dispatch</code> and click the button.</li>
  <li><b>Look for a syntax error</b>A file that fails to parse shows up in the Actions tab as a failed run with a YAML error, so if you see nothing at all it is one of the reasons above, not syntax.</li>
</ol>

## The empty-machine problems

These four failures all have the same root cause, and once you internalise "the runner starts with nothing and dies at the end" they all become obvious.

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>1</span><strong>Missing <code>actions/checkout</code></strong><small>Symptom: "no such file or directory" for a file you can plainly see in your repository. Fix: make <code>- uses: actions/checkout@v4</code> the first step.</small></div>
  <div class="guide-timeline-item"><span>2</span><strong>Expecting files to survive between jobs</strong><small>Symptom: the deploy job cannot find the <code>dist/</code> that the build job created. Fix: upload an artifact and download it, or merge the two jobs into one.</small></div>
  <div class="guide-timeline-item"><span>3</span><strong><code>cd</code> in one step, the command in the next</strong><small>Symptom: the command runs in the wrong directory. Each <code>run</code> is a fresh shell starting at the workspace root. Fix: <code>working-directory:</code> on the step.</small></div>
  <div class="guide-timeline-item"><span>4</span><strong><code>export</code> a variable and read it later</strong><small>Symptom: the variable is empty in the next step. Fix: append to <code>$GITHUB_ENV</code> instead.</small></div>
</div>

```yaml
# Does not work — the variable dies with the step
- run: export VERSION=1.2.3
- run: echo "$VERSION"          # prints nothing

# Works — written to the job's environment
- run: echo "VERSION=1.2.3" >> "$GITHUB_ENV"
- run: echo "$VERSION"          # prints 1.2.3

# Does not work — the directory change does not persist
- run: cd frontend
- run: npm ci

# Works
- run: npm ci
  working-directory: frontend
```

## YAML gotchas that produce baffling errors

| What you wrote | What happens | Fix |
|---|---|---|
| A tab character for indentation | Hard parse error with an unhelpful message | Spaces only, two per level |
| `on: [push]` then also `on: pull_request` | The second `on:` silently replaces the first — duplicate keys are not an error | One `on:` block containing both |
| `if: ${{ github.ref == 'refs/heads/main' }}` mixed with `&&` outside the braces | Confusing partial evaluation | Put the whole condition inside, or omit the braces entirely in `if:` |
| `version: 3.10` for a language version | YAML reads it as the number 3.1 | Quote it: `'3.10'` |
| `run: echo hello: world` | The colon makes YAML think it is a nested key | Quote the string: `run: "echo hello: world"` |
| Uneven indentation inside a `steps:` list | Steps silently merge or disappear | Every `- ` at the same column |

<div class="callout warn">
  <span class="ct">The quoting one bites everybody</span>
  <code>python-version: 3.10</code> installs Python 3.1, because YAML parses it as a decimal number and drops the trailing zero. Always quote version numbers: <code>python-version: '3.10'</code>.
</div>

## When the log says something confusing

Three habits resolve the large majority of beginner failures without any special tooling.

**Print the value you are branching on.** If an `if:` is not behaving, add a step that echoes the thing being compared. Nine times out of ten `github.ref` is `refs/heads/main` and you were comparing it to `main`.

```yaml
- name: What am I actually working with
  run: |
    echo "ref        : ${{ github.ref }}"
    echo "event      : ${{ github.event_name }}"
    echo "actor      : ${{ github.actor }}"
    pwd
    ls -la
```

**Run the failing command locally first.** If `pytest -q` fails on your laptop too, the workflow is innocent and you are debugging your project, not your pipeline. This one question saves hours.

**Read the log from the top of the failing step.** Tools print a summary at the end; the cause is usually much earlier. GitHub expands the failed step for you — scroll up inside it rather than reading the last line.

<div class="callout tip">
  <span class="ct">Two switches worth knowing early</span>
  Re-run a workflow with <b>Enable debug logging</b> ticked for far more detail. And inside a <code>run</code> block, <code>set -x</code> makes the shell print each command before executing it, which shows you exactly where a script died.
</div>

## Make your feedback loop shorter

The default cycle — edit, commit, push, wait, read — is painfully slow while you are learning. Three cheap fixes:

Add `workflow_dispatch` to anything you are actively developing, so you can re-run from the Actions tab without inventing a commit.

Use **Re-run failed jobs** rather than re-running everything, so you retry the red job in two minutes instead of the whole pipeline in fifteen.

Develop on a scratch workflow with an unfiltered `on: push` on a throwaway branch, so you never have to wonder whether the trigger matched. Delete or tighten it before merging — an unfiltered trigger on a shared repository burns minutes for nobody's benefit.

```yaml .github/workflows/scratch.yml
name: Scratch

on:
  push:               # every push on every branch, while experimenting
  workflow_dispatch:  # plus a manual button

jobs:
  try:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "trying something"
```

## Name things properly from day one

The Actions tab is just a list of names. If the names are bad, the tab is useless — and fixing this costs nothing.

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Readable</h4>
    <ul>
      <li><code>name: CI</code> on every workflow</li>
      <li>Files called <code>ci.yml</code>, <code>release.yml</code>, <code>nightly.yml</code></li>
      <li><code>- name: Install dependencies</code> on any non-obvious step</li>
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

## Version references: what to copy and what to avoid

You will be copying `uses:` lines from documentation for months, so know what you are copying.

| Reference | Meaning | When |
|---|---|---|
| `actions/checkout@v4` | Major-version tag, moves with patches | Default for official and well-known actions |
| `actions/checkout@v4.1.7` | One exact release | You want reproducibility and will bump it yourself |
| `actions/checkout@8f4b7f8…` | An exact commit | Third-party actions, or a sensitive repository |
| `actions/checkout@main` | A branch | Almost never |

<div class="callout warn">
  <span class="ct">Never point at a branch on somebody else's action</span>
  <code>@main</code> means "whatever is on that branch the instant my job starts". That is a remote-code-execution surface aimed at your own repository. Use a tag at minimum, and a commit SHA if the action is not from a name you recognise.
</div>

## Getting around the interface quickly

| Where | Do this |
|---|---|
| A failed run | Click the red job, then the red step — it expands to the failure automatically |
| A long log | Press <code>/</code> to search inside it; the gear icon downloads the raw text |
| The run list | Filter with `status:failure`, `branch:main`, `event:schedule`, `actor:username` |
| Any run | **Re-run failed jobs** for a retry; **Re-run all jobs** to start clean |
| Any step | Toggle timestamps to see how long each line took — the cheapest way to find the slow part |

The URL is also a shortcut: `github.com/OWNER/REPO/actions/workflows/ci.yml` jumps straight to the history of one workflow. Bookmark it for the pipeline you watch most.

## Small habits that pay off immediately

**Add `cache:` to your setup action.** One line on `setup-node`, `setup-python`, `setup-java`, or `setup-go` and every run after the first gets noticeably faster. There is no reason not to.

**Put `if: always()` on anything that saves a report.** A green run's report is nice to have; a red run's report is the entire point. Without this, a failing test skips the upload.

**Add `timeout-minutes` to every job.** The default ceiling is six hours. A hung job with no timeout quietly burns your allowance until somebody notices.

**Quote version numbers.** Always. `'3.11'`, `'20'`, `'1.21'`.

**Commit one change at a time while learning.** If you change the trigger, the setup action, and the test command in one commit and it goes red, you have three suspects instead of one.

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15          # never let a hung job run for six hours
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11' # quoted, always
          cache: pip             # free speed
      - run: pip install -r requirements.txt
      - run: pytest -q --junitxml=reports/junit.xml
      - if: always()             # the failure case is the interesting one
        uses: actions/upload-artifact@v4
        with:
          name: test-report
          path: reports/
```

Those five lines of extra care are the difference between a workflow you fight and a workflow you forget about because it just works.
