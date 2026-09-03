This is part three of three. It closes the series by taking **every topic from Beginner and Mid one level further** — each one now has a security, scale, or ownership dimension — and adds the work you own when Airflow is your responsibility rather than your tool.

Up to this point the questions have been about making a DAG run correctly. From here they are different: who can see and trigger which pipeline, where the credentials actually live, which component breaks first under load, what the whole thing costs, how you upgrade it without a maintenance window nobody will grant you, and what you do at 3am when the scheduler stops scheduling.

## Where this picks up

| Topic from earlier levels | What this level adds |
|---|---|
| The five components | **Which one is your bottleneck**, and the metrics that tell you before users do |
| Executors | Cost modelling, idle capacity, and multi-executor routing by workload |
| Connections and Variables | **Secrets backends** — credentials never in the metadata database |
| The webserver and UI | RBAC, per-DAG access control, and what multi-tenancy really means |
| Top-level code | Parse-time budgets as an SLO, and DAG-processor isolation |
| The metadata database | Growth, `db clean`, query hot spots, and connection pooling |
| Pools and concurrency | Fair sharing across teams, and noisy-neighbour containment |
| Deferrable operators | Triggerer capacity planning and async failure modes |
| Datasets | Cross-team contracts, and lineage that survives a reorg |
| SLAs and callbacks | Real SLOs, error budgets, and alert routing that scales |
| Custom operators | A shared library as a product, with versioning and a release cadence |
| Testing and CI | Deployment strategy, DAG rollout, and blocking a bad DAG at the gate |
| Backfills | Backfills that do not take production down |
| — **new** — | Upgrades · observability · incident playbooks · platform ownership · where Airflow ends |

I am starting with the security model, because every other decision in this track depends on it.

## The security model

Airflow's security surface is larger than people expect, and the reason is a single fact: **a DAG file is arbitrary Python that Airflow executes with the scheduler's and workers' privileges.**

| Actor | Can | Should not |
|---|---|---|
| DAG author | Write Python that runs on your workers | Read secrets outside their scope |
| A user with UI access | See DAG code, logs, connections, variables | See another team's credentials in a log |
| A user who can trigger a DAG | Run arbitrary code the DAG contains | Trigger another team's production pipeline |
| The scheduler | Execute every DAG file it can see | Anything else |
| A worker | Run task code with its own credentials | Hold credentials for unrelated systems |

Three properties make this sharper than it first appears:

**Anyone who can write a DAG file has remote code execution on your cluster.** There is no sandbox. A DAG file could read every connection in the metadata database, exfiltrate them, and delete its own logs. DAG-folder write access is therefore equivalent to administrative access, and the control is code review plus a deployment pipeline — not Airflow configuration.

**Logs leak secrets by default.** Airflow masks values it knows are sensitive, based on connection fields and a configured list of key names. A credential you fetched yourself and printed is not masked. This is the most common real-world Airflow security incident, and it is entirely preventable.

```ini airflow.cfg
[core]
hide_sensitive_var_conn_fields = True
sensitive_var_conn_names = api_token, private_key, client_secret
```

**The UI shows more than people assume.** By default an authenticated user can read every DAG's source, every log, and the list of connections. Variables' *values* are masked when the name looks sensitive — which is a heuristic, not a boundary.

<div class="callout warn">
  <span class="ct">Write access to the DAG folder is administrative access</span>
  No amount of RBAC configuration limits what a DAG file can do once the scheduler parses it. If contributors must not have cluster-wide privileges, they must not be able to put files in the DAG folder directly — everything goes through a pull request and a deployment pipeline. Treating the DAG folder as a code artifact rather than a shared drive is the single most important security decision in an Airflow deployment.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>List everyone who can write to your DAG folder — including anyone with access to the bucket, the volume, or the git branch it syncs from.</li>
    <li>In a test environment, write a DAG that reads a connection and prints its password. Confirm whether the log masks it.</li>
    <li>Now fetch the same secret manually into a variable with a non-obvious name and print it. Check the masking again.</li>
    <li>Log in as a low-privilege user and see how much DAG code and how many connections you can read.</li>
  </ol>
  <em>usually a longer write list than expected, masking that works for connection fields and fails for anything you handled yourself, and a read-only user who can see more than intended. Step three is the one that changes how people write logging.</em>
</div>

## RBAC and multi-tenancy

Airflow ships role-based access control. Understanding what it does and does not give you is the difference between a plan and a hope.

| Role | Typical use |
|---|---|
| `Admin` | Platform team only |
| `Op` | Can manage connections, variables, pools — a senior operator |
| `User` | Can trigger and clear DAGs |
| `Viewer` | Read-only |
| `Public` | Unauthenticated — should have nothing |

Per-DAG permissions are the mechanism that makes team separation possible:

```bash
# A role scoped to one team's DAGs
airflow roles create team_billing
airflow roles add-perms team_billing \
    -r can_read -v DAG:billing_ingest \
    -r can_edit -v DAG:billing_ingest
```

```python
# Or declare access at the DAG level
@dag(
    dag_id="billing_ingest",
    access_control={"team_billing": {"can_read", "can_edit"}},
    ...
)
```

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>RBAC does give you</h4>
    <ul>
      <li>Per-DAG read, edit, and delete permissions</li>
      <li>Separation of who can trigger from who can only look</li>
      <li>Restricting connection and variable management</li>
      <li>SSO integration via the auth manager</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>RBAC does not give you</h4>
    <ul>
      <li>Isolation between task code from different teams</li>
      <li>Preventing a DAG from reading another team's connection</li>
      <li>Stopping one team's DAG exhausting shared workers</li>
      <li>Any protection against a malicious DAG author</li>
    </ul>
  </div>
