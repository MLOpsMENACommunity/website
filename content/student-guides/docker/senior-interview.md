One continuous review of the whole subject, organised by topic rather than by level — foundations, image and stack machinery, and the security and operations work a senior is accountable for. Roughly forty minutes. Common questions are at the end.

## The model, and the fundamentals in one screen

<div class="flow">
  <div class="node">DOCKERFILE<small>a recipe</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">IMAGE<small>read-only layers</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">CONTAINER<small>+ writable layer</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">REGISTRY<small>tag or digest</small></div>
</div>

> Docker packages an application with its runtime and dependencies into an immutable image. A container is a running instance — a Linux process isolated by namespaces and cgroups, sharing the host kernel. The artifact that passed CI is the artifact that runs in production.

**Container vs VM:** shared kernel, milliseconds, tens of MB — versus a full guest OS behind a hypervisor. Container isolation is **weaker**, and saying so unprompted is a senior signal. **Image vs container:** template versus running instance with a thin writable layer. **A container lives exactly as long as its main process.**

| Trap | Cause | Fix |
|---|---|---|
| Container exits instantly | Main process finished | It is one process, not a machine |
| Published port dead | App bound `127.0.0.1` | Bind `0.0.0.0` |
| `EXPOSE` did nothing | Documentation only | `-p host:container` |
| Build hangs | Start command in `RUN` | Belongs in `CMD`/`ENTRYPOINT` |
| Data gone after `rm` | Writable layer | Named volume |
| Cannot resolve `db` | Default bridge has no DNS | User-defined network |
| `localhost` unreachable from a container | It means *that* container | Service name, or `host.docker.internal` |

| Exit code | Means |
|---|---|
| 0 / 1 | Finished normally / application error |
| 125 / 126 / 127 | Bad `docker run` flags / not executable / not found |
| 137 / 143 | Killed, usually OOM / clean SIGTERM |

## Images, layers, and cache

**A layer is reused when its inputs are unchanged, and once one layer is invalidated every layer after it rebuilds.** Order least-changing first: manifest, install, then source.

**Layers are additive — deleting does not shrink, and does not remove.** A file added then deleted in a later instruction is still in the image and still readable.

```dockerfile
# Right: one layer, cleaned in the same layer
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*
```

Multi-stage builds are the biggest size and security win — only what you `COPY --from` crosses the boundary, so compilers, source, dev dependencies, and build credentials stay behind.

| Lever | Effect |
|---|---|
| Multi-stage | Largest single win |
| `-slim` base | Hundreds of MB |
| `--no-install-recommends`, clean apt lists | Tens of MB |
| No package caches (`--no-cache-dir`, `--omit=dev`) | Tens to hundreds of MB |
| `.dockerignore` | Smaller context, fewer cache busts |
| Distroless / Alpine runtime | Smallest, at the cost of no shell |

Alpine uses musl, so prebuilt wheels and some native modules do not apply — you compile from source and often end up larger and slower than `-slim`. `docker history` before optimising.

## Config, secrets, and build mounts

| Mechanism | Available at | In the image | Use for |
|---|---|---|---|
| `ARG` | Build only | **Yes** (`docker history`) | Base versions, build flags |
| `ENV` | Build + run | **Yes** | Non-secret defaults |
| `-e` / `--env-file` | Run only | No | Per-environment config |
| Mounted file / secret store | Run only | No | Credentials |
| `--mount=type=secret` | Build only | **No** | Build-time credentials |
| `--mount=type=cache` | Build only | **No** | Package caches across builds |

```dockerfile
# syntax=docker/dockerfile:1
RUN --mount=type=secret,id=pip_token \
    PIP_INDEX_URL="https://$(cat /run/secrets/pip_token)@pypi.internal/simple" \
    pip install -r requirements.txt

RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt
```

```bash
docker history --no-trunc myapp | grep -iE 'token|secret|password|key'   # verify
```

## Networking, volumes, Compose

