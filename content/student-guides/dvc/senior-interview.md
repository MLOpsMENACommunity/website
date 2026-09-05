Part three of three, and the one to read if you only read one. A cumulative review of **the entire series** (foundations, pipeline machinery, and the governance and scale work a senior owns) organised by topic rather than by level. About fifty minutes. Fast review first, common questions at the end.

## Part one: foundations

<div class="flow">
  <div class="node">CODE<small>in Git</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">POINTERS<small>.dvc, dvc.lock</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">CACHE<small>by hash</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">REMOTE<small>S3, GCS, SSH</small></div>
</div>

> DVC versions data and ML pipelines on top of Git. A small hash-bearing pointer goes into Git; the bytes go into object storage. `dvc.lock` records every input and output hash from the last successful run, which is how `dvc repro` reruns only the stages whose inputs changed.

**Why not Git alone:** full history of every large binary, in every clone, forever. **Why not LFS:** it fixes size and nothing else: no pipelines, no graph, no metrics, no experiments, and storage tied to your Git host.

**`git checkout` moves pointers; `dvc checkout` moves data.** `dvc install` adds hooks so the second is automatic.

### `dvc add`, in four steps

Hash the contents → move to the content-addressed cache → write the `.dvc` pointer → add a `.gitignore` entry. A clean `git status` afterwards is the signal it worked.

### The commands and the Git parallel

| Git | DVC | Moves |
|---|---|---|
| `git add` | `dvc add` | Working file → tracked |
| `git push` | `dvc push` | Cache → remote |
| `git pull` | `dvc pull` | Remote → cache → workspace |
| `git checkout` | `dvc checkout` | History → working files |
| `git status` | `dvc status` / `-c` | What differs, locally / remotely |

### The rules that never change

**Never `dvc add` a pipeline output**, because `outs` owns it. **Always commit `dvc.lock`**, never hand-edit it. **Declare every input in `deps`** or the stage silently skips. **Parameters go in `params.yaml`** and must be declared. **Metrics and plots use `cache: false`** so they diff from Git with no pull. **Credentials never go in `.dvc/config`.**

### The traps

| Symptom | Cause | Fix |
|---|---|---|
| Wrong data version after `git checkout` | Skipped `dvc checkout` | `dvc install` the hooks |
| Missing cache files on pull | Never pushed | `dvc push` where it was produced |
| `output 'x' is already tracked` | `dvc add` on a stage output | Remove the `.dvc` |
| Stage never reruns | Script not in `deps` | Add it |
| Parameter change ignored | Not declared in `params` | Declare it |
| `URL is not supported` | Missing driver | `pip install "dvc[s3]"` |

## Part two: pipeline and cache machinery

### The cache, precisely

```text .dvc/cache/files/md5/
├── 8f/2c4b19e0a7d3f1c6b8a2e4d7091f3b       ← file contents
└── 3a/7f9c2e8b1d4506….dir                 ← JSON listing for a directory
```

MD5 by default: a content address chosen for speed, not a security control. Two-character shard directories. A `.dir` object maps relative paths to per-file hashes, so files inside a directory still deduplicate individually. **Hashing dominates, not transfer**; DVC caches hashes by `(path, size, mtime, inode)`, which is why a second `add` is near-instant.

### Link types

| Type | Extra disk | Safe to edit in place |
|---|---|---|
| `reflink` | None (CoW) | **Yes** |
| `hardlink` / `symlink` | None | **No: silently corrupts cached history** |
| `copy` | Double | Yes |

Default `reflink,copy`; add `cache.protected true` if you use hardlinks so in-place edits fail loudly.

### Templating and modifiers

```yaml
stages:
  featurize:
    foreach: [tfidf, embeddings]        # matrix: for a cross product
    do:
      cmd: python src/featurize.py --method ${item}
      outs:
        - data/features-${item}.pkl:
            push: false                  # regenerable; do not store 200 GB
```

| Modifier | Effect |
|---|---|
| `cache: false` | Committed to Git: small, diffable text |
| `persist: true` | Not deleted before a rerun; the stage is no longer a pure function |
| `push: false` | Cached locally, never uploaded: the main cost lever |
| `remote: NAME` | Sent to a specific, usually colder, remote |

