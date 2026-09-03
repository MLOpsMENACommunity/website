You can build an image and run a container. That is enough to containerise one app on your laptop. This level is about the machinery that turns that into something a team can operate: images that build in seconds instead of minutes, stacks of services that find each other, configuration that changes without a rebuild, and containers that report whether they are actually healthy.

Each topic starts with the problem it solves.

## Layers and the build cache

Every instruction in a Dockerfile produces a layer — a filesystem diff. An image is those layers stacked read-only; a container adds one thin writable layer on top.

<div class="flow">
  <div class="node">FROM<small>base layers</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">COPY<small>+ diff</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">RUN<small>+ diff</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">CONTAINER<small>+ writable layer</small></div>
</div>

The cache rule that explains every slow build: **a layer is reused when its inputs are unchanged, and once one layer is invalidated every layer after it is rebuilt.**

```dockerfile
FROM node:20-slim
WORKDIR /app

COPY package*.json ./          # invalidated only when dependencies change
RUN npm ci                     # ← expensive, and now nearly always cached

COPY . .                       # invalidated on every source edit
RUN npm run build              # cheap by comparison
```

Two consequences worth internalising:

**Layers are additive, so deleting does not shrink.** A file added in one layer and removed in a later one is still in the image, and still readable with `docker history` or by extracting the layer. This is why baked-in secrets cannot be "removed later".

```dockerfile
# The key is in the image forever, despite the rm
RUN curl -H "Authorization: $TOKEN" -o deps.tar https://internal/deps.tar
RUN rm deps.tar
```

**Clean up inside the same `RUN`.** Splitting install and cleanup across two instructions keeps the garbage in the first layer.

```dockerfile
RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential \
 && rm -rf /var/lib/apt/lists/*
```

<div class="callout tip">
  <span class="ct">Inspect what you built</span>
  <code>docker history myapp:1.0</code> shows every layer with its size and the instruction that created it. The fastest way to find the 400 MB layer nobody meant to ship.
</div>

## Multi-stage builds

The problem: building needs compilers, headers, and dev dependencies. Running needs none of them. A single-stage image ships the whole toolchain to production.

```dockerfile Dockerfile
# ---- stage 1: build ----
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci                       # includes devDependencies
COPY . .
RUN npm run build                # produces /app/dist

# ---- stage 2: runtime ----
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev            # production dependencies only
COPY --from=builder /app/dist ./dist
USER node
CMD ["node", "dist/server.js"]
```

Only what you explicitly `COPY --from` crosses the boundary. The compilers, the source, the dev dependencies, and any credentials used during the build stay in the discarded stage.

The Python equivalent, using a virtualenv as the transportable artifact:

```dockerfile Dockerfile
FROM python:3.11 AS builder
WORKDIR /app
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim
RUN useradd --create-home --uid 1000 appuser
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
WORKDIR /app
COPY --chown=appuser:appuser . .
USER appuser
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

<div class="callout tip">
  <span class="ct">Stages are also a test harness</span>
  You can stop at any stage: <code>docker build --target builder -t myapp:build .</code>. A common pattern is a <code>test</code> stage that runs the suite during the build, so a failing test fails the image build.
</div>

## Making images small

Size is not vanity: it is pull time on every deploy, cache pressure in CI, and attack surface in production.

| Lever | Typical effect |
|---|---|
| Multi-stage build | The largest single win — drops the whole toolchain |
| `-slim` instead of the full base | Hundreds of megabytes |
| `--no-install-recommends`, clean apt lists | Tens of megabytes |
| `.dockerignore` | Removes `.git` and `node_modules` from the context |
| `--no-cache-dir` on pip, `npm ci --omit=dev` | Tens to hundreds of megabytes |
| Distroless or Alpine runtime stage | Smallest, at the cost of no shell to debug in |

```bash
docker images myapp                       # compare tags
docker history myapp:1.0                  # find the fat layer
docker image inspect myapp:1.0 --format '{{.Size}}'
```

<div class="callout warn">
  <span class="ct">Alpine is not automatically smaller in practice</span>
  Alpine uses musl instead of glibc, so prebuilt Python wheels and some Node native modules do not apply. You fall back to compiling from source, which needs a toolchain — and the resulting image is often larger and much slower to build than <code>-slim</code>. Measure before switching.
</div>

## Configuration without rebuilding

An image should be built once and promoted through environments. That only works if everything environment-specific arrives at run time.

```dockerfile
ARG NODE_VERSION=20          # build time only, not present at run time
ENV LOG_LEVEL=info           # baked default, overridable at run time
```

```bash
docker run -e LOG_LEVEL=debug -e DATABASE_URL="$DB_URL" myapp:1.0
docker run --env-file ./prod.env myapp:1.0
```

| Mechanism | Available at | Visible in the image | Use for |
|---|---|---|---|
| `ARG` | Build only | Yes, in `docker history` | Base versions, build flags |
| `ENV` | Build and run | Yes | Non-secret defaults |
| `-e` / `--env-file` | Run only | No | Per-environment configuration |
| Mounted file / secret | Run only | No | Credentials |

<div class="callout warn">
  <span class="ct">Neither <code>ARG</code> nor <code>ENV</code> is a secret</span>
  Both are recorded in image metadata and readable by anyone who can pull the image. A password passed as a build argument is in <code>docker history</code> forever.
</div>

## Networking

Docker gives every container an IP on a bridge network. What matters is **which** network.

| Driver | Behaviour |
|---|---|
| `bridge` (default) | Private network on the host; needs `-p` to be reachable from outside |
| **user-defined bridge** | Same, **plus automatic DNS by container name** |
| `host` | No isolation — the container uses the host's network stack directly |
| `none` | No networking at all |

The important distinction: the **default** bridge has no name resolution. A user-defined network does.

```bash
docker network create appnet

