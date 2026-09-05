This is part three of three. It closes the series by taking **every topic from Beginner and Mid one level further** (each one now has a security, scale, or ownership dimension) and adds the work you own when containers are your responsibility rather than your tool.

Up to this point the questions have been about making containers work. From here they are different: what can a compromised container reach, what is inside the image you are shipping, who can prove it was built from your source, and what happens when one container tries to take the host down with it.

## Where this picks up

| Topic from earlier levels | What this level adds |
|---|---|
| "A container is an isolated process" | **What that isolation consists of**: namespaces, cgroups, capabilities, seccomp, and what an escape means |
| Non-root `USER` | The full hardening pass: read-only root filesystem, dropped capabilities, `no-new-privileges` |
| Layers are additive | Secrets that **never reach a layer**: BuildKit secret mounts, SSH forwarding, verification |
| Cache mounts | Cache **poisoning** and trust boundaries in shared build caches |
| Base image tags | Digest pinning, SBOMs, scanning, signing, provenance, admission policy |
| Multi-arch awareness | Native per-architecture builders, manifest lists, and the QEMU cost |
| Resource limits | The OOM killer's real behaviour, and runtimes blind to their own cgroup |
| Health checks | Liveness versus readiness, and what an orchestrator does with each |
| Compose | Where Compose stops and an orchestrator begins, and what transfers |
| Registries and promotion | Registry policy, retention, mirrors, and image-freshness as a metric |
| Debugging | Production incident playbooks, and a review checklist that catches it earlier |
| **new** | GPU and ML images · rootless and userns-remap · daemon configuration · platform ownership |

I am starting with the isolation model, because every other decision in this track depends on understanding what a container is *not*.

## What isolation gives you

You have known since Beginner that a container is "a process with a restricted view". That view is built from three separate kernel mechanisms, and knowing which one does what is the difference between reasoning about security and guessing at it.

<div class="guide-arch" style="--arch-cols:3">
  <div class="arch-lane" style="--lane-cols:3">
    <span class="arch-label">what a container is: three kernel mechanisms</span>
    <div class="arch-node" data-kind="entry"><b>Namespaces</b><small>Separate views of PIDs, mounts, network, hostname, users, IPC</small></div>
    <div class="arch-node" data-kind="entry"><b>cgroups</b><small>Limits on CPU, memory, PIDs, block I/O: <code>-m</code>, <code>--cpus</code></small></div>
    <div class="arch-node" data-kind="entry"><b>Capabilities · seccomp · AppArmor</b><small>Which privileged operations are possible at all</small></div>
  </div>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down"></i>
  <div class="arch-lane" style="--lane-cols:1">
    <span class="arch-label">shared. There is no hypervisor here</span>
    <div class="arch-node" data-kind="danger"><b>One host kernel, for every container on the machine</b><small><code>uname -r</code> inside any image reports the <em>host's</em> kernel. uid 0 inside is uid 0 outside, unless you use userns remapping or rootless</small></div>
  </div>
  <i class="arch-edge" data-dir="down" data-flow="optional"></i>
  <i class="arch-edge" data-dir="down" data-flow="optional"></i>
  <i class="arch-edge" data-dir="down" data-flow="optional"></i>
  <div class="arch-lane" style="--lane-cols:3">
    <span class="arch-label">stronger boundaries, when the code is not yours</span>
    <div class="arch-node"><b>gVisor</b><small>Intercepts syscalls in userspace</small></div>
    <div class="arch-node"><b>Kata · Firecracker</b><small>A lightweight VM per container</small></div>
    <div class="arch-node"><b>A plain VM</b><small>Always available, always an option</small></div>
  </div>
  <p class="arch-note"><b>Why the middle lane decides everything:</b> namespaces restrict what a process can <em>see</em>, not what the kernel will <em>do</em> for it. An escape through a kernel bug, a careless bind mount, or an added capability lands on the host as root, which is why "it's only a container" is not a boundary you can lean on for untrusted code.</p>
</div>

| Mechanism | Provides | Controls it |
|---|---|---|
| **Namespaces** | Separate views of PIDs, mounts, network, hostname, users, IPC | Docker, per container |
| **cgroups** | Limits on CPU, memory, PIDs, block I/O | `-m`, `--cpus`, `--pids-limit` |
| **Capabilities, seccomp, AppArmor/SELinux** | Which privileged operations the process may perform at all | `--cap-drop`, `--security-opt` |

Namespaces are why `ps aux` inside a container shows two processes and `ls /` shows a different filesystem. cgroups are why `-m 512m` works. Capabilities and seccomp are why a container cannot load a kernel module even as root.

There is **no hypervisor**. The kernel is shared with the host and with every other container on it.

<div class="callout warn">
  <span class="ct">Root in a container is root on the host kernel</span>
  Unless you are using user namespace remapping or a rootless daemon, uid 0 inside the container is uid 0 outside it. A container escape (through a kernel vulnerability, a careless bind mount, or an added capability) lands an attacker on the host as root. This is why "it's only a container" is not a security boundary you can lean on for untrusted code, and why the hardening in the next section is not optional decoration.
</div>

Two consequences shape real decisions.

**Capabilities are the interesting layer**, because Docker already drops most of them and people rarely look at which remain. The default set still includes `NET_RAW` (raw sockets, so ARP and ICMP spoofing), `SETUID`/`SETGID`, `CHOWN`, and `MKNOD`. Almost no application needs any of them.

```bash
docker run --rm alpine sh -c 'apk add -q libcap; capsh --print | head -3'
docker run --rm --cap-drop ALL alpine sh -c 'ping -c1 127.0.0.1 || echo "no NET_RAW"'
```

