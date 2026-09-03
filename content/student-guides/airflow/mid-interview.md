Part two of three. A cumulative review of **Beginner and Mid-level material**, organised by topic rather than by level, in about thirty-five minutes. Fast review first, common questions at the end. Senior reviews all three.

## Foundations, in one screen

<div class="flow">
  <div class="node">DAG FOLDER<small>your .py files</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">SCHEDULER<small>parse + schedule</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">METADATA DB<small>all state</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">WORKER<small>runs the task</small></div>
</div>

> Airflow schedules and monitors workflows defined as Python DAGs. It is an **orchestrator, not a compute engine** — a task should tell Spark or the warehouse to do the work.

**Airflow schedules intervals, not moments.** A `@daily` run for 1 May starts just after midnight on 2 May; the logical date is 2024-05-01. Use `{{ ds }}`, never `now()`.

**The scheduler executes every DAG file repeatedly**, so top-level code slows everything. **The metadata database is the source of truth.** **XCom is serialised into it**, so pass paths not payloads. **Credentials live in a Connection.** **Idempotence** — delete the partition, then write — is what makes retries and backfills safe.

| Guard | Prevents |
|---|---|
| `retries` + `retry_delay` | A blip failing the pipeline |
| `execution_timeout` | A hung task holding a worker forever |
| `dagrun_timeout` | Intervals piling up behind a stuck run |
| `max_active_runs` | Two runs writing one table |
| `catchup=False` | An accidental flood of historical runs |

## Executors

| Executor | Parallelism | Use when |
|---|---|---|
| `LocalExecutor` | One machine | Small teams, one box |
| `CeleryExecutor` | Horizontal, pre-provisioned | Steady load, many short tasks |
| `KubernetesExecutor` | Horizontal, on demand | Variable load, per-task isolation |
| `CeleryKubernetesExecutor` | Both, routed by queue | Mixed workloads |

The trade-off is **startup latency versus isolation**: Celery workers are already running so a task starts in under a second, but they share an environment and you pay for idle capacity. Kubernetes gives per-task images and resources and scales to zero, at 10–30 seconds of pod startup per task.

| Limit | Scope | Symptom when too low |
|---|---|---|
| `parallelism` | Cluster | Tasks queued across every DAG |
| `max_active_tasks_per_dag` | One DAG | One DAG slow, others fine |
| `worker_concurrency` | One worker | Queue depth grows, workers idle |
| Pool slots | A named resource | Only pooled tasks queue |

## Dynamic task mapping

```python
@task
def list_files() -> list[str]: ...

@task
def process(key: str) -> int: ...

counts = process.expand(key=list_files())       # N instances at run time
summarise(counts)                                # receives the list of results
```

```python
process.partial(bucket="raw").expand(key=keys)          # fixed + varying
process.expand_kwargs([{"k": "a"}, {"k": "b"}])          # explicit pairs
```

<div class="callout warn">
  <span class="ct"><code>expand</code> with two arguments is a cross product</span>
  <code>expand(key=[a,b], region=[eu,us])</code> creates <b>four</b> instances, not two. For pairs use <code>expand_kwargs</code> with a list of dicts, or zip upstream. <code>max_map_length</code> caps the total, and mapping is not a substitute for batching — ten thousand tiny mapped tasks is ten thousand scheduler decisions and database rows.
</div>

## Deferrable operators and the triggerer

<div class="flow">
  <div class="node">TASK STARTS<small>on a worker</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">DEFERS<small>slot released</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">TRIGGERER<small>async wait</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">RESUMES<small>back on a worker</small></div>
</div>

| Approach | Worker slots while waiting | Scales to |
|---|---|---|
| Sensor, `poke` | One per sensor, continuously | Tens |
| Sensor, `reschedule` | Zero between checks | Hundreds |
| **`deferrable=True`** | **Zero** | Tens of thousands |

`deferrable=True` works on more than sensors — a Spark submit or a BigQuery job can defer while the external system works. The triggerer runs an asyncio loop, so trigger code must be **async**; a blocking call in a trigger stalls every other deferred task in that process.

<div class="callout warn">
  <span class="ct">Deferrable operators need a running triggerer</span>
  Without one, deferred tasks sit in <code>deferred</code> state forever and nothing tells you loudly. Treat the triggerer as a required component before adopting them.
</div>

## Datasets and data-aware scheduling

