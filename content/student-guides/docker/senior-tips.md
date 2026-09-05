Part three of three. At this level the problems are operational: an image sixty people deploy, a base image nobody rebuilt in four months, a container that took a host down. Start with the error table, then the practices, verification, and playbooks.

## Common errors at this level

Cumulative: everything from Beginner and Mid still applies. These cause incidents rather than failed builds.

| Symptom | Real cause | Fix |
|---|---|---|
| A container escape reached the host | Process running as root with default capabilities | Non-root `USER`, `--cap-drop ALL`, `no-new-privileges` |
| A build container controlled the daemon | `/var/run/docker.sock` mounted in | Rootless builder, or a remote BuildKit instance |
| `--privileged` left in a compose file | Added to debug something, never removed | Remove it; if needed, document why |
| Secret found in a shipped image | `ARG`/`ENV`/`COPY` then deleted in a later layer | BuildKit secret mounts; rebuild and **rotate** |
| Rotation happened after the cleanup | Deleting the tag treated as containment | Rotate first: the image is cached elsewhere |
| Base image vulnerabilities piling up | Image built months ago, never rebuilt | Scheduled rebuilds, digest-pinned bases, Dependabot |
| Scan gate is routinely bypassed | Failing on unfixable findings | Gate on **fixable** HIGH/CRITICAL only |
| A poisoned build cache produced a bad image | Untrusted branches sharing a cache with trusted ones | Scope caches per branch or trust level |
| One container took the host down | No memory, CPU, or PID limits | `-m`, `--cpus`, `--pids-limit` on everything |
| The OOM killer took the wrong process | Unlimited container, kernel chose by score | Limits on every container, not only the culprit |
| Container OOM-killed at 512 MB doing nothing | Runtime read host memory, not the cgroup | Container-aware JVM, or set `--max-old-space-size` |
| Service slow with no errors and no restarts | CPU quota throttling, which does not fail | Raise `--cpus`, or profile the workload |
| A dependency blip restarted every instance | Liveness check testing a downstream | Liveness = self only; readiness = dependencies |
| "exec format error" in staging | Apple Silicon `arm64` image on `amd64` host | buildx multi-arch, or `--platform linux/amd64` |
| Multi-arch builds take forty minutes | QEMU emulation on one runner | Build natively per arch, merge manifests |
| Nobody can say what version is running | Deployed a mutable tag | Immutable `:sha-…` tag or a digest |
| Production runs code CI never tested | Image rebuilt per environment | Build once, promote the same digest |
| Requests dropped on every deploy | Shell-form `CMD`, so SIGTERM never reached the app | Exec form, `exec "$@"`, drain on SIGTERM |
| Host disk full, many unrelated failures | Unrotated JSON logs and build cache | Daemon `max-size`/`max-file`, `docker builder prune` |
| A daemon restart took every service down | `live-restore` not enabled | Set it, and test a daemon restart |
| GPU container cannot see the GPU | NVIDIA Container Toolkit missing, or driver mismatch | Install the toolkit; match CUDA runtime to host driver |
| Pushing a retrained model rebuilds gigabytes | Weights baked into a layer | Mount weights from a volume or object store |
| PyTorch DataLoader workers die randomly | 64 MB default shared memory | Raise `--shm-size` |
| Eleven forks of the shared base image | Upstream requests took too long | Fix turnaround time, not policy |

## The practices that pay off most