**If you must run untrusted code, you want a stronger boundary than a namespace.** gVisor intercepts syscalls in userspace, Kata Containers and Firecracker give each container a lightweight VM, and a plain separate VM is always an option. All of them cost performance, and all of them are the right answer when the workload is somebody else's code.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Compare the PID namespace: run <code>docker run --rm alpine ps aux</code>, then <code>docker run --rm --pid=host alpine ps aux</code>.</li>
    <li>List the capabilities a default container holds using the <code>capsh</code> command above, then repeat with <code>--cap-drop ALL</code>.</li>
    <li>Prove a capability matters: <code>ping</code> from a default container works, and fails with <code>--cap-drop ALL</code> because it needs <code>NET_RAW</code>.</li>
    <li>Show the shared kernel: run <code>uname -r</code> on your host and inside three different base images.</li>
  </ol>
  <em><code>--pid=host</code> reveals every process on the machine from inside a container, capability dropping visibly breaks <code>ping</code>, and every image reports the <em>host's</em> kernel version. That last result is the whole "shared kernel" argument in one command.</em>
</div>

## Hardening a container

Five changes cover most of the realistic risk, and together they cost almost nothing at run time.

```dockerfile Dockerfile
FROM python:3.11-slim

# 1. A real non-root user with a fixed numeric uid and no login shell
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
  --tmpfs /tmp:rw,noexec,nosuid \     #    with writable scratch where genuinely needed
  --cap-drop ALL \                    # 3. drop every capability
  --cap-add NET_BIND_SERVICE \        #    add back only what is required
  --security-opt no-new-privileges \  # 4. block setuid escalation
  -m 512m --cpus 1 --pids-limit 200 \ # 5. bound the blast radius
  myapp:1.4.2
```

| Control | Stops |
|---|---|
| `USER` non-root | The default case where the process runs as root |
| `--read-only` | Writing a payload to disk; forces you to declare writable paths explicitly |
| `--cap-drop ALL` | `NET_RAW` spoofing, `SYS_ADMIN` mounts, `SYS_PTRACE` inspection of other processes |
| `no-new-privileges` | A setuid binary escalating privilege within the container |
| Memory / CPU / PID limits | One container starving the host, and fork bombs |

`--read-only` is the one people skip because it looks disruptive. It usually is not: most services need exactly one or two writable paths, and declaring them is a five-minute exercise that turns "the container can write anywhere" into "the container can write to `/tmp`". The discipline itself is valuable. If you cannot list your service's writable paths, you do not know what it does.

<div class="callout warn">
  <span class="ct">Three flags that hand over the machine</span>
  <code>--privileged</code> disables almost all isolation at once. <code>-v /var/run/docker.sock:/var/run/docker.sock</code> gives the container control of the daemon, which is equivalent to root on the host. <code>--net=host</code> removes network isolation entirely. Each is occasionally justified; all three should be treated as an architectural decision with a written reason, never as a debugging convenience that stays in the file.
</div>

<div class="callout tip">
  <span class="ct">Make the safe path the default path</span>
  Publish an internal base image that already has the non-root user, the pinned base, and sensible defaults. Teams then inherit hardening by writing <code>FROM ghcr.io/org/python-base:3.11</code>, which is far more effective than a checklist because it requires no discipline from anyone.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run your image with the full flag set above. Whatever breaks, fix it by declaring the writable path rather than by removing <code>--read-only</code>.</li>
    <li>Confirm each control applies: <code>docker run --rm myapp id</code>, then try <code>touch /app/x</code> inside a read-only container.</li>
    <li>Find which capability your app needs by starting from <code>--cap-drop ALL</code> and adding back only on failure.</li>
    <li>Try the operation you meant to prevent (<code>ping</code> needs <code>NET_RAW</code>, <code>mount</code> needs <code>SYS_ADMIN</code>) and confirm it is refused.</li>
  </ol>
  <em>a container that runs unprivileged on a read-only filesystem with one declared scratch path, and a refused operation proving the restriction is live. A security control you have never watched refuse anything is decoration. Step four is the whole exercise.</em>
</div>

## Rootless Docker and user namespaces

The hardening above bounds what a container can do. Rootless mode changes what "root inside the container" even means on the host, which is a different and stronger kind of protection.

Two mechanisms, often confused:

| Mechanism | What it does | Trade-off |
|---|---|---|
| `userns-remap` on the daemon | Maps container uid 0 to an unprivileged host uid | Volume ownership complications; some images misbehave |
| **Rootless Docker** | Runs the whole daemon as an unprivileged user | No privileged ports below 1024 without setup; slower storage drivers |

```json /etc/docker/daemon.json
{
  "userns-remap": "default"
}
```

With that set, a process running as root inside a container is some high-numbered unprivileged uid, typically 100000-something, on the host. An escape lands as nobody rather than as root, which removes an entire class of consequence.

The caveats are real and you should test rather than assume. Existing volumes have ownership from before the remap and will need adjusting. Images that assume specific uid semantics can break. Bind mounts become more awkward, because the host path's ownership must line up with the mapped range.

**Rootless Docker** goes further: the daemon itself runs as your user, using user namespaces and a userspace network stack. Nothing in the chain runs as host root.

```bash
dockerd-rootless-setuptool.sh install
export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock
docker info | grep -i rootless
```

