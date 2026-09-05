Part three of three. The problems at this level are rarely about a DAG. They are about a scheduler sixty people depend on, a metadata database nobody has cleaned in two years, a credential in a log, and a backfill that took production down. Start with the error table, then the practices, verification, and playbooks underneath it.

## Common errors at this level

Cumulative. Everything from Beginner and Mid still applies. These cause incidents rather than failed tasks.

| Symptom | Real cause | Fix |
|---|---|---|
| Nothing has run for hours and nothing failed | The scheduler is dead: silence, not alerts | `airflow jobs check`; add heartbeat alerting today |
| A contributor's DAG read another team's credentials | A DAG file is arbitrary Python; RBAC does not isolate it | Secrets backend with per-team scoping; review-gated deploys |
| A credential appeared in a task log | A value fetched manually and printed | Rotate; add the key to `sensitive_var_conn_names`; CI grep |
| A DAG deployed straight to production and broke it | Git-sync from an ungated branch | Required integrity check on the followed branch |
| Everything is slow and the UI times out | The metadata database, almost always | `db clean`; then PgBouncer; resize last |
| The upgrade migration ran for three hours | A huge `task_instance` table | `db clean` before upgrading; rehearse on a snapshot |
| The upgrade could not be rolled back | There is no downgrade for `db migrate` | A tested backup, taken and verified beforehand |
| A backfill starved every other team | No pool, no `max_active_runs`, default priority | A backfill pool, low priority, outside business hours |
| One team's DAG made the scheduler slow for everyone | No parse-time budget enforced | Assert it in CI; `.airflowignore` while fixing |
| Worker utilisation is under 15% | Sized for the 2am peak, paid for all day | Autoscale on queue depth; defer waits |
| The bill grew with no new pipelines | Sensors in `poke` mode on expensive workers | `deferrable=True` everywhere |
| Tasks queued forever with no error | A `queue` no running worker consumes | Compare task queues against worker configuration |
| The secrets backend went down and everything failed | It is on the hot path of every task | Monitor its latency; never less available than Airflow |
| A team could trigger another team's production DAG | No per-DAG access control | `access_control` on the DAG, or per-DAG roles |
| Two teams that must not see each other share one Airflow | A DAG file cannot be sandboxed | Separate deployments |
| Scheduler restarts lost in-flight work | Single scheduler, no HA | Multiple active-active schedulers with row-level locking |
| The DAG folder is writable by many people | It is administrative access | Deploy through a pipeline, not a shared drive |
| A retention job deleted data someone needed | `db clean` cutoff too aggressive | Dry-run first; agree the retention window in writing |
| Orphaned XCom objects in object storage | A custom backend; `db clean` only removes rows | A bucket lifecycle rule on the XCom prefix |
| Nobody knows who owns a failing DAG | No owner, no tags, no `doc_md` | Assert all three in CI |
| A "migrate off Airflow" proposal | Usually the practices, not the tool | Fix top-level code, sensors, and retention first |

## The practices that pay off most

<div class="cards">
  <div class="card"><div class="icon">💓</div><h4>Alert on scheduler heartbeat</h4><p>The one alert every deployment needs. A dead scheduler produces silence, not failures.</p></div>
  <div class="card"><div class="icon">🔐</div><h4>Secrets in a backend</h4><p>Rotation, per-team scoping by path and IAM, and an audit trail the metadata database cannot give you.</p></div>
  <div class="card"><div class="icon">🚪</div><h4>Deploy through a gate</h4><p>DAG-folder write access is administrative access. Everything goes through review and CI.</p></div>
  <div class="card"><div class="icon">🧹</div><h4>Schedule <code>db clean</code></h4><p>The database is almost always the real ceiling, and retention is the fix rather than a bigger instance.</p></div>
  <div class="card"><div class="icon">🧯</div><h4>A constrained backfill pool</h4><p>Low priority, few slots, outside business hours. Backfills should never be an incident for other teams.</p></div>
  <div class="card"><div class="icon">📉</div><h4>Publish worker utilisation</h4><p>Task-seconds over paid worker-seconds. Usually embarrassing, and it is what drives the autoscaling case.</p></div>
  <div class="card"><div class="icon">🧪</div><h4>Verify controls refuse things</h4><p>Try to trigger a DAG you should not, delete a connection the backend provides, assume a role from a wrong branch.</p></div>
  <div class="card"><div class="icon">📜</div><h4>A written ownership split</h4><p>Punctuality is the platform's. Correctness is the DAG owner's. Without that, you are on call for every data bug.</p></div>
</div>

## Practice cards

