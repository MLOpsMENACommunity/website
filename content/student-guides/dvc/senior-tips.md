Part three of three. The problems at this level are rarely about syntax. They are about a remote sixty people depend on, a model nobody can rebuild, a storage bill nobody owns, and an erasure request against an immutable store. Start with the error table, then the practices, verification, and playbooks underneath it.

## Common errors at this level

Cumulative — everything from Beginner and Mid still applies. These cause incidents rather than failed runs.

| Symptom | Real cause | Fix |
|---|---|---|
| `dvc gc --cloud` destroyed other branches' data | Default `--workspace` scope on a shared remote | Remove delete from human credentials; retention by lifecycle policy |
| Deleted remote objects are unrecoverable | Bucket versioning never enabled | Enable it — this is the highest-priority change |
| A corrupted object was restored silently | `verify` not set; a pointer is not proof | `dvc remote modify … verify true` |
| An object at a hash path holds different bytes | Someone with write access replaced it | Restrict write; enable versioning; `verify true` |
| A leaked access key had data write access | Long-lived credential stored in CI | OIDC with a branch-pinned trust policy |
| A fork pull request overwrote a dataset | Fork build held a write credential | Read-only remote for forks; split the workflow |
| Cannot honour an erasure request | Personal data lives in the versioned store | Version derived or pseudonymised data; crypto-shred |
| Compliance-mode lock blocks a lawful deletion | Retention and erasure obligations collide | Architectural: keep erasable data out of the immutable store |
| A model from last year cannot be rebuilt | The environment was never pinned | Hash-pinned lock file and image digest in `deps` |
| `dvc repro` succeeds but metrics differ | Undeclared randomness or unpinned wheels | Seed everything; declare the lock file |
| Storage bill tripled with no new datasets | Unreferenced sweep artifacts | Scheduled `exp remove` plus a lifecycle rule |
| Requests cost more than storage | A million small objects | Shard; measure request counts, not just bytes |
| Egress dominates the bill | Runners in a different region from the bucket | Co-locate compute and storage |
| A "cheap archive" is expensive to read | Cold class with high retrieval cost | Model retrieval, not just storage, before tiering |
| Nine forks of one canonical dataset | Upstream requests took weeks | Fix turnaround time; a registry is a product with an SLA |
| A consumer broke when upstream changed | Consumer tracked a moving path or branch | `dvc import --rev` a tag, `dvc update` deliberately |
| Self-hosted runner leaked between jobs | Persistent runner ran fork code | Ephemeral runners for pull requests |
| Nobody knows who owns a dataset | No CODEOWNERS, no README | Ownership recorded per dataset |
| "We are reproducible" is unverified | No scheduled rebuild | A weekly job that rebuilds a past release |
| A terabyte dataset is unusable through DVC | Wrong tool for the shape | Table format for tables; track the query and its hash |

## The practices that pay off most

<div class="cards">
  <div class="card"><div class="icon">🗄️</div><h4>Versioning on, delete off</h4><p>Bucket versioning enabled, and delete permission removed from every human credential. Together they make mistakes survivable.</p></div>
  <div class="card"><div class="icon">🔐</div><h4>OIDC everywhere</h4><p>Nothing stored means nothing to leak, and the trust policy pins the repository and branch.</p></div>
  <div class="card"><div class="icon">🔍</div><h4><code>verify true</code> on remotes</h4><p>Re-hash on download. Corruption is refused instead of restored and reported as success.</p></div>
  <div class="card"><div class="icon">📜</div><h4>Retention by lifecycle policy</h4><p>Declarative, audited, and impossible to trigger from a stale clone. Never <code>gc --cloud</code> as a routine.</p></div>
  <div class="card"><div class="icon">📌</div><h4>Pin the environment too</h4><p>A hash-pinned lock file and an image digest in <code>deps</code>. Otherwise reproducibility stops at the language boundary.</p></div>
  <div class="card"><div class="icon">♻️</div><h4>Weekly rebuild of a past release</h4><p>The only thing that turns "reproducible" from a claim into a monitored property.</p></div>
  <div class="card"><div class="icon">💰</div><h4>Make cost visible</h4><p>Bytes, objects, and unreferenced-experiment share, published where the team sees them.</p></div>
  <div class="card"><div class="icon">📦</div><h4>Registry as a product</h4><p>Dated immutable paths, tags per release, a README, an owner, and a turnaround promise.</p></div>
</div>

## Practice cards