<div class="callout tip">
  <span class="ct">Where each one belongs</span>
  Rootless is good for developer machines and CI builders, where you want no root daemon at all and can tolerate slightly slower storage. <code>userns-remap</code> is the more practical option for an existing production host, because it is a daemon setting rather than a different installation. Either is a large improvement over neither, but both need testing against your actual volumes before rollout.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Without remapping, run <code>docker run --rm -v /tmp/x:/data alpine touch /data/f</code> and check the file's owner on the host with <code>ls -l</code>.</li>
    <li>Enable <code>userns-remap</code> on a test machine, restart the daemon, and repeat. Compare the host-side owner.</li>
    <li>Check the mapping ranges: <code>cat /etc/subuid /etc/subgid</code>.</li>
    <li>Try to start a container publishing port 80 under rootless Docker and read the error.</li>
  </ol>
  <em>a root-owned file on the host in the first case and a high-numbered unprivileged uid in the second. That difference is the entire security value. The rootless port error in step four is the main operational constraint you need to plan around.</em>
</div>

## Secrets that never reach a layer

Mid established the mechanism: layers are additive, so anything written into one is permanent. Build-time credentials are the one case with no run-time answer, so they need their own mechanism.

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Safe</h4>
    <ul>
      <li>BuildKit <code>--mount=type=secret</code> at build time</li>
      <li>SSH agent forwarding for private Git dependencies</li>
      <li>Run-time environment injected from a secret manager</li>
      <li>A file mounted read-only at run time</li>
      <li>A short-lived token fetched by the container itself</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Permanent leak</h4>
    <ul>
      <li><code>ARG TOKEN</code>: recorded in <code>docker history</code></li>
      <li><code>ENV PASSWORD</code>: in the image metadata</li>
      <li><code>COPY .env .</code> then <code>RUN rm .env</code></li>
      <li>A private key anywhere in the build context</li>
      <li><code>--build-arg</code> for anything sensitive</li>
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
docker build --secret id=pip_token,src=./token.txt -t myapp:1.4.2 .

# Private Git dependencies without embedding a key
docker build --ssh default -t myapp:1.4.2 .
```

```dockerfile
RUN --mount=type=ssh \
    pip install git+ssh://git@github.com/my-org/private-lib.git@v1.2.0
```

Then verify rather than assume, because the whole point is that you can check:

```bash
# Is anything sensitive recorded in the build history?
docker history --no-trunc myapp:1.4.2 | grep -iE 'token|secret|password|key'

# Inspect the actual layer contents
docker save myapp:1.4.2 | tar -tv | head -40

# Is it in the image metadata?
docker inspect myapp:1.4.2 --format '{{range .Config.Env}}{{println .}}{{end}}'
```

<div class="callout warn">
  <span class="ct">If a secret did reach an image, rotate first</span>
  The image has already been pulled and cached in places you do not control: CI runners, developer machines, registry mirrors, layer caches. Deleting the tag does not un-distribute it. Rotate the credential, then clean up. Doing it the other way round optimises for appearances over exposure.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Do it the wrong way once: <code>ARG DEMO_TOKEN</code> with <code>--build-arg DEMO_TOKEN=abc123</code>, then find it with the <code>docker history</code> grep above.</li>
    <li>Try to hide it: <code>COPY .env .</code> followed by <code>RUN rm .env</code>, then find it with <code>docker save … | tar -tv</code>.</li>
    <li>Now do it correctly with <code>--mount=type=secret</code> and confirm both checks come back clean.</li>
    <li>Add the <code>docker history</code> grep as a step in your CI pipeline so a regression is caught by a machine.</li>
  </ol>
  <em>the build argument is trivially recoverable, the "deleted" file is still in the layer archive, and the secret mount leaves nothing at all. Step four is what makes it stay fixed after you move on.</em>
</div>

## Supply chain

The question a senior gets asked is not "did it build?" but **"can you prove what is in it and where it came from?"** Six controls answer six distinct questions, and they compose.

| Control | Answers |
|---|---|
| **Digest pinning** in `FROM` | "Did the base image change under us?" |
| **SBOM** | "What packages are in this image?" |
| **Vulnerability scanning** | "Which of them are known-vulnerable?" |
| **Provenance / attestations** | "Which workflow and which commit produced this?" |
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

# Read what was attached
docker buildx imagetools inspect ghcr.io/org/app:sha-a1b2c3d --format '{{json .SBOM}}'
```

<div class="callout tip">
  <span class="ct">Why <code>--ignore-unfixed</code> is not cheating</span>
  A scanner reports vulnerabilities with no available patch. Failing the build on those trains everybody to ignore scan output, which is strictly worse than not scanning. Gate on <b>fixable</b> HIGH and CRITICAL findings, track the rest, and rebuild regularly so base image patches land. An image built four months ago is nearly always a bigger problem than anything in today's report.
</div>

Pinning and patching pull in opposite directions, and you need both:

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

There is one more trust boundary worth naming, because it is easy to miss: **a shared build cache is an input to your build.** If a pull request from a fork can write to the same cache your main branch reads, a poisoned cache entry becomes code execution in a trusted build. Scope caches per branch or per trust level, and never restore a cache and execute its contents without thought.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Resolve your base image tag to a digest and pin it: <code>docker buildx imagetools inspect python:3.11-slim --format '{{.Manifest.Digest}}'</code>.</li>
    <li>Build with <code>--sbom=true --provenance=true</code>, push, then read both back with <code>imagetools inspect</code>.</li>
    <li>Run a Trivy scan twice, once without <code>--ignore-unfixed</code> and once with it, and compare how actionable the two reports are.</li>
    <li>Sign the image with cosign and then verify it. Change one byte, rebuild, and verify again.</li>
  </ol>
  <em>a pinned digest, an SBOM you can read, a scan report that is actionable rather than overwhelming, and a signature that fails after the image changes. The second scan comparison is the one that will change how you configure your gate.</em>
</div>

## Multi-architecture builds

Apple Silicon builds `arm64`. Most servers want `amd64`. Cloud ARM instances want `arm64`. A single-architecture image is a deployment failure waiting for the wrong machine.

```bash
docker buildx create --use --name multi
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ghcr.io/org/app:1.4.2 --push .

docker buildx imagetools inspect ghcr.io/org/app:1.4.2
```

