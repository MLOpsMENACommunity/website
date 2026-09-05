Part one of three. Almost every beginner problem with Airflow comes from one of three things: misunderstanding the interval model, putting expensive work at the top level of a DAG file, or forgetting that a task must be safe to run twice. Start with the error table, then work through the habits and practice cards underneath it.

## Common errors at this level

| Symptom | Real cause | Fix |
|---|---|---|
| The DAG does not appear in the UI | Import error, or no DAG object at module level | `python dags/my_dag.py`, then `airflow dags list-import-errors` |
| The DAG appears but never runs | It is paused, or `start_date` is in the future | Unpause it; check `start_date` |
| Hundreds of runs appeared at once | `catchup=True` with an old `start_date` | Set `catchup=False`; backfill deliberately |
| The `@daily` run for today has not happened | The interval must **end** before the run starts | Correct behaviour: wait until after midnight |
| A rerun produced different data | The task used `datetime.now()` | Use `{{ ds }}` and the interval variables |
| A retry duplicated rows | The task is not idempotent | `DELETE` the target partition, then `INSERT` |
| `{{ ds }}` appears literally in the output | The field is not templated | Check the operator's `template_fields` |
| Airflow feels slow, and new DAGs appear late | Expensive top-level code | Move it inside a task; check **Admin → DAG Processing** |
| `Variable.get()` hammering the database | Called at module level | Move it into a task, or use `{{ var.value.x }}` |
| The whole cluster deadlocks while waiting | Sensors in `poke` mode holding worker slots | `mode="reschedule"` and a `timeout` |
| A sensor waits forever | No `timeout` set | Always set one |
| A task after a branch was skipped silently | Skips propagate; the join needs a trigger rule | `TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS` |
| Cleanup did not run after a failure | Default rule requires all upstreams to succeed | `TriggerRule.ALL_DONE` |
| The UI is slow and XCom pages hang | Large objects pushed to XCom | Write to storage; pass the path |
| `KeyError` pulling an XCom | Wrong `task_ids` or `key` | Check the XCom tab on the producing task |
| Tasks sit in `queued` and never start | Cluster or DAG concurrency limit reached | Check `parallelism` and `max_active_tasks` |
| A hung task blocked everything for hours | No `execution_timeout` | Set one on every task |
| Intervals piled up behind a stuck run | No `dagrun_timeout`, no `max_active_runs` | Set both |
| Two runs corrupted the same table | Overlapping runs | `max_active_runs=1` |
| A credential appeared in a task log | You printed a value you fetched yourself | Never log secrets; use `conn_id`, not the password |
| `ModuleNotFoundError` in a task but not locally | The worker's environment differs from yours | Install the dependency in the image the worker uses |
| Renaming the DAG lost all its history | `dag_id` is the identity | Renaming creates a new DAG; migrate deliberately |
| A change to the DAG file did nothing | The scheduler had not re-parsed yet | Wait 30 seconds; check for an import error |

## The habits that pay off most

<div class="cards">
  <div class="card"><div class="icon">🚫</div><h4>Always <code>catchup=False</code></h4><p>Unless you specifically want history. Then backfill on purpose with a command you can rate-limit.</p></div>
  <div class="card"><div class="icon">📅</div><h4>Use <code>{{ ds }}</code>, never <code>now()</code></h4><p>The whole value of Airflow's interval model is reproducible reruns, and <code>now()</code> throws it away.</p></div>
  <div class="card"><div class="icon">♻️</div><h4>Make every task idempotent</h4><p>Delete the target partition, then write it. Retries and backfills become free rather than dangerous.</p></div>
  <div class="card"><div class="icon">⏱️</div><h4>Set <code>execution_timeout</code> everywhere</h4><p>One hung task with no timeout can hold a worker slot indefinitely and stall the whole DAG.</p></div>
  <div class="card"><div class="icon">🪶</div><h4>Keep the top level empty</h4><p>Only DAG definition and task wiring. Everything else runs every thirty seconds, forever.</p></div>
  <div class="card"><div class="icon">🔑</div><h4>Credentials in Connections</h4><p>Reference a <code>conn_id</code>. Never a password in a DAG file, and never a secret in a log.</p></div>
  <div class="card"><div class="icon">⚡</div><h4><code>airflow tasks test</code> for iteration</h4><p>Foreground, instant, logs in your terminal, no database state. The fastest loop available.</p></div>
  <div class="card"><div class="icon">🏷️</div><h4>Tags, owner, and <code>doc_md</code></h4><p>Free to add, and they are what makes a DAG findable and supportable six months later.</p></div>
</div>

## Practice cards

Short, self-contained exercises. Each takes a few minutes and leaves you with a fact you will not forget.