<ol class="guide-steps">
  <li><b>Recover an overwrite</b>On a test bucket with versioning on, overwrite a DVC object by hand and restore the previous version. If you cannot do this, versioning is not enabled and that is your top priority.</li>
  <li><b>Watch <code>verify</code> refuse</b>Corrupt one object in a test remote, run <code>dvc pull</code> without <code>verify</code> and note it succeeds with wrong data. Enable <code>verify true</code> and repeat.</li>
  <li><b>Read the destruction dry-run</b>Run <code>dvc gc --cloud --dry-run --workspace</code> on a multi-branch repository and read the object count. Show that number to anyone holding delete permission.</li>
  <li><b>Prove the trust policy is scoped</b>Try to assume your CI role from a throwaway branch and confirm the refusal. If it succeeds, the <code>sub</code> condition is not pinned.</li>
  <li><b>Rebuild something old</b>Pick a release from three months ago, check it out on a clean machine, <code>dvc pull</code>, <code>dvc repro</code>, and compare the metrics. Note exactly where it broke.</li>
  <li><b>Find the unpinned layer</b>List everything that revision does not pin: Python version, wheels, CUDA, image digest. Add the lock file and Dockerfile to <code>deps</code> and confirm a change invalidates the stage.</li>
  <li><b>Measure the real bill</b>Total bytes, object count, and the fraction in experiment artifacts unread for three months. Calculate the lifecycle saving.</li>
  <li><b>Classify for erasure</b>Take one dataset and decide whether a subject could lawfully demand its deletion. If yes, count how many commits and models reference it.</li>
  <li><b>Run the checklist on someone else's project</b>The review checklist below, against a repository you did not write. It will find something.</li>
</ol>

## The hardening pass every remote should get

```bash
# 1. Versioning: makes every other mistake survivable
aws s3api put-bucket-versioning --bucket ml-data-prod \
  --versioning-configuration Status=Enabled

# 2. Object lock in governance mode: deletion needs a specific privilege
aws s3api put-object-lock-configuration --bucket ml-data-prod \
  --object-lock-configuration '{"ObjectLockEnabled":"Enabled",
    "Rule":{"DefaultRetention":{"Mode":"GOVERNANCE","Days":365}}}'

# 3. Encryption at rest
aws s3api put-bucket-encryption --bucket ml-data-prod \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# 4. Access logging, so a mistake is traceable
aws s3api put-bucket-logging --bucket ml-data-prod --bucket-logging-status file://logging.json

# 5. Lifecycle: retention as declarative policy, not a manual command
aws s3api put-bucket-lifecycle-configuration --bucket ml-data-prod \
  --lifecycle-configuration file://lifecycle.json
```

```bash
# .dvc/config — committed, no credentials
[core]
    remote = origin
    autostage = true
    checksum_jobs = 16
['remote "origin"']
    url = s3://ml-data-prod/dvc
    jobs = 32
    verify = true                 # corruption refused, not restored
    sse = AES256
['remote "archive"']
    url = s3://ml-data-archive/dvc
    verify = true
[cache]
    type = reflink,copy
    protected = true              # in-place edits fail loudly
```

| Control | Prevents |
|---|---|
| Bucket versioning | An unrecoverable overwrite or delete |
| Object lock (governance) | Casual deletion; a `gc --cloud` accident |
| `verify true` | A corrupted or replaced object being restored silently |
| `cache.protected true` | An in-place edit rewriting cached history |
| Encryption at rest | A compliance finding |
| Access logging | An untraceable incident |
| Lifecycle policy | Unbounded storage growth, and manual `gc` |

<div class="callout warn">
  <span class="ct">Three permissions to audit today</span>
  Who can <b>delete</b> on the remote — ideally nobody human. Who can <b>write</b> to the production prefix — ideally only CI on a protected branch. And what identity a <b>fork pull request</b> receives — ideally read-only or nothing. Those three answers determine your entire blast radius.
</div>

## Verifying, not assuming

Every control above should be checked rather than trusted.

```bash
# Is versioning actually on?
aws s3api get-bucket-versioning --bucket ml-data-prod

# Does verify catch a corrupted object?
dvc pull --verify

# Can a developer credential delete?
aws s3api delete-object --bucket ml-data-prod --key dvc/files/md5/xx/test 2>&1 | tail -1

# Is anything sensitive in the committed config?
git log -p --all -- .dvc/config | grep -iE 'key|secret|token|password' || echo clean

# Is the environment genuinely pinned?
grep -c 'sha256:' requirements.lock
dvc dag --outs | grep -q requirements.lock && echo "declared as a dep"

# Would an old release rebuild?
git checkout <old-tag> && dvc pull && dvc repro --dry

# How much would a cloud gc destroy?
dvc gc --cloud --dry-run --workspace | wc -l
```

<div class="callout warn">
  <span class="ct">Test that the control actually refuses something</span>
  After enabling object lock, try to delete an object without the bypass privilege. After setting <code>verify true</code>, corrupt an object and confirm the pull fails. After pinning the trust policy, try to assume the role from another branch. A control you have never watched refuse anything is decoration.
