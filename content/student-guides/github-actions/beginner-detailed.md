This is part one of three. It covers **everything you need to do real work with GitHub Actions**, not a teaser. By the end you can write, read, debug, and ship a production CI/CD pipeline. Mid-level and Senior take the same topics further; nothing here is thrown away.

Each section ends with a **Try it** task. Do them as you go. They take a few minutes each, and the concepts stick only once you have watched your own run go green.

## What is GitHub Actions?

GitHub Actions is GitHub's **built-in automation platform**. You describe work you want done in a text file, commit that file to your repository, and GitHub runs the work for you on a computer it creates on demand.

Compare that to what it replaces.

Before this existed, automating a project meant running a separate machine (a Jenkins server, a TeamCity box, something in a cupboard) keeping it patched, giving it credentials to reach your code, and hoping the person who configured it three years ago left notes. Actions removes that entire layer. There is no server to maintain, because GitHub provisions a fresh machine for each piece of work and destroys it afterwards.

<div class="flow">
  <div class="node">YOU PUSH<small>git push</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">GITHUB REACTS<small>an event fires</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">MACHINE RUNS<small>fresh VM, your steps</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">GREEN OR RED<small>in ~2 minutes</small></div>
</div>

Two consequences of that design explain most of what follows. Notice them now rather than discovering them later.

**The instructions live inside your repository.** That means your automation is versioned, branched, and reviewed exactly like your source code. If a pipeline breaks, `git log` tells you who changed it and why. You can propose a change to it in a pull request and have a colleague review it before it takes effect. This sounds administrative; in practice it is the single biggest reason teams stop being afraid of their build system.

**Every run starts on a clean machine.** There is no leftover state from last time, no "it works on the build server because someone installed something there in 2019". This is a feature, it makes runs reproducible, but it is also the biggest source of confusion for newcomers, and we will come back to it repeatedly.

What people use it for:

<div class="cards">
  <div class="card"><div class="icon">🧪</div><h4>Run tests automatically</h4><p>Every push and pull request gets built and tested without anyone remembering to do it.</p></div>
  <div class="card"><div class="icon">🚀</div><h4>Deploy on merge</h4><p>Code that passed its checks ships itself, to a server, a registry, or a package index.</p></div>
  <div class="card"><div class="icon">📅</div><h4>Scheduled jobs</h4><p>Nightly builds, weekly dependency checks, database backups, cleanup tasks.</p></div>
  <div class="card"><div class="icon">🤖</div><h4>Repository chores</h4><p>Label issues, greet new contributors, close stale threads, publish release notes.</p></div>
</div>

To follow along you need a free GitHub account, the ability to make a commit, and a repository. Any repository, in any language, and a brand-new empty one is the best place to experiment. Public repositories get unlimited free minutes, so a playground costs you nothing.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Create a public repository called <code>actions-playground</code>. It can be empty.</li>
    <li>Open its <strong>Actions</strong> tab. GitHub will offer you starter workflows. Do not pick one yet, just look.</li>
    <li>Open any popular open-source repository you use and click its <strong>Actions</strong> tab.</li>
  </ol>
  <em>your own tab is empty, and the popular project's tab shows dozens of runs with green ticks and red crosses. That list is what you are about to start producing.</em>
</div>

## What are CI and CD?

These two abbreviations appear in every conversation about Actions, so be precise about them. They name practices rather than tools, and Actions is one way to implement them.

### The problem they solve

Imagine three people working on the same project. Every time someone finishes a change, somebody has to remember to run the tests, check the formatting, build the application, and put it on a server. Nobody enjoys that, so it gets skipped when people are busy. Broken code reaches the main branch on a Friday and nobody notices until Monday. Someone deploys from their laptop, and their laptop happens to have a different library version than the server, so it works locally and breaks in production.

Every one of those failures has the same root cause: **a human being is doing the repetitive work.** Humans are excellent at judgement and terrible at performing the same twelve steps identically four hundred times.

### Continuous Integration

**CI** means every change is automatically built and tested the moment it appears.

The word "integration" is about merging work together. Historically, developers would work in isolation for weeks and then merge, a painful event because everyone's changes conflicted at once. Continuous integration means merging small changes frequently and verifying each one immediately. If someone breaks the project, they find out in four minutes rather than four days, while the change is still fresh in their mind and small enough to understand.

In practice, CI is a machine that on every push: fetches your code, installs dependencies, runs the linter, runs the type checker, runs the tests, and reports pass or fail.

### Continuous Delivery and Continuous Deployment

**CD** means that once a change has passed all of its checks, shipping it is also automatic.

Confusingly, CD stands for two related things:

| Term | Means | Human involvement |
|---|---|---|
| Continuous **Delivery** | Every passing change is automatically packaged and made *ready* to release | A person clicks "deploy" |
| Continuous **Deployment** | Every passing change is automatically released to production | None |

Most teams practise continuous delivery and describe it as continuous deployment. The distinction matters in interviews, and it matters when you design a pipeline: adding a human approval gate turns one into the other, and Actions supports both.

<div class="flow">
  <div class="node">COMMIT<small>a change</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">CI<small>build + test</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">CD<small>package + ship</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">PRODUCTION<small>running code</small></div>
</div>

### What this looks like in practice

Put together, CI/CD is a machine that watches your repository and does the boring, critical work identically every single time. The benefits compound in ways that are hard to appreciate until you have worked without them:

| Without CI/CD | With CI/CD |
|---|---|
| "Did you run the tests?" | The tests ran, and the report is on the commit |
| Broken `main` discovered days later | Broken `main` discovered in minutes |
| Deploys are a scary manual ritual | Deploys are a merge |
| "It works on my machine" | It works on a clean machine, every time |
| Release notes written from memory | Release notes generated from commits |
| Only one person knows how to ship | The pipeline is the documentation |

<div class="callout note">
  <span class="ct">Where Actions fits</span>
  GitHub Actions is a <b>CI/CD platform</b>: a way to implement both practices. Jenkins, GitLab CI, CircleCI, and Travis do the same job. What distinguishes Actions is that it lives inside GitHub, so it needs no separate server and no credentials to reach your code.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Pick a project you work on. Write down every manual step between "I finished the code" and "it is running for users".</li>
    <li>Mark each step <strong>CI</strong> (proving the change is safe) or <strong>CD</strong> (shipping it).</li>
    <li>Mark the ones that are identical every time. Those are the ones a machine should do.</li>
  </ol>
  <em>a list of five to ten steps, most of them mechanical. That list is the pipeline you are going to build by the end of this page.</em>
