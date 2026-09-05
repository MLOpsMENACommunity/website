Part one of three. Three mistakes produce most of the errors below: you forget a container is one process, you forget the writable layer is temporary, or you confuse build time with run time. Start with the table, then the habits and practice cards.

## Common errors at this level

| Symptom | Real cause | Fix |
|---|---|---|
| Container exits instantly | The main process finished | A container lives as long as PID 1. Use `-it`, or run a real server |
| `docker run ubuntu` does nothing | Same cause: a shell with no terminal | `docker run -it ubuntu bash` |
| `Cannot connect to the Docker daemon` | The daemon is not running | Start Docker Desktop, or `sudo systemctl start docker` |
| `permission denied … docker.sock` | Your user is not in the `docker` group | Add it, then log out and back in |
| Published port refuses connections | App listens on `127.0.0.1` | Bind `0.0.0.0` inside the container |
| Port mapping seems reversed | `-p` is **host:container** | `-p 8080:80` = localhost 8080 → container 80 |
| `bind: address already in use` | Another container already has that host port | `docker ps`, then remove or use another port |
| `EXPOSE` did not expose anything | It is documentation only | Add `-p` to `docker run` |
| Build hangs forever | App start command placed in `RUN` | Start commands belong in `CMD`/`ENTRYPOINT` |
| `CMD` with single quotes fails | The exec form is JSON | Use double quotes: `CMD ["sh","-c","…"]` |
| Every build reinstalls dependencies | `COPY . .` before the install | Copy the manifest first, install, then copy source |
| Build sends hundreds of MB | No `.dockerignore` | Write one before your first build |
| A file is missing inside the image | Excluded by `.dockerignore`, or wrong `WORKDIR` | `docker run --rm img ls -la /app` |
| Data disappeared after `docker rm` | It was in the writable layer | Use a named volume |
| `bash: not found` on exec | Slim and Alpine images have no bash | `docker exec -it name sh` |
| Code changes not reflected | You rebuilt but ran the old tag | Rebuild **and** re-run, or bind-mount in dev |
| `docker logs` is empty | App writes to a file, not stdout | Log to stdout and stderr |
| Python logs appear late or not at all | stdout is buffered when not a terminal | `ENV PYTHONUNBUFFERED=1` |
| Disk full | Dangling images, stopped containers, build cache | `docker system df`, then prune |
| Compose app cannot reach the DB | Using `localhost` instead of the service name | Connect to `db:5432` |
| Cannot reach a sibling by name | On the default bridge, which has no DNS | Create a network, or use Compose |
| App starts before the DB is ready | `depends_on` waits for start, not readiness | Health check + `condition: service_healthy`, or retry in the app |
| "Permission denied" on a bind mount | Host and container UIDs differ | Match the UID, or use a named volume |
| `docker exec` says no such container | It already exited | `docker run -it --entrypoint sh img` instead |
| Secret still in the image after deleting it | Layers are additive | Rebuild without it, and rotate the credential |

## The habits that pay off most

<div class="cards">
  <div class="card"><div class="icon">📄</div><h4>Write <code>.dockerignore</code> first</h4><p>Before your first build. It keeps <code>.git</code>, <code>node_modules</code>, and <code>.env</code> out of the image and off the wire.</p></div>
  <div class="card"><div class="icon">🧱</div><h4>Dependencies before source</h4><p>Copy the manifest, install, then copy the code. A one-character edit then rebuilds in seconds.</p></div>
  <div class="card"><div class="icon">🏷️</div><h4>Never deploy <code>:latest</code></h4><p>Tag with a version or a commit SHA so you can always answer "what is running?"</p></div>
  <div class="card"><div class="icon">🧹</div><h4>Use <code>--rm</code> for throwaways</h4><p>Each run without it leaves a stopped container behind. <code>--rm</code> keeps <code>docker ps -a</code> readable.</p></div>
  <div class="card"><div class="icon">👤</div><h4>Add a non-root <code>USER</code></h4><p>Two lines. Containers default to root, and root in the container is root on the host kernel.</p></div>
  <div class="card"><div class="icon">📢</div><h4>Log to stdout</h4><p>It is what <code>docker logs</code>, log shippers, and every orchestrator expect.</p></div>
  <div class="card"><div class="icon">🔍</div><h4>Run it in the foreground first</h4><p>Drop the <code>-d</code> when something is new, so the failure lands in your terminal instead of the logs.</p></div>
  <div class="card"><div class="icon">📦</div><h4>Prefer Compose, even for one service</h4><p>The file documents the ports, environment, and volumes that would otherwise live in your shell history.</p></div>
</div>

## Practice cards

