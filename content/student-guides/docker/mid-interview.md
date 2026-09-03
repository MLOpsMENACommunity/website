Part two of three. A cumulative review of **Beginner and Mid-level material**, organised by topic rather than by level, in about thirty-five minutes. Fast review first, common questions at the end. Senior reviews all three.

## Where this picks up

| Topic you already answer | What an interviewer expects here |
|---|---|
| "Layers are cached" | What goes into a cache key, per instruction |
| "Dependencies before source" | Multi-stage builds, cache mounts, cache in CI |
| "Pick a slim base" | Size levers in order of leverage; when Alpine is wrong |
| "Configure with `-e`" | Precedence, and why one image is promoted everywhere |
| "Use a user-defined network" | Drivers, embedded DNS, aliases, reaching the host |
| "Use a named volume" | `tmpfs`, anonymous volumes, backup, UID permissions |
| "Compose starts my stack" | Health checks, `condition:`, override files, profiles |
| "Use the exec form" | PID 1, signals, `exec "$@"`, graceful drain |
| "Don't deploy `:latest`" | Digests, promotion, immutable references |
| "Read the logs" | `docker diff`, `docker events`, netshoot, digest comparison |

## Foundations, in one screen

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

**Container versus VM:** shared kernel, milliseconds, tens of MB, isolated by kernel features — versus a full guest OS, tens of seconds, gigabytes, isolated by a hypervisor. Container isolation is *weaker*; that is the honest follow-up.

**Image versus container:** read-only template versus running instance with a thin writable layer. One image, many containers. Anything written outside a volume dies with `docker rm`.

**A container lives exactly as long as its main process.** That is why `docker run ubuntu` exits instantly.

**`EXPOSE` publishes nothing.** `RUN` is build time, `CMD` is run time. Inside a container, bind `0.0.0.0`.

## Commands and exit codes

```bash
docker run -d -p 8080:80 --name web nginx
docker ps -a                          # exit codes live here
docker logs -f --tail 50 web
docker exec -it web sh
docker run -it --entrypoint sh myapp  # shell in an image that crashes on start
docker inspect web                    # resolved config after all defaults
docker diff web                       # what the container has written
docker events --since 30m             # timeline of daemon activity
docker stats                          # live CPU / memory
docker history myapp:1.0              # per-layer sizes and instructions
docker system df -v && docker system prune
```

| Flag | Means | | Exit code | Means |
|---|---|---|---|---|
| `-d` | Detached | | 0 | Finished normally |
| `-p host:container` | Publish — **host first** | | 1 | Application error |
| `-it` | Interactive + TTY | | 125 | Bad `docker run` flags |
| `--rm` | Auto-remove on exit | | 126 | Command not executable |
| `-e` / `--env-file` | Environment | | 127 | Command not found |
| `-v name:/path` | Volume or bind mount | | 137 | SIGKILL — usually OOM |
| `-m` / `--cpus` / `--pids-limit` | Resource limits | | 143 | SIGTERM — clean stop |

## Dockerfile instructions

| Instruction | Runs at | Note |
|---|---|---|
| `FROM` | — | First; pin the tag, never `:latest` |
| `RUN` | **Build** | Result becomes a layer; cached on the command **string** |
| `CMD` | **Run** | Default command; replaced by `docker run img args` |
| `ENTRYPOINT` | Run | Fixed executable; `CMD` supplies its arguments |
| `COPY` | Build | From the build context; cached on file **contents** |
| `ARG` | Build only | **Visible in `docker history`** |
| `ENV` | Build + run | **Visible in image metadata** |
| `EXPOSE` | — | Documentation. `-p` publishes |
| `USER` | Run | Drops from root; place it after the installs |
| `HEALTHCHECK` | Run | Drives `(healthy)` in `docker ps` |
| `LABEL` | — | Source repository, revision, description |

## Layers and the build cache

**A layer is reused when its cache key is unchanged, and once one layer is invalidated every layer after it rebuilds.** What goes into that key differs by instruction, and this is the part that separates levels:

| Instruction | Cache key |
|---|---|
| `FROM` | The resolved image digest |
| `RUN` | The command **string**, verbatim — not its effects |
| `COPY` / `ADD` | A checksum of the file **contents**, plus destination and mode |
| `ENV`, `ARG`, `WORKDIR` | The literal instruction text |

```dockerfile
COPY package*.json ./     # key = hash of those files → changes rarely
RUN npm ci                # ← expensive, now nearly always CACHED
COPY . .                  # key = hash of everything else → changes constantly
```

Two consequences to state without prompting:

**`RUN` is cached on text, not on the world.** `RUN apt-get update` alone reuses a weeks-old package index — which is the real reason `update` and `install` must share one instruction.

**Layers are additive, so deleting does not shrink or hide.** A file added then removed is still in the earlier layer, still counted in the size, still extractable.

```dockerfile
# Right: one layer, cleaned inside that same layer
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*
```

## Multi-stage builds

```dockerfile
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
USER node
CMD ["node", "dist/server.js"]
```

**Only what you `COPY --from` crosses the boundary** — compilers, source, dev dependencies, and any build-time credential stay in the discarded stage. `--target` stops at a stage, which is also how a `test` stage makes a failing test fail the image build. `COPY --from=` also accepts an image reference, not just a stage name.

| Lever | Effect on size |
|---|---|
| Multi-stage | The biggest single win |
| `-slim` base | Hundreds of MB |
| `--no-install-recommends` + clean apt lists | Tens of MB |
| `--no-cache-dir` / `npm ci --omit=dev` | Tens to hundreds of MB |
| `.dockerignore` | Smaller context, fewer cache busts |
| Distroless / Alpine | Smallest, at the cost of no shell |

<div class="callout warn">
  <span class="ct">Alpine is not automatically smaller in practice</span>
  musl instead of glibc means prebuilt Python wheels and some Node native modules do not apply, so you compile from source — needing a toolchain, and often ending up larger and much slower to build than <code>-slim</code>. Measure before switching.
</div>

## BuildKit cache mounts

Separate from layer caching: a cache mount persists a directory **across builds** without ever entering the image.

```dockerfile
# syntax=docker/dockerfile:1
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt
RUN --mount=type=cache,target=/root/.npm npm ci
RUN --mount=type=cache,target=/go/pkg/mod go build -o /out/app ./cmd/app
```

Note the absence of `--no-cache-dir`: you *want* the cache, and the mount keeps it out of the image. This is why a warm rebuild can drop from minutes to seconds even when the lockfile changed. The third mount type, `type=secret`, is Senior material.

## Configuration and secrets

| Mechanism | Available at | In the image | Use for |
|---|---|---|---|
| `ARG` | Build only | **Yes** (`docker history`) | Base versions, build flags |
| `ENV` | Build + run | **Yes** | Non-secret defaults |
| `-e` / `--env-file` | Run only | No | Per-environment config |
| Mounted file | Run only | No | Credentials, structured config |

Precedence, most specific wins: `-e` → `--env-file` → `ENV`. **Neither `ARG` nor `ENV` is a secret**; both are image metadata readable by anyone who can pull. An `ARG` before the first `FROM` is only visible to `FROM` — re-declare it inside a stage to use it there.

The principle behind all of it: **build once, promote the same artifact.** If production rebuilds, production is running something CI never tested.

## Networking

| Driver | Behaviour |
|---|---|
| `bridge` (default) | Private network; **no name resolution** |
| **User-defined bridge** | Same **plus automatic DNS by container name** |
| `host` | No network isolation; uses the host's stack (Linux only) |
| `none` | No networking |
| `overlay` | Multi-host, for Swarm and orchestrators |

```bash
docker network create appnet
docker run -d --name db  --network appnet postgres:16
docker run -d --name api --network appnet -p 8000:8000 myapi
# api connects to postgres://db:5432 — resolved by Docker's embedded DNS at 127.0.0.11
```