</div>

## Where workflow files live, and why the path is fixed

Instructions for Actions go in files called **workflows**, and the location is exact. Get it wrong and GitHub ignores the file: no error, nothing in the Actions tab, no hint that anything is missing.

```text your repository
my-project/
├── .github/
│   └── workflows/          ← must be exactly this
│       ├── ci.yml          ← becomes active on commit
│       └── release.yml     ← so does this
├── src/
└── README.md
```

Any file in that folder ending `.yml` or `.yaml` becomes an active workflow the moment it is committed. The leading dot on `.github` is intentional: on Linux and macOS it makes the folder hidden, which is why you may not see it in a file browser.

<div class="callout warn">
  <span class="ct">Three ways people get this wrong</span>
  <code>.github/workflow/</code> (missing the <b>s</b>) · <code>github/workflows/</code> (missing the dot) · <code>ci.yml</code> in the repository root. All three do nothing at all, and none of them produce an error message.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>In your playground repository, click <strong>Add file → Create new file</strong>.</li>
    <li>Type the filename as <code>.github/workflows/notes.yml</code> and note how GitHub turns each slash into a folder as you type.</li>
    <li>Put a single comment in the file: <code># scratch space</code>. Commit it.</li>
  </ol>
  <em>the folders now exist in your repository, and the Actions tab still shows nothing, because a workflow with no trigger can never run. You have created the container, not the content.</em>
</div>

## YAML in five minutes, for workflow authors

Workflow files are written in **YAML**, a text format designed to be read by people rather than to be efficient for machines. Almost everything you will write is covered by six rules.

| Rule | Looks like | Means |
|---|---|---|
| Key and value | `name: CI` | Setting `name` is `CI` |
| Two-space indent nests | `jobs:` then `  build:` | `build` belongs to `jobs` |
| Dash makes a list item | `- run: npm test` | One item in a list |
| Hash is a comment | `# runs on PRs` | Ignored by the machine |
| Quote version numbers | `'3.11'` not `3.11` | Unquoted becomes the number 3.1 |
| `|` keeps a multi-line block | `run: |` | Everything indented below is one string |

Indentation replaces the braces and brackets you might know from JSON. Because whitespace carries meaning, two rules are absolute: **use spaces, never tabs**, and keep every item at the same level in the same column.

```yaml
name: Example              # a key with a text value

on: push                   # another key/value pair

jobs:                      # a key whose value is a nested structure
  build:                   #   two more spaces, so build belongs to jobs
    runs-on: ubuntu-latest
    steps:                 #   a key whose value is a list
      - run: echo one      #     list item
      - run: |             #     list item with a multi-line value
          echo two
          echo three
```

<div class="callout warn">
  <span class="ct">The tab character will waste an hour of your life</span>
  A single tab used for indentation is a hard parse error, and the error message never mentions tabs. Configure your editor to insert spaces in YAML files before you write anything real. There is a <code>.editorconfig</code> for exactly this in the Tips &amp; Tricks section.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Open the <code>notes.yml</code> you created and write the <code>Example</code> block above into it, by hand rather than pasting.</li>
    <li>Deliberately break it: remove two spaces from in front of <code>runs-on</code>. Commit.</li>
    <li>Check the Actions tab, then fix the indentation and commit again.</li>
  </ol>
  <em>the broken version appears in the Actions tab as a failed run with a YAML error, proof that GitHub reads the file. Reading that error message once now saves you confusion later.</em>
</div>

## Your first workflow

Enough theory. Create `.github/workflows/hello.yml`. You can do this entirely in the browser via **Add file → Create new file**.

```yaml .github/workflows/hello.yml
name: My First Workflow      # label shown in the Actions tab

on: push                     # the trigger: run on every push

jobs:
  greet:                     # job id — you choose this name
    runs-on: ubuntu-latest   # ask GitHub for a Linux machine
    steps:
      - name: Say hello
        run: echo "Hello from a machine that did not exist a minute ago"

      - name: Show run info
        run: |
          echo "OS         : ${{ runner.os }}"
          echo "Repo       : ${{ github.repository }}"
          echo "Pushed by  : ${{ github.actor }}"
```

Commit it. Committing *is itself a push*, so the workflow triggers immediately. Open the **Actions** tab and watch it run.

Now let me walk through every line, because this small file contains the entire conceptual model.

`name: My First Workflow` is a human label. Omit it and GitHub shows the file path instead, which is why unnamed workflows make the Actions tab hard to read.

`on: push` is the **trigger**, the doorbell. This says "run whenever commits reach any branch". Without an `on:` key a workflow can never run at all, which is why your `notes.yml` did nothing.

`jobs:` opens the list of work. `greet:` is a **job id** that you invent; it identifies this job in the interface and in any dependency you declare later.

`runs-on: ubuntu-latest` asks GitHub for a machine. This is per job, not per workflow, a deliberate design choice we unpack in the next section.

`steps:` is the ordered list of things to do on that machine. Each `- name:` / `run:` pair is one step: `name` is the label in the log, `run` is a shell command executed on the runner.

The `|` in the second step means "the following indented block is one multi-line string", so those three lines run as a small shell script within a single step.

`${{ ... }}` is an **expression**: GitHub substitutes a real value there before the command runs. `runner.os` becomes `Linux`; `github.repository` becomes `your-name/your-repo`.

