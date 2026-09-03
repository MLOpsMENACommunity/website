This is part three of three. It closes the series by taking **every topic from Beginner and Mid one level further** — each one now has a security, scale, or ownership dimension — and adds the work you own when ClearML is your team's platform rather than your tool.

Up to this point the questions have been about making a run reproduce. From here they are different: who can enqueue code onto your GPU fleet, whether a model from eighteen months ago can still be rebuilt and proven, what the platform costs and who pays for it, which component breaks first when the team triples, what happens when Elasticsearch fills up on a Friday night, and where ClearML stops being the right tool.

## Where this picks up

| Topic from earlier levels | What this level adds |
|---|---|
| The hosted server | **Self-hosted deployment**: three data stores, storage, TLS, and who owns upgrades |
| Credentials | The **trust model**: enqueue is code execution; scoped keys, service accounts, rotation |
| Projects and tags | Multi-tenancy, RBAC, quota, and isolation between teams |
| `output_uri` | A real storage architecture: buckets, lifecycle, egress, and retention policy |
| Agent caches | Fleet economics: autoscalers, spot instances, GPU utilisation as a metric |
| Scalars and Elasticsearch | Capacity planning, index growth, and what breaks first |
| `dvc`-free reproducibility | Environment pinning to the image digest, and rebuild verification |
| The registry | Lineage and audit that satisfies a reviewer or a regulator |
| Datasets | Erasure requests against an immutable, content-addressed store |
| CI | Fork trust, ephemeral runners, and enqueue as a privileged operation |
| Debugging | Incident playbooks: lost server, corrupted index, unreproducible model |
| — **new** — | Backup and restore · upgrade procedure · platform ownership · where ClearML ends |

I am starting with the trust model, because every other decision in this track depends on it.

## The trust model: enqueue is code execution

The single most important sentence about ClearML security: **enqueueing a task is arbitrary code execution on your agents.** A task carries a repository, a commit, a diff, a package list, and an entry point. An agent claims it and runs it. Anyone who can enqueue can run code on your GPU fleet, with whatever credentials that fleet holds.

That reframes the whole access question. It is not "who can see the experiments" — it is "who can execute".

<div class="guide-arch" style="--arch-cols:3">
  <div class="arch-lane" style="--lane-cols:3">
    <span class="arch-label">who can enqueue — this is the execution surface</span>
    <div class="arch-node"><b>Researcher</b><small>Enqueue to <code>cpu</code>/<code>gpu</code>. Never to serving or production queues</small></div>
    <div class="arch-node" data-kind="worker"><b>CI on a protected branch</b><small>Enqueue to <code>ci</code> only. No production cloud credentials</small></div>
    <div class="arch-node" data-kind="danger"><b>CI on a fork PR</b><small><b>Nothing</b>, or an isolated ephemeral queue holding no other access</small></div>
  </div>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down" data-flow="optional"></i>
  <div class="arch-lane" style="--lane-cols:3">
    <span class="arch-label">queues as the security boundary — one agent pool per trust level</span>
    <div class="arch-node" data-kind="store"><b><code>services</code></b><small>Platform team + schedulers · registry read/write</small></div>
    <div class="arch-node" data-kind="store"><b><code>cpu</code> · <code>gpu</code></b><small>Researchers · data read, artifact write</small></div>
    <div class="arch-node" data-kind="store"><b><code>ci-untrusted</code></b><small>Ephemeral hosts · <b>no credentials at all</b></small></div>
  </div>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down"></i>
  <div class="arch-node" data-kind="danger"><b>Keys are workspace-wide</b><small>One leaked researcher pair reads every experiment, dataset pointer, and model — and can enqueue</small></div>
  <div class="arch-node" data-kind="danger"><b>The diff is on the server</b><small>An untracked <code>.env</code> in your tree lands in the task record, and in your backups</small></div>
  <div class="arch-node" data-kind="danger"><b>Agents hold ambient creds</b><small>Any task landing on a worker inherits that worker's cloud access</small></div>
  <p class="arch-note"><b>The three rows at the bottom compose into one risk:</b> a workspace-wide key plus an agent with production credentials means whoever holds that key can run code with that access. Queue-level isolation is therefore a security control rather than tidiness — and fork pull requests are the case where it matters most.</p>
</div>

| Actor | Needs | Must not have |
|---|---|---|
| A researcher | Read all; write own tasks; enqueue to `cpu`/`gpu` | Enqueue to production or serving queues |
| CI on a protected branch | Create and enqueue to `ci`; read models | Enqueue to `gpu` with production credentials |
| CI on a fork pull request | **Nothing**, or an isolated ephemeral queue | Any workspace credential |
| An agent host | Its own worker credentials; read the repo; write artifacts | Delete on the artifact bucket |
| A serving service | Read the registry; read model artifacts | Write anything |
| A retention job | Delete, scoped and audited | Write or enqueue |
| A vendor or contractor | Read on one project | Enqueue anywhere |

Three properties of ClearML's model make this sharper than it first looks:

**An access/secret pair is workspace-wide by default.** It is not scoped to a project. A leaked researcher key reads every experiment, every dataset pointer, and every model in the workspace — and can enqueue.

**The uncommitted diff is stored on the server.** That is the feature that makes a dirty working tree reproducible. It also means anything sitting in your working tree at run time — a `.env` you forgot to gitignore, a notebook with a pasted token — is now in the task record, readable by everyone with workspace access, and captured in your backups.

**Agents hold ambient credentials.** A GPU worker typically has cloud credentials so it can read datasets and write artifacts. Any task that lands on it inherits them. That is precisely why fork pull requests are dangerous and why queue-level isolation is a security control, not tidiness.

<div class="callout warn">
  <span class="ct">The most dangerous configuration in ClearML</span>
  A public repository with a <code>pull_request</code> workflow that holds workspace credentials and enqueues to a queue whose agents have production cloud credentials. Any stranger who opens a pull request gets code execution with those credentials. Fork builds must run on ephemeral agents in an isolated queue with no other access, or be gated behind explicit human approval before they can execute.
</div>

The access shape that actually works:

