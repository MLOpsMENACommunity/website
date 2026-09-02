Up to this point the questions have been about making containers work. From here they are different: what can a compromised container reach, what is actually inside the image you are shipping, who can prove it was built from your source, and what happens when one container tries to take the host down with it.

This is where mistakes have consequences beyond a failed build. I am starting with the isolation model, because everything else in this track depends on understanding what a container is *not*.

## What isolation actually gives you

A container is a Linux process with a restricted view. That view is built from three kernel features, and knowing which one does what is the difference between reasoning about security and guessing.

| Mechanism | Provides |
|---|---|
| **Namespaces** | Separate views of PIDs, mounts, network, hostname, users, IPC |
| **cgroups** | Limits on CPU, memory, PIDs, block I/O |
| **Capabilities, seccomp, AppArmor/SELinux** | Restricting which privileged operations the process may perform |

There is **no hypervisor**. The kernel is shared with the host and every other container on it.

<div class="callout warn">
  <span class="ct">Root in a container is root on the host kernel</span>
  Unless you are using user namespace remapping or a rootless daemon, UID 0 inside the container is UID 0 outside it. A container escape — via a kernel bug, a careless bind mount, or an added capability — lands an attacker on the host as root. This is why "it's just a container" is not a security boundary you can lean on for untrusted code.
</div>

The practical consequence: if you must run genuinely untrusted code, you want a stronger boundary than a namespace — gVisor, Kata Containers, Firecracker, or a separate VM.

## Hardening a container

Five changes cover most of the realistic risk, and they cost almost nothing.

```dockerfile Dockerfile
FROM python:3.11-slim

# 1. A real non-root user with a fixed UID
RUN useradd --create-home --uid 10001 --shell /usr/sbin/nologin appuser

WORKDIR /app
COPY --chown=appuser:appuser requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY --chown=appuser:appuser . .

USER 10001                        # numeric, so it survives image inspection tooling
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker run -d \
  --user 10001:10001 \
  --read-only \                       # 2. immutable root filesystem
  --tmpfs /tmp:rw,noexec,nosuid \     #    with writable scratch where needed
  --cap-drop ALL \                    # 3. drop every capability
  --cap-add NET_BIND_SERVICE \        #    add back only what is required
  --security-opt no-new-privileges \  # 4. block setuid escalation
  -m 512m --cpus 1 --pids-limit 200 \ # 5. bound the blast radius
  myapp:1.4.2
```

| Control | Stops |
|---|---|
| `USER` non-root | The default case where a container process runs as root |
| `--read-only` | Writing a payload to disk; forces you to declare writable paths |
| `--cap-drop ALL` | `NET_RAW` spoofing, `SYS_ADMIN` mounts, `SYS_PTRACE` inspection of other processes |
| `no-new-privileges` | A setuid binary escalating within the container |
| Memory / CPU / PID limits | One container starving the host, or a fork bomb |

<div class="callout warn">
  <span class="ct">Three flags that hand over the machine</span>
  <code>--privileged</code> disables almost all isolation at once. <code>-v /var/run/docker.sock:/var/run/docker.sock</code> gives the container control of the daemon, which is root on the host. <code>--net=host</code> removes network isolation entirely. Each is occasionally justified; all three should be treated as an architectural decision, not a debugging convenience.
</div>

## Secrets, properly

Anything that reaches an image layer is permanent and readable by anyone who can pull it. Layers are additive — deleting in a later instruction removes nothing.

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Safe</h4>
    <ul>
      <li>BuildKit <code>--mount=type=secret</code> at build time</li>
      <li>SSH agent forwarding for private dependencies</li>
      <li>Run-time environment from a secret manager</li>
      <li>A file mounted read-only at run time</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Permanent leak</h4>
    <ul>
      <li><code>ARG TOKEN</code> — recorded in <code>docker history</code></li>
      <li><code>ENV PASSWORD</code> — in the image metadata</li>
      <li><code>COPY .env .</code> then <code>RUN rm .env</code></li>
      <li>A private key in the build context at all</li>
    </ul>
  </div>
</div>

```dockerfile Dockerfile
# syntax=docker/dockerfile:1

FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .

# The secret is mounted for this RUN only and never becomes a layer
RUN --mount=type=secret,id=pip_token \
    PIP_INDEX_URL="https://$(cat /run/secrets/pip_token)@pypi.internal/simple" \
    pip install --no-cache-dir -r requirements.txt
```

```bash
docker build --secret id=pip_token,env=PIP_TOKEN -t myapp:1.4.2 .

# Private Git dependencies without embedding a key
docker build --ssh default -t myapp:1.4.2 .
```

Verify rather than assume:

```bash
docker history --no-trunc myapp:1.4.2 | grep -i -E 'token|secret|password|key'
docker save myapp:1.4.2 | tar -tv | head        # inspect the actual layer contents
```

## BuildKit cache mounts