<div class="cards">
  <div class="card"><div class="icon">👤</div><h4>Non-root by default</h4><p>A numeric <code>USER</code>, all capabilities dropped, <code>no-new-privileges</code>. Put it in a shared base image so each team inherits it.</p></div>
  <div class="card"><div class="icon">🔐</div><h4>BuildKit secret mounts</h4><p>A credential mounted this way never lands in a layer. Verify with <code>docker history</code> rather than trusting it.</p></div>
  <div class="card"><div class="icon">📌</div><h4>Digest-pin bases, rebuild weekly</h4><p>Pinning on its own freezes vulnerabilities in place. Pair it with a scheduled rebuild and you get both reproducibility and patches.</p></div>
  <div class="card"><div class="icon">🚧</div><h4>Limits on everything</h4><p>Memory, CPU, and PIDs. A container should hit a ceiling before the host does.</p></div>
  <div class="card"><div class="icon">🏷️</div><h4>Deploy digests, promote artifacts</h4><p>Build once, tag with the commit SHA, promote that exact image. Never rebuild for production.</p></div>
  <div class="card"><div class="icon">✍️</div><h4>Sign and verify</h4><p>SBOM, provenance, cosign signature, and an admission policy that refuses anything unsigned.</p></div>
  <div class="card"><div class="icon">🔬</div><h4>Test that controls refuse</h4><p>Run the operation you meant to prevent and watch it fail. A control you have never seen refuse anything is still untested.</p></div>
  <div class="card"><div class="icon">📈</div><h4>Measure image age</h4><p>Track the age of the oldest deployed image. It tells you more about exposure than a scan report does.</p></div>
</div>

## Practice cards

<ol class="guide-steps">
  <li><b>Watch a capability refuse something</b>Run <code>ping</code> from a default container, then from one with <code>--cap-drop ALL</code>. If it still works, the flag is not being applied where you think.</li>
  <li><b>Survive a read-only filesystem</b>Add <code>--read-only</code> and fix everything that breaks by declaring the writable path with <code>tmpfs</code>, not by removing the flag. Then list your service's writable paths from memory.</li>
  <li><b>Leak a secret three ways, then stop</b><code>ARG</code>, <code>ENV</code>, and <code>COPY</code>-then-<code>rm</code>. Find each with <code>docker history --no-trunc</code> and <code>docker save | tar -tv</code>. Then do it correctly with a secret mount and confirm both checks are clean.</li>
  <li><b>Break a signature</b>Sign an image with cosign and verify it. Rebuild with one byte changed, push, and verify again.</li>
  <li><b>Compare the two scan gates</b>Run Trivy with and without <code>--ignore-unfixed</code>. Decide which report a team would act on.</li>
  <li><b>Prove userns-remap works</b>Write a file to a bind mount from a root container, note the host-side owner, enable <code>userns-remap</code>, and repeat.</li>
  <li><b>Time QEMU against native</b>Build one architecture natively and the other under emulation. The ratio is the argument for per-arch runners.</li>
  <li><b>Fill a disk on purpose</b>On a disposable host, generate unrotated logs until the disk is full and count how many unrelated things break. Then set daemon rotation.</li>
</ol>

## The hardening pass every image should get

Ship this as a shared base image rather than a wiki page.

```dockerfile Dockerfile
# syntax=docker/dockerfile:1
FROM python:3.11-slim@sha256:8f2c...        # 1. pinned by digest

RUN useradd --create-home --uid 10001 --shell /usr/sbin/nologin appuser
WORKDIR /app

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    --mount=type=secret,id=pip_token \       # 2. secret never becomes a layer
    pip install -r requirements.txt

COPY --chown=appuser:appuser . .
USER 10001                                   # 3. numeric, non-root
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker run -d \
  --read-only --tmpfs /tmp:rw,noexec,nosuid \   # 4. immutable root filesystem
  --cap-drop ALL --cap-add NET_BIND_SERVICE \   # 5. least privilege
  --security-opt no-new-privileges \
  -m 512m --cpus 1 --pids-limit 200 \           # 6. bounded blast radius
  --restart on-failure:5 \
  ghcr.io/org/app@sha256:9b2c...                # 7. immutable reference
```

<div class="callout tip">
  <span class="ct">Make the safe path the default path</span>
  Publish an internal base image that already carries the non-root user, the pinned base, and the sensible defaults. Teams inherit hardening by writing <code>FROM ghcr.io/org/python-base:3.11</code>, which works better than a checklist because it asks no discipline of anyone.