```text queues as a security boundary
services     ← enqueue: platform team + schedulers only.  Creds: registry read/write
gpu          ← enqueue: researchers.                      Creds: data read, artifact write
cpu          ← enqueue: researchers.                      Creds: data read, artifact write
ci           ← enqueue: CI on protected branches.         Creds: artifact write only
ci-untrusted ← enqueue: fork PRs after approval.          Creds: NONE. Ephemeral hosts
serving      ← enqueue: platform team only.               Creds: registry read
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>List every place a ClearML access/secret pair exists: laptops, CI secrets, agent hosts, notebooks, docs. Count them.</li>
    <li>For each one, write down what it can do. Note how many are workspace-wide when they only needed one project.</li>
    <li>Open three recent tasks and read Execution &rarr; Uncommitted Changes. Look for anything that should not be there.</li>
    <li>Check whether a fork pull request in any public repository can reach a queue whose agents hold cloud credentials.</li>
  </ol>
  <em>more credentials than expected, all broader than needed, and — in step three — at least one diff containing something you would rather not have stored. Step four is the one to fix today if the answer is yes.</em>
</div>

## Credentials, service accounts, and rotation

At Mid the goal was "not committed". At this level the goal is **short-lived, scoped, and attributable**.

```bash
# Per-purpose credentials, never shared. Each is separately revocable.
# Settings → Workspace → App Credentials, one per:
#   - each CI pipeline
#   - each agent pool
#   - each serving service
#   - each human (personal, never in automation)
```

```yaml agent host: credentials from the environment, not a file
# systemd unit or Kubernetes secret — nothing on disk in a home directory
Environment=CLEARML_API_HOST=https://clearml.internal/api
Environment=CLEARML_WEB_HOST=https://clearml.internal
Environment=CLEARML_FILES_HOST=https://clearml.internal/files
Environment=CLEARML_API_ACCESS_KEY=...      # from the secret store
Environment=CLEARML_API_SECRET_KEY=...
Environment=CLEARML_WORKER_ID=gpu-a100-01   # attributable in Workers & Queues
```

For the cloud credentials the agent needs, the goal is that there is nothing to store at all:

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Workload identity</h4>
    <ul>
      <li>The agent's node identity grants bucket access</li>
      <li>IRSA on EKS, workload identity on GKE, instance profiles on EC2</li>
      <li>Nothing on disk, nothing to rotate, nothing to leak</li>
      <li>Scoped per node pool, so a queue's access is a cluster policy</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Long-lived keys in <code>clearml.conf</code></h4>
    <ul>
      <li>A file on every worker, readable by every task on it</li>
      <li>Rotation means touching every host</li>
      <li>Any task that lands there inherits full access</li>
      <li>Present in backups and in machine images</li>
    </ul>
  </div>
</div>

| Control | Why it matters |
|---|---|
| One credential per purpose | Revocation is surgical, and the audit log names a caller |
| `CLEARML_WORKER_ID` set explicitly | A misbehaving worker is identifiable rather than "worker-3" |
| Workload identity for cloud access | The agent's bucket access is a cluster policy, not a file |
| Rotation on a schedule, with a drill | An unexercised rotation procedure does not work when you need it |
| Secrets in a real store | Vault, Secrets Manager, or sealed secrets — never a repo or a wiki |
| `.env` files gitignored, and verified | Otherwise they land in the stored diff of every run |

<div class="callout warn">
  <span class="ct">The stored diff is a secret-exfiltration path nobody checks</span>
  ClearML captures your uncommitted working tree so a dirty run is reproducible. A <code>.env</code>, a service-account JSON, or a notebook with a pasted token that is present but untracked ends up in the task record — visible to the whole workspace and persisted in backups. Add a pre-run check, gitignore aggressively, and if it happens, remember that deleting the task is the only remediation and the credential must still be rotated.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Create a purpose-scoped credential for one CI pipeline and switch that pipeline to it. Confirm the old shared key is now unused.</li>
    <li>Revoke a credential and watch exactly what fails. That is your blast radius.</li>
    <li>Move one agent pool to workload identity and confirm it can still read data and write artifacts with no keys on disk.</li>
    <li>Deliberately leave an untracked <code>secrets.txt</code> in a working tree, run a task, and find it in the stored diff.</li>
  </ol>
  <em>step four is the demonstration that changes behaviour. Seeing your own file contents in a task's Uncommitted Changes tab is more persuasive than any policy document, and it takes thirty seconds.</em>
</div>

## Self-hosting: what you actually own

The hosted server hides five components. Self-hosting means owning all of them, plus their failure modes.

<div class="flow">
  <div class="node">WEB<small>8080</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">API<small>8008</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">MONGO<small>metadata</small></div>
  <div class="node">ELASTIC<small>metrics, logs</small></div>
  <div class="node">REDIS<small>ephemeral</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">FILES<small>8081 or S3</small></div>
</div>

| Component | Holds | If it dies | Growth driver |
|---|---|---|---|
| **MongoDB** | Tasks, projects, models, users, queues | Everything stops; this is the system of record | Task count |
| **Elasticsearch** | Scalars, plots, console logs | Metrics and logs unavailable; tasks still run | Reporting rate × runs |
| **Redis** | Locks, ephemeral worker state | Workers misbehave; usually self-healing | Fixed, small |
| **API server** | Stateless | Stateless — restart or scale out | — |
| **Web server** | Stateless | UI down; agents keep running | — |
| **File server** | Artifacts, models, debug images | Artifacts unreadable; **replace it with S3** | Artifact volume |

```yaml docker-compose.yml — the parts that matter
services:
  elasticsearch:
    image: elasticsearch:8.x
    environment:
      ES_JAVA_OPTS: "-Xms4g -Xmx4g"        # ≤ 50% of container RAM, and never > 31g
      bootstrap.memory_lock: "true"
      cluster.routing.allocation.disk.watermark.low: "90%"
      cluster.routing.allocation.disk.watermark.high: "95%"
    volumes: ['/opt/clearml/data/elastic_7:/usr/share/elasticsearch/data']

  mongo:
    image: mongo:6.x
    volumes: ['/opt/clearml/data/mongo_4/db:/data/db']

  apiserver:
    image: allegroai/clearml:latest
    environment:
      CLEARML__services__async_urls_delete__enabled: "true"   # actually free storage
    depends_on: [mongo, elasticsearch, redis]
```

<div class="callout warn">
  <span class="ct">Elasticsearch is what breaks first, and disk is why</span>
  Metrics and console logs grow with every run and never shrink on their own. When the high disk watermark is crossed, Elasticsearch marks indices read-only, and the symptom is that <em>experiments stop reporting metrics while training continues</em> — a silent, confusing failure. Monitor disk on the Elasticsearch volume as your primary platform alert, and know the read-only-block release command before you need it.
</div>

```bash
# The three health checks worth having on a dashboard
curl -s localhost:8008/debug.ping
curl -s 'localhost:9200/_cluster/health?pretty' | grep -E 'status|unassigned'
curl -s 'localhost:9200/_cat/indices?v&h=index,docs.count,store.size&s=store.size:desc' | head

# Release a read-only block after clearing disk space
curl -X PUT 'localhost:9200/_all/_settings' -H 'Content-Type: application/json' \
  -d '{"index.blocks.read_only_allow_delete": null}'
