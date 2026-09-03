Part three of three, and the one to read if you only read one. A cumulative review of **the entire series** — foundations, image and runtime machinery, and the security and platform work a senior owns — organised by topic rather than by level. About fifty minutes. Fast review first, common questions at the end.

## Part one — foundations

<div class="flow">
  <div class="node">DOCKERFILE<small>a recipe</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">IMAGE<small>read-only layers</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">CONTAINER<small>+ writable layer</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">REGISTRY<small>push / pull</small></div>
</div>

> Docker packages an application with its runtime and dependencies into an immutable image. A container is a running instance — a process on the host isolated by namespaces and cgroups, not a virtual machine. The artifact that passed CI is the artifact that runs in production.

**Container versus VM:** shared kernel, milliseconds, tens of MB, isolated by kernel features — versus a full guest OS, tens of seconds, gigabytes, isolated by a hypervisor. Container isolation is *weaker*, and saying so unprompted is the signal.

**Image versus container:** read-only template versus running instance with a thin writable layer. One image, many containers. Anything outside a volume dies with `docker rm`.

**A container lives exactly as long as its main process.** `EXPOSE` publishes nothing. `RUN` is build time, `CMD` is run time. Inside a container, bind `0.0.0.0` and log to stdout.

### Exit codes and the first five commands

| Exit code | Means | | Command | For |
|---|---|---|---|---|
| 0 / 1 | Normal / application error | | `docker logs --tail 100` | What it said |
| 125 / 126 / 127 | Bad flags / not executable / not found | | `docker ps -a` | Exit code |
| 137 | SIGKILL — usually the memory limit | | `docker inspect` | Resolved config |
| 143 | SIGTERM — a clean shutdown | | `docker run -it --entrypoint sh` | Inside a crashing image |
| — | — | | `docker diff` | What it wrote |

### The traps, and their shared causes

Three ideas explain nearly every beginner failure: a container is **one process**, the writable layer is **temporary**, and build time is **not** run time.

| Symptom | Cause | Fix |
|---|---|---|
| Container exits instantly | The main process finished | `-it`, or run a real server |
| Published port refuses connections | App on `127.0.0.1` | Bind `0.0.0.0` |
| Build hangs forever | Start command in a `RUN` | It belongs in `CMD` |
| Every build reinstalls dependencies | `COPY . .` before the install | Manifest first |
| Data gone after `docker rm` | It was in the writable layer | A named volume |
| `docker logs` is empty | App writes to a file | Log to stdout |
| Cannot reach a sibling container | Used `localhost`, or the default bridge | Service name on a user-defined network |
| Deleted secret still in the image | Layers are additive | Rebuild without it, and **rotate** |

## Part two — image and runtime machinery

### Layers and the cache

**A layer is reused when its cache key is unchanged, and once one is invalidated every layer after it rebuilds.**

| Instruction | Cache key |
|---|---|
| `FROM` | The resolved image digest |
| `RUN` | The command **string**, verbatim — not its effects |
| `COPY` / `ADD` | A checksum of file **contents**, plus destination and mode |

Hence two facts: `RUN apt-get update` alone reuses a stale index, so `update && install && rm -rf /var/lib/apt/lists/*` must be one instruction; and **layers are additive**, so deleting neither shrinks nor hides.

### Multi-stage and size

```dockerfile
FROM node:20 AS builder
RUN npm ci && npm run build

FROM node:20-slim
COPY --from=builder /app/dist ./dist
USER node
CMD ["node", "dist/server.js"]
```

Only what you `COPY --from` crosses the boundary. `--target` stops at a stage; a `test` stage makes a red test fail the image build; `COPY --from=` also accepts an image reference.

| Lever | Effect |
|---|---|
| Multi-stage | The biggest single win |
| `-slim` base | Hundreds of MB |
| Clean apt state in the same layer | Tens of MB |
| No package caches | Tens to hundreds of MB |
| `.dockerignore` | Smaller context, fewer cache busts |
| Distroless / Alpine | Smallest, at the cost of no shell · musl breaks wheels |

### BuildKit mounts

```dockerfile
# syntax=docker/dockerfile:1
RUN --mount=type=cache,target=/root/.cache/pip \
    --mount=type=secret,id=pip_token \
    PIP_INDEX_URL="https://$(cat /run/secrets/pip_token)@pypi.internal/simple" \
    pip install -r requirements.txt
```