</div>

Automate the mechanical checks so they do not depend on anyone remembering:

```yaml .github/workflows/dvc-checks.yml
- name: dvc.lock must not be stale
  run: test "$(dvc status --json)" = "{}"

- name: dvc.lock must accompany dvc.yaml changes
  run: |
    git diff --name-only origin/main | grep -q '^dvc.yaml$' \
      && { git diff --name-only origin/main | grep -q '^dvc.lock$' \
           || { echo "::error::dvc.yaml changed without dvc.lock"; exit 1; }; } || true

- name: No credentials in the committed config
  run: |
    grep -iE 'access_key|secret|password|token' .dvc/config \
      && { echo "::error::credential in .dvc/config"; exit 1; } || true

- name: Bucket versioning must be enabled
  run: |
    test "$(aws s3api get-bucket-versioning --bucket ml-data-prod --query Status --output text)" = "Enabled"
```

## Cost governance

```bash
# Where the bytes are
aws s3 ls --summarize --human-readable --recursive s3://ml-data-prod/dvc/ | tail -3

# DVC-side hygiene
du -sh .dvc/cache
find .dvc/cache -type f | wc -l
dvc exp remove --all
dvc gc --dry-run --all-commits
```

| Lever | Effect | Note |
|---|---|---|
| `push: false` on regenerable outputs | Often the largest single saving | Costs nothing but a config line |
| Scheduled experiment cleanup | Removes the biggest silent growth | `exp remove` then `gc` |
| Lifecycle to a colder class | Cheap long-term retention | Model retrieval cost too |
| Shard small files | Cuts request charges and hash time | Also speeds the data loader |
| Co-locate compute and storage | Removes egress | Often exceeds the storage line |
| Tier per output with `remote:` | Hot and cold in one pipeline | No manual moving |

<div class="callout tip">
  <span class="ct">Publish two numbers and behaviour changes</span>
  Total bytes per project, and the fraction of those bytes in experiments nobody has read in ninety days. That second number is usually a majority, and it is the most persuasive thing you can put in front of a team — far more effective than a policy document about cleaning up.
</div>

## Incident playbooks

### `dvc gc --cloud` deleted live data

Stop all pushes immediately, because a subsequent push can overwrite the delete markers you need to recover. Restore from bucket versioning — this is the entire reason versioning is non-optional. Then remove delete permission from every human credential and move retention to a lifecycle policy. The post-mortem action is a permission change, not a training session.

### A remote object is corrupt or missing

Confirm it with `dvc pull -v`, which names the hash and the remote. Check bucket versioning for a previous version of that key; if present, restore and you are done. If not, find any machine or CI cache that still holds the object and push from there. If nothing has it, identify every commit referencing the hash, rebuild the artifact if its inputs survive, and record a tombstone if it cannot be rebuilt. Then enable `verify true` and versioning so the next occurrence is recoverable.

### A model cannot be reproduced

Work the layers in order, cheapest first: is the commit findable from the model's hash, does `dvc pull` succeed for every dep in `dvc.lock`, does `dvc repro --dry` report up to date, and does an actual rerun produce matching metrics. The break is almost always the last two, and almost always the environment. Fix it by adding the missing pin to `deps`, not by documenting the discrepancy.

### The cache filled the disk mid-sweep

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>0m</span><strong>Stop the queue</strong><small><code>dvc queue stop</code>. Do not delete yet — a half-written cache object is worse than a full disk.</small></div>
  <div class="guide-timeline-item"><span>2m</span><strong>Measure before deleting</strong><small><code>du -sh .dvc/cache</code> and <code>dvc gc --dry-run --all-commits</code>. Know what is reachable.</small></div>
  <div class="guide-timeline-item"><span>5m</span><strong>Drop experiment refs first</strong><small><code>dvc exp remove --all</code> makes sweep artifacts collectable, then <code>dvc gc --all-commits</code>.</small></div>
  <div class="guide-timeline-item"><span>10m</span><strong>Move the cache</strong><small><code>dvc cache dir --local /mnt/big/cache</code> rather than fighting a small root disk.</small></div>
  <div class="guide-timeline-item"><span>after</span><strong>Close the loop</strong><small>Mark regenerable intermediates <code>push: false</code>, budget disk per sweep, schedule cleanup.</small></div>
</div>

### A credential leaked

Rotate before anything else — it may already be in a log, a cache, or a fork. Then audit the bucket's access logs for the exposure window, looking for **writes and deletes** rather than only reads, because a write is the damaging case. Replace the mechanism, not just the value: if a long-lived key leaked, the fix is OIDC. Rotating a key you still store only resets the clock.