| Driver | Behaviour |
|---|---|
| `bridge` (default) | Private; **no name resolution** |
| User-defined bridge | Same **plus DNS by container name** |
| `host` | No network isolation |
| `none` | No networking |

| Volume type | Notes |
|---|---|
| Named | Docker-managed, portable — state |
| Bind mount | Host path, UID-sensitive — dev only |
| Anonymous | Unnamed; orphaned disk usage |
| `tmpfs` | Memory only |

```yaml compose.yaml
services:
  api:
    build: { context: ., target: runtime }
    ports: ['8000:8000']
    depends_on:
      db: { condition: service_healthy }
    restart: unless-stopped
  db:
    image: postgres:16
    volumes: ['pgdata:/var/lib/postgresql/data']
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 10s
      retries: 5
      start_period: 30s
volumes:
  pgdata:
```

Plain `depends_on` waits for **start, not readiness** — add a health check plus `condition: service_healthy`, and retries in the app anyway. `--start-period` is the health-check option people forget. `docker compose config` prints the merged file and settles most "I didn't write that" arguments.

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Exec form — signals work</h4>
    <ul>
      <li><code>CMD ["node", "server.js"]</code></li>
      <li>Your process is PID 1, receives SIGTERM</li>
      <li>Entrypoint scripts end with <code>exec "$@"</code></li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Shell form — signals lost</h4>
    <ul>
      <li><code>CMD node server.js</code></li>
      <li>PID 1 is <code>/bin/sh</code>, which does not forward</li>
      <li>Hard-killed after the grace period, mid-request</li>
    </ul>
  </div>
</div>

## The isolation model

| Mechanism | Provides |
|---|---|
| **Namespaces** | Separate PID, mount, network, hostname, user, IPC views |
| **cgroups** | CPU, memory, PID, block-I/O limits |
| **Capabilities, seccomp, AppArmor/SELinux** | Which privileged operations are permitted |

<div class="callout warn">
  <span class="ct">Root in a container is root on the host kernel</span>
  Without user-namespace remapping or a rootless daemon, UID 0 inside is UID 0 outside. There is no hypervisor. A container escape lands an attacker on the host as root — which is why untrusted code needs gVisor, Kata, Firecracker, or a real VM, not a namespace.
</div>

### Hardening, in five controls

```bash
docker run -d \
  --user 10001:10001 \
  --read-only --tmpfs /tmp:rw,noexec,nosuid \
  --cap-drop ALL --cap-add NET_BIND_SERVICE \
  --security-opt no-new-privileges \
  -m 512m --cpus 1 --pids-limit 200 \
  myapp:sha-a1b2c3d
```

| Control | Stops |
|---|---|
| Non-root `USER` | The default root process |
| `--read-only` | Writing a payload to disk |
| `--cap-drop ALL` | `NET_RAW` spoofing, `SYS_ADMIN` mounts, `SYS_PTRACE` |
| `no-new-privileges` | setuid escalation |
| Memory / CPU / PID limits | Host starvation, fork bombs |

<div class="callout warn">
  <span class="ct">Three flags that hand over the machine</span>
  <code>--privileged</code> disables almost all isolation. Mounting <code>/var/run/docker.sock</code> gives control of the daemon, which is root on the host. <code>--net=host</code> removes network isolation. Each is an architectural decision, never a debugging convenience.
</div>

## Supply chain

| Control | Answers |
|---|---|
| Digest pinning in `FROM` | "Did the base change under us?" |
| SBOM | "What packages are in this image?" |
| Scanning | "Which are known-vulnerable?" |
| Provenance / attestations | "Which workflow and commit built it?" |
| Signing (cosign) | "Was this pushed by us?" |
| Admission policy | "Can an unsigned image run at all?" |

```bash
docker buildx build --sbom=true --provenance=true -t ghcr.io/org/app:sha-a1b2c3d --push .
trivy image --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed ghcr.io/org/app:sha-a1b2c3d
cosign sign ghcr.io/org/app@sha256:9b2c...
```

