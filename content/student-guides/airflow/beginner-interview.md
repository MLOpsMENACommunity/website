Part one of three. A fast review of **everything in the Beginner Detailed track**, in about twenty-five minutes. Fast review first, common questions at the end. Mid-level reviews this plus its own material; Senior reviews all three.

## The thirty-second answer

> Airflow is a platform for writing, scheduling, and monitoring workflows as Python code. You define a DAG, a directed acyclic graph of tasks, and Airflow works out the execution order, runs it on a schedule, retries failures, and records every run in a metadata database with a UI on top. It replaces a chain of cron jobs that had no dependency graph, no retries, and no history.

Then add the sentence that shows you have used it: *"the thing people get wrong is that Airflow is an orchestrator, not a compute engine: a task should tell Spark or the warehouse to do the work, not load a dataframe into the worker."*

## The architecture

<div class="flow">
  <div class="node">DAG FOLDER<small>your .py files</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">SCHEDULER<small>parse + schedule</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">METADATA DB<small>all state</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">WORKER<small>runs the task</small></div>
</div>

| Component | Job | You notice it when |
|---|---|---|
| **Scheduler** | Parses DAG files, decides what is ready, queues it | Nothing runs, or runs late |
| **Executor** | Hands queued tasks to workers | Tasks stuck in `queued` |
| **Worker** | Runs your task code | The task fails or runs out of memory |
| **Metadata DB** | Every run, task instance, connection, variable | The UI is slow; state looks wrong |
| **Webserver** | UI and REST API | You cannot see anything, but runs continue |
| **Triggerer** | Holds deferred tasks asynchronously | Deferred tasks hang if it is not running |

Two facts to state unprompted: **the scheduler executes every DAG file repeatedly**, so slow top-level code slows the whole scheduler, and **the metadata database is the source of truth**, not your file. The file says what should exist; the database records what happened.

## Vocabulary

| Term | Say this |
|---|---|
| **DAG** | A directed acyclic graph of tasks: the workflow definition |
| **Operator** | A class describing a kind of work: `BashOperator`, `PythonOperator` |
| **Task** | An instance of an operator in a DAG, identified by `task_id` |
| **Task instance** | One run of that task for one specific interval |
| **DAG run** | One execution of the whole DAG for one interval |
| **Logical date** | The interval the run covers: **not** the wall clock |
| **XCom** | Cross-communication: small values passed between tasks |
| **Connection** | Stored credentials and host details for an external system |
| **Variable** | A stored non-secret configuration value |
| **Pool** | A cap on concurrent tasks across all DAGs, protecting a resource |
| **Sensor** | An operator that waits for an external condition |

## Your first DAG, annotated

```python dags/hello.py
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.empty import EmptyOperator

with DAG(
    dag_id="hello_world",              # unique; renaming abandons its history
    start_date=datetime(2024, 1, 1),   # the first interval considered
    schedule="@daily",                 # cron, preset, timedelta, or None
    catchup=False,                     # do NOT run every missed interval
    default_args={"retries": 3, "retry_delay": timedelta(minutes=5)},
    tags=["tutorial"],
) as dag:
    start = EmptyOperator(task_id="start")
    hello = BashOperator(task_id="hello", bash_command="echo hi {{ ds }}")
    start >> hello                     # ">>" means "then"
```

Mandatory: `dag_id`, `start_date`, and per task a `task_id`. Everything else has a default, and two of those defaults will hurt you, which is why `catchup=False` and explicit retries appear in every example.

## TaskFlow versus classic operators