A **cache mount** persists across builds without entering the image, surviving layer invalidation. A **secret mount** makes a credential available to one `RUN` without it ever becoming a layer. `--ssh default` does the same for private Git dependencies.

### Config, networking, volumes

| Mechanism | At | In the image | For |
|---|---|---|---|
| `ARG` | Build only | **Yes** (`docker history`) | Base versions, build flags |
| `ENV` | Build + run | **Yes** | Non-secret defaults |
| `-e` / `--env-file` | Run only | No | Per-environment config |
| Mounted file | Run only | No | Credentials, structured config |

Precedence: `-e` → `--env-file` → `ENV`. The **default bridge has no DNS**; a user-defined network resolves container names, aliases, and Compose service names via an embedded resolver. `localhost` inside a container means that container; `host.docker.internal` reaches the host.

Volumes: **named** for state (Docker-managed, portable, correct ownership), **bind** for development (host-path dependent, UID-sensitive), **anonymous** to mask a subpath under a bind mount, **`tmpfs`** for in-memory scratch, **`:ro`** for config. Back up with a throwaway container plus `tar`; use `pg_dump` for anything transactional.

### Health, signals, limits

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -fsS http://localhost:8000/health || exit 1
```

`--start-period` is the one people forget. The check runs inside the container and its exit code is the result — `curl -f` matters, because plain curl exits 0 on a 500.

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Exec form</h4>
    <ul>
      <li><code>CMD ["node","server.js"]</code> — your process is PID 1</li>
      <li>Receives <code>SIGTERM</code>, drains, exits <b>143</b></li>
      <li>Entrypoint scripts end with <code>exec "$@"</code></li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Shell form</h4>
    <ul>
      <li><code>CMD node server.js</code> — PID 1 is <code>/bin/sh</code></li>
      <li>Signal never arrives; killed after 10s, exit <b>137</b></li>
      <li>Requests dropped on every deploy</li>
    </ul>
  </div>
</div>

Limits: `-m` is a hard ceiling (exceeding it means SIGKILL and 137), `--cpus` throttles rather than fails, `--pids-limit` caps processes. Without limits the OOM killer may take **something else**. Older JVMs and Node builds read the host's memory rather than the cgroup, which is why a container can OOM at 512 MB while idle.

### Compose, registries, promotion

`depends_on` waits for **started**, not **ready** — fix with a health check plus `condition: service_healthy`, and retries in the app. `compose.override.yaml` applies automatically, so pass `-f` explicitly in CI. `docker compose config` prints the merged file and settles most disputes.

**A tag is a mutable pointer; only a digest is immutable.** Deploy `:sha-a1b2c3d` or a digest, keep `:latest` for humans, and **build once, promote the same artifact** — if production rebuilds, production runs something CI never tested. In CI, layer caching does nothing without an exported backend: `cache-to type=gha,mode=max`.

## Part three — security, supply chain, and scale

### The isolation model

| Mechanism | Provides |
|---|---|
| **Namespaces** | Separate views of PIDs, mounts, network, hostname, users, IPC |
| **cgroups** | Limits on CPU, memory, PIDs, block I/O |
| **Capabilities, seccomp, AppArmor/SELinux** | Which privileged operations are permitted at all |

There is **no hypervisor**. The kernel is shared with the host and every other container.

<div class="callout warn">
  <span class="ct">Root in a container is root on the host kernel</span>
  Without user namespace remapping or a rootless daemon, uid 0 inside is uid 0 outside. An escape — via a kernel bug, a careless bind mount, or an added capability — lands as root on the host. For genuinely untrusted code you want gVisor, Kata, Firecracker, or a separate VM.
</div>

Docker's default capability set still includes `NET_RAW`, `SETUID`, `CHOWN`, and `MKNOD`, almost none of which an application needs.

### Hardening, in five controls

```bash
docker run -d \
  --user 10001:10001 \
  --read-only --tmpfs /tmp:rw,noexec,nosuid \
  --cap-drop ALL --cap-add NET_BIND_SERVICE \
  --security-opt no-new-privileges \
  -m 512m --cpus 1 --pids-limit 200 \
  ghcr.io/org/app@sha256:9b2c...