</div>

So genuine multi-tenancy needs infrastructure, not configuration:

| Isolation need | Mechanism |
|---|---|
| Task code separation | `KubernetesExecutor` with per-team namespaces and service accounts |
| Credential separation | A secrets backend with per-team paths and IAM scoping |
| Resource separation | Separate Celery queues or Kubernetes node pools, plus pools |
| Full separation | **Separate Airflow deployments** — the honest answer for hostile tenants |

<div class="callout warn">
  <span class="ct">One Airflow for mutually untrusting teams is the wrong architecture</span>
  If two teams must not be able to read each other's data or credentials, and both can author DAGs, one deployment cannot deliver that — because a DAG file runs arbitrary code. The answer is separate deployments, or a model where nobody authors DAGs directly and pipelines are generated from a restricted specification. Saying this clearly in an interview is a senior signal; claiming RBAC solves it is not.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Create a role scoped to a single DAG and a user with only that role. Log in as them.</li>
    <li>Confirm they cannot see other DAGs — and check whether they can still see the connections list.</li>
    <li>Write a DAG under that team's ownership that reads a connection belonging to another team. Confirm it works.</li>
    <li>Write down which of your isolation requirements RBAC actually satisfies.</li>
  </ol>
  <em>per-DAG visibility that works, and a task that happily reads a credential it has no business reading. Step three is the demonstration that separates "we have RBAC" from "we have isolation".</em>
</div>

## Secrets backends

The strongest fix for the previous section's problem is to take credentials out of Airflow entirely.

```ini airflow.cfg
[secrets]
backend = airflow.providers.hashicorp.secrets.vault.VaultBackend
backend_kwargs = {
    "connections_path": "airflow/connections",
    "variables_path": "airflow/variables",
    "mount_point": "secret",
    "url": "https://vault.internal:8200",
    "auth_type": "kubernetes",
    "kubernetes_role": "airflow"
}
```

Airflow resolves a `conn_id` through the backend chain: the secrets backend first, then environment variables, then the metadata database. So `conn_id="warehouse"` becomes a lookup at `secret/airflow/connections/warehouse` in Vault, with nothing stored locally.

| Backend | Rotation | Per-team scoping | Audit trail |
|---|---|---|---|
| Metadata database | Manual | None — any DAG reads any connection | None |
| Environment variables | Restart required | Per worker, if you segregate workers | None |
| **Vault / AWS Secrets Manager / GCP Secret Manager** | Native, automatic | **Yes, by path and IAM** | **Yes, per read** |

Three consequences worth stating:

**Rotation stops being a project.** A credential rotated in Vault is picked up on the next task run with no Airflow change and no restart.

**Reads become auditable.** The secret store logs which identity read which secret when, which is the evidence an auditor asks for and the metadata database cannot provide.

**Per-team scoping becomes real.** Workers in the billing namespace authenticate with a service account that can only read `secret/airflow/connections/billing/*`. A DAG that asks for another team's connection gets a denial from Vault rather than a password from your database.

<div class="callout warn">
  <span class="ct">A secrets backend is on the hot path of every task</span>
  Every <code>conn_id</code> resolution is a network call. Airflow caches within a task, but a DAG with fifty tasks each opening a connection is fifty lookups, and a slow or unavailable secret store means tasks failing everywhere at once. Configure the backend's timeout and retry, monitor its latency as a first-class dependency, and never point it at something with a lower availability target than Airflow itself.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Configure a secrets backend in a test environment — the local filesystem backend is enough to see the mechanism.</li>
    <li>Move one connection out of the metadata database into it and confirm the DAG still works.</li>
    <li>Delete the connection from the Airflow UI and confirm the DAG <em>still</em> works — proving the backend is being used.</li>
    <li>Point the backend at an unreachable address and observe how the task fails.</li>
  </ol>
  <em>a working pipeline whose credentials do not exist in Airflow, and a clear failure mode when the backend is down. Step three is the moment the chain of resolution becomes concrete.</em>
</div>

## Scaling: which component breaks first

Mid taught you the components. At scale you need to know **which one saturates**, because the symptom is always "Airflow is slow" and the cause is one of four very different things.

| Bottleneck | Symptom | Diagnose with | Fix |
|---|---|---|---|
| **DAG parsing** | New DAGs appear slowly; scheduler CPU pinned | `airflow dags report`, DAG Processing page | Fix top-level code; more parsing processes; `.airflowignore` |
| **Scheduler loop** | Tasks sit in `scheduled` before `queued` | `scheduler_heartbeat`, loop duration metric | More scheduler replicas; raise `max_tis_per_query` |
| **Metadata database** | Everything slow; UI pages time out | Slow query log, connection count | `db clean`; indexes; a bigger instance; PgBouncer |
| **Worker capacity** | Tasks sit in `queued` | Queue depth, worker CPU | More workers; more `worker_concurrency`; pools |

```ini airflow.cfg
[scheduler]
# Parsing
parsing_processes = 4                    # parallel DAG file processors
min_file_process_interval = 60           # re-parse each file at most this often
dag_dir_list_interval = 120              # rescan the folder this often
file_parsing_sort_mode = modified_time   # prioritise recently changed files

# Loop throughput
max_tis_per_query = 512                  # task instances examined per query
scheduler_heartbeat_sec = 5
use_row_level_locking = True             # required for multiple schedulers

[database]
sql_alchemy_pool_size = 10
sql_alchemy_max_overflow = 20
sql_alchemy_pool_recycle = 1800
```