### An erasure request lands

Establish the blast radius: which hashes contain the data, and which commits, tags, and models reference those hashes. Decide what must survive — usually the model and its metrics remain auditable while the training data goes — and write that decision down. Rebuild the dataset without the subject, push it, and update pointers on active branches. Delete the old objects from the remote, every local cache, every CI cache, and any mirror, including old versions in a versioned bucket. Record a committed tombstone naming the erased hash, the date, and the authority. Then close the class by moving personal data out of the versioned store.

## Running DVC as a platform

**Publish a template repository, not documentation.** A working pipeline, the CI workflow with OIDC and the `dvc status` gate, and a `.dvc/config` with the right remote, `verify`, `jobs`, and cache settings. Teams inherit every good decision by cloning; a wiki page is read once.

**Own the remote layout and its policy.** One prefix per environment, versioning on, delete removed from humans, lifecycle rules for retention, access logging. Teams should not each invent this.

**Make the safe path the fast path.** If `dvc pull` from the sanctioned remote is fast and documented while copying from a colleague's laptop is slow, nobody copies from laptops. Regional co-location and a tuned `jobs` do more for compliance than a policy.

**Measure and publish.** Without numbers, "our data is under control" is an opinion:

| Metric | Why |
|---|---|
| Bytes and objects per project, with trend | Cost and growth |
| Share of bytes in unreferenced experiments | The easiest saving |
| Percentage of pipelines with a clean `dvc status` in CI | Whether reproducibility is real |
| Age of the oldest successfully reproduced release | The genuine reproducibility horizon |
| Remotes with human write access | The blast radius |
| Median `dvc pull` time in CI | Developer and CI friction |

<div class="callout warn">
  <span class="ct">The failure mode of a shared registry</span>
  A team needs one extra column, cannot get it quickly, and forks. Six months later there are nine variants and no canonical source. The fix is <b>turnaround time on requests</b>, not policy — if a reasonable schema change takes three weeks, forking is rational and you will lose. Treat it as a product with a service level, or do not call it canonical.
</div>

## Machine-learning specifics

**Weights are data, not code.** Track them, but keep them out of the same lifecycle as source — a retrain should not require a code release, and a code fix should not require re-pushing gigabytes.

**Model artifacts accumulate fastest.** Every experiment caches one. A 2 GB model across thirty sweeps a month is where the storage bill actually comes from, and `dvc exp remove` plus a lifecycle rule is the answer.

**Register promoted models explicitly.** A Git tag plus `dvc.lock` gives you data, code, and metrics for a release. `live.log_artifact(..., type="model")` makes the artifact discoverable rather than implied.

**Log the environment alongside the metrics.** Git SHA, image digest, and the input data hash written into the run's parameters. Without those three, a reproducible pipeline is still an unreproducible model.

**Seed everything and say so.** Python, NumPy, the framework, any shuffling, and the split. An unseeded run is an unreproducible run no matter how well the data is versioned.

```python src/train.py
live.log_params({
    "git_sha": git_sha(),
    "image_digest": os.environ.get("IMAGE_DIGEST", "unknown"),
    "data_hash": lock_hash("data/train.parquet"),
    "seed": SEED,
})
```

## The checklist to run before shipping

| Check | Looking for |
|---|---|
| `dvc.lock` committed, never hand-edited | The record of what ran |
| Every script, import, and lock file in `deps` | No silent skips, environment pinned |
| Metrics and plots `cache: false` | Diffable from Git with no pull |
| No credentials in `.dvc/config`, ever in history | `git log -p` comes back clean |
| Regenerable intermediates `push: false` | Bounded storage cost |
| External deps are dated, immutable paths | A source cannot rewrite your history |
| `verify true` on remotes | Corruption refused, not restored |
| Bucket versioning enabled | Every mistake is survivable |
| No human credential can delete | The `gc --cloud` blast radius |
| CI uses OIDC with a branch-pinned trust policy | Nothing to leak, nothing to borrow |
| Fork pull requests are read-only | A contributor cannot overwrite data |
| `dvc status` gate in CI | The lock cannot drift from the code |
| Retention is a lifecycle policy | Audited, not clone-triggered |
| Small-file datasets sharded | Hashing and request costs bounded |
| No erasable personal data in versioned artifacts | The hard problem, before it is urgent |
| A scheduled reproduction check exists | Reproducibility monitored, not assumed |
| Each dataset has an owner and a README | Accountability and usability |
| Storage cost is visible to the team | Growth gets managed |
| The right tool for each data shape | Tables in a table format, not in DVC |

Most data incidents are prevented at review time rather than at recovery time. Reading a DVC project for what it **guarantees** — rather than what it does — is the highest-leverage habit in this guide.
