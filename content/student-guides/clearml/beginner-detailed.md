This is part one of three. It covers **everything you need to do real work with ClearML** — not a teaser. By the end you can track an experiment without changing your training loop, log metrics and artifacts on purpose, compare twenty runs in a table, version a dataset, clone a run and re-launch it on a GPU box you never SSH into, and answer "what exactly produced this model?" with a task id. Mid-level and Senior take the same topics further; nothing here is thrown away.

Each section ends with a **Try it** task. Do them as you go — they take a few minutes each, and these ideas only stick once you have watched a scalar appear in the web UI while your script is still running.

## What ClearML is, and the problem it solves

You trained a model on Tuesday. It scored 0.94. On Thursday you cannot reproduce it. The notebook has moved on, the learning rate in the cell is not the one you ran, the dataset folder has been "cleaned up", and the only record of 0.94 is a screenshot in Slack.

That is not a discipline problem. It is a tooling problem: **nothing was watching.** Every fact about that run lived in your head, your terminal scrollback, and a filename.

ClearML watches. You add two lines to your script and it records the code, the git commit, the uncommitted diff, the installed packages, the command-line arguments, every metric you print to TensorBoard, the model file you saved, and the machine it ran on — into a server you and your team can query.

<div class="flow">
  <div class="node">YOUR SCRIPT<small>+ 2 lines</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">SERVER<small>records everything</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">WEB UI<small>compare, search</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">AGENT<small>reruns it anywhere</small></div>
</div>

**ClearML's central trick is that a recorded run is executable.** Other tools log an experiment so you can look at it. ClearML logs enough — repository, commit, diff, packages, arguments, environment — that a worker can rebuild the environment and run it again on a different machine. That single property is what turns a log into a workflow.

That gives you four things, and they are the reason ClearML exists rather than a spreadsheet and a naming convention:

<div class="cards">
  <div class="card"><div class="icon">📋</div><h4>Automatic experiment tracking</h4><p>Two lines. Code, config, packages, metrics, and models get recorded without you writing logging calls.</p></div>
  <div class="card"><div class="icon">🔁</div><h4>Runs you can re-execute</h4><p>Clone any past run, change one parameter, and send it to a queue. No SSH, no environment setup.</p></div>
  <div class="card"><div class="icon">📦</div><h4>Versioned datasets</h4><p>Immutable, content-addressed dataset versions with parents, so "which data?" has an id for an answer.</p></div>
  <div class="card"><div class="icon">🧩</div><h4>Pipelines and orchestration</h4><p>Chain those runs into a graph, run each step on a different queue, and cache the steps that did not change.</p></div>
</div>

The vocabulary is small, and getting it straight now saves confusion later:

| Term | What it is |
|---|---|
| **Task** | One recorded run — an experiment, a dataset version, a pipeline step. The core object |
| **Project** | A folder of tasks. Supports `/` for nesting, like `research/nlp/ner` |
| **Server** | The API server, web server, and file server that store and show everything |
| **Agent** | A worker process that pulls tasks off a queue and executes them |
| **Queue** | A named, ordered list of tasks waiting for an agent |
| **Artifact** | Any file or object you attach to a task — a dataframe, a plot, a checkpoint |
| **Model** | A first-class artifact with its own registry entry, tags, and lineage |
| **Dataset** | A special task that holds an immutable, versioned collection of files |

You need very little to follow along: Python, a script that trains something small, and a free account on the hosted server. A tiny model on a tiny dataset is genuinely the best place to start, because a broken run costs you thirty seconds.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Find your most recent training script. Write down, from memory, the exact learning rate, batch size, and dataset it last ran with.</li>
    <li>Now check the script and see whether you were right.</li>
    <li>Look for the model file it produced and try to name the git commit that trained it.</li>
    <li>Count how many folders on your disk match <code>*_v2*</code>, <code>*_final*</code>, or <code>runs/</code>.</li>
  </ol>
  <em>at least one of those three questions is unanswerable, and usually all three. That is the gap ClearML fills — and the third one, tying a model file to a commit, is the one that hurts most in a code review six months later.</em>
</div>

## The architecture: four parts, three data stores

ClearML has more moving pieces than a single library, and knowing which piece does what makes every error message readable.

<div class="guide-arch" style="--arch-cols:3">
  <div class="arch-lane" style="--lane-cols:1">
    <span class="arch-label">your training process</span>
    <div class="arch-node" data-kind="entry"><b>SDK — <code>Task.init()</code></b><small>Patches frameworks at import time, records code, diff, packages, args; streams metrics</small></div>
  </div>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down" data-flow="optional"></i>
  <div class="arch-lane" style="--lane-cols:3">
    <span class="arch-label">server — api :8008 · web :8080 · files :8081</span>
    <div class="arch-node" data-kind="store"><b>MongoDB</b><small>Task metadata: params, status, queues. "Task list is slow" lives here</small></div>
    <div class="arch-node" data-kind="store"><b>Elasticsearch</b><small>Metrics and console logs. "Scalars are slow" — and it fills up first</small></div>
    <div class="arch-node" data-kind="store"><b>Redis</b><small>Ephemeral worker state and locks</small></div>
  </div>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down"></i>
  <div class="arch-lane" style="--lane-cols:3">
    <span class="arch-label">execution — optional, and the half people find confusing</span>
    <div class="arch-node"><b>Queue</b><small>A named, ordered list. A task sits here until an agent claims it</small></div>
    <div class="arch-node" data-kind="worker"><b>Agent</b><small>Rebuilds the env, clones the commit, applies the diff, runs the entry point</small></div>
    <div class="arch-node" data-kind="external"><b>Artifact storage</b><small>File server, or S3 via <code>output_uri</code> — use S3 for anything large</small></div>
  </div>
  <p class="arch-note"><b>Learn the top two lanes first.</b> Tracking needs no agent anywhere: install the SDK, run your script, get a full record. The bottom lane is the second half of the story — <em>re-executing</em> a recorded run elsewhere — and trying to learn both at once is why people find ClearML complicated.</p>
</div>

| Part | What it does | Where it runs |
|---|---|---|
| **SDK** (`pip install clearml`) | Patches your frameworks, sends metadata and metrics, uploads files | Inside your training process |
| **API server** | Stores tasks, parameters, metrics, and queues. Everything talks to it | Port 8008 |
| **Web server** | The UI you compare experiments in. Talks only to the API server | Port 8080 |
| **File server** | Stores artifacts, models, and debug images when you have no S3 bucket | Port 8081 |
| **Agent** (`pip install clearml-agent`) | Pulls a task from a queue, rebuilds its environment, runs it | Any machine with the code's dependencies |