Three scaling facts that matter more than the rest:

**Multiple schedulers are active-active.** Since Airflow 2 you run two or three schedulers behind row-level locking and they share the work. This is the answer to both throughput and availability, and it needs a database that supports `SELECT … FOR UPDATE SKIP LOCKED` — Postgres 12+ or MySQL 8+.

**The metadata database is almost always the real ceiling.** Every heartbeat, state change, XCom write, and UI page is a query. A cluster running fifty thousand task instances a day generates a very large amount of write traffic, and the fix is usually retention rather than a bigger machine.

```bash
airflow db clean --clean-before-timestamp 2024-01-01
airflow db clean --clean-before-timestamp 2024-01-01 --tables task_instance,dag_run,log,xcom
```

**Raising `min_file_process_interval` is the cheapest parsing win.** The default re-parses every file every thirty seconds. Sixty or a hundred and twenty seconds is almost always acceptable — new DAGs appear a minute later, and the scheduler does a fraction of the work.

<div class="callout warn">
  <span class="ct">Retention is not optional at scale</span>
  Without <code>db clean</code> on a schedule, <code>task_instance</code> and <code>log</code> grow forever. A multi-hundred-gigabyte metadata database makes the UI unusable, slows the scheduler loop, and turns every upgrade migration into a multi-hour outage. Set retention before you need it — retrofitting it onto a huge table means a long, careful, out-of-hours operation.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run <code>airflow dags report</code> and identify your slowest-parsing file.</li>
    <li>Find your metadata database size, and the row counts of <code>task_instance</code>, <code>log</code>, and <code>xcom</code>.</li>
    <li>Raise <code>min_file_process_interval</code> to 120 and observe the scheduler's CPU.</li>
    <li>Run <code>airflow db clean --dry-run</code> for a cutoff a year ago and read how many rows it would remove.</li>
  </ol>
  <em>your own parse-time distribution, real table row counts, and a measurable CPU drop from one configuration line. That <code>db clean --dry-run</code> number is usually large enough to schedule the real thing immediately.</em>
</div>

## Cost

Airflow's cost is rarely the scheduler. It is idle capacity, the database, and the compute your tasks trigger.

| Cost centre | Driven by | Typical waste |
|---|---|---|
| Celery workers | Provisioned capacity × time | Sized for the 2am peak, idle for twenty hours |
| Kubernetes pods | Pod-seconds | Thousands of tiny pods, each with fixed startup overhead |
| Metadata database | Instance size + storage | An unretained history nobody queries |
| Triggerer | One or two small processes | Almost nothing — this is the point |
| Task compute | Whatever your tasks call | Sensors in `poke` mode holding expensive workers |
| Logs | Object storage + requests | Verbose logs kept forever |

Five levers, roughly in order of return:

<ol class="guide-steps">
  <li><b>Deferrable operators everywhere</b>A sensor in <code>poke</code> mode on a GPU-capable worker is the most expensive way to wait ever invented. Deferring moves the wait to one small async process.</li>
  <li><b>Right-size the executor to the workload</b>Many short tasks favour Celery, because pod startup dominates. Few heavy tasks favour Kubernetes, because idle workers dominate. A <code>CeleryKubernetesExecutor</code> with queue routing gets both.</li>
  <li><b>Scale workers on queue depth</b>KEDA on Celery queue length, or Kubernetes with scale-to-zero. Sizing for peak and paying overnight is the default and the most common waste.</li>
  <li><b>Retention on everything</b><code>db clean</code> for the database, a lifecycle rule for remote logs. Both grow silently and neither is ever read after a month.</li>
  <li><b>Batch instead of mapping when items are small</b>Ten thousand mapped tasks each doing two seconds of work is ten thousand schedules, rows, and possibly pods, for twenty seconds of real work.</li>
</ol>

```yaml KEDA scaler for Celery workers
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
spec:
  scaleTargetRef:
    name: airflow-worker
  minReplicaCount: 1
  maxReplicaCount: 20
  triggers:
    - type: postgresql
      metadata:
        query: >-
          SELECT ceil(count(*)::decimal / 16)
          FROM task_instance
          WHERE state = 'queued' OR (state = 'running' AND queue = 'default')
        targetQueryValue: "1"
```

<div class="callout tip">
  <span class="ct">Publish the number or it will not be managed</span>
  Worker utilisation — task-seconds divided by worker-seconds paid for — is the single most revealing Airflow cost metric, and it is usually far lower than people guess. Put it on a dashboard next to the monthly figure. A team that can see 12% utilisation will fix it; a team that cannot see it will keep adding workers.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Calculate worker utilisation for last week: total task duration divided by total worker uptime.</li>
    <li>Count your sensors and check how many are still in <code>poke</code> mode.</li>
    <li>Look at your peak-to-trough task concurrency over a day. The ratio is your autoscaling opportunity.</li>
    <li>Estimate your metadata database's growth rate and how much of it is older than ninety days.</li>
  </ol>
  <em>a utilisation figure that is usually embarrassing, a list of sensors to convert, and a clear autoscaling case. That peak-to-trough ratio in step three is the number to take to a planning conversation.</em>
</div>

## Observability and SLOs

Mid added alerting on failures. At platform scale you need to know Airflow is healthy *before* a pipeline misses, which means metrics rather than alerts.

