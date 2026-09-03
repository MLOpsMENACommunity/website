Part two of three. At this level your DAGs run and your schedules are correct, so the problems change character. They are no longer "why did nothing happen" but "why is the scheduler slow", "why do twenty tasks sit in queued", and "why does this work on my laptop and not on the cluster". Start with the error table, then the practices and practice cards underneath it.

## Common errors at this level

Cumulative — Beginner's errors still apply, and these are the ones that appear once things basically work.

| Symptom | Real cause | Fix |
|---|---|---|
| Tasks sit in `queued` and nothing starts | A concurrency limit, or a queue no worker consumes | Check `parallelism`, `max_active_tasks`, pools, then `queue` |
| One DAG is slow while others are fine | That DAG's `max_active_tasks` | Raise it, or split the work |
| Everything is slow across all DAGs | Cluster `parallelism`, or the database | Check both; the database is more likely |
| New DAGs take minutes to appear | Parse time, or `min_file_process_interval` | Fix top-level code; check **DAG Processing** |
| The scheduler CPU is pinned | A pathological DAG file | `airflow dags report`; `.airflowignore` while you fix it |
| `expand` created 400 tasks instead of 20 | Two `expand` arguments are a **cross product** | `expand_kwargs` with a list of dicts |
| A mapped task fails with `max_map_length` | More elements than the configured cap | Batch the items, or raise the limit deliberately |
| Ten thousand mapped tasks crawled | Per-item overhead dominates the work | Batch instead of mapping |
| Deferred tasks hang forever | The triggerer is not running | Start it; treat it as a required component |
| A deferrable operator blocks other waits | A blocking call inside an async trigger | Triggers must be genuinely async |
| A dataset-scheduled DAG never fires | The URIs do not match exactly | They are unvalidated strings — compare character by character |
| Two DAGs look connected and are not | Different dataset URIs for the same table | Adopt a naming convention and enforce it |
| The DAG factory made the scheduler slow | It queries a database or an API at parse time | Read a local file; sync the config on a schedule |
| A `foreach` stage cannot be targeted | Generated ids use `@` | `dvc`-style quoting: `airflow tasks test dag 'group.task'` |
| A pool has free slots but tasks wait | They are queued behind a different limit | Check the cluster and DAG limits too |
| A pool is exhausted by one task | It requested several `pool_slots` | Intended behaviour — check the value |
| Alerts fired five times for one failure | A callback on retries rather than final failure | `on_failure_callback` fires after retries; check what you attached |
| Nobody reads the alert channel | Alerting on every task in every DAG | Alert on DAG-run failure and consumer-facing SLA misses only |
| An SLA miss did not stop anything | SLAs never stop anything | Use `execution_timeout` for a hard stop |
| `{{ ds }}` is literal in a custom operator | The field is not in `template_fields` | Add it |
| A data-quality failure burned three retries | It raised a normal exception | `AirflowFailException` skips remaining retries |
| A `conf` key typo failed mid-run | `dag_run.conf` is untyped | Use `params` with types and bounds |
| Works locally, fails on the cluster | Different environment or credentials | Compare installed packages; check the `conn_id` resolves |
| The metadata database is growing fast | Large XCom values, or no retention | Pass paths; schedule `db clean` |
| CI passed but the DAG broke production | No DagBag integrity test | Add it — seconds, no database, catches import errors |
| A teardown failure turned the run red | It was an `ALL_DONE` cleanup, not a teardown | Use setup/teardown so teardown failure does not fail the run |

## The practices that pay off most

<div class="cards">
  <div class="card"><div class="icon">⏸️</div><h4>Defer, never poke</h4><p><code>deferrable=True</code> on anything that waits. Zero worker slots held, and it scales to tens of thousands.</p></div>
  <div class="card"><div class="icon">🚧</div><h4>A pool per external system</h4><p>Sized from the thing it protects — a connection limit, an API rate limit, a GPU count.</p></div>
  <div class="card"><div class="icon">📡</div><h4>Datasets over sensors</h4><p>A consumer scheduled by data costs nothing while waiting and couples only on a URI.</p></div>
  <div class="card"><div class="icon">🧪</div><h4>A DagBag test in CI</h4><p>Seconds, no database, and it asserts your own standards. The highest-value test available.</p></div>
  <div class="card"><div class="icon">📏</div><h4>A parse-time budget</h4><p>Assert it in CI. Scheduler degradation creeps in one careless import at a time.</p></div>
  <div class="card"><div class="icon">🔔</div><h4>Alert on runs, not tasks</h4><p>DAG-run failure plus consumer-facing SLA misses. Include <code>ti.log_url</code> so it is actionable.</p></div>
  <div class="card"><div class="icon">🧱</div><h4>A shared operator library</h4><p>When a pattern appears the third time. A one-line quality gate gets adopted; forty lines does not.</p></div>
  <div class="card"><div class="icon">📊</div><h4>Watch three metrics</h4><p>Parse time, starving tasks, and scheduler loop duration. All three predict trouble before users see it.</p></div>