### What happened while you were watching

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>0s</span><strong>Event fires</strong><small>Your commit created a <code>push</code> event describing the branch, the commit, and who pushed it.</small></div>
  <div class="guide-timeline-item"><span>1s</span><strong>Workflow matched</strong><small>GitHub read every file in <code>.github/workflows/</code> and found one whose <code>on:</code> matched.</small></div>
  <div class="guide-timeline-item"><span>5s</span><strong>Machine created</strong><small>A clean Ubuntu virtual machine booted. Your code was <b>not</b> on it, so remember this.</small></div>
  <div class="guide-timeline-item"><span>8s</span><strong>Steps ran in order</strong><small>Expressions were replaced with real values, then each command executed top to bottom.</small></div>
  <div class="guide-timeline-item"><span>14s</span><strong>Machine destroyed</strong><small>Everything on it is gone. The next push repeats the recipe on a brand-new machine.</small></div>
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Commit the workflow above, then open the run and expand both steps to read their output.</li>
    <li>Add a third step <code>- run: date</code> and find its output in the next run.</li>
    <li>Change <code>on: push</code> to <code>on: workflow_dispatch</code>, commit, then use the <strong>Run workflow</strong> button in the Actions tab.</li>
    <li>Break it on purpose with <code>- run: exit 1</code>. Watch the red cross appear, open the log, then fix it.</li>
  </ol>
  <em>four runs: a green one, a green one with a timestamp, one that only runs when you click, and a red one. Causing that red cross deliberately is the single most useful thing on this page: reading a failure log calmly is the skill everything else depends on.</em>
</div>

## The six building blocks, nested

Every workflow you will ever read is built from six nested concepts. Getting this hierarchy solid is worth more than memorising a hundred YAML keys.

<div class="guide-arch" style="--arch-cols:3">
  <div class="arch-lane" style="--lane-cols:3">
    <span class="arch-label">events. Anything that happens in the repository</span>
    <div class="arch-node" data-kind="entry"><b><code>push</code></b><small>A branch or tag moved</small></div>
    <div class="arch-node" data-kind="entry"><b><code>pull_request</code></b><small>Opened, synchronised, reopened</small></div>
    <div class="arch-node" data-kind="entry"><b><code>schedule</code> · <code>workflow_dispatch</code></b><small>Cron, or a button</small></div>
  </div>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down"></i>
  <div class="arch-lane" style="--lane-cols:1">
    <span class="arch-label">workflow: one YAML file in .github/workflows/</span>
    <div class="arch-node"><b>Declares its triggers, then its jobs</b><small>One file per pipeline. Several files can watch the same event</small></div>
  </div>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down"></i>
  <div class="arch-lane" style="--lane-cols:3">
    <span class="arch-label">jobs: parallel by default, each on its own runner</span>
    <div class="arch-node" data-kind="worker"><b><code>test</code></b><small>Steps run in order, sharing one filesystem</small></div>
    <div class="arch-node" data-kind="worker"><b><code>lint</code></b><small>Starts at the same time as <code>test</code></small></div>
    <div class="arch-node" data-kind="worker"><b><code>deploy</code></b><small><code>needs: [test, lint]</code>, the only way to order</small></div>
  </div>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down" data-flow="optional"></i>
  <div class="arch-node"><b>Steps</b><small><code>run</code> a command, or <code>uses</code> an action</small></div>
  <div class="arch-node" data-kind="external"><b>Runner</b><small>The machine: GitHub-hosted or self-hosted</small></div>
  <div class="arch-node" data-kind="store"><b>Artifacts · cache</b><small>The only way files cross a job boundary</small></div>
  <p class="arch-note"><b>The line that matters:</b> steps share a machine, jobs do not. Everything else in this guide follows from that one fact: <code>runs-on</code> belongs to a job, parallelism is free, and handing files between jobs needs artifacts.</p>
</div>

An **event** is something that happened in your repository. A **workflow** is a file saying which events it cares about and what to do. A **job** is a named group of work running on one machine. A **step** is a single task inside a job. A **runner** is the machine itself. An **action** is a reusable step someone has already written and published.

The relationship that trips up almost everyone is between jobs and steps, so let me be explicit:

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Steps share everything</h4>
    <ul>
      <li>Same machine, same filesystem</li>
      <li>Run in the order written</li>
      <li>Files one step creates, the next can read</li>
      <li>Installed tools persist between them</li>
      <li>A failure stops the rest of the job</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Jobs share nothing</h4>
    <ul>
      <li>Each gets its own fresh machine</li>
      <li>Run <em>at the same time</em> by default</li>
      <li>Files do not cross between them</li>
      <li>No shared installed tools</li>
      <li>Ordered only by <code>needs</code></li>
    </ul>
  </div>
</div>

This is why `runs-on` is a property of a job rather than the workflow: each job is asking for its own computer. It is also why splitting a pipeline into jobs is a real decision with real consequences rather than tidiness. Two jobs run in parallel and finish sooner, but they cannot hand files to each other without extra machinery.

<div class="callout tip">
  <span class="ct">Start with one job and several steps</span>
  Reach for multiple jobs when you want parallelism or a hard ordering gate. Splitting too early creates the "my deploy job cannot find the build output" problem for no benefit.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add a step that creates a file: <code>- run: echo "hello" &gt; note.txt</code>.</li>
    <li>Add another step after it: <code>- run: cat note.txt</code>. Commit and confirm it works.</li>
    <li>Now move the <code>cat</code> step into a <em>second job</em> with its own <code>runs-on</code>, and run it again.</li>
  </ol>
  <em>the two-step version prints "hello". The two-job version fails with "No such file or directory". You have just proved to yourself that jobs share no filesystem. This one experiment prevents a whole category of future confusion.</em>
</div>

## Triggers: what starts a workflow

`on:` decides when a workflow runs, and it is where a lot of a pipeline's usefulness comes from. These are the triggers worth knowing on day one.

| Trigger | Fires when | Use it for |
|---|---|---|
| `push` | Commits reach a branch or tag | Test every change |
| `pull_request` | A PR opens, updates, or reopens | Check *before* merging |
| `workflow_dispatch` | You click **Run workflow** | Manual runs, deploys |
| `schedule` | A cron time matches (**UTC**) | Nightly jobs, cleanups |
| `release` | You publish a release | Build and attach downloads |
| `issues`, `issue_comment` | Issue activity | Triage bots |

You can list several at once, and you can narrow each one so it only fires in the situations you care about:

```yaml
on:
  push:
    branches: [main]                       # only main, not every branch
    tags: ['v*']                           # and any v-prefixed tag
    paths-ignore: ['docs/**', '**/*.md']   # but not doc-only changes
  pull_request:
    branches: [main]                       # PRs targeting main
    types: [opened, synchronize, reopened]
  schedule:
    - cron: '0 3 * * *'                    # 03:00 UTC daily
  workflow_dispatch:                       # and a manual button
```