docker run -d --name db  --network appnet postgres:16
docker run -d --name api --network appnet -p 8000:8000 myapi:1.0
# api connects to  postgres://db:5432  — "db" resolves to the container
```

<div class="callout warn">
  <span class="ct">Inside a container, <code>localhost</code> means <em>that container</em></span>
  It is the single most common networking mistake. A container cannot reach a sibling on <code>localhost</code>, and it cannot reach a service on your host machine that way either — for that, use <code>host.docker.internal</code> on Docker Desktop.
</div>

## Volumes in depth

```bash
docker volume create pgdata
docker run -d -v pgdata:/var/lib/postgresql/data postgres:16

docker volume ls
docker volume inspect pgdata
docker volume prune                       # deletes unused volumes — check first
```

| Type | Syntax | Notes |
|---|---|---|
| Named volume | `-v pgdata:/data` | Docker-managed, portable, right for state |
| Bind mount | `-v "$(pwd)":/app` | Host path, permission-sensitive, right for dev |
| Anonymous volume | `-v /data` | Created unnamed; a common source of orphaned disk usage |
| `tmpfs` | `--tmpfs /tmp` | In memory only, never written to disk |
| Read-only | `-v conf:/etc/app:ro` | Mount config the container must not modify |

Backing up a named volume — a question that comes up in practice more than people expect:

```bash
# Back up
docker run --rm -v pgdata:/data -v "$(pwd)":/backup alpine \
  tar czf /backup/pgdata.tar.gz -C /data .

# Restore
docker run --rm -v pgdata:/data -v "$(pwd)":/backup alpine \
  tar xzf /backup/pgdata.tar.gz -C /data
```

<div class="callout warn">
  <span class="ct">Bind-mount permission pain</span>
  A bind mount keeps the <b>host's</b> ownership. If the container runs as UID 1000 and the host directory is owned by a different UID, writes fail with "permission denied". Either run the container with a matching <code>--user "$(id -u):$(id -g)"</code>, or use a named volume, which Docker initialises with the right ownership.
</div>

## Docker Compose

Compose replaces long `docker run` invocations with a reviewable file, and wires up the network for you.

```yaml compose.yaml
services:
  api:
    build:
      context: .
      target: runtime            # stop at a specific multi-stage target
    ports: ['8000:8000']
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/app
      REDIS_URL: redis://cache:6379
    depends_on:
      db:
        condition: service_healthy   # wait for READY, not just started
      cache:
        condition: service_started
    restart: unless-stopped

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: app
    volumes: ['pgdata:/var/lib/postgresql/data']
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  cache:
    image: redis:7
    command: ['redis-server', '--appendonly', 'yes']
    volumes: ['redisdata:/data']

volumes:
  pgdata:
  redisdata:
```

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f api
docker compose exec api sh
docker compose down            # keeps volumes
docker compose down -v         # deletes volumes too
```

<div class="callout warn">
  <span class="ct">Plain <code>depends_on</code> is a startup order, not a readiness gate</span>
  It waits for the container to <b>start</b>, not for the service inside to accept connections. A Postgres container is "started" seconds before it is ready, so your app's first query fails. The fix is the <code>healthcheck</code> plus <code>condition: service_healthy</code> shown above — or connection retry logic in the app, which you want anyway.
</div>

### Layering Compose files per environment

```yaml compose.override.yaml
# Applied automatically on top of compose.yaml for local development
services:
  api:
    build:
      target: builder
    volumes: ['.:/app']          # live reload
    environment:
      LOG_LEVEL: debug
    command: ['uvicorn', 'app:app', '--reload', '--host', '0.0.0.0']
```

```bash
docker compose up                                        # base + override
docker compose -f compose.yaml -f compose.prod.yaml up   # explicit set
docker compose config                                    # print the merged result
```

`docker compose config` is the debugging tool here — it shows exactly what the merged file resolves to, including interpolated variables.