```

Non-negotiables for a server anyone else depends on:

| Requirement | Why |
|---|---|
| TLS terminated at a reverse proxy | Credentials and payloads cross the network in the clear otherwise |
| Artifacts in S3, not the file server | The file server is a single disk with no lifecycle or replication |
| Separate volumes for Mongo and Elastic | One filling up must not take the other down |
| Backups of Mongo **and** Elastic, tested | Mongo alone restores tasks with no metrics or logs |
| Pinned server image tag | `latest` means an unplanned migration on the next restart |
| Disk, memory, and cluster-health alerts | Elasticsearch read-only is silent from the user's side |

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>On a test instance, list the Elasticsearch indices by size and identify what is actually growing.</li>
    <li>Fill the Elasticsearch volume past the high watermark on purpose and observe what a running task does. Then release the block.</li>
    <li>Confirm your artifacts go to S3 rather than the file server, by reading an artifact's URL.</li>
    <li>Check whether your server image is pinned or on <code>latest</code>.</li>
  </ol>
  <em>metrics silently stopping while training continues, which is the failure you must recognise instantly. Step four is a thirty-second check that prevents an unplanned migration during someone else's deadline.</em>
</div>

## Backup, restore, and upgrades

The question is not whether you have backups. It is whether you have restored one.

A ClearML backup has **three** parts, and taking only the first is the common mistake:

<ol class="guide-steps">
  <li><b>MongoDB</b><code>mongodump</code> of the <code>backend</code> and <code>auth</code> databases. This is the system of record: tasks, projects, models, users, queues.</li>
  <li><b>Elasticsearch</b>A snapshot to a repository. Without it a restore gives you tasks with no scalars, no plots, and no console logs.</li>
  <li><b>Artifact storage</b>Your bucket, with versioning enabled. If you still use the file server, its volume.</li>
</ol>

```bash
# 1. Mongo
docker exec clearml-mongo mongodump --archive=/tmp/mongo.gz --gzip \
  --db backend --db auth
docker cp clearml-mongo:/tmp/mongo.gz ./backup/

# 2. Elasticsearch — register a repository once, then snapshot
curl -X PUT 'localhost:9200/_snapshot/backups' -H 'Content-Type: application/json' -d '
{"type":"fs","settings":{"location":"/usr/share/elasticsearch/snapshots"}}'
curl -X PUT "localhost:9200/_snapshot/backups/snap-$(date +%F)?wait_for_completion=true"

# 3. Config
cp -r /opt/clearml/config ./backup/config
```

The restore drill is the part that matters, and it must be rehearsed on a separate host:

```bash
docker compose down
docker exec -i clearml-mongo mongorestore --archive --gzip < ./backup/mongo.gz
curl -X POST "localhost:9200/_snapshot/backups/snap-2026-08-01/_restore"
docker compose up -d
# Then verify, in this order:
#   1. Can you log in?
#   2. Does a known task still show its scalars?          ← proves Elastic restored
#   3. Can you download a known artifact?                 ← proves storage config
#   4. Can an agent claim a queued task?                  ← proves the fleet reconnects
```

Upgrades follow the same discipline, because a server upgrade runs data migrations:

| Step | Detail |
|---|---|
| Read the release notes for **every** version you skip | Migrations are cumulative and some are one-way |
| Back up all three stores first | An interrupted migration is why you have backups |
| Pin the target tag, never `latest` | So the change is deliberate and repeatable |
| Upgrade the server before the agents | New agents may require newer API endpoints |
| Keep SDK and agent versions paired | An SDK ahead of the server can send fields it rejects |
| Announce a window | Agents survive a short API outage; running tasks buffer, but not forever |

<div class="callout warn">
  <span class="ct">Elasticsearch snapshots are the part people skip, and metrics are unrecoverable without them</span>
  A Mongo-only backup restores a complete-looking system: every task, every model, every parameter — and empty Scalars tabs, because scalars, plots, and console output live in Elasticsearch. You discover this during the restore, which is the worst possible time. If you take one thing from this section, take this.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Take all three backups today. Note how long each takes and how large it is.</li>
    <li>Restore them onto a scratch host and run the four verification steps in order.</li>
    <li>Specifically confirm that a task's scalars came back. If they did not, your Elasticsearch snapshot is missing or broken.</li>
    <li>Write down your measured RTO — from "the server is gone" to "an agent claimed a task" — and tell your team the number.</li>
  </ol>
  <em>a real recovery time instead of an assumed one, and often a missing Elasticsearch snapshot. Step four is what turns "we have backups" into a commitment somebody can plan around.</em>
</div>

## Multi-tenancy, RBAC, and quota

One workspace shared by four teams degrades predictably: a flat project list nobody can navigate, a GPU queue one team monopolises, and no way to tell who spent the storage.

The open-source server has a **single workspace and no role-based access control** — every user with credentials can see and do everything. That is a real limitation and you should state it plainly rather than discover it during a security review. RBAC, multiple workspaces, and per-user permissions are paid-tier features.

What you can do with the open-source server:

| Control | Mechanism | Limit |
|---|---|---|
| Structure | Nested projects: `team/subteam/purpose` | Convention only; nothing enforces it |
| Scheduling fairness | Separate queues per team, with fixed worker counts | Workers are the quota |
| Execution isolation | Separate agent pools with separate cloud credentials | The strongest control available |
| Attribution | Mandatory tags for team and cost centre, set in code | Convention, but auditable |
| Storage isolation | A bucket prefix per team, with its own lifecycle rules | Enforced by cloud IAM, not by ClearML |
| Hard isolation | **A separate ClearML server per tenant** | Real cost, real operational duplication |

```text a workable convention for one shared server
projects:
  platform/…            ← pipelines, schedulers, serving control
  team-vision/…         ← their experiments
  team-nlp/…
  datasets/…            ← shared, write-restricted by process
queues:
  vision-gpu (2 workers) · nlp-gpu (2 workers) · shared-gpu (2, spot) · services (1)
storage:
  s3://ml-artifacts/team-vision/…   lifecycle: 90d → IA, 365d → delete
  s3://ml-artifacts/team-nlp/…
  s3://ml-datasets/…                versioning on, write-restricted
```

```python enforce attribution at the SDK level
# In a shared internal wrapper every team imports:
def init_task(project: str, name: str, **kwargs):
    team = os.environ["ML_TEAM"]                       # from the environment
    task = Task.init(project_name=f"{team}/{project}", task_name=name,
                     output_uri=f"s3://ml-artifacts/{team}/clearml", **kwargs)
    task.add_tags([f"team:{team}", f"cost-centre:{os.environ['ML_COST_CENTRE']}"])
    return task
```

<div class="callout tip">
  <span class="ct">A thin internal wrapper is the highest-leverage governance tool you have</span>
  Twenty lines that set the project prefix, the <code>output_uri</code>, the mandatory tags, and the docker image turn every convention in this section into a default. It is far more effective than documentation, because nobody has to remember anything — and it gives you one place to change when the storage layout or the tag vocabulary changes.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Sort your workspace's projects by task count and see whether the structure reflects teams or accidents.</li>
    <li>Check whether one team can currently occupy every GPU worker. If so, split the queues.</li>
    <li>Try to answer "how much storage did team X use last month" from the data you have today.</li>
    <li>Write the wrapper above and switch one team's scripts to it.</li>
  </ol>
  <em>step three is usually impossible without prefixes and tags, which is exactly the point: cost attribution has to be designed in before the bill arrives, because it cannot be reconstructed retroactively.</em>
</div>

## Cost: what the platform actually costs

Four cost centres, and only one of them is usually noticed.

| Centre | Driver | Control |
|---|---|---|
| **GPU-hours** | Trials × epochs × idle time | HPO budgets, autoscaling, session timeouts, utilisation monitoring |
| **Artifact storage** | Checkpoints per run × runs × retention | Keep best+last, lifecycle rules, `save_top_k_tasks_only` |
| **Dataset storage** | Versions × copies | `add_external_files`, squashing, deduplication |
| **Server infrastructure** | Task count and reporting rate → Mongo and Elastic disk | Retention policy, reporting discipline |
| **Egress** | Cross-region and cross-cloud data movement | Co-locate compute and storage |

Idle GPU time is nearly always the largest single line, and it is invisible unless you measure it:

```python a weekly utilisation report, itself a scheduled task
from datetime import datetime, timedelta
from clearml import Task