Short, self-contained exercises. Each one takes a few minutes and ends in a result you can check on screen.

<ol class="guide-steps">
  <li><b>Prove a container is just a process</b>Run <code>docker run --rm -it alpine sh</code>. Inside: <code>ps aux</code>, <code>hostname</code>, <code>uname -r</code>. On your host, find that shell in <code>ps aux</code> and compare <code>uname -r</code>. Same kernel, two views.</li>
  <li><b>Kill your own data on purpose</b>Run Postgres with no volume, create a table, <code>docker rm -f</code> it, start it again. Then repeat with <code>-v pgdata:/var/lib/postgresql/data</code>. The first round loses the table, the second keeps it.</li>
  <li><b>Break the port mapping</b>Start your app bound to <code>127.0.0.1</code> with <code>-p 8000:8000</code>. Watch it refuse connections, then confirm the cause from inside with <code>ss -tlnp</code>. Fix it with <code>0.0.0.0</code>.</li>
  <li><b>Time both COPY orders</b>Build, edit one character of source, rebuild, and note the time. Move <code>COPY. .</code> above the install and repeat. Watch where <code>CACHED</code> stops in the build output.</li>
  <li><b>Find a "deleted" secret</b><code>RUN echo "SECRET=abc" &gt; /tmp/k</code> then <code>RUN rm /tmp/k</code>. Rebuild, then <code>docker history --no-trunc img | grep SECRET</code>. The string is still in the layer that wrote it.</li>
  <li><b>Cause three exit codes</b>Produce a 127 (a <code>CMD</code> binary that does not exist), a 1 (an exception on startup), and a 137 (<code>-m 16m</code>). Diagnose each using the debugging order rather than memory.</li>
  <li><b>Prove DNS needs your own network</b>Start two containers with no network flag and try <code>ping other</code>. Then create a network, restart both on it, and try again.</li>
  <li><b>Drop root and check it</b>Run <code>docker run --rm img id</code> before and after adding <code>USER 10001</code>. Then try <code>touch /etc/test</code> inside and read the refusal.</li>
</ol>

## Debugging a container that will not start

<ol class="guide-steps">
  <li><b>Read the logs</b><code>docker logs NAME</code>. Even a container that exited keeps its output until you remove it, so this works after a crash. You can read most failures straight out of that output.</li>
  <li><b>Check the exit code</b><code>docker ps -a</code> shows it. <b>0</b> = finished normally · <b>1</b> = application error · <b>125</b> = bad <code>docker run</code> flags · <b>126</b> = command not executable · <b>127</b> = command not found · <b>137</b> = killed, usually out of memory · <b>143</b> = stopped by SIGTERM.</li>
  <li><b>Override the entrypoint to get a shell</b><code>docker run -it --entrypoint sh myapp</code> starts the image without running your app, so you can look around and try the command by hand.</li>
  <li><b>Check the file is where you think</b>Inside that shell: <code>pwd</code>, <code>ls -la</code>, <code>cat</code> the config. Most "not found" errors come from a wrong <code>WORKDIR</code> or a file your <code>.dockerignore</code> excluded.</li>
  <li><b>Run the command manually</b>Type the exact <code>CMD</code> yourself. The interactive error message carries more detail than the one in the logs.</li>
  <li><b>Inspect the resolved config</b><code>docker inspect NAME</code> shows the real entrypoint, command, env, mounts, and networks, after every layer of defaults and overrides. This settles "but I set that".</li>
</ol>

```bash
# 127 = command not found: check the binary exists and PATH is right
docker run -it --entrypoint sh myapp
> which uvicorn
> ls -la /app
> echo "$PATH"

# 137 = OOM-killed: give it more memory or find the leak
docker inspect NAME --format '{{.State.ExitCode}} {{.State.OOMKilled}}'
```

<div class="callout tip">
  <span class="ct">Drop the <code>-d</code> when something is new</span>
  Run it in the foreground and the output arrives in your terminal as it happens, instead of after a detached start and a trip to the logs. Add <code>-d</code> once it works.
</div>

## Build-time versus run-time

Two things go wrong here: you put configuration in the image, or you expect a run-time flag to have changed the build.

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Build time: baked into the image</h4>
    <ul>
      <li><code>RUN</code>, <code>COPY</code>, <code>ARG</code></li>
      <li>Happens once, during <code>docker build</code></li>
      <li>Results become layers</li>
      <li>Install dependencies here</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Run time: happens per container</h4>
    <ul>
      <li><code>CMD</code>, <code>ENTRYPOINT</code>, <code>-e</code>, <code>-v</code>, <code>-p</code></li>
      <li>Happens on <code>docker run</code></li>
      <li>Nothing is saved to the image</li>
      <li>Configuration and secrets belong here</li>
    </ul>
  </div>
