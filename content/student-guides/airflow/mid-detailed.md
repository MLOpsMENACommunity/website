This is part two of three. It picks up exactly where Beginner ended and takes **every topic from there further**, then adds the machinery you have not met yet. Nothing is dropped and nothing is repeated for its own sake. Where you already know the basics, we go straight to the depth.

## Where this picks up

| Topic you already use | What this level adds |
|---|---|
| The five components | Executors compared, the triggerer, and where each one becomes the bottleneck |
| DAGs and tasks | TaskGroups, DAG factories, and generating DAGs safely from config |
| Dependencies | `chain`, `cross_downstream`, `setup`/`teardown`, and label edges |
| Scheduling | Timetables, cron vs `timedelta` semantics, `@once`, and catchup strategy |
| Retries and timeouts | SLAs, callbacks, `on_failure_callback`, and alerting that people read |
| XCom | Custom backends, size limits, and passing data through object storage |
| Connections and Variables | `Params`, `dag_run.conf`, and configuration precedence |
| Templating | `template_fields`, custom macros, `user_defined_macros`, and rendering pitfalls |
| Sensors | **Deferrable operators** and the triggerer: why sensors are now a fallback |
| Branching | Trigger rules in full, `latest_only`, short-circuiting, and setup/teardown |
| The UI and CLI | Testing DAGs properly, `dag.test()`, and CI that blocks a broken DAG |
| Top-level code | Parse-time budgets, `.airflowignore`, and measuring the scheduler |
| **new** | Dynamic task mapping · datasets · pools and priority · custom operators · CI |

Each section starts with the problem it solves, and ends with a **Try it** you can do on a real Airflow in a few minutes.

## Executors, and where each one hurts

Beginner treated the executor as a black box. Choosing it is the single most consequential architectural decision in an Airflow deployment.

| Executor | Runs tasks | Parallelism | Use when |
|---|---|---|---|
| `SequentialExecutor` | In the scheduler, one at a time | None | Never, outside a first tutorial |
| `LocalExecutor` | Subprocesses on the scheduler host | One machine | Small teams, one box, simple ops |
| `CeleryExecutor` | Long-lived workers via a queue | Horizontal, pre-provisioned | Steady load, many small tasks |
| `KubernetesExecutor` | One pod per task | Horizontal, on demand | Variable load, per-task isolation |
| `CeleryKubernetesExecutor` | Both, by queue | Both | Mixed workloads |

The trade-off that matters is **startup latency versus isolation**:

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Celery</h4>
    <ul>
      <li>Workers already running: task starts in under a second</li>
      <li>Efficient for thousands of short tasks</li>
      <li>Queues let you route work to specific worker pools</li>
      <li>But: shared environment, and a dependency conflict affects everyone</li>
      <li>But: you pay for idle workers</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Kubernetes</h4>
    <ul>
      <li>Per-task pod: full isolation, per-task image and resources</li>
      <li>Scales to zero. You pay for what runs</li>
      <li>A task needing 64 GB gets 64 GB without resizing a worker</li>
      <li>But: pod startup is 10–30 seconds, every task</li>
      <li>But: a thousand tiny tasks means a thousand pod launches</li>
    </ul>
  </div>
</div>

```ini airflow.cfg
[core]
executor = CeleryExecutor
parallelism = 64                 # cluster-wide simultaneous task limit
max_active_tasks_per_dag = 16
max_active_runs_per_dag = 3
dag_file_processor_timeout = 60

[celery]
worker_concurrency = 16          # tasks per worker process
```

The three limits interact and people get caught by the tightest one:

| Setting | Scope | Symptom when too low |
|---|---|---|
| `parallelism` | The whole cluster | Tasks stuck in `queued` across every DAG |
| `max_active_tasks_per_dag` | One DAG | One DAG runs slowly while others are fine |
| `worker_concurrency` | One worker | Queue depth grows; workers are not saturated |
| Pool slots | A named group | Only tasks in that pool queue up |

The **triggerer** is the sixth component, and it exists for deferrable operators. It runs an asyncio event loop that can hold tens of thousands of waiting tasks in one process, which is the point of the next section but one.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Find your executor: <code>airflow config get-value core executor</code>.</li>
    <li>Read <code>parallelism</code>, <code>max_active_tasks_per_dag</code>, and if you are on Celery, <code>worker_concurrency</code>.</li>
    <li>Create a DAG with twenty parallel <code>sleep 30</code> tasks and watch the UI. Count how many run simultaneously.</li>
    <li>Lower <code>max_active_tasks</code> on the DAG to 3 and rerun. Confirm the number matches.</li>
  </ol>
  <em>your own cluster's concurrency ceiling, discovered by measurement rather than by reading configuration. Knowing which of the three limits binds first is what makes "tasks are stuck in queued" a five-minute diagnosis.</em>
</div>

## Dynamic task mapping

Beginner's DAGs had a fixed task list. Real pipelines often need "one task per file that landed", and the count is unknown until run time.

```python
@task
def list_files() -> list[str]:
    hook = S3Hook(aws_conn_id="aws_default")
    return hook.list_keys(bucket_name="raw", prefix="events/{{ ds }}/")

@task
def process(key: str) -> int:
    ...
    return rows

@task
def summarise(counts: list[int]):
    print(f"Total rows: {sum(counts)}")

counts = process.expand(key=list_files())     # N parallel task instances
summarise(counts)
```

`.expand()` creates one **mapped task instance** per element, at run time, and the UI groups them under a single task with an index. `summarise` receives the list of all results. That collection is automatic.

Three forms cover almost everything:

```python
# One argument varies
process.expand(key=list_files())

# Several arguments vary together, zipped
process.expand(key=keys, region=regions)          # cross product!
process.expand_kwargs([{"key": "a", "region": "eu"}, {"key": "b", "region": "us"}])

# Some arguments fixed, some varying
process.partial(bucket="raw", retries=5).expand(key=list_files())
```

<div class="callout warn">
  <span class="ct"><code>expand</code> with two arguments is a cross product, not a zip</span>
  <code>process.expand(key=[a, b], region=[eu, us])</code> creates <b>four</b> task instances, not two. If you want pairs, use <code>expand_kwargs</code> with a list of dicts, or zip the lists in an upstream task. Discovering this by watching 400 tasks appear instead of 20 is a memorable afternoon.