<ol class="guide-steps">
  <li><b>Kill the scheduler and time your detection</b>Stop it in a test environment and measure how long until monitoring tells you, rather than you noticing. Most deployments are silent.</li>
  <li><b>Prove a DAG can read anything</b>Write a DAG under one team's ownership that reads a connection belonging to another. It works, and that result is the whole argument for a secrets backend.</li>
  <li><b>Check the masking gap</b>Print a connection password directly, then fetch the same secret into a variable with an innocuous name and print that. Compare what the log masks.</li>
  <li><b>Time a real migration</b>Restore a production snapshot into a scratch instance and run <code>airflow db migrate</code> against it. That number is your maintenance window.</li>
  <li><b>Measure what <code>db clean</code> would remove</b>Dry-run a ninety-day cutoff and read the row counts. It is usually enough to schedule the real thing immediately.</li>
  <li><b>Calculate worker utilisation</b>Total task duration last week divided by total worker uptime paid for. Put the number somewhere visible.</li>
  <li><b>Cause the queue-routing hang</b>Give a task a queue no worker consumes and practise diagnosing it from the UI alone. It is the hardest of these to recognise cold.</li>
  <li><b>Reproduce a historical run</b>Clear an interval from three months ago and confirm the output is identical rather than duplicated. If it is not, idempotence is broken somewhere.</li>
  <li><b>Run the checklist on someone else's DAG</b>The review checklist below, against a pipeline you did not write. It will find something.</li>
</ol>

## The hardening pass every deployment should get

```ini airflow.cfg
[core]
executor = CeleryKubernetesExecutor
parallelism = 128
max_active_tasks_per_dag = 16
hide_sensitive_var_conn_fields = True
sensitive_var_conn_names = api_token, private_key, client_secret

[secrets]
backend = airflow.providers.hashicorp.secrets.vault.VaultBackend
# Credentials never live in the metadata database.

[scheduler]
parsing_processes = 4
min_file_process_interval = 120        # the cheapest parsing win there is
dag_file_processor_timeout = 60        # a pathological file cannot block forever
use_row_level_locking = True           # multiple active-active schedulers

[database]
sql_alchemy_pool_size = 10
sql_alchemy_max_overflow = 20
sql_alchemy_pool_recycle = 1800

[metrics]
statsd_on = True                       # loop duration, starving tasks, parse time

[webserver]
rbac = True
expose_config = False                  # do not show config in the UI
```

```python
@dag(
    ...,
    # Only this team may trigger or edit; others may look.
    access_control={
        "team_data_platform": {"can_read", "can_edit"},
        "Viewer": {"can_read"},
    },
)
```

| Control | Prevents |
|---|---|
| Secrets backend | Credentials readable by any DAG, and rotation as a project |
| `hide_sensitive_var_conn_fields` + name list | The most common Airflow security incident |
| `expose_config = False` | Configuration disclosure through the UI |
| Per-DAG `access_control` | One team triggering another's production pipeline |
| `dag_file_processor_timeout` | One bad file blocking a processor slot indefinitely |
| `use_row_level_locking` + multiple schedulers | A single point of failure |
| `db clean` on a schedule | The database becoming the ceiling |
| Deploy through CI | A broken or malicious DAG reaching production |

<div class="callout warn">
  <span class="ct">Three things to audit today</span>
  Who can write to the DAG folder. That list is your administrative access list. Whether any credential is readable by every DAG. Whether anything alerts when the scheduler stops. Those three answers define your blast radius, and most deployments get at least one of them wrong.
</div>

## Verifying, not assuming

```bash
# Is the scheduler alive, and how stale is its heartbeat?
airflow jobs check --job-type SchedulerJob --allow-multiple

# Does the secrets backend actually serve this connection?
airflow connections get warehouse          # then delete it from the UI and retry

# What would retention remove?
airflow db clean --dry-run --clean-before-timestamp $(date -d '90 days ago' -I)

# Which files are pathological?
airflow dags report | sort -k3 -h | tail -10
airflow dags list-import-errors

# Are pools doing anything?
airflow pools list

# Which queues are actually consumed?
airflow celery inspect active_queues

# Does log masking work for the value you care about?
airflow tasks test my_dag print_secret 2024-05-01 | grep -i token
```

<div class="callout warn">
  <span class="ct">Test that the control refuses something</span>
  Log in as a restricted user and try to trigger a DAG you should not be able to. Delete a connection from the UI and confirm the DAG still works because the backend serves it. Assume your CI role from a throwaway branch and confirm the refusal. A control you have never watched block anything is decoration.
</div>

Automate the mechanical checks so they do not depend on anyone remembering:

```yaml .github/workflows/airflow-checks.yml
- name: No import errors, and standards enforced
  run: pytest tests/test_dag_integrity.py -v

- name: Parse-time budget
  run: python scripts/assert_parse_time.py --max-seconds 2

- name: No secrets printed in DAG code
  run: |
    grep -rnE 'print\(.*(password|token|secret)' dags/ \
      && { echo "::error::secret printed in DAG code"; exit 1; } || true

- name: No top-level Variable.get or database calls
  run: python scripts/assert_no_toplevel_io.py dags/
```

