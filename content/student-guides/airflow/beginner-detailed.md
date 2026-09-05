This is part one of three. It covers **everything you need to do real work with Airflow**, not a teaser. By the end you can write a DAG, schedule it, pass data between tasks, retry failures sensibly, connect to a database, backfill history, and read the interface well enough to debug a red run. Mid-level and Senior take the same topics further; nothing here is thrown away.

Each section ends with a **Try it** task. Do them as you go. They take a few minutes each, and these concepts only stick once you have watched your own DAG turn green, then deliberately red.

## What Airflow is, and the problem it solves

Airflow is a platform for **writing, scheduling, and monitoring workflows in Python**. You define a workflow as code, Airflow works out the order tasks must run in, executes them on a schedule, retries the ones that fail, and gives you a web interface showing what happened.

<div class="flow">
  <div class="node">DAG FILE<small>Python</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">SCHEDULER<small>decides what runs</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">EXECUTOR<small>runs it</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">UI<small>green or red</small></div>
</div>

The diagram is the whole idea. Compare it to what came before.

Before this, a data pipeline was a chain of cron jobs. `0 2 * * * /opt/etl/extract.sh` at 2am, then `0 3 * * * /opt/etl/transform.sh` at 3am, and a hope that extract finished within the hour. When it did not, transform ran on yesterday's data and nobody noticed until a dashboard looked wrong on Thursday. There was no dependency graph, no retry, no history, and no answer to "did last Tuesday's run succeed?" other than grepping logs on whichever box happened to have them.

**Airflow replaces the hope with a dependency graph.** Transform does not run at 3am; it runs when extract has succeeded. If extract fails, transform does not run at all, and you get told.

Two consequences of the design explain most of what follows. Notice them now rather than discovering them later.

**Workflows are Python files.** That means your pipeline is versioned, reviewed, and diffed like any other code, and it also means Airflow *executes* your file to discover the DAG, which has consequences for performance and safety that we come back to repeatedly.

**Airflow is an orchestrator, not a compute engine.** It decides *what* runs and *when*, and it is deliberately bad at processing data itself. A task that loads a 40 GB dataframe into the worker's memory is a misuse; a task that tells Spark or BigQuery or dbt to do that work is correct. This distinction separates people who have operated Airflow from people who have only read about it.

What people use it for:

<div class="cards">
  <div class="card"><div class="icon">🔄</div><h4>ETL and ELT</h4><p>Extract from sources, load into a warehouse, transform. All on a schedule, in dependency order, with retries.</p></div>
  <div class="card"><div class="icon">🤖</div><h4>ML pipelines</h4><p>Feature builds, scheduled retraining, batch inference, and the checks that gate a model release.</p></div>
  <div class="card"><div class="icon">📊</div><h4>Reporting</h4><p>Nightly aggregations that must complete before people arrive, with alerting when they do not.</p></div>
  <div class="card"><div class="icon">🧹</div><h4>Operational chores</h4><p>Backups, cleanups, data-quality checks, and anything currently living in a forgotten crontab.</p></div>
</div>

You need little to follow along: Python, Docker, and a terminal. The official Docker Compose setup gets you a working Airflow in about five minutes, and a DAG with three `EmptyOperator` tasks is enough to learn the whole scheduling model.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Find a scheduled job you or your team depend on: a cron entry, a Jenkins job, a scheduled notebook.</li>
    <li>Write down what happens if it fails at 2am. Who finds out, and how long does it take?</li>
    <li>Write down what happens to the job that runs after it.</li>
  </ol>
  <em>usually "nobody finds out until someone notices a wrong number", and "the next job runs anyway on stale data". Those two answers are the entire value proposition of an orchestrator, and it is worth having them in your own words before you write a line of Airflow.</em>
</div>

## The architecture: five components, two planes

You will hit error messages that only make sense if you know which component is complaining, so learn the shape now.

| Component | Job | You notice it when |
|---|---|---|
| **Scheduler** | Parses DAG files, decides which task instances are ready, queues them | Nothing runs, or runs late |
| **Executor** | Hands queued tasks to workers | Tasks sit in `queued` forever |
| **Worker** | Actually runs your task code | Your task fails, or runs out of memory |
| **Metadata database** | Every DAG run, task instance, connection, variable | The UI is slow, or state looks wrong |
| **Webserver** | The UI and REST API | You cannot see anything, but pipelines still run |

<div class="guide-arch" style="--arch-cols:3">
  <div class="arch-lane" style="--lane-cols:1">
    <span class="arch-label">what you write</span>
    <div class="arch-node" data-kind="entry"><b><code>dags/</code>: plain Python files</b><small>Re-parsed every ~30s. The scheduler <em>executes</em> each file to find DAG objects</small></div>
  </div>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down"></i>
  <div class="arch-lane" style="--lane-cols:3">
    <span class="arch-label">control plane</span>
    <div class="arch-node" data-kind="worker"><b>Scheduler</b><small>Parses DAGs, decides which task instances are ready, queues them</small></div>
    <div class="arch-node" data-kind="store"><b>Metadata database</b><small><em>The source of truth.</em> Every run, task instance, connection, variable</small></div>
    <div class="arch-node"><b>Webserver</b><small>A window onto the database. Stop it and pipelines keep running</small></div>
  </div>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down" data-flow="optional"></i>
  <div class="arch-lane" style="--lane-cols:3">
    <span class="arch-label">execution plane</span>
    <div class="arch-node" data-kind="worker"><b>Executor</b><small>Hands queued tasks to workers. Tasks stuck in <code>queued</code> point here</small></div>
    <div class="arch-node" data-kind="worker"><b>Worker</b><small>Runs your task code. Failures and OOM kills happen here</small></div>
    <div class="arch-node" data-kind="external"><b>Triggerer</b><small>Deferred tasks. Ignore it until Mid level</small></div>
  </div>
  <p class="arch-note"><b>Two facts to carry forward:</b> the scheduler executes your DAG files continuously, so slow top-level code slows the entire scheduler, and the database, not the file, records what happened. When the UI shows a task your file no longer defines, both are correct; they answer different questions.</p>
</div>

Two things about this picture matter immediately.

**The scheduler re-reads your DAG files continuously.** By default every thirty seconds it scans the folder for changes, and it *executes* each file to find DAG objects. Slow top-level code therefore slows down the whole scheduler, which is the single most common cause of "why is Airflow so sluggish", and the reason for a rule we will state properly in a moment.

**The metadata database is the source of truth, not your DAG file.** The file says what *should* exist; the database records what *did* happen. When the UI shows a task as failed and your file no longer contains that task, both are correct. They are answering different questions.