```python
events = Dataset("postgres://warehouse/analytics.daily_events")

@task(outlets=[events])          # producer declares it updates the dataset
def load(): ...

@dag(schedule=[events], ...)     # consumer is scheduled BY the dataset
def features(): ...
```

| Approach | Coupling | Cost while waiting |
|---|---|---|
| `ExternalTaskSensor` | Both DAGs share an interval | A waiting task |
| `TriggerDagRunOperator` | Producer must know its consumers | None, but brittle |
| **Datasets** | Neither knows the other; they share a URI | **None** |

The URI is just a string Airflow does not validate, so establish a naming convention early — inconsistent URIs mean two DAGs that look connected and are not. `DatasetOrTimeSchedule` combines both, and dataset expressions support `&` and `|`.

## TaskGroups, factories, setup/teardown

```python
with TaskGroup(group_id="extract") as extract:      # task_id becomes extract.orders
    for src in ["orders", "users"]:
        BashOperator(task_id=src, bash_command=f"python extract.py --src {src}")
```

A DAG factory generates similar DAGs from config — and **must read a local file, never a database or API**, because it runs on every parse.

```python
cluster = create_cluster()
cluster.as_setup() >> destroy_cluster(cluster).as_teardown()
```

| Property | `ALL_DONE` cleanup | Setup/teardown |
|---|---|---|
| Runs after failure | Yes | Yes |
| Its failure fails the run | Yes | **No** by default |
| Excluded from a clear of main tasks | No | Yes |
| Drawn distinctly in the UI | No | Yes |

## Pools, priority, and queues

```bash
airflow pools set legacy_db 5 "Legacy Oracle: 5 concurrent connections"
```

```python
SQLExecuteQueryOperator(..., pool="legacy_db", pool_slots=1, priority_weight=10)
```

| Control | Protects |
|---|---|
| `parallelism` | The whole installation |
| `max_active_tasks` | Other DAGs from one greedy DAG |
| **Pool** | An **external system**, across all DAGs |
| `pool_slots` | Lets one heavy task count as several |
| `priority_weight` | Which queued task goes first |
| `queue` | Celery routing to specific workers |

`priority_weight` defaults to `downstream`, so a task blocking a long chain naturally outranks a leaf. A pool's size should come from the thing it protects — a connection limit, an API rate limit, a GPU count.

## SLAs, callbacks, and alerting

```python
default_args = {"retries": 3, "on_failure_callback": alert, "sla": timedelta(hours=1)}

@dag(..., default_args=default_args, sla_miss_callback=on_sla_miss, on_failure_callback=alert)
```

| Callback | Fires |
|---|---|
| `on_failure_callback` | After retries are exhausted — **not** per attempt |
| `on_success_callback` / `on_retry_callback` | Success / before a retry |
| `sla_miss_callback` | A task exceeded its `sla` window |

**An SLA does not stop or fail anything** — it records a miss and fires the callback. For a hard stop you need `execution_timeout`. Alert on the DAG run failing and on SLA misses for consumer-facing pipelines; always include `ti.log_url`, and put the runbook in `doc_md` so it renders in the UI.

## Custom operators and hooks

```python
class RowCountCheckOperator(BaseOperator):
    template_fields = ("table", "day")        # ← without this, {{ ds }} stays literal

    def execute(self, context) -> int:
        count = PostgresHook(self.conn_id).get_first(self.sql, (self.day,))[0]
        self.log.info("count=%s", count)      # appears in the task log
        if count < self.min_rows:
            raise AirflowFailException("too few rows")   # no retries consumed
        return count                          # pushed to XCom
```

| Detail | Why |
|---|---|
| `template_fields` | Makes `{{ ds }}` work in your arguments |
| `self.log` | Messages land in the task log, not worker stdout |
| `AirflowFailException` | Fails without consuming retries — right for a data problem |
| `AirflowSkipException` | Marks the task skipped |
| Returning a value | Pushed to XCom automatically |

## Params and run configuration

```python
params={
    "start_date": Param("2024-05-01", type="string", format="date"),
    "batch_size": Param(1000, type="integer", minimum=1, maximum=100_000),
}
```

| Mechanism | Set by | Validated |
|---|---|---|
| `Variable` | An operator, persistently | No |
| `params` | The DAG author, with defaults | **Yes** — types, bounds, a UI form |
| `dag_run.conf` | Whoever triggers the run | No |

Prefer `params` over raw `conf`: a typo in a `conf` key is a `KeyError` halfway through a run at 3am, while `params` fails before the run starts.

## Testing and CI