### External data, remotes, experiments

`dvc import-url` tracks an external source with `dvc update`; `--no-download` records the pointer only; an external path in `deps` is hashed remotely. **A moving external path is a reproducibility hole**, so pin dated, immutable paths.

`jobs` is the biggest `pull` speed lever. `verify true` re-hashes on download. `version_aware` uses natural paths plus bucket versioning: browsable, no cross-file dedup.

Queued experiments run in **isolated temporary workspaces**, which is what makes `--run-all --jobs 4` safe. They are Git refs under `refs/exps/` plus cached outputs, so thirty runs of a 2 GB model is 60 GB, cleared with `dvc exp remove` then `dvc gc --all-commits`.

### DVCLive, and CI

DVCLive logs per step, turning endpoints into curves. In CI: OIDC for credentials, `fetch-depth: 0` for metrics diffs, `.dvc/cache` cached on `dvc.lock`, and **`dvc status` empty as a required check**, the gate that makes reproducibility enforceable. Push only from the protected branch.

## Part three: trust, scale, and ownership

### The trust model

| Actor | Needs | Must not have |
|---|---|---|
| Developer | Read; write on a dev prefix | Write on production data |
| CI on `main` | Read + write | Delete |
| CI on a fork PR | **Read only** | Any write |
| Retention job | Delete, scoped and audited | Write |

Three properties make access sharper than it looks:

**Content-addressed writes are silent overwrites.** A client with write access can replace the object at a hash path, and every commit referencing that hash now resolves to wrong data with no error.

**A pointer is not proof.** Nothing verifies bytes on download unless `verify true` is set.

**Deletion is the dangerous permission.**

<div class="callout warn">
  <span class="ct">The single most dangerous command in DVC</span>
  <code>dvc gc --cloud --workspace</code> deletes every remote object not needed by the <b>currently checked-out</b> revision, which is catastrophic on a multi-branch repository, and it exits zero. Remove delete from human credentials, do retention with an audited lifecycle policy, and enable bucket versioning so a mistake is survivable.
</div>

### Credentials with nothing stored

| Mechanism | Stored secret | Scope |
|---|---|---|
| OIDC / workload identity | **None** | A specific repo, branch, or environment |
| Instance or pod identity | None | A machine or workload |
| Long-lived access key | **Yes** | Everything it allows, until rotated |

The trust policy is where the security lives, so pin the `sub` to a branch. For humans, the provider's SSO; DVC uses each provider's standard credential chain. **A fork build must never hold a write credential.**

### Immutability and retention

| Control | Guarantees |
|---|---|
| Bucket versioning | An overwrite or delete is recoverable |
| Object lock, governance | Deletion needs a specific privilege |
| Object lock, compliance | Deletion is impossible until expiry, **for anyone** |
| Lifecycle to cold storage | Cheap long-term retention |

Retention belongs in a **lifecycle policy** (declarative, audited, and not triggerable by a stale clone) not in `dvc gc --cloud`.

### Cost

| Charge | Driven by | Typical surprise |
|---|---|---|
| Storage | Bytes × time × class | Every experiment's model, forever |
| Requests | Object count | A million small files costs more in requests than bytes |
| Egress | Bytes leaving the region | CI in the wrong region |
| Retrieval | Restoring from cold | A "cheap archive" that is expensive to read |

Levers in order: `push: false` on regenerable intermediates, scheduled experiment cleanup, lifecycle to a colder class, shard small files, co-locate compute and storage.

### Scale, and where DVC stops

| Shape | Do |
|---|---|
| 100 × 10 GB files | Nothing. This is DVC's sweet spot |
| 1M × 4 KB files | **Shard** into tars, Parquet, WebDataset, LMDB |
| Frequently appended table | Partition by date, track partitions |
| Warehouse table queried by SQL | Track the query and result hash; let Iceberg/Delta version the table |

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>DVC is right</h4>
    <ul>
      <li>File-shaped data: images, audio, text, models</li>
      <li>Data versioned alongside the code that reads it</li>
      <li>Incremental pipeline reruns</li>
      <li>Experiments tied to Git history</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Reach elsewhere</h4>
    <ul>
      <li>Billion-row SQL tables → Iceberg, Delta, Hudi</li>
      <li>Online feature serving → a feature store</li>
      <li>Scheduling and retries → Airflow, Dagster, Prefect</li>
      <li>Row-level access control → a governed warehouse</li>
    </ul>
  </div>