There is a sixth component you will meet at Mid level, the **triggerer**, which handles deferred tasks. Ignore it for now.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Get Airflow running: download the official <code>docker-compose.yaml</code> and run <code>docker compose up -d</code>.</li>
    <li>Run <code>docker compose ps</code> and match each container to a row in the table above.</li>
    <li>Open <code>localhost:8080</code> and log in. The scheduler is a separate container from the webserver.</li>
    <li>Stop just the webserver: <code>docker compose stop airflow-webserver</code>. Wait a minute, then start it again and check whether any scheduled runs were missed.</li>
  </ol>
  <em>the UI disappears but the scheduler keeps working. Runs continue while you cannot see them. Prove that to yourself once and the webserver stops looking like the engine.</em>
</div>

## Your first DAG, line by line

Enough theory. Create a file called `hello_dag.py` in your `dags/` folder.

```python dags/hello_dag.py
from datetime import datetime
from airflow import DAG
from airflow.operators.empty import EmptyOperator
from airflow.operators.bash import BashOperator

with DAG(
    dag_id="hello_world",
    start_date=datetime(2024, 1, 1),
    schedule="@daily",
    catchup=False,
    tags=["tutorial"],
) as dag:

    start = EmptyOperator(task_id="start")

    say_hello = BashOperator(
        task_id="say_hello",
        bash_command="echo 'Hello from Airflow'",
    )

    show_date = BashOperator(
        task_id="show_date",
        bash_command="date",
    )

    start >> say_hello >> show_date
```

Wait up to thirty seconds and it appears in the UI. Unpause it with the toggle and watch it run.

Now let me walk through every line, because this small file contains the entire conceptual model.

`with DAG(...) as dag:` creates the DAG object. Everything defined inside the block is attached to it automatically, which is why you rarely see `dag=dag` on each task in modern code.

`dag_id="hello_world"` is the unique identifier. It appears in the UI, in the CLI, and in the database, so renaming it creates a *new* DAG and abandons the old one's history.

`start_date=datetime(2024, 1, 1)` is the date from which Airflow considers intervals to exist, not the day you wrote the file. It is the single most misunderstood parameter in Airflow and it gets its own section shortly.

`schedule="@daily"` is how often it runs. A cron string, a preset like this, or `None` for manual-only.

`catchup=False` tells Airflow **not** to run every interval between `start_date` and now. Leave this out on a DAG with a 2022 start date and you will trigger seven hundred runs the moment you unpause it. More on this shortly too.

`tags=["tutorial"]` groups DAGs in the UI. Free, and worth using from the first DAG.

`EmptyOperator` does nothing. It exists as a marker, a clean entry or exit point in a graph, and it is useful.

`BashOperator` runs a shell command on the worker.

`start >> say_hello >> show_date` sets the dependencies. That `>>` is Airflow's bitshift operator, overloaded to mean "then".

<div class="callout note">
  <span class="ct">A DAG is a directed acyclic graph</span>
  Directed: dependencies point one way. Acyclic: no loops, so a task cannot eventually depend on itself. Airflow enforces this: a cycle is an import error, not a runtime surprise. That guarantee is what lets the scheduler always compute an execution order.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Create the DAG above, wait for it to appear, unpause it, and watch the graph turn green.</li>
    <li>Click into <code>say_hello</code> and read the log. Find your echoed line.</li>
    <li>Add a fourth task and put it in parallel: <code>start &gt;&gt; [say_hello, show_date]</code>.</li>
    <li>Now create a cycle on purpose, <code>show_date &gt;&gt; say_hello</code> as well, and read the error Airflow gives you.</li>
  </ol>
  <em>a green run, a readable log, and a parallel branch. The deliberate cycle produces an import error in the UI rather than a broken run, which is the acyclic guarantee doing its job.</em>
</div>

## Tasks, operators, and the dependency graph

Three words that get used loosely and mean different things.

| Term | Is |
|---|---|
| **Operator** | A class describing *a kind of work*: `BashOperator`, `PythonOperator` |
| **Task** | An instance of an operator inside a DAG, with a `task_id` |
| **Task instance** | One specific run of that task for one specific interval |

So `BashOperator` is the operator, `say_hello` is the task, and "`say_hello` for 2024-05-01" is the task instance. The UI shows task instances; your file defines tasks.

The operators you will use early:

| Operator | Runs |
|---|---|
| `EmptyOperator` | Nothing: a graph marker |
| `BashOperator` | A shell command |
| `PythonOperator` | A Python callable |
| `SQLExecuteQueryOperator` | SQL against a connection |
| `DockerOperator` / `KubernetesPodOperator` | A container |
| Provider operators | S3, BigQuery, Postgres, Slack, dbt, and hundreds more |

Dependencies have four shapes worth knowing:

```python
a >> b                      # a, then b
a << b                      # b, then a  (the same thing, read backwards)

a >> [b, c] >> d            # fan out to b and c in parallel, then fan in to d

chain(a, b, c, d)           # a >> b >> c >> d, without the arrow soup
cross_downstream([a, b], [c, d])   # every one of a,b feeds every one of c,d
```

```python
from airflow.models.baseoperator import chain, cross_downstream
```

<div class="callout tip">
  <span class="ct">Prefer <code>chain()</code> once you have more than three tasks</span>
  <code>a &gt;&gt; b &gt;&gt; [c, d] &gt;&gt; e &gt;&gt; [f, g] &gt;&gt; h</code> is technically fine and unreadable in review. <code>chain()</code> and <code>cross_downstream()</code> express the same graph in a form a colleague can scan.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Build a diamond: one task fanning out to two parallel tasks, fanning back into one.</li>
    <li>Open the <strong>Graph</strong> view and confirm the shape matches your intent.</li>
    <li>Rewrite the same graph using <code>chain()</code> and confirm the Graph view is identical.</li>
    <li>Make one of the parallel tasks fail with <code>bash_command="exit 1"</code> and watch what happens to the task after it.</li>
  </ol>
  <em>a diamond in the Graph view, and a downstream task marked <code>upstream_failed</code> rather than run. That state is Airflow's core promise: a failure upstream stops the work that depended on it.</em>
</div>

## The TaskFlow API: DAGs that read like Python

Everything above is the classic operator style, and you will read a lot of it. For Python work, modern Airflow has a cleaner form.