Docker runs an embedded resolver inside containers on user-defined networks, resolving container names, `--network-alias` values, and Compose service names. Network aliases are how you swap an implementation without touching connection strings.

<div class="callout warn">
  <span class="ct">Inside a container, <code>localhost</code> is that container</span>
  A container cannot reach a sibling on <code>localhost</code>, nor a service on your host that way. Sibling: use the container or service name on a user-defined network. Host: <code>host.docker.internal</code> on Docker Desktop, or <code>--add-host=host.docker.internal:host-gateway</code> on plain Linux.
</div>

## Volumes

| Type | Syntax | Notes |
|---|---|---|
| Named volume | `-v pgdata:/data` | Docker-managed, portable, correct ownership — right for state |
| Bind mount | `-v "$(pwd)":/app` | Host path, permission-sensitive — right for dev |
| Anonymous | `-v /data` | Unnamed; orphaned disk usage, but useful for masking a subpath |
| `tmpfs` | `--tmpfs /tmp:rw,noexec,nosuid` | Memory only, never on disk |
| Read-only | `-v conf:/etc/app:ro` | Config the container must not modify |

```bash
# Back up a named volume: throwaway container, volume + bind mount, tar
docker run --rm -v pgdata:/data:ro -v "$(pwd)":/backup alpine \
  tar czf /backup/pgdata.tar.gz -C /data .
```

Two facts to have ready. **Bind-mount permission errors come from a UID mismatch** between host and container — match with `--user "$(id -u):$(id -g)"`, or use a named volume. And **a bind mount hides whatever was already at that path**, which is the `node_modules` disappearance; an anonymous volume over the subdirectory masks it back.

For anything transactional, tarring a live data directory gives a torn copy — use the database's own tooling (`pg_dump`) instead.

## Health checks and signals

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -fsS http://localhost:8000/health || exit 1
```

The check runs **inside** the container and its exit code is the whole result. `curl -f` matters: without `-f`, curl exits 0 on an HTTP 500. `--start-period` is the one people forget — without it, a service that takes forty seconds to warm up is marked unhealthy and restarted before it ever starts.

```bash
docker inspect --format '{{json .State.Health}}' api    # full check history
```

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Exec form — signals work</h4>
    <ul>
      <li><code>CMD ["node", "server.js"]</code></li>
      <li>Your process is PID 1</li>
      <li>Receives <code>SIGTERM</code>, can drain connections</li>
      <li><code>docker stop</code> returns quickly; exit 143</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Shell form — signals lost</h4>
    <ul>
      <li><code>CMD node server.js</code></li>
      <li>PID 1 is <code>/bin/sh</code></li>
      <li>It does not forward signals</li>
      <li>Killed after ten seconds mid-request; exit 137</li>
    </ul>
  </div>
</div>

The symptom is unmistakable: **`docker stop` takes exactly ten seconds and then the container dies hard.** Entrypoint scripts must end with `exec "$@"` for the same reason, bound their wait loops, and keep migrations opt-in.

```bash docker-entrypoint.sh
#!/bin/sh
set -eu
tries=0
until nc -z "${DB_HOST:-db}" "${DB_PORT:-5432}"; do
  tries=$((tries + 1))
  [ "$tries" -ge 30 ] && { echo "db unreachable" >&2; exit 1; }
  sleep 1
done
exec "$@"          # ← replaces the shell, so your app becomes PID 1
```

A startup wait is not a substitute for run-time retries: databases restart and networks blip long after boot.

## Resource limits

```bash
docker run -d -m 512m --memory-reservation 256m --cpus 1.5 \
  --pids-limit 200 --restart on-failure:5 myapp:1.0