</div>

**DVC has no scheduler.** You run `dvc repro` *from* an orchestrator: the orchestrator schedules, DVC decides what needs to run and guarantees the lineage.

### Lineage and audit

| Question | Answered by |
|---|---|
| Which data trained this model? | `dvc.lock` at that commit |
| Which code? | The Git commit |
| Which parameters and metrics? | `params.yaml` and `metrics.json`, in Git |
| Can we rebuild it byte-for-byte? | **Only if the environment was pinned too** |

That last row is the honest gap. `dvc.lock` pins data and code, not the Python version, the wheels, or the CUDA driver. Close it by hash-pinning a lock file and declaring it, plus the Dockerfile or image digest, in `deps`. **The strongest audit answer is a scheduled rebuild of a past release**, not a diagram.

### Erasure versus content addressing

Deleting an object breaks history; keeping it violates the law; rewriting Git history does not touch the bytes.

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Design for erasure</h4>
    <ul>
      <li>Version derived, aggregated, or pseudonymised data</li>
      <li>Crypto-shredding: encrypt per subject, delete the key</li>
      <li>Partition so deletion is scoped</li>
      <li>Keep raw personal data in a governed system; track its hash</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Does not work</h4>
    <ul>
      <li>Delete the object and hope</li>
      <li>Rewrite Git history</li>
      <li>Compliance-mode lock plus an erasure obligation</li>
      <li>"We will handle it when asked"</li>
    </ul>
  </div>
</div>

The resolution is always architectural and upstream of the tool: **do not put erasable data in an immutable store.**

### The review checklist

| Check | Looking for |
|---|---|
| `dvc.lock` committed, never hand-edited | The record of what ran |
| Every script and config in `deps` | No silent skips |
| Metrics and plots `cache: false` | Diffable without a pull |
| No credentials in `.dvc/config` | Nothing in history |
| Regenerable intermediates `push: false` | Bounded storage cost |
| Environment pinned and declared | Reproducibility past code and data |
| External deps are dated, immutable paths | A source cannot rewrite history |
| `verify true` on remotes | Corruption caught, not restored |
| Bucket versioning enabled | A mistaken delete is survivable |
| No human credential can delete | The `gc --cloud` blast radius |
| CI uses OIDC | Nothing to leak |
| Fork PRs are read-only | A contributor cannot overwrite data |
| `dvc status` gate in CI | The lock cannot drift |
| Retention is a lifecycle policy | Audited, not clone-triggered |
| Small-file datasets sharded | Hashing and request costs bounded |
| No erasable personal data in versioned artifacts | The hard problem, before it is urgent |
| A scheduled reproduction check exists | Reproducibility monitored, not assumed |
| Each dataset has a recorded owner | Accountability |
| Storage cost is visible to the team | Growth gets managed |

## Common interview questions