## Health checks

A running container is not necessarily a working one. A health check tells Docker, Compose, and any orchestrator the difference.

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -fsS http://localhost:8000/health || exit 1
```

| Option | Meaning |
|---|---|
| `--interval` | How often to check |
| `--timeout` | How long a check may take before it counts as failed |
| `--start-period` | Grace window during boot; failures here do not count |
| `--retries` | Consecutive failures before the status flips to `unhealthy` |

```bash
docker ps                                        # STATUS shows (healthy)
docker inspect --format '{{json .State.Health}}' api | jq
```

`--start-period` is the option people miss. Without it, a service that takes 40 seconds to warm up is marked unhealthy and restarted before it ever finishes starting.

## Signals and shutdown

Your container's PID 1 receives `SIGTERM` on `docker stop`, then `SIGKILL` after the grace period (10 seconds by default). Handling that properly is the difference between a clean deploy and dropped requests.

```dockerfile
# Exec form: your process IS PID 1 and receives signals
CMD ["node", "server.js"]

# Shell form: PID 1 is /bin/sh, which does NOT forward signals to your app
CMD node server.js
```

<div class="callout warn">
  <span class="ct">Always use the exec form (JSON array)</span>
  With the shell form your application never sees <code>SIGTERM</code>, so it is killed hard after ten seconds — mid-request, mid-transaction. If you genuinely need a shell wrapper, use <code>exec</code> in your entrypoint script so your app replaces the shell as PID 1.
</div>

```bash
#!/bin/sh
set -e
./wait-for-db.sh
exec "$@"          # ← exec replaces the shell; without it, signals are lost
```

## Registries and tags

```bash
docker build -t ghcr.io/my-org/myapp:1.4.2 .
docker tag ghcr.io/my-org/myapp:1.4.2 ghcr.io/my-org/myapp:latest

echo "$TOKEN" | docker login ghcr.io -u USERNAME --password-stdin
docker push ghcr.io/my-org/myapp:1.4.2
docker push ghcr.io/my-org/myapp:latest
```

A tag is a **mutable pointer**. `myapp:1.4.2` can be repushed to mean something else tomorrow. The only truly immutable reference is the digest:

```bash
docker pull ghcr.io/my-org/myapp@sha256:9b2c...        # cannot change
docker inspect --format '{{index .RepoDigests 0}}' myapp:1.4.2
```

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Tagging that works</h4>
    <ul>
      <li>Immutable <code>:1.4.2</code> and <code>:sha-a1b2c3d</code> for deployments</li>
      <li>Moving <code>:latest</code> or <code>:stable</code> for humans</li>
      <li>Digest pinning for anything security-sensitive</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Tagging that hurts</h4>
    <ul>
      <li>Deploying <code>:latest</code> — nobody can say what is running</li>
      <li>Repushing an existing version tag</li>
      <li>No tag at all, so rollback means rebuilding</li>
    </ul>
  </div>
</div>

## Debugging beyond `docker logs`

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>1</span><strong>Logs and exit code</strong><small><code>docker logs</code>, then <code>docker ps -a</code>. 137 is out-of-memory, 127 is command-not-found, 126 is not-executable.</small></div>
  <div class="guide-timeline-item"><span>2</span><strong>Inspect the resolved config</strong><small><code>docker inspect</code> shows the real entrypoint, env, mounts, and networks after all defaults and overrides.</small></div>
  <div class="guide-timeline-item"><span>3</span><strong>Get a shell without the app</strong><small><code>docker run -it --entrypoint sh myapp</code> starts the image without running your process.</small></div>
  <div class="guide-timeline-item"><span>4</span><strong>Diff the filesystem</strong><small><code>docker diff NAME</code> lists everything the container changed relative to its image.</small></div>
  <div class="guide-timeline-item"><span>5</span><strong>Debug the network from inside</strong><small>A sidecar with real tools beats installing curl into your production image.</small></div>
  <div class="guide-timeline-item"><span>6</span><strong>Watch resources</strong><small><code>docker stats</code> for live CPU and memory; check <code>.State.OOMKilled</code> for the 137 case.</small></div>
</div>

```bash
# Network debugging without polluting your image
docker run --rm -it --network container:api nicolaka/netshoot
> dig db
> curl -v http://db:5432
> ss -tlnp

# What has this container written?
docker diff api

# Copy a file out of a container for inspection
docker cp api:/app/config.resolved.json ./
```

## Where you are now

You can build a small, fast, layered image; run a multi-service stack that starts in the right order and reports its health; keep configuration and data outside the image; publish to a registry with tags people can reason about; and debug a container without guessing.

What is missing is everything about **trust and operation at scale**: running as a non-root user with dropped capabilities, keeping secrets out of layers, scanning and signing images, controlling memory and CPU so one container cannot take down a host, and knowing where Docker stops and an orchestrator begins. That is the senior track.
