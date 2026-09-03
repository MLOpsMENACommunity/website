The problems at this level are rarely about syntax. They are about an image sixty people deploy, a base image nobody has rebuilt in four months, and a container that took a host down with it. Start with the error table, then the practices and playbooks underneath it.

## Common errors at this level

These cause incidents rather than failed builds.

| Symptom | Real cause | Fix |
|---|---|---|
| A container escape reached the host | Process running as root with default capabilities | Non-root `USER`, `--cap-drop ALL`, `no-new-privileges` |
| A build container controlled the daemon | `/var/run/docker.sock` mounted in | Use a rootless builder or a remote BuildKit instance |
| Secret found in a shipped image | `ARG`/`ENV`/`COPY` then deleted in a later layer | BuildKit secret mounts; rebuild and **rotate** |
| Base image vulnerabilities piling up | Image built months ago, never rebuilt | Scheduled rebuilds, digest-pinned bases, Dependabot |
| Scan gate is routinely bypassed | Failing on unfixable findings | Gate on **fixable** HIGH/CRITICAL only |
| One container took the host down | No memory, CPU, or PID limits | `-m`, `--cpus`, `--pids-limit` on everything |
| Container OOM-killed at 512 MB doing nothing | Runtime read host memory, not the cgroup | Container-aware JVM, or set `--max-old-space-size` |
| "exec format error" in staging | Apple Silicon `arm64` image on `amd64` host | buildx multi-arch, or `--platform linux/amd64` |
| Nobody can say what version is running | Deployed a mutable tag | Immutable `:sha-…` tag or a digest |
| Production runs code CI never tested | Image rebuilt per environment | Build once, promote the same digest |
| Requests dropped on every deploy | Shell-form `CMD`, so SIGTERM never reached the app | Exec form, `exec "$@"`, drain on SIGTERM |
| Host disk full, many unrelated failures | Unrotated JSON logs and build cache | Daemon `max-size`/`max-file`, `docker builder prune` |
| GPU container cannot see the GPU | NVIDIA Container Toolkit missing, or driver/runtime mismatch | Install the toolkit; match CUDA runtime to host driver |
| Pushing a retrained model rebuilds gigabytes | Weights baked into a layer | Mount weights from a volume or object store |

## The practices that pay off most

<div class="cards">
  <div class="card"><div class="icon">👤</div><h4>Non-root by default</h4><p>A numeric <code>USER</code>, all capabilities dropped, <code>no-new-privileges</code>. Put it in a shared base image so nobody has to remember.</p></div>
  <div class="card"><div class="icon">🔐</div><h4>BuildKit secret mounts</h4><p>The only way a build credential never becomes a layer. Verify with <code>docker history</code> rather than trusting it.</p></div>
  <div class="card"><div class="icon">📌</div><h4>Digest-pin bases, rebuild weekly</h4><p>Pinning alone freezes vulnerabilities in place. Pinning plus scheduled rebuilds is the working combination.</p></div>
  <div class="card"><div class="icon">🚧</div><h4>Limits on everything</h4><p>Memory, CPU, and PIDs. A container should hit a ceiling before the host does.</p></div>
  <div class="card"><div class="icon">🏷️</div><h4>Deploy digests, promote artifacts</h4><p>Build once, tag with the commit SHA, promote that exact image. Never rebuild for production.</p></div>
  <div class="card"><div class="icon">✍️</div><h4>Sign and verify</h4><p>SBOM, provenance, cosign signature, and an admission policy that refuses anything unsigned.</p></div>
</div>

## The hardening pass every image should get

Apply this as a shared base image rather than a document nobody reads.

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
  Publish an internal base image that already has the non-root user, the pinned base, and the sensible defaults. Teams inherit hardening by writing <code>FROM ghcr.io/org/python-base:3.11</code> — which is far more effective than a checklist, because it requires no discipline.
</div>

## Verifying, not assuming

Every control above should be checked rather than trusted.

```bash
# Is there a secret in a layer?
docker history --no-trunc myapp | grep -iE 'token|secret|password|key'
docker save myapp | tar -xO --wildcards '*/layer.tar' | tar -tv | grep -i env

# Is it actually non-root?
docker run --rm myapp id

# Which capabilities does it really hold?
docker run --rm --cap-drop ALL myapp capsh --print 2>/dev/null || echo 'no capsh'

# Which architecture, and which digest?
docker image inspect myapp --format '{{.Architecture}} {{index .RepoDigests 0}}'

# Did the OOM killer take it?
docker inspect api --format '{{.State.ExitCode}} {{.State.OOMKilled}}'

# Does the OIDC-style trust chain hold — is the image signed?
cosign verify ghcr.io/org/app@sha256:9b2c... || echo 'unsigned'
```

<div class="callout warn">
  <span class="ct">Test that the control actually blocks something</span>
  After adding <code>--cap-drop ALL</code>, try the operation you meant to prevent — <code>ping</code> needs <code>NET_RAW</code>, <code>mount</code> needs <code>SYS_ADMIN</code>. If it still succeeds, the flag is not being applied where you think. A security control you have never seen refuse anything is decoration.
</div>

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
      <li>Pin and then never update — frozen vulnerabilities</li>
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

An image built four months ago is almost always a bigger problem than anything in today's scan report.