</div>

## Practice cards

<ol class="guide-steps">
  <li><b>Find which limit binds</b>Launch twenty parallel <code>sleep 30</code> tasks and count how many run. Then lower <code>max_active_tasks</code> to three and repeat. Knowing your own ceiling turns "stuck in queued" into a five-minute diagnosis.</li>
  <li><b>Queue something forever</b>Give a task <code>queue="does-not-exist"</code> and watch it sit in <code>queued</code> with no error anywhere. This is the hardest concurrency problem to diagnose without having seen it.</li>
  <li><b>Meet the cross product</b>Run <code>expand(a=[1,2,3], b=[4,5,6])</code> and count the instances. Nine, not three. Then fix it with <code>expand_kwargs</code>.</li>
  <li><b>Prove deferral is free</b>Run twenty deferrable waits and confirm zero worker slots are busy. Then run twenty <code>poke</code> sensors and watch the pool saturate.</li>
  <li><b>Break the triggerer</b>Stop it while deferred tasks are waiting. Confirm they hang indefinitely and nothing alerts.</li>
  <li><b>Wire a dataset</b>Build a producer and a consumer, trigger the producer manually, and watch the consumer start by itself. Then change one character of the URI and watch it stop working.</li>
  <li><b>Cap a shared resource</b>Create a two-slot pool, queue six tasks into it, and confirm only two run regardless of cluster capacity. Then set `priority_weight` on two and watch the order change.</li>
  <li><b>Make CI catch a real bug</b>Add the DagBag integrity test with assertions about retries and timeouts. Run it against your existing DAGs — it will fail on at least one.</li>
  <li><b>Measure a parse-time regression</b>Add a top-level import of pandas to one DAG and watch <strong>DAG Processing</strong>. Then add the budget assertion to CI and confirm it fails.</li>
</ol>

## Diagnosing "stuck in queued"

This is the most common mid-level problem and it has exactly five causes. Check them in this order.

<ol class="guide-steps">
  <li><b>Cluster <code>parallelism</code></b><code>airflow config get-value core parallelism</code>. If every DAG's tasks are queued, this is the first suspect.</li>
  <li><b>The DAG's <code>max_active_tasks</code></b>If one DAG is slow and others are fine, it is this. Visible on the DAG's details page.</li>
  <li><b>Pool slots</b><code>airflow pools list</code> shows used against total. A full pool queues only its own tasks, which is a useful signal.</li>
  <li><b>Worker capacity</b>Are workers running, and are they saturated? On Celery, check <code>worker_concurrency</code> and the actual replica count.</li>
  <li><b>Queue routing</b>Does the task name a <code>queue</code> that no running worker consumes? This looks identical to capacity exhaustion and adding workers does not fix it.</li>
</ol>

```bash
airflow config get-value core parallelism
airflow pools list
airflow celery inspect active_queues          # which queues are consumed
airflow tasks states-for-dag-run my_dag <run_id>
```

<div class="callout warn">
  <span class="ct">The queue-routing case is the one that wastes an afternoon</span>
  A task assigned to a queue no worker listens on stays <code>queued</code> forever with no error, no log, and no alert. It is indistinguishable from a capacity problem in the UI. If the obvious limits all have headroom, check the queue name against your running workers' configuration.
</div>

## Keeping the scheduler fast

Three measurements, and the fixes that follow from them.

```bash
airflow dags report                    # parse duration per file — start here
airflow dags list-import-errors        # a broken DAG right now
```

| Symptom | Cause | Fix |
|---|---|---|
| One file dominates `dags report` | Top-level work in that file | Move it into tasks |
| All files creep upward | A shared module doing work on import | Import inside tasks |
| Parse time fine, DAGs still slow to appear | `min_file_process_interval` | Raise it to 60–120s |
| Scheduler CPU pinned with few DAGs | A file exceeding `dag_file_processor_timeout` | Find it, `.airflowignore` it, fix it |

```text .airflowignore
# Same syntax as .gitignore — excluded from parsing entirely
experiments/
_scratch.py
```

```python scripts/assert_parse_time.py
from airflow.models import DagBag
import sys

bag = DagBag("dags/", include_examples=False)
slow = [s for s in bag.dagbag_stats if s.duration.total_seconds() > 2]
if slow:
    print("Slow-parsing files:", [(s.file, s.duration) for s in slow])
    sys.exit(1)
```

<div class="callout tip">
  <span class="ct">Raising <code>min_file_process_interval</code> is the cheapest win available</span>
  The default re-parses every file every thirty seconds. At sixty or a hundred and twenty seconds new DAGs appear a minute later — almost never a problem — and the scheduler does a fraction of the work. It is one line and it is usually the first thing to change on a busy deployment.
</div>

## Alerting people actually read

```python
def alert(context):
    ti = context["task_instance"]
    post_to_slack(
        channel="#data-alerts",
        text=(
            f":red_circle: *{ti.dag_id}.{ti.task_id}* failed\n"
            f"Logical date: {context['ds']} · try {ti.try_number}/{ti.max_tries + 1}\n"
            f"<{ti.log_url}|Logs>"
        ),
    )
```

