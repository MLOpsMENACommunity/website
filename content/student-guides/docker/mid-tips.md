Part two of three. At this level your images build and your stacks run, so the problems change character. They are no longer "why won't this start" but "why is this image 1.2 GB", "why does CI rebuild everything", and "why does this work locally and not in staging". Start with the error table, then the practices and practice cards underneath it.

## Common errors at this level

Cumulative: Beginner's errors still apply, and these are the ones that appear once things work.

| Symptom | Real cause | Fix |
|---|---|---|
| Every CI build reinstalls dependencies | `COPY . .` before the install step | Manifest first, install, then source |
| Cache works locally, never in CI | Each CI run starts with an empty layer store | Export it: `cache-to type=gha,mode=max` |
| CI cache exists but barely helps | `mode=min` caches only the final stage | `mode=max` for a multi-stage build |
| `apt` installs a stale package version | `RUN apt-get update` cached separately | `update && install && rm -rf` in one `RUN` |
| Image is 1.2 GB | Single stage shipping the whole toolchain | Multi-stage build; check `docker history` first |
| Multi-stage image still large | Copying the whole build stage, not just the artifact | `COPY --from` only what runs |
| Alpine build is slower and bigger | musl breaks prebuilt wheels, so it compiles | Use `-slim` unless you have measured otherwise |
| Deleted a secret but it is still in the image | Layers are additive | Rebuild without it, then **rotate** the credential |
| Cache mount syntax rejected | Missing the `syntax` directive | `# syntax=docker/dockerfile:1` as line one |
| `ARG` before `FROM` is empty in a stage | Its scope ends at the first `FROM` | Re-declare the `ARG` inside the stage |
| Container cannot resolve `db` | On the default bridge, which has no DNS | Create a user-defined network |
| App connects to `localhost` and fails | Inside a container, `localhost` is that container | Use the service name; `host.docker.internal` for the host |
| App starts before the DB is ready | `depends_on` waits for start, not readiness | Health check + `condition: service_healthy`, plus retries |
| Health check fails during boot | No `--start-period` | Add a grace window longer than cold start |
| Health check passes while the app is broken | `curl` without `-f` exits 0 on a 500 | `curl -fsS … || exit 1` |
| `docker stop` takes 10s then kills | Shell-form `CMD`, so `sh` is PID 1 and eats `SIGTERM` | Exec form; `exec "$@"` in entrypoint scripts |
| Entrypoint waits forever, says nothing | Unbounded retry loop | Cap the attempts and exit non-zero with a message |
| Permission denied on a bind mount | Host/container UID mismatch | `--user "$(id -u):$(id -g)"` or a named volume |
| `node_modules` vanished in dev | Bind mount hid the image's `/app` | Anonymous volume at `/app/node_modules` |
| Restored volume backup is corrupt | Tarred a live database directory | Stop the writer, or use `pg_dump` |
| Container OOM-killed at a generous limit | Runtime read host memory, not the cgroup | Container-aware runtime, or `--max-old-space-size` |
| Service is slow with no errors | Over its `--cpus` quota, so throttled not killed | Raise the quota, or profile |
| Two hosts run different code from one tag | Deployed a mutable tag | Deploy an immutable tag or a digest |
| Staging runs code CI never tested | Image rebuilt per environment | Build once, promote the same digest |
| "exec format error" in staging | Apple Silicon `arm64` image on `amd64` | buildx multi-arch, or `--platform linux/amd64` |
| Compose picks up settings you did not write | `compose.override.yaml` applied automatically | `docker compose config` to see the merged file |
| A dev override leaked into a pipeline | CI relied on automatic override merging | Always pass `-f` explicitly in CI |
| Disk fills up on the build host | Build cache and dangling images | `docker builder prune`, `docker system df -v` |

## The practices that pay off most