```python dags/taskflow_example.py
from datetime import datetime
from airflow.decorators import dag, task

@dag(
    dag_id="taskflow_example",
    start_date=datetime(2024, 1, 1),
    schedule="@daily",
    catchup=False,
    tags=["tutorial"],
)
def etl_pipeline():

    @task
    def extract():
        return {"records": [1, 2, 3, 4, 5]}

    @task
    def transform(data: dict):
        return {"total": sum(data["records"])}

    @task
    def load(result: dict):
        print(f"Loading total: {result['total']}")

    load(transform(extract()))

etl_pipeline()
```

Read the last line inside the function: `load(transform(extract()))`. That single expression does two things at once. It declares the dependency chain **and** passes the return values along it. No `>>`, no manual data passing.

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>TaskFlow: for Python work</h4>
    <ul>
      <li>Dependencies inferred from function calls</li>
      <li>Return values passed automatically</li>
      <li>Type hints and normal Python signatures</li>
      <li>Much less boilerplate</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Classic operators: for everything else</h4>
    <ul>
      <li>Explicit <code>&gt;&gt;</code> dependencies</li>
      <li>Data passed manually through XCom</li>
      <li>The only option for non-Python operators</li>
      <li>What most existing DAGs look like</li>
    </ul>
  </div>
</div>

They mix freely in one DAG, which is what you will do:

```python
    raw = extract()                                    # TaskFlow task
    notify = BashOperator(task_id="notify", bash_command="echo done")
    raw >> notify                                      # classic dependency
```

<div class="callout tip">
  <span class="ct">Use TaskFlow for Python, operators for systems</span>
  If the work is Python you wrote, TaskFlow is shorter and clearer. If the work is "run this SQL", "start this Spark job", "wait for this file", use the provider operator built for it. Reimplementing an operator inside a <code>@task</code> is a common beginner instinct and almost always the wrong trade.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Write the TaskFlow DAG above and confirm the Graph view shows <code>extract → transform → load</code> without any <code>&gt;&gt;</code>.</li>
    <li>Read the <code>transform</code> log and find where the value from <code>extract</code> arrived.</li>
    <li>Add a classic <code>BashOperator</code> after <code>load</code> and wire it with <code>&gt;&gt;</code>.</li>
    <li>Now break the chain: call <code>transform(extract())</code> but never use its result, and see what the Graph view does.</li>
  </ol>
  <em>a dependency graph inferred from function calls, and a mixed DAG where both styles coexist. Step four shows the flip side: a task whose result nobody consumes still runs, because the call itself created it.</em>
</div>

## Scheduling: the interval model, precisely

This is where almost everyone gets confused. Slow down: every later concept depends on it.

**Airflow schedules intervals, not moments.** A `@daily` DAG with `start_date=2024-05-01` produces a run for the interval covering 1 May, and that run starts **at the end of the interval**, just after midnight on 2 May. The data for 1 May is only complete once 1 May is over.

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>2024-05-01 00:00</span><strong>Interval starts</strong><small><code>data_interval_start</code>. Nothing runs yet.</small></div>
  <div class="guide-timeline-item"><span>2024-05-02 00:00</span><strong>Interval ends</strong><small><code>data_interval_end</code>. The run is now scheduled.</small></div>
  <div class="guide-timeline-item"><span>2024-05-02 00:00:05</span><strong>The run starts</strong><small>The scheduler creates the DAG run and queues its first tasks.</small></div>
  <div class="guide-timeline-item"><span>2024-05-02 00:02</span><strong>Tasks complete</strong><small>Logical date is 2024-05-01, the interval rather than the wall clock.</small></div>
</div>

The parameter values, in the order they cause trouble:

| Parameter | Means | Common mistake |
|---|---|---|
| `start_date` | The first interval Airflow considers | Setting it to "today" and wondering why nothing ran |
| `schedule` | How often: cron, preset, timedelta, or `None` | Assuming it fires *at* the start of the interval |
| `catchup` | Whether to run every missed interval since `start_date` | Leaving it `True` with an old start date |
| `end_date` | Stop scheduling after this | Rarely needed; useful for a migration |

```python
schedule="@daily"                    # midnight, every day
schedule="0 2 * * *"                 # 02:00 every day, cron
schedule="0 9 * * 1-5"               # 09:00 on weekdays
schedule=timedelta(hours=6)          # every six hours from start_date
schedule=None                        # manual and triggered runs only
schedule="@once"                     # exactly once
```

<div class="callout warn">
  <span class="ct"><code>catchup=True</code> with an old start date will flood your cluster</span>
  A DAG with <code>start_date=datetime(2022, 1, 1)</code>, <code>schedule="@daily"</code>, and <code>catchup=True</code> creates roughly <b>eight hundred</b> DAG runs the moment you unpause it. Default to <code>catchup=False</code> and backfill deliberately when you want history. There is a command for it, covered later.
</div>

The other detail that costs people an afternoon: **use the interval, not `datetime.now()`**. A task that queries "yesterday" by calling `now()` produces different results on a rerun than it did originally, which destroys reproducibility. Airflow gives you the interval as a template variable.

```python
BashOperator(
    task_id="extract",
    bash_command="python extract.py --date {{ ds }}",     # 2024-05-01
)
```

| Variable | Value for the 1 May interval |
|---|---|
| `{{ ds }}` | `2024-05-01`: the logical date |
| `{{ ds_nodash }}` | `20240501` |
| `{{ data_interval_start }}` | `2024-05-01T00:00:00+00:00` |
| `{{ data_interval_end }}` | `2024-05-02T00:00:00+00:00` |
| `{{ prev_ds }}` / `{{ next_ds }}` | The neighbouring intervals |
| `{{ dag_run.run_id }}` | This run's identifier |
| `{{ ts }}` | The full logical timestamp |

<div class="guide-try">
  <span class="ct">Try it: the one that makes scheduling click</span>
  <ol>
    <li>Create a <code>@daily</code> DAG with <code>start_date</code> three days ago and <code>catchup=True</code>. Unpause it and count the runs.</li>
    <li>Add a <code>BashOperator</code> running <code>echo "logical={{ ds }} now=$(date -I)"</code> and compare the two values in each run's log.</li>
    <li>Set <code>catchup=False</code>, clear everything, and confirm only the most recent interval runs.</li>
    <li>Change <code>start_date</code> to tomorrow and confirm nothing runs at all.</li>
  </ol>
  <em>three runs appear immediately with catchup on, and in each log the logical date differs from the wall clock. Seeing <code>logical=2024-05-01 now=2024-05-04</code> in a backfilled run is the moment the interval model becomes obvious rather than confusing.</em>
</div>

## Retries, timeouts, and `default_args`