docker inspect --format '{{.State.OOMKilled}}' myapp     # true after a 137
```

| Limit | Effect |
|---|---|
| `-m` | Hard ceiling; exceeding it means SIGKILL and exit 137 |
| `--memory-reservation` | Soft target under host pressure |
| `--cpus` | CPU quota in cores — over-quota means **throttling, not an error** |
| `--pids-limit` | Process count cap; the fork-bomb defence |

Without limits, one container consumes all host memory and the OOM killer may take **something else**. With a limit, the kill is scoped to that cgroup and recorded.

<div class="callout warn">
  <span class="ct">Runtimes blind to their own cgroup</span>
  Older JVMs and Node builds read the <b>host's</b> memory, size a heap for 64 GB inside a 512 MB container, and get OOM-killed immediately. Modern JVMs are container-aware; for Node set <code>--max-old-space-size</code> to about 75% of the limit.
</div>

## Compose

```yaml compose.yaml
services:
  api:
    build: { context: ., target: runtime }
    image: ghcr.io/org/app:${TAG:-dev}
    ports: ['8000:8000']
    env_file: [.env]
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/app
    depends_on:
      db: { condition: service_healthy }
    healthcheck:
      test: ['CMD-SHELL', 'curl -fsS http://localhost:8000/health || exit 1']
      interval: 30s
      start_period: 40s
    mem_limit: 512m
    restart: unless-stopped
  db:
    image: postgres:16
    environment: { POSTGRES_PASSWORD: secret }
    volumes: ['pgdata:/var/lib/postgresql/data']
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 10s
      retries: 5
      start_period: 30s
volumes:
  pgdata:
```

```bash
docker compose up -d --build
docker compose config           # the MERGED file — the debugging tool
docker compose --profile dev up -d
docker compose down -v          # -v also deletes volumes
```

<div class="callout warn">
  <span class="ct">Plain <code>depends_on</code> is startup order, not readiness</span>
  It waits for the container to <b>start</b>, not for the service to accept connections — Postgres is "started" seconds before it is ready. Fix with a <code>healthcheck</code> plus <code>condition: service_healthy</code>, and retry logic in the app, which you want anyway.
</div>

Three more Compose facts worth having: **`compose.override.yaml` is applied automatically**, which is convenient locally and dangerous in CI — always pass `-f` explicitly there. **Profiles** keep optional services out of a default `up`. And Compose's own `.env` substitutes values *into the YAML*, which is a different mechanism from `env_file:`, which passes variables *into the container*.

## Registries, tags, and digests

**A tag is a mutable pointer; only a digest is immutable.**

```bash
docker build -t ghcr.io/org/app:sha-a1b2c3d .
echo "$TOKEN" | docker login ghcr.io -u USER --password-stdin
docker push ghcr.io/org/app:sha-a1b2c3d

docker inspect --format '{{index .RepoDigests 0}}' ghcr.io/org/app:sha-a1b2c3d
docker pull ghcr.io/org/app@sha256:9b2c...       # cannot change

# Promote by re-tagging the same digest — no rebuild
docker buildx imagetools create -t ghcr.io/org/app:production ghcr.io/org/app@sha256:9b2c...
```

Immutable `:1.4.2` and `:sha-a1b2c3d` for deployments; moving `:latest` for humans; digests for anything sensitive. Never deploy a moving tag — two hosts pulling it an hour apart can run different code, and rollback becomes undefined.

Layer caching does **nothing** in CI by default, because each run starts with an empty layer store. Export it:

```yaml
- uses: docker/build-push-action@v6
  with:
    tags: ghcr.io/${{ github.repository }}:sha-${{ github.sha }}
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

`mode=max` exports intermediate layers. `mode=min` caches only the final stage, which is nearly useless for a multi-stage build.

## Debugging

```bash
docker logs --tail 100 api            # 1. output
docker ps -a                          # 2. exit code
docker inspect api                    # 3. resolved config
docker run -it --entrypoint sh myapp   # 4. shell without the app
docker diff api                       # 5. what changed on disk
docker events --since 30m --filter container=api    # 6. timeline
docker run --rm -it --network container:api nicolaka/netshoot   # 7. network tools
docker cp api:/app/config.json ./     # 8. pull a file out
```

`docker diff` is the underused one: it distinguishes writes to the writable layer from writes to a volume, which is how you discover a misspelled mount path.

### "Works locally, not in staging"

Five differences, in the order they are usually the answer:

| Difference | How to confirm |
|---|---|
| A different image than you think | Compare **digests**, not tags |
| A missing environment variable | `docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}'` |
| A bind mount that only exists locally | A local `compose.override.yaml` over the image's code |
| Architecture mismatch | Apple Silicon builds `arm64`; the server wants `amd64` |
| A file excluded by `.dockerignore` | `docker run --rm myapp ls -la /app` |

"exec format error" — or unexplained slowness from silent QEMU emulation — is almost always the architecture. Check with `docker image inspect --format '{{.Architecture}}'`.

## Common interview questions

<ol class="guide-steps">
  <li><b>Container versus virtual machine, and is a container less secure?</b>Shared kernel, process-level isolation via namespaces and cgroups, milliseconds and megabytes — versus a full guest OS behind a hypervisor. And yes, weaker: a kernel vulnerability is an escape path, which is why you run non-root and do not put untrusted code in a plain container.</li>
  <li><b>Walk me through the layer cache. What invalidates it?</b>Each instruction has a cache key: <code>RUN</code> hashes the command string, <code>COPY</code> hashes the file contents, <code>FROM</code> the base digest. Once one key changes, every layer after it rebuilds. That is why the dependency manifest is copied and installed before the source, and why <code>apt-get update</code> alone reuses a stale index.</li>
  <li><b>What is a multi-stage build and what problem does it solve?</b>Building needs compilers and dev dependencies; running does not. A build stage produces the artifact and the runtime stage copies only that with <code>COPY --from</code>. The toolchain, source, and any build credentials stay in the discarded stage — smaller image, smaller attack surface.</li>
  <li><b>I deleted a secret in a later layer. Is it safe?</b>No. Layers are additive: the file still exists in the earlier layer and is readable by anyone who can pull the image. Rebuild without it and <b>rotate</b> the credential — the image is already cached in places you do not control.</li>
  <li><b>How is a cache mount different from layer caching?</b>Layer caching reuses a whole layer when its key is unchanged. A cache mount persists a directory across builds without entering the image at all, so a changed lockfile no longer means re-downloading every package. It survives layer invalidation, which layer caching by definition cannot.</li>
  <li><b>How do you pass configuration and secrets?</b>Configuration at run time with <code>-e</code> or <code>--env-file</code>, so one image is promoted across environments. Secrets never via <code>ARG</code> or <code>ENV</code> — both land in image metadata and <code>docker history</code> — but as mounted files or run-time environment from a secret store.</li>
  <li><b>Two containers cannot talk to each other. Debug it.</b>Check they are on the same user-defined network, because the default bridge has no DNS. Then check the app is connecting to the container name rather than <code>localhost</code>, which inside a container means that container. Then verify from inside the namespace with a netshoot sidecar: <code>dig db</code>, <code>curl -v http://db:5432</code>, <code>ss -tlnp</code>.</li>
  <li><b>Named volume or bind mount?</b>Named volume for state — Docker-managed, portable, correctly initialised ownership. Bind mount for development live-reload. Bind mounts in production are host-path dependent and cause UID permission problems that Mac and Windows users never see.</li>
  <li><b>How would you back up a named volume?</b>A throwaway container with the volume mounted read-only plus a host bind mount, and <code>tar</code>. For anything transactional, use the database's own tooling instead — tarring a live Postgres data directory gives a torn copy.</li>
  <li><b>My app starts before the database is ready.</b><code>depends_on</code> only waits for the container to start. Add a <code>healthcheck</code> to the database and <code>condition: service_healthy</code> to the dependant — and add connection retry to the app regardless, because readiness can be lost at any time, not only at boot.</li>
  <li><b>What does <code>--start-period</code> do?</b>It is a grace window during boot where health check failures do not count towards <code>--retries</code>. Without it, a service that takes forty seconds to warm up is marked unhealthy and restarted before it ever comes up.</li>
  <li><b>Why does my container ignore <code>docker stop</code> and take ten seconds to die?</b>Shell-form <code>CMD</code> makes <code>/bin/sh</code> PID 1, and it does not forward <code>SIGTERM</code>, so Docker eventually SIGKILLs mid-request. Use the exec form, and end entrypoint scripts with <code>exec "$@"</code>. A clean stop exits 143; a hard kill exits 137.</li>
  <li><b>A container exits with 137. What happened?</b>It was SIGKILLed, nearly always by the memory limit. Confirm with <code>docker inspect --format '{{.State.OOMKilled}}'</code>. Then either raise the limit or find the leak — but note that a limit doing its job is a better outcome than an unlimited container taking the host's memory and the OOM killer picking a different victim.</li>
  <li><b>A container is OOM-killed at 512 MB while apparently idle.</b>The runtime is reading the host's memory rather than the cgroup limit, so it sized its heap for the whole machine. Classic with older JVMs and Node. Fix with a container-aware runtime, or set <code>--max-old-space-size</code> explicitly.</li>
  <li><b>Why not deploy <code>:latest</code>?</b>A tag is a mutable pointer. Two hosts pulling it an hour apart can run different code, rollback is undefined, and nobody can answer "what is running?". Deploy an immutable version or SHA tag, or a digest.</li>
  <li><b>What does "build once, promote" mean and why does it matter?</b>Build one image, tag it with the commit SHA, and promote that exact artifact through staging into production. If production rebuilds, the base image may have moved, a transitive dependency may have published a patch, and you are shipping something CI never tested.</li>
  <li><b>How would you shrink a 1.2 GB image?</b><code>docker history</code> first to find the fat layers. Then, in order of leverage: multi-stage build, a <code>-slim</code> base, <code>--no-install-recommends</code> with apt lists cleaned in the same <code>RUN</code>, no package caches, a real <code>.dockerignore</code>. Measure after each change rather than doing all of it blind.</li>
  <li><b>Is Alpine always the right choice for size?</b>No. musl instead of glibc means prebuilt Python wheels and some Node native modules do not apply, so you compile from source — needing a toolchain and often ending up larger and much slower to build than <code>-slim</code>. Measure before switching.</li>
  <li><b>Why does layer caching not help in CI?</b>Every CI run starts on a clean machine with an empty layer store. You have to export the cache to a backend — <code>type=gha</code>, a registry, or local disk — with <code>mode=max</code> so intermediate stages are included too.</li>
  <li><b>"It works locally but not in staging." How do you approach it?</b>Five checks in order: compare digests not tags; compare the resolved environment; look for a local <code>compose.override.yaml</code> mounting source over the image; check the architecture, because Apple Silicon builds <code>arm64</code>; and confirm the file is even in the image with <code>docker run --rm img ls -la /app</code>.</li>
  <li><b>How do you debug a container without installing tools into the image?</b>Attach a container that already has them to the target's network namespace: <code>docker run --rm -it --network container:api nicolaka/netshoot</code>. Installing curl into a production image permanently enlarges every deployment to solve a temporary problem.</li>
  <li><b>What does <code>docker diff</code> tell you?</b>Everything the container has written relative to its image. It is how you distinguish a write to the writable layer from a write to a volume — which is usually how you discover a misspelled mount path.</li>
</ol>

## Final self-test

- State the cache key for `RUN`, `COPY`, and `FROM`, and what invalidation does to later layers.
- Say why deleting a file in a later layer does not remove it, and what to do if a secret shipped.
- Explain what crosses a multi-stage boundary, and name two other uses for stages.
- Say how a cache mount differs from layer caching.
- Name the four configuration mechanisms and which are visible in the image.
- Explain why the default bridge breaks name resolution, and what `localhost` means inside a container.
- Describe the `depends_on` readiness gap and both halves of the fix.
- Explain exec form versus shell form, and give the exit code for each shutdown.
- Say what exit 137 with `OOMKilled: true` means, and one reason it happens at an unexpectedly low limit.
- Give the only immutable image reference, and why promotion beats rebuilding.
- Say how to make layer caching work in CI, and why `mode=min` is nearly useless.
- Name the five checks for "works locally, not in staging", in order.