```python tests/test_dag_integrity.py
def test_no_import_errors(dagbag):
    assert not dagbag.import_errors

def test_standards(dagbag):
    for dag_id, dag in dagbag.dags.items():
        assert dag.tags and dag.dagrun_timeout and dag.doc_md
        assert dag.default_args.get("retries", 0) >= 1
        assert dag.catchup is False
```

| Layer | Catches | Needs a database |
|---|---|---|
| `DagBag` integrity | Import errors, missing standards, cycles, slow parsing | **No** |
| Unit tests on extracted functions | Logic bugs | No |
| `dag.test()` | End-to-end behaviour | Yes |

The integrity test is the one that earns its keep: seconds to run, no database, and it catches the most common and most damaging breakage — a DAG file the scheduler cannot parse.

## Timetables

| Timetable | Expresses |
|---|---|
| `CronTriggerTimetable` | Cron, firing **at** the time rather than at interval end |
| `DeltaDataIntervalTimetable` | A `timedelta` aligned to the previous run |
| `DatasetOrTimeSchedule` | Datasets **or** a schedule |
| `EventsTimetable` | An explicit list of datetimes |
| A custom `Timetable` | Business days, holiday calendars, anything cron cannot |

The distinction worth knowing: a plain cron schedule fires *after* the interval it covers, while `CronTriggerTimetable("0 6 * * *")` fires at 06:00 and calls that instant the logical date. Set an explicit timezone once humans depend on the schedule, or the report slips an hour twice a year.

## XCom backends

```ini
[core]
xcom_backend = plugins.xcom.s3_backend.S3XComBackend
```

A custom backend serialises small values to the database as usual and pushes large ones to object storage, storing only a pointer — with DAG code unchanged. The catch: `airflow db clean` removes XCom **rows** and knows nothing about the objects they point at, so a bucket lifecycle rule is now your responsibility.

## Common interview questions