```

| Control | Stops |
|---|---|
| Non-root numeric `USER` | The default case of running as root |
| `--read-only` + `tmpfs` | Writing a payload; forces declared writable paths |
| `--cap-drop ALL` | `NET_RAW` spoofing, `SYS_ADMIN` mounts, `SYS_PTRACE` |
| `no-new-privileges` | setuid escalation inside the container |
| Memory / CPU / PID limits | Host starvation and fork bombs |

**Three flags that hand over the machine:** `--privileged`, mounting `/var/run/docker.sock`, and `--net=host`. Each needs a written justification, never a debugging convenience left in the file.

**`userns-remap`** maps container root to an unprivileged host uid; **rootless Docker** runs the daemon as your user. Both remove a class of escape consequence, both need testing against existing volumes.

### Supply chain

| Control | Answers |
|---|---|
| **Digest pinning** in `FROM` | "Did the base image change under us?" |
| **SBOM** | "What packages are in this image?" |
| **Scanning** | "Which are known-vulnerable?" |
| **Provenance / attestations** | "Which workflow and commit produced this?" |
| **Signing** (cosign, Notation) | "Was this pushed by us?" |
| **Admission policy** | "Can an unsigned image run at all?" |

```bash
docker buildx build --sbom=true --provenance=true -t ghcr.io/org/app:sha-a1b2c3d --push .
trivy image --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed ghcr.io/org/app:sha-a1b2c3d
cosign sign ghcr.io/org/app@sha256:9b2c...
```

Gate on **fixable** HIGH and CRITICAL only — failing on unfixable findings trains everyone to ignore the gate. **Pinning plus scheduled rebuilds** is the working combination; pinning alone freezes vulnerabilities in place. An image built four months ago is nearly always a bigger problem than today's report. And note that a **shared build cache is an input to your build**: a poisoned entry is code execution.

### Multi-arch, runtime, ML

Apple Silicon builds `arm64`; most servers want `amd64`. `docker buildx build --platform linux/amd64,linux/arm64` produces a **manifest list** — one tag, several images, client-selected. QEMU emulation is several times slower, so build natively per architecture and merge manifests for anything on the critical path. "exec format error", or unexplained slowness, is almost always this.

Production practices: one concern per container; stdout logging with daemon-level rotation; health checks that test the dependency you need; `SIGTERM` handled and drained; immutable digest deploys; build once and promote. Orchestrators split Docker's single `HEALTHCHECK` into **liveness, readiness, and startup** probes — conflating liveness with dependency health turns a downstream blip into a restart storm.

ML images: use the CUDA **`runtime`** base not `devel`; **never bake model weights into a layer** — mount them read-only, versioned separately; `--gpus all` needs the NVIDIA Container Toolkit and a CUDA runtime compatible with the host driver; raise `--shm-size` for PyTorch DataLoader; pin everything.

### Where Docker stops

Compose is enough for one host, a handful of services, and acceptable deploy downtime. You need an orchestrator for multi-host scheduling, rolling deploys with rollback, autoscaling, cross-host service discovery, and declarative reconciliation. Almost everything transfers: the same OCI images and digests, `HEALTHCHECK` thinking becomes probes, `-m`/`--cpus` become requests and limits, non-root and capabilities become a security context, `-e` becomes ConfigMaps and Secrets, named volumes become PVCs.

### The review checklist

| Check | Looking for |
|---|---|
| `FROM` pinned? | Version tag minimum, digest for sensitive images |
| `.dockerignore` present? | `.git`, `.env`, `node_modules`, build output excluded |
| Manifest copied before source? | Cached install layer |
| Cleanup in the same `RUN`? | Layers are additive |
| Multi-stage? | No toolchain in the runtime image |
| Secret in `ARG`/`ENV`/a `COPY`? | `docker history` grep comes back clean |
| `USER` non-root and numeric? | Not uid 0 |
| Exec-form `CMD`, `exec "$@"` in scripts? | Signals reach the app |
| Health check with a start period? | Readiness, not just liveness |
| Memory, CPU, PID limits? | Bounded blast radius |
| Read-only root, declared writable paths? | `--read-only` plus `tmpfs` |
| Capabilities dropped, `no-new-privileges`? | Least privilege |
| Any `--privileged`, socket mount, `--net=host`? | Written justification |
| Deploy reference immutable? | Digest or `sha-` tag |
| Same artifact promoted? | No rebuild per environment |
| SBOM, provenance, signature? | Verifiable origin |
| Multi-arch where needed? | Manifest list, built natively |

Automate the mechanical rows — hadolint, `trivy config`, a `docker history` grep in CI — and reserve human review for judgement: is the capability set right, does the health check test the right thing, is that `--privileged` genuinely necessary.

## Common interview questions

<ol class="guide-steps">
  <li><b>What exactly does container isolation consist of?</b>Three separate mechanisms: namespaces give separate views of PIDs, mounts, network, hostname, users, and IPC; cgroups impose limits on CPU, memory, PIDs, and I/O; capabilities, seccomp, and AppArmor or SELinux restrict which privileged operations the process may perform. There is no hypervisor — the kernel is shared with the host.</li>
  <li><b>Is a container a security boundary?</b>It is a real boundary but a weaker one than a VM, and it is not sufficient for untrusted code. Root inside is root on the host kernel unless you use userns-remap or a rootless daemon, so a kernel vulnerability or a careless mount is an escape path. For genuinely untrusted workloads, use gVisor, Kata, Firecracker, or a separate VM.</li>
  <li><b>Harden a container for me, out loud.</b>Non-root numeric <code>USER</code>; <code>--read-only</code> root filesystem with a <code>tmpfs</code> for declared writable paths; <code>--cap-drop ALL</code> then add back only what is needed; <code>no-new-privileges</code>; and memory, CPU, and PID limits. Then verify each one refuses something — a control you have never watched block anything is decoration.</li>
  <li><b>Which flags would you refuse in review?</b><code>--privileged</code> disables almost all isolation. Mounting <code>/var/run/docker.sock</code> gives the container control of the daemon, which is root-equivalent on the host. <code>--net=host</code> removes network isolation. Each is occasionally justified, and each needs a written reason rather than being left behind after debugging.</li>
  <li><b>How do you use a credential at build time without leaking it?</b>A BuildKit <code>--mount=type=secret</code>, or <code>--ssh default</code> for private Git dependencies. Never <code>ARG</code> or <code>ENV</code>, because both are image metadata, and never <code>COPY</code> then <code>rm</code>, because layers are additive. Then verify with a <code>docker history --no-trunc</code> grep and by extracting the layers with <code>docker save</code>.</li>
  <li><b>A secret was found in a published image. What is your first move?</b><b>Rotate.</b> The image is already pulled and cached in CI runners, developer machines, and registry mirrors — places you do not control — so assume the credential is compromised regardless of how fast you delete the tag. Then revoke, clean up what you can reach, find the instruction that introduced it, and close the class with a secret mount plus a CI check.</li>
  <li><b>Walk me through your supply-chain controls.</b>Digest-pin the base so it cannot move; attach an SBOM so you know what is inside; scan and gate on fixable HIGH and CRITICAL only; attach provenance so the producing workflow and commit are verifiable; sign with cosign; and enforce an admission policy that refuses anything unsigned. Then rebuild on a schedule, because pinning alone freezes vulnerabilities in place.</li>
  <li><b>Why gate on fixable findings only?</b>Because failing the build on vulnerabilities with no available patch teaches everyone to ignore scan output, which is worse than not scanning. Gate on what can be acted on, track the rest, and treat image age as the metric that actually correlates with exposure.</li>
  <li><b>How do pinning and patching coexist?</b>Digest-pin for reproducibility, then rebuild on a schedule and let Dependabot bump the pinned digest by pull request. Pinning without rebuilding is frozen vulnerabilities; a floating tag without pinning is an unreproducible build. You need both halves.</li>
  <li><b>Is a shared build cache a trust boundary?</b>Yes. A cache is an input to your build, so if a fork's pull request can write to the cache your trusted branch reads, a poisoned entry becomes code execution in a privileged build. Scope caches per branch or trust level, and never restore and execute cache contents without thought.</li>
  <li><b>Explain multi-architecture builds and their cost.</b><code>buildx --platform linux/amd64,linux/arm64</code> produces a manifest list: one tag, several images, with the client selecting. Emulated cross-builds via QEMU are several times slower, so for anything on the critical path build each architecture on a native runner and merge manifests with <code>imagetools create</code>.</li>
  <li><b>A container is OOM-killed at 512 MB while apparently idle.</b>The runtime is reading the host's memory rather than the cgroup limit and sized its heap for the whole machine. Classic with older JVMs and Node. Use a container-aware runtime, or set <code>--max-old-space-size</code> to roughly 75% of the limit.</li>
  <li><b>Why set limits at all if the container just dies?</b>Because without them the OOM killer chooses by score and may kill something else entirely — your database rather than the leaking worker. A limit turns an unbounded host incident into a scoped, recorded, diagnosable failure with exit 137 and <code>OOMKilled: true</code>.</li>
  <li><b>Liveness versus readiness — why does it matter?</b>Liveness asks "is this wedged and in need of a restart"; readiness asks "should it receive traffic right now". If your liveness check fails when a downstream dependency blips, every instance restarts at once and a small problem becomes an outage. Docker has one <code>HEALTHCHECK</code>; orchestrators split it, and the distinction is where people get burned.</li>
  <li><b>How do you make "what is running?" answerable?</b>Deploy digests rather than tags, label images with their source commit and revision, and expose that revision on a status endpoint. Every incident starts with that question, and the difference between a ten-second and a ten-minute answer is the difference between a short and a long incident.</li>
  <li><b>How would you containerise a machine-learning service?</b>CUDA <code>runtime</code> base rather than <code>devel</code>; cache mounts for the enormous wheels; weights mounted read-only from a volume or object store and versioned separately, never baked into a layer; <code>--gpus all</code> with the NVIDIA Container Toolkit on the host and a CUDA runtime compatible with the host driver; raised <code>--shm-size</code> for DataLoader workers; and everything pinned, because ML dependency graphs are fragile.</li>
  <li><b>Why not bake model weights into the image?</b>Because weights are data, not code. Baking them means every retrain pushes gigabytes, every deploy pulls them again, and the model version becomes coupled to the code version, so rollback is ambiguous. Mount them and version them independently.</li>
  <li><b>When do you need an orchestrator, and what carries over?</b>When you have more than one host, need rolling deploys with automatic rollback, autoscaling, cross-host service discovery, or declarative reconciliation. Everything else carries over: the same OCI images and digests, health-check thinking as probes, cgroup limits as requests and limits, non-root and capabilities as a security context, environment and mounted config as ConfigMaps and Secrets, named volumes as PVCs.</li>
  <li><b>Would you recommend Swarm?</b>For a small internal multi-host deployment it is genuinely simpler and defensible. As a general recommendation, no — the ecosystem and industry momentum are with Kubernetes, and choosing Swarm means owning that gap. Be ready for the follow-up either way.</li>
  <li><b>How would you run Docker for sixty engineers?</b>Publish hardened base images rather than documentation, because a <code>FROM</code> line gets adopted and a wiki page does not. Version them with a moving major tag and canary the exact patch first. Own registry policy: immutable tags, retention, an internal mirror, admission control. And measure image size, image age, fixable findings, and build duration — without numbers, "our images are fine" is an opinion.</li>
  <li><b>What is the failure mode of a shared base image?</b>A team needs one package, cannot get it upstream quickly, and forks. Six months later there are eleven variants and no standard. The fix is turnaround time on upstream requests, not policy — if a reasonable change takes two weeks, forking is rational and you will lose.</li>
  <li><b>Everything went red at once. Walk me through it.</b>Blast radius first: one container or all of them? Simultaneous failure across unrelated services means the host, the daemon, a shared base image, a registry, or a full disk — not my diff. Then exit codes and the OOM flag, then confirm which digest is actually running, then host disk and inodes, then network from inside the namespace with a netshoot sidecar. Afterwards, pin what moved and push the missing limit or probe into the shared base image.</li>
  <li><b>What do you look for reviewing a Dockerfile?</b>Not what it does — what it <b>permits</b>. Is the base pinned, is the process root, which capabilities does it hold, is the filesystem writable, is a secret in a layer, can the base change under us, can the deploy reference move, does the health check mean anything, and can one container take the host with it. Most container incidents are prevented at review time rather than at runtime.</li>
</ol>

## Final self-test

- Name the three mechanisms isolation is built from, and what each provides.
- Explain what an escape means for the host, and what changes that.
- List the five hardening controls and one thing each prevents.
- Name three flags you would challenge in review, and why.
- Say how a build credential is used without becoming a layer, and how you verify it.
- Give the first action when a secret ships in an image, and why that order.
- Name the six supply-chain controls and the question each answers.
- Explain why the scan gate is limited to fixable findings.
- Say why pinning without scheduled rebuilds is not enough.
- Explain the cost of QEMU multi-arch builds and the alternative.
- Say what 137 with `OOMKilled: true` means, and why it can happen at a low limit while idle.
- Distinguish liveness from readiness, and name the failure of conflating them.
- Say where model weights belong and give two reasons.
- Name the trigger for adopting an orchestrator, and five things that transfer.
- Run the review checklist from memory, and name which rows a machine can check.