<ol class="guide-steps">
  <li><b>Watch the interval model</b>Create a <code>@daily</code> DAG with <code>start_date</code> three days ago and <code>catchup=True</code>. Count the runs, then read a log line printing both <code>{{ ds }}</code> and <code>$(date -I)</code>. Seeing them differ is the moment scheduling clicks.</li>
  <li><b>Flood your own cluster</b>Set a two-year-old <code>start_date</code> with <code>catchup=True</code> on a scratch DAG and unpause it. Count the runs, then pause it immediately. Doing this once, deliberately, means never doing it accidentally.</li>
  <li><b>Break idempotence</b>Write a task that <code>INSERT</code>s rows. Clear it and rerun. Watch the row count double. Then rewrite it as delete-then-insert and repeat.</li>
  <li><b>Deadlock a worker pool</b>Create more <code>poke</code>-mode sensors than you have worker slots, all waiting on files that do not exist. Watch real tasks starve. Then switch to <code>reschedule</code>.</li>
  <li><b>Cause the silent skip</b>Build a branch with a join that has the default trigger rule. Watch the join and everything after it get skipped with no error anywhere.</li>
  <li><b>Measure top-level cost</b>Note your parse duration in <strong>Admin → DAG Processing</strong>. Add <code>time.sleep(3)</code> at module level. Watch the number move. Move it inside a task and watch it recover.</li>
  <li><b>Abuse XCom</b>Return <code>list(range(500_000))</code> from a task and observe the run duration and the XCom page. Then pass a file path instead and compare.</li>
  <li><b>Kill a hung task</b>Add a task running <code>sleep 300</code> with <code>execution_timeout=timedelta(seconds=20)</code>. Watch it be killed and read the message.</li>
  <li><b>Tour every state</b>Build one DAG that produces `success`, `failed`, `upstream_failed`, `skipped`, `up_for_retry`, and `up_for_reschedule`. Recognising all six on sight is worth the ten minutes.</li>
</ol>

## Debugging order

Follow this rather than guessing. The first three steps answer most problems.

<ol class="guide-steps">
  <li><b>Does the file import?</b><code>python dags/my_dag.py</code>. Then <code>airflow dags list-import-errors</code>. A DAG that does not appear is almost always this.</li>
  <li><b>Read the task log</b>Click the failed task, then <strong>Logs</strong>. Scroll to the <em>top</em> of the traceback rather than the bottom. The last line is usually a wrapper, not the cause.</li>
  <li><b>Check the rendered template</b>The <strong>Rendered Template</strong> tab shows what your field became. Half of "my SQL is wrong" is a template that resolved differently than expected.</li>
  <li><b>Run the task by hand</b><code>airflow tasks test my_dag my_task 2024-05-01</code>. Foreground, instant, no state written. If it fails here too, you are debugging your code and not Airflow.</li>
  <li><b>Check the state, not just the colour</b><code>queued</code> means a capacity problem, <code>upstream_failed</code> means look upstream, <code>skipped</code> means a branch or trigger rule. Each points somewhere different.</li>
  <li><b>Check the DAG's own health</b><strong>Admin → DAG Processing</strong> for parse time, and the <strong>Code</strong> view to confirm the scheduler is running the file you think it is.</li>
</ol>

```bash
python dags/my_dag.py                          # import check
airflow dags list-import-errors
airflow tasks test my_dag my_task 2024-05-01   # instant, no DB state
airflow dags test my_dag 2024-05-01            # a whole run, locally
airflow tasks list my_dag --tree               # the structure Airflow sees
airflow dags report                            # parse duration per file
```

<div class="callout tip">
  <span class="ct">Read tracebacks from the top</span>
  Airflow wraps task execution in several layers, so the last lines of a failure are usually Airflow's own frames. The cause is higher up, in your code. Scrolling up is a habit that saves a lot of time.
</div>

## The interval model, in practice

This is where most beginner time is lost, so start with these three questions.

**"Why has today's run not happened?"** Because the interval has not ended. A `@daily` DAG produces the run for 1 May just after midnight on 2 May.

**"Which date should my task use?"** `{{ ds }}`, the logical date, which is the start of the interval. Never the wall clock.

**"How do I run yesterday again?"** Clear that task instance. It will rerun with the original `{{ ds }}`, which is why idempotence matters.

| You want | Use |
|---|---|
| The interval's date | `{{ ds }}` → `2024-05-01` |
| The same, no dashes | `{{ ds_nodash }}` → `20240501` |
| The interval bounds | `{{ data_interval_start }}` / `{{ data_interval_end }}` |
| Seven days back | `{{ macros.ds_add(ds, -7) }}` |
| A different format | `{{ macros.ds_format(ds, "%Y-%m-%d", "%d/%m/%Y") }}` |
| The run's identity | `{{ dag_run.run_id }}` |