</div>

<div class="callout warn">
  <span class="ct">Three flags to challenge in every review</span>
  <code>--privileged</code> disables almost all isolation. A mounted <code>/var/run/docker.sock</code> gives the container control of the daemon, which is root-equivalent on the host. <code>--net=host</code> removes network isolation. Each has legitimate uses, and each needs a written reason in the file rather than a debugging convenience left behind.
</div>

## Verifying, not assuming

Check every control above rather than trusting it.

```bash
# Is there a secret in a layer?
docker history --no-trunc myapp | grep -iE 'token|secret|password|key'
docker save myapp | tar -tv | head -40

# Is it non-root?
docker run --rm myapp id

# Which capabilities does it hold?
docker run --rm myapp sh -c 'apk add -q libcap 2>/dev/null; capsh --print' | head -3

# Is the root filesystem read-only?
docker exec api sh -c 'touch /probe 2>&1 || echo "read-only, as intended"'

# Which architecture, and which digest?
docker image inspect myapp --format '{{.Architecture}} {{index .RepoDigests 0}}'

# Did the OOM killer take it?
docker inspect api --format '{{.State.ExitCode}} {{.State.OOMKilled}}'

# Is the image signed?
cosign verify ghcr.io/org/app@sha256:9b2c... || echo 'unsigned'
```

<div class="callout warn">
  <span class="ct">Test that the control blocks something</span>
  After adding <code>--cap-drop ALL</code>, run the operation you meant to prevent. <code>ping</code> needs <code>NET_RAW</code> and <code>mount</code> needs <code>SYS_ADMIN</code>, so either one should now fail. If it succeeds, the flag is not reaching the container you think it is, and the capability restriction is not in force.
</div>

Automate the mechanical checks so they do not depend on anyone remembering:

```yaml .github/workflows/image-checks.yml
- run: hadolint Dockerfile
- run: trivy config --exit-code 1 .
- run: |
    docker history --no-trunc "$IMAGE" \
      | grep -iE 'token|secret|password|api[_-]key' && { echo "secret in a layer"; exit 1; } || true
- run: |
    test "$(docker run --rm "$IMAGE" id -u)" != "0" || { echo "image runs as root"; exit 1; }
```

## Keeping images fresh

Pinning and patching pull in opposite directions, and you need both.

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Do</h4>
    <ul>
      <li>Digest-pin <code>FROM</code> for reproducibility</li>
      <li>Rebuild on a schedule so base patches land</li>
      <li>Let Dependabot bump the pinned digest by pull request</li>
      <li>Scan on build <b>and</b> periodically in the registry</li>
      <li>Track image age as a metric</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Do not</h4>
    <ul>
      <li>Pin and then never update: frozen vulnerabilities</li>
      <li>Use a floating tag and call it "always patched"</li>
      <li>Scan only at build time, then deploy for six months</li>
      <li>Fail the gate on unfixable findings</li>
      <li>Assume a passing scan means a safe image</li>
    </ul>
  </div>
</div>

```yaml .github/workflows/rebuild.yml
name: Weekly rebuild
on:
  schedule: [{ cron: '0 4 * * 1' }]
  workflow_dispatch:
jobs:
  rebuild:
    runs-on: ubuntu-latest
    permissions: { contents: read, packages: write, id-token: write }
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v6
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:sha-${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          sbom: true
          provenance: true
```

An image built four months ago is a bigger problem than anything in today's scan report.

## Incident playbooks

### A secret was found in a published image

**Rotate first.** The image sits pulled and cached in places you do not control: CI runners, developer machines, registry mirrors, layer caches. Assume the credential is compromised no matter how fast you delete the tag. Then revoke it, remove the tag and any cached copies you can reach, find the instruction that introduced it, and close the class with BuildKit secret mounts plus a `docker history` grep in CI so the same leak cannot ship again unnoticed.