The five cron fields are `minute hour day-of-month month day-of-week`, so `'0 3 * * *'` reads as "minute 0 of hour 3, any day, any month, any weekday". Two things surprise people: schedules are always **UTC**, never your local time, and they only run from your repository's default branch, so testing one on a feature branch will drive you mad.

### Manual runs with inputs

`workflow_dispatch` can ask for values, which turns a workflow into a small internal tool:

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: Where to deploy
        type: choice
        options: [staging, production]
        default: staging
      dry-run:
        description: Print actions without doing them
        type: boolean
        default: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: |
          echo "target : ${{ inputs.environment }}"
          echo "dry run: ${{ inputs.dry-run }}"
```

Inputs support `string`, `boolean`, `choice`, and `environment` types, and you read them through the `inputs` context.

<div class="callout warn">
  <span class="ct">The most common reason a workflow "does not run"</span>
  Read <code>on:</code> before reading anything else. It is nearly always a <code>branches</code> filter you forgot, a file in the wrong folder, or a <code>schedule</code> you are waiting for in the wrong timezone. When something does not run, the trigger is the suspect, not the steps.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Change your workflow's trigger to <code>branches: [main]</code>, then push a commit to a new branch called <code>test-filter</code>.</li>
    <li>Confirm nothing runs. Then open a pull request from that branch and add <code>pull_request:</code> to the trigger list.</li>
    <li>Add the <code>workflow_dispatch</code> block with the <code>environment</code> choice input, and run it manually twice, once for each option.</li>
  </ol>
  <em>the branch push does nothing (correct behaviour that looks like a bug), the pull request triggers a run, and the manual runs print the value you selected. You have now seen the three trigger styles you will use most.</em>
</div>

## Jobs: parallel by default, ordered with `needs`

Jobs run at the same time unless you say otherwise. `needs` creates ordering.

```yaml
jobs:
  lint:                        # lint and test start together
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ruff check .

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pytest -q

  deploy:
    needs: [lint, test]        # waits for BOTH to succeed
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
```

`needs` builds a dependency graph. A job with no `needs` starts immediately; a job with `needs` waits for every listed job to succeed. If any of them fails, the dependent job is **skipped** rather than failed, a distinction that matters when you read a run summary.

The practical effect is that pipeline shape is a design choice. Three independent checks as three jobs finish in the time of the slowest one; the same three as steps in one job take the sum of all three. But the parallel version needs artifacts to move files between stages, and the sequential version does not.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Write a workflow with three jobs (<code>a</code>, <code>b</code>, and <code>c</code>) each running <code>sleep 20</code> and echoing its name.</li>
    <li>Run it and note the total wall-clock time in the run summary.</li>
    <li>Now add <code>needs: a</code> to <code>b</code> and <code>needs: b</code> to <code>c</code>. Run again and compare.</li>
  </ol>
  <em>the first version takes about 20 seconds in total; the second takes about 60. The run graph at the top of the page draws the difference, so you can now see what <code>needs</code> costs you.</em>
</div>

## Steps: `run` a command versus `uses` an action

Every step is either a shell command or a prebuilt component. That is the entire taxonomy.

| | `run` | `uses` |
|---|---|---|
| Is | A shell command on the runner | A published, reusable action |
| Written | `- run: pytest -q` | `- uses: actions/checkout@v4` |
| Configured by | Arguments | A `with:` block |
| For | What you already type in a terminal | Setup, caching, uploads, cloud logins |

A single step is one or the other. Putting `run` and `uses` in the same step is an error, and a favourite interview trick question.

```yaml
steps:
  - uses: actions/checkout@v4        # action, no configuration

  - uses: actions/setup-node@v4      # action, configured
    with:
      node-version: '20'

  - name: Install                    # plain command with a label
    run: npm ci

  - name: Test with options          # multi-line, custom shell, working dir
    working-directory: ./backend
    shell: bash
    env:
      CI: 'true'
    run: |
      npm run lint
      npm test -- --coverage
