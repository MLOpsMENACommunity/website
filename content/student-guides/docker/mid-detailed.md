This is part two of three. It picks up exactly where Beginner ended and takes **every topic from there further**, then adds the machinery you have not met yet. Nothing is dropped and nothing is repeated for its own sake — where you already know the basics, we go straight to the depth.

## Where this picks up

| Topic you already use | What this level adds |
|---|---|
| Images and layers | The exact cache rules, `docker history` forensics, additive layers as a leak mechanism |
| `COPY` order | Multi-stage builds, cache mounts, and how to make the cache work in CI |
| Base images | Size levers in order of leverage, distroless, and why Alpine can be a trap |
| `ENV` / `ARG` / `-e` | Precedence in full, `--env-file` mechanics, config that never rebuilds |
| Ports and networking | Network drivers, DNS, aliases, and reaching the host |
| Volumes | Anonymous volumes, `tmpfs`, read-only mounts, backup and restore, UID permissions |
| Compose | Health checks, `condition:`, profiles, override files per environment |
| `CMD` / `ENTRYPOINT` | Signals, PID 1, graceful shutdown, entrypoint scripts that behave |
| Tags and registries | Digests, immutable references, promotion, retention |
| Debugging | `docker diff`, `docker events`, network sidecars, resolved-config forensics |
| — **new** — | Health checks · resource limits · BuildKit · Compose profiles · image promotion |

Each section starts with the problem it solves, and ends with a **Try it** you can do on a real project in a few minutes.

## Layers and the build cache, precisely

Beginner gave you the rule of thumb: dependencies before source. Here is the mechanism it comes from, because once you know it you can predict every cache miss instead of discovering them.

Every instruction produces a layer — a filesystem diff — and Docker decides whether to reuse it by comparing a **cache key**. What goes into that key differs by instruction, and that is the part people never learn:

| Instruction | Cache key is built from |
|---|---|
| `FROM` | The resolved image digest |
| `RUN` | The **command string**, verbatim — not its effects |
| `COPY` / `ADD` | A checksum of the file contents, plus destination and mode |
| `ENV`, `ARG`, `WORKDIR`, `USER` | The literal instruction text |

Two consequences fall straight out of that table.

**`RUN` is cached on the text of the command, not on the world it runs in.** `RUN apt-get update` produces a layer keyed on those three words, so Docker happily reuses a six-week-old package index. That is the real reason `update` and `install` must live in the same instruction — not tidiness, but cache correctness.

**`COPY` is cached on content, so touching a file is not enough to bust it** — but changing one byte in any copied file is. `COPY . .` therefore hashes your whole source tree, which is why a `.dockerignore` that excludes `.git` and log files removes a whole class of spurious rebuilds.

And the rule that ties the two together: **once one layer's key changes, every layer after it is rebuilt**, regardless of whether its own inputs changed. The cache is a prefix match, not a per-line lookup.

```dockerfile
FROM node:20-slim
WORKDIR /app

COPY package*.json ./          # key = hash of those two files → rarely changes
RUN npm ci                     # ← expensive, and now nearly always CACHED

COPY . .                       # key = hash of everything else → changes constantly
RUN npm run build              # cheap by comparison
```

Now the second consequence of layering, and the more important one:

<div class="callout warn">
  <span class="ct">Layers are additive, so deleting does not shrink — or hide</span>
  A file added in one layer and removed in a later one is still present in the earlier layer, still counted in the image size, and still extractable by anyone who can pull the image. This is the mechanism behind most credentials leaked in images, and it is why "we deleted it in the next line" is never an answer.
</div>

```dockerfile
# The token is in this image permanently, despite the rm
RUN curl -H "Authorization: $TOKEN" -o deps.tar https://internal/deps.tar
RUN rm deps.tar
```

The forensic tools for all of this:

```bash
docker history myapp:1.0                                  # layers, sizes, instructions
docker history --no-trunc myapp:1.0 | grep -iE 'token|secret|password'
docker image inspect myapp:1.0 --format '{{.Size}}'
docker build --progress=plain --no-cache -t myapp:1.0 .   # see every step, cache disabled
```

<div class="callout tip">
  <span class="ct">Read the build output as a cache report</span>
  With BuildKit, every reused step is printed as <code>CACHED</code>. The first line <em>without</em> that marker is your invalidation point — and it is almost always higher up the file than you assumed.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Build twice with no changes and confirm every step reports <code>CACHED</code>.</li>
    <li>Edit one character of source, rebuild, and note the exact instruction where <code>CACHED</code> stops.</li>
    <li>Add <code>RUN apt-get update</code> as its own instruction, build, wait a day, and rebuild — it is still cached.</li>
    <li>Prove the additive-layer point: <code>RUN echo "SECRET=abc123" &gt; /tmp/k</code> then <code>RUN rm /tmp/k</code>, rebuild, and run <code>docker history --no-trunc myapp:1.0 | grep SECRET</code>.</li>
  </ol>
  <em>the invalidation point is visible in the build log, the stale <code>apt-get update</code> stays cached indefinitely, and your deleted secret is still sitting in <code>docker history</code>. That last result is the one to remember.</em>
</div>

## Multi-stage builds

The problem: building needs compilers, headers, and development dependencies. Running needs none of them. A single-stage image ships the entire toolchain to production — often several hundred megabytes of software whose only purpose was to produce one directory.

A multi-stage build puts the build in one stage and the runtime in another, and copies only the result across.

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

**Only what you explicitly `COPY --from` crosses the boundary.** The compilers, the source tree, the dev dependencies, the `.git` history, and any credential used during the build all stay in the discarded stage — they never exist in the shipped image, so they cannot be extracted from it.

The Python equivalent uses a virtualenv as the transportable artifact, because it is a single self-contained directory:

```dockerfile Dockerfile
FROM python:3.11 AS builder
WORKDIR /app
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim
RUN useradd --create-home --uid 10001 appuser
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
WORKDIR /app
COPY --chown=appuser:appuser . .
USER 10001
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

Three further capabilities make stages more than a size trick:

**Stop at any stage.** `docker build --target builder -t myapp:build .` builds only up to that stage — useful for debugging, and for a development image that keeps the toolchain.

**Run tests as a stage.** A `test` stage that runs the suite means a failing test fails the image build, so a broken image cannot be produced at all.

```dockerfile
FROM builder AS test
RUN npm run lint && npm test