## Incident playbooks

### A secret was found in a published image

**Rotate first.** The image is already pulled and cached in places you do not control; assume the credential is compromised regardless of how quickly you delete the tag. Then revoke, remove the tag and any cached copies you can reach, find the instruction that introduced it, and close the class — BuildKit secret mounts plus a `docker history` grep in CI so it cannot recur silently.

Deleting the image first and rotating later optimises for the wrong thing.

### One container took the host down

Check limits before code. A container with no memory limit will happily consume all host RAM, and the OOM killer may kill something else entirely. Confirm with `docker inspect` and host `dmesg`, then apply `-m`, `--cpus`, and `--pids-limit` to **everything** on the host — not just the guilty container, because the next one will be different.

### Everything went red at once

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>0m</span><strong>Blast radius</strong><small>One container or all of them? Everything at once means host, daemon, base image, or registry — not your diff.</small></div>
  <div class="guide-timeline-item"><span>2m</span><strong>Exit code and OOM flag</strong><small>137 + <code>OOMKilled: true</code> is a limit. 143 is a clean stop. 127 is a missing binary, usually the wrong image.</small></div>
  <div class="guide-timeline-item"><span>4m</span><strong>Which digest is running?</strong><small>Compare digests, not tags. With a mutable tag, the running code may not be the code you are reading.</small></div>
  <div class="guide-timeline-item"><span>6m</span><strong>Host resources</strong><small>Disk, inodes, memory. A full disk presents as a dozen unrelated failures.</small></div>
  <div class="guide-timeline-item"><span>8m</span><strong>Network inside the namespace</strong><small>A netshoot sidecar, not tools installed into a production image.</small></div>
  <div class="guide-timeline-item"><span>after</span><strong>Close the loop</strong><small>Pin what moved, add the limit or probe that would have caught it, and push it into the shared base image.</small></div>
</div>

```bash
docker events --since 30m --filter container=api
docker inspect api --format '{{.State.ExitCode}} {{.State.OOMKilled}} {{.State.Error}}'
docker system df -v
docker run --rm -it --network container:api nicolaka/netshoot
```

### An image you depend on was compromised

Find every deployment referencing it and at what digest. Revoke every credential those containers could reach — not only the ones you believe were used. Replace with a vetted digest or an internal mirror. Then close the class: digest pinning, an internal registry mirror, signature verification at admission, and scheduled rebuilds.

## Running Docker as a platform

**Publish base images, not documentation.** A hardened `FROM` line is adopted; a wiki page is not.

**Version base images with a moving major tag.** Consumers use `python-base:3.11`; you release `3.11.7-2` and move the pointer. Canary one low-risk service on the exact patch first — otherwise one bad base image release breaks every team simultaneously.

**Own the registry policy.** Immutable tags where the registry supports it, retention rules so old images are pruned, and an admission policy that refuses unsigned or unscanned images.

**Measure image health.** Median and p95 image size, age of the oldest deployed image, count of fixable HIGH/CRITICAL findings, and build duration. Without numbers, "our images are fine" is an opinion.

<div class="callout warn">
  <span class="ct">The failure mode of a shared base image</span>
  A team needs one package added, cannot get it upstream quickly, and forks. Six months later there are eleven variants and no standard. The fix is turnaround time on upstream requests, not policy — if a reasonable change takes two weeks, forking is the rational choice and you will lose.
</div>

## Cost and performance levers worth knowing

| Lever | Effect | Note |
|---|---|---|
| Registry or GHA build cache with `mode=max` | Minutes per CI build | `mode=min` barely helps a multi-stage build |
| Native per-arch runners instead of QEMU | Several times faster | Merge manifests afterwards |
| Multi-stage + `-slim` | Faster pulls on every deploy | Size is deploy latency, not vanity |
| Cache mounts for package managers | Fast warm rebuilds | And nothing added to the image |
| Prebuilt base with dependencies | Removes install time entirely | Rebuild it nightly |
| Daemon log rotation | Prevents disk-full incidents | `max-size` and `max-file` |

```json /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" },
  "live-restore": true,
  "userns-remap": "default"
}
```

`userns-remap` maps container root to an unprivileged host UID, which removes an entire class of escape consequence. It has real caveats around volume ownership and some images, so test it before rolling it out — but it is worth evaluating rather than dismissing.

## Machine-learning images specifically

**Weights are data, not code.** Mount them read-only from a volume or object store, versioned independently. Baking them in means every retrain pushes gigabytes and every image pull downloads them again.

**Use the `runtime` CUDA base.** `devel` carries `nvcc` and the full toolchain — often several gigabytes more. Compile extensions in a builder stage and copy the result.

**Match the CUDA runtime to the host driver.** The image never contains a driver; it uses the host's via the NVIDIA Container Toolkit. A mismatch fails at startup with a message that does not obviously say "driver".

**Raise `--shm-size`.** The 64 MB default causes PyTorch DataLoader workers to die with errors that look like anything but shared memory.

**Pin everything, including CUDA and cuDNN.** ML dependency graphs are fragile enough without floating base tags.

```bash
docker run -d --gpus all \
  -v model-store:/models:ro \
  --shm-size 1g \
  -m 16g --cpus 4 \
  ghcr.io/org/inference@sha256:9b2c...
```