The result is a **manifest list**: one tag pointing at several images, with the client automatically selecting the right one. `docker pull` on an ARM laptop and on an x86 server both work, from the same reference.

The cost is the part people discover late. Buildx emulates the foreign architecture with QEMU, and emulated builds are several times slower. For a compile-heavy image, minutes become tens of minutes. For anything on the critical path, build each architecture on its own **native** runner and merge the manifests afterwards:

```bash
# On an amd64 runner
docker buildx build --platform linux/amd64 -t ghcr.io/org/app:1.4.2-amd64 --push .

# On an arm64 runner
docker buildx build --platform linux/arm64 -t ghcr.io/org/app:1.4.2-arm64 --push .

# Then merge, from anywhere
docker buildx imagetools create -t ghcr.io/org/app:1.4.2 \
  ghcr.io/org/app:1.4.2-amd64 \
  ghcr.io/org/app:1.4.2-arm64
```

<div class="callout warn">
  <span class="ct">"exec format error"</span>
  That message almost always means an architecture mismatch: an <code>arm64</code> image on an <code>amd64</code> host, or the reverse. Confirm before debugging anything else with <code>docker image inspect --format '{{.Architecture}}'</code>. The subtler variant is no error at all, just a service several times slower than it should be, because it is running under emulation.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Check what your machine produces by default: <code>docker build -t arch-test. </code> then <code>docker image inspect arch-test --format '{{.Architecture}}'</code>.</li>
    <li>Build for the other architecture with <code>--platform</code> and time both builds.</li>
    <li>Build a two-platform manifest list, push it, and inspect it with <code>imagetools</code> to see both entries.</li>
    <li>Deliberately run the wrong architecture with <code>--platform</code> on <code>docker run</code> and read the error or observe the slowdown.</li>
  </ol>
  <em>a visible QEMU penalty on the foreign build, a manifest list containing both platforms under one tag, and either an "exec format error" or an unexplained slowdown. Recognising the silent-emulation case is the more valuable half.</em>
</div>

## Resource limits and the OOM killer

Mid taught you to set limits. What happens at the boundary decides whether a memory problem is a bounded incident or an outage.

Without limits, one container consumes all host memory and the kernel's OOM killer picks a victim by a heuristic score, and **not necessarily the guilty container**. Your database can be the process that dies because an unrelated worker leaked memory.

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
| `--memory-reservation` | Soft target the kernel aims for under host pressure |
| `--cpus` | CPU quota expressed in cores |
| `--pids-limit` | Caps the process count: the fork-bomb defence |
| `--restart on-failure:N` | Bounded retries instead of a crash loop forever |
| `--oom-kill-disable` | Almost always wrong: the container hangs instead of dying |

With a limit in place, the kill is **scoped to that container's cgroup** and the verdict is recorded. That is the entire value: a diagnosable failure with a clear exit code rather than a mystery outage somewhere else on the host.

<div class="callout warn">
  <span class="ct">Runtimes that cannot see their own cgroup limit</span>
  Older JVMs and Node builds read the <b>host's</b> memory rather than the container's, so they size their heap for a 64 GB machine inside a 512 MB container and get OOM-killed almost immediately. Modern JVMs are container-aware; for Node, set <code>--max-old-space-size</code> to roughly 75% of the limit. If a container dies at its limit while apparently idle, suspect this before your own code.
</div>

Two related failure modes worth knowing:

**CPU throttling looks like slowness, not an error.** A container over its `--cpus` quota is not killed, it is throttled, so latency rises with no log line explaining why. Check `docker stats` and the cgroup's throttling counters before concluding the code got slower.

**Disk is a limit too, and it has no flag.** A container with an unbounded log or a growing writable layer fills the host filesystem, and a full disk presents as a dozen unrelated failures across every container on the machine. Daemon-level log rotation is the fix, and it belongs in configuration rather than in each service.

```json /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" },
  "default-ulimits": { "nofile": { "Name": "nofile", "Soft": 4096, "Hard": 8192 } },
  "live-restore": true
}
```

`live-restore` lets containers keep running through a daemon restart, which turns a Docker upgrade from an outage into a maintenance task.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run a container with no memory limit and a small script that allocates aggressively. Watch host memory in another terminal, then stop it before it hurts.</li>
    <li>Repeat with <code>-m 256m</code> and confirm the kill is scoped: exit 137 and <code>OOMKilled: true</code>.</li>
    <li>Run a CPU-bound task with <code>--cpus 0.5</code> and observe that it is slow rather than failing.</li>
    <li>Set the daemon log rotation options above on a test machine and confirm with <code>docker inspect --format '{{.HostConfig.LogConfig}}'</code>.</li>
  </ol>
  <em>an unlimited container that pressures the whole host versus a limited one that dies cleanly and records why. The throttling case in step three is the one people misdiagnose as a performance regression in their own code.</em>
</div>

## Production runtime practices

Six practices, each of which prevents a class of incident rather than a specific bug.

<ol class="guide-steps">
  <li><b>One concern per container</b>Not literally one process, a supervisor for a worker pool is fine, but one responsibility, so it can be scaled, restarted, and logged independently. Two concerns in one container means you cannot restart one without the other.</li>
  <li><b>Log to stdout and stderr</b>Never to a file inside the container. Configure rotation on the daemon (<code>max-size</code>, <code>max-file</code>) or you will eventually fill a disk with JSON, and a full disk on a container host looks like a dozen unrelated failures.</li>
  <li><b>Health checks that mean something</b>A liveness check that only proves the process is alive is worthless, because Docker already knew that. Check the dependency you need, keep it cheap enough to run every thirty seconds, and do not fail it because a non-critical downstream is slow.</li>
  <li><b>Handle SIGTERM properly</b>Exec form, and <code>exec "$@"</code> in entrypoint scripts. Then drain connections on <code>SIGTERM</code> instead of dropping them. Confirm it: a clean stop exits 143, not 137.</li>
  <li><b>Immutable, digest-addressable deploys</b>Deploy <code>:sha-a1b2c3d</code> or a digest. A moving tag makes "what is running?" unanswerable and rollback undefined. You cannot roll back to a tag whose contents have changed.</li>
  <li><b>Build once, promote the same artifact</b>If production rebuilds the image, production is running something CI never tested. Promotion is the difference between shipping your tested artifact and shipping something that resembles it.</li>