```ini airflow.cfg
[metrics]
statsd_on = True
statsd_host = statsd.monitoring
statsd_port = 8125
statsd_prefix = airflow
```

The metrics that actually predict incidents:

| Metric | Watch for | Means |
|---|---|---|
| `scheduler.scheduler_loop_duration` | Rising above a few seconds | The scheduler is falling behind |
| `scheduler.tasks.starving` | Non-zero and sustained | Tasks want to run and cannot — pool or slot exhaustion |
| `dagbag_import_errors` | Any non-zero value | A broken DAG file is deployed right now |
| `dag_processing.total_parse_time` | Rising trend | Top-level code creeping in |
| `executor.queued_tasks` | Growing without draining | Worker capacity or queue routing problem |
| `executor.open_slots` | At zero for long periods | Saturated executor |
| `dagrun.duration.success.<dag_id>` | p95 rising | A pipeline degrading before it fails |
| `dagrun.schedule_delay.<dag_id>` | Rising | Runs starting later than they should |
| `sla_missed` | Any | A consumer-facing promise broken |

Then define SLOs on the things consumers actually care about:

| SLO | Example target | Why it is the right shape |
|---|---|---|
| Freshness | "The events table is current as of 06:00, 99% of days" | What consumers experience |
| Completion | "The pipeline completes within 90 minutes, p95" | Detects degradation before failure |
| Scheduling punctuality | "Runs start within 5 minutes of schedule, 99.9%" | Isolates platform health from DAG health |
| Platform availability | "The scheduler heartbeats, 99.9%" | The thing the platform team owns |

That last distinction is the one that makes a platform team's life livable: **separate platform SLOs from pipeline SLOs.** "Runs start on time" is the platform's promise. "The data is correct and complete" is the DAG owner's. Conflating them means the platform team is paged for every team's data bug.

<div class="callout tip">
  <span class="ct">The one alert every Airflow deployment needs</span>
  <b>Scheduler heartbeat age.</b> If the scheduler stops, everything stops — no failures, no alerts, no red DAGs, just silence, because failure alerts come from tasks that never ran. A heartbeat alert is the only thing that catches it, and its absence is why "we found out at 10am that nothing had run since 2am" is such a common story.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Find whether metrics are exported at all in your deployment. If not, that is your first task.</li>
    <li>Chart scheduler loop duration and total parse time for the last week and look for a trend.</li>
    <li>Check <code>tasks.starving</code> — a non-zero value you did not know about is very common.</li>
    <li>Stop the scheduler for five minutes and confirm something alerts. If nothing does, add it today.</li>
  </ol>
  <em>a trend line for the two metrics that predict scheduler trouble, and — in step four — the discovery that most deployments are silent when the scheduler dies. That fourth test is worth running in production during a quiet window.</em>
</div>

## Upgrades and migrations

An Airflow upgrade touches the database schema, the provider packages, and every DAG's imports at once. Doing it without a plan is how teams end up three major versions behind.

<ol class="guide-steps">
  <li><b>Read the release notes properly</b>Deprecations become removals a version later. The upgrade that breaks you is usually one you skipped, not the one you are doing.</li>
  <li><b>Run the upgrade check</b><code>airflow db check-migrations</code> and, on older versions, the dedicated upgrade-check tooling. Fix what it reports before touching anything.</li>
  <li><b>Pin providers separately from core</b>Provider packages version independently. Upgrading a provider for a bug fix should not require an Airflow upgrade, and that is only true if you pin them separately.</li>
  <li><b>Rehearse the migration on a copy of production data</b><code>airflow db migrate</code> on a two-hundred-gigabyte <code>task_instance</code> table can take hours. Time it on a restored snapshot, not in the maintenance window.</li>
  <li><b>Clean the database first</b>A smaller table migrates faster. <code>db clean</code> before an upgrade often turns a long outage into a short one.</li>
  <li><b>Deploy DAG compatibility ahead of the upgrade</b>Import paths change between versions. Where both old and new imports work, move to the new ones in advance so the upgrade itself is only infrastructure.</li>
</ol>

```bash
# Before
airflow db check-migrations
airflow db clean --clean-before-timestamp $(date -d '90 days ago' -I)
pg_dump airflow > backup-$(date -I).sql        # non-negotiable

# The upgrade
pip install "apache-airflow==2.10.*" --constraint "$CONSTRAINTS_URL"
airflow db migrate

# After
airflow dags list-import-errors
airflow jobs check --job-type SchedulerJob --hostname "$(hostname)"
```

```text requirements.txt
apache-airflow==2.10.2
apache-airflow-providers-amazon==8.28.0
apache-airflow-providers-postgres==5.12.0
# Always install with the official constraints file for your version and Python
```

<div class="callout warn">
  <span class="ct">There is no downgrade path for the database</span>
  <code>airflow db migrate</code> applies schema changes that are not reversible in practice. Your rollback plan is a database backup taken immediately before, and it must be tested — a backup you have never restored is a hypothesis. Take it, verify you can restore it into a scratch instance, <em>then</em> migrate.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Find your current Airflow and provider versions, and how far behind the current release you are.</li>
    <li>Run <code>airflow db check-migrations</code> and read the output.</li>
    <li>Restore a production snapshot into a scratch instance and time <code>airflow db migrate</code> against it.</li>
    <li>Grep your DAGs for deprecated import paths and fix them ahead of any upgrade.</li>
  </ol>
  <em>a real migration duration measured rather than guessed, and a list of import changes you can deploy independently. Step three is the difference between a planned twenty-minute window and an unplanned three-hour one.</em>