## Cost governance

| Lever | Effect | Note |
|---|---|---|
| `deferrable=True` on everything that waits | Frees worker slots entirely | The largest single win in most deployments |
| Autoscale on queue depth | Removes overnight idle capacity | KEDA on Celery, or scale-to-zero on Kubernetes |
| Right executor per workload | Pod startup versus idle workers | Route by queue with `CeleryKubernetesExecutor` |
| `db clean` and log lifecycle rules | Bounded storage and a fast database | Both grow silently |
| Batch instead of mapping tiny items | Fewer schedules, rows, and pods | Map substantial items only |
| Right-size task resources | Stops one big task forcing big workers everywhere | Per-task resources on Kubernetes |

```yaml KEDA scaler on queue depth
triggers:
  - type: postgresql
    metadata:
      query: >-
        SELECT ceil(count(*)::decimal / 16) FROM task_instance
        WHERE state = 'queued'
      targetQueryValue: "1"
```

<div class="callout tip">
  <span class="ct">Publish worker utilisation and the peak-to-trough ratio</span>
  Utilisation tells you how much you are wasting; the peak-to-trough concurrency ratio tells you how much autoscaling would recover. Both are easy to compute from the metadata database and both are usually startling. A team that can see the numbers fixes them; a team that cannot keeps adding workers.
</div>

## Incident playbooks

### The scheduler has stopped scheduling

Nothing is failing. Nothing is *running*, which is why no alert fired. Confirm with `airflow jobs check --job-type SchedulerJob`.

Then the four causes in order of likelihood: is the process alive; can it reach the metadata database; is one DAG file exceeding `dag_file_processor_timeout` and blocking a processor slot; is the database connection pool exhausted. `airflow dags report` names a pathological file immediately, and `.airflowignore` gets it out of the way while you fix it. Afterwards: heartbeat alerting, if you did not already have it.

### Tasks are stuck in `queued`

Always capacity or routing. Check cluster `parallelism`, then the DAG's `max_active_tasks`, then pool slots with `airflow pools list`, then whether the tasks name a `queue` no running worker consumes. That last case is indistinguishable from capacity exhaustion in the UI and is not fixed by adding workers. Check `airflow celery inspect active_queues` against the task's queue.

### The metadata database is degrading

The UI times out, the scheduler loop lengthens, everything is slow. Check size and the row counts of `task_instance`, `log`, and `xcom`, then the connection count against the server limit. The immediate action is `db clean` with a conservative cutoff. The durable fixes are scheduled retention, PgBouncer in front of Postgres when you have hundreds of Airflow connections, and moving large XCom values out. Resist resizing first. It buys weeks and hides the cause.

### A backfill took production down

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>0m</span><strong>Stop it</strong><small>Pause the DAG, then clear the queued backfill instances so they stop competing for slots.</small></div>
  <div class="guide-timeline-item"><span>2m</span><strong>Confirm recovery</strong><small>Watch queue depth drain and normal pipelines resume before doing anything else.</small></div>
  <div class="guide-timeline-item"><span>5m</span><strong>Find what it exhausted</strong><small>Worker slots, a pool, database connections, or the downstream warehouse.</small></div>
  <div class="guide-timeline-item"><span>10m</span><strong>Restart constrained</strong><small><code>max_active_runs=1</code>, a dedicated small pool, low <code>priority_weight</code>.</small></div>
  <div class="guide-timeline-item"><span>after</span><strong>Close the loop</strong><small>A standing backfill pool, and a convention that backfills run outside business hours.</small></div>
</div>

### A secret leaked into a task log

Rotate before anything else. The log is in object storage, in a log aggregator, possibly in a Slack alert, and in browser caches. Deleting the log line is not containment. Then find the code path that printed it and close the class rather than the instance: add the key name to `sensitive_var_conn_names`, and add a CI grep for printing connection or variable values. Rotating without closing the class means it recurs with a different credential.

### An upgrade migration is taking far longer than the window

Do not cancel it mid-migration: a partially applied schema change is worse than a long one. If you have not started, stop and reconsider: `db clean` first, then rehearse on a restored snapshot to get a real duration. If you are mid-migration and it is unacceptable, the fall-back is restoring the backup you took beforehand, which is why that backup must have been tested.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Stop the scheduler in a test environment and time your detection.</li>
    <li>Create a one-slot pool, queue ten tasks, and practise the "stuck in queued" diagnosis from the UI alone.</li>
    <li>Run <code>db clean --dry-run</code> for a ninety-day cutoff and read the row counts.</li>
    <li>Write your own version of these playbooks for your deployment and put them where an on-call engineer will find them.</li>
  </ol>
  <em>a measured detection time for the worst failure mode, and a retention number that usually justifies immediate action. Step four is the one that matters at 3am.</em>