A pipeline that fails permanently on a transient network blip is not production-ready. Airflow's retry handling is a few parameters, and setting them is the difference between a pipeline you trust and one you babysit.

```python dags/robust_dag.py
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.bash import BashOperator

default_args = {
    "owner": "data-platform",
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
    "retry_exponential_backoff": True,
    "max_retry_delay": timedelta(minutes=30),
    "execution_timeout": timedelta(minutes=45),
    "email_on_failure": False,
}

with DAG(
    dag_id="robust_pipeline",
    start_date=datetime(2024, 1, 1),
    schedule="@daily",
    catchup=False,
    default_args=default_args,
    dagrun_timeout=timedelta(hours=2),
    max_active_runs=1,
    tags=["production"],
) as dag:

    fetch = BashOperator(
        task_id="fetch_api",
        bash_command="python fetch.py --date {{ ds }}",
        retries=5,                          # overrides the default for this task
    )
```

| Parameter | Scope | Does |
|---|---|---|
| `retries` | Task | How many times to retry after a failure |
| `retry_delay` | Task | How long to wait before retrying |
| `retry_exponential_backoff` | Task | Doubles the delay each attempt |
| `execution_timeout` | Task | Kill the task if it exceeds this |
| `dagrun_timeout` | DAG | Fail the whole run if it exceeds this |
| `max_active_runs` | DAG | How many runs of this DAG may overlap |
| `max_active_tasks` | DAG | Task-level concurrency within the DAG |
| `depends_on_past` | Task | Only run if the previous interval's instance succeeded |

`default_args` is applied to every task in the DAG, and any task can override an individual value. That pattern (sensible defaults at the DAG level, exceptions at the task level) is how real DAGs stay readable.

<div class="callout warn">
  <span class="ct">Retries are only safe if your task is idempotent</span>
  Running a task twice must produce the same result as running it once. A task that <code>INSERT</code>s rows will duplicate them on retry; a task that <code>DELETE</code>s the target partition and then inserts will not. Design for reruns and retries become free. Otherwise every retry is a data-quality incident waiting to happen.
</div>

`execution_timeout` deserves special mention because its absence is the classic outage: a task that hangs on a network read holds a worker slot indefinitely, and with `max_active_runs` unset the next intervals pile up behind it until the whole DAG is stuck. One `timedelta` prevents it.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add a task that fails: <code>bash_command="exit 1"</code>, with <code>retries=2</code> and <code>retry_delay=timedelta(seconds=10)</code>.</li>
    <li>Watch the UI cycle through <code>up_for_retry</code> and read the log. All three attempts are there.</li>
    <li>Add <code>execution_timeout=timedelta(seconds=15)</code> to a task running <code>sleep 60</code> and watch it be killed.</li>
    <li>Now make the failing task succeed on its third attempt using a file-based counter, and confirm the DAG run turns green.</li>
  </ol>
  <em>a task that retries visibly, one that is killed on timeout, and one that eventually succeeds and marks the run green. That last case is what retries are for, and watching it work is what makes you trust them.</em>
</div>

## Passing data with XCom, and its limits

Tasks are separate processes, often on separate machines. XCom, cross-communication, is how they pass small values.

```python
@task
def get_record_count():
    return 4_213                       # pushed to XCom automatically

@task
def report(count: int):
    print(f"Processed {count} records")

report(get_record_count())
```

With TaskFlow, returning a value pushes it and consuming it pulls it. With classic operators you do it by hand:

```python
def _extract(**context):
    context["ti"].xcom_push(key="row_count", value=4213)

def _report(**context):
    count = context["ti"].xcom_pull(task_ids="extract", key="row_count")
    print(f"Processed {count} records")
```

In a template, `ti.xcom_pull` is available directly:

```python
BashOperator(
    task_id="notify",
    bash_command="echo 'rows: {{ ti.xcom_pull(task_ids=\"extract\") }}'",
)
```

<div class="callout warn">
  <span class="ct">XCom is for metadata, not data</span>
  Every XCom value is serialised into the <b>metadata database</b>. A row count, a file path, a partition name, a model version are all fine. A dataframe, a file's contents, a list of a million ids are not: you will bloat the database, slow every UI page, and eventually hit a size limit. The correct pattern is to write the data to object storage and pass the <b>path</b> through XCom.
</div>

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Pass through XCom</h4>
    <ul>
      <li>A row count or a checksum</li>
      <li>An S3 key or a table partition</li>
      <li>A model version or a run id</li>
      <li>A small dict of decisions</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Pass through storage instead</h4>
    <ul>
      <li>A dataframe of any size</li>
      <li>A file's contents</li>
      <li>Query results</li>
      <li>Anything you would not put in a database cell</li>
    </ul>
  </div>
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Write a TaskFlow DAG where <code>extract</code> returns a dict and <code>load</code> consumes it. Confirm it works.</li>
    <li>Open the task instance details in the UI and find the <strong>XCom</strong> tab, then read the stored value.</li>
    <li>Now return a large object, <code>list(range(500_000))</code>, and observe the effect on the run and the XCom page.</li>
    <li>Rewrite it properly: write the list to a file, return the path, and read the file in the next task.</li>
  </ol>
  <em>a visible XCom value in the UI, then a painfully slow one, then a clean version that passes a path. Doing the wrong version once makes the "metadata, not data" rule permanent.</em>
</div>

## Connections and Variables: config outside the DAG

Credentials do not belong in your DAG file. Airflow has two stores for configuration, and they have different jobs.

**Connections** describe how to reach an external system. Create one in **Admin → Connections**, or from the CLI:

```bash
airflow connections add 'warehouse' \
    --conn-type 'postgres' \
    --conn-host 'db.internal' \
    --conn-port 5432 \
    --conn-schema 'analytics' \
    --conn-login 'airflow' \
    --conn-password 'secret'
```

```python
from airflow.providers.postgres.hooks.postgres import PostgresHook
from airflow.providers.common.sql.operators.sql import SQLExecuteQueryOperator

# In an operator: name the connection, never the credentials
SQLExecuteQueryOperator(
    task_id="daily_rollup",
    conn_id="warehouse",
    sql="sql/daily_rollup.sql",
)

# In Python: a hook gives you a real client
@task
def count_rows():
    hook = PostgresHook(postgres_conn_id="warehouse")
    return hook.get_first("SELECT count(*) FROM events")[0]
```

**Variables** hold configuration values that are not credentials, like a bucket name, a threshold, or a feature flag:

```python
from airflow.models import Variable

bucket = Variable.get("data_bucket")
config = Variable.get("pipeline_config", deserialize_json=True)
retries = Variable.get("max_retries", default_var=3)
```

| Store | For | Read in a DAG with |
|---|---|---|
| **Connection** | Host, port, credentials, extras for a system | `conn_id=` on an operator, or a Hook |
| **Variable** | Non-secret configuration values | `Variable.get()`, or `{{ var.value.name }}` |

<div class="callout warn">
  <span class="ct">Never call <code>Variable.get()</code> at the top level of a DAG file</span>
  Top-level code runs on <b>every parse</b>, every thirty seconds, for every DAG file. A <code>Variable.get()</code> up there is a database query on that schedule, and ten such DAGs will visibly degrade your scheduler. Use it inside a task, or use the template form <code>{{ var.value.data_bucket }}</code>, which is only resolved at run time.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Create a connection in the UI to any database you have. Even the Airflow metadata Postgres will do for practice.</li>
    <li>Write a task that uses a Hook to run <code>SELECT 1</code> and returns the result.</li>
    <li>Create a Variable and read it two ways: with <code>Variable.get()</code> inside a task, and with <code>{{ var.value.name }}</code> in a Bash command.</li>
    <li>Now put <code>Variable.get()</code> at the top of the file, and watch the DAG-parse duration in <strong>Admin → DAG Processing</strong>.</li>
  </ol>
  <em>a working database task with no credentials in your code, and a measurable parse-time increase from one misplaced <code>Variable.get()</code>. That measurement is the most convincing argument against top-level code you will find.</em>
</div>

## Templating with Jinja: values resolved at run time

That `{{ ds }}` is Jinja. Airflow renders templated fields at run time, which is how a task knows which interval it is working on.

```python
BashOperator(
    task_id="load_partition",
    bash_command=(
        "python load.py "
        "--source s3://{{ var.value.data_bucket }}/raw/{{ ds }}/ "
        "--target events_{{ ds_nodash }} "
        "--run-id {{ dag_run.run_id }}"
    ),
)

SQLExecuteQueryOperator(
    task_id="rollup",
    conn_id="warehouse",
    sql="sql/rollup.sql",              # the FILE is templated too
    params={"lookback_days": 7},
)
```

```sql sql/rollup.sql
DELETE FROM daily_stats WHERE day = '{{ ds }}';

INSERT INTO daily_stats (day, events, users)
SELECT '{{ ds }}', count(*), count(DISTINCT user_id)
FROM events
WHERE event_date BETWEEN '{{ macros.ds_add(ds, -params.lookback_days) }}'
                     AND '{{ ds }}';
```

Note the shape of that SQL: a `DELETE` for the target partition followed by an `INSERT`. That is the **idempotent** pattern. Rerun it as many times as you like and the result is identical, which is what makes retries and backfills safe.

Two things to know about templating:

**Only declared fields are templated.** Each operator has a `template_fields` list. `BashOperator` templates `bash_command` and `env`; `SQLExecuteQueryOperator` templates `sql` and `parameters`. Putting `{{ ds }}` in an untemplated field gives you the literal string.

**`macros` gives you date arithmetic** without importing anything: `{{ macros.ds_add(ds, -7) }}`, `{{ macros.datetime.now() }}`, `{{ macros.ds_format(ds, "%Y-%m-%d", "%d/%m/%Y") }}`.

<div class="callout tip">
  <span class="ct">Check the rendered value before debugging your code</span>
  A task instance's <strong>Rendered Template</strong> tab in the UI shows what the field became after templating. Half of "my SQL is wrong" turns out to be a template that resolved differently than expected, and this tab answers it in one click.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Write a task whose command includes <code>{{ ds }}</code>, <code>{{ ds_nodash }}</code>, and <code>{{ macros.ds_add(ds, -7) }}</code>.</li>
    <li>Run it, then open <strong>Rendered Template</strong> and compare against the log output.</li>
    <li>Put <code>{{ ds }}</code> into a field that is <em>not</em> templated (<code>task_id</code>, for instance) and see the literal string appear.</li>
    <li>Write the idempotent SQL above against a scratch table, run it twice, and confirm the row count does not double.</li>
  </ol>
  <em>a rendered template you can read before the task runs, a literal <code>{{ ds }}</code> in an untemplated field, and SQL that is safe to rerun. That last property is the foundation everything else in Airflow relies on.</em>
</div>

## Sensors: waiting without wasting a worker

Sometimes a task cannot start until something external exists: a file lands, a table is populated, an upstream team finishes. A **sensor** is an operator that waits.

```python
from airflow.providers.amazon.aws.sensors.s3 import S3KeySensor
from airflow.sensors.filesystem import FileSensor

wait_for_file = S3KeySensor(
    task_id="wait_for_extract",
    bucket_name="raw-data",
    bucket_key="events/{{ ds }}/_SUCCESS",
    aws_conn_id="aws_default",
    poke_interval=60,                    # check every minute
    timeout=60 * 60 * 4,                 # give up after four hours
    mode="reschedule",                   # ← the important one
)
```

The parameter that matters most is `mode`, and getting it wrong is one of the classic ways to deadlock a cluster:

| Mode | Behaviour | Cost |
|---|---|---|
| `poke` (default) | Holds a worker slot for the entire wait | One slot per waiting sensor |
| `reschedule` | Releases the slot between checks | Almost nothing while waiting |

<div class="callout warn">
  <span class="ct">Sensors in <code>poke</code> mode can deadlock your cluster</span>
  Ten sensors each waiting four hours in <code>poke</code> mode occupy ten worker slots for four hours. If you have sixteen slots, six real tasks can run and everything else queues, including the upstream tasks the sensors are waiting for. Use <code>mode="reschedule"</code> for anything that might wait more than a couple of minutes, and <b>always set a <code>timeout</code></b>. Mid level covers deferrable operators, which are better still.
</div>

Two more waiting patterns worth knowing now:

```python
from airflow.sensors.external_task import ExternalTaskSensor

# Wait for a task in a different DAG's matching interval
wait_upstream = ExternalTaskSensor(
    task_id="wait_for_ingest",
    external_dag_id="ingest_events",
    external_task_id="load_complete",
    mode="reschedule",
    timeout=60 * 60 * 2,
)
```

