At this level your images build and your stacks run, so the problems change character. They are no longer "why won't this start" but "why is this image 1.2 GB", "why does CI rebuild everything", and "why does this work locally and not in staging". Start with the error table, then the practices underneath it.

## Common errors at this level

| Symptom | Real cause | Fix |
|---|---|---|
| Every CI build reinstalls dependencies | `COPY . .` before the install step | Manifest first, install, then source |
| Cache works locally, never in CI | Each CI run starts with an empty layer store | Use a registry or build cache backend |
| Image is 1.2 GB | Single stage shipping the whole toolchain | Multi-stage build; check `docker history` |
| Deleted a secret but it is still in the image | Layers are additive | Rebuild without it, then rotate the credential |
| `apt` installs a stale package version | `RUN apt-get update` cached separately | `update && install && rm -rf` in one `RUN` |
| Alpine build is slower and bigger | musl breaks prebuilt wheels, so it compiles | Use `-slim` unless you have measured otherwise |
| Container cannot resolve `db` | On the default bridge, which has no DNS | Create a user-defined network |
| App connects to `localhost` and fails | Inside a container, `localhost` is that container | Use the service name; `host.docker.internal` for the host |
| App starts before the DB is ready | `depends_on` waits for start, not readiness | Health check + `condition: service_healthy`, plus retries |
| Health check fails during boot | No `--start-period` | Add a grace window longer than cold start |
| `docker stop` takes 10s then kills | Shell-form `CMD`, so `sh` is PID 1 and eats `SIGTERM` | Exec form; `exec "$@"` in entrypoint scripts |
| Permission denied on a bind mount | Host/container UID mismatch | `--user "$(id -u):$(id -g)"` or a named volume |
| Two hosts run different code from one tag | Deployed a mutable tag | Deploy an immutable tag or a digest |
| Disk fills up on the build host | Build cache and dangling images | `docker builder prune`, `docker system df` |
| Compose picks up settings you did not write | `compose.override.yaml` applied automatically | `docker compose config` to see the merged file |

## The practices that pay off most

<div class="cards">
  <div class="card"><div class="icon">🪜</div><h4>Multi-stage everything</h4><p>The largest single size win, and it keeps build credentials and compilers out of the shipped image.</p></div>
  <div class="card"><div class="icon">🧊</div><h4>Order for cache, not for reading</h4><p>Least-frequently-changed instruction first. The dependency install should almost never rerun.</p></div>
  <div class="card"><div class="icon">🩺</div><h4>Health check with a start period</h4><p>Turns "the container is up" into "the service is ready", which is what dependants actually need.</p></div>
  <div class="card"><div class="icon">🔖</div><h4>Immutable deploy tags</h4><p><code>:sha-a1b2c3d</code> or a digest. Moving tags are for humans, never for a deployment reference.</p></div>
  <div class="card"><div class="icon">📶</div><h4>Exec form + <code>exec "$@"</code></h4><p>Signals reach your app, so shutdown is graceful instead of a hard kill mid-request.</p></div>
  <div class="card"><div class="icon">🔍</div><h4><code>docker history</code> before optimising</h4><p>Find the fat layer first. Most size "optimisation" is guesswork applied to the wrong layer.</p></div>
</div>

## Shrinking an image, in order of leverage

Measure first — `docker history myapp:1.0` shows every layer with its size and the instruction that made it.