week = datetime.utcnow() - timedelta(days=7)
tasks = Task.get_tasks(task_filter={"status": ["completed", "failed", "aborted"]})

gpu_seconds, wasted = 0.0, 0.0
for t in tasks:
    if t.data.last_update < week or "gpu" not in (t.data.execution.queue or ""):
        continue
    runtime = (t.data.completed - t.data.started).total_seconds()
    gpu_seconds += runtime
    if t.status in ("failed", "aborted"):
        wasted += runtime

print(f"GPU hours: {gpu_seconds/3600:.1f}  wasted on failed/aborted: {wasted/3600:.1f}")
```

| Waste source | Typical share | Fix |
|---|---|---|
| Abandoned interactive sessions | Often the largest | Session timeout; a report naming the owner |
| Failed runs that fail late | Large and demoralising | Fail fast: validate config and data access in the first minute |
| Sweeps with no pruning | Silent and total | Verify the objective; `min`/`max_iteration_per_job` |
| Checkpoints every epoch | Storage, not compute | Best + last only |
| Workers idle between bursts | Real money on cloud GPUs | Autoscaler with a scale-to-zero floor |

```python autoscaler sketch — a services task that watches queue depth
from clearml.automation.auto_scaler import AutoScaler, CloudDriver

AutoScaler(
    hyper_params=AutoScaler.Settings(
        max_idle_time_min=10,          # terminate an idle instance after 10 minutes
        polling_interval_time_min=2,
        max_spin_up_time_min=25,
        workers_prefix="dyn",
    ),
    driver=CloudDriver(...),           # AWS/GCP driver with instance types per queue
).start()
```

<div class="callout warn">
  <span class="ct">Spot instances need <code>retry_on_failure</code>, or you have bought cheaper failures</span>
  Preemption terminates a task mid-run. Without retries at the pipeline level and periodic checkpointing plus <code>continue_last_task</code> in the training code, a 70%-cheaper instance that dies at epoch 90 of 100 costs more than an on-demand one. Spot is only cheap for jobs that can resume.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run the utilisation report and compare GPU-hours consumed against hours that produced a completed run.</li>
    <li>List every running <code>clearml-session</code> and how long each has been up. Name the owners.</li>
    <li>Total your artifact bucket and work out what fraction is sweep trials that were never promoted.</li>
    <li>Price one week of your GPU fleet at on-demand, spot with retries, and autoscaled-to-zero.</li>
  </ol>
  <em>the failed-and-abandoned share is usually shocking the first time anyone measures it. Step two is the fastest win available: idle sessions are pure waste and the fix is a timeout plus a weekly report naming names.</em>
</div>

## Scale: which component breaks first

Growth arrives in four dimensions, and each one breaks something different. Knowing the order lets you fix the right thing.

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>1</span><strong>Reporting rate</strong><small>Per-batch scalars from many concurrent runs. Elasticsearch write pressure; scalars lag, then indices go read-only.</small></div>
  <div class="guide-timeline-item"><span>2</span><strong>Task count</strong><small>Hundreds of thousands of tasks. MongoDB queries slow; the experiments table and search get sluggish.</small></div>
  <div class="guide-timeline-item"><span>3</span><strong>Artifact volume</strong><small>Storage cost, and the file server's single disk if you never moved to S3.</small></div>
  <div class="guide-timeline-item"><span>4</span><strong>Worker count</strong><small>Hundreds of agents long-polling. API server CPU; scale it horizontally, it is stateless.</small></div>
</div>

| Dimension | First symptom | Fix in order |
|---|---|---|
| Reporting rate | Scalars minutes behind | Report per epoch not per batch → more Elastic RAM/disk → separate the cluster |
| Task count | Slow table and search | Archive and delete old CI/sweep tasks → Mongo resources → retention policy |
| Artifact volume | Bill, or a full file-server disk | `output_uri` to S3 → lifecycle rules → keep best+last only |
| Worker count | API latency, claim delays | Scale API replicas → tune polling interval → shard by server if truly huge |
| Console log volume | Elastic disk | Do not print in a tight loop; log at a sane level |

Reporting discipline is the cheapest and most effective lever, and it is a code change rather than an infrastructure one:

```python
# Bad: 500k Elasticsearch writes for a curve nobody zooms into that far
for step, batch in enumerate(loader):
    logger.report_scalar("loss", "train", loss, step)

# Good: per epoch, plus a moving average within the epoch
for epoch in range(epochs):
    epoch_loss = train_one_epoch()
    logger.report_scalar("loss", "train", epoch_loss, epoch)

# When you genuinely need intra-epoch resolution, sample it
if step % 100 == 0:
    logger.report_scalar("loss", "train_batches", loss, step)
```

Retention is what keeps Mongo and Elastic bounded. It has to be a scheduled task, because nobody does it by hand:

```python ops/retention.py — a services task on a schedule
from datetime import datetime, timedelta
from clearml import Task

RULES = [
    ("vision/ci",          30,  ("failed", "aborted", "completed")),
    ("vision/hpo",         60,  ("failed", "aborted")),
    ("vision/experiments", 365, ("failed", "aborted")),
]

for project, days, statuses in RULES:
    cutoff = datetime.utcnow() - timedelta(days=days)
    for t in Task.get_tasks(project_name=project):
        if t.data.last_update >= cutoff or t.status not in statuses:
            continue
        if set(t.get_tags()) & {"keep", "published", "paper"}:
            continue                       # an explicit exemption, always needed
        print(f"delete {t.id} {t.name}")
        # t.delete(delete_artifacts_and_models=True)   ← enable after a dry run