```

Those step options solve real problems, so learn them now. `working-directory` runs the command somewhere other than the repository root. `shell` picks the interpreter: `bash`, `sh`, `pwsh`, `python`. `env` sets variables for that step alone. `name` is what appears in the log, which is the difference between a readable run and a wall of truncated commands.

<div class="callout warn">
  <span class="ct">The number-one beginner failure</span>
  <b>The runner starts empty.</b> Your repository is not on it. <code>actions/checkout</code> is the action that clones it. If you see "no such file or directory" for a file you can plainly see on GitHub, this is why, and it is why almost every workflow's first step is that line.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Write a workflow whose only step is <code>- run: ls -la</code>. Commit and read the output.</li>
    <li>Now add <code>- uses: actions/checkout@v4</code> as the step before it, and run again.</li>
    <li>Add a step with <code>working-directory: .github</code> running <code>ls -la</code>.</li>
  </ol>
  <em>the first run lists an almost-empty directory. The second lists your actual repository. The third lists the contents of <code>.github</code> only. You have now seen, rather than read, why checkout exists.</em>
</div>

## Actions and the Marketplace

An **action** is a packaged step someone published so you do not have to write it. There are tens of thousands, but you will use these constantly:

<div class="cards">
  <div class="card"><div class="icon">📥</div><h4>actions/checkout</h4><p>Clones your repository onto the runner. First step of nearly every job.</p></div>
  <div class="card"><div class="icon">🐍</div><h4>actions/setup-*</h4><p>Installs a language version. <code>setup-node</code>, <code>setup-python</code>, <code>setup-java</code>, <code>setup-go</code>.</p></div>
  <div class="card"><div class="icon">📦</div><h4>actions/cache</h4><p>Reuses downloaded dependencies between runs, so later runs are much faster.</p></div>
  <div class="card"><div class="icon">📤</div><h4>actions/upload-artifact</h4><p>Saves files off the machine before it is destroyed, so you can download them.</p></div>
  <div class="card"><div class="icon">📥</div><h4>actions/download-artifact</h4><p>Pulls those files into a later job.</p></div>
  <div class="card"><div class="icon">🐙</div><h4>actions/github-script</h4><p>Runs JavaScript against the GitHub API: comment on a PR, add a label.</p></div>
</div>

An action is referenced as `owner/repo@ref`, and the `ref` decides what code you execute:

| Reference | Meaning | When |
|---|---|---|
| `actions/checkout@v4` | Major-version tag, moves with patches | Default for official actions |
| `actions/checkout@v4.1.7` | One exact release | You want reproducibility |
| `actions/checkout@8f4b7f8…` | An exact commit | Third-party actions |
| `actions/checkout@main` | A branch | Almost never |

<div class="callout warn">
  <span class="ct">Never point at a branch on someone else's action</span>
  <code>@main</code> means "whatever is on that branch the instant my job starts", a remote-code-execution surface aimed at your own repository. Use a tag at minimum, and a commit SHA if the action is not from a name you recognise. Senior covers the full supply-chain picture.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Open the Marketplace and find an action that posts a comment on a pull request.</li>
    <li>Read its README: note the <code>with:</code> inputs it accepts and the <code>permissions</code> it asks for.</li>
    <li>Click through to its repository and find the commit SHA of its latest release.</li>
  </ol>
  <em>you can now read any action's documentation and know what to write. Finding the SHA is the habit that becomes mandatory at Senior level.</em>
</div>

## Runners: the machine each job gets

`runs-on` picks the machine. Three labels cover nearly everything: `ubuntu-latest`, `windows-latest`, and `macos-latest`. Ubuntu is the fastest and cheapest, and the default choice unless you have a specific reason otherwise.

GitHub's Linux runners come with a generous set of preinstalled tools: Git, Docker, several versions of Python and Node, common build toolchains, and the `gh` CLI. You often need less setup than you expect.

| | GitHub-hosted | Self-hosted |
|---|---|---|
| Who runs it | GitHub | You |
| Lifetime | New per job, then destroyed | Persistent |
| Cost | Free on public repos | Your hardware |
| Pick it | Almost always | GPU, licence, private network |

The distinction matters even though you will not need self-hosted runners for a while: they are machines you own and register yourself, for when you need specific hardware such as a GPU, a paid licence, or access to a private network. Senior covers when that is justified and the risks it introduces.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add a step that prints versions: <code>python3 --version; node --version; docker --version; git --version</code>.</li>
    <li>Run it on <code>ubuntu-latest</code>.</li>
    <li>Change <code>runs-on</code> to <code>windows-latest</code> and run again. You will need <code>shell: bash</code> for the same commands to work.</li>
  </ol>
  <em>Ubuntu already has everything, which is why you rarely install Docker or Git yourself. The Windows run also shows you why <code>shell:</code> exists.</em>
</div>

## Expressions and contexts: reading the run

Expressions live inside `${{ }}` and read from **contexts**, read-only objects describing the current run. This is how a workflow becomes aware of its own circumstances.

| Context | Gives you | Examples |
|---|---|---|
| `github` | Event and repo data | `github.ref`, `github.sha`, `github.actor`, `github.event_name`, `github.repository` |
| `runner` | The machine | `runner.os`, `runner.temp` |
| `env` | Variables you set | `env.LOG_LEVEL` |
| `secrets` | Encrypted secrets | `secrets.GITHUB_TOKEN` |
| `inputs` | `workflow_dispatch` inputs | `inputs.environment` |
| `steps` | Earlier step outputs | `steps.build.outputs.tag` |
| `needs` | Earlier job outputs | `needs.build.outputs.version` |
| `matrix` | The current combination | `matrix.python` |

```yaml
- name: Print useful context values
  run: |
    echo "ref        : ${{ github.ref }}"          # refs/heads/main
    echo "sha        : ${{ github.sha }}"
    echo "event      : ${{ github.event_name }}"   # push / pull_request
    echo "actor      : ${{ github.actor }}"
    echo "run number : ${{ github.run_number }}"
    echo "workspace  : ${{ github.workspace }}"
```

These are substituted **before** the command runs, which changes how you read them: by the time your shell sees the line, `${{ github.ref }}` has already become literal text. That is why they work in any part of a workflow file, not just inside `run`.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add the printing step above to your workflow and run it from a branch.</li>
    <li>Note what <code>github.ref</code> prints. Write it down.</li>
    <li>Now open a pull request and run it again. Compare <code>github.ref</code> and <code>github.event_name</code>.</li>
  </ol>
  <em><code>refs/heads/your-branch</code> on a push, but <code>refs/pull/N/merge</code> on a pull request. Knowing that <code>github.ref</code> is the <b>full</b> ref, and that it differs by event, prevents the single most common condition bug.</em>
</div>

## Conditions with `if`

`if:` decides whether a step or a whole job runs. Inside `if:` the `${{ }}` wrapper is optional, because the value is already treated as an expression.

```yaml
jobs:
  deploy:
    if: github.ref == 'refs/heads/main'      # job-level condition
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Only on pull requests
        if: github.event_name == 'pull_request'
        run: ./pr-comment.sh

      - name: Only for version tags
        if: startsWith(github.ref, 'refs/tags/v')
        run: ./publish.sh

      - name: Run even if an earlier step failed
        if: always()
        run: ./collect-logs.sh

      - name: Only when something failed
        if: failure()
        run: ./notify-team.sh
```

| You want | Write |
|---|---|
| Only on `main` | `if: github.ref == 'refs/heads/main'` |
| Only on pull requests | `if: github.event_name == 'pull_request'` |
| Only on a version tag | `if: startsWith(github.ref, 'refs/tags/v')` |
| Skip a bot | `if: github.actor != 'dependabot[bot]'` |
| Even after a failure | `if: always()` |
| Only after a failure | `if: failure()` |

The four status functions (`success()`, `failure()`, `cancelled()`, `always()`) only make sense inside `if:`. `success()` is the implicit default on every step, which is why a failed step stops the ones after it.

<div class="callout warn">
  <span class="ct">The gotcha that costs an hour</span>
  <code>github.ref</code> is the <b>full</b> ref: <code>refs/heads/main</code>, not <code>main</code>. Comparing it to <code>'main'</code> silently never matches, and nothing in the log explains why. When a condition misbehaves, print the value first: <code>- run: echo "${{ github.ref }}"</code>.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add a step with the <em>wrong</em> condition on purpose: <code>if: github.ref == 'main'</code>. Push to main and watch it skip.</li>
    <li>Fix it to <code>refs/heads/main</code> and watch it run.</li>
    <li>Add a step with <code>if: failure()</code> and a step above it that runs <code>exit 1</code>.</li>
  </ol>
  <em>the skipped step appears greyed out with a "skipped" marker rather than an error, which is why this bug is hard to spot. The <code>failure()</code> step runs only in the red run, which is the pattern you will use for notifications.</em>
</div>

## Environment variables, and their three scopes

Variables have three scopes, and the most specific one wins:

```yaml
env:
  APP_NAME: checkout-api        # every job, every step