</div>

Mapping classic operators works too:

```python
BashOperator.partial(task_id="process").expand(
    bash_command=["echo one", "echo two", "echo three"],
)
```

The limits are real, so know them:

```ini airflow.cfg
[core]
max_map_length = 1024            # the cap on mapped instances per task
```

<div class="callout tip">
  <span class="ct">Mapping is not a substitute for a batch job</span>
  Ten thousand mapped tasks means ten thousand scheduler decisions, ten thousand database rows, and, on Kubernetes, ten thousand pod launches. If the per-item work is small, one task processing a batch is cheaper. Map when each item is <b>substantial and independently retryable</b>; batch when it is not.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Write a DAG where one task returns a list of five strings and a second maps over them.</li>
    <li>Open the mapped task in the UI and browse the individual indexed instances.</li>
    <li>Make instance 3 fail, then clear only that one and watch it rerun alone.</li>
    <li>Now try <code>expand</code> with two lists of three elements each and count the resulting instances.</li>
  </ol>
  <em>five indexed instances you can retry individually, and nine instances from two lists of three. That second result is the cross-product surprise, and it is much better to meet it here than in production.</em>
</div>

## Deferrable operators and the triggerer

Beginner used sensors and learned that `poke` mode wastes worker slots. Deferrable operators remove the problem entirely.

A deferrable operator starts, discovers it must wait, and **defers**: it releases its worker slot, handing a lightweight `Trigger` to the triggerer process. The triggerer runs thousands of these in one asyncio loop. When the condition is met, the task is rescheduled onto a worker to finish.

<div class="flow">
  <div class="node">TASK STARTS<small>on a worker</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">DEFERS<small>slot released</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">TRIGGERER<small>async wait</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">RESUMES<small>back on a worker</small></div>
</div>

```python
from airflow.providers.amazon.aws.sensors.s3 import S3KeySensor
from airflow.sensors.time_delta import TimeDeltaSensorAsync

wait = S3KeySensor(
    task_id="wait_for_file",
    bucket_name="raw-data",
    bucket_key="events/{{ ds }}/_SUCCESS",
    deferrable=True,                     # ← the whole change
    poke_interval=60,
    timeout=60 * 60 * 4,
)
```

| Approach | Worker slots while waiting | Scales to |
|---|---|---|
| Sensor, `poke` mode | One per sensor, continuously | Tens |
| Sensor, `reschedule` mode | Zero between checks, one per check | Hundreds |
| **Deferrable, `deferrable=True`** | Zero | Tens of thousands |

Many operators are deferrable, not just sensors. `deferrable=True` on a Spark submit, a BigQuery job, or an EMR step means Airflow does not hold a worker while an external system works.

Writing your own is a class and a trigger:

```python
from airflow.triggers.base import BaseTrigger, TriggerEvent

class TableReadyTrigger(BaseTrigger):
    def __init__(self, table: str, day: str):
        super().__init__()
        self.table, self.day = table, day

    def serialize(self):
        return ("mypkg.triggers.TableReadyTrigger",
                {"table": self.table, "day": self.day})

    async def run(self):
        while True:
            if await self._rows_exist():
                yield TriggerEvent({"status": "ready"})
                return
            await asyncio.sleep(60)
```

```python
class WaitForTable(BaseOperator):
    def execute(self, context):
        self.defer(
            trigger=TableReadyTrigger(self.table, context["ds"]),
            method_name="execute_complete",
        )

    def execute_complete(self, context, event=None):
        return event["status"]
```

<div class="callout warn">
  <span class="ct">Deferrable operators need a running triggerer</span>
  If no triggerer process exists, deferred tasks sit forever in <code>deferred</code> state and nothing tells you loudly. Confirm it is running before adopting them, and treat it as a required component rather than an optional extra. Also note that trigger code must be <b>async</b>: a blocking call inside a trigger stalls every other deferred task in that process.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Confirm the triggerer is running: <code>docker compose ps</code>, or check the <strong>Admin → Health</strong> page.</li>
    <li>Write a DAG with twenty <code>TimeDeltaSensorAsync</code> tasks waiting five minutes each.</li>
    <li>Watch the UI: all twenty enter <code>deferred</code> and no worker slots are consumed.</li>
    <li>Now do the same with plain sensors in <code>poke</code> mode and compare worker occupancy.</li>
  </ol>
  <em>twenty tasks waiting with zero workers busy, against twenty tasks saturating your worker pool. That contrast is the entire argument for deferrable operators, and it is visible in one screen.</em>
</div>

## Datasets and data-aware scheduling

Beginner scheduled on time. Sometimes the correct trigger is not "it is 2am" but "the upstream table was updated", and chaining DAGs with `ExternalTaskSensor` is fragile because it couples two schedules.

```python
from airflow.datasets import Dataset

events_table = Dataset("postgres://warehouse/analytics.daily_events")
features = Dataset("s3://ml/features/latest.parquet")

# Producer: declares that a task updates a dataset
@dag(dag_id="build_events", schedule="0 2 * * *", start_date=..., catchup=False)
def build_events():
    @task(outlets=[events_table])
    def load():
        ...
    load()

# Consumer: scheduled by the dataset, not by the clock
@dag(dag_id="build_features", schedule=[events_table], start_date=..., catchup=False)
def build_features():
    @task(outlets=[features])
    def featurize():
        ...
    featurize()

# Waits for BOTH upstream datasets
@dag(dag_id="train_model", schedule=[events_table, features], ...)
def train_model():
    ...
```

The consumer runs when every dataset in its `schedule` list has been updated since its last run. No sensor, no polling, no shared schedule assumption, and the **Datasets** view in the UI draws the resulting cross-DAG graph.

| Approach | Coupling | Cost |
|---|---|---|
| `ExternalTaskSensor` | Both DAGs must share an interval | A waiting task, and brittle date logic |
| `TriggerDagRunOperator` | The producer must know its consumers | Producer changes on every new consumer |
| **Datasets** | Neither knows the other; they share a URI | None while waiting |