FROM node:20-slim AS runtime
COPY --from=builder /app/dist ./dist
```

**Copy from an image you did not build.** `COPY --from=` accepts an image reference, not just a stage name, which is the neat way to pull in a single binary:

```dockerfile
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
```

<div class="callout tip">
  <span class="ct">Stages are also parallel</span>
  BuildKit builds independent stages concurrently and skips any stage the final target does not depend on. So adding a <code>test</code> stage costs nothing on a build that targets <code>runtime</code>, and a linting stage can run alongside the compile.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Note your current image size with <code>docker images</code>.</li>
    <li>Convert the Dockerfile to two stages and rebuild. Compare sizes.</li>
    <li>Run <code>docker build --target builder -t myapp:build .</code> and compare that image's size to the runtime one.</li>
    <li>Confirm the toolchain is gone from the final image: <code>docker run --rm myapp:1.0 sh -c 'which gcc npm pip'</code>.</li>
    <li>Add a <code>test</code> stage that runs your suite, break a test, and watch the build fail.</li>
  </ol>
  <em>usually a several-hundred-megabyte drop, a builder image that is still large, and a runtime image where the compilers are simply absent. The failing build in step five is the useful one: it means a red test can no longer produce a shippable image.</em>
</div>

## Making images small, in order of leverage

Size is not vanity. It is pull time on every deploy, cache pressure in CI, storage cost in your registry, and attack surface in production. But most size "optimisation" is guesswork applied to the wrong layer, so measure first.

```bash
docker history myapp:1.0 --no-trunc --format '{{.Size}}\t{{.CreatedBy}}' | head -20
docker image inspect myapp:1.0 --format '{{.Size}}'
docker images myapp                                   # compare tags side by side
```

Then work down this list. It is ordered by how much each change typically returns:

<ol class="guide-steps">
  <li><b>Split build and runtime</b>A multi-stage build removes compilers, headers, dev dependencies, and the source tree in one change. Usually worth more than everything below it combined.</li>
  <li><b>Drop to a <code>-slim</code> base</b>Hundreds of megabytes, and almost always a drop-in change. Do this before considering anything more exotic.</li>
  <li><b>Clean package manager state in the same layer</b><code>--no-install-recommends</code>, then <code>rm -rf /var/lib/apt/lists/*</code> inside the same <code>RUN</code>. Cleaning in a later instruction removes nothing at all.</li>
  <li><b>Stop shipping caches</b><code>pip --no-cache-dir</code>, <code>npm ci --omit=dev</code>, <code>go build</code> into a minimal stage. Package manager caches are pure dead weight in a shipped image.</li>
  <li><b>Write a real <code>.dockerignore</code></b>Smaller context, faster uploads, and fewer spurious cache invalidations from files that have nothing to do with the build.</li>
  <li><b>Only then consider distroless or Alpine</b>The smallest runtime images, at the cost of no shell to debug in and, for Alpine, musl incompatibilities.</li>
</ol>

| Lever | Typical effect |
|---|---|
| Multi-stage build | The largest single win — drops the whole toolchain |
| `-slim` instead of the full base | Hundreds of megabytes |
| `--no-install-recommends` + clean apt lists | Tens of megabytes |
| `--no-cache-dir` on pip, `npm ci --omit=dev` | Tens to hundreds of megabytes |
| `.dockerignore` | Removes `.git` and `node_modules` from the context |
| Distroless or Alpine runtime stage | Smallest, at the cost of no shell |

Distroless deserves a note because it is the option people have not usually met. A distroless image contains your runtime and nothing else — no shell, no package manager, no `ls`. That removes most of the tooling an attacker would use after a compromise, and it means you cannot `docker exec` into it, which is a real operational trade-off rather than a detail.

```dockerfile
FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --target=/deps -r requirements.txt

FROM gcr.io/distroless/python3-debian12
WORKDIR /app
COPY --from=builder /deps /deps
COPY src/ ./src/
ENV PYTHONPATH=/deps
CMD ["-m", "src.serve"]
```

<div class="callout warn">
  <span class="ct">Alpine is not automatically smaller in practice</span>
  Alpine uses musl instead of glibc, so prebuilt Python wheels and some Node native modules do not apply and get compiled from source instead. That needs a toolchain, and the result is frequently <b>larger</b> and much slower to build than <code>-slim</code>. Measure both before switching, and treat the base image as a decision you justify rather than a default you inherit.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run the <code>docker history</code> command above and identify your three largest layers.</li>
    <li>Apply the top two items from the list and measure after each one, not both at once.</li>
    <li>Build the same app on <code>-slim</code> and on <code>-alpine</code>, timing both builds and comparing final sizes.</li>
    <li>Try a distroless runtime stage, then attempt <code>docker exec -it NAME sh</code> on it.</li>
  </ol>
  <em>the fat layer is usually not the one you expected, Alpine is often slower to build and not much smaller, and the distroless container refuses your shell entirely. That refusal is the trade-off in one command.</em>
</div>

## BuildKit and cache mounts

BuildKit is the modern build engine, and it is the default in current Docker versions. Two of its features change how you write a Dockerfile.

**Cache mounts** persist a directory *across builds* without ever putting it in the image. This is different from layer caching: it survives even when the layer above it was invalidated, so a changed lockfile no longer means re-downloading every package.

```dockerfile
# syntax=docker/dockerfile:1
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt
```

Note there is no `--no-cache-dir` here. You *want* the cache — the mount keeps it out of the image while letting the next build reuse it. The same pattern applies to every package manager:

```dockerfile
# apt
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends curl

# npm
RUN --mount=type=cache,target=/root/.npm npm ci

# Go modules and build cache
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go build -o /out/app ./cmd/app
```

**Bind mounts at build time** let a step read a file without copying it into a layer:

```dockerfile
RUN --mount=type=bind,source=requirements.txt,target=/tmp/requirements.txt \
    pip install -r /tmp/requirements.txt
```

The `# syntax=docker/dockerfile:1` line at the top is what enables this syntax. It is a directive, must be the first line, and pins the Dockerfile frontend rather than the base image.

<div class="callout tip">
  <span class="ct">The third mount type is for secrets</span>
  <code>--mount=type=secret</code> makes a credential available to one <code>RUN</code> without it ever becoming a layer — the correct answer to "how do I install from a private package index?". Senior level covers it in full, along with SSH agent forwarding for private Git dependencies.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add the <code>syntax</code> directive and a pip or npm cache mount to your Dockerfile.</li>
    <li>Build, then change one line in your dependency manifest and build again. Time both.</li>
    <li>Compare against the same change without the cache mount.</li>
    <li>Confirm the cache is not in the image: <code>docker run --rm myapp:1.0 du -sh /root/.cache 2&gt;/dev/null || echo 'not present'</code>.</li>
  </ol>
  <em>the second build re-resolves dependencies but downloads almost nothing, and the cache directory is absent from the image. This is the change that makes adding one package a ten-second rebuild instead of a two-minute one.</em>