Deleting the image first and rotating later optimises for appearances over exposure.

### One container took the host down

Check limits before code. A container with no memory limit will consume all host RAM, and the OOM killer may pick a different victim: your database rather than the leaking worker. Confirm with `docker inspect` and the host's `dmesg`, then apply `-m`, `--cpus`, and `--pids-limit` to **everything** on that host. The next offender will be a different service, so limiting the guilty one buys you nothing.

If the symptom was slowness rather than a kill, suspect CPU throttling instead: an over-quota container is throttled, not failed, so there is no error to find.

### Everything went red at once

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>0m</span><strong>Blast radius</strong><small>One container or all of them? Everything at once points at the host, daemon, base image, registry, or disk rather than your diff.</small></div>
  <div class="guide-timeline-item"><span>2m</span><strong>Exit code and OOM flag</strong><small>137 + <code>OOMKilled: true</code> is a limit. 143 is a clean stop. 127 is a missing binary, usually the wrong image.</small></div>
  <div class="guide-timeline-item"><span>4m</span><strong>Which digest is running?</strong><small>Compare digests, not tags. With a mutable tag, the running code may not be the code you are reading.</small></div>
  <div class="guide-timeline-item"><span>6m</span><strong>Host resources</strong><small>Disk, inodes, memory. A full disk presents as a dozen unrelated failures.</small></div>
  <div class="guide-timeline-item"><span>8m</span><strong>Network inside the namespace</strong><small>A netshoot sidecar, not tools installed into a production image.</small></div>
  <div class="guide-timeline-item"><span>after</span><strong>Close the loop</strong><small>Pin what moved, add the limit or probe that would have caught it, and push it into the shared base image.</small></div>
</div>

```bash
docker events --since 30m --filter container=api
docker inspect api --format '{{.State.ExitCode}} {{.State.OOMKilled}} {{.State.Error}}'
docker inspect api --format '{{.Image}} {{index .RepoDigests 0}}'
docker system df -v
docker run --rm -it --network container:api nicolaka/netshoot
```

### An image you depend on was compromised

Find every deployment referencing it and at which digest. Revoke every credential those containers could reach, including the ones you believe were never used. Replace with a vetted digest or an internal mirror. Then close the class: digest pinning, a registry mirror so an upstream change is not immediately yours, signature verification at admission, and scheduled rebuilds.

### A restart storm followed a dependency blip

The liveness check is testing something it does not own. A check that fails when a downstream database goes briefly unavailable restarts every instance at once, and those restarts tend to make the downstream worse. Split it: liveness reflects only this process, readiness reflects dependencies and controls traffic.

## Running Docker as a platform

**Publish base images, not documentation.** A hardened `FROM` line gets adopted; a wiki page does not.

**Version base images with a moving major tag.** Consumers use `python-base:3.11`; you release `3.11.7-2` and move the pointer. Canary one low-risk service on the exact patch tag first, because one bad base image release otherwise breaks every team at once and costs you their trust.

**Own the registry policy.** Immutable tags where the registry supports them, retention rules so old images are pruned, an internal mirror so an upstream outage is not your outage, and an admission policy that refuses unsigned or unscanned images.

**Measure image health.** Without numbers, "our images are fine" is an opinion:

| Metric | Why it matters |
|---|---|
| Median and p95 image size | Size is deploy latency, on every deploy |
| Age of the oldest deployed image | Better exposure signal than a scan report |
| Count of fixable HIGH/CRITICAL findings | The actionable subset, not the total |
| Build duration, p50 and p95 | Where your teams' time goes |
| Percentage of deploys by digest | How answerable "what is running?" is |

<div class="callout warn">
  <span class="ct">The failure mode of a shared base image</span>
  A team needs one package added, cannot get it upstream quickly, and forks. Six months later there are eleven variants and no standard. The fix is turnaround time on upstream requests rather than policy: if a reasonable change takes two weeks, forking is the rational choice and you will lose. Treat the base image as a product with a service level, or stop calling it a standard.