```python
from airflow.sensors.python import PythonSensor

@task.sensor(poke_interval=120, timeout=3600, mode="reschedule")
def wait_for_rows():
    hook = PostgresHook(postgres_conn_id="warehouse")
    count = hook.get_first("SELECT count(*) FROM staging WHERE day = %s", ("{{ ds }}",))[0]
    return count > 0                      # truthy return means "done waiting"
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Write a <code>FileSensor</code> waiting for a path that does not exist, with <code>poke_interval=10</code> and <code>timeout=120</code>.</li>
    <li>Run it in <code>poke</code> mode and watch the task hold a slot in the UI while it waits.</li>
    <li>Let it time out and read the failure message.</li>
    <li>Switch to <code>mode="reschedule"</code>, rerun, and notice the task alternates between <code>up_for_reschedule</code> and running.</li>
    <li>Create the file mid-wait and watch the sensor succeed.</li>
  </ol>
  <em>a sensor that occupies a slot in one mode and releases it in the other, and a timeout that fails cleanly rather than waiting forever. That state difference in the UI is the whole argument for <code>reschedule</code>.</em>
</div>

## Branching and trigger rules

Not every run should do the same thing. Airflow's branching operator picks a path at run time.

```python
from airflow.operators.python import BranchPythonOperator
from airflow.operators.empty import EmptyOperator
from airflow.utils.trigger_rule import TriggerRule

def _choose_path(**context):
    count = context["ti"].xcom_pull(task_ids="extract", key="return_value")
    return "full_reload" if count > 100_000 else "incremental_load"

branch = BranchPythonOperator(task_id="choose_path", python_callable=_choose_path)

full = EmptyOperator(task_id="full_reload")
incr = EmptyOperator(task_id="incremental_load")

join = EmptyOperator(
    task_id="join",
    trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,   # ← required
)

extract >> branch >> [full, incr] >> join
```

The branching callable returns a `task_id`, or a list of them, and Airflow **skips** every other branch. That skipping is why the join task needs a trigger rule: by default a task requires *all* upstreams to have succeeded, and a skipped upstream is not a success.

| Trigger rule | Runs when |
|---|---|
| `all_success` (default) | Every upstream succeeded |
| `all_done` | Every upstream finished, whatever the outcome |
| `one_success` | At least one upstream succeeded |
| `one_failed` | At least one upstream failed |
| `none_failed` | Nothing failed; skips are acceptable |
| `none_failed_min_one_success` | Nothing failed and at least one ran: the branch-join rule |
| `all_skipped` | Every upstream was skipped |

The TaskFlow equivalent is shorter:

```python
@task.branch
def choose_path(count: int) -> str:
    return "full_reload" if count > 100_000 else "incremental_load"
```

`all_done` is the rule for cleanup tasks that must run regardless:

```python
cleanup = BashOperator(
    task_id="cleanup",
    bash_command="rm -rf /tmp/staging/{{ ds }}",
    trigger_rule=TriggerRule.ALL_DONE,      # even if everything upstream failed
)
```

<div class="callout warn">
  <span class="ct">A skipped task is not a failed task, and it is not a success either</span>
  Skips propagate downstream. A join task with the default <code>all_success</code> rule after a branch will itself be skipped, silently, and the rest of your DAG with it. If a branch is followed by anything, the join needs an explicit trigger rule. This is the single most common branching bug.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Build the branch above with a callable that picks based on a Variable you can change.</li>
    <li>Run it and confirm one branch is green and the other is pink (skipped).</li>
    <li>Remove the <code>trigger_rule</code> from the join and rerun, then watch the join get skipped too.</li>
    <li>Add a cleanup task with <code>ALL_DONE</code> and make an upstream task fail. Confirm cleanup still runs.</li>
  </ol>
  <em>a working branch, then the silent skip cascade when the trigger rule is missing, then a cleanup task that survives a failure. Steps three and four together cover most of what trigger rules are for.</em>
</div>

## Reading the UI: Grid, Graph, and logs

The interface is your primary debugging tool, and knowing which view answers which question saves real time.

| View | Answers |
|---|---|
| **Grid** | "What happened across the last N runs?" The default, and the one to live in |
| **Graph** | "What is the dependency structure, and where did it stop?" |
| **Gantt** | "Which task is the bottleneck?" Durations as a timeline |
| **Calendar** | "Which days failed?" A heatmap over months |
| **Code** | "What is the scheduler running?" The parsed source |
| **Task Instance → Logs** | "Why did it fail?" |
| **Task Instance → Rendered Template** | "What did my template become?" |
| **Task Instance → XCom** | "What did it pass downstream?" |
| **Admin → DAG Processing** | "Why is the scheduler slow?" Parse times per file |

The colours you need to recognise:

| State | Means |
|---|---|
| Green `success` | Done |
| Red `failed` | Failed after exhausting retries |
| Yellow `up_for_retry` | Failed, will try again |
| Orange `up_for_reschedule` | A sensor waiting in reschedule mode |
| Light green `running` | Executing now |
| Grey `queued` | Waiting for a worker slot |
| Pink `skipped` | Skipped by a branch or a trigger rule |
| Dark red `upstream_failed` | Never ran; an upstream failed |
| White `none` | Not yet scheduled |

The four actions on a task instance that you will use constantly:

| Action | Does |
|---|---|
| **Clear** | Wipe the state so the scheduler reruns it: the main way to retry |
| **Mark Success** | Force it green without running it: use sparingly, and never to hide a problem |
| **Mark Failed** | Force it red, stopping downstream work |
| **Clear + Downstream** | Rerun this task and everything after it |

<div class="callout tip">
  <span class="ct">"Clear" is the verb, not "rerun"</span>
  There is no rerun button. You <b>clear</b> a task instance's state, and the scheduler notices there is now a task instance with no state and runs it. Understanding that indirection explains why clearing works on old runs, why it can cascade downstream, and why the scheduler must be healthy for it to take effect.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Make a DAG with one task that fails and one that sleeps for thirty seconds. Let it run.</li>
    <li>Find every state colour you can: success, failed, upstream_failed, skipped, queued.</li>
    <li>Open the <strong>Gantt</strong> view and identify the longest task.</li>
    <li>Clear the failed task and watch it rerun. Then use <strong>Clear + Downstream</strong> on an earlier task.</li>
    <li>Open <strong>Admin → DAG Processing</strong> and note your DAG's parse duration.</li>
  </ol>
  <em>a tour of every state you will meet, a Gantt chart naming your bottleneck, and a clear-and-rerun you performed yourself. The parse-duration number in step five is worth remembering. You will compare against it later.</em>
</div>

## The CLI and backfills: running history on purpose

The UI is convenient; the CLI is what you use when you need to be precise, and it is how you run a backfill.

```bash
# Inspect
airflow dags list
airflow dags list-runs -d my_dag
airflow tasks list my_dag --tree