</div>

## Deployment and DAG delivery

How DAG files reach the scheduler is an architectural choice with real consequences.

| Method | How | Trade-off |
|---|---|---|
| **Baked into the image** | DAGs in the Docker image; deploy = new image | Fully atomic and versioned; requires a rollout per DAG change |
| **Git-sync sidecar** | A container pulls a branch on an interval | Fast iteration; a bad commit reaches production in seconds |
| **Shared volume / object storage sync** | Files synced to a mounted path | Simple; weak atomicity and provenance |
| **Airflow REST API / DAG bundles** | Managed deployment tooling | Depends on your platform |

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Baked image</h4>
    <ul>
      <li>DAGs, providers, and dependencies versioned together</li>
      <li>Rollback is redeploying the previous image</li>
      <li>No partial state during deployment</li>
      <li>CI must pass before anything ships</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Git-sync</h4>
    <ul>
      <li>A DAG change is live within a minute</li>
      <li>No image build per change</li>
      <li>But: a broken DAG is deployed as fast as a good one</li>
      <li>But: DAG version and dependency version can drift apart</li>
    </ul>
  </div>
</div>

Whichever you pick, the gate is the same:

```yaml .github/workflows/dags.yml
name: DAGs
on: [pull_request]
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11', cache: pip }
      - run: pip install -r requirements.txt --constraint constraints.txt
      - run: ruff check dags/ plugins/
      - name: Integrity — no import errors, and standards enforced
        run: pytest tests/test_dag_integrity.py -v
      - name: Unit tests for extracted logic
        run: pytest tests/unit -v
      - name: Parse-time budget
        run: python scripts/assert_parse_time.py --max-seconds 2
```

<div class="callout tip">
  <span class="ct">Git-sync plus a hard CI gate is the pragmatic middle</span>
  Baked images are safer; git-sync is faster to iterate with; a required, fast integrity check on the branch that git-sync follows gets you most of both. What is not acceptable is git-sync from a branch anyone can push to without CI — that is a production deployment with no gate.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Identify how DAGs currently reach your scheduler, and how long a change takes to appear.</li>
    <li>Work out how you would roll back a bad DAG change. Time it.</li>
    <li>Confirm whether a broken DAG file can reach production without CI passing.</li>
    <li>Add a parse-time budget assertion to CI and watch it fail on a deliberately slow DAG.</li>
  </ol>
  <em>a rollback procedure you have actually timed, and — usually — the discovery that a broken DAG can reach production faster than a review. That parse-time gate is the cheapest way to stop scheduler degradation creeping in.</em>
</div>

## Running Airflow as a platform

Once several teams share one Airflow, the highest-leverage work stops being technical and becomes about defaults. Four decisions cover most of it.

**Publish a template repository, not documentation.** A working DAG with retries, timeouts, tags, `doc_md`, and idempotent SQL; the integrity test suite; the CI workflow. Teams inherit every good decision by cloning, and a wiki page is read once.

**Publish a shared operator library as a versioned package.** The row-count check, the Slack alert callback, the standard extract pattern. It is where you enforce standards effectively — a quality gate that is one line gets adopted, and forty lines does not.

**Own the contract, not the DAGs.** The platform team owns scheduler health, punctuality, the shared library, and the deployment gate. DAG owners own correctness, their SLAs, and their own on-call. Writing that split down is what stops the platform team being paged for every data bug.

**Measure and publish.** Without numbers, "Airflow is fine" is an opinion:

| Metric | Why |
|---|---|
| Scheduling punctuality, p99 | The platform's own SLO |
| Total parse time, and the slowest files | Predicts scheduler degradation |
| Worker utilisation | Cost, and the autoscaling case |
| DAGs with no retries, no timeout, or no owner | Standards adoption, per team |
| Import errors, count and duration | A broken DAG in production right now |
| Metadata database size and growth | The most common scaling ceiling |
| Sensors still in `poke` mode | Available cost and capacity win |

<div class="callout warn">
  <span class="ct">The failure mode of a shared Airflow</span>
  One team's DAG parses slowly, or floods the workers with a backfill, and every other team's pipelines are late. Without pools, per-team queues, and a parse-time budget enforced in CI, the platform is one careless commit away from an incident that is not the platform's fault but is the platform's problem. Noisy-neighbour containment is not a nice-to-have on a shared deployment — it is the deployment's primary engineering requirement.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Build a template repository with a working DAG, the integrity tests, and CI. Use it for one real pipeline.</li>
    <li>Query your metadata database for DAGs with no retries, no <code>dagrun_timeout</code>, or no owner. Count them per team.</li>
    <li>Pick two of the metrics above and actually publish them somewhere the teams see.</li>
    <li>Write the one-page contract: what the platform promises, what DAG owners own, and how fast you answer a request.</li>
  </ol>
  <em>a template that makes the right thing the default, and a standards-adoption number per team that is usually worse than expected. Step four is what determines whether the platform is trusted or worked around.</em>
</div>

## Incident playbooks

Under pressure, ordering matters more than knowledge. Five shapes, with the first move for each.

### The scheduler has stopped scheduling

Nothing is failing — nothing is *running*. Confirm first with `airflow jobs check --job-type SchedulerJob`, because a dead scheduler produces silence rather than alerts.