```

<div class="callout warn">
  <span class="ct">Never let a retention job delete anything a model still needs</span>
  Deleting a training task can remove the artifacts and weights a registered — possibly production — model points at. Exempt any task that produced a published model, anything tagged <code>keep</code>, and anything referenced by a model still in the registry. Run in report-only mode for a full cycle, publish the list, and only then enable deletion.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Find your highest-reporting task and count its scalar points. Compare it against a per-epoch equivalent.</li>
    <li>Count tasks by project and identify what is actually filling the system. It is usually CI and sweeps.</li>
    <li>Run the retention script in report-only mode and read the list, plus the total artifact size it would free.</li>
    <li>Check the exemption logic against a task that produced a published model.</li>
  </ol>
  <em>the count in step one is usually two orders of magnitude larger than anyone expects. Step four is the one that prevents an incident: a retention job that deletes a production model's weights is a self-inflicted outage with no undo.</em>
</div>

## Reproducibility that survives eighteen months

ClearML records the commit, the diff, and the Python packages. That is necessary and not sufficient. Everything below the Python layer is unpinned unless you pin it.

| Layer | Recorded by default | How to pin it |
|---|---|---|
| Application code | Yes — commit + diff | Nothing more needed |
| Python packages | Yes — but as detected names/versions | A hash-pinned lock file, committed |
| Python version | Yes, recorded | The base image |
| CUDA, cuDNN, drivers | No | The base image **digest** |
| System libraries | No | The base image digest |
| Data | Only if you used a Dataset | Dataset version, consumed with `alias` |
| Random seeds | Only if you connected them | A connected parameter |
| Non-determinism in the framework | No | `torch.use_deterministic_algorithms(True)`, or accept and record it |

```python the pinning pass, in full
task.set_base_docker(
    # A digest, not a tag. Tags move; digests do not.
    "myregistry/train@sha256:9f2c4b19e0a7d3f1c6b8a2e4d7091f3b8a2e4d7091f3b8a2e4d7091f3b8a2e",
    docker_arguments="--shm-size=8g",
)
task.set_packages("requirements.lock")           # hash-pinned, committed

env = task.connect({"seed": 42, "deterministic": True}, name="reproducibility")
torch.manual_seed(env["seed"]); np.random.seed(env["seed"]); random.seed(env["seed"])
if env["deterministic"]:
    torch.use_deterministic_algorithms(True)
    torch.backends.cudnn.benchmark = False

data = Dataset.get(dataset_project="datasets", dataset_name="iris",
                   dataset_version=params["dataset_version"],
                   alias="training data").get_local_copy()
```

And then the part that makes it a claim rather than a hope — a scheduled rebuild of a past release:

```python ops/rebuild_check.py — weekly, on the services queue
from clearml import Task

RELEASE_TASK_ID = "…the task behind the current production model…"
TOLERANCE = 0.002

original = Task.get_task(task_id=RELEASE_TASK_ID)
clone = Task.clone(source_task=original, name=f"rebuild check {original.name}")
Task.enqueue(clone, queue_name="gpu")
clone.wait_for_status(status=("completed", "failed", "aborted"))

def acc(t):
    return t.get_last_scalar_metrics().get("accuracy", {}).get("val", {}).get("last", 0)

delta = abs(acc(clone) - acc(original))
Task.current_task().get_logger().report_single_value("rebuild_delta", delta)
assert clone.status == "completed", f"rebuild failed: {clone.get_output_log_web_page()}"
assert delta <= TOLERANCE, f"rebuild drifted by {delta:.4f}"
```

<div class="callout warn">
  <span class="ct">"We are reproducible" is a claim until something checks it weekly</span>
  Every unpinned layer degrades silently: a base image tag gets rebuilt, a package yanked, a CUDA minor bump changes a kernel. A scheduled rebuild of a past release is the only mechanism that converts reproducibility from an assumption into a monitored property — and the first time it runs, it will fail. That failure is the point.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Take the task behind your current production model. Clone it and run it on an agent today.</li>
    <li>Compare the metric. Write down the delta.</li>
    <li>For every layer in the table above, note whether that task pins it. Count the gaps.</li>
    <li>Fix the base image to a digest and add the lock file, then repeat.</li>
  </ol>
  <em>almost always a failure or a drift on the first attempt, and a short list of unpinned layers. Step three is the deliverable: a named list of gaps is far more useful to your team than a vague sense that reproducibility could be better.</em>
</div>

## Lineage, provenance, and audit

For regulated work — or any post-incident review — you need to answer four questions about a deployed model without a conversation:

<ol class="guide-steps">
  <li><b>What code produced it?</b>The model links to its task; the task records the repository, commit, and diff.</li>
  <li><b>What data produced it?</b>The task's configuration records the dataset id via <code>alias</code>; the dataset records its parents.</li>
  <li><b>What configuration produced it?</b>The task's hyperparameters and configuration objects, as executed.</li>
  <li><b>Who approved it and when?</b>The promotion task: who ran it, what it compared, what threshold it applied, when the tag moved.</li>
</ol>

<div class="flow">
  <div class="node">DATASET<small>version + parents</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">TASK<small>commit + diff + params</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">MODEL<small>metadata + tags</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">PROMOTION<small>gate task, timestamped</small></div>
</div>

The chain only exists if you build it, and a script is what proves it does:

```python ops/lineage.py — the audit answer, generated not narrated
from clearml import Model, Task

def lineage(model_id: str) -> dict:
    m = Model(model_id=model_id)
    t = Task.get_task(task_id=m.task)
    params = t.get_parameters()
    datasets = {k: v for k, v in params.items() if "dataset" in k.lower()}
    return {
        "model": {"id": m.id, "name": m.name, "tags": m.tags,
                  "published": m.published, "metadata": m.get_metadata()},
        "task": {"id": t.id, "name": t.name, "user": t.data.user,
                 "started": str(t.data.started), "status": t.status},
        "code": {"repo": t.data.script.repository,
                 "commit": t.data.script.version_num,
                 "entry": t.data.script.entry_point,
                 "dirty": bool(t.data.script.diff)},
        "data": datasets,
        "container": t.data.container,
    }
```

| Audit requirement | Where it lives | The gap to close |
|---|---|---|
| Code provenance | `task.data.script` | A dirty diff is recorded but not reviewed — flag `dirty: true` |
| Data provenance | Parameters, via `alias` | A run reading a raw path records nothing |
| Approval trail | The promotion task's log and user | Tags moved by hand leave no trail |
| Immutability | `model.publish()` | An unpublished production model can be swapped silently |
| Retention of evidence | Your backups | A retention job that deleted the task breaks the chain |

<div class="callout tip">
  <span class="ct">Make the promotion a task, never a click</span>
  A tag moved by hand in the UI has no reviewable record of what was compared or why. A promotion task has a user, a timestamp, a console log, the candidate and incumbent metrics, and the threshold it applied — which is exactly what an auditor, or you at 2am, needs to read.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run the lineage function against your current production model and read the output.</li>
    <li>Check whether <code>dirty</code> is true. If it is, the exact code is only reconstructable from the stored diff.</li>
    <li>Check whether the <code>data</code> section names a dataset version or is empty.</li>
    <li>Find the record of who promoted that model and what they compared. If it is a Slack message, that is the gap.</li>
  </ol>
  <em>usually a complete code chain, a missing data chain, and no approval record at all. Those two gaps are the difference between tracking experiments and being able to defend a deployed model.</em>
</div>

## Deleting data from a content-addressed, immutable store

An erasure request under GDPR or a similar regime meets ClearML's design head-on. Datasets are immutable by intent, versions have children, and tasks reference them. This is the hardest problem in this track and it is primarily architectural, not operational.

What deletion actually has to touch:

| Location | Contains | Deletable |
|---|---|---|
| Dataset chunks in your bucket | The raw records | Yes, but children break |
| Child dataset versions | Inherit parent chunks | Cascades |
| Task artifacts | Preprocessed copies, predictions | Yes, per task |
| Debug samples | Sample images, often the actual records | Yes, but easily forgotten |
| Model weights | Learned from the data; may be extractable | Effectively no |
| Elasticsearch | Console logs that may have printed records | Reindex or delete indices |
| Backups | Everything, historically | Only by expiring the backups |

<div class="callout warn">
  <span class="ct">Weights are the part you cannot erase</span>
  Removing a subject's records from a dataset does not remove their influence from a trained model, and for some model classes information is extractable. If your regime treats a model as personal data, the only reliable remedy is retraining without those records — which is why the real fix is upstream: keep personal data out of the versioned store in the first place.
</div>

The architecture that makes erasure tractable:

<ol class="guide-steps">
  <li><b>Version derived data, not raw personal data</b>Pseudonymise or aggregate before it enters a ClearML Dataset. The versioned artefact then holds no directly identifying records.</li>
  <li><b>Keep the identity mapping outside ClearML</b>In a system built for deletion — a database with row-level deletes and an audit trail.</li>
  <li><b>Crypto-shredding where raw data must be versioned</b>Encrypt per subject and destroy the key. The bytes remain, the content is unrecoverable, and the deletion is provable.</li>
  <li><b>Never print records to the console</b>Console output goes to Elasticsearch and into your backups, and it is the most commonly forgotten copy.</li>
  <li><b>Bound your backup retention deliberately</b>An indefinite backup is an indefinite copy. Erasure obligations and retention policy have to be reconciled on paper before they collide.</li>
</ol>

```python a deletion runbook that is at least honest about scope
from clearml import Dataset, Task