</div>

## Running Airflow as a platform

**Publish a template repository, not documentation.** A working DAG with retries, timeouts, tags, and `doc_md`; the integrity test suite; the CI workflow with the parse-time budget. Teams inherit every decision by cloning, and a wiki page is read once.

**Publish a shared operator library as a versioned package.** The quality check, the alert callback, the standard extract. It is where standards get enforced: a gate that is one line gets adopted and forty lines does not.

**Own the contract, not the DAGs.** The platform owns scheduler health, punctuality, the shared library, and the deployment gate. DAG owners own correctness, their SLAs, and their own on-call. Writing that split down is what stops the platform team being paged for every data bug.

**Measure and publish.** Without numbers, "Airflow is fine" is an opinion:

| Metric | Why |
|---|---|
| Scheduling punctuality, p99 | The platform's own SLO |
| Total parse time, and the slowest files | Predicts scheduler degradation |
| Worker utilisation, and peak-to-trough ratio | Cost, and the autoscaling case |
| DAGs missing retries, timeout, owner, or docs | Standards adoption, per team |
| Import errors, count and duration | A broken DAG in production right now |
| Metadata database size and growth rate | The most common scaling ceiling |
| Sensors still in `poke` mode | An available cost and capacity win |

<div class="callout warn">
  <span class="ct">The failure mode of a shared Airflow</span>
  One team's DAG parses slowly, or floods the workers with a backfill, and every other team's pipelines are late. Without pools, per-team queues, and an enforced parse-time budget, the platform is one careless commit from an incident that is not its fault but is its problem. Noisy-neighbour containment is the primary engineering requirement of a shared deployment, not a refinement.
</div>

## Machine-learning pipelines specifically

**Airflow orchestrates training; it does not train.** A task that fits a model in the worker holds a scheduling slot for hours, cannot scale past one machine, and puts memory pressure on shared infrastructure. Submit to a training service, a Kubernetes job, or a managed platform, and let Airflow wait, deferrably.

**Model artifacts do not belong in XCom.** Pass the URI. The metadata database is not an artifact store, and a serialised model in an XCom row will slow every UI page that touches that run.

**Gate promotion on metrics, in the DAG.** A branch on evaluation results (promote if the new model beats the incumbent, otherwise skip and alert) turns a manual review into a recorded, auditable decision.

**Datasets are the right trigger for retraining.** "Retrain when the feature table is updated" expresses the real dependency; "retrain at 3am and hope features landed" does not.

**Long training runs need `execution_timeout` more than anything else does.** A hung GPU job with no timeout is the most expensive stuck task you can have.

```python
@task.branch
def promote_or_skip(new_auc: float, incumbent_auc: float) -> str:
    return "register_model" if new_auc > incumbent_auc + 0.005 else "skip_promotion"
```

## The checklist to run before shipping

| Check | Looking for |
|---|---|
| `catchup=False` unless a backfill is intended | No accidental flood |
| `{{ ds }}` rather than `now()` | Reproducible reruns and backfills |
| Tasks idempotent: delete the partition, then write | Retries and backfills are safe |
| `retries`, `execution_timeout`, `dagrun_timeout` all set | Failures self-heal; hangs are bounded |
| `max_active_runs` on anything that writes | No concurrent writers |
| XCom carries metadata only | The database stays healthy |
| No top-level query, API call, or heavy import | The scheduler stays fast |
| Joins after a branch have explicit trigger rules | No silent skip cascade |
| Sensors deferrable, or `reschedule` with a timeout | No wasted worker slots |
| Shared external systems behind a pool | One DAG cannot exhaust a database |
| `on_failure_callback` with a log link | Alerts are actionable |
| Tags, owner, and `doc_md` present | Ownership and a runbook exist |
| Integrity tests and a parse-time budget in CI | A bad DAG cannot ship |
| Secrets in a backend, not the metadata database | Rotation, scoping, audit |
| Per-DAG access control on a multi-team deployment | Teams cannot trigger each other |
| `db clean` scheduled | The database is not the ceiling |
| Scheduler heartbeat alerting in place | Silence is detected |
| Backfills in a constrained pool at low priority | Production is not collateral damage |
| Heavy work happens outside the worker | Airflow orchestrates, not computes |
| A tested database backup before any upgrade | There is no downgrade |

Most orchestration incidents are prevented at review time rather than at 3am. Reading a DAG for what it **guarantees**, rather than what it does, is the highest-leverage habit you can build.