Then work the four causes in order of likelihood: is the process alive; can it reach the metadata database; is one DAG file taking longer than `dag_file_processor_timeout` and blocking a processor slot; and is the database itself refusing connections because the pool is exhausted. `airflow dags report` names a pathological file immediately, and `.airflowignore` gets it out of the way while you fix it. Afterwards: the heartbeat alert, if you did not already have it.

### Tasks are stuck in `queued`

They are scheduled but nothing picks them up, which is always a capacity or routing problem. Check in order: `parallelism` cluster-wide, then the DAG's `max_active_tasks`, then pool slots — `airflow pools list` shows used against total — then whether the tasks name a `queue` that no running worker consumes. That last one is the sneaky case, because it looks identical to capacity exhaustion and no amount of extra workers fixes it.

### The metadata database is degrading

The UI times out, the scheduler loop lengthens, everything is slow. Check size and row counts first, then the connection count against the server's limit. The immediate action is `db clean` with a conservative cutoff; the durable fixes are scheduled retention, PgBouncer in front of a Postgres with hundreds of Airflow connections, and moving large XCom values out of the database. Resist the instinct to resize the instance first — it buys weeks and hides the cause.

### A backfill took production down

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>0m</span><strong>Stop the backfill</strong><small>Pause the DAG. Then clear the queued backfill task instances so they stop competing.</small></div>
  <div class="guide-timeline-item"><span>2m</span><strong>Confirm production recovers</strong><small>Watch queue depth drain and normal pipelines resume before doing anything else.</small></div>
  <div class="guide-timeline-item"><span>5m</span><strong>Find what it exhausted</strong><small>Worker slots, a pool, database connections, or the downstream warehouse's capacity.</small></div>
  <div class="guide-timeline-item"><span>10m</span><strong>Restart it constrained</strong><small><code>max_active_runs=1</code>, a dedicated pool with few slots, and low <code>priority_weight</code>.</small></div>
  <div class="guide-timeline-item"><span>after</span><strong>Close the loop</strong><small>A standing backfill pool, and a rule that backfills run at low priority outside business hours.</small></div>
</div>

### A secret leaked into a task log

Rotate before anything else — the log is in object storage, in a log aggregator, possibly in a Slack alert, and in anyone's browser cache. Deleting the log line is not containment. Then find the code path that printed it, and fix the class rather than the instance: add the key name to `sensitive_var_conn_names`, and add a CI check that greps DAG code for printing connection or variable values. Rotating and moving on without closing the class means it happens again with a different credential.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Stop your scheduler in a test environment and time how long until you find out from monitoring rather than by looking.</li>
    <li>Create a pool with one slot, queue ten tasks into it, and practise diagnosing "stuck in queued" from the UI alone.</li>
    <li>Add a task to a DAG that names a non-existent queue and confirm it queues forever with no error.</li>
    <li>Write your own version of these playbooks for your deployment, and put them where an on-call engineer will find them.</li>
  </ol>
  <em>a measured detection time for the worst failure mode, and a task queued forever with no error message anywhere. That third experiment is worth doing once — it is the hardest of these to diagnose without having seen it.</em>
</div>

## Where Airflow stops

Knowing the boundary is itself a senior signal, and stating it clearly is worth more than defending Airflow for every workload.

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Airflow is the right tool</h4>
    <ul>
      <li>Scheduled batch work with real dependencies</li>
      <li>Heterogeneous steps across many systems</li>
      <li>Backfills and reprocessing of historical intervals</li>
      <li>Pipelines needing retries, alerting, and an audit trail</li>
      <li>Orchestration where the work happens elsewhere</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Reach for something else</h4>
    <ul>
      <li>Sub-second or event-driven latency → Kafka, Flink, a queue</li>
      <li>Pure in-warehouse SQL transforms → dbt, on a schedule</li>
      <li>Per-request or per-event triggering → a service, not a DAG</li>
      <li>Heavy in-process data crunching → Spark, Ray, the warehouse</li>
      <li>Thousands of tiny tasks per minute → batch them, or a queue</li>
    </ul>
  </div>
</div>

| Tool | Solves | Overlaps Airflow on |
|---|---|---|
| **dbt** | SQL transformation, testing, and lineage inside the warehouse | Transform DAGs — usually run *from* Airflow, not instead |
| **Dagster** | Asset-centric orchestration with strong typing and lineage | Directly; a genuine alternative with different ergonomics |
| **Prefect** | Python-native flows with dynamic control flow | Directly; lighter for dynamic workloads |
| **Step Functions / Cloud Composer** | Managed orchestration | Airflow itself, in the managed case |
| **Kafka / Flink** | Streaming and event processing | Nothing — a different latency class |
| **Argo Workflows** | Kubernetes-native container DAGs | Container orchestration, without Airflow's scheduling model |

The shape that works in practice: **Airflow schedules and orchestrates, the heavy work happens in a purpose-built engine, and transformation logic lives in dbt or SQL rather than in Python inside a task.** A DAG whose tasks are mostly `SubmitSparkJob`, `RunDbtModel`, and `WaitForBigQueryJob` is a well-designed DAG. A DAG whose tasks load dataframes into worker memory is a misuse that will eventually force a rewrite.

