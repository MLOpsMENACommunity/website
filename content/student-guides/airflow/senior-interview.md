Part three of three, and the one to read if you only read one. A cumulative review of **the entire series** — foundations, pipeline machinery, and the security and platform work a senior owns — organised by topic rather than by level. About fifty minutes. Fast review first, common questions at the end.

## Part one — foundations

<div class="flow">
  <div class="node">DAG FOLDER<small>your .py files</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">SCHEDULER<small>parse + schedule</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">METADATA DB<small>all state</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">WORKER<small>runs the task</small></div>
</div>

> Airflow schedules and monitors workflows defined as Python DAGs. It gives you a dependency graph, retries, historical intervals, and full run history — replacing cron chains that had none of those. It is an **orchestrator, not a compute engine**.

### Components, and their symptoms

| Component | Symptom when it is the problem |
|---|---|
| Scheduler | Nothing runs, or runs late |
| Executor | Tasks stuck in `queued` |
| Worker | The task fails or runs out of memory |
| Metadata DB | Everything slow; UI times out |
| Webserver | You cannot see anything, but runs continue |
| Triggerer | Deferred tasks hang silently |

### The scheduling model

**Airflow schedules intervals, not moments.** A `@daily` run for 1 May starts just after midnight on 2 May; the logical date is 2024-05-01. Use `{{ ds }}`, never `now()`, or reruns and backfills stop being reproducible.

`catchup=True` with an old `start_date` creates every missed interval at once — hundreds of runs on unpause.

### The rules that never change

**The scheduler executes every DAG file repeatedly**, so no queries, API calls, `Variable.get()`, or heavy imports at the top level. **XCom is serialised into the metadata database**, so pass paths not payloads. **Credentials live in a Connection.** **Idempotence — delete the partition, then write —** is what makes retries and backfills safe. **A skip is neither success nor failure and it propagates**, so a join after a branch needs an explicit trigger rule.

| Guard | Prevents |
|---|---|
| `retries` + `retry_delay` | A blip failing the pipeline |
| `execution_timeout` | A hung task holding a worker forever |
| `dagrun_timeout` | Intervals piling up behind a stuck run |
| `max_active_runs` | Two runs writing one table |
| `catchup=False` | An accidental flood of historical runs |
| Sensor `timeout` + `reschedule` | A deadlocked worker pool |

## Part two — pipeline machinery

### Executors and limits

| Executor | Trade-off |
|---|---|
| `LocalExecutor` | One machine; simple ops |
| `CeleryExecutor` | Sub-second task start; shared env; pay for idle |
| `KubernetesExecutor` | Full isolation, scale to zero; 10–30s pod startup |
| `CeleryKubernetesExecutor` | Both, routed by queue |

| Limit | Scope |
|---|---|
| `parallelism` | The cluster |
| `max_active_tasks_per_dag` | One DAG |
| `worker_concurrency` | One worker |
| Pool slots | A named external resource, across all DAGs |
| A `queue` no worker consumes | Queues forever with **no error** |

### Mapping, deferring, datasets

```python
counts = process.expand(key=list_files())      # N run-time instances
```

`expand` with two arguments is a **cross product**; use `expand_kwargs` for pairs. Mapping is wrong when items are tiny — batch instead.

| Waiting approach | Worker slots | Scales to |
|---|---|---|
| Sensor `poke` | One, continuously | Tens |
| Sensor `reschedule` | Zero between checks | Hundreds |
| **`deferrable=True`** | **Zero** | Tens of thousands |

Datasets: a producer declares `outlets=[Dataset(uri)]`, a consumer sets `schedule=[Dataset(uri)]`. No sensor, no shared interval, nothing held while waiting. The URI is an unvalidated string, so conventions matter.

### Organisation and control

TaskGroups collapse a large graph with no runtime cost; `task_id` becomes `group.task`. A DAG factory **must read a local file**, never a database, because it runs every parse. Setup/teardown expresses resource lifecycles, and a **teardown failure does not fail the run** — which is right, because the output is still valid.

Pools protect an external system across all DAGs; `pool_slots` lets one heavy task count as several; `priority_weight` defaults to `downstream` so a task blocking a chain outranks a leaf.

### Alerting, operators, params, testing