</div>

## Configuration without rebuilding

Beginner established the principle: build once, configure at run time. Here is what it takes to hold that line in practice, because the pressure to bake something in arrives quickly.

The four mechanisms, and the precedence between them:

| Mechanism | Available at | Recorded in the image | Use for |
|---|---|---|---|
| `ARG` | Build only | **Yes**, in `docker history` | Base versions, build flags, feature toggles |
| `ENV` | Build and run | **Yes**, in image metadata | Non-secret defaults |
| `-e` / `--env-file` | Run only | No | Per-environment configuration |
| Mounted file | Run only | No | Credentials, certificates, large config |

```dockerfile
ARG PYTHON_VERSION=3.11        # usable in FROM, before the first stage
FROM python:${PYTHON_VERSION}-slim

ARG BUILD_REV=unknown          # must be re-declared inside a stage to be usable
ENV APP_REV=${BUILD_REV} \
    LOG_LEVEL=info \
    PYTHONUNBUFFERED=1
```

```bash
docker build --build-arg PYTHON_VERSION=3.12 --build-arg BUILD_REV="$(git rev-parse --short HEAD)" -t myapp:1.0 .

docker run -e LOG_LEVEL=debug -e DATABASE_URL="$DB_URL" myapp:1.0
docker run --env-file ./prod.env myapp:1.0
docker run --rm myapp:1.0 env                # exactly what the container received
```

Two `ARG` details cost people time. An `ARG` declared before the first `FROM` is only visible to `FROM` lines — to use it inside a stage you must declare it again there. And an `ARG` used in a `RUN` becomes part of that layer's cache key, so changing it invalidates everything after it, which is occasionally what you want and often a surprise.

Precedence, most specific wins:

<div class="flow">
  <div class="node">ENV<small>image default</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">--env-file<small>per environment</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">-e<small>explicit override</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">PROCESS<small>what the app sees</small></div>
</div>

For anything larger or more sensitive than a string, mount a file instead:

```bash
docker run -d \
  -v ./config/production.yaml:/etc/app/config.yaml:ro \
  -e CONFIG_PATH=/etc/app/config.yaml \
  myapp:1.0
```

That pattern — a read-only mount plus an environment variable naming the path — is how real services take structured configuration, and it keeps the image identical across environments.

<div class="callout warn">
  <span class="ct">Neither <code>ARG</code> nor <code>ENV</code> is a secret</span>
  Both are image metadata, readable with <code>docker history</code> and <code>docker inspect</code> by anyone who can pull the image. A password passed as a build argument is in that history permanently. At this level: secrets arrive at run time, as a mounted file or from a secret manager. Senior covers the BuildKit secret mount for the genuine build-time case.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Parameterise your base image version with an <code>ARG</code> above <code>FROM</code>, and build with two different values.</li>
    <li>Add a second <code>ARG</code> for the git revision, expose it as an <code>ENV</code>, and confirm it with <code>docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}'</code>.</li>
    <li>Set the same variable three ways — <code>ENV</code>, <code>--env-file</code>, and <code>-e</code> — and confirm which wins.</li>
    <li>Now find your build arg in the metadata: <code>docker history --no-trunc myapp:1.0 | grep BUILD_REV</code>.</li>
  </ol>
  <em>one image that reports which commit produced it, clear precedence between the three mechanisms, and your build argument visible in plain text in the history. The last point is why the warning above is not theoretical.</em>
</div>

## Networking in depth

Beginner's rule was "create a network, address containers by name". Here is the model underneath it, which you need as soon as something does not resolve.

| Driver | Behaviour |
|---|---|
| `bridge` (default) | Private network on the host; needs `-p` to be reachable from outside; **no DNS** |
| **User-defined bridge** | Same, **plus automatic DNS by container name** |
| `host` | No network isolation — the container uses the host's stack directly |
| `none` | No networking at all |
| `overlay` | Multi-host, for Swarm or orchestrators |

The distinction that matters day to day is the first two rows: **the default bridge has no name resolution, a network you create does.** Docker runs an embedded DNS server at `127.0.0.11` inside containers on user-defined networks, resolving container names, network aliases, and Compose service names.

```bash
docker network create appnet
docker network ls
docker network inspect appnet                 # subnet, gateway, connected containers

docker run -d --name db  --network appnet postgres:16
docker run -d --name api --network appnet -p 8000:8000 myapi:1.0
# api connects to postgres://db:5432 — "db" resolves through Docker's DNS

docker network connect othernet api           # a container can be on several networks
docker network disconnect othernet api
```

Three capabilities beyond the basics:

**Aliases** give a container additional names on a network, which is how you swap an implementation without touching connection strings:

```bash
docker run -d --name postgres-16 --network appnet --network-alias db postgres:16
# clients keep connecting to "db"; you decide which container answers
```

**`host` networking** removes the network namespace entirely: no port mapping, no isolation, and the container's ports are the host's ports. It is occasionally right for performance-sensitive or network-inspecting workloads, and it is Linux-only — on Docker Desktop it does not behave the way you expect.

**Reaching the host** from inside a container is a common need and has a platform-specific answer:

```bash
# Docker Desktop (macOS, Windows): built in
docker run --rm curlimages/curl curl -s http://host.docker.internal:5432

# Plain Linux: you have to add the mapping yourself
docker run --rm --add-host=host.docker.internal:host-gateway curlimages/curl \
  curl -s http://host.docker.internal:5432
```

<div class="callout warn">
  <span class="ct">Inside a container, <code>localhost</code> means <em>that container</em></span>
  It is the single most common networking mistake and it produces "connection refused" against a service you can plainly see running. A container cannot reach a sibling on <code>localhost</code>, and it cannot reach a service on your host that way either. Sibling: use the container or service name. Host: use <code>host.docker.internal</code>.
</div>

Debugging without installing tools into your image — attach a container that already has them to the target's network namespace:

```bash
docker run --rm -it --network container:api nicolaka/netshoot
> dig db                      # does the name resolve, and to what?
> curl -v http://db:5432      # is anything listening?
> ss -tlnp                    # what is bound, on which interface?
> traceroute db
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Start two containers on the default bridge and confirm <code>ping other</code> fails to resolve. Then repeat on a network you created.</li>
    <li>Run <code>docker network inspect appnet</code> and find the subnet and both container IPs.</li>
    <li>Give a container a <code>--network-alias</code> and connect to it under that name.</li>
    <li>Attach netshoot with <code>--network container:api</code> and run <code>dig db</code>, <code>ss -tlnp</code>, and a <code>curl</code> against the database port.</li>
    <li>From inside a container, try to reach a service running on your host, first with <code>localhost</code> and then with <code>host.docker.internal</code>.</li>
  </ol>
  <em>DNS fails on the default bridge and works on yours; netshoot shows you resolution and listening sockets without touching your image; and <code>localhost</code> reaches nothing from inside a container while <code>host.docker.internal</code> works. Those three results cover nearly every container networking question you will be asked.</em>
</div>

## Volumes in depth

Beginner covered named volumes versus bind mounts. There are five mount types in total, and the two you have not met solve real problems.

| Type | Syntax | Notes |
|---|---|---|
| Named volume | `-v pgdata:/data` | Docker-managed, portable, correct ownership — right for state |
| Bind mount | `-v "$(pwd)":/app` | Host path, permission-sensitive — right for development |
| Anonymous volume | `-v /data` | Created unnamed; a common source of orphaned disk usage |
| `tmpfs` | `--tmpfs /tmp:rw,noexec,nosuid` | Memory only, never written to disk |
| Read-only | `-v conf:/etc/app:ro` | Configuration the container must not modify |

The long `--mount` form is more verbose and much clearer, and it is what you want in anything shared:

```bash
docker run -d \
  --mount type=volume,source=pgdata,target=/var/lib/postgresql/data \
  --mount type=bind,source="$(pwd)/config",target=/etc/app,readonly \
  --mount type=tmpfs,target=/tmp,tmpfs-size=64m \
  postgres:16
```

**Anonymous volumes** are worth understanding because they appear whether you ask for them or not: an image with a `VOLUME` instruction creates one on every `docker run`, and they accumulate silently. They also have one genuinely useful application — shielding a subdirectory from a bind mount:

```yaml compose.override.yaml
services:
  api:
    volumes:
      - .:/app                    # your source, live
      - /app/node_modules         # anonymous volume keeps the image's deps visible
```

Without that second line, mounting your project over `/app` hides everything the build installed there, including `node_modules`. The anonymous volume masks that one subdirectory back.

**`tmpfs`** puts a path in memory. Use it when a container needs scratch space but you do not want it on disk — the typical case being a read-only container that still needs somewhere to write.

Backup and restore comes up far more often than people expect, and the pattern is always the same: a throwaway container with the volume attached and a bind mount to write to.

```bash
# Back up a named volume to a tarball on the host
docker run --rm \
  -v pgdata:/data:ro \
  -v "$(pwd)":/backup \
  alpine tar czf /backup/pgdata-$(date +%F).tar.gz -C /data .

# Restore into a fresh volume
docker volume create pgdata-restored
docker run --rm -v pgdata-restored:/data -v "$(pwd)":/backup \
  alpine tar xzf /backup/pgdata-2024-05-01.tar.gz -C /data

# Copy one volume to another
docker run --rm -v pgdata:/from:ro -v pgdata-copy:/to alpine sh -c 'cp -a /from/. /to/'

# How big is it, and what is inside?
docker run --rm -v pgdata:/data:ro alpine du -sh /data
docker system df -v
```

<div class="callout warn">
  <span class="ct">Stop the writer first — or use the database's own tooling</span>
  Tarring a live Postgres data directory gives you a torn, possibly unrestorable copy. Either stop the container, or use <code>pg_dump</code>, which is the correct answer for anything transactional. The tar pattern above is right for caches, uploads, and model files; it is wrong for a running database.
</div>

<div class="callout warn">
  <span class="ct">Bind-mount permission pain</span>
  A bind mount keeps the <b>host's</b> ownership. If the container runs as uid 10001 and the host directory belongs to uid 1000, writes fail with "permission denied" — and this bites Linux users while Mac and Windows users never see it, because Docker Desktop's VM papers over it. Either run with <code>--user "$(id -u):$(id -g)"</code>, or use a named volume, which Docker initialises with the right ownership.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Back up a volume with the tar pattern, delete the volume, restore it into a fresh one, and start a container against the restored copy.</li>
    <li>Add a <code>tmpfs</code> mount at <code>/tmp</code> and confirm from inside that writes work but do not survive a restart.</li>
    <li>Reproduce the bind-mount masking problem: mount your source over <code>/app</code> in a Node project and watch <code>node_modules</code> vanish, then fix it with an anonymous volume.</li>
    <li>Run <code>docker volume ls</code> and count how many anonymous (hash-named) volumes you have accumulated.</li>
  </ol>
  <em>a restored volume that actually works, ephemeral <code>/tmp</code>, a broken then fixed <code>node_modules</code>, and probably more orphaned anonymous volumes than you expected. That last count is why <code>docker volume prune</code> exists.</em>
</div>

## Health checks

A running container is not necessarily a working one. A process can be alive while its dependency is unreachable, its thread pool is deadlocked, or it never finished starting. A health check is how Docker, Compose, and every orchestrator tell the difference.

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -fsS http://localhost:8000/health || exit 1
```

| Option | Meaning |
|---|---|
| `--interval` | How often to run the check |
| `--timeout` | How long one check may take before it counts as a failure |
| `--start-period` | Grace window during boot; failures here do not count towards `--retries` |
| `--retries` | Consecutive failures before the status flips to `unhealthy` |

The check is a command run **inside** the container, and its exit code is the whole result: 0 is healthy, 1 is unhealthy. That is why `curl -f` matters — without `-f`, curl exits 0 even on an HTTP 500.

```bash
docker ps                                                    # STATUS shows (healthy)
docker inspect --format '{{json .State.Health}}' api         # full history of checks
docker inspect --format '{{.State.Health.Status}}' api       # just the current state
docker events --filter event=health_status                   # watch transitions live
```

`--start-period` is the option people miss, and its absence produces a container that restarts forever: a service that takes forty seconds to warm up fails its first three checks, gets marked unhealthy, and is restarted before it ever finishes starting.

<div class="callout tip">
  <span class="ct">Check the dependency, not the process</span>
  A health endpoint that returns 200 unconditionally proves only that the web framework is running — which Docker already knew. A useful check touches the thing that actually breaks: a cheap query against the database, a ping to the cache. Keep it cheap enough to run every thirty seconds, and do not make it fail because a non-critical downstream is slow.
</div>

If your image has no `curl` — a slim or distroless image often does not — use the runtime you already have:

```dockerfile
# Python, no extra packages needed
HEALTHCHECK --interval=30s --start-period=40s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health').status==200 else 1)"

# Node
HEALTHCHECK CMD node -e "require('http').get('http://localhost:3000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add a health check to your app and watch <code>docker ps</code> go from <code>(health: starting)</code> to <code>(healthy)</code>.</li>
    <li>Read the check history: <code>docker inspect --format '{{json .State.Health}}' NAME</code>.</li>
    <li>Break the endpoint on purpose and watch the status flip to <code>unhealthy</code> after the retries are exhausted.</li>
    <li>Remove <code>--start-period</code>, add an artificial thirty-second startup delay, and watch it be declared unhealthy before it is even ready.</li>
  </ol>
  <em>a visible state machine in <code>docker ps</code>, a check history with timestamps and output, and — in step four — a container that is marked broken purely because nobody gave it time to start. That is the failure <code>--start-period</code> exists to prevent.</em>
</div>

## Signals, PID 1, and graceful shutdown

Beginner told you to use the exec form of `CMD`. Here is why, and what it costs you when you get it wrong.

When you run `docker stop`, Docker sends `SIGTERM` to **process 1** inside the container, waits ten seconds by default, then sends `SIGKILL`. Whether your application ever hears that signal depends entirely on what PID 1 is.

```dockerfile
# Exec form: your process IS PID 1 and receives signals
CMD ["node", "server.js"]

# Shell form: PID 1 is /bin/sh, which does NOT forward signals to your app
CMD node server.js
```

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Exec form — signals work</h4>
    <ul>
      <li><code>CMD ["node", "server.js"]</code></li>
      <li>Your process is PID 1</li>
      <li>Receives <code>SIGTERM</code> and can drain connections</li>
      <li><code>docker stop</code> returns quickly</li>
      <li>Wrapper scripts must end with <code>exec "$@"</code></li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Shell form — signals lost</h4>
    <ul>
      <li><code>CMD node server.js</code></li>
      <li>PID 1 is <code>/bin/sh</code></li>
      <li>It does not forward signals to its child</li>
      <li><code>docker stop</code> takes the full ten seconds, then kills</li>
      <li>Requests dropped mid-flight on every deploy</li>
    </ul>
  </div>
</div>

The symptom is unmistakable once you know it: **`docker stop` takes exactly ten seconds and then the container dies hard.** That is not slowness, it is the grace period expiring because nothing responded.

```bash
docker stop api                          # default 10s grace
docker stop -t 30 api                    # allow 30s to drain
docker inspect api --format '{{.State.ExitCode}}'   # 143 = clean SIGTERM, 137 = SIGKILL
```

Most real images need something to happen before the app starts — wait for a dependency, run a migration, resolve configuration. Done carelessly, that entrypoint script becomes the reason your container ignores `docker stop`.

```bash docker-entrypoint.sh
#!/bin/sh
set -eu

# Wait for a dependency, but bounded — never loop forever
tries=0
until nc -z "${DB_HOST:-db}" "${DB_PORT:-5432}"; do
  tries=$((tries + 1))
  [ "$tries" -ge 30 ] && { echo "db unreachable after 30 tries" >&2; exit 1; }
  echo "waiting for db ($tries)"
  sleep 1
done

[ "${RUN_MIGRATIONS:-false}" = "true" ] && ./manage.py migrate --noinput

exec "$@"          # ← replaces the shell, so your app becomes PID 1
```

```dockerfile
COPY --chmod=0755 docker-entrypoint.sh /usr/local/bin/
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

| Rule | Why |
|---|---|
| End with `exec "$@"` | Without it the shell stays PID 1 and swallows `SIGTERM` |
| `set -eu` | A failing setup step should stop the container, not be ignored |
| Bound the wait loop | An infinite retry turns a config error into a container that never says why |
| Keep migrations opt-in | Ten replicas all migrating on boot is a race you do not want |
| `ENTRYPOINT` script + `CMD` args | `docker run img sh` still works for debugging |

<div class="callout warn">
  <span class="ct">A wait loop is not a substitute for retries</span>
  Waiting at startup handles the boot case only. Databases restart, networks blip, failovers happen — your application must reconnect at run time as well. The entrypoint wait makes the first request work; connection retry logic keeps the service alive.
</div>

There is one more PID 1 consideration: a real init process reaps zombies. If your container spawns child processes that it does not wait on, add `--init` (or `init: true` in Compose) and Docker inserts a minimal init as PID 1.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Build with the shell form of <code>CMD</code>, then run <code>time docker stop NAME</code> and note it takes ten seconds.</li>
    <li>Switch to the exec form and time it again.</li>
    <li>Add a <code>SIGTERM</code> handler to your app that logs "draining" and exits, then confirm you see that line in <code>docker logs</code> on stop.</li>
    <li>Compare exit codes across both runs: <code>docker inspect NAME --format '{{.State.ExitCode}}'</code>.</li>
  </ol>
  <em>ten seconds and exit 137 with the shell form; well under a second and exit 143 with the exec form, plus your "draining" line in the logs. That is graceful shutdown proven rather than assumed.</em>
</div>

## Resource limits

Without limits, one container can consume all the memory on a host and the kernel will kill *something* — not necessarily the guilty process. Setting limits is how you make a runaway container a bounded, diagnosable failure rather than an outage.

```bash
docker run -d \
  -m 512m \                       # hard memory ceiling
  --memory-reservation 256m \     # soft target under host pressure
  --cpus 1.5 \                    # CPU quota, in cores
  --pids-limit 200 \              # process count cap — the fork-bomb defence
  --restart on-failure:5 \        # bounded retries, not a forever crash loop
  myapp:1.0

docker stats --no-stream
docker inspect --format '{{.State.OOMKilled}}' myapp        # true after a 137
```

| Limit | Effect |
|---|---|
| `-m` / `--memory` | Hard ceiling; exceeding it means SIGKILL and exit 137 |
| `--memory-reservation` | Soft target the kernel aims for when the host is under pressure |
| `--cpus` | CPU quota expressed in cores — `1.5` means one and a half cores' worth |
| `--pids-limit` | Caps the number of processes |
| `--restart on-failure:N` | Restart on failure, at most N times |

Exit code **137** with `OOMKilled: true` is the memory limit doing its job. The container asked for more than it was allowed and the kernel stopped it. That is a much better outcome than the alternative, where an unlimited container takes the host's memory and the kernel kills your database instead.