jobs:
  test:
    runs-on: ubuntu-latest
    env:
      LOG_LEVEL: debug          # every step in this job
    steps:
      - run: ./run.sh
        env:
          LOG_LEVEL: trace      # this step only — wins
```

The complication is that **each `run` step is a new shell process**, so `export` does not survive to the next step. GitHub solves this with special files whose paths are provided as environment variables. Appending a line to `$GITHUB_ENV` sets a variable for every *later* step in the same job:

```yaml
- name: Compute a version and share it
  run: echo "VERSION=1.4.${{ github.run_number }}" >> "$GITHUB_ENV"

- name: Use it in a later step
  run: echo "building $VERSION"
```

There is also `$GITHUB_STEP_SUMMARY`, which accepts Markdown and renders it on the run page. It is the cheapest reporting you will ever add, and it means nobody has to download a file to see three numbers:

```yaml
- name: Publish a summary
  run: |
    {
      echo "### Test results"
      echo "| metric | value |"
      echo "|---|---|"
      echo "| tests | 412 |"
      echo "| coverage | 91% |"
    } >> "$GITHUB_STEP_SUMMARY"
```

<div class="callout warn">
  <span class="ct">Two limits worth remembering</span>
  A value written to <code>$GITHUB_ENV</code> is <b>not</b> readable in the step that wrote it, only from the next step onwards. Neither file crosses a <b>job</b> boundary; that needs job outputs, which come later on this page.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Write a step that does <code>export FOO=bar</code> and a second step that echoes <code>$FOO</code>. Confirm it is empty.</li>
    <li>Change the first step to <code>echo "FOO=bar" &gt;&gt; "$GITHUB_ENV"</code> and run again.</li>
    <li>Now try echoing <code>$FOO</code> in the <em>same</em> step that wrote it, and note that it is still empty.</li>
    <li>Add the step-summary block and look at the bottom of the run page.</li>
  </ol>
  <em>the export version prints nothing, the <code>$GITHUB_ENV</code> version prints <code>bar</code> from the next step onwards but not in the writing step, and your run page now has a rendered table on it. Those three behaviours explain most "my variable is empty" confusion.</em>
</div>

## Secrets, and what they cannot protect

Secrets are encrypted values you set in **Settings → Secrets and variables → Actions**. You read them with `${{ secrets.NAME }}`, and once stored you cannot read them back in the interface, only overwrite them.

```yaml
- name: Deploy
  env:
    API_TOKEN: ${{ secrets.API_TOKEN }}     # pass as data
  run: ./deploy.sh                          # script reads "$API_TOKEN"
```

`GITHUB_TOKEN` is provided automatically for every run, no setup at all, and can act on the repository itself. It is minted per job and expires when the job ends:

```yaml
permissions:
  contents: read
  pull-requests: write

steps:
  - uses: actions/github-script@v7
    with:
      script: |
        github.rest.issues.createComment({
          issue_number: context.issue.number,
          owner: context.repo.owner,
          repo: context.repo.repo,
          body: 'Build passed ✅'
        })
```

That `permissions:` block matters now even though Senior covers it properly: it controls what the automatic token is allowed to do, and declaring it narrows the token rather than widening it.

<div class="callout warn">
  <span class="ct">Three rules, from day one</span>
  <b>Never <code>echo</code> a secret.</b> GitHub masks known values in logs, but that is a safety net, not a strategy. It cannot mask a value you transformed. <br>
  <b>Pass secrets through <code>env</code>, not into the command line.</b> Interpolating one directly into a shell makes it far easier to leak through an error message or <code>set -x</code>. <br>
  <b>Fork pull requests get no secrets</b>, by design. That is not a bug to work around.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add a repository secret called <code>TEST_SECRET</code> with the value <code>hunter2</code>.</li>
    <li>Write a step that checks it is set <em>without printing it</em>:<br><code>if [ -z "$TEST_SECRET" ]; then echo "missing"; exit 1; fi; echo "present"</code>, passing it via <code>env</code>.</li>
    <li>Now deliberately try <code>echo "$TEST_SECRET"</code> and look at the log.</li>
  </ol>
  <em>the check prints "present". The echo prints <code>***</code>, so masking worked. Then try <code>echo "$TEST_SECRET" | base64</code> and watch the masking fail, which is why "never print it" is the actual rule.</em>
</div>

## Caching: making the second run fast

The runner is new every time, which means your dependencies download every time. On a real project that is often most of the run. Caching fixes it, and for mainstream languages it is a single line:

```yaml
- uses: actions/setup-python@v5
  with:
    python-version: '3.11'
    cache: pip                 # ← the whole thing
```

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: npm                 # same idea; also 'yarn', 'pnpm'
```

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>run 1</span><strong>Cache miss</strong><small>Dependencies download normally, then get saved at the end of the job.</small></div>
  <div class="guide-timeline-item"><span>run 2</span><strong>Cache hit</strong><small>Dependencies are restored from the cache instead of downloaded.</small></div>
  <div class="guide-timeline-item"><span>lockfile changes</span><strong>Miss again</strong><small>The key includes your lockfile, so new dependencies are picked up automatically.</small></div>
</div>

The mechanism underneath is a **key**: a string that identifies the cached content. The setup actions build one from your lockfile, so it changes exactly when your dependencies change. For anything the setup actions do not know about, you write the key yourself:

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.cache/my-tool
    key: ${{ runner.os }}-mytool-${{ hashFiles('tool.lock') }}
    restore-keys: |
      ${{ runner.os }}-mytool-