Behind the API server sit three data stores, and knowing which is which explains later performance advice: **MongoDB** holds task metadata, **Elasticsearch** holds metrics and console logs, and **Redis** holds ephemeral state. You do not touch them directly at this level, but "my scalars are slow" and "my task list is slow" are two different problems for that reason.

You have two options for the server, and for learning there is only one sensible answer:

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Hosted (app.clear.ml)</h4>
    <ul>
      <li>Free tier, no setup at all</li>
      <li>Signup, copy credentials, done in two minutes</li>
      <li>Right choice for learning and for small teams</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Self-hosted</h4>
    <ul>
      <li>Docker Compose or Kubernetes, plus Mongo, Elasticsearch, Redis</li>
      <li>You own backups, upgrades, storage, and access control</li>
      <li>Necessary when data cannot leave your network — Senior covers it</li>
    </ul>
  </div>
</div>

<div class="callout note">
  <span class="ct">The agent is where the confusion usually is</span>
  Nothing about tracking requires an agent. You can install the SDK, run your script, and get full tracking with no worker anywhere. The agent is for the second half of the story — <em>re-executing</em> a recorded run somewhere else. Learn tracking first, then add the agent; trying to learn both at once is why people find ClearML complicated.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Sign up at the hosted server and open the Workers &amp; Queues page. Note that it is empty — nothing needs an agent yet.</li>
    <li>Open Settings &rarr; Workspace and find the "Create new credentials" button. Do not click it yet.</li>
    <li>Sketch the four parts above from memory and label which one your training script talks to.</li>
  </ol>
  <em>your script talks to the API server for metadata and the file server for files, and nothing else. The web server is for you, not for your code, and the agent is optional. Getting that picture straight now makes every later error message obvious.</em>
</div>

## Install and connect: credentials and config

Two commands, and the second one is interactive.

```bash
pip install clearml
clearml-init
```

`clearml-init` asks you to paste a credentials block, which you copy from the web UI under **Settings → Workspace → Create new credentials**. It looks like this, and it is the only setup step in the whole guide:

```text pasted into clearml-init
api {
  web_server: https://app.clear.ml
  api_server: https://api.clear.ml
  files_server: https://files.clear.ml
  credentials {
    "access_key" = "ABC123..."
    "secret_key" = "xyz789..."
  }
}
```

That gets written to `~/clearml.conf` — a large, heavily commented file that is worth skimming once. The four lines that matter today:

| Setting | Means |
|---|---|
| `api.api_server` | Where metadata goes |
| `api.files_server` | Where artifacts and models go by default |
| `api.credentials` | Your access key and secret key pair |
| `sdk.development.default_output_uri` | Optional: send models and artifacts to S3 instead of the file server |

Every one of those can be overridden by an environment variable, which is how you configure CI and containers where there is no config file to edit:

```bash
export CLEARML_API_HOST=https://api.clear.ml
export CLEARML_WEB_HOST=https://app.clear.ml
export CLEARML_FILES_HOST=https://files.clear.ml
export CLEARML_API_ACCESS_KEY=ABC123...
export CLEARML_API_SECRET_KEY=xyz789...
```

<div class="callout warn">
  <span class="ct">Your secret key is a full-access credential</span>
  A ClearML access/secret pair can read every experiment in your workspace and enqueue tasks that run code on your agents. Treat it exactly like a cloud access key: never commit <code>clearml.conf</code>, never paste it into a notebook you will share, and use environment variables in CI so there is no file to leak. Senior covers scoped credentials and service accounts properly.
</div>

Confirm it works before writing any code:

```bash
clearml-init          # re-run any time to reconfigure
python -c "from clearml import Task; print(Task.get_projects()[:3])"
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run <code>pip install clearml</code> then <code>clearml-init</code> and paste your credentials.</li>
    <li>Open <code>~/clearml.conf</code> and find <code>files_server</code>, then find <code>sdk.development</code> and skim the comments.</li>
    <li>Run the one-line Python check above and confirm you get a list back rather than an authentication error.</li>
    <li>Add <code>clearml.conf</code> to your global gitignore right now: <code>echo "clearml.conf" &gt;&gt; ~/.gitignore_global</code>.</li>
  </ol>
  <em>a working connection and a config file you have actually looked at. That last step takes five seconds and prevents the most common ClearML security incident, which is a credentials block committed to a public repository.</em>
</div>

## Your first tracked task, in two lines

This is the whole beginner story in two lines. Here is a script with no ClearML in it:

```python train.py — before
import numpy as np
from sklearn.datasets import load_iris
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

n_estimators = 100
max_depth = 4