An **SLA does not stop or fail anything** — it records a miss. `on_failure_callback` fires **after retries are exhausted**, not per attempt. Always include `ti.log_url`; put the runbook in `doc_md`.

In a custom operator: `template_fields` is what makes `{{ ds }}` render, `self.log` puts messages in the task log, `AirflowFailException` fails without consuming retries, and a returned value goes to XCom.

`params` over `dag_run.conf` — types, bounds, a UI form, and validation before the run starts.

The **`DagBag` integrity test** is the highest-value test: seconds, no database, and it catches import errors plus any standard you assert.

### Timetables and XCom backends

A plain cron schedule fires *after* the interval; `CronTriggerTimetable("0 6 * * *")` fires at 06:00 and calls that the logical date. Set an explicit timezone once humans depend on the schedule.

A custom XCom backend moves large values to object storage transparently — and makes cleaning up those objects **your** problem, because `db clean` only removes rows.

## Part three — security, scale, and ownership

### The security model

**A DAG file is arbitrary Python executed with the scheduler's and workers' privileges.** There is no sandbox.

| Property | Consequence |
|---|---|
| DAG-folder write access | Equivalent to administrative access |
| Log masking | Works for connection fields; **not** for values you fetched and printed |
| UI defaults | An authenticated user can read DAG source, logs, and the connection list |

<div class="callout warn">
  <span class="ct">Write access to the DAG folder is administrative access</span>
  No RBAC setting limits what a DAG file can do once parsed. If contributors must not hold cluster-wide privileges, they must not write to the DAG folder directly — everything goes through review and a deployment pipeline. Treating the DAG folder as a code artifact rather than a shared drive is the most important security decision in an Airflow deployment.
</div>

### RBAC and multi-tenancy

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>RBAC gives you</h4>
    <ul>
      <li>Per-DAG read, edit, delete permissions</li>
      <li>Trigger separated from view</li>
      <li>Restricted connection and variable management</li>
      <li>SSO via the auth manager</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>RBAC does not give you</h4>
    <ul>
      <li>Isolation between teams' task code</li>
      <li>Preventing a DAG reading another team's connection</li>
      <li>Stopping one team exhausting shared workers</li>
      <li>Any defence against a malicious DAG author</li>
    </ul>
  </div>
</div>

Real isolation needs infrastructure: Kubernetes namespaces and service accounts per team, a secrets backend with per-team paths, separate queues or node pools, plus pools. For mutually untrusting tenants the honest answer is **separate deployments**.

### Secrets backends

Airflow resolves a `conn_id` through the backend chain: secrets backend, then environment variables, then the metadata database.

| Backend | Rotation | Per-team scoping | Audit trail |
|---|---|---|---|
| Metadata DB | Manual | **None** | None |
| Environment | Restart required | Per worker | None |
| Vault / Secrets Manager | Native | **Yes, by path and IAM** | **Yes, per read** |

It is on the hot path of every task, so monitor its latency as a first-class dependency and never point it at something less available than Airflow.

### Scaling — which component breaks first

| Bottleneck | Symptom | Fix |
|---|---|---|
| DAG parsing | New DAGs appear slowly; scheduler CPU pinned | Fix top-level code; `parsing_processes`; raise `min_file_process_interval` |
| Scheduler loop | Tasks sit in `scheduled` | More scheduler replicas; `max_tis_per_query` |
| **Metadata database** | Everything slow | **`db clean`**; indexes; PgBouncer; a bigger instance last |
| Worker capacity | Tasks sit in `queued` | More workers or concurrency; pools |

Multiple schedulers are **active-active** via row-level locking — the answer to both throughput and availability. Raising `min_file_process_interval` is the cheapest parsing win. The database is almost always the real ceiling, and retention is the fix rather than size.

### Cost

| Lever | Return |
|---|---|
| Deferrable operators everywhere | A sensor on an expensive worker is the worst way to wait |
| Right executor for the workload | Pod startup versus idle capacity |
| Autoscale on queue depth | Sizing for the 2am peak and paying overnight is the default waste |
| Retention on the database and logs | Both grow silently, neither is read after a month |
| Batch instead of mapping tiny items | Ten thousand schedules for twenty seconds of work |