<div class="callout warn">
  <span class="ct">Some runtimes do not see the container's limit</span>
  Older JVMs and Node builds read the <b>host's</b> memory rather than the cgroup limit, so they size their heap for a 64 GB machine inside a 512 MB container and get OOM-killed almost immediately. Modern JVMs are container-aware; for Node, set <code>--max-old-space-size</code> explicitly to roughly 75% of the limit. If a container dies at a limit while apparently doing nothing, suspect this before your code.
</div>

The same settings in Compose, where they belong for anything a team runs:

```yaml compose.yaml
services:
  api:
    build: .
    mem_limit: 512m
    cpus: 1.0
    pids_limit: 200
    restart: unless-stopped
```

<div class="callout tip">
  <span class="ct">Set limits locally too</span>
  A memory leak should hit a ceiling, not your laptop's swap. Running with the same limits you use in production also means you discover an under-provisioned service on your own machine rather than in staging.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run your app with <code>-m 64m</code> and watch it get killed. Confirm with the exit code and the <code>OOMKilled</code> flag.</li>
    <li>Raise the limit until it runs, then check actual usage with <code>docker stats --no-stream</code> — the headroom is usually smaller than expected.</li>
    <li>Run a CPU-heavy task with <code>--cpus 0.5</code> and then <code>--cpus 2</code>, and compare the wall-clock time.</li>
    <li>Add <code>--pids-limit 20</code> and try to start more processes than that from inside.</li>
  </ol>
  <em>a deliberate OOM kill with exit 137, real memory numbers for your service, a visible CPU quota effect, and a hard process cap. Knowing your service's actual footprint is what turns limit-setting from guesswork into a measurement.</em>
</div>

## Docker Compose in depth

Beginner used Compose to start an app and a database. At this level Compose becomes the file that describes how your whole system fits together — and the file a colleague reads to understand it.

```yaml compose.yaml
services:
  api:
    build:
      context: .
      target: runtime              # stop at a specific multi-stage target
      args:
        BUILD_REV: ${GIT_SHA:-dev}
    image: ghcr.io/org/app:${TAG:-dev}
    ports: ['8000:8000']
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/app
      REDIS_URL: redis://cache:6379
      LOG_FORMAT: json
    env_file: [.env]
    depends_on:
      db:
        condition: service_healthy     # wait for READY, not merely started
      cache:
        condition: service_started
    healthcheck:
      test: ['CMD-SHELL', 'curl -fsS http://localhost:8000/health || exit 1']
      interval: 30s
      timeout: 3s
      start_period: 40s
      retries: 3
    mem_limit: 512m
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
docker compose ps                     # includes health status
docker compose logs -f api
docker compose exec api sh
docker compose restart api            # one service
docker compose up -d --no-deps api    # rebuild and replace one service only
docker compose down                   # keeps volumes
docker compose down -v                # deletes volumes too
```

<div class="callout warn">
  <span class="ct">Plain <code>depends_on</code> is a startup order, not a readiness gate</span>
  It waits for the container to <b>start</b>, not for the service inside to accept connections — and a Postgres container is "started" several seconds before it is ready. That is the entire explanation for "the first request after <code>up</code> always fails". The fix is the <code>healthcheck</code> plus <code>condition: service_healthy</code> shown above, and connection retry logic in the app, which you want regardless.
</div>

### Layering Compose files per environment

`compose.override.yaml` is applied **automatically** on top of `compose.yaml`. That is convenient locally and dangerous in a pipeline.

```yaml compose.override.yaml
# Local development only, applied automatically
services:
  api:
    build:
      target: builder               # keep the toolchain for debugging
    volumes:
      - .:/app                      # live reload
      - /app/node_modules           # shield the image's dependencies
    environment:
      LOG_FORMAT: pretty
      LOG_LEVEL: debug
    command: ['uvicorn', 'app:app', '--reload', '--host', '0.0.0.0']
```

```bash
docker compose up                                          # base + override
docker compose -f compose.yaml -f compose.prod.yaml up -d   # explicit set, no override
docker compose config                                       # print the MERGED result
docker compose -f compose.yaml config                       # what production really gets
```

**`docker compose config` is the debugging tool here.** It prints the fully merged, variable-interpolated file — which is what actually runs, and often not what you believe you wrote. If a colleague reports behaviour you cannot reproduce, this settles it in one command.

### Profiles

Profiles let one file describe optional services, so the heavy extras only start when asked for:

```yaml
services:
  api:
    build: .
  db:
    image: postgres:16
  mailhog:
    image: mailhog/mailhog
    profiles: [dev]
  loadtest:
    image: grafana/k6
    profiles: [perf]
```

```bash
docker compose up -d                       # api and db only
docker compose --profile dev up -d         # plus mailhog
docker compose --profile perf run loadtest run /scripts/load.js
```

<div class="callout tip">
  <span class="ct">Interpolation and the <code>.env</code> file</span>
  <code>${TAG:-dev}</code> reads from your shell environment or from a <code>.env</code> file next to <code>compose.yaml</code> — note that this is a different mechanism from <code>env_file:</code>, which passes variables <em>into</em> the container. Compose's own <code>.env</code> substitutes values <em>into the YAML</em>. Mixing them up is a common source of empty variables.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add health checks to both services and <code>condition: service_healthy</code> to <code>depends_on</code>. Run <code>docker compose up</code> and watch the api wait.</li>
    <li>Remove the condition and confirm the first request fails on a cold start.</li>
    <li>Write a <code>compose.override.yaml</code> with a source bind mount and <code>--reload</code>, then edit a file while it runs.</li>
    <li>Run <code>docker compose config</code> and then <code>docker compose -f compose.yaml config</code>, and diff the two.</li>
    <li>Add a service behind a <code>profiles: [dev]</code> key and confirm it only starts with <code>--profile dev</code>.</li>
  </ol>
  <em>the api visibly waiting for a healthy database, a broken cold start once you remove the gate, live reload from your editor, and two clearly different merged configurations. That diff in step four is the one that prevents "it works on my machine" from returning through the back door.</em>
</div>

## Registries, tags, and digests

Beginner said "pin a tag, never deploy `:latest`". Here is the part that matters once more than one machine is involved: **a tag is a mutable pointer.**

`myapp:1.4.2` is a label that currently points at one image. Nothing stops someone repushing it tomorrow with different contents. Two hosts pulling the same tag an hour apart can legitimately be running different code.

The only truly immutable reference is the **digest** — a content hash of the image:

```bash
docker build -t ghcr.io/my-org/myapp:1.4.2 .
docker tag ghcr.io/my-org/myapp:1.4.2 ghcr.io/my-org/myapp:latest

echo "$TOKEN" | docker login ghcr.io -u USERNAME --password-stdin
docker push ghcr.io/my-org/myapp:1.4.2
docker push ghcr.io/my-org/myapp:latest

# The digest — cannot change, by definition
docker inspect --format '{{index .RepoDigests 0}}' ghcr.io/my-org/myapp:1.4.2
docker pull ghcr.io/my-org/myapp@sha256:9b2c...
```

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Tagging that works</h4>
    <ul>
      <li><code>:sha-a1b2c3d</code> on every build — immutable and traceable to a commit</li>
      <li><code>:1.4.2</code> for releases, never repushed</li>
      <li><code>:latest</code> or <code>:stable</code> as a human convenience only</li>
      <li>Digest pinning for anything security-sensitive</li>
      <li>Retention rules so old tags are pruned</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Tagging that hurts</h4>
    <ul>
      <li>Deploying <code>:latest</code> — nobody can say what is running</li>
      <li>Repushing an existing version tag</li>
      <li><code>:dev-fix-2-final</code> accumulating forever</li>
      <li>No tag at all, so rollback means rebuilding</li>
      <li>Rebuilding per environment instead of promoting</li>
    </ul>
  </div>
</div>

Which brings us to the practice that follows from all of it:

<div class="callout tip">
  <span class="ct">Build once, promote the same artifact</span>
  Build one image, tag it with the commit SHA, and promote that exact image through staging into production. If production rebuilds, production is running something CI never tested — the compiler version moved, a transitive dependency published a patch, the base image changed. Promotion is the difference between testing your artifact and testing something that resembles it.
</div>

```bash
# One build, several names, pushed once
docker buildx build \
  -t ghcr.io/org/app:sha-${GIT_SHA} \
  -t ghcr.io/org/app:main \
  --push .

# Promote by re-tagging the same digest — no rebuild
DIGEST=$(docker buildx imagetools inspect ghcr.io/org/app:sha-${GIT_SHA} --format '{{.Manifest.Digest}}')
docker buildx imagetools create -t ghcr.io/org/app:production ghcr.io/org/app@${DIGEST}
```

Layer caching is nearly free locally and does **nothing** in CI by default, because every CI run starts on a clean machine with an empty layer store. You have to export the cache somewhere:

```yaml .github/workflows/build.yml
- uses: docker/setup-buildx-action@v3
- uses: docker/build-push-action@v6
  with:
    push: ${{ github.event_name != 'pull_request' }}
    tags: ghcr.io/${{ github.repository }}:sha-${{ github.sha }}
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

| Backend | Good for |
|---|---|
| `type=gha` | A single repository's CI on GitHub-hosted runners |
| `type=registry,ref=…:buildcache` | Many repositories, or self-hosted runners sharing layers |
| `type=local` | Self-hosted runners with persistent disk |

`mode=max` exports intermediate layers as well. With `mode=min` only the final stage is cached, which is nearly useless for a multi-stage build — the expensive builder stage misses every single time.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Push an image to GHCR under two tags, then resolve both to digests and confirm they match.</li>
    <li>Rebuild with a trivial change, repush the <em>same</em> version tag, and observe that the digest is now different — the tag moved.</li>
    <li>Pull by digest and confirm you get the original image back.</li>
    <li>If you have a CI pipeline, add <code>cache-from</code>/<code>cache-to</code> with <code>mode=max</code> and compare build times across two runs.</li>
  </ol>
  <em>two tags pointing at one digest, then a repushed tag pointing somewhere new while the digest reference still resolves to the original. That is the argument for digest-based deploys, demonstrated rather than asserted.</em>
</div>

## Debugging beyond `docker logs`

Beginner gave you an ordered checklist for a container that will not start. At this level the failures are subtler: it starts, it runs, and it behaves differently from how it behaves on your machine. That needs different tools.

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>1</span><strong>Logs and exit code</strong><small><code>docker logs --tail 100</code>, then <code>docker ps -a</code>. 137 is a kill (usually OOM), 143 a clean SIGTERM, 127 command-not-found, 126 not-executable.</small></div>
  <div class="guide-timeline-item"><span>2</span><strong>Inspect the resolved config</strong><small><code>docker inspect</code> shows the real entrypoint, command, environment, mounts, and networks after every default and override has been applied.</small></div>
  <div class="guide-timeline-item"><span>3</span><strong>Run the image without your app</strong><small><code>docker run -it --entrypoint sh myapp</code> and try the command by hand. The interactive error is almost always more informative.</small></div>
  <div class="guide-timeline-item"><span>4</span><strong>Diff the filesystem</strong><small><code>docker diff NAME</code> lists everything the container has written — often revealing a path you believed was a volume.</small></div>
  <div class="guide-timeline-item"><span>5</span><strong>Compare against the built image</strong><small><code>docker run --rm myapp ls -la /app</code> beats speculating about <code>.dockerignore</code>.</small></div>
  <div class="guide-timeline-item"><span>6</span><strong>Debug the network from inside</strong><small>A netshoot sidecar sharing the namespace, rather than installing tools into a production image.</small></div>
</div>

```bash
# What has this container actually written? A = added, C = changed, D = deleted
docker diff api

# Timeline of everything Docker did to this container
docker events --since 30m --filter container=api

# Copy a file out to look at it properly
docker cp api:/app/config.resolved.json ./

# Network debugging without polluting your image
docker run --rm -it --network container:api nicolaka/netshoot
> dig db
> curl -v http://db:5432
> ss -tlnp

# Live resource usage, and the OOM verdict
docker stats --no-stream
docker inspect api --format '{{.State.ExitCode}} {{.State.OOMKilled}} {{.State.Error}}'
```

`docker diff` is the underused one. It compares the container's filesystem against its image and tells you exactly what changed — which is how you discover that your "volume" is actually writing into the container's writable layer because a path was misspelled.

### "Works locally, not in staging"

Almost always one of five differences. Check them in this order, because they are ordered by how often they are the answer:

| Difference | How to confirm |
|---|---|
| A different image than you think | Compare **digests**, not tags: `docker inspect --format '{{index .RepoDigests 0}}'` |
| A missing environment variable | `docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}'` |
| A bind mount that only exists locally | A local `compose.override.yaml` mounting source over the image's code |
| An architecture mismatch | Apple Silicon builds `arm64`; the server wants `amd64` |
| A file excluded by `.dockerignore` | `docker run --rm myapp ls -la /app` |