```

`hashFiles` produces a stable hash of the matched files. `restore-keys` is a fallback prefix tried when the exact key misses, giving a partial hit that is still much better than nothing. Mid-level goes considerably deeper on key design, because getting it wrong is the difference between a cache that helps and one that silently does nothing.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add a real dependency install to your workflow: a <code>requirements.txt</code> with a few packages, or a <code>package.json</code>.</li>
    <li>Run it once <em>without</em> <code>cache:</code> and note the install step's duration.</li>
    <li>Add <code>cache: pip</code> (or <code>npm</code>), then run twice. Compare the install duration on the second run.</li>
  </ol>
  <em>the first cached run is no faster, it has nothing to restore, but the second is faster, and the step log says "Cache restored from key…". One line, permanently.</em>
</div>

## Artifacts: files that outlive the runner

The machine is destroyed when the job ends, so anything you want to keep must be uploaded before that happens.

```yaml
- name: Run tests
  run: pytest -q --junitxml=reports/junit.xml --cov --cov-report=html

- name: Keep the reports
  if: always()                 # ← save them even when tests FAIL
  uses: actions/upload-artifact@v4
  with:
    name: test-reports
    path: |
      reports/
      htmlcov/
    retention-days: 7
```

Artifacts appear as downloadable files at the bottom of the run page. The `if: always()` is the important part: without it, a failing test stops the job before the upload runs, so you lose the report exactly when you need it most.

Cache and artifacts are easy to confuse, so keep this distinction:

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Artifact = data you need</h4>
    <ul>
      <li>Test reports, build output, logs</li>
      <li>You download it, or a later job does</li>
      <li>If it is missing, something is broken</li>
      <li>Named and retained for a set period</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Cache = a shortcut</h4>
    <ul>
      <li>Downloaded dependencies</li>
      <li>Reused by the next run</li>
      <li>If it is missing, the run is just slower</li>
      <li>Keyed and restored automatically</li>
    </ul>
  </div>
</div>

One sentence for interviews: *a cache is an optimisation you must be able to lose; an artifact is data you cannot.*

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Make a step that writes a file: <code>mkdir -p reports &amp;&amp; date &gt; reports/when.txt</code>.</li>
    <li>Upload <code>reports/</code> as an artifact, run, then download the zip from the run page.</li>
    <li>Now add <code>- run: exit 1</code> <em>before</em> the upload step and run again.</li>
    <li>Add <code>if: always()</code> to the upload and run once more.</li>
  </ol>
  <em>run two produces no artifact at all, because the failure stopped the job first. Run three produces the artifact despite the red cross. That is the whole reason <code>if: always()</code> exists.</em>
</div>

## Passing data between jobs, deliberately

Jobs are separate machines, so nothing crosses automatically. Strings travel as **outputs**; files travel as **artifacts**.

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.meta.outputs.version }}     # declare the output
    steps:
      - uses: actions/checkout@v4

      - id: meta                                     # the step needs an id
        run: echo "version=1.4.${{ github.run_number }}" >> "$GITHUB_OUTPUT"

      - run: make build                              # produces dist/

      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/

      - run: ./deploy.sh --version "${{ needs.build.outputs.version }}"
```

Three things have to line up for a job output to work, and missing any one produces an empty value with no error: the step needs an `id`, it must write to `$GITHUB_OUTPUT`, and the **job** must declare `outputs:` mapping a name to that step's output. Then the dependent job reads it via the `needs` context.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Build the two-job example above, but have <code>build</code> just create a text file rather than a real build.</li>
    <li>Confirm <code>deploy</code> prints the version and can read the downloaded file.</li>
    <li>Now remove the <code>outputs:</code> block from the <code>build</code> job and run again.</li>
  </ol>
  <em>the version becomes empty: no error, just a blank. That silent failure is why the three-part requirement is worth memorising.</em>
</div>

## Matrix: testing several versions at once

Copying a job four times to test four language versions is the wrong answer. A **matrix** generates them for you:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false                 # let every version report
      matrix:
        python: ['3.10', '3.11', '3.12']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python }}
          cache: pip
      - run: pip install -r requirements.txt
      - run: pytest -q
```

That produces three parallel jobs, each with `matrix.python` set to a different value. Add a second axis and they multiply:

```yaml
      matrix:
        os: [ubuntu-latest, windows-latest]
        python: ['3.11', '3.12']        # 2 × 2 = four jobs
    runs-on: ${{ matrix.os }}
```

Understand `fail-fast` now. It defaults to `true`, which cancels every sibling job as soon as one fails. That is right when you want a fast red signal and wrong when you are diagnosing, because a single failing cell cancelling the rest hides the pattern you need to see.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Set up the three-Python matrix and run it. Note how the job names in the Actions tab include the version.</li>
    <li>Make the test fail on one version only: <code>- run: if [ "${{ matrix.python }}" = "3.10" ]; then exit 1; fi</code>.</li>
    <li>Run it with the default <code>fail-fast</code>, then with <code>fail-fast: false</code>.</li>
  </ol>
  <em>with fail-fast on, the other two jobs are cancelled mid-run. With it off, all three report. You now know which one you want while debugging.</em>
</div>

## Guards every workflow should have from day one

Two small settings prevent a surprising amount of pain.

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15              # default ceiling is SIX HOURS
    steps:
      - uses: actions/checkout@v4

      - name: Optional check
        continue-on-error: true      # a failure here does not fail the job
        run: ./experimental-lint.sh
```

| Guard | Why |
|---|---|
| `timeout-minutes` | A hung job otherwise burns up to six hours of your allowance |
| `continue-on-error` | Lets a non-critical step fail without failing the build |
| `if: always()` on uploads | Diagnostics survive a red run |
| A `paths-ignore` filter | Documentation changes do not run the full suite |

The timeout is the one people skip and later regret. The default is six hours per job, and a workflow waiting on something that will never arrive consumes your entire monthly allowance before anyone notices.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add <code>timeout-minutes: 1</code> to a job and give it a step that runs <code>sleep 120</code>.</li>
    <li>Watch what the run looks like when the timeout fires.</li>
    <li>Add a step with <code>continue-on-error: true</code> running <code>exit 1</code>, followed by a normal step.</li>
  </ol>
  <em>the timed-out job is marked failed with a clear "cancelled after 1 minute" message rather than hanging. The tolerated failure shows a warning marker while the job still succeeds, so note that the job is green even though a step failed.</em>