<div class="cards">
  <div class="card"><div class="icon">🪜</div><h4>Multi-stage everything</h4><p>The largest single size win, and it keeps build credentials and compilers out of the shipped image.</p></div>
  <div class="card"><div class="icon">🧊</div><h4>Order for cache, not for reading</h4><p>Least-frequently-changed instruction first. The dependency install should almost never rerun.</p></div>
  <div class="card"><div class="icon">⚡</div><h4>Cache mounts for package managers</h4><p>Warm rebuilds in seconds even when the lockfile changed, and nothing added to the image.</p></div>
  <div class="card"><div class="icon">🩺</div><h4>Health check with a start period</h4><p>Turns "the container is up" into "the service is ready", which is what dependants need.</p></div>
  <div class="card"><div class="icon">📶</div><h4>Exec form + <code>exec "$@"</code></h4><p>Signals reach your app, so shutdown is graceful instead of a hard kill mid-request.</p></div>
  <div class="card"><div class="icon">🔖</div><h4>Immutable deploy tags</h4><p><code>:sha-a1b2c3d</code> or a digest. Moving tags are for humans, never for a deployment reference.</p></div>
  <div class="card"><div class="icon">🔍</div><h4><code>docker history</code> before optimising</h4><p>Find the fat layer first. Most size "optimisation" is guesswork applied to the wrong layer.</p></div>
  <div class="card"><div class="icon">🧾</div><h4><code>docker compose config</code> habitually</h4><p>It prints what runs. Half of "cannot reproduce" is an override file you forgot about.</p></div>
</div>

## Practice cards

<ol class="guide-steps">
  <li><b>Find your invalidation point</b>Build twice with no changes and confirm every step is <code>CACHED</code>. Edit one character and rebuild, noting the exact instruction where <code>CACHED</code> stops. It is usually higher up than you assumed.</li>
  <li><b>Halve an image</b>Run <code>docker history --no-trunc</code> and identify your three largest layers. Apply multi-stage, measure. Then drop to <code>-slim</code>, measure again. One change at a time.</li>
  <li><b>Prove the cache mount</b>Add a pip or npm cache mount, build, change one line of the manifest, and rebuild. Compare against the same change without the mount.</li>
  <li><b>Gate the image on tests</b>Add a <code>test</code> stage that runs your suite, break a test, and confirm no image is produced.</li>
  <li><b>Close the readiness gap</b>Add health checks and <code>condition: service_healthy</code>, then remove them and confirm the first request after a cold <code>up</code> fails.</li>
  <li><b>Time both shutdowns</b>Build with the shell form and run <code>time docker stop NAME</code>: ten seconds, exit 137. Switch to exec form and repeat: under a second, exit 143.</li>
  <li><b>Round-trip a volume</b>Back up a named volume with the tar pattern, delete it, restore into a fresh volume, and start a container against the restored copy.</li>
  <li><b>Move a tag under yourself</b>Push an image, record its digest, rebuild with a trivial change, repush the same tag, and confirm the digest changed while the digest reference still resolves to the original.</li>
  <li><b>Diff the two merged Composes</b>Run <code>docker compose config</code> and <code>docker compose -f compose.yaml config</code>, and diff them. Everything in that diff is a local-only assumption.</li>
</ol>

## Shrinking an image, in order of leverage

Measure first: `docker history myapp:1.0` shows every layer with its size and the instruction that made it.

