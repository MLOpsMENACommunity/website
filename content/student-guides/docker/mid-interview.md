One continuous review of everything a mid-level candidate is expected to know — foundations included, organised by topic rather than by level. Roughly thirty minutes. Common questions are at the end.

## The model

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

**Container vs VM:** shared kernel, milliseconds, tens of MB, isolated by kernel features — versus a full guest OS, tens of seconds, gigabytes, isolated by a hypervisor. Container isolation is *weaker*; that is the honest follow-up.

**Image vs container:** read-only template versus running instance with a thin writable layer. One image, many containers. Anything written outside a volume dies with `docker rm`.

**A container lives exactly as long as its main process.** That is why `docker run ubuntu` exits instantly.

## Commands and flags

```bash
docker run -d -p 8080:80 --name web nginx
docker ps -a                      # exit codes live here
docker logs -f --tail 50 web
docker exec -it web sh
docker inspect web                # resolved config after all defaults
docker diff web                   # what the container changed
docker stats                      # live CPU / memory
docker history myapp:1.0          # per-layer sizes
docker system df && docker system prune
```

| Flag | Means | | Exit code | Means |
|---|---|---|---|---|
| `-d` | Detached | | 0 | Finished normally |
| `-p host:container` | Publish — **host first** | | 1 | Application error |
| `-it` | Interactive + TTY | | 125 | Bad `docker run` flags |
| `--rm` | Auto-remove on exit | | 126 | Command not executable |
| `-e` / `--env-file` | Environment | | 127 | Command not found |
| `-v name:/path` | Volume or bind mount | | 137 | Killed — usually OOM |
| `-m` / `--cpus` | Resource limits | | 143 | SIGTERM |

## Dockerfile instructions

| Instruction | Runs at | Note |
|---|---|---|
| `FROM` | — | First; pin the tag, never `:latest` |
| `RUN` | **Build** | Result becomes a layer |
| `CMD` | **Run** | Default command; replaced by `docker run img args` |
| `ENTRYPOINT` | Run | Fixed executable; `CMD` supplies its arguments |
| `COPY` | Build | From the build context |
| `ARG` | Build only | **Visible in `docker history`** |
| `ENV` | Build + run | **Visible in the image** |
| `EXPOSE` | — | Documentation. `-p` publishes |
| `USER` | Run | Drops from root |
| `HEALTHCHECK` | Run | Drives `(healthy)` in `docker ps` |

## Layers and the build cache

**A layer is reused when its inputs are unchanged, and once one layer is invalidated every layer after it rebuilds.**

```dockerfile
COPY package*.json ./     # changes rarely
RUN npm ci                # ← expensive, now nearly always cached
COPY . .                  # changes constantly
```

**Layers are additive — deleting does not shrink.** A file added in one layer and removed in a later one is still in the image and still readable. That is why a baked-in secret cannot be "removed later".