<div class="callout tip">
  <span class="ct">The dataset URI is just a string</span>
  Airflow does not check the resource exists or was written. The URI is an identifier the two DAGs agree on. That makes it flexible and means you should establish a naming convention early: <code>scheme://system/schema.table</code> is a reasonable one. Inconsistent URIs mean two DAGs that <em>look</em> connected in the code and are not connected at all.
</div>

You can also combine time and data conditions, and express logic across them:

```python
from airflow.timetables.datasets import DatasetOrTimeSchedule
from airflow.timetables.trigger import CronTriggerTimetable

@dag(
    schedule=DatasetOrTimeSchedule(
        timetable=CronTriggerTimetable("0 6 * * *", timezone="UTC"),
        datasets=(events_table & features),        # AND; use | for OR
    ),
    ...
)
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Write two DAGs: a producer with <code>outlets=[Dataset("x://demo")]</code> on a schedule, and a consumer with <code>schedule=[Dataset("x://demo")]</code>.</li>
    <li>Trigger the producer manually and watch the consumer start on its own.</li>
    <li>Open the <strong>Datasets</strong> view and read the graph it drew.</li>
    <li>Add a second dataset to the consumer's schedule and confirm it now waits for both.</li>
  </ol>
  <em>a consumer DAG that starts because a dataset was updated, with no sensor and no shared schedule. The Datasets view drawing your cross-DAG dependency graph is the part that changes how you design pipelines.</em>
</div>

## TaskGroups and DAG factories

A DAG with sixty tasks is unreadable in the Graph view. **TaskGroups** collapse related tasks into one expandable node.

```python
from airflow.utils.task_group import TaskGroup

with DAG(...) as dag:
    start = EmptyOperator(task_id="start")

    with TaskGroup(group_id="extract") as extract:
        for source in ["orders", "users", "events"]:
            BashOperator(task_id=source, bash_command=f"python extract.py --src {source}")

    with TaskGroup(group_id="validate") as validate:
        schema = EmptyOperator(task_id="schema")
        rows = EmptyOperator(task_id="row_counts")
        schema >> rows

    start >> extract >> validate
```

TaskGroups are organisational. They create no runtime overhead. The `task_id` becomes `extract.orders`, which matters when you target a task from the CLI. The decorator form is neater in TaskFlow:

```python
from airflow.decorators import task_group

@task_group(group_id="quality_checks")
def quality_checks(table: str):
    @task
    def check_nulls(t: str): ...
    @task
    def check_freshness(t: str): ...
    check_nulls(table) >> check_freshness(table)
```

A **DAG factory** generates similar DAGs from configuration, a common need when twenty tables follow the same pattern:

```python dags/table_pipelines.py
import yaml
from pathlib import Path

CONFIG = Path(__file__).parent / "config" / "tables.yaml"

def build_dag(name: str, cfg: dict):
    @dag(
        dag_id=f"load_{name}",
        start_date=datetime(2024, 1, 1),
        schedule=cfg["schedule"],
        catchup=False,
        tags=["generated", cfg["domain"]],
    )
    def _dag():
        SQLExecuteQueryOperator(
            task_id="load",
            conn_id=cfg["conn_id"],
            sql=f"sql/{name}.sql",
        )
    return _dag()

# Reading a local YAML at parse time is cheap and acceptable.
for name, cfg in yaml.safe_load(CONFIG.read_text()).items():
    globals()[f"load_{name}"] = build_dag(name, cfg)
```

<div class="callout warn">
  <span class="ct">A factory must read config from a file, not from a database or an API</span>
  This code runs on <b>every parse</b>. A local YAML read is microseconds and fine. A database query or an HTTP call to build the DAG list means every parse cycle depends on that system being up and fast, and when it is slow, your entire scheduler is slow. If the config lives in a database, sync it to a file on a schedule and let the factory read the file.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Take a DAG with several related tasks and wrap them in two TaskGroups. Confirm the Graph view collapses them.</li>
    <li>Note the full <code>task_id</code> of a grouped task, then target it: <code>airflow tasks test my_dag extract.orders 2024-05-01</code>.</li>
    <li>Write a factory generating three DAGs from a YAML file and confirm all three appear.</li>
    <li>Add a <code>time.sleep(2)</code> to the factory loop and watch the parse duration in <strong>Admin → DAG Processing</strong>.</li>
  </ol>
  <em>a readable Graph view, dotted task ids you can address from the CLI, three generated DAGs, and a measurable parse cost from one careless line in the factory. That last measurement is why the warning above matters.</em>
</div>

## Pools, priority, and concurrency control

Beginner set `max_active_runs`. That protects one DAG. **Pools** protect a shared resource across every DAG.

The classic problem: a legacy database accepts five concurrent connections. Ten DAGs each with a task hitting it will open forty and take it down.

```bash
airflow pools set legacy_db 5 "Legacy Oracle: max 5 concurrent connections"
airflow pools set gpu 2 "GPU nodes"
airflow pools list
```

```python
SQLExecuteQueryOperator(
    task_id="legacy_extract",
    conn_id="legacy_oracle",
    sql="sql/extract.sql",
    pool="legacy_db",
    pool_slots=1,              # a heavy task can take several slots
    priority_weight=10,        # higher wins when the pool is contended
)
```

| Control | Scope | Protects |
|---|---|---|
| `parallelism` | Cluster | The whole installation |
| `max_active_tasks` | One DAG | Other DAGs from one greedy DAG |
| `max_active_runs` | One DAG | A table from concurrent writers |
| **Pool** | A named resource, across all DAGs | An external system |
| `pool_slots` | One task | Lets a heavy task count as several |
| `priority_weight` | One task | Which queued task goes first |
| `queue` | Celery routing | Sends work to specific workers |

`priority_weight` has a detail worth knowing: by default it is `downstream`, meaning a task's effective weight includes its downstream tasks, so a task blocking a long chain naturally outranks a leaf. You can set `weight_rule="absolute"` to use the number literally.

<div class="callout tip">
  <span class="ct">A pool is a promise to an external system</span>
  The number in a pool should come from the thing you are protecting: the connection limit, the API rate limit, the number of GPUs. Setting pool sizes by guessing means either an unprotected system or wasted capacity. Write the reason in the pool's description field. The next person will need it.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Create a pool with two slots. Put six <code>sleep 20</code> tasks in it.</li>
    <li>Run the DAG and confirm only two run at a time regardless of your cluster's capacity.</li>
    <li>Give two of the tasks <code>priority_weight=100</code> and rerun. Confirm they go first.</li>
    <li>Give one task <code>pool_slots=2</code> and confirm it runs alone.</li>
  </ol>
  <em>a hard concurrency ceiling that ignores cluster capacity, priority that visibly reorders the queue, and one task consuming the whole pool. Those three behaviours are all you need to protect any shared system.</em>
</div>

## SLAs, callbacks, and alerting people read

Beginner's DAG failed silently unless someone looked. Alerting is the difference between a pipeline you own and one that owns you.

```python
def alert_failure(context):
    ti = context["task_instance"]
    send_slack(
        channel="#data-alerts",
        text=(
            f":red_circle: *{ti.dag_id}.{ti.task_id}* failed\n"
            f"Run: {context['run_id']}  Logical date: {context['ds']}\n"
            f"Try {ti.try_number} of {ti.max_tries + 1}\n"
            f"<{ti.log_url}|Logs>"
        ),
    )