X, y = load_iris(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestClassifier(n_estimators=n_estimators, max_depth=max_depth)
model.fit(X_train, y_train)
print("accuracy", model.score(X_test, y_test))
```

And here it is tracked:

```python train.py — after
from clearml import Task

task = Task.init(project_name="iris-demo", task_name="random forest baseline")

import numpy as np
from sklearn.datasets import load_iris
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

params = task.connect({"n_estimators": 100, "max_depth": 4})

X, y = load_iris(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestClassifier(n_estimators=params["n_estimators"], max_depth=params["max_depth"])
model.fit(X_train, y_train)

accuracy = model.score(X_test, y_test)
task.get_logger().report_single_value("accuracy", accuracy)
print("accuracy", accuracy)
```

Run it. The first thing it prints is the link that matters:

```text
ClearML Task: created new task id=8f2c4b19e0a7d3f1c6b8a2e4d7091f3b
ClearML results page: https://app.clear.ml/projects/.../experiments/8f2c4b19.../output/log
```

Open that link while the script is still running and you are watching the console output stream into the UI. Four things happened without you asking:

<ol class="guide-steps">
  <li><b>A task was created</b>With an id, a project, a name, a status of <code>running</code>, and a start time.</li>
  <li><b>Your environment was recorded</b>Git remote, branch, commit, the diff of your uncommitted changes, and the installed packages the script actually imported.</li>
  <li><b>Your stdout and stderr were captured</b>Streamed to the server, so the console tab is a live log you can read from your phone.</li>
  <li><b>Your parameters were registered</b>Because you passed that dict through <code>task.connect</code>, they are now editable in the UI — which is what makes the run re-launchable.</li>
</ol>

<div class="callout warn">
  <span class="ct"><code>Task.init</code> goes as early as possible</span>
  ClearML works by patching frameworks at import time. If <code>Task.init</code> runs <em>after</em> <code>import torch</code>, the automatic capture of TensorBoard scalars and model checkpoints may silently not happen. Put it at the top of the entry-point script, before the heavy imports. This is the single most common reason someone says "it is not logging my metrics".
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Take the script above, run it, and open the results link while it is still running.</li>
    <li>In the UI, visit each tab in turn: Execution, Configuration, Console, Scalars, Artifacts.</li>
    <li>Under Execution, find the git commit and the "uncommitted changes" section. Make an unrelated edit to the file, rerun, and look again.</li>
    <li>Under Configuration &rarr; Hyperparameters, confirm <code>n_estimators</code> and <code>max_depth</code> are listed with their values.</li>
  </ol>
  <em>the uncommitted diff is the surprise. ClearML stores the patch of your dirty working tree so a run from an uncommitted state is still reproducible — which is enormously useful and, as Senior covers, a place secrets can leak if you are careless.</em>
</div>

## What gets captured automatically, and what does not

The word ClearML uses for this is "automagic", and knowing its exact boundaries stops you from either duplicating work or expecting magic that is not there.

Captured with no code from you, as long as `Task.init` ran first:

| Category | What lands in the task |
|---|---|
| **Code** | Git remote, branch, commit, uncommitted diff, entry-point script and working directory |
| **Environment** | Python version, and the packages your script imported with their exact versions |
| **Arguments** | Every `argparse` flag, plus `click`, `fire`, and `hydra` configs |
| **Metrics** | Anything written to TensorBoard, TensorBoardX, or `matplotlib` |
| **Models** | Every checkpoint saved by PyTorch, TensorFlow, Keras, scikit-learn via joblib, XGBoost, LightGBM |
| **Console** | stdout and stderr, streamed |
| **Machine** | Hostname, CPU, GPU model, memory, and utilisation over time |

That means an existing TensorBoard-instrumented project needs **no logging changes at all**:

```python already-instrumented.py
from clearml import Task
task = Task.init(project_name="vision", task_name="resnet baseline")

from torch.utils.tensorboard import SummaryWriter
writer = SummaryWriter()

for epoch in range(epochs):
    loss = train_one_epoch()
    writer.add_scalar("loss/train", loss, epoch)      # appears in ClearML Scalars
    torch.save(model.state_dict(), "checkpoint.pt")   # appears in ClearML Models
```

What is **not** captured, and this list matters:

| Not captured | Why | What to do |
|---|---|---|
| Values you `print()` as metrics | A print is text, not a number with an iteration | `report_scalar` |
| Data read from a path outside version control | ClearML cannot know what was in it | Use a ClearML Dataset |
| Conda/apt/system libraries | Only Python imports are detected | Use docker mode on the agent |
| Environment variables | Deliberately excluded, because they hold secrets | Pass real config through parameters |
| Random seeds you never set | There is nothing to record | Set and connect them explicitly |

You can turn parts of the magic off when it gets in the way:

```python
task = Task.init(
    project_name="vision",
    task_name="resnet baseline",
    auto_connect_frameworks={"matplotlib": False, "pytorch": True},
    auto_connect_arg_parser=False,      # do not hoover up argparse
    output_uri="s3://my-bucket/clearml",  # send models and artifacts to S3
)
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add <code>Task.init</code> to a project of yours that already uses TensorBoard, and change nothing else.</li>
    <li>Run it and confirm the scalars appear in ClearML's Scalars tab with the same titles and series.</li>
    <li>Add an <code>argparse</code> flag, pass a value on the command line, and find it under Configuration &rarr; Hyperparameters &rarr; Args.</li>
    <li>Now move <code>Task.init</code> to the bottom of the imports, rerun, and compare what was captured.</li>
  </ol>
  <em>the same curves with zero logging code — and, in step four, missing or partial scalars. That last experiment is worth doing once so the "init first" rule becomes muscle memory rather than a thing you read.</em>
</div>

## Logging on purpose: the Logger

Automatic capture gets you a long way. The Logger is for everything you want recorded deliberately, and its API is small enough to memorise.

```python
logger = task.get_logger()

# A number that changes over training → a curve
logger.report_scalar(title="loss", series="train", value=0.412, iteration=epoch)
logger.report_scalar(title="loss", series="val", value=0.503, iteration=epoch)

# A number that happens once → a table row, comparable across tasks
logger.report_single_value(name="test_accuracy", value=0.941)

# A table
logger.report_table(title="confusion", series="test", iteration=0, table_plot=df)

# An image
logger.report_image(title="samples", series="epoch-3", iteration=3, local_path="grid.png")

# Free text into the task log
logger.report_text("Trained on dataset version 3fa1b2c")

# Any matplotlib figure
logger.report_matplotlib_figure(title="roc", series="test", iteration=0, figure=fig)
```

The `title` / `series` distinction is the one people get wrong, and it decides what your Scalars tab looks like:

| | Means | Result |
|---|---|---|
| `title` | The name of the **plot** | One chart per title |
| `series` | A **line within** that plot | Multiple lines on one chart |

So `title="loss"` with `series="train"` and `series="val"` gives you one chart with two lines — which is what you want. Using `title="train_loss"` and `title="val_loss"` gives you two separate charts you cannot visually compare, which is not.

<div class="callout tip">
  <span class="ct"><code>report_single_value</code> is what shows up in comparison tables</span>
  A scalar is a curve; a single value is a fact about the run. Final test accuracy, total training time, and model size belong in <code>report_single_value</code>, because those are the columns you will sort twenty experiments by later. Report both: the curve for diagnosis, the single value for comparison.
</div>

A realistic training loop, fully instrumented:

```python train.py
from clearml import Task

task = Task.init(project_name="vision", task_name="resnet18 baseline")
logger = task.get_logger()

params = task.connect({"lr": 3e-4, "batch_size": 64, "epochs": 20, "seed": 42})
set_seed(params["seed"])

for epoch in range(params["epochs"]):
    train_loss = train_one_epoch(model, train_loader, lr=params["lr"])
    val_loss, val_acc = evaluate(model, val_loader)

    logger.report_scalar("loss", "train", train_loss, epoch)
    logger.report_scalar("loss", "val", val_loss, epoch)
    logger.report_scalar("accuracy", "val", val_acc, epoch)
    logger.report_scalar("lr", "current", scheduler.get_last_lr()[0], epoch)

test_acc = evaluate(model, test_loader)[1]
logger.report_single_value("test_accuracy", test_acc)
logger.report_single_value("params_millions", count_params(model) / 1e6)
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Instrument a loop with <code>report_scalar</code> using one <code>title</code> and two <code>series</code>. Watch the two lines land on one chart.</li>
    <li>Now split them into two titles and see the difference in the Scalars tab. Put them back.</li>
    <li>Add two <code>report_single_value</code> calls and find them under the Scalars tab's single-value section.</li>
    <li>Report a matplotlib figure and confirm it appears under Plots, interactive rather than as a flat image.</li>
  </ol>
  <em>a Scalars tab you can actually read. The title/series experiment in steps one and two takes two minutes and permanently fixes the most common ClearML plotting mistake.</em>
</div>

## Hyperparameters: the editable surface of a task

Parameters are not just a record. In ClearML they are the **editable surface of a task** — the thing you change when you clone a run and re-launch it. That is why how you register them matters more than it looks.

Three mechanisms, for three shapes of configuration:

```python
# 1. A dict of scalars — the common case
params = task.connect({"lr": 3e-4, "batch_size": 64, "epochs": 20})
print(params["lr"])                     # read from the returned dict, always

# 2. argparse — captured automatically, no call needed
parser = argparse.ArgumentParser()
parser.add_argument("--lr", type=float, default=3e-4)
args = parser.parse_args()              # already registered under "Args"

# 3. A nested config object or file — too big for a parameter list
config = task.connect_configuration(
    configuration="configs/model.yaml",
    name="model config",
)
```

| Mechanism | Best for | Appears as |
|---|---|---|
| `task.connect(dict)` | Hyperparameters | An editable key/value section |
| `argparse` | Command-line scripts | The `Args` section, automatically |
| `task.connect_configuration` | YAML/JSON files, nested structures | An editable text blob |

The critical detail is that `connect` is **bidirectional**. When your code runs normally, `connect` uploads the dict to the server. When an agent runs a *clone* of that task, `connect` reads the values back from the server and overwrites your defaults. Same line of code, opposite direction.

<div class="callout warn">
  <span class="ct">Always read from the returned object, never from your literal</span>
  <code>params = task.connect({"lr": 3e-4})</code> then <code>use(params["lr"])</code> is correct. Calling <code>task.connect(cfg)</code> and then reading your original <code>cfg</code> variable works by luck for a plain dict (it is mutated in place) and silently fails for other types. Read from what <code>connect</code> gave you back and the remote-override behaviour always works.
</div>

```python why it matters
# Locally: lr is 3e-4, uploaded to the server.
# In the UI you clone the task, edit lr to 1e-3, and enqueue.
# On the agent: connect() returns {"lr": 1e-3} — your 3e-4 default is ignored.
params = task.connect({"lr": 3e-4})
train(lr=params["lr"])          # runs with 1e-3, no code change
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Connect a dict of three hyperparameters and run the script.</li>
    <li>In the UI, open Configuration &rarr; Hyperparameters and confirm all three are there and editable.</li>
    <li>Add a YAML file with <code>connect_configuration</code> and find it under Configuration &rarr; Configuration Objects.</li>
    <li>Deliberately read from your original literal instead of the returned dict, and note that nothing breaks <em>yet</em> — the failure only appears once an agent runs a clone.</li>
  </ol>
  <em>a fully editable configuration surface. Step four is the trap: the bug is invisible locally and only surfaces when someone re-launches your task with different values, which is the worst possible time to find it.</em>
</div>

## Artifacts: files and objects on a task

An artifact is any file or Python object you attach to a task. Use them for the things that are neither metrics nor the final model: a preprocessed dataframe, an evaluation report, a vocabulary, a set of predictions.

```python
# A pandas DataFrame — stored as a compressed CSV, previewable in the UI
task.upload_artifact("test predictions", artifact_object=predictions_df)

# A local file or folder
task.upload_artifact("report", artifact_object="outputs/report.html")
task.upload_artifact("plots", artifact_object="outputs/plots/")   # zipped

# Any picklable object
task.upload_artifact("vocab", artifact_object=vocab_dict)

# A numpy array
task.upload_artifact("embeddings", artifact_object=embeddings)
```

And reading them back from another script is the part that makes them useful:

```python consumer.py
from clearml import Task

producer = Task.get_task(project_name="vision", task_name="resnet18 baseline")
df = producer.artifacts["test predictions"].get()          # deserialised object
path = producer.artifacts["report"].get_local_copy()       # downloaded file path
```

| Object you pass | How it is stored | `.get()` returns |
|---|---|---|
| `pandas.DataFrame` | Compressed CSV, with a UI preview | The DataFrame |
| `numpy.ndarray` | `.npz` | The array |
| `dict` / `list` | JSON when possible, else pickle | The object |
| A file path | Uploaded as-is | Use `get_local_copy()` |
| A folder path | Zipped | Use `get_local_copy()` |
| Anything else | Pickle | The object |

<div class="callout warn">
  <span class="ct">Artifacts go to the file server by default, and it is not object storage</span>
  Without an <code>output_uri</code>, everything you upload lands on the ClearML file server. That is fine for reports and dataframes and wrong for 40 GB of checkpoints — the hosted tier has a quota, and a self-hosted file server is a disk you have to manage. Point <code>output_uri</code> at S3 for anything large.
</div>

```python
task = Task.init(project_name="vision", task_name="run", output_uri="s3://my-bucket/clearml")
# or, for every task on this machine, in clearml.conf:
#   sdk.development.default_output_uri: "s3://my-bucket/clearml"
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Upload a small DataFrame as an artifact and open it in the UI's Artifacts tab — note the inline preview.</li>
    <li>Upload a folder and confirm it arrives as a single zip.</li>
    <li>Write a second script that fetches the task by name and calls <code>.get()</code> on the dataframe artifact.</li>
    <li>Check the artifact's URL in the UI and see which server it actually landed on.</li>
  </ol>
  <em>a preview you can read without downloading, and — in step three — data flowing between two runs with no shared filesystem. That is the mechanism pipelines are built on, so it is worth doing by hand once before you meet the abstraction.</em>
</div>

## Models and the registry: weights with provenance

A model is an artifact with privileges: its own registry entry, its own tags, and a recorded link back to the task that produced it. Most of the time you get one for free.

```python
# Automatic: ClearML intercepts the framework's save call
torch.save(model.state_dict(), "model.pt")
joblib.dump(sklearn_model, "model.pkl")
# → both appear in the task's Models tab and in the project's Models list
```

When you want control, register explicitly:

```python
from clearml import OutputModel

output_model = OutputModel(task=task, name="resnet18-cls", framework="PyTorch")
output_model.update_weights(weights_filename="model.pt")
output_model.update_design(config_dict={"arch": "resnet18", "classes": 10})
output_model.tags = ["baseline", "candidate"]
```

And loading one back, which is the half that makes a registry a registry:

```python serve.py
from clearml import InputModel

model = InputModel(model_id="a1b2c3d4e5f6")                    # by id
model = InputModel(project="vision", name="resnet18-cls",      # or by query
                   tags=["production"], only_published=True)

local_weights = model.get_local_copy()      # downloads and caches
```

The lifecycle is deliberately simple at this level:

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>1</span><strong>Created</strong><small>A training task saves weights; a model appears, linked to that task.</small></div>
  <div class="guide-timeline-item"><span>2</span><strong>Tagged</strong><small>You add <code>candidate</code>, <code>staging</code>, or <code>production</code>. Tags are how humans and scripts find it.</small></div>
  <div class="guide-timeline-item"><span>3</span><strong>Published</strong><small>Marks it read-only. Weights and metadata can no longer be changed.</small></div>
  <div class="guide-timeline-item"><span>4</span><strong>Consumed</strong><small><code>InputModel</code> queries by project, name, and tag rather than by a file path.</small></div>
  <div class="guide-timeline-item"><span>5</span><strong>Archived</strong><small>Out of the default views, still fully queryable by id.</small></div>
</div>

<div class="callout tip">
  <span class="ct">Query by tag, never by path</span>
  <code>InputModel(project="vision", name="resnet18-cls", tags=["production"])</code> is the whole point of a registry: your serving code stops containing a filename and starts containing an intent. Promoting a new model then means moving a tag rather than editing and redeploying code.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Save a model with your framework's normal save call and find it in the project's Models list without writing any ClearML model code.</li>
    <li>Open the model and follow the link back to the task that created it. Confirm you can reach the exact commit from there.</li>
    <li>Tag it <code>candidate</code>, then write a script that loads it with <code>InputModel(..., tags=["candidate"])</code> and prints the local path.</li>
    <li>Publish it, then try to change its tags or weights.</li>
  </ol>
  <em>a model whose provenance is one click from the weights, and a loader that names an intent rather than a path. Step four shows you what "published" actually enforces, which is worth knowing before you rely on it as a promotion gate.</em>
</div>

## Datasets: immutable, incremental versions

A tracked experiment that reads `/data/train.csv` is only half-reproducible. `ClearML Dataset` closes that gap: an immutable, versioned, content-addressed collection of files that is itself a task, so it has an id, a project, tags, and lineage.

From the command line:

```bash
clearml-data create --project datasets --name iris --version 1.0.0
clearml-data add --files ./data
clearml-data close                     # uploads and makes the version immutable
```

Or from Python, which is what you will use inside a pipeline:

```python
from clearml import Dataset

ds = Dataset.create(dataset_project="datasets", dataset_name="iris", dataset_version="1.0.0")
ds.add_files("./data")
ds.upload()
ds.finalize()
print(ds.id)
```

Consuming it is one line, and this is the line that makes an experiment reproducible:

```python train.py
from clearml import Dataset

path = Dataset.get(dataset_project="datasets", dataset_name="iris", alias="training data").get_local_copy()
df = pd.read_csv(f"{path}/train.csv")
```

`get_local_copy()` downloads once and caches. Call it again on the same machine and it returns the cached path immediately. The `alias` argument is quietly important: it records the dataset id into the consuming task's parameters, so the experiment's Configuration tab names the exact data version it used.

Versions are **incremental** rather than full copies, which is what makes them cheap:

```python
child = Dataset.create(
    dataset_project="datasets",
    dataset_name="iris",
    dataset_version="1.1.0",
    parent_datasets=[ds.id],       # inherit everything from 1.0.0
)
child.add_files("./new-batch")     # only the delta is uploaded
child.finalize()
```

<div class="flow">
  <div class="node">1.0.0<small>10k rows</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">1.1.0<small>+2k rows</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">1.2.0<small>relabelled</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">get_local_copy()<small>flattened, cached</small></div>
</div>

| Operation | Command |
|---|---|
| Create a version | `Dataset.create(...)` |
| Add files | `ds.add_files(path)` |
| Remove files in a child | `ds.remove_files("old/*.csv")` |
| Upload and seal | `ds.upload()` then `ds.finalize()` |
| Fetch, cached | `Dataset.get(...).get_local_copy()` |
| Fetch, writable | `Dataset.get(...).get_mutable_local_copy(target)` |
| Inspect | `ds.list_files()`, `ds.get_logger()` |
| Compare versions | `Dataset.squash`, or the UI's version tree |

<div class="callout warn">
  <span class="ct">A finalized dataset cannot be changed — and that is the feature</span>
  Once you call <code>finalize()</code>, that version is sealed. To change anything you create a child version. This is deliberate: an experiment that says "trained on iris 1.1.0" is worthless if 1.1.0 can be edited afterwards. If you find yourself wanting to mutate a finalized version, what you actually want is a new child.
</div>

<div class="callout tip">
  <span class="ct">Use <code>get_local_copy()</code>, not <code>get_mutable_local_copy()</code>, in training</span>
  The cached read-only copy is shared between every task on the machine, so ten runs against the same dataset download it once. A mutable copy is a fresh full extraction every time, which is what you want for a preprocessing step that edits files in place and nothing else.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Create a dataset from a folder with two small CSVs and finalize it.</li>
    <li>Create a child version that adds one more file, and confirm in the UI that only the new file was uploaded.</li>
    <li>Fetch it in a training script with an <code>alias</code>, then check the training task's Configuration tab for the recorded dataset id.</li>
    <li>Run the same fetch twice and compare the wall-clock time.</li>
  </ol>
  <em>a delta upload rather than a full copy, an instant second fetch from cache, and — the important one — a training task that records exactly which data version it read. That recorded id is the difference between "trained on the customer data" and a reproducible claim.</em>
</div>

## Comparing experiments: table, chart, and code

This is where the tracking pays off, and it is almost entirely a UI skill. Run your script three times with different learning rates before reading on, so you have something to compare.

In the experiments table:

| Action | How |
|---|---|
| Add a metric as a column | The gear icon → pick from metrics and hyperparameters |
| Sort by a metric | Click the column header |
| Filter | The funnel on any column; or the search box for names and tags |
| Compare | Tick two or more rows → **Compare** |
| Find the differences only | In compare view, toggle "hide identical values" |

The compare view has three tabs, and each answers a different question:

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>What you use it for</h4>
    <ul>
      <li><b>Details</b> — a diff of hyperparameters, packages, and even the code</li>
      <li><b>Scalars</b> — all runs' curves overlaid on one chart</li>
      <li><b>Plots</b> — side-by-side confusion matrices and custom figures</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>What it will not do for you</h4>
    <ul>
      <li>Compare metrics you only <code>print()</code>ed</li>
      <li>Compare parameters you never <code>connect</code>ed</li>
      <li>Diff data you read from an unversioned path</li>
    </ul>
  </div>
</div>

The same queries work from Python, which is how you build a report or a promotion gate:

```python
from clearml import Task

tasks = Task.get_tasks(
    project_name="vision",
    task_filter={"status": ["completed"], "order_by": ["-last_update"]},
)

for t in tasks[:10]:
    metrics = t.get_last_scalar_metrics()
    print(t.name, metrics.get("accuracy", {}).get("val", {}).get("last"))

best = max(tasks, key=lambda t: t.get_last_scalar_metrics()
           .get("accuracy", {}).get("val", {}).get("last", 0))
print("best:", best.id, best.name)
```

<div class="callout tip">
  <span class="ct">Tags are your only real organisation tool — use them from day one</span>
  Projects are folders; tags are cross-cutting. <code>baseline</code>, <code>ablation</code>, <code>broken</code>, <code>paper-v2</code>, <code>candidate</code> — these are what make a table of four hundred runs navigable a month later. Add them in code with <code>task.add_tags([...])</code> so they are never forgotten.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run one script three times with different learning rates, tagging each with <code>task.add_tags(["lr-sweep"])</code>.</li>
    <li>Add the learning rate and your accuracy single-value as columns, then sort by accuracy.</li>
    <li>Select all three, hit Compare, and use "hide identical values" in the Details tab.</li>
    <li>Reproduce the same ranking from Python with <code>Task.get_tasks</code> and <code>get_last_scalar_metrics</code>.</li>
  </ol>
  <em>the compare view with identical values hidden is the moment the whole tool justifies itself: three runs reduced to exactly the one line that differed. Doing it in Python as well matters because that is what a CI promotion check looks like.</em>
</div>

## Agents and queues: running a task elsewhere

Everything so far worked with no worker anywhere. This section is the second half of ClearML: taking a recorded run and executing it somewhere else.

An **agent** is a process that watches a **queue**. When a task is enqueued, the agent claims it, rebuilds its environment from the recorded packages, clones the recorded git commit, applies the recorded diff, and runs the recorded entry point.

```bash
pip install clearml-agent
clearml-agent init                        # same credentials flow as clearml-init

# Run a worker that watches the "default" queue
clearml-agent daemon --queue default

# On a GPU box: one worker per GPU
clearml-agent daemon --queue gpu --gpus 0
clearml-agent daemon --queue gpu --gpus 1

# In Docker mode — the environment is a container, not a virtualenv
clearml-agent daemon --queue gpu --docker nvidia/cuda:12.1.0-runtime-ubuntu22.04
```

<div class="flow">
  <div class="node">CLONE<small>in the UI</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">EDIT<small>parameters</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">ENQUEUE<small>pick a queue</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">AGENT<small>rebuilds and runs</small></div>
</div>

The everyday loop, and it is genuinely this short:

<ol class="guide-steps">
  <li><b>Right-click a completed task → Clone</b>You get an identical task in <code>draft</code> status. The original is untouched; a completed task is read-only.</li>
  <li><b>Edit whatever you want</b>Hyperparameters, the docker image, the git branch, even the entry-point arguments. All editable while in draft.</li>
  <li><b>Enqueue it, choosing a queue</b>The task moves to <code>queued</code>. If no agent watches that queue it simply waits, which is a normal state and not an error.</li>
  <li><b>The agent picks it up</b>Creates a virtualenv (or container), installs the recorded packages, clones the commit, applies the diff, runs the script.</li>
  <li><b>Watch it in the Console tab</b>Identical experience to a local run, on hardware you never logged into.</li>
</ol>

The mechanism that makes this smooth in development is `execute_remotely`:

```python train.py
from clearml import Task

task = Task.init(project_name="vision", task_name="resnet18")
params = task.connect({"lr": 3e-4, "epochs": 50})

# Everything above this line runs locally: the task is created and configured.
# Then the local process exits and the task is enqueued for an agent.
task.execute_remotely(queue_name="gpu")

# Nothing below here runs locally — only on the agent.
train(**params)
```

Run that on your laptop and it takes two seconds: it registers the task, uploads the config, enqueues it, and quits. The fifty-epoch training happens on the GPU box. Comment out one line and the identical script runs locally for debugging. That is the pattern to learn.

| Task status | Means |
|---|---|
| `draft` | Created or cloned, fully editable, not running |
| `queued` | Waiting for an agent on some queue |
| `in_progress` | An agent (or your laptop) is running it |
| `completed` | Finished with exit code 0 |
| `failed` | Non-zero exit; the console log holds the traceback |
| `aborted` | Stopped by a user or by a `task.mark_stopped()` |
| `published` | Read-only and protected from cloning-over |

<div class="callout warn">
  <span class="ct">The agent rebuilds from git, so uncommitted work needs care</span>
  An agent clones your repository at the recorded commit and applies the recorded diff. If your commit is only on your laptop and was never pushed, the agent cannot fetch it and the task fails at setup with a git error. Push your branch before enqueueing. This is the most common first failure with agents, and the error message is clear once you know to look for it.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Start an agent on your own laptop: <code>clearml-agent daemon --queue default</code>. It counts as a worker.</li>
    <li>Clone one of your completed tasks in the UI, change one hyperparameter, and enqueue it to <code>default</code>.</li>
    <li>Watch the agent's terminal build a virtualenv, then watch the Console tab in the UI.</li>
    <li>Add <code>task.execute_remotely(queue_name="default")</code> to your script and run it. Note how fast the local process exits.</li>
    <li>Now enqueue a task whose commit you have not pushed, and read the failure.</li>
  </ol>
  <em>a run you launched without touching a terminal on the executing machine. Running the agent on your own laptop first is the trick that makes this concrete — you can watch both halves at once, and step five teaches you the one error you will otherwise spend an hour on.</em>
</div>

## Your first pipeline: tasks that create tasks

Once runs are re-executable, chaining them is a small step. A pipeline is a task that creates and monitors other tasks.

The decorator style is the clearest starting point:

```python pipeline.py
from clearml import PipelineDecorator

@PipelineDecorator.component(return_values=["data_path"], cache=True, execution_queue="cpu")
def prepare(dataset_name: str):
    from clearml import Dataset
    return Dataset.get(dataset_project="datasets", dataset_name=dataset_name).get_local_copy()

@PipelineDecorator.component(return_values=["model_path", "accuracy"], execution_queue="gpu")
def train(data_path: str, lr: float, epochs: int):
    # ordinary training code
    return "model.pt", 0.941

@PipelineDecorator.component(return_values=["report"], execution_queue="cpu")
def evaluate(model_path: str, data_path: str):
    return {"auc": 0.97}

@PipelineDecorator.pipeline(name="train-and-eval", project="vision", version="1.0.0")
def main(dataset_name="iris", lr=3e-4, epochs=20):
    data_path = prepare(dataset_name)
    model_path, accuracy = train(data_path, lr, epochs)
    if accuracy > 0.9:
        report = evaluate(model_path, data_path)
        print(report)

if __name__ == "__main__":
    PipelineDecorator.run_locally()      # remove this line to run on agents
    main()
```

Three things in there are worth reading twice. **Each component becomes its own task** with its own console log, metrics, and artifacts. **`execution_queue` is per component**, so the CPU preprocessing and the GPU training run on different hardware without you orchestrating anything. And **the graph is inferred from the data flow** — `train` depends on `prepare` because it consumes its return value, not because you declared an edge.

| Style | Use when |
|---|---|
| `PipelineDecorator` | The whole pipeline is Python you control. Clearest to read |
| `PipelineController` with `add_function_step` | You want explicit steps and parameters |
| `PipelineController` with `add_step` | Steps are **existing tasks** you clone by id or name |

The last one is the one that shows what ClearML is really doing:

```python controller.py
from clearml import PipelineController

pipe = PipelineController(name="nightly", project="vision", version="1.0.0")
pipe.add_parameter("lr", 3e-4)

pipe.add_step(name="prepare", base_task_project="vision", base_task_name="prepare data")
pipe.add_step(
    name="train",
    parents=["prepare"],
    base_task_project="vision",
    base_task_name="resnet18 baseline",
    parameter_override={"General/lr": "${pipeline.lr}"},
)
pipe.start(queue="services")
```

A pipeline step here is literally "clone this existing task, override these parameters, run it". Nothing new is invented — it is the clone-and-enqueue loop from the previous section, expressed as a graph.

<div class="callout tip">
  <span class="ct"><code>run_locally()</code> first, always</span>
  Debugging a distributed pipeline is unpleasant. <code>PipelineDecorator.run_locally()</code> runs every component in your own process, sequentially, so a traceback is a normal traceback. Get it green locally, then delete that one line to fan it out across queues.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Write a three-component pipeline where the first returns a number, the second doubles it, and the third prints it. Run it with <code>run_locally()</code>.</li>
    <li>Remove <code>run_locally()</code> and run it against your local agent. Watch three separate tasks appear.</li>
    <li>Open the pipeline task's Results &rarr; Pipeline tab and read the DAG it drew.</li>
    <li>Rerun the pipeline unchanged and watch the <code>cache=True</code> component get skipped.</li>
  </ol>
  <em>a DAG you never drew and, in step four, a skipped step. Caching keys on the component's code and inputs, so an unchanged step is reused — which is what makes iterating on the last step of a long pipeline bearable.</em>
</div>

## Reading a failed task, in order

Debugging ClearML has an order, and following it beats guessing.

<ol class="guide-steps">
  <li><b>Read the Console tab first</b>Your script's stdout and stderr are there in full. Most failures are ordinary Python tracebacks and you can stop here.</li>
  <li><b>Then the Execution tab</b>Confirm the git commit, the branch, the entry point, and the working directory are what you expected. A wrong commit explains a lot.</li>
  <li><b>Then the installed packages list</b>The agent installs exactly this list. A missing system library or a package your script imports lazily shows up as an <code>ImportError</code> here.</li>
  <li><b>Then Configuration</b>An agent-run clone uses the server's parameter values, not your defaults. A surprising value here is usually the whole bug.</li>
  <li><b>Check the worker</b>Workers &amp; Queues shows whether an agent is even watching that queue. A task sitting in <code>queued</code> forever is almost always no agent, or the wrong queue name.</li>
  <li><b>Reproduce locally with the same config</b><code>Task.get_task(task_id=...)</code>, read its parameters, and run the script with them by hand.</li>
</ol>

Five failures cover most of what you will hit at this level:

| Symptom | Cause | Fix |
|---|---|---|
| No metrics appear | `Task.init` ran after the framework import | Move it to the top of the entry point |
| Task stuck in `queued` | No agent on that queue | Start an agent, or check the queue name |
| Agent fails with a git error | Your commit was never pushed | Push the branch, then enqueue |
| `ImportError` on the agent only | Package imported lazily, so never detected | Add it to the task's package list or a `requirements.txt` |
| Parameter change had no effect | Code reads the literal, not `connect`'s return | Read from the returned object |

```python useful in a debugging session
from clearml import Task

t = Task.get_task(task_id="8f2c4b19e0a7d3f1c6b8a2e4d7091f3b")
print(t.status, t.get_last_iteration())
print(t.get_parameters())                  # what it actually ran with
print(t.get_last_scalar_metrics())         # what it produced
print(t.data.script.diff[:500])            # the uncommitted patch it applied
t.mark_stopped()                           # abort a stuck run
```

<div class="guide-try">
  <span class="ct">Try it — cause each failure on purpose</span>
  <ol>
    <li>Move <code>Task.init</code> below your framework imports and confirm the scalars go missing.</li>
    <li>Enqueue a task to a queue name that does not exist and watch it sit in <code>queued</code>.</li>
    <li>Import a package inside a function only, then run the task on an agent and read the <code>ImportError</code>.</li>
    <li>For each one, get to the diagnosis using only the UI tabs in the order above.</li>
  </ol>
  <em>three recognisable failures, two of which are silent rather than loud. The lazy-import one in step three is the sneakiest: it works perfectly on your machine and fails only on the agent, because only your machine already had the package.</em>
</div>

## Putting it all together

Everything above in one project. Nothing here is new — read it as a whole and you should be able to justify every line.

```text project layout
.
├── .gitignore              # includes clearml.conf
├── requirements.txt
├── configs/
│   └── model.yaml          # connected as a configuration object
├── src/
│   ├── make_dataset.py     # creates a ClearML Dataset version
│   ├── train.py            # the tracked experiment
│   ├── evaluate.py         # loads a model by tag, reports metrics
│   └── pipeline.py         # chains the three
└── README.md               # the three commands to reproduce
```

```python src/make_dataset.py
from clearml import Dataset

ds = Dataset.create(
    dataset_project="datasets",
    dataset_name="iris",
    dataset_version="1.0.0",
)
ds.add_files("./data")
ds.upload()
ds.finalize()
print("dataset id:", ds.id)
```

```python src/train.py
from clearml import Task                       # 1. import first

task = Task.init(                              # 2. init before heavy imports
    project_name="vision",
    task_name="resnet18 baseline",
    output_uri="s3://my-bucket/clearml",       # 3. artifacts to object storage
)
task.add_tags(["baseline"])                    # 4. taggable from day one

import torch
from clearml import Dataset, OutputModel

params = task.connect({                        # 5. editable on a clone
    "lr": 3e-4,
    "batch_size": 64,
    "epochs": 20,
    "seed": 42,
})
cfg = task.connect_configuration("configs/model.yaml", name="model config")

# 6. remote execution is one line; comment it out to debug locally
task.execute_remotely(queue_name="gpu")

set_seed(params["seed"])
data = Dataset.get(                            # 7. data version recorded via alias
    dataset_project="datasets",
    dataset_name="iris",
    alias="training data",
).get_local_copy()

logger = task.get_logger()
for epoch in range(params["epochs"]):
    train_loss = train_one_epoch(data, lr=params["lr"])
    val_loss, val_acc = validate(data)
    logger.report_scalar("loss", "train", train_loss, epoch)     # 8. curves
    logger.report_scalar("loss", "val", val_loss, epoch)
    logger.report_scalar("accuracy", "val", val_acc, epoch)

test_acc = test(data)
logger.report_single_value("test_accuracy", test_acc)            # 9. comparable
task.upload_artifact("predictions", predictions_df)              # 10. artifact

model = OutputModel(task=task, name="resnet18-cls", framework="PyTorch")
model.update_weights(weights_filename="model.pt")                # 11. registry
model.tags = ["candidate"]
```

```python src/pipeline.py
from clearml import PipelineController

pipe = PipelineController(name="nightly", project="vision", version="1.0.0")
pipe.add_parameter("lr", 3e-4)

pipe.add_step(name="prepare", base_task_project="vision", base_task_name="make dataset")
pipe.add_step(
    name="train",
    parents=["prepare"],
    base_task_project="vision",
    base_task_name="resnet18 baseline",
    parameter_override={"General/lr": "${pipeline.lr}"},
)
pipe.add_step(name="evaluate", parents=["train"],
              base_task_project="vision", base_task_name="evaluate")

pipe.start(queue="services")            # start_locally() while developing
```

```bash
# One-time setup
pip install clearml clearml-agent
clearml-init

# Everyday loop
python src/train.py                       # tracked; enqueued to gpu by execute_remotely
# → compare in the UI, clone the winner, edit lr, enqueue again

# A worker, wherever the hardware is
clearml-agent daemon --queue gpu --docker nvidia/cuda:12.1.0-runtime-ubuntu22.04
```

Eleven decisions in there are the whole lesson of this page:

| Decision | Section |
|---|---|
| `Task.init` before framework imports | Your first tracked task |
| `output_uri` to S3, not the file server | Artifacts |
| Tags added in code, not by hand | Comparing experiments |
| Hyperparameters through `connect`, read from the return | Hyperparameters and configuration |
| A YAML config through `connect_configuration` | Hyperparameters and configuration |
| `execute_remotely` as the one line that moves the run | Agents and queues |
| Data through `Dataset.get(..., alias=...)` | Datasets |
| Curves with one `title` and several `series` | Logging on purpose |
| Final numbers as `report_single_value` | Logging on purpose |
| Extra outputs as artifacts, not loose files | Artifacts |
| Weights registered as a model, with a tag | Models and the registry |

<div class="guide-try">
  <span class="ct">Try it — the one that matters</span>
  <ol>
    <li>Take this structure into a project you actually work on, adapting the training body to your own code.</li>
    <li>Get one tracked run green locally, with scalars, a single value, an artifact, and a registered model.</li>
    <li>Version your input data as a ClearML Dataset and consume it with an <code>alias</code>.</li>
    <li>Start an agent, then clone your run in the UI, change one hyperparameter, and enqueue it. Do not touch the terminal on the executing machine.</li>
    <li>Compare the two runs and confirm "hide identical values" shows exactly the one parameter you changed.</li>
  </ol>
  <em>a run whose data, code, config, metrics, and weights are all one click apart, and a second run launched entirely from a browser. Step five is the acceptance test: if the compare view shows more differences than you intended, something is not being captured and you have found a real gap.</em>
</div>

## What you can now do, and what comes next

You can track an experiment with two lines, log metrics and artifacts deliberately, register and query models, version datasets incrementally, compare dozens of runs in a table and in code, clone a run and re-launch it on other hardware without SSH, chain runs into a cached pipeline, and diagnose a failed task in a fixed order. That is a working practitioner's toolkit — enough to own the experiment-tracking and reproducibility story on a real project.

| Can you… | |
|---|---|
| Say what a Task actually is? | One recorded, re-executable run |
| Name the four parts of ClearML? | SDK, API/web/file server, agent, queue |
| Say why `Task.init` goes first? | It patches frameworks at import time |
| List what is captured automatically? | Code, diff, packages, args, TB metrics, models, console |
| Explain `title` versus `series`? | One chart per title, one line per series |
| Say when to use `report_single_value`? | Facts about the run, for comparison columns |
| Explain why `connect` is bidirectional? | Local upload; on an agent, download and override |
| Say where artifacts go by default? | The file server — set `output_uri` for anything large |
| Name the two dataset fetch modes? | `get_local_copy` cached, `get_mutable_local_copy` fresh |
| Say what an agent does with a queued task? | Rebuilds env, clones commit, applies diff, runs it |
| Explain what `execute_remotely` does? | Registers and enqueues, then exits locally |
| Name the first tab to open on a failure? | Console, then Execution |

**Mid-level takes every one of those topics further** — hyperparameter optimisation with `HyperParameterOptimizer` and Optuna, task types and the services queue, agent modes and caching in depth, docker mode and `clearml-task` for launching unmodified code, remote debugging with `clearml-session`, dataset internals and squashing, the model registry as a promotion workflow, ClearML Serving, autoscalers, reports, and the CI patterns that make a training run a pull-request check.

**Senior then covers what you own when ClearML is your team's platform**: the self-hosted deployment and its three data stores, the access and credential model, multi-tenancy across teams, storage cost and retention, Elasticsearch and MongoDB scaling, upgrade and backup procedure, audit and lineage for regulated work, GPU fleet economics, incident playbooks, and where ClearML stops and a feature store, a data warehouse, or a dedicated serving stack begins.