Worker utilisation — task-seconds over paid worker-seconds — is the most revealing metric and is usually far lower than people guess.

### Observability and SLOs

| Metric | Means |
|---|---|
| `scheduler_loop_duration` rising | The scheduler is falling behind |
| `tasks.starving` non-zero | Tasks want to run and cannot |
| `dagbag_import_errors` non-zero | A broken DAG is deployed **now** |
| `total_parse_time` trending up | Top-level code creeping in |
| `executor.queued_tasks` growing | Worker capacity or queue routing |
| `dagrun.schedule_delay` rising | Runs starting later than promised |

**Separate platform SLOs from pipeline SLOs.** Punctuality and scheduler availability are the platform's promise; correctness and completeness are the DAG owner's. Conflating them means the platform team is paged for every data bug.

<div class="callout warn">
  <span class="ct">The one alert every deployment needs</span>
  <b>Scheduler heartbeat age.</b> A dead scheduler produces silence, not alerts — because failure alerts come from tasks that never ran. Its absence is why "we found out at 10am that nothing had run since 2am" is such a common story.
</div>

### Upgrades and delivery

There is **no downgrade path** for `airflow db migrate`. The rollback plan is a tested backup. Clean the database first — a smaller `task_instance` table turns a long migration into a short one. Pin providers separately from core, and move deprecated import paths ahead of the upgrade so the upgrade itself is only infrastructure.

| DAG delivery | Trade-off |
|---|---|
| Baked into the image | Atomic and versioned; a rollout per change |
| Git-sync | Live in a minute; a bad commit ships as fast as a good one |
| Volume sync | Simple; weak atomicity and provenance |

Git-sync plus a required, fast integrity check on the followed branch is the pragmatic middle. Git-sync from a branch anyone can push to without CI is a production deployment with no gate.

### Where Airflow stops

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Airflow is right</h4>
    <ul>
      <li>Scheduled batch with real dependencies</li>
      <li>Heterogeneous steps across many systems</li>
      <li>Backfills of historical intervals</li>
      <li>Orchestration where the work happens elsewhere</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Reach elsewhere</h4>
    <ul>
      <li>Sub-second or event-driven → Kafka, Flink</li>
      <li>In-warehouse SQL transforms → dbt, run from Airflow</li>
      <li>Per-request triggering → a service, not a DAG</li>
      <li>Heavy in-process crunching → Spark, Ray, the warehouse</li>
    </ul>
  </div>
</div>

**Airflow has no streaming semantics and should not compute.** A DAG of `SubmitSparkJob`, `RunDbtModel`, and `WaitForBigQueryJob` is well designed; a DAG loading dataframes into workers will force a rewrite.

### The review checklist

| Check | Level |
|---|---|
| `catchup=False` unless a backfill is intended | Beginner |
| `{{ ds }}` rather than `now()` | Beginner |
| Tasks idempotent — delete the partition, then write | Beginner |
| `retries`, `execution_timeout`, `dagrun_timeout` all set | Beginner |
| `max_active_runs` on anything that writes | Beginner |
| XCom carries metadata only | Beginner |
| Credentials in a Connection, never in code | Beginner |
| No top-level query, API call, or heavy import | Beginner |
| Joins after a branch have an explicit trigger rule | Beginner |
| Sensors deferrable, or `reschedule` with a timeout | Mid |
| Shared external systems behind a pool | Mid |
| `on_failure_callback` with a log link | Mid |
| Tags, owner, and `doc_md` present | Mid |
| Integrity tests pass in CI; parse time within budget | Mid |
| Secrets in a secrets backend, not the metadata DB | Senior |
| Per-DAG access control on a multi-team deployment | Senior |
| `db clean` scheduled | Senior |
| Scheduler heartbeat alerting in place | Senior |
| Backfills in a constrained pool at low priority | Senior |
| Heavy work happens outside the worker | Senior |

## Common interview questions