</ol>

Liveness and readiness deserve separating, because Docker has one concept and orchestrators have two:

| Question | Docker | Kubernetes |
|---|---|---|
| Is the process wedged and in need of a restart? | `HEALTHCHECK` | Liveness probe |
| Should this instance receive traffic right now? | Not modelled | Readiness probe |
| Has a slow-starting container finished booting? | `--start-period` | Startup probe |

Conflating the first two is a common and expensive mistake: if your liveness check fails whenever a downstream dependency is briefly unavailable, a dependency blip becomes a rolling restart of every one of your instances, turning a small problem into a large one.

<div class="callout tip">
  <span class="ct">The single most valuable operational habit</span>
  Make "what is running?" answerable in one command. Deploy digests, label images with their source commit, and expose the revision on a status endpoint. Every incident starts with that question, and the difference between answering it in ten seconds and ten minutes is the difference between a short incident and a long one.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add <code>LABEL org.opencontainers.image.revision</code> and a build-arg-driven <code>ENV APP_REV</code>, then expose the revision on a status endpoint.</li>
    <li>Deploy by digest rather than tag and confirm the running container's digest with <code>docker inspect --format '{{.Image}}'</code>.</li>
    <li>Write a liveness check that deliberately fails when the database is unreachable, then stop the database and watch your app restart repeatedly. Fix it so the check only reflects its own health.</li>
    <li>Confirm graceful shutdown end to end: <code>docker stop -t 30</code>, exit code 143, and a "draining" line in the logs.</li>
  </ol>
  <em>a service that can state which commit it is running, a deploy reference that cannot move, and, in step three, the restart storm that follows from a badly scoped liveness check. That storm is worth causing once in a test environment.</em>
</div>

## Containers for machine learning

ML images amplify every size and reproducibility problem in this guide: a CUDA base is gigabytes before your code exists, model weights are large binary blobs that change on a different cadence than code, and the dependency graph is fragile enough that a floating tag will eventually break a build.

```dockerfile Dockerfile
# syntax=docker/dockerfile:1
FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=0

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3.11 python3-pip \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cache mount: ML wheels are enormous, and this keeps them out of the image
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
  -m 16g --cpus 4 \
  ghcr.io/org/inference@sha256:9b2c...
```

Five decisions in there are the whole lesson.

**Use the `runtime` CUDA base, not `devel`.** The devel image carries `nvcc` and the full toolchain and is frequently several gigabytes larger. If you need to compile extensions, do it in a builder stage and copy the result.

**Never bake model weights into the image.** They make every push and pull move gigabytes, they change on a different schedule than your code, and they force an image rebuild to ship a retrained model. Mount them read-only from a volume or object store, versioned independently.

**`--gpus all` requires the NVIDIA Container Toolkit on the host.** The image contains no driver; it uses the host's. That is why the CUDA *runtime* version in the image must be compatible with the host driver, and why a mismatch fails at startup with a message that does not obviously say "driver".

**`--shm-size` matters for PyTorch DataLoader.** The 64 MB default shared-memory segment causes worker crashes with errors that look like anything but shared memory.

**Pin everything, including CUDA and cuDNN.** ML dependency graphs are fragile enough without a floating base tag moving underneath them.

<div class="callout warn">
  <span class="ct">Weights are data, not code</span>
  Treating a 4 GB checkpoint as part of your image means your registry storage grows by 4 GB per retrain, every deploy pulls it again, and your rollback story couples the model version to the code version. Mount it, version it separately, and let the image carry only the serving logic. This one decision determines whether your inference pipeline is operable.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Build the same image on <code>nvidia/cuda:…-devel</code> and <code>…-runtime</code> and compare sizes.</li>
    <li>Bake a large dummy weights file into a layer, note the image size and push time, then move it to a mounted volume and compare.</li>
    <li>If you have a GPU: run with and without <code>--gpus all</code> and compare what <code>nvidia-smi</code> reports inside the container.</li>
    <li>Run a PyTorch DataLoader with several workers at the default <code>--shm-size</code>, then at <code>1g</code>.</li>
  </ol>
  <em>a multi-gigabyte difference between the devel and runtime bases, a push that goes from minutes to seconds once weights are mounted rather than baked, and a DataLoader that stops crashing once shared memory is raised. Step two is the one that changes how your team ships models.</em>
</div>

## Where Docker stops

Naming the boundary is itself a senior signal, and in an interview it lands better than a list of orchestrator features.

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Docker and Compose are enough</h4>
    <ul>
      <li>Local development and CI</li>
      <li>A single host, a handful of services</li>
      <li>Restart-on-failure is adequate</li>
      <li>Brief downtime during a deploy is acceptable</li>
      <li>Capacity is known and static</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>You need an orchestrator</h4>
    <ul>
      <li>More than one host, or scheduling decisions</li>
      <li>Rolling deploys with automatic rollback</li>
      <li>Horizontal autoscaling</li>
      <li>Service discovery and load balancing across hosts</li>
      <li>Declarative desired state with reconciliation</li>
    </ul>
  </div>