```python
@dag(dag_id="etl", start_date=datetime(2024, 1, 1), schedule="@daily", catchup=False)
def etl():
    @task
    def extract(): return {"rows": [1, 2, 3]}

    @task
    def transform(d: dict): return {"total": sum(d["rows"])}

    @task
    def load(r: dict): print(r["total"])

    load(transform(extract()))         # dependencies AND data passing, one line
etl()
```

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>TaskFlow: for Python work</h4>
    <ul>
      <li>Dependencies inferred from the function calls</li>
      <li>Return values passed automatically via XCom</li>
      <li>Normal signatures and type hints</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Classic operators: for systems</h4>
    <ul>
      <li>Explicit <code>&gt;&gt;</code> dependencies</li>
      <li>Manual <code>xcom_push</code> / <code>xcom_pull</code></li>
      <li>The only option for non-Python operators</li>
    </ul>
  </div>
</div>

They mix freely. Use TaskFlow for Python you wrote; use a provider operator for "run this SQL" or "submit this Spark job".

## Scheduling: the interval model

**Airflow schedules intervals, not moments.** A `@daily` run for 1 May starts just after midnight on 2 May, because the data for 1 May is only complete once 1 May is over.

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>05-01 00:00</span><strong>Interval starts</strong><small><code>data_interval_start</code>. Nothing runs yet.</small></div>
  <div class="guide-timeline-item"><span>05-02 00:00</span><strong>Interval ends</strong><small>The run is now scheduled.</small></div>
  <div class="guide-timeline-item"><span>05-02 00:00:05</span><strong>Run starts</strong><small>Logical date is <b>2024-05-01</b>, the interval rather than the clock.</small></div>
</div>

| Parameter | Common mistake |
|---|---|
| `start_date` | Setting it to today and wondering why nothing ran |
| `schedule` | Expecting it to fire *at* the start of the interval |
| `catchup` | Leaving it `True` with an old start date: hundreds of runs at once |

<div class="callout warn">
  <span class="ct">Use <code>{{ ds }}</code>, never <code>datetime.now()</code></span>
  A task that computes "yesterday" from the wall clock produces different results on a rerun than it did originally, which destroys reproducibility and makes backfills meaningless. The interval is available as a template variable for exactly this reason.
</div>

| Template variable | Value for the 1 May interval |
|---|---|
| `{{ ds }}` | `2024-05-01` |
| `{{ ds_nodash }}` | `20240501` |
| `{{ data_interval_start }}` / `{{ data_interval_end }}` | Interval bounds |
| `{{ prev_ds }}` / `{{ next_ds }}` | Neighbouring intervals |
| `{{ dag_run.run_id }}` / `{{ ts }}` | Run identifier, full timestamp |
| `{{ macros.ds_add(ds, -7) }}` | Date arithmetic without imports |

## Retries, timeouts, and idempotence

```python
default_args = {
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
    "retry_exponential_backoff": True,
    "execution_timeout": timedelta(minutes=45),   # kill a hung task
}

@dag(..., default_args=default_args,
     dagrun_timeout=timedelta(hours=2),          # cap the whole run
     max_active_runs=1)                          # no overlapping writers
```

| Parameter | Scope | Prevents |
|---|---|---|
| `retries` / `retry_delay` | Task | A transient blip failing the pipeline |
| `execution_timeout` | Task | A hung task holding a worker forever |
| `dagrun_timeout` | DAG | Intervals piling up behind a stuck run |
| `max_active_runs` | DAG | Two runs writing the same table |
| `depends_on_past` | Task | Running before the previous interval succeeded |

<div class="callout warn">
  <span class="ct">Retries are only safe if the task is idempotent</span>
  Running it twice must equal running it once. A task that <code>INSERT</code>s duplicates rows on retry; a task that <code>DELETE</code>s the target partition then inserts does not. Design for reruns and retries become free. Otherwise every retry is a data-quality incident.
</div>

```sql sql/rollup.sql
-- Idempotent by construction: safe to retry, safe to backfill.
DELETE FROM daily_stats WHERE day = '{{ ds }}';
INSERT INTO daily_stats SELECT '{{ ds }}', count(*) FROM events
WHERE event_date = '{{ ds }}';
```

## XCom