<ol class="guide-steps">
  <li><b>Explain Airflow to an engineer who has never used it.</b>A platform for scheduling and monitoring workflows defined as Python DAGs. It computes the execution order from declared dependencies, schedules historical intervals rather than moments, retries failures, and records every run in a metadata database with a UI over it. And it is an orchestrator — the heavy work should happen in Spark, the warehouse, or a container, not in the worker.</li>
  <li><b>Why is DAG-folder write access a security concern?</b>Because a DAG file is arbitrary Python that the scheduler and workers execute with their own privileges, and there is no sandbox. A DAG could read every connection in the metadata database and exfiltrate it. So write access to that folder is effectively administrative access, and the control is code review plus a deployment pipeline — not Airflow configuration.</li>
  <li><b>What does RBAC give you, and what does it not?</b>It gives per-DAG read, edit, and delete permissions, separates who can trigger from who can view, restricts connection management, and integrates with SSO. It does not isolate task code between teams, does not stop one team's DAG reading another's credential, and offers nothing against a malicious DAG author.</li>
  <li><b>Can one Airflow safely host two mutually untrusting teams?</b>Not if both author DAGs. A DAG file runs arbitrary code, so no permission model prevents one team reading the other's data or secrets. The honest answers are separate deployments, or a model where nobody writes DAGs directly and pipelines are generated from a restricted specification.</li>
  <li><b>What does a secrets backend buy you over the metadata database?</b>Native rotation with no Airflow change, per-team scoping by path and IAM so a DAG asking for another team's credential is denied at the source, and an audit trail of which identity read which secret when. The cost is that it sits on the hot path of every task, so its latency and availability become yours.</li>
  <li><b>Why does log masking sometimes fail?</b>Airflow masks values it knows are sensitive — connection fields and configured key names. A credential you fetched into a variable yourself and printed is not on that list. This is the most common real Airflow security incident and it is entirely preventable, both by configuration and by a CI check on printing.</li>
  <li><b>Four things are slow. Which component is it?</b>New DAGs appearing slowly with pinned scheduler CPU is parsing. Tasks sitting in <code>scheduled</code> is the scheduler loop. Everything slow including the UI is the metadata database. Tasks sitting in <code>queued</code> is worker capacity — or a queue no worker consumes, which looks identical and is not fixed by adding workers.</li>
  <li><b>What is almost always the real scaling ceiling?</b>The metadata database. Every heartbeat, state change, XCom write, and UI page is a query, and without retention <code>task_instance</code> and <code>log</code> grow forever. The fix is <code>db clean</code> on a schedule and moving large XCom values out — resizing the instance buys weeks and hides the cause.</li>
  <li><b>How do you run Airflow highly available?</b>Multiple schedulers, active-active, coordinating through row-level locking in the database — which needs Postgres 12+ or MySQL 8+. That covers throughput and availability at once. The webserver is independently replicable, and its absence does not stop pipelines.</li>
  <li><b>Give the cheapest performance win in a busy deployment.</b>Raising <code>min_file_process_interval</code>. The default re-parses every file every thirty seconds; a hundred and twenty seconds means new DAGs appear a minute later and the scheduler does a fraction of the work.</li>
  <li><b>Where does Airflow's cost actually go?</b>Rarely the scheduler. It is idle worker capacity — sized for the 2am peak and paid for all day — plus the metadata database, plus whatever compute the tasks trigger. Deferrable operators remove the worst waste, autoscaling on queue depth removes the next, and retention removes the quiet growth.</li>
  <li><b>What single metric would you put on a dashboard?</b>Worker utilisation: task-seconds divided by paid worker-seconds. It is usually far lower than anyone guesses, and a team that can see 12% will fix it while a team that cannot will keep adding workers.</li>
  <li><b>What is the one alert every Airflow deployment needs?</b>Scheduler heartbeat age. If the scheduler stops, everything stops silently — no failures, no red DAGs, because failure alerts come from tasks that never ran. Its absence is why "nothing had run since 2am and we found out at 10" is such a common story.</li>
  <li><b>How do you split platform SLOs from pipeline SLOs?</b>The platform promises punctuality and scheduler availability — runs start within N minutes of schedule, the scheduler heartbeats. DAG owners promise correctness, completeness, and freshness. Conflating them means the platform team is on call for every team's data bug, which does not scale and does not last.</li>
  <li><b>Walk me through an Airflow upgrade.</b>Read the release notes for deprecations and removals, run the migration check, clean the database so the migration is shorter, take and <b>test</b> a backup, deploy DAG import-path changes ahead of time where both forms work, then upgrade with the official constraints file and run <code>db migrate</code>. Rehearse the migration timing on a restored production snapshot, not in the window.</li>
  <li><b>What is the rollback plan for <code>db migrate</code>?</b>A tested database backup. There is no practical downgrade — the schema changes are not reversible — so a backup you have never restored is a hypothesis rather than a plan.</li>
  <li><b>How should DAGs reach the scheduler?</b>Baked into an image is safest — DAGs, providers, and dependencies versioned together, rollback is a redeploy. Git-sync is fastest to iterate with but ships a broken DAG as quickly as a good one. The pragmatic middle is git-sync from a branch protected by a required, fast integrity check. Git-sync from an unprotected branch is a deployment with no gate.</li>
  <li><b>Nothing has run for two hours and nothing has failed. What do you do?</b>Check the scheduler first with <code>airflow jobs check</code>, because silence means the scheduler, not the tasks. Then: is the process alive, can it reach the database, is one DAG file exceeding <code>dag_file_processor_timeout</code> and blocking a processor, and is the database connection pool exhausted. <code>airflow dags report</code> names a pathological file immediately.</li>
  <li><b>A backfill took production down. What now?</b>Pause the DAG and clear the queued backfill instances so they stop competing, confirm production drains and recovers, then find what it exhausted — worker slots, a pool, database connections, or the warehouse. Restart it with <code>max_active_runs=1</code>, a dedicated small pool, and low priority. The durable fix is a standing backfill pool and a convention that backfills run outside business hours.</li>
  <li><b>How do you contain a noisy neighbour on a shared Airflow?</b>Pools for shared external systems, per-team queues or node pools for compute, `max_active_tasks` per DAG, and a parse-time budget enforced in CI. Without those, one team's careless commit is an incident for every other team — which on a shared deployment is the primary engineering requirement, not a refinement.</li>
  <li><b>How would you roll Airflow out to six teams?</b>A template repository with a working DAG, the integrity tests, and CI, so teams inherit every decision by cloning. A shared operator library as a versioned package, because a quality gate that is one line gets adopted and forty lines does not. A written contract splitting platform ownership from pipeline ownership. And published metrics — punctuality, parse time, utilisation, and standards adoption per team.</li>
  <li><b>Where does Airflow stop?</b>Sub-second and event-driven work belongs in Kafka or Flink; there are no streaming semantics here. Pure SQL transformation belongs in dbt, run from Airflow. Per-request triggering belongs in a service. And heavy computation belongs in Spark, Ray, or the warehouse — a task that loads a large dataframe into a worker is a misuse that will force a rewrite.</li>
  <li><b>A team wants to migrate off Airflow. How do you respond?</b>Diagnose the practices first. Usually the complaints trace to top-level code, sensors in <code>poke</code> mode, computation inside tasks, no retention, and no pools — all fixable in weeks. Migrating orchestrators is a multi-quarter project that faithfully reproduces every one of those mistakes in a new tool unless the practices change first.</li>
  <li><b>What do you look for reviewing a DAG?</b>Not what it does — what it <b>guarantees</b>. Can any interval be reproduced; is every task idempotent; can a hung task take a worker with it; who can read the credentials it uses; does it protect the systems it writes to; will anyone find out when it fails; and is the heavy work happening somewhere other than the worker.</li>
</ol>

## Final self-test

- Give the whole-series answer in four sentences, including "orchestrator, not compute engine".
- Explain why DAG-folder write access is administrative access.
- Say what RBAC does and does not isolate, and the honest multi-tenancy answer.
- Name what a secrets backend buys, and the cost it introduces.
- Say why log masking fails, and the two fixes.
- Map four "slow" symptoms to four components, including the queue-routing trap.
- Name the usual real scaling ceiling and the correct first fix.
- Say how Airflow runs highly available, and what the database must support.
- Give the cheapest parsing win, and the biggest cost lever.
- Name the one metric and the one alert every deployment needs.
- Split platform SLOs from pipeline SLOs in one sentence each.
- Give the rollback plan for `db migrate`, and why the backup must be tested.
- Say what to check first when nothing has run and nothing has failed.
- Name four noisy-neighbour containment mechanisms.
- Say where Airflow stops, and how you answer "should we migrate off it".
- Run the review checklist from memory, and name which rows a machine can check.