<div class="callout warn">
  <span class="ct"><code>datetime.now()</code> in a task is a reproducibility bug</span>
  It will produce correct-looking results today and wrong ones on every rerun and every backfill. The failure is silent: no error, just data for the wrong window written into the right partition. Grep your DAGs for <code>now()</code> and <code>today()</code>; each occurrence is either a deliberate exception or a bug.
</div>

## Idempotence, concretely

"Safe to run twice" is easy to say and easy to get wrong. Three patterns cover almost everything.

```sql delete-then-insert (the default choice)
DELETE FROM daily_stats WHERE day = '{{ ds }}';
INSERT INTO daily_stats SELECT '{{ ds }}', count(*) FROM events
WHERE event_date = '{{ ds }}';
```

```sql merge / upsert: when you cannot delete
MERGE INTO daily_stats t
USING (SELECT '{{ ds }}' AS day, count(*) AS n FROM events
       WHERE event_date = '{{ ds }}') s
ON t.day = s.day
WHEN MATCHED THEN UPDATE SET events = s.n
WHEN NOT MATCHED THEN INSERT (day, events) VALUES (s.day, s.n);
```

```python overwrite a partition (for files)
@task
def write_partition():
    path = "s3://analytics/events/dt={{ ds }}/"
    # write mode "overwrite" on the partition, not "append"
    df.write.mode("overwrite").parquet(path)
```

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Safe to retry</h4>
    <ul>
      <li><code>DELETE</code> the partition, then <code>INSERT</code></li>
      <li><code>MERGE</code> / upsert on a key</li>
      <li>Overwrite a partition path</li>
      <li><code>CREATE OR REPLACE</code></li>
      <li>Writing to a path derived from <code>{{ ds }}</code></li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Dangerous to retry</h4>
    <ul>
      <li>Bare <code>INSERT</code>: duplicates on retry</li>
      <li><code>UPDATE … SET n = n + 1</code>: accumulates</li>
      <li>Appending to a file</li>
      <li>Sending an email or a webhook</li>
      <li>Writing to a path derived from <code>now()</code></li>
    </ul>
  </div>
</div>

For non-idempotent side effects (sending a notification, charging a card) the pattern is to make the *decision* idempotent: record in a table that the notification for `{{ ds }}` was sent, and check that before sending.

## Structuring a DAG that ages well

```python dags/pipeline.py
from datetime import datetime, timedelta
from airflow.decorators import dag, task

DEFAULTS = {
    "owner": "data-platform",
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
    "execution_timeout": timedelta(minutes=30),
}

@dag(
    dag_id="pipeline",
    start_date=datetime(2024, 1, 1),
    schedule="0 2 * * *",
    catchup=False,
    default_args=DEFAULTS,
    dagrun_timeout=timedelta(hours=2),
    max_active_runs=1,
    tags=["production", "events"],
    doc_md="""
    ### Events pipeline
    **Owner:** data-platform · **Consumers:** exec dashboard
    **On failure:** idempotent — safe to clear and rerun.
    **Escalate if:** not green by 07:00 UTC.
    """,
)
def pipeline():
    ...
pipeline()
```

| Rule | Why |
|---|---|
| One responsibility per task | A change reruns the minimum, and failures are precise |
| Business logic in a plain function, called by the task | It becomes unit-testable without Airflow |
| SQL in `.sql` files, not Python strings | Reviewable, syntax-highlighted, and templated automatically |
| Task ids as verbs: `extract`, `validate`, `load` | The Graph view reads as a sentence |
| `default_args` for the common case, overrides per task | Readable, and consistent by default |
| `doc_md` with owner, consumers, and escalation | The runbook is where the on-call person already is |

<div class="callout tip">
  <span class="ct">Keep the DAG file thin</span>
  A DAG file should read as a description of the workflow, not as the implementation of it. Put the logic in a module the DAG imports, and import it inside the task, so it does not cost you parse time.
</div>

## Local development

```bash
# Get an Airflow you can break
curl -LfO 'https://airflow.apache.org/docs/apache-airflow/stable/docker-compose.yaml'
mkdir -p dags logs plugins config
echo -e "AIRFLOW_UID=$(id -u)" > .env
docker compose up airflow-init && docker compose up -d

# The fast loop — no UI needed
airflow tasks test my_dag my_task 2024-05-01
airflow dags test my_dag 2024-05-01

# Before you commit
python dags/my_dag.py
airflow dags list-import-errors
```

| Habit | Payoff |
|---|---|
| `airflow tasks test` over the UI | Seconds instead of a minute, and logs in your terminal |
| `python dags/my_dag.py` before committing | Catches the most common breakage instantly |
| A scratch DAG with `schedule=None` | Trigger it on demand while experimenting |
| `tags=["dev"]` on experiments | Filter them out of the production view |
| Small `retries` while developing | You do not want three retries of a broken task |