Separate from layer caching: a cache mount persists a directory **across builds** without ever entering the image.

```dockerfile
# syntax=docker/dockerfile:1
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt
```

Note there is no `--no-cache-dir` here: you *want* the cache, and the mount keeps it out of the image. The same pattern works for `apt`, npm, Go modules, and Cargo — and it is the main reason a warm rebuild can drop from minutes to seconds even when the lockfile changed.

## Supply chain

The question a senior gets asked is not "did it build?" but "can you prove what is in it and where it came from?"

| Control | Answers |
|---|---|
| **Digest pinning** in `FROM` | "Did the base image change under us?" |
| **SBOM** | "What packages are in this image?" |
| **Vulnerability scanning** | "Which of them are known-vulnerable?" |
| **Provenance / attestations** | "Which workflow and commit produced this?" |
| **Signing** (cosign, Notation) | "Was this pushed by us?" |
| **Admission policy** | "Can an unsigned image run at all?" |

```dockerfile
# Pinned by digest: reproducible, and immune to a repointed tag
FROM python:3.11-slim@sha256:8f2c...
```

```bash
# Build with an SBOM and provenance attached
docker buildx build \
  --sbom=true --provenance=true \
  -t ghcr.io/org/app:sha-a1b2c3d --push .

# Scan, and fail CI on what matters
trivy image --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed ghcr.io/org/app:sha-a1b2c3d

# Sign, and verify at deploy time
cosign sign ghcr.io/org/app@sha256:9b2c...
cosign verify --certificate-identity-regexp '.*' ghcr.io/org/app@sha256:9b2c...
```

<div class="callout tip">
  <span class="ct">Why <code>--ignore-unfixed</code> is not cheating</span>
  A scanner will report vulnerabilities with no available patch. Failing the build on those trains everyone to ignore scan output. Gate on <b>fixable</b> HIGH and CRITICAL findings, track the rest, and rebuild regularly so base image patches actually land — an image built four months ago is the real problem, not the report.
</div>

## Multi-architecture builds

Apple Silicon builds `arm64`. Most servers want `amd64`. Cloud ARM instances want `arm64`. A single-arch image is a deployment failure waiting to happen.

```bash
docker buildx create --use --name multi
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ghcr.io/org/app:1.4.2 --push .

docker buildx imagetools inspect ghcr.io/org/app:1.4.2
```

The result is a **manifest list** — one tag pointing at several images, with the client picking the right one. Emulated cross-builds via QEMU are several times slower than native, so for anything on the critical path, build each architecture on its own native runner and merge the manifests.

<div class="callout warn">
  <span class="ct">"exec format error"</span>
  That message almost always means an architecture mismatch: an <code>arm64</code> image on an <code>amd64</code> host, or the reverse. Confirm with <code>docker image inspect --format '{{.Architecture}}'</code>.
</div>

## Resource limits and the OOM killer

Without limits, one container can consume all host memory and the kernel will kill *something* — not necessarily the guilty container.

```bash
docker run -d \
  -m 512m --memory-reservation 256m \
  --cpus 1.5 \
  --pids-limit 200 \
  --restart on-failure:5 \
  myapp:1.4.2

docker stats --no-stream
docker inspect --format '{{.State.OOMKilled}}' myapp     # true after a 137
```

| Limit | Effect |
|---|---|
| `-m` / `--memory` | Hard ceiling; exceeding it means SIGKILL and exit 137 |
| `--memory-reservation` | Soft target under host pressure |
| `--cpus` | CPU quota, expressed in cores |
| `--pids-limit` | Caps process count — the fork-bomb defence |
| `--restart on-failure:N` | Bounded retries instead of a crash loop forever |

<div class="callout warn">
  <span class="ct">Runtimes that do not see the cgroup limit</span>
  Older JVMs and Node builds read the <b>host's</b> memory, not the container's, so they size their heap for a 64 GB machine inside a 512 MB container and get OOM-killed immediately. Modern JVMs are container-aware; for Node, set <code>--max-old-space-size</code> explicitly to match the limit.
</div>

## Production runtime practices

<ol class="guide-steps">
  <li><b>One concern per container</b>Not literally one process — a supervisor for a worker pool is fine — but one responsibility, so it can be scaled, restarted, and logged independently.</li>
  <li><b>Log to stdout and stderr</b>Never to a file inside the container. Configure log rotation on the daemon (<code>max-size</code>, <code>max-file</code>) or you will eventually fill a disk with JSON.</li>
  <li><b>Health checks that mean something</b>A liveness check that only proves the process is alive is worthless. Check the dependency you actually need, and keep it cheap enough to run every 30 seconds.</li>
  <li><b>Handle SIGTERM</b>Exec form, and <code>exec "$@"</code> in entrypoint scripts. Then drain connections on <code>SIGTERM</code> instead of dropping them.</li>
  <li><b>Immutable, digest-addressable deploys</b>Deploy <code>:sha-a1b2c3d</code> or a digest. A moving tag makes "what is running?" unanswerable and rollback undefined.</li>
  <li><b>Build once, promote the same artifact</b>If production rebuilds the image, production is running something CI never tested.</li>