</div>

The reassuring part is that **almost everything in this guide transfers**:

| What you learned | Where it lands in Kubernetes |
|---|---|
| OCI images and digests | Exactly the same images and references |
| `HEALTHCHECK` thinking | Liveness, readiness, and startup probes |
| `-m` / `--cpus` | Resource requests and limits, same cgroups |
| Non-root `USER`, dropped capabilities | `securityContext`, Pod Security Standards |
| `-e` and mounted config | ConfigMaps and Secrets |
| Named volumes | PersistentVolumeClaims |
| Compose service names and DNS | Services and cluster DNS |
| `depends_on` + health | Init containers and readiness gating |

Compose is the same model on one host, and the concepts map across almost one-to-one, so nothing you learned here gets thrown away. What an orchestrator adds is **scheduling, reconciliation, and multi-host networking**, not a different container model.

<div class="callout tip">
  <span class="ct">The honest answer about Swarm</span>
  Docker Swarm exists, is simpler than Kubernetes, and is fine for a small multi-host deployment. It also has a much smaller ecosystem and far less industry momentum. Recommending it is defensible for a two-node internal service; recommending it as a general answer in an interview will invite a follow-up you should be ready for.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Take your <code>compose.yaml</code> and hand-write the equivalent Kubernetes Deployment and Service. Note which fields map directly.</li>
    <li>Identify which of your Compose settings have no orchestrator equivalent, and which orchestrator concepts Compose cannot express.</li>
    <li>Write down the specific requirement that would justify moving off Compose for one of your projects.</li>
    <li>Convert your <code>HEALTHCHECK</code> into separate liveness and readiness probes, and note where they should differ.</li>
  </ol>
  <em>a mapping that is more direct than expected, and a short honest list of things Compose cannot do. Step three is the useful one: being able to name the trigger for adopting an orchestrator is what distinguishes a decision from a fashion.</em>
</div>

## Running Docker as a platform

Once more than one team is building images, the highest-leverage work stops being technical and starts being about defaults. Four decisions cover most of it.

**Publish base images, not documentation.** A hardened `FROM` line gets adopted; a wiki page does not. Put the non-root user, the pinned base, the sensible `ENV` values, and the standard labels into an internal base image, and teams inherit all of it by changing one line.

**Version base images with a moving major tag.** Consumers use `python-base:3.11`; you release `3.11.7-2` and move the pointer. Canary one low-risk service on the exact patch tag first. Otherwise one bad base image release breaks every team simultaneously, which is a memorable way to lose their trust.

**Own the registry policy.** Immutable tags where the registry supports them, retention rules so old images are pruned, an internal mirror so an upstream outage is not your outage, and an admission policy that refuses unsigned or unscanned images.

**Measure image health.** Without numbers, "our images are fine" is an opinion:

| Metric | Why it matters |
|---|---|
| Median and p95 image size | Size is deploy latency, on every deploy |
| Age of the oldest deployed image | Nearly always a better vulnerability signal than a scan report |
| Count of fixable HIGH/CRITICAL findings | The actionable subset, not the total |
| Build duration, p50 and p95 | Where your teams' time goes |
| Percentage of deploys by digest | How answerable "what is running?" is |

<div class="callout warn">
  <span class="ct">The failure mode of a shared base image</span>
  A team needs one package added, cannot get it upstream quickly, and forks. Six months later there are eleven variants and no standard. The fix is <b>turnaround time on upstream requests</b>, not policy. If a reasonable change takes two weeks, forking is the rational choice and you will lose. Treat the base image as a product with a service level, or do not treat it as a standard.
</div>

Cost and performance levers worth knowing, roughly in order of return:

| Lever | Effect | Note |
|---|---|---|
| Registry or CI build cache with `mode=max` | Minutes per build | `mode=min` barely helps a multi-stage build |
| Native per-architecture runners instead of QEMU | Several times faster | Merge manifests afterwards |
| Multi-stage plus `-slim` | Faster pulls on every deploy | Size is deploy latency, not vanity |
| Cache mounts for package managers | Fast warm rebuilds | And nothing added to the image |
| A prebuilt base with dependencies | Removes install time entirely | Rebuild it nightly |
| Daemon log rotation | Prevents disk-full incidents | `max-size` and `max-file` |