def find_references(dataset_id: str):
    """Every task whose parameters mention this dataset id."""
    hits = []
    for t in Task.get_tasks():
        if dataset_id in str(t.get_parameters()):
            hits.append((t.id, t.name, t.status))
    return hits

# 1. Enumerate the blast radius BEFORE deleting anything
refs = find_references("…dataset-id…")
print(f"{len(refs)} tasks reference this dataset")

# 2. Enumerate child dataset versions that inherit from it
children = Dataset.list_datasets(dataset_project="datasets", partial_name="iris")

# 3. Only then decide: delete, crypto-shred, or retrain
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Pick one dataset and decide whether a subject could lawfully demand deletion of its contents.</li>
    <li>If yes, run the reference finder and count the tasks and child versions affected.</li>
    <li>List every other copy: task artifacts, debug samples, console logs, backups.</li>
    <li>Write down what you would actually do, and how long it would take, if the request arrived tomorrow.</li>
  </ol>
  <em>the honest answer is usually "we could not do this cleanly", and knowing that before the request arrives is the entire value of the exercise. The architectural fix — versioning derived data only — is cheap now and very expensive later.</em>
</div>

## Incident playbooks

Four incidents you should be able to work through without improvising.

**The server is gone.**

<ol class="guide-steps">
  <li><b>Agents keep running</b>Tasks in progress continue and buffer their reports. You have some time.</li>
  <li><b>Stand up the server from the pinned image</b>Same version, not <code>latest</code> — a different version means an unplanned migration on top of an incident.</li>
  <li><b>Restore Mongo, then Elasticsearch</b>Mongo first: it is the system of record. Elastic second, for metrics and logs.</li>
  <li><b>Verify in order</b>Login → a known task's scalars → an artifact download → an agent claiming a queued task.</li>
  <li><b>Reconcile</b>Tasks that finished during the outage may show as running. Mark them appropriately and note the gap.</li>
</ol>

**Elasticsearch went read-only.** Free disk (delete old indices or expand the volume), release the read-only block, then fix the cause: reporting rate, retention, or capacity. Symptom to recognise: metrics stop while training continues.

**A model cannot be rebuilt.** Run the lineage script; find the unpinned layer. It is nearly always the base image tag or an unpinned wheel. If the artifacts are gone, check whether a retention job deleted the task, then check bucket versioning. Record what you could not recover.

**Someone enqueued something they should not have.** Abort the task, revoke the credential that enqueued it, audit what that queue's agents could reach with their ambient credentials, and rotate anything exposed. Then fix the queue-level isolation that allowed it — treat this as a credential compromise, not a mistake.

| Incident | First action | The prevention |
|---|---|---|
| Server lost | Stand up the pinned image | Tested three-part backups; a known RTO |
| Elastic read-only | Free disk, release the block | Disk alerts; retention; reporting discipline |
| Model unrebuildable | Run lineage, find the unpinned layer | Image digests; lock files; weekly rebuild check |
| Unauthorised enqueue | Abort, revoke, rotate | Queue isolation; scoped credentials; no fork access |
| GPU queue full of nothing | List sessions, name the owners | Session timeouts; a weekly utilisation report |
| Storage bill spike | Break down by prefix and tag | Lifecycle rules; `save_top_k_tasks_only`; retention |

<div class="callout tip">
  <span class="ct">Write these down where the on-call person can find them</span>
  Four short runbooks in the repository beat institutional memory, because the person handling the 2am page is frequently not the person who built the platform. Each one needs the first command, the verification step, and who to wake.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run the server-loss playbook on a scratch host, timing each step. That is your RTO.</li>
    <li>Fill an Elasticsearch volume on a test instance and practise releasing the read-only block.</li>
    <li>Run the rebuild check against a real production model and see whether it passes.</li>
    <li>Write all four playbooks down and have someone who did not build the platform follow one.</li>
  </ol>
  <em>step four is the real test. A playbook that only works when its author runs it is not a playbook, and the gaps a second reader finds are exactly the ones that matter during an incident.</em>
</div>

## Where ClearML stops

Knowing the boundaries is a senior skill, and being able to name them is a strong interview signal.

| Need | ClearML | Better tool |
|---|---|---|
| Point-in-time feature serving, online/offline parity | Not its job | A feature store — Feast, Tecton |
| SQL analytics over versioned tables | Datasets are file collections | Iceberg, Delta, or a warehouse |
| General-purpose workflow orchestration across a company | Pipelines are ML-shaped | Airflow, Dagster, Temporal |
| High-throughput, low-latency serving at scale | Serving exists, but is not a full mesh | KServe, Triton directly, a managed endpoint |
| Data quality and contract testing | No opinion | Great Expectations, dbt tests, Soda |
| Fine-grained RBAC and multi-workspace | Paid tier only | The paid tier, or a server per tenant |
| Petabyte-scale data versioning | `add_external_files` helps, but it is not a lakehouse | A table format with time travel |
| Model monitoring and drift as a product | Basic statistics via the serving stack | A dedicated monitoring platform |