```python
@task
def count() -> int: return 4213        # pushed automatically

@task
def report(n: int): print(n)           # pulled automatically

report(count())
```

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Pass through XCom</h4>
    <ul>
      <li>A row count or checksum</li>
      <li>An S3 key or table partition</li>
      <li>A model version or run id</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Pass through storage instead</h4>
    <ul>
      <li>A dataframe of any size</li>
      <li>A file's contents or query results</li>
      <li>Anything you would not put in a database cell</li>
    </ul>
  </div>
</div>

**XCom is serialised into the metadata database.** That is the whole reason for the rule: bloating it slows every UI page and the scheduler loop. Write the data to storage and pass the **path**.

## Connections and Variables

```bash
airflow connections add warehouse --conn-type postgres \
  --conn-host db.internal --conn-login airflow --conn-password secret
```

```python
SQLExecuteQueryOperator(task_id="rollup", conn_id="warehouse", sql="sql/rollup.sql")

@task
def count():
    return PostgresHook(postgres_conn_id="warehouse").get_first("SELECT count(*) FROM events")[0]
```

| Store | For | Read with |
|---|---|---|
| **Connection** | Host, port, credentials for a system | `conn_id=` on an operator, or a Hook |
| **Variable** | Non-secret configuration | `Variable.get()`, or `{{ var.value.x }}` |

<div class="callout warn">
  <span class="ct">Never call <code>Variable.get()</code> at the top level</span>
  Top-level code runs on every parse, every thirty seconds, per file. One misplaced <code>Variable.get()</code> is 2,880 database queries a day for a value nobody read. Use it inside a task, or the template form <code>{{ var.value.x }}</code>, which resolves at run time.
</div>

## Sensors

```python
S3KeySensor(
    task_id="wait",
    bucket_key="events/{{ ds }}/_SUCCESS",
    poke_interval=60,
    timeout=60 * 60 * 4,        # ALWAYS set a timeout
    mode="reschedule",          # ← releases the worker slot between checks
)
```

| Mode | Worker slots while waiting |
|---|---|
| `poke` (default) | **One, continuously**: can deadlock a cluster |
| `reschedule` | Zero between checks |

<div class="callout warn">
  <span class="ct">Sensors in <code>poke</code> mode can deadlock your cluster</span>
  Ten sensors waiting four hours occupy ten worker slots for four hours, possibly including the slots needed by the upstream tasks they are waiting for. Use <code>reschedule</code> for anything waiting more than a minute or two, and always set a <code>timeout</code>. Mid level replaces sensors with deferrable operators entirely.
</div>

## Branching and trigger rules

```python
@task.branch
def choose(count: int) -> str:
    return "full_reload" if count > 100_000 else "incremental_load"

join = EmptyOperator(
    task_id="join",
    trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,   # ← required
)
```

| Trigger rule | Runs when |
|---|---|
| `all_success` (default) | Every upstream succeeded |
| `all_done` | Every upstream finished, whatever the result: cleanup tasks |
| `one_success` / `one_failed` | At least one succeeded / failed |
| `none_failed` | Nothing failed; skips are acceptable |
| `none_failed_min_one_success` | The branch-join rule |

<div class="callout warn">
  <span class="ct">A skip is neither a success nor a failure, and it propagates</span>
  A join after a branch with the default <code>all_success</code> rule is itself skipped, silently, along with everything after it. This is the single most common branching bug. If a branch is followed by anything, the join needs an explicit trigger rule.
</div>

## Reading the UI

| View | Answers |
|---|---|
| **Grid** | What happened across the last N runs: live here |
| **Graph** | The dependency structure, and where it stopped |
| **Gantt** | Which task is the bottleneck |
| **Code** | What the scheduler is running |
| **Rendered Template** | What your `{{ ds }}` became |
| **XCom** | What the task passed downstream |
| **Admin → DAG Processing** | Why the scheduler is slow: parse times |

| State | Means |
|---|---|
| `success` / `failed` | Done / failed after retries |
| `up_for_retry` | Failed, will try again |
| `up_for_reschedule` | A sensor waiting in reschedule mode |
| `queued` | Waiting for a worker slot |
| `skipped` | Skipped by a branch or trigger rule |
| `upstream_failed` | Never ran; an upstream failed |