```dockerfile
# Wrong: stale index cached, package lists shipped
RUN apt-get update
RUN apt-get install -y curl

# Right: one layer, cleaned in the same layer
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

Only what you `COPY --from` crosses the boundary — compilers, source, dev dependencies, and any build-time credentials stay in the discarded stage. `--target` lets you stop at a stage, which is also how a `test` stage runs the suite during the build.

| Lever | Effect on size |
|---|---|
| Multi-stage | The biggest single win |
| `-slim` base | Hundreds of MB |
| `--no-install-recommends` + clean apt lists | Tens of MB |
| `--no-cache-dir` / `npm ci --omit=dev` | Tens to hundreds of MB |
| `.dockerignore` | Smaller context, fewer cache busts |

<div class="callout warn">
  <span class="ct">Alpine is not automatically smaller in practice</span>
  musl instead of glibc means prebuilt Python wheels and some Node native modules do not apply, so you compile from source — needing a toolchain, and often ending up larger and much slower than <code>-slim</code>.
</div>

## Configuration and secrets

| Mechanism | Available at | In the image | Use for |
|---|---|---|---|
| `ARG` | Build only | **Yes** (`docker history`) | Base versions, build flags |
| `ENV` | Build + run | **Yes** | Non-secret defaults |
| `-e` / `--env-file` | Run only | No | Per-environment config |
| Mounted file | Run only | No | Credentials |

**Neither `ARG` nor `ENV` is a secret.** Both are image metadata readable by anyone who can pull.

## Networking

| Driver | Behaviour |
|---|---|
| `bridge` (default) | Private network; **no name resolution** |
| **User-defined bridge** | Same **plus automatic DNS by container name** |
| `host` | No network isolation; uses the host stack |
| `none` | No networking |

```bash
docker network create appnet
docker run -d --name db  --network appnet postgres:16
docker run -d --name api --network appnet -p 8000:8000 myapi
# api connects to postgres://db:5432
```

<div class="callout warn">
  <span class="ct">Inside a container, <code>localhost</code> is that container</span>
  A container cannot reach a sibling on <code>localhost</code>, nor a service on your host that way. Use the container/service name on a user-defined network, or <code>host.docker.internal</code> for the host on Docker Desktop.
</div>

## Volumes

| Type | Syntax | Notes |
|---|---|---|
| Named volume | `-v pgdata:/data` | Docker-managed, portable — right for state |
| Bind mount | `-v "$(pwd)":/app` | Host path, permission-sensitive — right for dev |
| Anonymous | `-v /data` | Unnamed; a common source of orphaned disk usage |
| `tmpfs` | `--tmpfs /tmp` | Memory only, never on disk |
| Read-only | `-v conf:/etc/app:ro` | Config the container must not modify |

```bash
# Back up a named volume
docker run --rm -v pgdata:/data -v "$(pwd)":/backup alpine \
  tar czf /backup/pgdata.tar.gz -C /data .
```

Bind-mount permission errors come from a UID mismatch between host and container — match with `--user "$(id -u):$(id -g)"`, or use a named volume.

## Compose

```yaml compose.yaml
services:
  api:
    build: { context: ., target: runtime }
    ports: ['8000:8000']
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/app
    depends_on:
      db: { condition: service_healthy }
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
docker compose config           # print the merged file — the debugging tool
docker compose down -v          # -v also deletes volumes
```

<div class="callout warn">
  <span class="ct">Plain <code>depends_on</code> is startup order, not readiness</span>
  It waits for the container to <b>start</b>, not for the service to accept connections. Postgres is "started" seconds before it is ready. Fix with a <code>healthcheck</code> plus <code>condition: service_healthy</code>, or retry logic in the app — which you want anyway.
</div>

Compose creates a network and puts every service on it, addressable by service name. Override files layer per environment.

## Health checks and signals

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -fsS http://localhost:8000/health || exit 1
```

`--start-period` is the one people forget: without it, a service that takes 40s to warm up is marked unhealthy before it finishes starting.

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Exec form — signals work</h4>
    <ul>
      <li><code>CMD ["node", "server.js"]</code></li>
      <li>Your process is PID 1</li>
      <li>Receives <code>SIGTERM</code> and shuts down cleanly</li>
      <li>Wrapper scripts must end with <code>exec "$@"</code></li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Shell form — signals lost</h4>
    <ul>
      <li><code>CMD node server.js</code></li>
      <li>PID 1 is <code>/bin/sh</code></li>
      <li>It does not forward signals</li>
      <li>Killed hard after the grace period, mid-request</li>
    </ul>
  </div>
</div>

## Registries and tags

A tag is a **mutable pointer**; only a digest is immutable.

```bash
docker build -t ghcr.io/org/app:1.4.2 .
echo "$TOKEN" | docker login ghcr.io -u USER --password-stdin
docker push ghcr.io/org/app:1.4.2
docker pull ghcr.io/org/app@sha256:9b2c...    # cannot change
```

Immutable `:1.4.2` / `:sha-a1b2c3d` for deployments; moving `:latest` for humans; digests for anything security-sensitive. Never deploy `:latest` — nobody can then say what is running.

## Debugging

```bash
docker logs --tail 100 api            # 1. output
docker ps -a                          # 2. exit code
docker inspect api                    # 3. resolved config
docker run -it --entrypoint sh myapp  # 4. shell without the app
docker diff api                       # 5. what changed on disk
docker run --rm -it --network container:api nicolaka/netshoot   # 6. network tools
docker cp api:/app/config.json ./     # 7. pull a file out
```

## Common interview questions