</div>

## Reading a failed run, in order

Debugging is a skill, and it has an order.

<ol class="guide-steps">
  <li><b>Click the red job, then the red step</b>GitHub expands the failure for you automatically.</li>
  <li><b>Scroll up, not down</b>Logs end with a tool's summary. The real cause is usually well above it.</li>
  <li><b>Run the command on your own machine</b>If it fails there too, the workflow is innocent and you are debugging your project.</li>
  <li><b>Print what you are unsure about</b><code>pwd</code>, <code>ls -la</code>, <code>echo "$VAR"</code>, <code>python --version</code>. A step is just a shell.</li>
  <li><b>Use "Re-run failed jobs"</b>Retries only the red job instead of the whole pipeline.</li>
  <li><b>Re-run with debug logging</b>The <b>Re-run</b> menu has a checkbox for far more detail.</li>
</ol>

Four traps account for most beginner failures, and all four have the same root cause: a new machine each job, a new shell each step:

| Symptom | Cause | Fix |
|---|---|---|
| "File not found" for a file in your repo | No checkout | Add `actions/checkout@v4` |
| The deploy job cannot find `dist/` | Different machine | Upload/download an artifact |
| `cd` in one step has no effect on the next | New shell per step | `working-directory:` on the step |
| A variable is empty in the next step | `export` dies with the step | `echo "K=v" >> "$GITHUB_ENV"` |

```yaml
# Does not work
- run: export VERSION=1.2.3
- run: echo "$VERSION"        # empty

# Works
- run: echo "VERSION=1.2.3" >> "$GITHUB_ENV"
- run: echo "$VERSION"        # 1.2.3

# Does not work
- run: cd frontend
- run: npm ci

# Works
- run: npm ci
  working-directory: frontend
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Reproduce all four traps in one workflow deliberately, one job at a time.</li>
    <li>For each, read the actual error message before fixing it.</li>
    <li>Then re-run one failed job only, and re-run it again with debug logging enabled.</li>
  </ol>
  <em>four distinct, recognisable error messages. Having seen each one on purpose, you will recognise them instantly when they happen for real, which is the difference between a five-minute fix and an afternoon.</em>
</div>

## A complete pipeline

Everything above, in one file. Nothing here is new. Read it as a whole and you should recognise every line.

```yaml .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    paths-ignore: ['docs/**', '**/*.md']
  workflow_dispatch:

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    strategy:
      fail-fast: false
      matrix:
        python: ['3.11', '3.12']
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python }}
          cache: pip

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Lint
        run: ruff check .

      - name: Test
        run: pytest -q --junitxml=reports/junit-${{ matrix.python }}.xml

      - name: Keep the report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: reports-${{ matrix.python }}
          path: reports/
          retention-days: 7

  build:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    outputs:
      version: ${{ steps.meta.outputs.version }}
    steps:
      - uses: actions/checkout@v4
      - id: meta
        run: echo "version=1.4.${{ github.run_number }}" >> "$GITHUB_OUTPUT"
      - run: make build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/
      - name: Deploy
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
        run: ./deploy.sh --version "${{ needs.build.outputs.version }}"
      - name: Report
        run: echo "Deployed ${{ needs.build.outputs.version }}" >> "$GITHUB_STEP_SUMMARY"
```

The same shape for a JavaScript project, where only the setup action and the commands change, which is the point:

```yaml
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --coverage
      - run: npm run build
```

<div class="guide-try">
  <span class="ct">Try it: the one that matters</span>
  <ol>
    <li>Take this pipeline into a project you work on, adapting the commands to your language.</li>
    <li>Get it green. Then deliberately break a test and confirm the report artifact still uploads.</li>
    <li>Push to a branch and confirm <code>build</code> and <code>deploy</code> are skipped, then merge to main and watch all three run.</li>
    <li>Add the status badge below to your README.</li>
  </ol>
  <em>a working pipeline on real code, and the confidence that comes from having built rather than read it. An hour here beats a second pass over the page.</em>
</div>

## Show it off: a status badge

```text README.md
![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)
```

The badge reflects the latest run on the default branch and links to the workflow's history. Add `?branch=develop` to point it at a different branch.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add the badge to your README with your own owner, repo, and workflow filename.</li>
    <li>Break the build on purpose and refresh the README to watch it turn red.</li>
  </ol>
  <em>a badge that is live. It is also the fastest way to notice a broken pipeline in a repository you are not watching closely.</em>
</div>

## What you can now do, and what comes next

You can write a workflow from scratch, choose triggers precisely, run jobs in parallel and order them, use and version Marketplace actions, branch on context values, manage environment variables and secrets, cache dependencies, keep artifacts, move data between jobs, test a matrix of versions, guard against hung jobs, and debug a red run. That is a working practitioner's toolkit, enough to own CI on a real project.

| Can you… | |
|---|---|
| Name the exact folder workflows live in? | `.github/workflows/` |
| Explain CI versus CD? | Prove it is safe · ship what passed |
| Say why `actions/checkout` is needed? | The runner starts empty |
| Explain why jobs cannot share files? | Separate machines |
| Explain why `cd` does not persist? | New shell per step |
| Make a second run faster? | `cache:` on the setup action |
| Keep a report from a failed run? | `upload-artifact` + `if: always()` |
| Deploy only from `main`? | `if: github.ref == 'refs/heads/main'` |
| Pass a string between jobs? | Job `outputs` + `needs` |
| Stop a hung job? | `timeout-minutes` |

**Mid-level takes every one of those topics further:** the full context and function reference, cache key design and its two failure modes, artifact retention and collisions, matrix `include`/`exclude`/dynamic generation, plus the machinery you have not met yet: service containers for real databases, reusable workflows and composite actions, environments with approvals, and concurrency control.

**Senior then covers what you own when CI/CD is your responsibility**: the trust model and script injection, least-privilege permissions, OIDC instead of stored cloud keys, supply-chain controls, container builds, authoring your own actions, self-hosted runners, and running Actions as a platform across many repositories.