</div>

<div class="callout warn">
  <span class="ct">Never bake a secret in with <code>ENV</code> or <code>ARG</code></span>
  Both end up in image metadata and in <code>docker history</code>, readable by anyone who can pull. Deleting the file in a later layer does not help, because the earlier layer still contains it. Pass secrets at run time with <code>-e</code>, <code>--env-file</code>, or a mounted file.
</div>

## Making builds fast

```dockerfile Dockerfile
FROM python:3.11-slim

WORKDIR /app

# 1. Dependency manifest only: this layer is cached until it changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. Source last: edits only invalidate from here down
COPY . .

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

| Trick | Why |
|---|---|
| Manifest before source | The expensive install layer stays cached |
| `--no-cache-dir` on pip | The wheel cache is dead weight in the image |
| `npm ci` not `npm install` | Reproducible, and faster |
| One `RUN` for `apt-get update && install && rm -rf /var/lib/apt/lists/*` | Separate `RUN`s cache a stale index and ship the package lists |
| A good `.dockerignore` | Less context to send, fewer accidental cache busts |
| Watch for `CACHED` in the output | The last `CACHED` line marks where invalidation starts |

```dockerfile
# Wrong: the stale index gets cached, and the lists stay in the image
RUN apt-get update
RUN apt-get install -y curl

# Right: one layer, cleaned up in the same layer
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*
```

## Choosing a base image

| Base | Size | Use it when |
|---|---|---|
| `python:3.11` | ~1 GB | You need build tools; fine for local experiments |
| `python:3.11-slim` | ~150 MB | The sensible default for most apps |
| `python:3.11-alpine` | ~50 MB | Size matters and you have tested it: musl breaks some wheels |
| `ubuntu:22.04` | ~78 MB | You need a general-purpose OS and will install everything |

<div class="callout tip">
  <span class="ct">Start with <code>-slim</code></span>
  Alpine uses musl instead of glibc, which breaks prebuilt Python wheels and some Node native modules. You then compile from source, and the build ends up slower and larger than slim. Pick Alpine for a reason, not by default.
</div>

Always pin a tag. `FROM python:3.11-slim` is fine; `FROM python:latest` means your build changes under you without a single commit.

## Develop inside the container

You do not need to rebuild the image after every code change. Bind-mount your source and let the app reload itself.

```yaml compose.override.yaml
services:
  api:
    build: .
    volumes:
      - .:/app                    # your source, live
      - /app/node_modules         # anonymous volume shields the image's deps
    environment:
      LOG_LEVEL: debug
    command: ['npm', 'run', 'dev']
```

```bash
docker compose up          # base + override, applied automatically
```

The second volume line is the one to get right. Mounting `.:/app` hides everything the image installed at `/app`, including `node_modules`. Adding an anonymous volume at `/app/node_modules` lets the image's installed dependencies show through the mount.

<div class="callout tip">
  <span class="ct">Rebuild only when dependencies change</span>
  With a bind mount, code edits need no rebuild. Run <code>docker compose up --build</code> when the Dockerfile or the dependency manifest changes. If you are rebuilding after every edit, your source is not mounted.
</div>

## Inspect anything with `--format`

`docker inspect` returns a wall of JSON. A Go template turns it into the one answer you wanted. Keep these in your shell history.

```bash
# Why did it stop?
docker inspect api --format '{{.State.ExitCode}} {{.State.OOMKilled}} {{.State.Error}}'

# Which image is this container running?
docker inspect api --format '{{.Config.Image}} → {{.Image}}'

# What environment did it get?
docker inspect api --format '{{range .Config.Env}}{{println .}}{{end}}'

# What is mounted where?
docker inspect api --format '{{range .Mounts}}{{.Type}} {{.Source}} → {{.Destination}}{{println}}{{end}}'

# Which networks and IPs?
docker inspect api --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{$v.IPAddress}}{{println}}{{end}}'

# Health check history
docker inspect api --format '{{json .State.Health}}'
```

Useful listing variants too:

```bash
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
docker images --format 'table {{.Repository}}:{{.Tag}}\t{{.Size}}' | sort -k2 -h
```

## Platform gotchas

Docker behaves differently depending on where you run it. Check your row below before you assume the problem is in your code.

| Platform | Watch out for |
|---|---|
| **macOS / Windows** | Docker runs in a Linux VM, so bind-mount file I/O is slower than native by a wide margin. Keep `node_modules` and build caches in volumes, not bind mounts |
| **Apple Silicon** | Builds produce `arm64` images. Deploying to an `amd64` server gives "exec format error". Build with `--platform linux/amd64` |
| **Windows / WSL2** | Keep your project inside the WSL filesystem (`~/code`), not `/mnt/c/…`. Cross-filesystem mounts slow every file read |
| **Linux** | `-v "$(pwd)":/app` keeps host ownership, so UID mismatches cause permission errors that Mac and Windows users never see |
| **All** | `host.docker.internal` reaches the host from a container on Desktop; on plain Linux you need `--add-host=host.docker.internal:host-gateway` |

<div class="callout warn">
  <span class="ct">"Works on my Mac, exec format error on the server"</span>
  An `arm64` image will not start on an `amd64` host, whatever the app inside it does. Check the architecture before you debug anything else: <code>docker image inspect myapp --format '{{.Architecture}}'</code>.
</div>

## Keeping your machine clean

```bash
docker system df                 # what is using space, by category
docker system df -v              # per-image, per-container, per-volume detail
docker ps -a                     # stopped containers still hold their layer
docker container prune           # remove all stopped containers
docker image prune               # dangling (untagged) images
docker builder prune             # build cache
docker system prune              # containers, networks, dangling images, cache
docker system prune -a --volumes # everything unused: read this twice first
```

Start with `docker system df` so you know which category is large. Most of the time it is the build cache or images, not containers.

<div class="callout warn">
  <span class="ct"><code>--volumes</code> deletes your data</span>
  <code>docker system prune -a --volumes</code> removes unused volumes, which includes the database of a project you stopped last week. Run <code>docker volume ls</code> and read the list first. Nothing else in Docker destroys work you cannot recover.
</div>

## Small things to do from day one

**Name your containers.** `--name web` beats hunting for `nostalgic_bardeen` in `docker ps`.

**Pin base image tags.** Never `:latest` in a `FROM`, and never `:latest` in a deployment.

**Set `ENV PYTHONUNBUFFERED=1`** (or your language's equivalent) so `docker logs` shows output as it happens rather than in buffered bursts.

**Use `--restart unless-stopped`** for anything you want to survive a reboot.

**Set `-m` and `--cpus` locally.** A runaway container should hit a limit, not freeze your laptop.

**Add `LABEL org.opencontainers.image.source`** so anyone holding the image can find the repository that produced it.

```bash
docker run -d \
  --name myapp \
  -p 8000:8000 \
  -e LOG_LEVEL=info \
  -m 512m --cpus 1 \
  --restart unless-stopped \
  myapp:1.0
```

The equivalent, but readable and reviewable:

```yaml compose.yaml
services:
  app:
    build: .
    ports: ['8000:8000']
    environment:
      LOG_LEVEL: info
    mem_limit: 512m
    cpus: 1
    restart: unless-stopped
```

## A starter setup to copy

Copy this into a new project and delete what you do not need. Every line here comes from somewhere on this page.

```text .dockerignore
.git
.gitignore
.github
node_modules
__pycache__
*.pyc
.venv
.env
.env.*
dist
build
*.log
.pytest_cache
.DS_Store
```

```dockerfile Dockerfile
FROM python:3.11-slim                       # pinned, slim, not :latest

ENV PYTHONUNBUFFERED=1 \
    LOG_LEVEL=info                          # unbuffered logs; both overridable with -e

LABEL org.opencontainers.image.source="https://github.com/my-org/myapp"

RUN useradd --create-home --uid 10001 appuser
WORKDIR /app

COPY requirements.txt .                     # manifest first: cached install
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=appuser:appuser . .            # source last

USER 10001                                  # non-root
EXPOSE 8000                                 # documentation only
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml compose.yaml
services:
  api:
    build: .
    ports: ['8000:8000']
    env_file: [.env]
    depends_on:
      db: { condition: service_healthy }    # readiness, not just started
    mem_limit: 512m
    restart: unless-stopped

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: app
    volumes: ['pgdata:/var/lib/postgresql/data']   # named volume for state
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
docker compose logs -f api
docker compose exec api sh
docker compose down            # add -v only if you mean to delete the database
```

Eight details in that setup carry the lesson of this page: a `.dockerignore` written before the first build, unbuffered logging, the dependency manifest copied before the source, a pinned slim base, a non-root numeric user, an exec-form `CMD` binding `0.0.0.0`, a named volume for anything that must survive, and a health check so the API waits for a database that accepts connections.

**Mid-level tips take each of these further:** cache keys and why CI never hits the cache, shrinking an image in order of leverage, Compose override traps, entrypoint scripts that behave, volume backup, registry hygiene, and diagnosing "works locally, not in staging".