<ol class="guide-steps">
  <li><b>Container versus virtual machine, and is a container less secure?</b>Shared kernel, process-level isolation via namespaces and cgroups, milliseconds and megabytes — versus a full guest OS behind a hypervisor. And yes, weaker: a kernel vulnerability is an escape path, which is why you run non-root and do not put untrusted code in a plain container.</li>
  <li><b>Why is my build slow, and how do you fix it?</b>COPY order. The dependency manifest and install must come before the source copy, so source edits reuse the cached install layer. Once a layer is invalidated everything after it rebuilds. Add a <code>.dockerignore</code> so unrelated files do not bust the cache.</li>
  <li><b>What is a multi-stage build and what problem does it solve?</b>Building needs compilers and dev dependencies; running does not. A build stage produces the artifact, and the runtime stage copies only that with <code>COPY --from</code>. The toolchain, the source, and any build credentials stay in the discarded stage — smaller image, smaller attack surface.</li>
  <li><b>I deleted a secret in a later layer. Is it safe?</b>No. Layers are additive: the file still exists in the earlier layer and is readable by anyone who can pull the image. Rebuild without it and rotate the credential.</li>
  <li><b>How do you pass configuration and secrets?</b>Configuration at run time with <code>-e</code> or <code>--env-file</code>, so one image is promoted across environments. Secrets never via <code>ARG</code> or <code>ENV</code> — both land in image metadata — but as mounted files or run-time environment from a secret store.</li>
  <li><b>Two containers cannot talk to each other. Debug it.</b>Check they are on the same user-defined network — the default bridge has no DNS. Then check the app is connecting to the container name, not <code>localhost</code>, which inside a container means that container. Then verify with a netshoot sidecar: <code>dig db</code>, <code>curl -v http://db:5432</code>.</li>
  <li><b>Named volume or bind mount?</b>Named volume for state — Docker-managed, portable, correctly initialised ownership. Bind mount for development live-reload. Bind mounts in production are host-path dependent and cause UID permission problems.</li>
  <li><b>My app starts before the database is ready.</b><code>depends_on</code> only waits for the container to start. Add a <code>healthcheck</code> to the database and <code>condition: service_healthy</code> to the dependant — and add connection retry to the app regardless, because readiness can be lost at any time, not just at boot.</li>
  <li><b>What does <code>--start-period</code> do on a health check?</b>It is a grace window during boot where failures do not count toward <code>--retries</code>. Without it a slow-starting service is marked unhealthy and restarted before it ever comes up.</li>
  <li><b>Why does my container ignore <code>docker stop</code> and take ten seconds to die?</b>Shell-form <code>CMD</code> makes <code>/bin/sh</code> PID 1, and it does not forward <code>SIGTERM</code> to your app, so Docker eventually <code>SIGKILL</code>s it mid-request. Use the exec form, and end entrypoint scripts with <code>exec "$@"</code>.</li>
  <li><b>Why not deploy <code>:latest</code>?</b>A tag is a mutable pointer. Two hosts pulling <code>:latest</code> an hour apart can run different code, rollback is undefined, and nobody can answer "what is running?". Deploy an immutable version or SHA tag, or a digest.</li>
  <li><b>A container exits with 137. What happened?</b>It was killed — nearly always the OOM killer. Confirm with <code>docker inspect --format '{{.State.OOMKilled}}'</code>. Then either raise the memory limit or find the leak; a limit was doing its job.</li>
  <li><b>How would you shrink a 1.2 GB image?</b><code>docker history</code> to find the fat layers. Then: multi-stage build, a <code>-slim</code> base, <code>--no-install-recommends</code> with apt lists cleaned in the same <code>RUN</code>, no package caches, and a <code>.dockerignore</code>. Measure after each change rather than doing all of it blind.</li>
  <li><b>What goes in <code>.dockerignore</code> and why does it matter?</b><code>.git</code>, <code>node_modules</code>, virtualenvs, build output, <code>.env</code>. The whole context is sent to the daemon on every build — it is a speed problem and a real secret-leak path.</li>
</ol>

## Final self-test

- Explain the cache rule and what invalidation does to later layers.
- Say why deleting a file in a later layer does not remove it.
- Give the two reasons Alpine can be the wrong choice.
- Name the four config mechanisms and which are visible in the image.
- Explain why the default bridge network breaks name resolution.
- Describe the `depends_on` readiness gap and both fixes.
- Explain exec form versus shell form and why signals matter.
- Say what makes a tag different from a digest.