<div class="callout tip">
  <span class="ct">The honest answer about "should we move off Airflow?"</span>
  Usually the problem is not Airflow but how it is being used: top-level code, sensors in <code>poke</code> mode, data processing inside tasks, no retention, no pools. Those are all fixable in weeks. Migrating orchestrators is a multi-quarter project that reproduces every one of those mistakes in a new tool unless the underlying practices change. Diagnose the practices before proposing the migration.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>List your heaviest DAGs and classify each task: does the work happen in the worker, or elsewhere?</li>
    <li>For anything doing work in the worker, decide where it should happen instead.</li>
    <li>Write down the specific requirement that would justify a different orchestrator.</li>
    <li>Name the one thing in your stack currently orchestrated by nothing — a cron job, a notebook, a person.</li>
  </ol>
  <em>a clear split between orchestration and computation, and usually one unorchestrated component nobody had noticed. That last answer is often the most valuable thing on this page.</em>
</div>

## The review checklist

This is the artefact to take away from this level. Run it against any DAG — your own, or one you are reviewing — and it catches nearly everything in this guide before it becomes an incident.

| Check | Looking for | Level |
|---|---|---|
| Is `catchup=False` unless a backfill is intended? | No accidental flood of runs | Beginner |
| Does the DAG use `{{ ds }}` rather than `now()`? | Reruns and backfills are reproducible | Beginner |
| Are tasks idempotent — delete the partition, then write? | Retries and backfills are safe | Beginner |
| Are `retries` and `retry_delay` set? | Transient failures self-heal | Beginner |
| Is `execution_timeout` set on every task? | A hung task cannot hold a slot forever | Beginner |
| Is `dagrun_timeout` set? | A stuck run cannot pile up intervals | Beginner |
| Is `max_active_runs` set on anything that writes? | No concurrent writers to one table | Beginner |
| Is XCom carrying metadata only? | The metadata database stays healthy | Beginner |
| Are credentials in a Connection, never in code? | No secret in the repository | Beginner |
| Is there **no** top-level query, API call, or heavy import? | The scheduler stays fast | Beginner |
| Are sensors deferrable, or at least `reschedule` with a timeout? | No worker slots wasted waiting | Mid |
| Do joins after a branch have an explicit trigger rule? | No silent skip cascade | Beginner |
| Are shared external systems protected by a pool? | One DAG cannot exhaust a database | Mid |
| Is there an `on_failure_callback` with a log link? | Alerts are actionable | Mid |
| Does the DAG have `tags`, an owner, and `doc_md`? | Ownership and a runbook exist | Mid |
| Does the integrity test suite pass in CI? | A broken DAG cannot ship | Mid |
| Is the parse time within budget? | No scheduler degradation | Mid |
| Are secrets in a secrets backend, not the metadata DB? | Rotation, scoping, and an audit trail | Senior |
| Is per-DAG access control set for multi-team deployments? | Teams cannot trigger each other's pipelines | Senior |
| Is `db clean` scheduled? | The database does not become the ceiling | Senior |
| Is scheduler heartbeat alerting in place? | Silence is detected | Senior |
| Do backfills run in a constrained pool at low priority? | Production is not collateral damage | Senior |
| Does the heavy work happen outside the worker? | Airflow orchestrates rather than computes | Senior |

<div class="callout tip">
  <span class="ct">Automate the mechanical half</span>
  Most of the Beginner and Mid rows are machine-checkable from the <code>DagBag</code>: retries, timeouts, tags, owner, <code>doc_md</code>, <code>catchup</code>, and parse time. Put them in the integrity test and reserve human review for the judgement calls — is this task genuinely idempotent, is that pool size right, should this work be in a worker at all.
</div>

## The complete picture

The series' final artefact — every level's topics, hardened. Nothing in it is new.

```python dags/events_platform.py
"""
### Events platform pipeline
**Owner:** data-platform · **Consumers:** exec dashboard, ML features
**SLO:** green by 07:00 UTC, 99% of days.
**On failure:** idempotent — safe to clear and rerun any interval.
**Escalate:** #data-oncall if not green by 07:30 UTC.
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

from company_airflow.callbacks import slack_alert      # the shared library
from company_airflow.operators import RowCountCheckOperator

EVENTS = Dataset("postgres://warehouse/analytics.daily_events")

default_args = {
    "owner": "data-platform",
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
    "retry_exponential_backoff": True,
    "max_retry_delay": timedelta(minutes=30),
    "execution_timeout": timedelta(minutes=30),   # no task holds a slot forever
    "on_failure_callback": slack_alert,           # actionable, with a log link
    "sla": timedelta(hours=2),
}

@dag(
    dag_id="events_platform",
    schedule=CronTriggerTimetable("0 2 * * *", timezone="Europe/Berlin"),
    start_date=datetime(2024, 1, 1),
    catchup=False,                                # backfill deliberately
    default_args=default_args,
    dagrun_timeout=timedelta(hours=4),
    max_active_runs=1,                            # one writer per table
    max_active_tasks=12,                          # do not starve other teams
    tags=["production", "events", "tier-1"],
    doc_md=__doc__,
    # Only this team may trigger or edit; others may look.
    access_control={
        "team_data_platform": {"can_read", "can_edit"},
        "Viewer": {"can_read"},
    },
    params={
        "full_refresh": Param(False, type="boolean", title="Full refresh"),
        "batch_size": Param(5000, type="integer", minimum=100, maximum=50_000),
    },
    on_failure_callback=slack_alert,
)
def events_platform():

    start = EmptyOperator(task_id="start")

    # Deferrable: zero worker slots held for up to three hours of waiting.
    wait = S3KeySensor(
        task_id="wait_for_landing",
        bucket_name="raw-data",
        bucket_key="events/{{ ds }}/_SUCCESS",
        aws_conn_id="aws_raw",          # resolved from the secrets backend
        deferrable=True,
        poke_interval=60,
        timeout=60 * 60 * 3,
    )

    @task
    def list_partitions() -> list[str]:
        """Run-time listing. Nothing at module level touches the network."""
        return S3Hook(aws_conn_id="aws_raw").list_keys(
            bucket_name="raw-data", prefix="events/{{ ds }}/part-"
        )

    @task(pool="warehouse_writes", pool_slots=1, priority_weight=10)
    def load_partition(key: str) -> int:
        """Pooled: the warehouse's connection limit is respected cluster-wide.
        Each partition retries independently."""
        return copy_into_staging(key)

    @task_group(group_id="quality")
    def quality(counts: list[int]):
        # A data problem will not fix itself: this raises AirflowFailException.
        RowCountCheckOperator(
            task_id="row_count",
            conn_id="warehouse",
            table="staging.events",
            day="{{ ds }}",
            min_rows=1000,
        )

        @task
        def totals(c: list[int]) -> int:
            return sum(c)

        totals(counts)

    # Idempotent: DELETE the partition then INSERT. Publishes the dataset.
    rollup = SQLExecuteQueryOperator(
        task_id="rollup",
        conn_id="warehouse",
        sql="sql/daily_rollup.sql",
        params={"lookback_days": 7},
        outlets=[EVENTS],                 # downstream DAGs are data-scheduled
    )

    cleanup = EmptyOperator(task_id="cleanup", trigger_rule=TriggerRule.ALL_DONE)
    end = EmptyOperator(task_id="end")

    counts = load_partition.expand(key=list_partitions())
    start >> wait >> counts
    quality(counts) >> rollup >> cleanup >> end

events_platform()
```