def alert_sla_miss(dag, task_list, blocking_task_list, slas, blocking_tis):
    send_slack(channel="#data-alerts", text=f":hourglass: SLA missed: {task_list}")

default_args = {
    "retries": 3,
    "on_failure_callback": alert_failure,
    "sla": timedelta(hours=1),          # per task: expected completion window
}

@dag(
    ...,
    default_args=default_args,
    sla_miss_callback=alert_sla_miss,
    on_failure_callback=alert_failure,   # DAG-level: the run failed
)
```

| Callback | Fires when |
|---|---|
| `on_failure_callback` | The task (or DAG run) failed after retries |
| `on_success_callback` | It succeeded |
| `on_retry_callback` | A retry is about to happen |
| `on_execute_callback` | Just before execution |
| `on_skipped_callback` | It was skipped |
| `sla_miss_callback` | A task exceeded its `sla` window |

An **SLA** in Airflow means "this task should complete within X of the DAG run's start". It does not stop or fail anything. It records a miss and fires the callback. That is a genuine limitation worth knowing: for a hard stop you need `execution_timeout`.

<div class="callout warn">
  <span class="ct">Alert on the right thing, or nobody will read your alerts</span>
  A callback on every task in every DAG produces a channel nobody looks at, which is worse than no alerting. Alert on <b>the DAG run failing</b> and on <b>SLA misses for pipelines with real consumers</b>. Route the noisy rest to a dashboard. Always include the log URL: an alert you cannot act on from your phone is an alert you will act on tomorrow.
</div>

The other half of alerting is making failures self-describing:

```python
@dag(
    ...,
    doc_md="""
    ### Daily events pipeline
    **Owner:** data-platform · **Consumers:** exec dashboard, ML features
    **On failure:** safe to clear and rerun; idempotent.
    **Escalate if:** not green by 07:00 UTC.
    """,
)
```

That renders in the UI, so whoever is on call at 3am has the runbook in front of them.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add an <code>on_failure_callback</code> that prints a formatted message including <code>ti.log_url</code>, and make a task fail.</li>
    <li>Confirm the callback fired only after retries were exhausted, not on each attempt.</li>
    <li>Add <code>"sla": timedelta(seconds=30)</code> to a task that sleeps for sixty and watch the SLA miss appear under <strong>Browse → SLA Misses</strong>.</li>
    <li>Add a <code>doc_md</code> to the DAG and find it rendered in the UI.</li>
  </ol>
  <em>a single actionable alert rather than one per retry, a recorded SLA miss that did not stop anything, and a runbook visible in the UI. Step two is the detail people get wrong: callbacks fire on final failure, not on every attempt.</em>
</div>

## Custom operators and hooks

You will hit work that no provider covers. Writing an operator is short, and it is how a team stops copy-pasting the same forty lines into nine DAGs.

```python plugins/operators/quality_check.py
from airflow.models import BaseOperator
from airflow.utils.decorators import apply_defaults
from airflow.exceptions import AirflowFailException

class RowCountCheckOperator(BaseOperator):
    """Fails if a table's row count for the interval is below a threshold."""

    template_fields = ("table", "day", "sql")     # ← makes {{ ds }} work
    ui_color = "#e8f5e9"

    def __init__(self, *, conn_id: str, table: str, day: str,
                 min_rows: int = 1, **kwargs):
        super().__init__(**kwargs)
        self.conn_id, self.table, self.day, self.min_rows = conn_id, table, day, min_rows
        self.sql = f"SELECT count(*) FROM {table} WHERE day = %s"

    def execute(self, context) -> int:
        hook = PostgresHook(postgres_conn_id=self.conn_id)
        count = hook.get_first(self.sql, parameters=(self.day,))[0]
        self.log.info("Row count for %s on %s: %s", self.table, self.day, count)
        if count < self.min_rows:
            # AirflowFailException skips remaining retries — a data problem
            # will not fix itself by trying again.
            raise AirflowFailException(
                f"{self.table} has {count} rows for {self.day}, expected >= {self.min_rows}"
            )
        return count
```

```python
RowCountCheckOperator(
    task_id="check_events",
    conn_id="warehouse",
    table="staging.events",
    day="{{ ds }}",              # templated because `day` is in template_fields
    min_rows=1000,
)
```

Four details in there are the lesson:

**`template_fields`** is what makes `{{ ds }}` work in your operator's arguments. Forget it and you get the literal string, a common bug in first custom operators.

**`self.log`** is the task logger, so your messages appear in the task's log in the UI rather than in the worker's stdout.

**`AirflowFailException`** fails without consuming retries, which is correct for a data-quality failure: retrying will not add the missing rows. `AirflowSkipException` is its sibling, marking the task skipped.

**Returning a value** pushes it to XCom automatically.

A **hook** wraps a connection. Write one when you have a system with no provider:

```python plugins/hooks/internal_api.py
from airflow.hooks.base import BaseHook
import requests