<div class="callout tip">
  <span class="ct">The honest summary</span>
  ClearML is strongest as the <b>experiment-to-model spine</b>: tracking, data versioning, remote execution, and a registry that a promotion workflow can drive. It is weakest as a general orchestrator, as a feature store, and as a serving mesh. A mature stack usually keeps ClearML for the spine and hands the boundaries to tools built for them — and says so out loud rather than stretching one tool over everything.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>For each row above, decide which side your team is on today.</li>
    <li>Find one place where ClearML is being stretched past its shape. Name the cost of that.</li>
    <li>Find one place where a second tool duplicates something ClearML already does well. Name the cost of that too.</li>
  </ol>
  <em>most stacks have one of each. Being able to argue both directions — where to adopt more ClearML and where to stop — is what distinguishes a senior answer from a preference.</em>
</div>

## Running ClearML as a platform

When ClearML is shared infrastructure, your job changes from using it to operating it. Five obligations, and they are what people actually mean by "platform ownership".

<div class="cards">
  <div class="card"><div class="icon">📊</div><h4>Publish the numbers</h4><p>GPU utilisation, queue depth, storage by team, and the rebuild-check result. Visible without asking.</p></div>
  <div class="card"><div class="icon">🧱</div><h4>Ship a wrapper, not a wiki</h4><p>Twenty lines that set the project prefix, output_uri, tags, and image. Conventions become defaults.</p></div>
  <div class="card"><div class="icon">🔁</div><h4>Own the upgrade cadence</h4><p>A tested quarterly window with a rollback, rather than an emergency upgrade during someone's deadline.</p></div>
  <div class="card"><div class="icon">🚨</div><h4>Alert on the platform, not the users</h4><p>Elastic disk, queue depth, services-agent liveness. Task failures belong to their authors.</p></div>
  <div class="card"><div class="icon">📕</div><h4>Four runbooks, testable</h4><p>Server lost, Elastic read-only, model unrebuildable, unauthorised enqueue. Followed by someone else.</p></div>
</div>

The monitoring set that actually matters, in priority order:

| Alert | Threshold | Why first |
|---|---|---|
| Elasticsearch disk | > 80% | Read-only is silent and stops all metric reporting |
| Services agent down | No heartbeat for 10 min | Pipelines, schedulers, and triggers all stop; presents as "the nightly did not run" |
| Queue depth | Deep for > 1 hour | Dead worker, stuck session, or runaway sweep |
| MongoDB disk | > 80% | The system of record |
| API server 5xx rate | Any sustained rate | Agents fail to claim; users see hangs |
| Rebuild check | Failing | Reproducibility has silently regressed |
| GPU utilisation | < 40% weekly | You are paying for idle hardware |

```python ops/platform_report.py — a weekly services task
from clearml import Task
from clearml.backend_api.session.client import APIClient

client = APIClient()
report = Task.current_task().get_logger()

for q in client.queues.get_all():
    depth = len(q.entries or [])
    report.report_single_value(f"queue_depth_{q.name}", depth)

workers = client.workers.get_all()
report.report_single_value("workers_online", len(workers))
report.report_single_value(
    "workers_idle",
    sum(1 for w in workers if not getattr(w, "task", None)),
)
```

<div class="callout warn">
  <span class="ct">The services agent is production, and it looks optional</span>
  Everything automatic — pipeline controllers, schedulers, dataset triggers, HPO optimisers, the serving control plane — lives on the services queue. When that one agent dies, nothing fails loudly: pipelines simply never start. It is the least glamorous and most load-bearing worker in the fleet, and it needs a liveness alert.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Stop your services agent and see how long it takes anyone to notice. That gap is your detection time.</li>
    <li>Build the seven alerts above, starting with Elasticsearch disk.</li>
    <li>Publish one weekly report with utilisation, queue depth, storage by team, and the rebuild result.</li>
    <li>Ask someone outside the platform team to follow one runbook and note where they get stuck.</li>
  </ol>
  <em>step one usually reveals a detection time measured in days, because a pipeline that never starts produces no error anywhere. That is the single highest-value alert on the list.</em>
</div>

## The review checklist

Run this against any ClearML setup — yours or someone else's. It finds something every time.

| Area | Check |
|---|---|
| **Credentials** | One credential per purpose? Nothing workspace-wide in automation? Rotation rehearsed? |
| **Fork trust** | Can a fork pull request enqueue anywhere? Do those agents hold cloud credentials? |
| **Queue isolation** | Are queues a security boundary, with different agent credentials per queue? |
| **Diffs** | Has anyone checked recent tasks' uncommitted changes for secrets? |
| **TLS** | Is the server behind TLS, with no plaintext credential path? |
| **Storage** | Are artifacts in object storage, not the file server? Lifecycle rules per prefix? |
| **Backups** | All three parts? **Restored** within the last quarter? RTO written down? |
| **Version pinning** | Server image tag pinned? SDK and agent versions paired across the team? |
| **Elastic capacity** | Disk alert at 80%? Retention job running? Reporting per epoch, not per batch? |
| **Retention** | Scheduled, exempting published models and `keep` tags, dry-run first? |
| **Reproducibility** | Base image by **digest**? Lock file? Seeds connected? Weekly rebuild check green? |
| **Lineage** | Can you generate code, data, config, and approval for the production model in one command? |
| **Promotion** | A task with a threshold and a log, not a manual tag move? Winner published? |
| **Serving** | Behind auth? Following a tag rather than an id? Canary path available? |
| **Cost** | GPU utilisation measured? Session timeouts? `save_top_k_tasks_only` on sweeps? |
| **Services queue** | Liveness alert? Treated as production? |
| **Runbooks** | Four written, and followed successfully by someone who did not write them? |
| **Boundaries** | Documented where ClearML stops and what owns the rest? |

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run the whole checklist against your own setup and count the failures.</li>
    <li>Rank them by blast radius, not by effort. Fork trust and backups usually top the list.</li>
    <li>Fix the top three this week and re-run.</li>
    <li>Then run it against a colleague's project, which is where you learn how much of this is convention rather than enforcement.</li>
  </ol>
  <em>nobody passes on the first attempt. The two that matter disproportionately are an untested restore and a fork pull request with credentials — one is an unrecoverable data loss, the other is remote code execution.</em>
</div>

## The complete picture

Everything from all three levels in one platform. Read it as a whole; you should be able to justify every line and name which level it came from.

```text platform layout
.
├── .github/workflows/
│   ├── train-pr.yml            # PR gate: create, enqueue to ci, threshold
│   └── image.yml               # builds the training image, tags by requirements hash
├── requirements.lock           # hash-pinned
├── Dockerfile.train            # CUDA + system libs + wheels; digest recorded on tasks
├── src/{make_dataset,train,evaluate}.py
├── platform/
│   ├── clearml_wrapper.py      # project prefix, output_uri, tags, image — the governance
│   ├── retention.py            # scheduled, dry-run-first, exempts published models
│   ├── rebuild_check.py        # weekly rebuild of the production release
│   ├── platform_report.py      # utilisation, queue depth, storage by team
│   ├── lineage.py              # code + data + config + approval for a model id
│   └── promote.py              # threshold, tag move, publish — a task, not a click
├── ops/{pipeline,hpo,triggers}.py
└── runbooks/
    ├── server-lost.md
    ├── elastic-readonly.md
    ├── model-unrebuildable.md
    └── unauthorised-enqueue.md
```