# Validate before deploying
python dags/my_dag.py                       # does the file even import?
airflow dags list-import-errors

# Test a single task without touching the database
airflow tasks test my_dag my_task 2024-05-01

# Test a whole DAG run locally
airflow dags test my_dag 2024-05-01

# Trigger and manage
airflow dags trigger my_dag
airflow dags trigger my_dag --conf '{"reprocess": true}'
airflow dags pause my_dag
airflow dags unpause my_dag

# Backfill a date range
airflow dags backfill my_dag \
    --start-date 2024-04-01 \
    --end-date 2024-04-30

# Clear a range of task instances
airflow tasks clear my_dag \
    --start-date 2024-04-01 --end-date 2024-04-30 \
    --task-regex "transform.*" --downstream
```

Two commands deserve emphasis because they change how you work.

**`airflow tasks test`** runs one task instance immediately, in the foreground, printing logs to your terminal, and it does **not** record state in the metadata database. It is the fastest possible feedback loop for debugging a task, and it works on any date.

**`airflow dags backfill`** creates runs for a historical range. It is how you populate a new DAG's history, or reprocess after fixing a bug. It only works properly if your tasks are idempotent, which is why that property keeps coming up.

<div class="callout warn">
  <span class="ct">A backfill can overwhelm everything else</span>
  Thirty days of a DAG with twenty tasks is six hundred task instances competing with your live pipelines for worker slots. Set <code>max_active_runs</code> on the DAG, and consider <code>--reset-dagruns</code> semantics carefully. Backfilling a month at full concurrency on a shared cluster is a good way to delay every other team's pipeline.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run <code>airflow tasks test my_dag my_task 2024-05-01</code> and watch the log stream to your terminal.</li>
    <li>Confirm the UI shows no new task instance for that run. The test left no state.</li>
    <li>Break the task's code and run <code>python dags/my_dag.py</code> to see the import error before deploying.</li>
    <li>Set <code>max_active_runs=1</code>, then backfill a five-day range and watch the runs execute one at a time.</li>
  </ol>
  <em>an instant feedback loop that leaves no trace, an import error caught before the scheduler saw it, and a rate-limited backfill. That first one will change your development habits more than anything else on this page.</em>
</div>

## Top-level code, and the rule that matters most

This is the single most important performance rule in Airflow, and it follows directly from the architecture: **the scheduler executes every DAG file, repeatedly, just to find the DAG objects.**

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Inside a task: runs when the task runs</h4>
    <ul>
      <li>Database queries</li>
      <li>API calls</li>
      <li><code>Variable.get()</code></li>
      <li>Reading files</li>
      <li>Heavy imports (pandas, torch)</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>At the top level: runs every parse</h4>
    <ul>
      <li>Only: DAG definition and task wiring</li>
      <li>Only: cheap constants</li>
      <li>Only: light imports</li>
      <li>Every 30 seconds, per file, forever</li>
      <li>Slow code here slows the whole scheduler</li>
    </ul>
  </div>
</div>

```python
# WRONG — this runs on every single parse
import pandas as pd
config = requests.get("https://config.internal/pipeline").json()
tables = PostgresHook("warehouse").get_records("SELECT name FROM tables")

with DAG(...) as dag:
    for table in tables:
        ...

# RIGHT — the expensive work happens at run time
with DAG(...) as dag:

    @task
    def get_tables():
        import pandas as pd                        # imported inside the task
        return PostgresHook("warehouse").get_records("SELECT name FROM tables")

    @task
    def process(table: str):
        ...

    process.expand(table=get_tables())             # dynamic mapping, Mid level
```

The cost is easy to underestimate. A `Variable.get()` at the top level of one DAG is one query every thirty seconds, 2,880 a day. Across twenty DAG files that is 57,600 queries a day for values nobody read. An API call up there adds its latency to every parse cycle.

```bash
# Measure it
airflow dags list-import-errors
airflow dags report                     # parse duration per file
```

The **Admin → DAG Processing** page shows the same thing in the UI: file name, number of DAGs, and parse duration. Anything over a second deserves a look; anything over five needs fixing.

<div class="callout tip">
  <span class="ct">The one-line test</span>
  Ask of every line outside a task: <b>"do I want this to run every thirty seconds forever?"</b> If the answer is no, it belongs inside a task. That question resolves every top-level-code question you will have.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Note your DAG's parse duration in <strong>Admin → DAG Processing</strong>.</li>
    <li>Add <code>import time; time.sleep(3)</code> at the top level and watch the duration change.</li>
    <li>Add <code>Variable.get("something")</code> at the top level and observe the effect.</li>
    <li>Move both inside a task and confirm the parse duration returns to normal.</li>
    <li>Run <code>airflow dags report</code> and compare the numbers against the UI.</li>
  </ol>
  <em>a parse duration you made worse on purpose and then fixed. Watching that number move in response to your own change is what makes the rule stick, and it is the measurement you will reach for whenever Airflow feels slow.</em>
</div>

## Putting it all together

Everything above in one DAG. Nothing here is new. Read it as a whole and you should be able to justify every line.

```python dags/daily_events_pipeline.py
"""Daily events pipeline: land → validate → transform → publish → notify."""
from datetime import datetime, timedelta

from airflow.decorators import dag, task
from airflow.operators.bash import BashOperator
from airflow.operators.empty import EmptyOperator
from airflow.providers.common.sql.operators.sql import SQLExecuteQueryOperator
from airflow.providers.postgres.hooks.postgres import PostgresHook
from airflow.sensors.filesystem import FileSensor
from airflow.utils.trigger_rule import TriggerRule

# Sensible defaults for every task; individual tasks override as needed.
default_args = {
    "owner": "data-platform",
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
    "retry_exponential_backoff": True,
    "execution_timeout": timedelta(minutes=30),
}