**"Clear" is the verb, not "rerun".** You clear a task instance's state and the scheduler notices there is now a stateless task instance to run. That indirection explains why clearing works on old runs and can cascade downstream.

## The CLI

```bash
airflow tasks test my_dag my_task 2024-05-01   # run one task NOW, no DB state
airflow dags test my_dag 2024-05-01            # a whole run, locally
python dags/my_dag.py                          # does it even import?
airflow dags list-import-errors
airflow dags backfill my_dag --start-date 2024-04-01 --end-date 2024-04-30
airflow tasks clear my_dag -s 2024-04-01 -e 2024-04-30 --downstream
```

`airflow tasks test` is the fastest feedback loop in Airflow: foreground execution, logs in your terminal, and **no state recorded** in the metadata database.

## Top-level code: the rule that matters most

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Inside a task</h4>
    <ul>
      <li>Database queries and API calls</li>
      <li><code>Variable.get()</code></li>
      <li>Reading files</li>
      <li>Heavy imports: pandas, torch</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>At the top level</h4>
    <ul>
      <li>Only the DAG definition and task wiring</li>
      <li>Only cheap constants and light imports</li>
      <li>Runs every 30 seconds, per file, forever</li>
    </ul>
  </div>
</div>

**The one-line test:** ask of every line outside a task: *"do I want this to run every thirty seconds forever?"* If no, it belongs inside a task.

## Common interview questions