class InternalApiHook(BaseHook):
    conn_name_attr = "internal_conn_id"
    default_conn_name = "internal_default"
    hook_name = "Internal API"

    def __init__(self, internal_conn_id: str = default_conn_name):
        super().__init__()
        self.internal_conn_id = internal_conn_id

    def get_conn(self) -> requests.Session:
        conn = self.get_connection(self.internal_conn_id)   # credentials from Airflow
        session = requests.Session()
        session.headers["Authorization"] = f"Bearer {conn.password}"
        session.base_url = conn.host
        return session

    def fetch(self, path: str) -> dict:
        return self.get_conn().get(f"{self.get_connection(self.internal_conn_id).host}{path}").json()
```

<div class="callout tip">
  <span class="ct">Write the operator when the pattern appears the third time</span>
  Two copies of similar task code is fine. The third is the signal: extract an operator, put it in a package the whole team installs, and version it. A shared operator is also where you enforce standards: the row-count check that every table load must pass is far more likely to happen if it is one line rather than forty.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Write a small custom operator with one templated field and use it in a DAG.</li>
    <li>Check the <strong>Rendered Template</strong> tab and confirm the field resolved.</li>
    <li>Remove that field from <code>template_fields</code> and rerun to see the literal <code>{{ ds }}</code>.</li>
    <li>Raise <code>AirflowFailException</code> from it and confirm the task fails <em>without</em> using its retries.</li>
  </ol>
  <em>a working custom operator, then the literal-template bug, then a data failure that correctly refuses to retry. Those three results cover the operator-authoring mistakes people make.</em>
</div>

## Params and run configuration

Beginner's DAGs did the same thing every run. `Params` let a human parameterise a manual trigger, with validation and a form in the UI.

```python
from airflow.models.param import Param

@dag(
    dag_id="reprocess_range",
    schedule=None,
    start_date=datetime(2024, 1, 1),
    params={
        "start_date": Param("2024-05-01", type="string", format="date",
                            title="Start date"),
        "tables": Param(["events"], type="array",
                        description="Which tables to reprocess"),
        "full_refresh": Param(False, type="boolean"),
        "batch_size": Param(1000, type="integer", minimum=1, maximum=100_000),
    },
)
def reprocess_range():

    @task
    def report(**context):
        p = context["params"]
        print(f"Reprocessing {p['tables']} from {p['start_date']}, full={p['full_refresh']}")

    BashOperator(
        task_id="run",
        bash_command="python reprocess.py --start {{ params.start_date }} "
                     "--batch {{ params.batch_size }}",
    )
```

Triggering with **Trigger DAG w/ config** gives you a generated form with the right widget for each type, and validation before the run starts.

```bash
airflow dags trigger reprocess_range \
    --conf '{"start_date": "2024-04-01", "tables": ["events","users"], "full_refresh": true}'
```

| Mechanism | Set by | Read as | Scope |
|---|---|---|---|
| `Variable` | An operator, persistently | `Variable.get()` / `{{ var.value.x }}` | Global |
| `params` | The DAG author, with a default | `{{ params.x }}` / `context["params"]` | Per run, validated |
| `dag_run.conf` | Whoever triggers the run | `{{ dag_run.conf["x"] }}` | Per run, unvalidated |

<div class="callout tip">
  <span class="ct"><code>params</code> over raw <code>conf</code></span>
  <code>dag_run.conf</code> is an untyped dict, so a typo in a key produces a <code>KeyError</code> halfway through the run, at 3am, in a task nobody is watching. <code>params</code> gives you defaults, types, bounds, and a UI form, and it fails before the run starts. Use <code>conf</code> only for programmatic triggers where the caller is also code you control.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add three params of different types to a manual-only DAG.</li>
    <li>Use <strong>Trigger DAG w/ config</strong> and note the generated form and its validation.</li>
    <li>Try to submit a value outside a numeric bound and read the rejection.</li>
    <li>Trigger the same DAG from the CLI with <code>--conf</code> and confirm the values arrive.</li>
  </ol>
  <em>a validated form generated from your parameter declarations, and a rejection before any task ran. That pre-flight validation is the difference between <code>params</code> and a bare <code>conf</code> dict.</em>
</div>

## Testing DAGs

Beginner used `airflow tasks test` interactively. At this level tests belong in CI, and there are three distinct layers.

**Layer one: does it import, and is the structure sane?** This catches the majority of real breakages and runs in seconds.

```python tests/test_dag_integrity.py
import pytest
from airflow.models import DagBag

@pytest.fixture(scope="session")
def dagbag():
    return DagBag(dag_folder="dags/", include_examples=False)

def test_no_import_errors(dagbag):
    assert not dagbag.import_errors, f"Import errors: {dagbag.import_errors}"

def test_every_dag_has_required_metadata(dagbag):
    for dag_id, dag in dagbag.dags.items():
        assert dag.tags, f"{dag_id} has no tags"
        assert dag.default_args.get("retries", 0) >= 1, f"{dag_id} has no retries"
        assert dag.catchup is False, f"{dag_id} has catchup enabled"
        assert dag.dagrun_timeout, f"{dag_id} has no dagrun_timeout"
        assert dag.doc_md, f"{dag_id} has no documentation"

def test_no_cycles(dagbag):
    for dag in dagbag.dags.values():
        dag.test_cycle()

def test_parse_time_is_reasonable(dagbag):
    assert dagbag.dagbag_stats
    slow = [s for s in dagbag.dagbag_stats if s.duration.total_seconds() > 2]
    assert not slow, f"Slow-parsing files: {[s.file for s in slow]}"
```

**Layer two: unit-test the logic**, by extracting it from the operator.

```python
# The business logic lives in a plain function...
def classify_load(row_count: int, threshold: int = 100_000) -> str:
    return "full_reload" if row_count > threshold else "incremental_load"

# ...so it is testable without Airflow at all.
def test_classify_load():
    assert classify_load(200_000) == "full_reload"
    assert classify_load(500) == "incremental_load"
```

**Layer three: run the DAG.** `dag.test()` executes a complete run in-process, which is the closest you get to an integration test.

```python tests/test_pipeline_run.py
from airflow.models import DagBag

def test_pipeline_runs_end_to_end():
    dag = DagBag(dag_folder="dags/", include_examples=False).get_dag("daily_events_pipeline")
    dag.test(execution_date=datetime(2024, 5, 1))     # raises on failure