@dag(
    dag_id="daily_events_pipeline",
    start_date=datetime(2024, 1, 1),
    schedule="0 2 * * *",              # 02:00, after the source system settles
    catchup=False,                     # backfill deliberately, never accidentally
    default_args=default_args,
    dagrun_timeout=timedelta(hours=3), # the whole run has a ceiling
    max_active_runs=1,                 # no overlapping runs on the same table
    tags=["production", "events"],
    doc_md=__doc__,                    # this docstring renders in the UI
)
def daily_events_pipeline():

    start = EmptyOperator(task_id="start")

    # reschedule mode: releases the worker slot between checks.
    # timeout: never wait forever.
    wait_for_extract = FileSensor(
        task_id="wait_for_extract",
        filepath="/data/landing/events_{{ ds_nodash }}.parquet",
        poke_interval=120,
        timeout=60 * 60 * 2,
        mode="reschedule",
    )

    @task
    def validate() -> int:
        """Row count is returned through XCom — a number, not the data."""
        hook = PostgresHook(postgres_conn_id="warehouse")   # a connection, not a password
        count = hook.get_first(
            "SELECT count(*) FROM staging.events WHERE day = %s",
            parameters=("{{ ds }}",),
        )[0]
        if count == 0:
            raise ValueError("No rows landed for {{ ds }}")
        return count

    # Idempotent by construction: DELETE the partition, then INSERT it.
    transform = SQLExecuteQueryOperator(
        task_id="transform",
        conn_id="warehouse",
        sql="sql/daily_rollup.sql",      # templated file, kept out of the DAG
        params={"lookback_days": 7},
    )

    @task
    def publish(row_count: int) -> str:
        """Returns a path, not a payload."""
        target = f"s3://analytics/daily/{{{{ ds }}}}/events.parquet"
        print(f"Published {row_count} rows to {target}")
        return target

    notify = BashOperator(
        task_id="notify",
        bash_command='echo "events {{ ds }} done: {{ ti.xcom_pull(task_ids=\'publish\') }}"',
    )

    # ALL_DONE: cleanup must happen whether the run succeeded or not.
    cleanup = BashOperator(
        task_id="cleanup",
        bash_command="rm -f /tmp/events_{{ ds_nodash }}.tmp",
        trigger_rule=TriggerRule.ALL_DONE,
    )

    end = EmptyOperator(task_id="end")

    row_count = validate()
    start >> wait_for_extract >> row_count >> transform
    transform >> publish(row_count) >> notify >> cleanup >> end

daily_events_pipeline()
```

```sql sql/daily_rollup.sql
-- Idempotent: safe to retry, safe to backfill.
DELETE FROM analytics.daily_events WHERE day = '{{ ds }}';

INSERT INTO analytics.daily_events (day, events, users, revenue)
SELECT
    '{{ ds }}'                        AS day,
    count(*)                          AS events,
    count(DISTINCT user_id)           AS users,
    sum(amount)                       AS revenue
FROM staging.events
WHERE event_date BETWEEN '{{ macros.ds_add(ds, -params.lookback_days) }}'
                     AND '{{ ds }}';
```

Twelve decisions in there are the whole lesson of this page:

| Decision | Section |
|---|---|
| `catchup=False` | Scheduling and the interval model |
| `{{ ds }}` everywhere instead of `now()` | Scheduling and the interval model |
| `retries` and `retry_exponential_backoff` in `default_args` | Retries and timeouts |
| `execution_timeout` per task, `dagrun_timeout` per DAG | Retries and timeouts |
| `max_active_runs=1` on a table-writing DAG | Retries and timeouts |
| A row count through XCom, a path through XCom: never data | Passing data with XCom |
| `PostgresHook` with a `conn_id`, no credentials in code | Connections and Variables |
| SQL in a templated file, not a Python string | Templating and Jinja |
| `DELETE` then `INSERT`: idempotent by construction | Templating and Jinja |
| `mode="reschedule"` plus a `timeout` on the sensor | Sensors |
| `TriggerRule.ALL_DONE` on cleanup | Branching and trigger rules |
| No top-level queries, imports, or `Variable.get()` | Top-level code |

<div class="guide-try">
  <span class="ct">Try it: the one that matters</span>
  <ol>
    <li>Adapt this DAG to a real workflow of yours, even a small one, and get it green.</li>
    <li>Verify the important properties actively: run the transform twice and confirm the row count does not double; make the sensor time out and confirm it fails cleanly; make a task fail and confirm <code>cleanup</code> still runs.</li>
    <li>Backfill three historical days with <code>max_active_runs=1</code> and confirm each produces correct, non-duplicated output.</li>
    <li>Check <strong>Admin → DAG Processing</strong> and confirm the parse duration is well under a second.</li>
  </ol>
  <em>a pipeline that is safe to retry, safe to backfill, cleans up after itself, and parses fast. Those four properties are what separate a DAG that works from one you can leave running unattended, and you will learn more building it than from a second pass over the page.</em>
</div>

## What you can now do, and what comes next

You can write a DAG in both styles, reason correctly about intervals and logical dates, set retries and timeouts that make a pipeline trustworthy, pass metadata between tasks without abusing the database, keep credentials out of your code, template dates and SQL, wait on external systems without deadlocking your workers, branch conditionally and handle the trigger rules that come with it, read every view in the UI, use the CLI for fast feedback and deliberate backfills, and keep the scheduler fast by understanding top-level code. That is a working practitioner's toolkit, enough to own real DAGs on a shared Airflow.

| Can you… | |
|---|---|
| Name the five core components? | Scheduler, executor, worker, metadata DB, webserver |
| Say what Airflow is *not* for? | Processing data itself. It orchestrates |
| Explain why a `@daily` run starts after midnight? | It schedules intervals, and the interval must end |
| Say what `catchup=True` does with an old start date? | Creates every missed run at once |
| Give the reason to use `{{ ds }}` over `now()`? | Reruns and backfills must be reproducible |
| Explain why XCom is not for dataframes? | It is serialised into the metadata database |
| Say where credentials belong? | A Connection, referenced by `conn_id` |
| Name the sensor mode that frees a worker slot? | `reschedule` |
| Say why a join after a branch needs a trigger rule? | Skips are neither success nor failure |
| Explain what "clear" does? | Wipes state so the scheduler reruns it |
| Give the top-level code rule? | Would you want this every thirty seconds? |
| Say what makes a task safe to retry? | Idempotence: delete the partition, then write |

**Mid-level takes every one of those topics further:** the executors and what each one costs, dynamic task mapping with `.expand()`, deferrable operators that replace sensors entirely, TaskGroups and DAG factories, datasets and data-aware scheduling, pools and priority weights for concurrency control, SLAs and callbacks, custom operators and hooks, testing DAGs properly, and the CI patterns that stop a broken DAG reaching production.

**Senior then covers what you own when Airflow is your responsibility**: the security model and who can see which DAG, secrets backends so credentials never live in the metadata database, multi-tenancy and isolation between teams, scaling the scheduler and the database, cost control across executors, upgrade and migration strategy, observability and SLOs for a platform, incident playbooks for a stuck scheduler and a poisoned queue, and where Airflow stops and a streaming or in-warehouse tool begins.