```python platform/clearml_wrapper.py — where every convention becomes a default
import os
from clearml import Task

IMAGE = "myregistry/train@sha256:9f2c4b19e0a7d3f1c6b8a2e4d7091f3b8a2e4d7091f3b8a2e4d70"

def init_task(project: str, name: str, queue: str | None = None, **kwargs) -> Task:
    team = os.environ["ML_TEAM"]
    task = Task.init(
        project_name=f"{team}/{project}",
        task_name=name,
        output_uri=f"s3://ml-artifacts/{team}/clearml",   # never the file server
        reuse_last_task_id=False,                         # one task per run
        **kwargs,
    )
    task.add_tags([f"team:{team}", f"cost-centre:{os.environ['ML_COST_CENTRE']}"])
    task.set_packages("requirements.lock")                # pinned, not detected
    task.set_base_docker(IMAGE, docker_arguments="--shm-size=8g")   # by digest
    if queue:
        task.execute_remotely(queue_name=queue)
    return task
```

```python src/train.py — the researcher-facing surface stays small
from platform.clearml_wrapper import init_task

task = init_task("experiments", "resnet18", queue="gpu")

import torch
from clearml import Dataset, OutputModel

opt  = task.connect({"lr": 3e-4, "epochs": 20}, name="optimizer")
repro = task.connect({"seed": 42, "deterministic": True}, name="reproducibility")
data = task.connect({"dataset_version": "1.1.0"}, name="data")

set_seed(repro["seed"], deterministic=repro["deterministic"])
root = Dataset.get(dataset_project="datasets", dataset_name="iris",
                   dataset_version=data["dataset_version"],
                   alias="training data").get_local_copy()

logger = task.get_logger()
for epoch in range(opt["epochs"]):
    tr, va, acc = train_one_epoch(root, opt)
    logger.report_scalar("loss", "train", tr, epoch)      # per epoch, not per batch
    logger.report_scalar("accuracy", "val", acc, epoch)   # the HPO objective

test_acc = test(root)
logger.report_single_value("test_accuracy", test_acc)

model = OutputModel(task=task, name="resnet18-cls", framework="PyTorch")
model.update_weights(weights_filename="model.pt")
model.set_metadata("val_accuracy", test_acc, v_type="float")
model.set_metadata("dataset_version", data["dataset_version"])
model.tags = ["candidate"]                                 # the gate promotes, not you
```

```bash the fleet, as a security and cost design
# services — production. Everything automatic lives here. Liveness-alerted.
clearml-agent daemon --queue services --services-mode --cpu-only --detached

# cpu / gpu — researcher work. Data read + artifact write, no delete.
clearml-agent daemon --queue cpu --cpu-only --detached
clearml-agent daemon --queue gpu --gpus 0 --docker $IMAGE --detached
clearml-agent daemon --queue gpu --gpus 1 --docker $IMAGE --detached

# ci — protected branches only. Artifact write, nothing else.
clearml-agent daemon --queue ci --docker $IMAGE --detached

# ci-untrusted — fork PRs, after approval. Ephemeral hosts, NO credentials.
clearml-agent daemon --queue ci-untrusted --docker $IMAGE --detached
```

```bash the scheduled work that makes it a platform
# On the services queue, all of them tasks with logs:
python platform/retention.py         # daily, dry-run gated
python platform/rebuild_check.py     # weekly — reproducibility as a monitored property
python platform/platform_report.py   # weekly — utilisation, depth, storage by team
python ops/triggers.py               # dataset version → pipeline
```

Eighteen decisions in there span the whole series:

| Decision | Level |
|---|---|
| `Task.init` before framework imports | Beginner |
| Read parameters from `connect`'s return value | Beginner |
| One `title`, several `series`; single values for finals | Beginner |
| `output_uri` to object storage, never the file server | Beginner |
| Dataset consumed with `alias`, version as a parameter | Beginner |
| `execute_remotely` as the local/remote switch | Beginner |
| `reuse_last_task_id=False` on every experiment | Mid |
| Packages declared, not detected | Mid |
| Controllers on `services`, never on GPU | Mid |
| HPO objective verified against the base task | Mid |
| Pipeline caching made correct by versioning inputs | Mid |
| Promotion by tag, so serving self-deploys | Mid |
| Queues as a security boundary, with per-queue credentials | Senior |
| Fork pull requests on ephemeral, credential-free agents | Senior |
| Base image pinned by **digest**, plus a lock file | Senior |
| Three-part backups, restored and timed | Senior |
| A weekly rebuild check, so reproducibility is monitored | Senior |
| A wrapper that makes every convention a default | Senior |

<div class="guide-try">
  <span class="ct">Try it — the one that matters</span>
  <ol>
    <li>Write the wrapper for your own team and migrate one project onto it. Measure how much researcher-facing code disappeared.</li>
    <li>Split your queues by trust level and give each pool its own credentials. Verify a <code>ci-untrusted</code> task can reach nothing.</li>
    <li>Take all three backups and restore them onto a scratch host. Publish the measured RTO.</li>
    <li>Schedule the rebuild check and let it fail. Fix the unpinned layer it finds, then let it run green for a month.</li>
    <li>Run the review checklist and publish the results, including what you are not going to fix and why.</li>
  </ol>
  <em>step five is the senior deliverable. A checklist with honest, argued exceptions is worth more than a green one, because it shows the trade-offs were made deliberately rather than by omission — and it gives whoever inherits the platform a map instead of a mystery.</em>
</div>

## Where the series leaves you

Across three levels you have gone from two lines in a script to owning a platform. You can track an experiment automatically and log deliberately; version data incrementally and consume it reproducibly; clone and re-launch any run on remote hardware; run HPO with a verified objective and a budget; build cached, retried, triggered pipelines; drive a registry as a promotion workflow that deploys itself; and operate the whole thing with a trust model, a cost model, tested backups, monitored reproducibility, an audit chain, and runbooks somebody else can follow.

| The question a senior gets asked | The answer this series gives |
|---|---|
| "Can you reproduce the model we shipped in March?" | Clone its task; the digest, lock file, seed, and dataset version are all recorded — and the weekly rebuild check already proved it |
| "Who can run code on our GPUs?" | Whoever can enqueue. Here are the queues, their credentials, and the fork policy |
| "What does this platform cost?" | GPU-hours, artifact and dataset storage, server infrastructure, and egress — broken down by team, published weekly |
| "What breaks first if the team triples?" | Elasticsearch on reporting rate, then MongoDB on task count. Here is the retention and capacity plan |
| "If the server dies, how long until we are back?" | A measured RTO from a restore we ran last quarter |
| "Prove this model is what we think it is" | One command producing code, data, config, and the timestamped approval |
| "Should we use ClearML for X?" | Here is where it is strongest, here is where it stops, and here is what owns the rest |

The through-line of all three levels is a single idea: **a recorded run that can be executed again is worth more than a log of one that cannot.** Everything else — the agents, the queues, the registry, the pinning, the backups — exists to keep that property true as the number of runs, people, and months grows.