</ol>

```json /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" },
  "default-ulimits": { "nofile": { "Name": "nofile", "Soft": 4096, "Hard": 8192 } },
  "live-restore": true
}
```

## Containers for machine learning

ML images are where every size and reproducibility problem is amplified: a CUDA base is gigabytes before your code exists, and model weights are large binary blobs that do not belong in a layer.

```dockerfile Dockerfile
# syntax=docker/dockerfile:1
FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04

ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=0
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3.11 python3-pip \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cache mount: wheels are huge and this keeps them out of the image
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip3 install -r requirements.txt

RUN useradd --create-home --uid 10001 appuser
COPY --chown=appuser:appuser src/ ./src/
USER 10001

# Weights arrive as a mounted volume, NOT baked into the image
ENV MODEL_PATH=/models/current
CMD ["python3", "-m", "src.serve"]
```

```bash
docker run -d --gpus all \
  -v model-store:/models:ro \
  -p 8080:8080 \
  --shm-size 1g \
  ghcr.io/org/inference:sha-a1b2c3d
```

Four decisions there are the whole lesson:

**Use the `runtime` CUDA base, not `devel`.** The devel image carries the full toolchain and is often several gigabytes larger. Compile in a builder stage if you need `nvcc`.

**Never bake model weights into the image.** They make every layer push gigabytes, they change on a different cadence than code, and they force a rebuild to ship a retrained model. Mount them read-only from a volume or object store, versioned separately.

**`--gpus all` requires the NVIDIA Container Toolkit on the host.** The image does not contain a driver; it uses the host's, which is why the CUDA *runtime* version in the image must be compatible with the host driver.

**`--shm-size` matters for PyTorch DataLoader.** The 64 MB default shared-memory segment causes confusing worker crashes; raise it.

## Where Docker stops

Knowing the boundary is itself a senior signal.

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Docker and Compose are enough</h4>
    <ul>
      <li>Local development and CI</li>
      <li>A single host, a handful of services</li>
      <li>Restart-on-failure is adequate</li>
      <li>Downtime during a deploy is acceptable</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>You need an orchestrator</h4>
    <ul>
      <li>More than one host, or scheduling decisions</li>
      <li>Rolling deploys and automatic rollback</li>
      <li>Horizontal autoscaling</li>
      <li>Service discovery and load balancing across hosts</li>
      <li>Declarative desired state with reconciliation</li>
    </ul>
  </div>
</div>

The reassuring part: everything in this guide transfers. Kubernetes runs OCI images, reads the same `HEALTHCHECK` thinking as liveness and readiness probes, enforces the same cgroup limits, and applies the same non-root and capability controls through a security context. Compose is not a stepping stone you throw away — it is the same model on one host.

## Debugging production under pressure

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>0m</span><strong>Blast radius first</strong><small>One container or every container? Everything failing at once points at the host, the daemon, a base image, or a registry — not your diff.</small></div>
  <div class="guide-timeline-item"><span>2m</span><strong>Exit code and OOM flag</strong><small>137 with <code>OOMKilled: true</code> is a memory limit. 143 is a clean SIGTERM. 127 is a missing binary — usually the wrong image.</small></div>
  <div class="guide-timeline-item"><span>4m</span><strong>Confirm which image is running</strong><small>Compare digests, not tags. A mutable tag means the running code may not be the code you are reading.</small></div>
  <div class="guide-timeline-item"><span>6m</span><strong>Host resources</strong><small><code>docker system df</code>, disk, inodes, and memory. A full disk presents as a dozen unrelated failures.</small></div>
  <div class="guide-timeline-item"><span>8m</span><strong>Network from inside the namespace</strong><small>A netshoot sidecar rather than installing tools into a production image.</small></div>
  <div class="guide-timeline-item"><span>after</span><strong>Close the loop</strong><small>Pin what moved, add the limit or health check that would have caught it, and write it into the shared base image so no other team rediscovers it.</small></div>
</div>

```bash
docker inspect api --format '{{.State.ExitCode}} {{.State.OOMKilled}} {{.State.Error}}'
docker inspect api --format '{{.Image}}'
docker inspect api --format '{{index .RepoDigests 0}}'
docker events --since 30m --filter container=api
docker system df -v
```

## Where this leaves you

You should now be able to look at a Dockerfile and a `docker run` line and see not just what they do but what they *permit*: whether the process is root, what capabilities it holds, whether the filesystem is writable, whether a secret is in a layer, whether the base image can change under you, and whether one container can take the host with it.

That review instinct is the most valuable thing here, because — exactly as with CI pipelines — most container incidents are prevented at review time rather than at runtime.