```ini airflow.cfg — the platform side
[core]
executor = CeleryKubernetesExecutor
parallelism = 128
max_active_tasks_per_dag = 16
hide_sensitive_var_conn_fields = True

[secrets]
backend = airflow.providers.hashicorp.secrets.vault.VaultBackend

[scheduler]
parsing_processes = 4
min_file_process_interval = 120        # cheapest parsing win there is
use_row_level_locking = True           # multiple active schedulers

[metrics]
statsd_on = True                       # loop duration, starving tasks, parse time

[webserver]
rbac = True
expose_config = False
```

```bash
# Verify, do not assume
airflow jobs check --job-type SchedulerJob      # is the scheduler alive?
airflow dags report                              # parse-time distribution
airflow dags list-import-errors                  # anything broken right now?
airflow pools list                               # used vs total slots
airflow db clean --dry-run --clean-before-timestamp $(date -d '90 days ago' -I)
```

<div class="guide-try">
  <span class="ct">Try it — the final exercise</span>
  <ol>
    <li>Build this end to end on a real pipeline: a secrets backend, a deferrable sensor, pooled writes, dataset publication, per-DAG access control, and the shared library.</li>
    <li>Verify each control actively rather than trusting it: confirm the deferred sensor holds no worker slot; confirm the pool caps concurrency regardless of cluster capacity; confirm a low-privilege user cannot trigger it; confirm deleting the connection from the UI does not break it.</li>
    <li>Reproduce a run from three months ago by clearing that interval, and confirm the output is identical rather than duplicated.</li>
    <li>Then hand it to a colleague and ask them to run the review checklist against it.</li>
  </ol>
  <em>several refusals and one successful historical rerun. A control you have never watched refuse anything is decoration — step two is the difference between a pipeline that looks governed and one that is. The colleague review will find something you did not, which is the point.</em>
</div>

## Where the series leaves you

Across the three levels you have gone from a first three-task DAG to owning Airflow as a platform. The same topics carried all the way through, each time with more depth:

<div class="flow">
  <div class="node">BEGINNER<small>make it run</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">MID<small>make it efficient and reusable</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">SENIOR<small>make it safe, scalable, affordable</small></div>
</div>

You should now be able to look at an Airflow deployment and see not just what it does but what it **guarantees**: whether a run from last quarter can be reproduced, whether a hung task can take the cluster with it, who can read which credential, which component will saturate first and what the metric for it is, what it costs and how much of that is idle, whether a broken DAG can reach production, and whether anyone finds out when the scheduler stops.

| Can you… | |
|---|---|
| Say why DAG-folder write access is administrative access? | A DAG file is arbitrary Python on your workers |
| Name what RBAC does *not* isolate? | Task code and credentials between teams |
| Give the honest answer on multi-tenancy? | Hostile tenants need separate deployments |
| Say what a secrets backend buys you? | Rotation, per-team scoping, an audit trail |
| Name the four scaling bottlenecks and their metrics? | Parsing, scheduler loop, database, workers |
| Give the cheapest parsing win? | Raise `min_file_process_interval` |
| Say what is almost always the real ceiling? | The metadata database — retention, not size |
| Name the biggest cost lever? | Deferrable operators, then autoscaling on queue depth |
| Give the one alert every deployment needs? | Scheduler heartbeat age |
| Say what the rollback plan for `db migrate` is? | A tested backup — there is no downgrade |
| Explain the split between platform and pipeline SLOs? | Punctuality is platform; correctness is the owner |
| Name the first move when nothing is running? | `airflow jobs check` — silence, not failure |
| Say what a task queued forever with no error means? | Often a `queue` no worker consumes |
| Say where Airflow stops? | Streaming, sub-second latency, in-worker compute |
| Give the honest answer to "should we migrate off"? | Usually the practices, not the tool |

That review instinct is the most valuable thing in this guide, because — exactly as with containers and data versioning — most orchestration incidents are prevented at review time rather than at 3am.