<div class="callout warn">
  <span class="ct">The Apple Silicon trap</span>
  <code>docker build</code> on an M-series Mac produces an <code>arm64</code> image. Pushing that and deploying to an <code>amd64</code> server gives "exec format error", or silent QEMU emulation that is several times slower. Check the architecture before debugging anything else: <code>docker image inspect myapp --format '{{.Architecture}}'</code>. Build multi-arch, or pass <code>--platform linux/amd64</code> explicitly.
</div>

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t ghcr.io/org/app:1.4.2 --push .
docker buildx imagetools inspect ghcr.io/org/app:1.4.2      # confirm both architectures
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Write a file inside a running container, then run <code>docker diff NAME</code> and find it.</li>
    <li>Write into a mounted volume instead and confirm it does <strong>not</strong> appear in the diff — that is how you tell a volume from the writable layer.</li>
    <li>Run <code>docker events --since 30m</code> in one terminal while you start, stop, and remove a container in another.</li>
    <li>Attach netshoot to a running container's namespace and resolve a service name from inside it.</li>
    <li>Check your own image's architecture, and if you are on Apple Silicon build an <code>amd64</code> variant and compare.</li>
  </ol>
  <em><code>docker diff</code> distinguishing writable-layer writes from volume writes is the practical takeaway, and the events stream gives you a timeline you can correlate with an incident. On Apple Silicon, step five is the one that saves you a confusing afternoon later.</em>
</div>

## Putting it all together

Everything from this level in one project. Nothing here is new — read it as a whole and you should be able to justify every line.

```dockerfile Dockerfile
# syntax=docker/dockerfile:1

# ---------- build stage: toolchain lives and dies here ----------
FROM python:3.11-slim AS builder

RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential \
 && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app
COPY requirements.txt .
# Cache mount: fast warm rebuilds, and nothing added to the image
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# ---------- test stage: a red test cannot produce an image ----------
FROM builder AS test
COPY . .
RUN ruff check . && pytest -q

# ---------- runtime stage: only what is needed to serve ----------
FROM python:3.11-slim AS runtime

ARG BUILD_REV=unknown
ENV APP_REV=${BUILD_REV} \
    LOG_LEVEL=info \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

RUN useradd --create-home --uid 10001 appuser

COPY --from=builder /opt/venv /opt/venv

WORKDIR /app
COPY --chown=appuser:appuser . .

USER 10001
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health').status==200 else 1)"

# Exec form, so the process is PID 1 and SIGTERM reaches it
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml compose.yaml
services:
  api:
    build:
      context: .
      target: runtime
      args:
        BUILD_REV: ${GIT_SHA:-dev}
    image: ghcr.io/org/app:${TAG:-dev}     # same image, tag from the environment
    ports: ['8000:8000']
    env_file: [.env]
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/app
    depends_on:
      db:
        condition: service_healthy          # readiness, not merely started
    mem_limit: 512m
    cpus: 1.0
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
      retries: 5
      start_period: 30s
    restart: unless-stopped

volumes:
  pgdata:
```

```bash
docker compose up -d --build
docker compose config                 # verify the merged file is what you intended
docker compose ps                     # health status included
docker stop -t 30 $(docker compose ps -q api)   # graceful, with time to drain
```

Nine decisions in there are the whole lesson of this level:

| Decision | Section |
|---|---|
| Multi-stage with a discarded builder | Multi-stage builds |
| `--mount=type=cache` on the install | BuildKit and cache mounts |
| A `test` stage that gates the image | Multi-stage builds |
| `apt` cleanup inside the same `RUN` | Layers and the build cache |
| `ARG BUILD_REV` surfaced as `ENV` | Configuration without rebuilding |
| Health checks with `start_period` | Health checks |
| `condition: service_healthy` | Compose in depth |
| Exec-form `CMD`, non-root numeric `USER` | Signals and shutdown |
| `mem_limit` / `cpus` and an environment-driven tag | Resource limits · registries and tags |

<div class="guide-try">
  <span class="ct">Try it — the one that matters</span>
  <ol>
    <li>Rebuild a real project against this template and measure the image size before and after.</li>
    <li>Verify each control actively: break a test and confirm the build fails; stop the container and confirm exit 143 rather than 137; remove <code>start_period</code> and watch the health check misfire.</li>
    <li>Push it to a registry with a <code>sha-</code> tag, resolve the digest, and deploy by digest rather than tag.</li>
    <li>Run <code>docker history</code> and confirm nothing sensitive and nothing large is in a layer you did not intend.</li>
  </ol>
  <em>a smaller image, a build that refuses to produce an artifact from failing tests, a clean shutdown, and a deploy reference that cannot change under you. Those four properties are what separates an image that works from one a team can operate.</em>
</div>

## Where you are now

You can predict cache behaviour instead of discovering it, cut an image by an order of magnitude with staged builds and cache mounts, keep configuration and secrets out of layers, reason about networks and DNS, back up and restore volumes, run a stack that starts in dependency order and reports real health, shut down gracefully, bound resource usage, and publish images with references that mean something.

| Can you… | |
|---|---|
| State what goes into a `RUN` cache key? | The command string, not its effects |
| Explain why cleanup must share a `RUN`? | Layers are additive |
| Say what crosses a multi-stage boundary? | Only what you `COPY --from` |
| Make a warm rebuild fast after a lockfile change? | A BuildKit cache mount |
| Explain why the default bridge breaks DNS? | No embedded resolver on it |
| Back up a named volume? | Throwaway container, `tar`, bind mount |
| Close the `depends_on` readiness gap? | Health check + `condition: service_healthy` |
| Explain a ten-second `docker stop`? | Shell form, so `sh` is PID 1 |
| Say what exit 137 means? | Killed — check `OOMKilled` |
| Give the only immutable image reference? | The digest |
| Make layer caching work in CI? | Export it: `cache-to type=gha,mode=max` |
| Tell a volume write from a writable-layer write? | `docker diff` |

**Senior takes every one of these further, with a security, scale, or ownership dimension.** What isolation actually consists of — namespaces, cgroups, capabilities, seccomp — and therefore what an escape means. Hardening so a compromise is bounded: non-root, read-only root filesystem, dropped capabilities, `no-new-privileges`. Secrets that never touch a layer, via BuildKit secret mounts and SSH forwarding. Supply chain: digest-pinned bases, SBOMs, scanning that people do not learn to ignore, signing, provenance, and admission policy. Multi-architecture builds on native runners. The OOM killer, and runtimes that cannot see their own cgroup. GPU and machine-learning images, where weights do not belong in a layer. Where Docker stops and an orchestrator begins. And debugging production while it is on fire.