Gate on **fixable** HIGH/CRITICAL — failing on unfixable findings trains everyone to ignore scan output. The real problem is usually an image built four months ago, so rebuild regularly so base patches land.

## Multi-arch, limits, runtime

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t ghcr.io/org/app:1.4.2 --push .
docker buildx imagetools inspect ghcr.io/org/app:1.4.2
```

A manifest list is one tag pointing at several images. QEMU cross-builds are several times slower — build natively per arch and merge manifests for anything on the critical path. **"exec format error" is an architecture mismatch.**

<div class="callout warn">
  <span class="ct">Runtimes that ignore the cgroup limit</span>
  Older JVMs and Node read the <b>host's</b> memory and size their heap for a 64 GB machine inside a 512 MB container, then get OOM-killed instantly. Modern JVMs are container-aware; for Node set <code>--max-old-space-size</code> to match.
</div>

Production practices: one concern per container · log to stdout with daemon-side rotation · health checks that test a real dependency · handle SIGTERM and drain · deploy immutable digests · build once and promote the same artifact.

## ML containers

```dockerfile
FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04     # runtime, not devel
RUN --mount=type=cache,target=/root/.cache/pip pip3 install -r requirements.txt
USER 10001
ENV MODEL_PATH=/models/current                        # weights mounted, not baked
```

```bash
docker run -d --gpus all -v model-store:/models:ro --shm-size 1g ghcr.io/org/inference:sha-a1b2c3d
```

Use the `runtime` CUDA base (`devel` carries the toolchain, gigabytes larger). **Never bake weights into the image** — they change on a different cadence and force a rebuild to ship a retrained model. `--gpus all` needs the NVIDIA Container Toolkit on the host, and the image's CUDA runtime must be compatible with the host driver. Raise `--shm-size` or PyTorch DataLoader workers crash confusingly.

## Where Docker stops

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Docker and Compose suffice</h4>
    <ul>
      <li>Local development and CI</li>
      <li>One host, a handful of services</li>
      <li>Restart-on-failure is adequate</li>
      <li>Deploy downtime acceptable</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>You need an orchestrator</h4>
    <ul>
      <li>Multiple hosts, scheduling decisions</li>
      <li>Rolling deploys and rollback</li>
      <li>Autoscaling</li>
      <li>Cross-host discovery and load balancing</li>
      <li>Declarative state with reconciliation</li>
    </ul>
  </div>
</div>

Everything transfers: Kubernetes runs OCI images, treats `HEALTHCHECK` thinking as liveness and readiness probes, enforces the same cgroup limits, and applies non-root and capability controls via a security context.

## Common interview questions

<ol class="guide-steps">
  <li><b>What isolates a container, and is it a security boundary?</b>Namespaces for the views, cgroups for the limits, capabilities and seccomp for privileged operations. There is no hypervisor and the kernel is shared, so it is a weaker boundary than a VM — a kernel bug is an escape path. For untrusted code you want gVisor, Kata, Firecracker, or a real VM.</li>
  <li><b>Why is running as root inside a container a problem?</b>Without user-namespace remapping, UID 0 inside is UID 0 on the host. Combined with an escape — a kernel bug, a careless bind mount, an added capability — the attacker is root on the host. Add a non-root <code>USER</code>, drop all capabilities, and add back only what is needed.</li>
  <li><b>Name three run flags that effectively remove isolation.</b><code>--privileged</code>, mounting <code>/var/run/docker.sock</code> (control of the daemon is root on the host), and <code>--net=host</code>. All three are architectural decisions, not debugging shortcuts.</li>
  <li><b>I passed a token as a build ARG then deleted the file. Am I safe?</b>No, twice over. <code>ARG</code> values are recorded in image metadata and readable via <code>docker history</code>, and layers are additive so the deleted file still exists in the earlier layer. Use BuildKit <code>--mount=type=secret</code>, rebuild, and rotate the credential.</li>
  <li><b>How do you keep secrets out of images entirely?</b>Build time: BuildKit secret mounts or SSH agent forwarding — never <code>ARG</code>/<code>ENV</code>/<code>COPY</code>. Run time: environment from a secret manager, or a read-only mounted file. Then verify with <code>docker history</code> and by inspecting the layers rather than assuming.</li>
  <li><b>What is the difference between a layer cache and a cache mount?</b>A layer cache reuses a whole instruction's result and its contents ship in the image. A BuildKit cache mount persists a directory across builds and is **never** part of the image — which is why you keep pip's cache with a mount instead of disabling it.</li>
  <li><b>How would you prove what is inside an image and where it came from?</b>Build with <code>--sbom=true --provenance=true</code>, scan the SBOM, sign the digest with cosign, and enforce signature verification at admission. Pin base images by digest so the inputs are reproducible.</li>
  <li><b>How do you set a scanning gate that people will not ignore?</b>Fail on **fixable** HIGH and CRITICAL, exclude unfixable findings from the gate but track them, and rebuild on a schedule so base image patches land. A gate that fails on things nobody can fix is a gate everybody bypasses.</li>
  <li><b>A container exits 137. Walk me through it.</b>SIGKILL, nearly always the OOM killer — confirm with <code>docker inspect --format '{{.State.OOMKilled}}'</code>. Then decide whether the limit is wrong or the app is leaking. Also check whether the runtime is cgroup-aware: an older JVM or Node sizing its heap from host memory will be killed immediately inside a small limit.</li>
  <li><b>"exec format error" in staging but it works locally.</b>Architecture mismatch — an Apple Silicon build produces <code>arm64</code> and the server wants <code>amd64</code>. Build multi-arch with buildx, or set <code>--platform linux/amd64</code>. Verify with <code>docker image inspect --format '{{.Architecture}}'</code>.</li>
  <li><b>Why not deploy <code>:latest</code>?</b>A tag is a mutable pointer, so two hosts pulling an hour apart can run different code, rollback is undefined, and "what is running?" is unanswerable. Deploy an immutable SHA tag or a digest, and build once then promote that exact artifact.</li>
  <li><b>How do you shrink a 1.2 GB image?</b><code>docker history</code> first. Then multi-stage, a <code>-slim</code> base, <code>--no-install-recommends</code> with apt lists cleaned in the same <code>RUN</code>, no package caches, and a real <code>.dockerignore</code>. Consider distroless last, accepting that you lose shell access for debugging.</li>
  <li><b>Where does Docker stop and Kubernetes begin?</b>Compose is one host with restart-on-failure. You need an orchestrator once you have multiple hosts, rolling deploys with rollback, autoscaling, cross-host service discovery, or declarative reconciliation. The concepts carry over — OCI images, health probes, cgroup limits, security contexts.</li>
  <li><b>How do you containerise a GPU training or inference workload?</b>A <code>runtime</code> CUDA base matched to the host driver, dependencies installed via a cache mount, non-root user, and **model weights mounted from a volume rather than baked in** so code and weights version independently. Run with <code>--gpus all</code> and a raised <code>--shm-size</code>.</li>
  <li><b>Production is failing everywhere at once. First three moves?</b>Establish blast radius — everything at once points at the host, daemon, base image, or registry, not a diff. Check exit codes and the OOM flag. Confirm which image digest is actually running, since a mutable tag means the code you are reading may not be the code running. Then host disk and inodes, because a full disk presents as a dozen unrelated failures.</li>
</ol>

## Final self-test

- Name the three isolation mechanisms and what each provides.
- Explain why root in a container is a host-level risk.
- Give the three flags that remove isolation.
- Explain why a deleted secret is still in the image, and the correct fix.
- Distinguish a layer cache from a cache mount.
- List the supply-chain controls and what question each answers.
- Explain a 137 exit and two different root causes.
- Say where Docker stops and what transfers to an orchestrator.
- Explain why model weights do not belong in an image layer.