<ol class="guide-steps">
  <li><b>Explain DVC to an engineer who has never used it.</b>Version control for data and ML pipelines, on top of Git. A small pointer containing a content hash goes into Git; the bytes go into object storage. <code>dvc.yaml</code> declares stages with their inputs and outputs, and <code>dvc.lock</code> records the hashes of what ran, so one commit reproduces a result rather than describing one, and <code>dvc repro</code> reruns only what changed.</li>
  <li><b>What is the single most dangerous DVC command, and why?</b><code>dvc gc --cloud --workspace</code>. It deletes every object on the shared remote that is not needed by the currently checked-out revision, which on a repository with twenty branches destroys nineteen branches' data permanently, and with a zero exit code. The mitigations are removing delete permission from human credentials, doing retention as an audited lifecycle policy, and enabling bucket versioning.</li>
  <li><b>Why does write access to a data remote matter more than it appears?</b>Objects live at paths derived from their hash. A client that can write can also <em>replace</em> the object at a hash path with different bytes, and every commit referencing that hash then resolves to the wrong data with no error anywhere, because a pointer records what DVC expected, and nothing checks the bytes unless <code>verify true</code> is set.</li>
  <li><b>How do you give CI credentials without storing a secret?</b>OIDC or workload identity: the CI provider mints a short-lived token, and the cloud role's trust policy pins the subject to a specific repository and branch. Nothing is stored, so nothing can leak, and a throwaway branch cannot assume the role. For humans, the provider's own SSO, since DVC uses each provider's standard credential chain.</li>
  <li><b>What must a fork pull request not be able to do?</b>Write to the data remote. A fork build runs contributor code with whatever identity the job holds, so a write credential means a contributor can overwrite datasets. Give fork builds a read-only remote or none, and split the workflow so the privileged half (push, promotion, registry updates) never executes fork-supplied code.</li>
  <li><b>How do you make a data remote trustworthy?</b>Bucket versioning so any overwrite or delete is recoverable, object lock so deletion needs a specific privilege, <code>verify true</code> so corruption is refused rather than silently restored, encryption at rest, and delete permission removed from every human credential. Retention becomes a declarative lifecycle policy rather than someone running <code>gc</code>.</li>
  <li><b>Where does the money go?</b>Four charges: storage by bytes and class, requests by object count, egress by bytes leaving the region, and retrieval from cold classes. The surprise is usually requests on a million-small-file dataset, or egress because CI runs in a different region from the bucket. The largest single saving is almost always <code>push: false</code> on intermediates that regenerate in minutes.</li>
  <li><b>Where is DVC's scaling wall, and what do you do about it?</b>Many small files. A million 4 KB objects means a million hash operations, a million transfers, and a <code>.dir</code> listing of a million rows. Sharding into tars, Parquet, or WebDataset typically improves <code>dvc add</code> by more than tenfold, turns request-bound transfers into throughput-bound ones, and speeds up the data loader. Large files are fine, because hashing is I/O-bound and parallel.</li>
  <li><b>Would you use DVC for a billion-row warehouse table?</b>No. That is a table-format problem: Iceberg, Delta, or Hudi give you time travel and schema evolution natively, and DVC would be duplicating the warehouse. Track the query and its result hash so the pipeline stays reproducible, and let the lakehouse version the table. Insisting DVC handles every data shape is the wrong answer here.</li>
  <li><b>Does DVC replace Airflow?</b>No. It has no scheduler, no retries, and no distributed execution. You run <code>dvc repro</code> <em>from</em> an orchestrator: the orchestrator handles scheduling and failure, DVC decides what needs to run and guarantees the lineage. They compose because they solve different problems.</li>
  <li><b>A model made a decision affecting a customer eighteen months ago. Prove what trained it.</b>Find the commit from the model's hash with <code>git log -S</code> over <code>dvc.lock</code>, check that revision out, <code>dvc pull</code>, and confirm <code>dvc repro --dry</code> reports up to date. That gives you the data hashes, the code, the parameters, and the metrics. Then be honest about the gap: it does not prove the environment unless the lock file and image digest were also declared as dependencies.</li>
  <li><b>What does <code>dvc.lock</code> <em>not</em> pin?</b>The environment. Python version, resolved wheel versions, system libraries, GPU driver. Close it by hash-pinning a dependency lock file and declaring it in <code>deps</code>, recording the container digest rather than a tag, and logging both alongside the metrics.</li>
  <li><b>How do you prove reproducibility rather than claim it?</b>A scheduled job that picks a past release, checks it out on a clean runner, pulls, repros, and asserts the metrics match. It fails on the day an upstream dependency, a deleted object, or an unpinned library breaks reproducibility, rather than on the day someone needs it. That single job is worth more than any lineage documentation.</li>
  <li><b>A customer demands erasure of their records. They are in a versioned dataset. What now?</b>Establish the blast radius, which hashes contain the data and which commits and models reference them. Decide what must survive, usually the model and its metrics while the training data goes, and write that down. Rebuild the dataset without the subject, delete the old objects from the remote, every local cache, every CI cache, and any mirror, including old versions in a versioned bucket. Record a tombstone explaining the unresolvable pointer. Then close the class by moving personal data out of the versioned store.</li>
  <li><b>Why are content addressing and erasure in tension?</b>An immutable, replicated, hash-addressed store is precisely the wrong shape for "make this specific record disappear everywhere". The same tension exists in Git, in backups, and in any append-only log. The resolution is architectural and upstream of the tool: version derived, aggregated, or pseudonymised data, or encrypt per subject so erasure means destroying a key.</li>
  <li><b>Can you enable compliance-mode object lock and still honour GDPR?</b>Not on the same objects. Compliance mode means nobody can delete before expiry, including you, and including under a lawful erasure request. If you are subject to both obligations, keep personal data out of the immutable store or store it encrypted per subject. Decide before enabling it, because compliance mode cannot be walked back.</li>
  <li><b>How do you run a data registry as a product?</b>Dated immutable paths rather than <code>latest.parquet</code>, a Git tag per release so consumers pin a readable version, a README per dataset with schema, provenance, licence and owner, CODEOWNERS so someone is accountable, a validation stage writing row counts and schema hashes to a <code>cache: false</code> metrics file, and a published deprecation policy. Consumers use <code>dvc import --rev</code> and <code>dvc update</code> deliberately.</li>
  <li><b>What is the failure mode of a shared registry, and the real fix?</b>A team needs one extra column, cannot get it quickly, and forks. Six months later there are nine variants and no canonical source. The fix is turnaround time on requests, not policy. If a reasonable schema change takes three weeks, forking is rational and you will lose. Treat it as a product with a service level or do not call it canonical.</li>
  <li><b>How do you run training in CI at scale?</b>Self-hosted or per-job cloud runners with GPUs, in the same region as the bucket because egress often exceeds compute cost. A warm <code>.dvc/cache</code> on protected-branch runners, ephemeral runners for anything triggered by a pull request. OIDC for credentials, and CML comments carrying metrics, parameter, and data diffs plus rendered plots so a reviewer needs to run nothing.</li>
  <li><b>Why are self-hosted runners a risk?</b>They keep state. A persistent runner with a warm cache is fast and is also a shared, writable environment that has executed every contributor's code. Keep warm-cache runners on protected branches, make pull-request runners ephemeral, and never let a fork-triggered job hold the remote's write credential.</li>
  <li><b>What would you measure to know your data versioning is healthy?</b>Bytes and objects per project with the growth trend, the fraction of bytes in unreferenced experiments, the percentage of pipelines where <code>dvc status</code> is clean in CI, the age of the oldest successfully reproduced release, the number of remotes with human write access, and median <code>dvc pull</code> time in CI. Without numbers, "our data is under control" is an opinion.</li>
  <li><b>How would you roll DVC out to six teams?</b>A template repository: a working pipeline, the CI workflow with OIDC and the <code>dvc status</code> gate, the shared <code>.dvc/config</code> with the right remote and cache settings. Teams inherit every good decision by cloning, which works and a wiki page does not. Then own the remote layout and its policy centrally, make the sanctioned path the fast path, and publish the metrics.</li>
  <li><b>What do you look for reviewing a DVC project?</b>Not what it does, but what it <b>guarantees</b>. Can a result from last year be rebuilt; is the environment pinned as well as the data; who can overwrite the bytes a model trained on; would a corrupted object be noticed; is a mistaken delete survivable; what does it cost per month; and does any versioned artifact contain data somebody could lawfully demand you erase.</li>
</ol>

## Final self-test

- Give the whole-series answer in four sentences, then name the most dangerous command.
- Explain why a write credential on a remote is worse than it appears.
- Say how CI gets credentials with nothing stored, and what the trust policy pins.
- Name four controls that make a remote trustworthy.
- List the four cost charges, and the largest single saving.
- Say where DVC's scaling wall is, and the fix plus its three benefits.
- Explain why a warehouse table is not a DVC problem.
- Say what DVC does and does not do relative to an orchestrator.
- Trace a model to its training data in three commands.
- Name what `dvc.lock` does not pin, and how to close the gap.
- Give the metric that proves reproducibility rather than claiming it.
- Explain the tension between erasure and content addressing, and the architectural fix.
- Say why compliance-mode object lock conflicts with an erasure obligation.
- Name five properties that make a data registry a product.
- Give two risks of self-hosted runners and their mitigations.
- Name three health metrics you would publish, and run the review checklist from memory.