<ol class="guide-steps">
  <li><b>Split build and runtime</b>A multi-stage build removes compilers, headers, dev dependencies, and the source tree in one change. Usually worth more than everything below combined.</li>
  <li><b>Drop to a <code>-slim</code> base</b>Hundreds of megabytes, and almost always a drop-in change.</li>
  <li><b>Clean package manager state in the same layer</b><code>--no-install-recommends</code>, then <code>rm -rf /var/lib/apt/lists/*</code> inside the same <code>RUN</code>. Cleaning in a later layer removes nothing.</li>
  <li><b>Stop shipping caches</b><code>pip --no-cache-dir</code>, <code>npm ci --omit=dev</code>, and cache mounts instead of baked-in caches.</li>
  <li><b>Write a real <code>.dockerignore</code></b>Smaller context, faster uploads, and fewer spurious cache invalidations from unrelated files.</li>
  <li><b>Only then consider distroless or Alpine</b>Smallest runtime images, at the cost of no shell to debug in and, for Alpine, musl incompatibilities.</li>
</ol>

```bash
docker history myapp:1.0 --no-trunc --format '{{.Size}}\t{{.CreatedBy}}' | head -20
docker image inspect myapp:1.0 --format '{{.Size}}'
docker run --rm myapp:1.0 du -xh --max-depth=2 / 2>/dev/null | sort -h | tail -15
```

That third command is the one people do not know: it tells you where the space went *inside* the image, which is often a dataset or a cache you forgot about rather than the base.

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
| `type=gha` | A single repository's CI on hosted runners |
| `type=registry,ref=…:buildcache` | Many repositories, or self-hosted runners sharing layers |
| `type=local` | Self-hosted runners with persistent disk |

`mode=max` exports intermediate layers too. With `mode=min` only the final stage is cached, which is nearly useless for a multi-stage build, because the expensive builder stage misses every time.

<div class="callout tip">
  <span class="ct">Build once, promote the same digest</span>
  Do not rebuild per environment. Build one image, tag it with the commit SHA, and promote that exact artifact through staging and production. If you rebuild for production you are shipping something CI never tested. The base image may have moved and a transitive dependency may have published a patch.
</div>

## Compose in practice

**`docker compose config` is the debugging tool.** It prints the fully merged, variable-interpolated file, which is what runs, and often not what you think you wrote.

```bash
docker compose config                                   # merged result
docker compose -f compose.yaml -f compose.prod.yaml config
docker compose ps                                       # health status included
docker compose logs -f --tail 100 api
docker compose exec api sh
docker compose up -d --no-deps --build api              # replace one service only
docker compose down -v                                  # -v also deletes volumes
```

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Compose that scales with the team</h4>
    <ul>
      <li>A base <code>compose.yaml</code> plus per-environment overrides</li>
      <li>Health checks with <code>condition: service_healthy</code></li>
      <li>Named volumes for all state</li>
      <li><code>restart: unless-stopped</code> and resource limits</li>
      <li>Optional services behind <code>profiles</code></li>
      <li>Variables via <code>.env</code>, never committed secrets</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Compose that becomes a liability</h4>
    <ul>
      <li>One giant file with commented-out blocks per environment</li>
      <li>Bare <code>depends_on</code> and a <code>sleep 10</code> in the entrypoint</li>
      <li>Bind mounts holding production data</li>
      <li>No limits, so one service can take the host</li>
      <li>Relying on automatic override merging in CI</li>
      <li>Passwords inline in the YAML</li>
    </ul>
  </div>
</div>

<div class="callout warn">
  <span class="ct"><code>compose.override.yaml</code> is applied automatically</span>
  If a colleague reports behaviour you cannot reproduce, check whether an override file is silently merging in. <code>docker compose config</code> settles it in one command. In CI always pass <code>-f</code> flags explicitly, so a developer's local override can never leak into a deployment.
</div>

Two more distinctions worth internalising. Compose's own `.env` file substitutes values **into the YAML**; `env_file:` passes variables **into the container**, and mixing them up produces empty variables that look like a bug. `profiles:` keeps heavy optional services out of a default `up`, which is much better than commenting them out.

## Debugging without polluting the image

The instinct is to `apt-get install curl` into the image so you can debug it. Resist. You are permanently enlarging every deployment to solve a temporary problem. Attach a sidecar to the container's network namespace instead.

```bash
# Full network toolkit, sharing the target container's network
docker run --rm -it --network container:api nicolaka/netshoot
> dig db                 # does the name resolve?
> curl -v http://db:5432 # is anything listening?
> ss -tlnp               # what is bound, and to which interface?
> traceroute db
```

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>1</span><strong>Logs, then exit code</strong><small><code>docker logs --tail 100</code>, then <code>docker ps -a</code>. 137 is a kill (usually OOM), 127 command-not-found, 126 not-executable, 143 a clean stop.</small></div>
  <div class="guide-timeline-item"><span>2</span><strong>Inspect the resolved config</strong><small><code>docker inspect</code> shows the real entrypoint, env, mounts, and networks after every default and override.</small></div>
  <div class="guide-timeline-item"><span>3</span><strong>Run the image without your app</strong><small><code>docker run -it --entrypoint sh myapp</code> and try the command by hand.</small></div>
  <div class="guide-timeline-item"><span>4</span><strong>Diff the filesystem</strong><small><code>docker diff NAME</code> lists everything the container wrote, which often reveals a path you thought was a volume.</small></div>
  <div class="guide-timeline-item"><span>5</span><strong>Compare against the built image</strong><small>Is the file even in there? <code>docker run --rm myapp ls -la /app</code> beats guessing about <code>.dockerignore</code>.</small></div>
  <div class="guide-timeline-item"><span>6</span><strong>Timeline and resources last</strong><small><code>docker events --since 30m --filter container=api</code>, then <code>docker stats</code> and <code>.State.OOMKilled</code>.</small></div>
</div>

`docker diff` is the underused one. It compares the container's filesystem against its image, which is how you discover that your "volume" is writing into the writable layer because a mount path was misspelled.

## "Works locally, not in staging"

Almost always one of five differences. Check them in this order, because that is roughly how often each is the answer.

| Difference | How to confirm |
|---|---|
| A different image than you think | Compare **digests**, not tags: `docker inspect --format '{{index .RepoDigests 0}}'` |
| A missing environment variable | `docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}'` |
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

Most real images need something to happen before the app starts: wait for a dependency, run a migration, resolve configuration. Done carelessly, the entrypoint script becomes the reason your container ignores `docker stop`.

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
| Print progress | A silent thirty-second wait is indistinguishable from a hang |
| Keep migrations opt-in | Ten replicas all migrating on boot is a race you do not want |
| `ENTRYPOINT` script + `CMD` args | `docker run img sh` still works for debugging |

<div class="callout warn">
  <span class="ct">A wait loop is not a substitute for retries</span>
  Waiting at startup only handles the boot case. A database restarts, a network blips, a failover happens, so your app must reconnect at run time too. The entrypoint wait makes the first request work; connection retry logic keeps the service alive.
</div>

## Volume operations you will need

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
docker run --rm -v pgdata:/from:ro -v pgdata-copy:/to alpine sh -c 'cp -a /from/. /to/'

# What is in there, and how big?
docker run --rm -v pgdata:/data:ro alpine du -sh /data
docker system df -v
```

<div class="callout warn">
  <span class="ct">Stop the writer first</span>
  Tarring a live Postgres data directory gives you a torn, possibly unusable copy. Either stop the container, or use the database's own tooling, <code>docker compose exec db pg_dump</code>, which is the correct answer for anything transactional. The tar pattern is right for caches, uploads, and model files.
</div>

## Registry hygiene

An unmanaged registry becomes a slow, expensive, confusing place. Four decisions fix it.

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Tags that work</h4>
    <ul>
      <li><code>:sha-a1b2c3d</code> for every build: immutable, traceable</li>
      <li><code>:1.4.2</code> for releases, never repushed</li>
      <li><code>:main</code> / <code>:latest</code> as human conveniences only</li>
      <li>Deploy by digest for anything sensitive</li>
      <li>Retention rules, so storage does not grow without bound</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Tags that hurt</h4>
    <ul>
      <li>Deploying a moving tag</li>
      <li>Repushing an existing version tag</li>
      <li><code>:dev-fix-2-final</code> accumulating forever</li>
      <li>No tag at all, so rollback means rebuilding</li>
      <li>Rebuilding per environment instead of promoting</li>
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

# Promote by re-tagging that digest — no rebuild
docker buildx imagetools create -t ghcr.io/org/app:staging ghcr.io/org/app@sha256:9b2c...
```

Set a retention policy: keep all release tags, keep the last N `sha-` tags, expire untagged manifests after a week. Without it, build cache and dangling manifests become your largest storage line item.

## Making dev and prod differences explicit

The goal is one image promoted everywhere. Where local and production must differ, put the difference in a file somebody can read, not in a developer's memory.

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
    mem_limit: 512m
    restart: unless-stopped
```

```yaml compose.override.yaml
# Local only, applied automatically
services:
  api:
    build: { context: ., target: builder }
    volumes:
      - '.:/app'
      - '/app/node_modules'
    environment:
      LOG_FORMAT: pretty
      LOG_LEVEL: debug
    command: ['uvicorn', 'app:app', '--reload', '--host', '0.0.0.0']
    ports: ['8000:8000']
```

```bash
docker compose up                                         # base + override
docker compose -f compose.yaml -f compose.prod.yaml up -d  # explicit, no override
docker compose -f compose.yaml config                      # what production really gets
```

## Habits worth adopting now

**Pin base image tags, and pin them narrowly.** `python:3.11-slim` is fine; `python:latest` means your build changes without a commit. For anything security-sensitive, pin the digest.

**One image, many environments.** Everything environment-specific arrives at run time. If you need a different image per environment, your configuration is in the wrong place.

**Give every long-running service a health check.** It is what makes `depends_on` meaningful and what every orchestrator uses to decide whether to send traffic.

**Set memory and CPU limits even locally.** A runaway container should hit a limit, not your laptop's swap.

**Add a `docker history` grep to CI.** One line that catches a secret before it is published, permanently.

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

**Senior tips go further:** the hardening pass every image should get, verifying controls rather than trusting them, keeping images fresh without unpinning them, incident playbooks for a leaked secret and a host taken down by one container, running Docker as a platform, and the cost levers that pay.