<ol class="guide-steps">
  <li><b>Celery or Kubernetes executor — how do you choose?</b>Startup latency versus isolation. Celery workers are already running, so a task starts in under a second and thousands of short tasks are cheap — but they share an environment and you pay for idle capacity. Kubernetes gives per-task images, resources, and full isolation and scales to zero, at 10–30 seconds of pod startup per task. Many short tasks favour Celery; few heavy ones favour Kubernetes; <code>CeleryKubernetesExecutor</code> routes by queue.</li>
  <li><b>Tasks are stuck in <code>queued</code>. Walk me through it.</b>Check the limits in order: cluster <code>parallelism</code>, then the DAG's <code>max_active_tasks</code>, then pool slots with <code>airflow pools list</code>, then whether the tasks name a <code>queue</code> no running worker consumes. That last case looks identical to capacity exhaustion and adding workers does not fix it.</li>
  <li><b>What is dynamic task mapping and when is it wrong?</b><code>.expand()</code> creates one task instance per element of a run-time list, each independently retryable. It is wrong when the per-item work is small — ten thousand mapped tasks is ten thousand scheduler decisions, database rows, and possibly pods, for a few minutes of real work. Map when items are substantial; batch when they are not.</li>
  <li><b>What does <code>expand</code> with two arguments do?</b>A cross product, not a zip. Two lists of three produce nine instances. Use <code>expand_kwargs</code> with a list of dicts for pairs.</li>
  <li><b>What is a deferrable operator and why does it matter?</b>The task starts, discovers it must wait, and defers — releasing its worker slot entirely and handing a lightweight trigger to the triggerer, which runs thousands in one asyncio loop. It turns a waiting task from something that costs a worker slot into something that costs almost nothing, which is why sensors in <code>poke</code> mode are now a fallback rather than the default.</li>
  <li><b>What happens if the triggerer is not running?</b>Deferred tasks sit in <code>deferred</code> state indefinitely and nothing alerts loudly. It is a required component once you use <code>deferrable=True</code> anywhere.</li>
  <li><b>Explain data-aware scheduling.</b>A producer task declares <code>outlets=[Dataset(uri)]</code>; a consumer DAG sets <code>schedule=[Dataset(uri)]</code> and runs when every dataset in that list has been updated since its last run. No sensor, no polling, no shared schedule assumption. The URI is an uninterpreted string, so a naming convention matters.</li>
  <li><b>Datasets, <code>ExternalTaskSensor</code>, or <code>TriggerDagRunOperator</code>?</b>Datasets, in almost every new case. The sensor couples both DAGs to a shared interval and costs a waiting task; the trigger operator makes the producer know about every consumer. Datasets couple only on a URI and cost nothing while waiting.</li>
  <li><b>Why must a DAG factory read config from a file rather than a database?</b>The factory runs on every parse cycle. A database query or API call there means every parse depends on that system being up and fast, so when it is slow the entire scheduler is slow. Sync the config to a file on a schedule and read the file.</li>
  <li><b>What does a pool protect that <code>max_active_tasks</code> does not?</b>An external system, across every DAG. <code>max_active_tasks</code> limits one DAG; a legacy database accepting five connections needs a limit that ten different DAGs all respect, and that is a pool. Its size should come from the resource's real limit.</li>
  <li><b>What does an SLA in Airflow actually do?</b>Records a miss and fires <code>sla_miss_callback</code>. It does not stop, fail, or kill anything — which surprises people. For a hard stop you need <code>execution_timeout</code>.</li>
  <li><b>When does <code>on_failure_callback</code> fire?</b>After retries are exhausted, not on each attempt. That is what makes it usable for alerting — a callback per attempt on a task with five retries produces five pages for one incident.</li>
  <li><b>Your custom operator shows a literal <code>{{ ds }}</code>. Why?</b>The field is not in <code>template_fields</code>. Only declared fields are rendered, and this is the most common bug in a first custom operator.</li>
  <li><b>Which exception fails a task without retrying?</b><code>AirflowFailException</code> — correct for a data-quality failure, because retrying will not add the missing rows. <code>AirflowSkipException</code> marks it skipped instead.</li>
  <li><b><code>params</code> or <code>dag_run.conf</code>?</b><code>params</code>, because it gives you defaults, types, bounds, and a generated UI form, and it validates before the run starts. Raw <code>conf</code> is an untyped dict where a typo becomes a <code>KeyError</code> mid-run. Use <code>conf</code> only for programmatic triggers from code you control.</li>
  <li><b>What is the single most valuable Airflow test?</b>A <code>DagBag</code> integrity test: no import errors, no cycles, and your own standards asserted — retries set, tags present, <code>catchup=False</code>, <code>dagrun_timeout</code> set. It runs in seconds, needs no database, and catches the breakage that actually stops the scheduler.</li>
  <li><b>How do you enforce conventions across a team's DAGs?</b>Assert them in the integrity test and make it a required CI check. A convention in a document is advisory; a convention that fails the build is a convention.</li>
  <li><b>Cron string versus <code>CronTriggerTimetable</code>?</b>The same expression, different semantics. A plain cron schedule fires after the interval it covers, so the logical date is the previous period. <code>CronTriggerTimetable("0 6 * * *")</code> fires at 06:00 and treats that instant as the logical date — which is what people usually mean by "run at 6am".</li>
  <li><b>Why set an explicit timezone on a schedule?</b>A UTC schedule drifts an hour relative to local business hours twice a year. Both <code>CronTriggerTimetable</code> and the DAG's timezone accept a real zone and handle the daylight-saving transitions, which is the fix for "the report was an hour late all summer".</li>
  <li><b>What does a custom XCom backend make your problem?</b>Cleanup. <code>airflow db clean</code> deletes XCom rows and knows nothing about the objects those rows point at, so without a bucket lifecycle rule you accumulate orphans forever.</li>
  <li><b>Why should a teardown failure not fail the DAG run?</b>Because the pipeline's output is still valid — if the job succeeded and only cluster termination was flaky, a red run masks a real success. You want an alert on the teardown, not a failed pipeline. That is the main behavioural difference from an <code>ALL_DONE</code> cleanup task.</li>
</ol>

## Final self-test

- Give the Celery/Kubernetes trade-off in one sentence.
- Name the four concurrency limits and their scopes, plus the queue-routing trap.
- Say what `expand` with two lists produces, and when mapping is the wrong tool.
- Explain what a deferred task costs, and what happens with no triggerer.
- Describe data-aware scheduling and why it beats the two alternatives.
- Say why a DAG factory must not query a database.
- Name what a pool protects that `max_active_tasks` does not.
- Say what an SLA does not do, and when `on_failure_callback` fires.
- Give the reason a custom operator shows a literal `{{ ds }}`.
- Name the exception that fails without retrying, and when to use it.
- Say why `params` beats `dag_run.conf`.
- Name the cheapest high-value test and what it asserts.
- Explain cron versus `CronTriggerTimetable` in terms of logical date.
- Say what a custom XCom backend makes your responsibility.