<div class="callout warn">
  <span class="ct">Your local environment is not the worker's environment</span>
  A task that imports a library you have locally will fail on a worker that does not. When a task raises <code>ModuleNotFoundError</code> in Airflow but not in your shell, that is the cause. The fix is adding the dependency to the image the workers run, not to your laptop.
</div>

## Small things worth doing from day one

**Set `tags` on every DAG.** The UI filter is the only thing that makes fifty DAGs navigable.

**Put the owner in `default_args`.** It shows in the UI and answers "who do I ask?" without a search.

**Write `doc_md`.** Even three lines. It renders in the UI where the on-call person is already looking.

**Prefer `EmptyOperator` bookends.** A `start` and `end` task make the Graph view readable and give you a stable place to attach new work.

**Never rename a `dag_id` casually.** It is the identity: renaming abandons all history and creates a new DAG with none.

**Grep for `now()` before every review.** Each occurrence is a reproducibility bug or a deliberate exception, and there is no third option.

**Check `dvc`-style: does a second run change anything?** Run your pipeline twice on the same interval and diff the output. If it differs, the task is not idempotent.

```python
# A starter default_args worth copying
DEFAULTS = {
    "owner": "your-team",
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
    "retry_exponential_backoff": True,
    "max_retry_delay": timedelta(minutes=30),
    "execution_timeout": timedelta(minutes=30),
}
```

## A starter DAG worth keeping

Every line here is something from this page.

```python dags/starter.py
"""
### Starter pipeline
**Owner:** your-team · **Consumers:** nobody yet
**On failure:** idempotent — safe to clear and rerun any interval.
"""
from datetime import datetime, timedelta

from airflow.decorators import dag, task
from airflow.operators.empty import EmptyOperator
from airflow.providers.common.sql.operators.sql import SQLExecuteQueryOperator
from airflow.sensors.filesystem import FileSensor
from airflow.utils.trigger_rule import TriggerRule

DEFAULTS = {
    "owner": "your-team",
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
    "retry_exponential_backoff": True,
    "execution_timeout": timedelta(minutes=30),   # no task hangs forever
}

@dag(
    dag_id="starter",
    start_date=datetime(2024, 1, 1),
    schedule="0 2 * * *",
    catchup=False,                     # backfill deliberately, never by accident
    default_args=DEFAULTS,
    dagrun_timeout=timedelta(hours=2), # the whole run has a ceiling
    max_active_runs=1,                 # one writer per table
    tags=["starter", "dev"],
    doc_md=__doc__,                    # the runbook, in the UI
)
def starter():

    start = EmptyOperator(task_id="start")

    wait = FileSensor(
        task_id="wait_for_input",
        filepath="/data/landing/events_{{ ds_nodash }}.csv",
        poke_interval=60,
        timeout=60 * 60 * 2,           # never wait forever
        mode="reschedule",             # release the worker slot while waiting
    )

    @task
    def validate() -> int:
        """Logic lives in a module; the task just calls it."""
        from mypkg.checks import count_rows          # imported inside the task
        count = count_rows(day="{{ ds }}")
        if count == 0:
            raise ValueError("no rows for {{ ds }}")
        return count                                 # a number through XCom

    # Idempotent: DELETE the partition, then INSERT. SQL in a file.
    transform = SQLExecuteQueryOperator(
        task_id="transform",
        conn_id="warehouse",           # a Connection, never a password
        sql="sql/daily_rollup.sql",
    )

    cleanup = EmptyOperator(
        task_id="cleanup",
        trigger_rule=TriggerRule.ALL_DONE,   # runs whatever happened upstream
    )
    end = EmptyOperator(task_id="end")

    start >> wait >> validate() >> transform >> cleanup >> end

starter()
```

```sql sql/daily_rollup.sql
-- Safe to retry, safe to backfill.
DELETE FROM analytics.daily_events WHERE day = '{{ ds }}';
INSERT INTO analytics.daily_events (day, events)
SELECT '{{ ds }}', count(*) FROM staging.events WHERE event_date = '{{ ds }}';
```

Nine details in there are the whole lesson of this page: `catchup=False`, `{{ ds }}` rather than `now()`, idempotent delete-then-insert SQL in a file, `retries` with backoff, `execution_timeout` per task and `dagrun_timeout` per run, `max_active_runs=1`, a sensor in `reschedule` mode with a timeout, `ALL_DONE` on cleanup, and a heavy import moved inside the task.

**Mid-level tips go deeper on every one of these:** executors and the concurrency limit that binds, dynamic mapping pitfalls, deferrable operators replacing sensors, pools for shared systems, alerting people read, testing DAGs in CI, and diagnosing "it works locally but not on the cluster".