<ol class="guide-steps">
  <li><b>Split build and runtime</b>A multi-stage build removes compilers, headers, dev dependencies, and the source tree in one change. Usually worth more than everything below combined.</li>
  <li><b>Drop to a <code>-slim</code> base</b>Hundreds of megabytes, and almost always a drop-in change.</li>
  <li><b>Clean package manager state in the same layer</b><code>--no-install-recommends</code>, then <code>rm -rf /var/lib/apt/lists/*</code> inside the same <code>RUN</code>. Cleaning in a later layer removes nothing.</li>
  <li><b>Stop shipping caches</b><code>pip --no-cache-dir</code>, <code>npm ci --omit=dev</code>, <code>go build</code> into a scratch stage.</li>
  <li><b>Write a real <code>.dockerignore</code></b>Smaller context, faster uploads, and fewer spurious cache invalidations from unrelated files.</li>
  <li><b>Only then consider distroless or Alpine</b>Smallest runtime images, at the cost of no shell to debug in and, for Alpine, musl incompatibilities.</li>
</ol>

```bash
docker history myapp:1.0 --no-trunc --format '{{.Size}}\t{{.CreatedBy}}' | head -20
docker image inspect myapp:1.0 --format '{{.Size}}'
```

## Making the cache work in CI

Layer caching is nearly free locally and does nothing in CI by default, because every run starts on a clean machine with an empty layer store. You have to export it somewhere.

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
| `type=gha` | A single repository's CI |
| `type=registry,ref=...:buildcache` | Many repositories or self-hosted runners sharing layers |
| `type=local` | Self-hosted runners with persistent disk |

`mode=max` exports intermediate layers too. With `mode=min` only the final stage is cached, which is nearly useless for a multi-stage build — the expensive builder stage misses every time.

<div class="callout tip">
  <span class="ct">Build once, promote the same digest</span>
  Do not rebuild per environment. Build one image, tag it with the commit SHA, and promote that exact artifact through staging and production. If you rebuild for production you are shipping something CI never tested.
</div>

## Compose in practice

**`docker compose config` is the debugging tool.** It prints the fully merged, variable-interpolated file — which is what actually runs, and often not what you think you wrote.

```bash
docker compose config                                   # merged result
docker compose -f compose.yaml -f compose.prod.yaml config
docker compose ps                                       # health status included
docker compose logs -f --tail 100 api
docker compose exec api sh
docker compose down -v                                  # -v also deletes volumes
```

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Compose that scales with the team</h4>
    <ul>
      <li>A base <code>compose.yaml</code> plus per-environment overrides</li>
      <li>Health checks with <code>condition: service_healthy</code></li>
      <li>Named volumes for all state</li>
      <li><code>restart: unless-stopped</code></li>
      <li>Variables via <code>.env</code>, never committed secrets</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Compose that becomes a liability</h4>
    <ul>
      <li>One giant file with commented-out blocks per environment</li>
      <li>Bare <code>depends_on</code> and a <code>sleep 10</code> in the entrypoint</li>
      <li>Bind mounts holding production data</li>
      <li>Passwords inline in the YAML</li>
      <li>Using Compose as a multi-host orchestrator</li>
    </ul>
  </div>
</div>

<div class="callout warn">
  <span class="ct"><code>compose.override.yaml</code> is applied automatically</span>
  If a colleague reports behaviour you cannot reproduce, check whether an override file is silently merging in. <code>docker compose config</code> settles it in one command.
</div>

## Debugging without polluting the image

The instinct is to `apt-get install curl` into the image so you can debug it. Resist — you are permanently enlarging every deployment to solve a temporary problem. Attach a sidecar to the container's network namespace instead.

```bash
# Full network toolkit, sharing the target container's network
docker run --rm -it --network container:api nicolaka/netshoot
> dig db                 # does the name resolve?
> curl -v http://db:5432 # is anything listening?
> ss -tlnp               # what is bound, and to which interface?
> traceroute db
```

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>1</span><strong>Logs, then exit code</strong><small><code>docker logs</code>, then <code>docker ps -a</code>. 137 is OOM, 127 is command-not-found, 126 is not-executable.</small></div>
  <div class="guide-timeline-item"><span>2</span><strong>Inspect the resolved config</strong><small><code>docker inspect</code> shows the real entrypoint, env, mounts, and networks after every default and override.</small></div>
  <div class="guide-timeline-item"><span>3</span><strong>Run the image without your app</strong><small><code>docker run -it --entrypoint sh myapp</code> and try the command by hand.</small></div>
  <div class="guide-timeline-item"><span>4</span><strong>Diff the filesystem</strong><small><code>docker diff NAME</code> lists everything the container wrote — often reveals a path you thought was a volume.</small></div>
  <div class="guide-timeline-item"><span>5</span><strong>Compare against the built image</strong><small>Is the file even in there? <code>docker run --rm myapp ls -la /app</code> beats guessing about <code>.dockerignore</code>.</small></div>
  <div class="guide-timeline-item"><span>6</span><strong>Check resources last</strong><small><code>docker stats</code>, and <code>.State.OOMKilled</code> for the 137 case.</small></div>
</div>

## "Works locally, not in staging"

Almost always one of five differences. Check them in this order.

| Difference | How to confirm |
|---|---|
| Different image than you think | Compare digests, not tags: `docker inspect --format '{{index .RepoDigests 0}}'` |
| Missing environment variable | `docker inspect` the running container's `Config.Env` |
| A bind mount that only exists locally | Local `compose.override.yaml` mounting source over the image's code |
| Architecture mismatch | Apple Silicon builds `arm64`; the server wants `amd64` |
| A file excluded by `.dockerignore` | `docker run --rm myapp ls -la /app` |

<div class="callout warn">
  <span class="ct">The Apple Silicon trap</span>
  <code>docker build</code> on an M-series Mac produces an <code>arm64</code> image. Pushing that and deploying to an <code>amd64</code> server gives "exec format error", or silent emulation that is several times slower. Build multi-arch, or set <code>--platform linux/amd64</code> explicitly.
</div>

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t ghcr.io/org/app:1.4.2 --push .
docker buildx imagetools inspect ghcr.io/org/app:1.4.2     # confirm both arches
```

## Entrypoint scripts that behave

Most real images need something to happen before the app starts — wait for a dependency, run a migration, resolve configuration. Done carelessly, the entrypoint script becomes the reason your container ignores `docker stop`.

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
| Bound the wait loop | An infinite retry turns a config error into a container that never reports why |
| Keep migrations opt-in | Ten replicas all migrating on boot is a race you do not want |
| `ENTRYPOINT` script + `CMD` args | `docker run img sh` still works for debugging |

<div class="callout warn">
  <span class="ct">A wait loop is not a substitute for retries</span>
  Waiting at startup only handles the boot case. A database restarts, a network blips, a failover happens — your app must reconnect at run time too. The entrypoint wait makes the first request work; connection retry logic keeps the service alive.
</div>

## Volume operations you will actually need

Backing up and moving named volumes comes up far more often than people expect, and the pattern is always the same: a throwaway container with the volume and a bind mount.

```bash
# Back up a named volume to a tarball on the host
docker run --rm \
  -v pgdata:/data:ro \
  -v "$(pwd)":/backup \
  alpine tar czf /backup/pgdata-$(date +%F).tar.gz -C /data .

# Restore into a fresh volume
docker volume create pgdata-restored
docker run --rm \
  -v pgdata-restored:/data \
  -v "$(pwd)":/backup \
  alpine tar xzf /backup/pgdata-2024-05-01.tar.gz -C /data

# Copy one volume to another
docker run --rm -v pgdata:/from:ro -v pgdata-copy:/to alpine \
  sh -c 'cp -a /from/. /to/'

# What is in there, and how big?
docker run --rm -v pgdata:/data:ro alpine du -sh /data
docker system df -v | grep -A20 'Local Volumes'
```

<div class="callout warn">
  <span class="ct">Stop the writer first</span>
  Tarring a live Postgres data directory gives you a torn, possibly unusable copy. Either stop the container, or use the database's own tooling — <code>docker compose exec db pg_dump</code> — which is the correct answer for anything transactional.
</div>

## Registry hygiene

An unmanaged registry becomes a slow, expensive, confusing place. Four decisions fix it.

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Tags that work</h4>
    <ul>
      <li><code>:sha-a1b2c3d</code> for every build — immutable, traceable</li>
      <li><code>:1.4.2</code> for releases, never repushed</li>
      <li><code>:main</code> / <code>:latest</code> as human conveniences only</li>
      <li>Deploy by digest for anything sensitive</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Tags that hurt</h4>
    <ul>
      <li>Deploying a moving tag</li>
      <li>Repushing an existing version tag</li>
      <li><code>:dev-fix-2-final</code> accumulating forever</li>
      <li>No retention rules, so storage grows without bound</li>
    </ul>
  </div>
</div>

```bash
# Tag one build several ways, push once
docker buildx build \
  -t ghcr.io/org/app:sha-${GIT_SHA} \
  -t ghcr.io/org/app:main \
  --push .

# Resolve a tag to the digest you will actually deploy
docker buildx imagetools inspect ghcr.io/org/app:sha-${GIT_SHA} \
  --format '{{.Manifest.Digest}}'
```

Set a retention policy on the registry — keep all release tags, keep the last N `sha-` tags, expire untagged manifests after a week. Without it, build cache and dangling manifests quietly become your largest storage line item.

## Making dev and prod differences explicit

The goal is one image promoted everywhere. Where local and production genuinely must differ, put the difference in a file somebody can read, not in a developer's memory.

```yaml compose.yaml
# Base: what is true everywhere
services:
  api:
    image: ghcr.io/org/app:${TAG:-dev}
    environment:
      LOG_FORMAT: json
    healthcheck:
      test: ['CMD-SHELL', 'curl -fsS http://localhost:8000/health || exit 1']
      interval: 30s
      start_period: 40s
    restart: unless-stopped
```

```yaml compose.override.yaml
# Local only, applied automatically
services:
  api:
    build: { context: ., target: builder }
    volumes: ['.:/app']
    environment:
      LOG_FORMAT: pretty
      LOG_LEVEL: debug
    command: ['uvicorn', 'app:app', '--reload', '--host', '0.0.0.0']
    ports: ['8000:8000']
```

```bash
docker compose up                                        # base + override
docker compose -f compose.yaml -f compose.prod.yaml up -d # explicit, no override
docker compose -f compose.yaml config                    # what production really gets
```

<div class="callout tip">
  <span class="ct">Name the override explicitly in CI</span>
  <code>compose.override.yaml</code> is picked up automatically, which is convenient locally and dangerous in a pipeline. In CI always pass <code>-f</code> flags explicitly so a developer's local override can never leak into a deployment.
</div>

## Habits worth adopting now

**Pin base image tags, and pin them narrowly.** `python:3.11-slim` is fine; `python:latest` means your build changes without a commit. For anything security-sensitive, pin the digest.

**One image, many environments.** Everything environment-specific arrives at run time. If you need a different image per environment, your configuration is in the wrong place.

**Give every long-running service a health check.** It is what makes `depends_on` meaningful and what every orchestrator uses to decide whether to send traffic.

**Set memory and CPU limits even locally.** A runaway container should hit a limit, not your laptop's swap.

**Treat `docker compose down -v` with suspicion.** The `-v` deletes named volumes, which is your local database.

```yaml compose.yaml
services:
  api:
    build: { context: ., target: runtime }
    image: ghcr.io/org/app:${TAG:-dev}      # same image, tag from the environment
    ports: ['8000:8000']
    env_file: [.env]
    healthcheck:
      test: ['CMD-SHELL', 'curl -fsS http://localhost:8000/health || exit 1']
      interval: 30s
      timeout: 3s
      start_period: 40s
      retries: 3
    deploy:
      resources:
        limits: { memory: 512M, cpus: '1.0' }
    restart: unless-stopped
```