| Rule | Why |
|---|---|
| Alert on **DAG-run** failure, not every task | One incident should be one message |
| Always include `ti.log_url` | An alert you cannot act on from your phone is deferred to tomorrow |
| Reserve SLA alerts for consumer-facing pipelines | Otherwise the channel becomes noise |
| Route the rest to a dashboard | Not every failure needs a human immediately |
| Put the runbook in `doc_md` | The on-call person is already in the UI |
| Alert on **scheduler heartbeat** too | A dead scheduler produces silence, not failures |

<div class="callout warn">
  <span class="ct">A channel nobody reads is worse than no alerting</span>
  Alerting on every task in every DAG trains the team to ignore the channel, and then a real incident is missed. Fewer, better alerts — DAG-run failures and SLA misses on pipelines with real consumers — beats completeness every time.
</div>

## Testing that catches real breakage

```python tests/test_dag_integrity.py
import pytest
from airflow.models import DagBag

@pytest.fixture(scope="session")
def dagbag():
    return DagBag(dag_folder="dags/", include_examples=False)

def test_no_import_errors(dagbag):
    assert not dagbag.import_errors, dagbag.import_errors

def test_standards(dagbag):
    for dag_id, dag in dagbag.dags.items():
        assert dag.tags, f"{dag_id}: no tags"
        assert dag.catchup is False, f"{dag_id}: catchup enabled"
        assert dag.dagrun_timeout, f"{dag_id}: no dagrun_timeout"
        assert dag.doc_md, f"{dag_id}: no documentation"
        assert dag.default_args.get("retries", 0) >= 1, f"{dag_id}: no retries"
        for task in dag.tasks:
            assert task.execution_timeout, f"{dag_id}.{task.task_id}: no timeout"

def test_no_cycles(dagbag):
    for dag in dagbag.dags.values():
        dag.test_cycle()
```

| Layer | Catches | Needs a database | Runtime |
|---|---|---|---|
| DagBag integrity | Import errors, cycles, missing standards | No | Seconds |
| Unit tests on extracted logic | Logic bugs | No | Seconds |
| `dag.test()` | End-to-end behaviour | Yes | Minutes |

<div class="callout tip">
  <span class="ct">Assert your conventions, do not document them</span>
  A convention in a wiki is advisory. The same convention asserted in a test that blocks the pull request is a convention. The metadata assertions above will fail on real DAGs the first time you run them, which is exactly the point.
</div>

## "Works locally, fails on the cluster"

Five differences, roughly in the order they are the answer.

| Difference | How to confirm |
|---|---|
| Missing dependency on the worker | `ModuleNotFoundError` in the task log but not your shell |
| A different `conn_id` or missing connection | `airflow connections get <id>` on the cluster |
| A path that only exists locally | The task reads `/Users/...` or a relative path |
| Top-level code that worked locally at low scale | `airflow dags report` on the cluster |
| Resource limits — memory, timeout, pool | Exit reason in the log; check `execution_timeout` |

```bash
# On the cluster, not your laptop
airflow info
airflow connections get warehouse
airflow providers list
airflow tasks test my_dag my_task 2024-05-01   # run it where it fails
```

<div class="callout warn">
  <span class="ct">Run the failing task where it fails</span>
  <code>airflow tasks test</code> executed inside the worker's own environment — the container, the pod, the host — resolves the majority of these in one command. Debugging from your laptop reproduces your laptop's environment, which is precisely the thing that is not the problem.
</div>

## Habits worth adopting now

**Convert every sensor to `deferrable=True`.** It is usually a one-word change and it is the single largest capacity and cost win available.

**Put a pool in front of every shared system.** Sized from the resource's real limit, with the reason in the pool description.

**Prefer datasets to `ExternalTaskSensor`.** Nothing is held while waiting, and neither DAG needs to know the other's schedule.

**Batch before you map.** Mapping is for substantial, independently retryable items. Ten thousand two-second tasks is a scheduler problem, not a parallelism win.

**Assert the parse-time budget in CI.** Degradation arrives one import at a time and is invisible until it is severe.

**Extract logic out of operators.** A plain function is unit-testable; an operator's `execute` is not.

**Schedule `db clean`.** The metadata database is the most common scaling ceiling and retention is the fix.

```python
# A mid-level default_args worth copying
DEFAULTS = {
    "owner": "your-team",
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
    "retry_exponential_backoff": True,
    "max_retry_delay": timedelta(minutes=30),
    "execution_timeout": timedelta(minutes=30),
    "on_failure_callback": alert,          # actionable, with a log link
    "sla": timedelta(hours=2),             # records a miss; does not stop anything
}
```

**Senior tips go further:** the hardening pass every deployment should get, verifying controls rather than trusting them, cost governance, incident playbooks for a stuck scheduler and a backfill that took production down, running Airflow as a platform, and where Airflow stops.