<ol class="guide-steps">
  <li><b>What is Airflow and what problem does it solve?</b>A platform for writing, scheduling, and monitoring workflows as Python code. It gives you a dependency graph, retries, a scheduling model with historical intervals, and a UI with full run history, replacing cron chains that had none of those and no answer to "did last Tuesday work?".</li>
  <li><b>What is a DAG?</b>A directed acyclic graph of tasks. Directed because dependencies point one way; acyclic because a task cannot eventually depend on itself, which Airflow enforces as an import error. That guarantee is what lets the scheduler always compute an execution order.</li>
  <li><b>Name the components and what each does.</b>Scheduler parses DAG files and decides what is ready. Executor hands queued tasks to workers. Workers run the code. The metadata database holds all state. The webserver serves the UI and API. The triggerer holds deferred tasks. The webserver going down does not stop pipelines running.</li>
  <li><b>Operator versus task versus task instance?</b>The operator is the class, a kind of work. The task is an instance of it in a DAG with a <code>task_id</code>. The task instance is one run of that task for one specific interval. The UI shows task instances; your file defines tasks.</li>
  <li><b>Why does a <code>@daily</code> DAG for 1 May run on 2 May?</b>Airflow schedules intervals, not moments, and a run fires at the <em>end</em> of its interval, because the data for 1 May is only complete once 1 May is over. The logical date is 2024-05-01 even though the wall clock says the second.</li>
  <li><b>What does <code>catchup=True</code> do, and why is it dangerous?</b>It creates a run for every interval between <code>start_date</code> and now. With a two-year-old start date and a daily schedule that is around eight hundred runs the moment you unpause, which can saturate your cluster and hammer every downstream system. Default to <code>False</code> and backfill deliberately.</li>
  <li><b>Why use <code>{{ ds }}</code> instead of <code>datetime.now()</code>?</b>Because a rerun or a backfill must produce the same result as the original run. <code>now()</code> makes the output depend on when you ran it, so clearing an old task instance silently reprocesses the wrong window.</li>
  <li><b>What is XCom, and what should not go in it?</b>The mechanism for passing small values between tasks. It is serialised into the metadata database, so row counts, paths, and versions are fine while dataframes and file contents are not. Those bloat the database and slow every UI page. Write the data to storage and pass the path.</li>
  <li><b>Where do credentials belong?</b>In a Connection, referenced by <code>conn_id</code> from an operator or a Hook. Never in the DAG file, and never in a Variable you print. Non-secret configuration goes in a Variable.</li>
  <li><b>Why must you not call <code>Variable.get()</code> at the top level?</b>Top-level code executes on every parse cycle (every thirty seconds, for every DAG file) so it becomes thousands of database queries a day for a value nobody read. Worse, an API call up there adds its latency to every parse and can stall the scheduler.</li>
  <li><b>What makes a task idempotent, and why does it matter?</b>Running it twice produces the same result as once. It matters because Airflow retries, and because you will eventually backfill. The standard pattern is deleting the target partition then writing it, rather than appending.</li>
  <li><b>What is a sensor, and what is the <code>mode</code> trap?</b>An operator that waits for an external condition. In the default <code>poke</code> mode it holds a worker slot for the entire wait, so a handful of long waits can deadlock a cluster. <code>mode="reschedule"</code> releases the slot between checks, and always set a <code>timeout</code>.</li>
  <li><b>How do you make one branch of a DAG run conditionally?</b>A branching operator whose callable returns the <code>task_id</code> to follow; every other branch is skipped. The catch is that any join afterwards needs an explicit trigger rule, usually <code>none_failed_min_one_success</code>. Otherwise the skip propagates and silently skips the rest of the DAG.</li>
  <li><b>What trigger rule would you use for a cleanup task?</b><code>all_done</code>, so it runs whether the upstream work succeeded, failed, or was skipped. That is the case the default <code>all_success</code> cannot express.</li>
  <li><b>How do you rerun a failed task?</b>Clear its state, and the scheduler picks it up because there is now a task instance with no state. There is no rerun button. Understanding that indirection explains why clearing works on historical runs and why <b>Clear + Downstream</b> cascades.</li>
  <li><b>What is the difference between <code>execution_timeout</code> and <code>dagrun_timeout</code>?</b>The first kills an individual task that runs too long; the second fails the whole run. You want both: the task timeout stops a hang holding a worker slot, and the run timeout stops intervals piling up behind a stuck run.</li>
  <li><b>How do you test a single task quickly?</b><code>airflow tasks test dag_id task_id 2024-05-01</code>. It runs in the foreground, streams logs to your terminal, and records no state in the metadata database, which is the fastest feedback loop available.</li>
  <li><b>How do you backfill, and what is the risk?</b><code>airflow dags backfill</code> with a date range. The risk is that thirty days of a twenty-task DAG is six hundred task instances competing with live pipelines. Set <code>max_active_runs</code>, and only backfill something idempotent.</li>
  <li><b>Why is Airflow not a good place to process data?</b>It is an orchestrator. A task that loads a large dataframe into the worker consumes a scheduling slot for the duration, cannot scale beyond one machine, and puts memory pressure on a shared component. The task should tell Spark, the warehouse, or a container to do the work.</li>
  <li><b>Your DAG is not showing up in the UI. Debug it.</b>Is the file in the DAG folder with a <code>.py</code> extension; does it import at all, which <code>python dags/my_dag.py</code> answers; is there an entry in <code>airflow dags list-import-errors</code>; does the file create a DAG object at module level; and has the scheduler had thirty seconds to notice.</li>
</ol>

## Sixty-second self-test

- Give the thirty-second answer, then the "orchestrator, not compute engine" sentence.
- Name the six components and one symptom each.
- Say what the scheduler does to your DAG file, and how often.
- Explain why a `@daily` run for 1 May starts on 2 May.
- Say what `catchup=True` with an old `start_date` does.
- Give the reason to use `{{ ds }}` over `now()`.
- Say what XCom is for and what it must not carry.
- Name where credentials belong, and the top-level-code rule.
- Give the sensor mode that frees a worker slot, and the missing-timeout risk.
- Say why a join after a branch needs a trigger rule.
- Explain what "clear" does and why there is no rerun button.
- Define an idempotent task and give the SQL pattern for one.