</div>

## Cost and performance levers worth knowing

| Lever | Effect | Note |
|---|---|---|
| Registry or CI build cache with `mode=max` | Minutes per build | `mode=min` barely helps a multi-stage build |
| Native per-arch runners instead of QEMU | Several times faster | Merge manifests afterwards |
| Multi-stage + `-slim` | Faster pulls on every deploy | Size is deploy latency, not vanity |
| Cache mounts for package managers | Fast warm rebuilds | And nothing added to the image |
| Prebuilt base with dependencies | Removes install time | Rebuild it nightly |
| Daemon log rotation | Prevents disk-full incidents | `max-size` and `max-file` |
| `live-restore` | A daemon upgrade stops being an outage | Test it before you rely on it |

```json /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" },
  "live-restore": true,
  "userns-remap": "default",
  "default-ulimits": { "nofile": { "Name": "nofile", "Soft": 4096, "Hard": 8192 } }
}
```

`userns-remap` maps container root to an unprivileged host uid, which removes an entire class of escape consequence. It carries caveats around volume ownership and some images, so evaluate it on a test host before rolling it out. For developer machines and CI builders, rootless Docker goes further: no root daemon at all.

## Machine-learning images specifically

**Weights are data, not code.** Mount them read-only from a volume or object store, versioned independently. Baking them in means every retrain pushes gigabytes, every pull downloads them again, and the model version becomes coupled to the code version so rollback is ambiguous.

**Use the `runtime` CUDA base.** `devel` carries `nvcc` and the full toolchain, often several gigabytes more. Compile extensions in a builder stage and copy the result.

**Match the CUDA runtime to the host driver.** The image never contains a driver; it uses the host's via the NVIDIA Container Toolkit. A mismatch fails at startup with a message that does not mention drivers.

**Raise `--shm-size`.** The 64 MB default causes PyTorch DataLoader workers to die with errors that look like anything but shared memory.

**Pin everything, including CUDA and cuDNN.** ML dependency graphs are fragile enough without floating base tags.

**Set memory limits with the runtime in mind.** A framework that reads host memory will size its allocator for the whole machine. It is the same cgroup blindness that bites JVMs, with much larger numbers.

```bash
docker run -d --gpus all \
  -v model-store:/models:ro \
  --shm-size 1g \
  -m 16g --cpus 4 \
  ghcr.io/org/inference@sha256:9b2c...
```

## The checklist to run before shipping

| Check | Looking for |
|---|---|
| `FROM` pinned by digest? | Reproducible, and cannot move under you |
| Secret in `ARG`, `ENV`, or a `COPY`? | `docker history` grep comes back clean |
| Non-root numeric `USER`? | `docker run --rm img id` is not uid 0 |
| Read-only root with declared writable paths? | `--read-only` plus `tmpfs` |
| Capabilities dropped, `no-new-privileges`? | And the refusal tested |
| Memory, CPU, PID limits set? | On every container, not only the noisy one |
| Exec-form `CMD`, `exec "$@"` in scripts? | Clean stop exits 143, not 137 |
| Liveness separate from readiness? | A dependency blip does not restart the fleet |
| Deploy reference a digest? | And the running revision is reportable |
| Same artifact promoted, not rebuilt? | Production runs what CI tested |
| SBOM, provenance, signature attached? | And verification enforced at admission |
| Multi-arch, built natively where needed? | Manifest list, no silent emulation |
| Daemon log rotation and `live-restore` set? | Disk-full and upgrade incidents prevented |
| Rebuild scheduled? | Image age is a metric someone watches |

Most container incidents get prevented at review time rather than at runtime. Read a Dockerfile and a `docker run` line for what they **permit** rather than what they do, and you will catch most of these failures before they ship.