```json /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" },
  "live-restore": true,
  "userns-remap": "default",
  "default-ulimits": { "nofile": { "Name": "nofile", "Soft": 4096, "Hard": 8192 } }
}
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Build an internal base image with a non-root user, a digest-pinned upstream base, and standard OCI labels. Rewrite one real Dockerfile to use it.</li>
    <li>Measure the before and after: image size, build time, and how many lines the consuming Dockerfile lost.</li>
    <li>Pick two of the metrics above and collect them across your repositories. Image age is usually the most revealing.</li>
    <li>Write the one-paragraph policy you would publish alongside the base image, including how quickly you promise to handle an upstream request.</li>
  </ol>
  <em>a shorter consuming Dockerfile that is hardened by default, and, usually, a surprising number for image age. Step four is the part that determines whether the base image is adopted or forked.</em>
</div>

## Debugging production under pressure

Under pressure, ordering matters more than knowledge. This sequence is designed so the cheapest, highest-information checks come first.

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>0m</span><strong>Blast radius first</strong><small>One container or every container? Everything failing at once points at the host, the daemon, a base image, or the registry, not at your diff.</small></div>
  <div class="guide-timeline-item"><span>2m</span><strong>Exit code and OOM flag</strong><small>137 with <code>OOMKilled: true</code> is a memory limit. 143 is a clean SIGTERM. 127 is a missing binary, usually the wrong image entirely.</small></div>
  <div class="guide-timeline-item"><span>4m</span><strong>Confirm which image is running</strong><small>Compare digests, not tags. With a mutable tag the running code may not be the code you are reading.</small></div>
  <div class="guide-timeline-item"><span>6m</span><strong>Host resources</strong><small><code>docker system df</code>, disk, inodes, memory. A full disk presents as a dozen unrelated failures.</small></div>
  <div class="guide-timeline-item"><span>8m</span><strong>Network from inside the namespace</strong><small>A netshoot sidecar, rather than installing tools into a production image.</small></div>
  <div class="guide-timeline-item"><span>after</span><strong>Close the loop</strong><small>Pin what moved, add the limit or probe that would have caught it, and push it into the shared base image so no other team rediscovers it.</small></div>
</div>

```bash
docker inspect api --format '{{.State.ExitCode}} {{.State.OOMKilled}} {{.State.Error}}'
docker inspect api --format '{{.Image}}'
docker inspect api --format '{{index .RepoDigests 0}}'
docker events --since 30m --filter container=api
docker system df -v
docker run --rm -it --network container:api nicolaka/netshoot
```

Four incident shapes and the first move for each:

**A secret was found in a published image.** Rotate first. The image is already pulled and cached in places you do not control, so assume the credential is compromised regardless of how quickly you delete the tag. Then revoke, remove what you can reach, find the instruction that introduced it, and close the class with a BuildKit secret mount plus a `docker history` grep in CI. Deleting the image first and rotating later optimises for appearances.

**One container took the host down.** Check limits before code. A container with no memory limit will consume all host RAM and the OOM killer may take something else entirely. Confirm with `docker inspect` and the host's `dmesg`, then apply `-m`, `--cpus`, and `--pids-limit` to **everything** on that host, not just the guilty container, because the next one will be different.

**Everything went red at once.** Follow the timeline above. Simultaneous failure across unrelated services is almost never a code change; it is the host, the daemon, a shared base image, a registry outage, or a full disk.

**An image you depend on was compromised.** Find every deployment referencing it and at which digest. Revoke every credential those containers could reach, not only the ones you believe were used. Replace with a vetted digest or an internal mirror. Then close the class: digest pinning, a registry mirror, signature verification at admission, and scheduled rebuilds.

<div class="callout tip">
  <span class="ct">Most container incidents are prevented at review time</span>
  Every failure in this section has a review-time counterpart: a missing limit, an unpinned base, a shell-form <code>CMD</code>, a mutable deploy tag, a secret in a build argument. Reading a Dockerfile for what it <em>permits</em> rather than what it does is the highest-leverage habit in this guide.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run the five diagnostic commands above against a healthy container so you know what normal output looks like.</li>
    <li>Cause a 137 and a 143 deliberately and confirm you can tell them apart from the inspect output alone.</li>
    <li>Fill a test host's disk with unrotated logs and observe how many unrelated things break.</li>
    <li>Write your own version of the incident timeline as a short runbook, adapted to your stack, and put it where an on-call person will find it.</li>
  </ol>
  <em>familiarity with normal output, which is what makes abnormal output obvious, and a runbook that exists before you need it. Do step three in a disposable environment, and notice how far the failure reaches.</em>
</div>

## The review checklist

Take this checklist away from this level. Run it against any Dockerfile and `docker run` line (your own, or one you are reviewing) and it catches nearly everything covered here before it reaches production.

| Check | Looking for | Level it comes from |
|---|---|---|
| Is `FROM` pinned? | A version tag at minimum, a digest for anything sensitive | Beginner · Senior |
| Is there a `.dockerignore`? | `.git`, `.env`, `node_modules`, build output excluded | Beginner |
| Is the dependency manifest copied before the source? | Cached install layer | Beginner |
| Is cleanup in the same `RUN` as the install? | Layers are additive | Mid |
| Is it multi-stage? | No compilers or dev dependencies in the runtime image | Mid |
| Any secret in `ARG`, `ENV`, or a `COPY`ed file? | `docker history` grep comes back clean | Mid · Senior |
| Is `USER` set, non-root, and numeric? | Not running as uid 0 | Beginner · Senior |
| Is `CMD`/`ENTRYPOINT` in exec form? | JSON array, so the app is PID 1 | Mid |
| Does an entrypoint script end with `exec "$@"`? | Signals reach the application | Mid |
| Is there a health check with a `start_period`? | Readiness, not just liveness | Mid |
| Are memory, CPU, and PID limits set? | A bounded blast radius | Mid · Senior |
| Is the root filesystem read-only, with declared writable paths? | `--read-only` plus `tmpfs` | Senior |
| Are capabilities dropped? | `--cap-drop ALL`, then add back what is needed | Senior |
| Is `no-new-privileges` set? | No setuid escalation | Senior |
| Any of `--privileged`, docker socket mount, `--net=host`? | Each needs a written justification | Senior |
| Is the deploy reference immutable? | A digest or a `sha-` tag, never a moving one | Mid · Senior |
| Is the same artifact promoted across environments? | No rebuild per environment | Mid |
| Are SBOM, provenance, and signature attached? | Verifiable origin | Senior |
| Is the app listening on `0.0.0.0` and logging to stdout? | Reachable, and observable | Beginner |
| Is it multi-architecture, if it needs to be? | A manifest list, built natively | Senior |

<div class="callout tip">
  <span class="ct">Automate the mechanical half</span>
  Most of these rows can be checked by a machine. <a href="https://github.com/hadolint/hadolint">hadolint</a> catches Dockerfile issues, <code>trivy config</code> checks for misconfiguration, and a <code>docker history</code> grep catches secrets. Put all three in CI and reserve human review for the judgement calls: whether the capability set is right, whether the health check checks the right thing, whether that <code>--privileged</code> is necessary.
</div>

## The complete picture

The series' final artefact: every level's topics, hardened. Nothing in it is new, and you should be able to justify every line.

```dockerfile Dockerfile
# syntax=docker/dockerfile:1