```

```yaml .github/workflows/dags.yml
name: DAGs
on: [pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11', cache: pip }
      - run: pip install -r requirements.txt
      - run: ruff check dags/ plugins/
      - run: pytest tests/ -v                     # integrity + unit tests
      - run: python -c "from airflow.models import DagBag; \
               b=DagBag('dags/', include_examples=False); \
               assert not b.import_errors, b.import_errors"
```

<div class="callout warn">
  <span class="ct">The integrity test is the one that earns its keep</span>
  A single import error in one DAG file can stop the scheduler processing it, and if the error is in a shared module it can affect many. The <code>DagBag</code> test takes seconds, needs no database, and catches the most common and most damaging class of breakage. If you add only one test, add that one.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Write the integrity test and run it. Fix anything it flags in your own DAGs.</li>
    <li>Add the metadata test asserting retries, tags, and <code>dagrun_timeout</code>. Watch it fail on a real DAG, then fix the DAG.</li>
    <li>Break a DAG file with a syntax error and confirm the test catches it.</li>
    <li>Run <code>dag.test()</code> on a small DAG and watch it execute in your terminal.</li>
  </ol>
  <em>a test suite that enforces your own standards, failing on real DAGs you had thought were fine. That metadata test is the cheapest way to make a convention stick across a team.</em>
</div>

## Timetables and scheduling beyond cron

Cron cannot express "every weekday at 6am, but not on public holidays" or "the first business day of each month". A **Timetable** can.

```python plugins/timetables/business_days.py
from airflow.timetables.base import DagRunInfo, DataInterval, TimeRestriction, Timetable
from pendulum import DateTime, Time

class BusinessDayTimetable(Timetable):
    """Runs at 06:00 on weekdays only, covering the previous business day."""

    def infer_manual_data_interval(self, run_after: DateTime) -> DataInterval:
        start = run_after.subtract(days=1).start_of("day")
        return DataInterval(start=start, end=start.add(days=1))

    def next_dagrun_info(self, *, last_automated_data_interval, restriction):
        if last_automated_data_interval is None:
            start = restriction.earliest
            if start is None:
                return None
        else:
            start = last_automated_data_interval.end

        # Skip forward to the next weekday
        while start.weekday() >= 5:
            start = start.add(days=1)

        if restriction.latest is not None and start > restriction.latest:
            return None

        return DagRunInfo.interval(
            start=start,
            end=start.add(days=1),
        )
```

```python
@dag(schedule=BusinessDayTimetable(), start_date=datetime(2024, 1, 1), catchup=False)
def weekday_report():
    ...
```

Before writing one, check the built-ins. They cover more than people expect:

| Timetable | Expresses |
|---|---|
| `CronTriggerTimetable` | Cron, but fires **at** the time rather than at interval end |
| `DeltaDataIntervalTimetable` | A `timedelta`, aligned to the previous run |
| `DatasetOrTimeSchedule` | Datasets **or** a schedule, whichever comes first |
| `EventsTimetable` | An explicit list of datetimes: ideal for irregular calendars |

`CronTriggerTimetable` deserves a note because it resolves a real confusion: a plain cron schedule fires *after* the interval it covers, while `CronTriggerTimetable("0 6 * * *")` fires at 06:00 and treats that instant as the logical date. If you have ever wanted "run at 6am and call it today's run", that is the one.

```python
from airflow.timetables.trigger import CronTriggerTimetable

@dag(schedule=CronTriggerTimetable("0 6 * * *", timezone="Europe/Berlin"), ...)
```

<div class="callout tip">
  <span class="ct">Set an explicit timezone once you have humans depending on the schedule</span>
  A UTC schedule shifts by an hour twice a year relative to local business hours. <code>CronTriggerTimetable</code> and <code>DAG(timezone=...)</code> both accept a real timezone, and Airflow handles the daylight-saving transitions. "The report was an hour late every summer" is a real bug people spend a long time not finding.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Switch a DAG from <code>schedule="0 6 * * *"</code> to <code>CronTriggerTimetable("0 6 * * *")</code> and compare the logical dates of the resulting runs.</li>
    <li>Use <code>EventsTimetable</code> with three explicit datetimes and confirm only those runs are created.</li>
    <li>Set a non-UTC timezone and check the <strong>Next Run</strong> column in the UI.</li>
    <li>Write a minimal custom timetable that skips weekends and confirm no Saturday or Sunday runs appear.</li>
  </ol>
  <em>the same cron string producing different logical dates under the two timetables, which is exactly the confusion <code>CronTriggerTimetable</code> exists to remove. Step one is worth doing even if you never write a custom timetable.</em>
</div>

## XCom backends and passing real data

Beginner's rule was "XCom for metadata, storage for data". At this level you can make that automatic with a **custom XCom backend**, so large returns go to object storage transparently.

```python plugins/xcom/s3_backend.py
import json, uuid
from typing import Any
from airflow.models.xcom import BaseXCom
from airflow.providers.amazon.aws.hooks.s3 import S3Hook

BUCKET = "airflow-xcom"
THRESHOLD = 8 * 1024          # anything larger goes to S3

class S3XComBackend(BaseXCom):
    @staticmethod
    def serialize_value(value: Any, **kwargs):
        payload = json.dumps(value).encode()
        if len(payload) < THRESHOLD:
            return BaseXCom.serialize_value(value)

        key = f"xcom/{uuid.uuid4()}.json"
        S3Hook().load_bytes(payload, key=key, bucket_name=BUCKET, replace=True)
        return BaseXCom.serialize_value(f"s3://{BUCKET}/{key}")

    @staticmethod
    def deserialize_value(result):
        value = BaseXCom.deserialize_value(result)
        if isinstance(value, str) and value.startswith(f"s3://{BUCKET}/xcom/"):
            key = value.split(f"{BUCKET}/", 1)[1]
            return json.loads(S3Hook().read_key(key, BUCKET))
        return value
```

```ini airflow.cfg
[core]
xcom_backend = plugins.xcom.s3_backend.S3XComBackend
```

Small values stay in the database and remain visible in the UI; large ones move to S3 with only a pointer stored. DAG code is unchanged.

| Approach | Where data lives | UI visibility | Cleanup |
|---|---|---|---|
| Default XCom | Metadata database | Full | `airflow db clean` |
| Custom backend | Object storage, pointer in the DB | The pointer only | **Your responsibility** |
| Explicit paths in your tasks | Object storage | The path | Your pipeline's |

<div class="callout warn">
  <span class="ct">A custom backend makes cleanup your problem</span>
  Airflow's <code>db clean</code> removes XCom <b>rows</b>; it has no idea about the S3 objects those rows point at. Without a lifecycle rule on the bucket you accumulate orphaned objects forever. Set an expiry on the XCom prefix. A few days is usually plenty, since XCom values are only read by the same DAG run.
</div>

The alternative, and often the better one, is explicitness:

```python
@task
def extract() -> str:
    df = fetch_data()
    path = f"s3://staging/events/{{{{ ds }}}}/raw.parquet"
    df.to_parquet(path)
    return path                        # a path, deliberately

@task
def transform(path: str) -> str:
    df = pd.read_parquet(path)
    ...
```

The explicit version is more code, and it makes the data flow visible in the DAG, which reviewers appreciate. A backend is better when many DAGs would otherwise each reimplement the same pattern.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Return a 2 MB object from a task with the default backend and time the run. Look at the XCom page.</li>
    <li>Check the metadata database size before and after.</li>
    <li>Rewrite it to write a file and return the path. Compare the run time.</li>
    <li>If you have object storage available, implement the backend above and confirm small values still appear in the UI.</li>
  </ol>
  <em>a visibly slow run and a bloated XCom table, then a fast one passing a path. Measuring the database growth in step two is what makes the "metadata, not data" rule concrete at this level.</em>
</div>

## Setup, teardown, and resource lifecycles

A DAG that provisions a cluster, uses it, and tears it down has a problem: if the middle task fails, the teardown must still run, and `TriggerRule.ALL_DONE` on a cleanup task is a blunt approximation.

Airflow has first-class **setup and teardown** tasks:

```python
@task
def create_cluster() -> str:
    return provision_emr()          # returns a cluster id

@task
def run_job(cluster_id: str):
    submit_step(cluster_id)

@task
def destroy_cluster(cluster_id: str):
    terminate_emr(cluster_id)

cluster = create_cluster()
job = run_job(cluster)
teardown = destroy_cluster(cluster)

cluster >> job >> teardown
cluster.as_setup() >> teardown.as_teardown()      # declares the relationship
```

Or more concisely with the decorator arguments:

```python
@task(multiple_outputs=False)
def create_cluster() -> str: ...

@task
def destroy_cluster(cluster_id: str): ...

with create_cluster() as cluster:          # setup/teardown context
    run_job(cluster)
```

| Property | `ALL_DONE` cleanup task | Setup/teardown |
|---|---|---|
| Runs after failure | Yes | Yes |
| Its own failure fails the run | Yes | **No** by default |
| Excluded from a clear of the main tasks | No | Yes: teardown reruns as needed |
| Reflects intent in the UI | No | Yes, drawn distinctly |
| Skipped when nothing needed it | No | Yes |

The behaviour that matters: a **teardown failure does not fail the DAG run** unless you ask it to. That is usually right. If the job succeeded and only the cluster termination was flaky, the pipeline's output is still valid, and you want an alert rather than a red run that masks a success.

<div class="callout tip">
  <span class="ct">Use setup/teardown for anything you pay for by the minute</span>
  Ephemeral clusters, GPU nodes, database connections, temporary tables, lock files. The pattern's value is that a failure in the middle cannot leave the expensive resource running, which is a cost bug that only shows up on next month's invoice.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Build a three-task DAG: setup writes a file, work reads it, teardown deletes it.</li>
    <li>Wire it with <code>as_setup()</code> and <code>as_teardown()</code> and confirm the UI draws them differently.</li>
    <li>Make the middle task fail. Confirm teardown still runs and the file is gone.</li>
    <li>Now make teardown itself fail and check whether the DAG run is red.</li>
  </ol>
  <em>a teardown that runs after a failure, and a DAG run that stays green when only the teardown failed. That second behaviour is the difference from an <code>ALL_DONE</code> cleanup task, and it is usually what you want.</em>
</div>

## Putting it all together

Everything from this level in one DAG. Nothing here is new. Read it as a whole and you should be able to justify every line.

```python dags/events_platform.py
"""
### Events platform pipeline
**Owner:** data-platform · **Consumers:** exec dashboard, ML features
**On failure:** idempotent — safe to clear and rerun.
**Escalate if:** not green by 07:00 UTC.
"""
from datetime import datetime, timedelta

from airflow.datasets import Dataset
from airflow.decorators import dag, task, task_group
from airflow.models.param import Param
from airflow.operators.empty import EmptyOperator
from airflow.providers.amazon.aws.hooks.s3 import S3Hook
from airflow.providers.amazon.aws.sensors.s3 import S3KeySensor
from airflow.providers.common.sql.operators.sql import SQLExecuteQueryOperator
from airflow.timetables.trigger import CronTriggerTimetable
from airflow.utils.trigger_rule import TriggerRule

EVENTS_TABLE = Dataset("postgres://warehouse/analytics.daily_events")

def alert(context):
    ti = context["task_instance"]
    print(f"ALERT {ti.dag_id}.{ti.task_id} failed — {ti.log_url}")

default_args = {
    "owner": "data-platform",
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
    "retry_exponential_backoff": True,
    "execution_timeout": timedelta(minutes=30),
    "on_failure_callback": alert,
    "sla": timedelta(hours=2),
}

@dag(
    dag_id="events_platform",
    # Fires AT 02:00 local and calls that instant the logical date.
    schedule=CronTriggerTimetable("0 2 * * *", timezone="Europe/Berlin"),
    start_date=datetime(2024, 1, 1),
    catchup=False,
    default_args=default_args,
    dagrun_timeout=timedelta(hours=4),
    max_active_runs=1,                     # one writer per table
    max_active_tasks=12,                   # do not starve other DAGs
    tags=["production", "events"],
    doc_md=__doc__,
    params={
        "full_refresh": Param(False, type="boolean", title="Full refresh"),
        "batch_size": Param(5000, type="integer", minimum=100, maximum=50_000),
    },
    on_failure_callback=alert,
)
def events_platform():

    start = EmptyOperator(task_id="start")

    # Deferrable: releases the worker slot entirely while waiting.
    wait = S3KeySensor(
        task_id="wait_for_landing",
        bucket_name="raw-data",
        bucket_key="events/{{ ds }}/_SUCCESS",
        deferrable=True,
        poke_interval=60,
        timeout=60 * 60 * 3,
    )

    @task
    def list_partitions() -> list[str]:
        """Cheap listing at run time — never at parse time."""
        return S3Hook().list_keys(bucket_name="raw-data", prefix="events/{{ ds }}/part-")

    @task(pool="warehouse_writes", pool_slots=1, priority_weight=10)
    def load_partition(key: str) -> int:
        """Pooled: the warehouse accepts a bounded number of writers."""
        return copy_into_staging(key)

    @task_group(group_id="quality")
    def quality(counts: list[int]):
        @task
        def check_rows(c: list[int]):
            if sum(c) == 0:
                raise ValueError("No rows landed for {{ ds }}")
            return sum(c)

        @task
        def check_freshness():
            ...

        check_rows(counts) >> check_freshness()

    # Idempotent SQL: DELETE the partition, then INSERT. Marks the dataset.
    rollup = SQLExecuteQueryOperator(
        task_id="rollup",
        conn_id="warehouse",
        sql="sql/daily_rollup.sql",
        params={"lookback_days": 7},
        outlets=[EVENTS_TABLE],            # downstream DAGs are scheduled by this
    )

    cleanup = EmptyOperator(task_id="cleanup", trigger_rule=TriggerRule.ALL_DONE)
    end = EmptyOperator(task_id="end")

    counts = load_partition.expand(key=list_partitions())    # N mapped instances
    start >> wait >> counts
    quality(counts) >> rollup >> cleanup >> end

events_platform()
```

```python dags/features_platform.py
"""Scheduled by data, not by the clock."""
from airflow.datasets import Dataset

EVENTS_TABLE = Dataset("postgres://warehouse/analytics.daily_events")

@dag(dag_id="features_platform", schedule=[EVENTS_TABLE], start_date=..., catchup=False)
def features_platform():
    ...
```

Twelve decisions in there are the whole lesson of this level:

| Decision | Section |
|---|---|
| `CronTriggerTimetable` with an explicit timezone | Timetables |
| `deferrable=True` on the sensor | Deferrable operators |
| `.expand()` over a run-time partition list | Dynamic task mapping |
| `pool` and `priority_weight` on the writing task | Pools and priority |
| `max_active_runs=1` plus `max_active_tasks=12` | Executors and limits |
| `outlets=[…]` making a downstream DAG data-scheduled | Datasets |
| A `@task_group` for the quality checks | TaskGroups |
| `on_failure_callback` and an `sla` in `default_args` | SLAs and callbacks |
| `params` with types and bounds | Params |
| `doc_md` carrying the runbook | SLAs and callbacks |
| Idempotent templated SQL in a file | (Beginner) Templating |
| No top-level listing, queries, or imports | (Beginner) Top-level code |

<div class="guide-try">
  <span class="ct">Try it: the one that matters</span>
  <ol>
    <li>Rebuild a real pipeline of yours against this template and get it green.</li>
    <li>Verify each mechanism actively: confirm the deferred sensor holds no worker slot, confirm the pool caps concurrency, confirm the downstream dataset DAG starts on its own, confirm a mapped instance can be retried alone.</li>
    <li>Add the integrity test suite and make it pass, including the assertions about retries, tags, and <code>dagrun_timeout</code>.</li>
    <li>Check the parse duration is under a second, then backfill three days with <code>max_active_runs=1</code>.</li>
  </ol>
  <em>a pipeline that waits without cost, respects a shared resource, triggers its consumer by data, and is retryable at the individual-partition level. Those four properties are what separate a DAG that works from one a platform team is happy to host.</em>
</div>

## Where you are now

You can choose an executor deliberately, map tasks dynamically at run time, replace sensors with deferrable operators, schedule on data rather than time, organise large DAGs with TaskGroups and factories, protect shared systems with pools and priority, alert in a way people act on, write custom operators and hooks, parameterise runs with validation, test DAGs in CI, express schedules cron cannot, move large XCom values out of the database, and manage expensive resources with setup and teardown.

| Can you… | |
|---|---|
| Give the Celery/Kubernetes trade-off in one sentence? | Startup latency versus per-task isolation |
| Name the three concurrency limits and their scopes? | `parallelism`, `max_active_tasks`, `worker_concurrency` |
| Say what `expand` with two lists produces? | A cross product: use `expand_kwargs` for pairs |
| Explain what a deferred task costs in worker slots? | Nothing: the triggerer holds it |
| Say what happens if the triggerer is not running? | Deferred tasks hang silently |
| Explain data-aware scheduling in one sentence? | The consumer runs when its datasets are updated |
| Say why a DAG factory must not query a database? | It runs on every parse |
| Name what a pool protects that `max_active_tasks` does not? | An external system, across all DAGs |
| Say what an SLA miss does *not* do? | Stop or fail anything |
| Give the exception that fails without retrying? | `AirflowFailException` |
| Name the cheapest high-value test? | The `DagBag` integrity test |
| Say what a custom XCom backend makes your problem? | Cleaning up the stored objects |
| Explain the difference between cron and `CronTriggerTimetable`? | Fires after the interval versus at the time |
| Say why teardown failure should not fail the run? | The output is still valid; alert instead |

**Senior takes every one of these further, with a security, scale, or ownership dimension.** Who can see and trigger which DAG, and how multi-tenancy works. Secrets backends so credentials never live in the metadata database at all. Scaling the scheduler, the database, and the executor, and knowing which one is your bottleneck. Cost modelling across executors and idle capacity. Upgrade and migration strategy without a maintenance window nobody will grant you. Observability, SLOs, and the metrics that predict an incident. Incident playbooks for a stuck scheduler, a poisoned queue, a bloated metadata database, and a backfill that took down production. Running Airflow as a platform for many teams. Where Airflow stops and a streaming system, a warehouse scheduler, or an in-database tool begins.