# ---------- build stage: toolchain and credentials live and die here ----------
FROM python:3.11-slim@sha256:8f2c... AS builder

RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential \
 && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app
COPY requirements.txt .

# Cache mount for speed; secret mount so the token never becomes a layer
RUN --mount=type=cache,target=/root/.cache/pip \
    --mount=type=secret,id=pip_token \
    PIP_INDEX_URL="https://$(cat /run/secrets/pip_token)@pypi.internal/simple" \
    pip install -r requirements.txt

# ---------- test stage: a red test cannot produce a shippable image ----------
FROM builder AS test
COPY . .
RUN ruff check . && pytest -q

# ---------- runtime stage: only what is needed to serve ----------
FROM python:3.11-slim@sha256:8f2c... AS runtime

ARG BUILD_REV=unknown
ENV APP_REV=${BUILD_REV} \
    LOG_LEVEL=info \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

LABEL org.opencontainers.image.source="https://github.com/my-org/myapp" \
      org.opencontainers.image.revision="${BUILD_REV}"

RUN useradd --create-home --uid 10001 --shell /usr/sbin/nologin appuser

COPY --from=builder /opt/venv /opt/venv

WORKDIR /app
COPY --chown=appuser:appuser src/ ./src/

USER 10001
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health').status==200 else 1)"

CMD ["uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
# Build with a secret, an SBOM, provenance, and a traceable tag
docker buildx build \
  --secret id=pip_token,env=PIP_TOKEN \
  --build-arg BUILD_REV="$(git rev-parse --short HEAD)" \
  --platform linux/amd64,linux/arm64 \
  --sbom=true --provenance=true \
  --cache-from type=registry,ref=ghcr.io/org/app:buildcache \
  --cache-to type=registry,ref=ghcr.io/org/app:buildcache,mode=max \
  -t ghcr.io/org/app:sha-$(git rev-parse --short HEAD) \
  --push .

# Verify before trusting
docker history --no-trunc ghcr.io/org/app:sha-abc1234 | grep -iE 'token|secret|password' || echo 'clean'
trivy image --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed ghcr.io/org/app:sha-abc1234
cosign sign ghcr.io/org/app@sha256:9b2c...

# Run hardened, by digest
docker run -d \
  --name api \
  --user 10001:10001 \
  --read-only --tmpfs /tmp:rw,noexec,nosuid \
  --cap-drop ALL --cap-add NET_BIND_SERVICE \
  --security-opt no-new-privileges \
  -m 512m --cpus 1 --pids-limit 200 \
  --restart on-failure:5 \
  -p 8000:8000 \
  --env-file /run/secrets/app.env \
  ghcr.io/org/app@sha256:9b2c...
```

<div class="guide-try">
  <span class="ct">Try it: the final exercise</span>
  <ol>
    <li>Build this end to end on a real project: staged build with a secret mount, a test stage that gates the image, SBOM and provenance attached, and a signed digest.</li>
    <li>Verify each control actively rather than trusting it: grep the history for the token, try to write to the read-only filesystem, try the operation your dropped capability should prevent, and try to deploy an unsigned image.</li>
    <li>Confirm the deployed reference is a digest, not a tag, and that the running container can report its own commit.</li>
    <li>Then hand it to a colleague and ask them to run the review checklist against it.</li>
  </ol>
  <em>several refusals and one clean deploy. A control you have never watched refuse anything is decoration. This exercise is the difference between an image that looks hardened and one that is. The colleague review in step four will find something you did not, which is the point.</em>
</div>

## Where the series leaves you

Across the three levels you have gone from a first `docker run` to owning containers as a platform. The same topics carried all the way through, each time with more depth:

<div class="flow">
  <div class="node">BEGINNER<small>make it work</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">MID<small>make it fast and operable</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">SENIOR<small>make it safe and scalable</small></div>
</div>

You should now be able to look at a Dockerfile and a `docker run` line and see not just what they do but what they **permit**: whether the process is root, which capabilities it holds, whether the filesystem is writable, whether a secret is in a layer, whether the base image can change under you, whether the deploy reference can move, whether the health check means anything, and whether one container can take the host with it.

| Can you… | |
|---|---|
| Name the three mechanisms isolation is built from? | Namespaces · cgroups · capabilities and seccomp |
| Say what a container escape means for the host? | Root inside is root outside, without userns |
| List the five hardening controls? | Non-root · read-only · cap-drop · no-new-privileges · limits |
| Get a build credential in without it becoming a layer? | `--mount=type=secret` |
| Say what to do first when a secret ships in an image? | Rotate, then clean up |
| Name six supply-chain controls and what each answers? | Pin · SBOM · scan · provenance · sign · admit |
| Explain why you gate on fixable findings only? | Otherwise the gate gets ignored |
| Say why an old image beats a clean scan report? | Unpatched base, regardless of the report |
| Explain 137 with `OOMKilled: true`? | The cgroup limit did its job |
| Say why a JVM OOMs at 512 MB doing nothing? | It read the host's memory, not the cgroup |
| Explain the cost of a QEMU multi-arch build? | Several times slower: build natively, merge manifests |
| Say where model weights belong? | A mounted volume, versioned separately |
| Name the trigger for adopting an orchestrator? | Multi-host, rolling deploys, autoscaling, reconciliation |
| State what transfers from Compose to Kubernetes? | Images, probes, limits, security context, config, volumes |
| Run a review that catches all of the above? | The checklist two sections up |

Carry that review instinct out of here, because, as with CI/CD pipelines, most container incidents are prevented at review time rather than at runtime.
