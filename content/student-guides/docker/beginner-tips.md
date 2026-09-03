Almost every beginner problem with Docker comes from one of three things: forgetting a container is one process, forgetting the writable layer is temporary, or confusing build time with run time. Start with the error table, then the habits underneath it.

## Common errors at this level

| Symptom | Real cause | Fix |
|---|---|---|
| Container exits instantly | The main process finished | A container lives as long as PID 1. Use `-it`, or run a real server |
| `docker run ubuntu` does nothing | Same — shell with no input | `docker run -it ubuntu bash` |
| Published port refuses connections | App listens on `127.0.0.1` | Bind `0.0.0.0` inside the container |
| Port mapping seems reversed | `-p` is **host:container** | `-p 8080:80` = localhost 8080 → container 80 |
| `EXPOSE` did not expose anything | It is documentation only | Add `-p` to `docker run` |
| Build hangs forever | App start command placed in `RUN` | Start commands belong in `CMD`/`ENTRYPOINT` |
| Every build reinstalls dependencies | `COPY . .` before the install | Copy the manifest first, install, then copy source |
| Data disappeared after `docker rm` | It was in the writable layer | Use a named volume |
| `bash: not found` on exec | Slim/Alpine images have no bash | `docker exec -it name sh` |
| Changes to code not reflected | You rebuilt but ran the old tag | Rebuild **and** re-run, or use a bind mount in dev |
| `docker logs` is empty | App writes to a file, not stdout | Log to stdout/stderr |
| Disk full | Dangling images, stopped containers, unused volumes | `docker system df`, then `docker system prune` |
| Compose app cannot reach the DB | Using `localhost` instead of the service name | Connect to `db:5432` |
| App starts before the DB is ready | `depends_on` waits for start, not readiness | Health check + `condition: service_healthy`, or retry in the app |
| "Permission denied" on a bind mount | Host and container UIDs differ | Match the UID, or use a named volume |

## The habits that pay off most

<div class="cards">
  <div class="card"><div class="icon">📄</div><h4>Write <code>.dockerignore</code> first</h4><p>Before your first build. It keeps <code>.git</code>, <code>node_modules</code>, and <code>.env</code> out of the image and off the wire.</p></div>
  <div class="card"><div class="icon">🧱</div><h4>Dependencies before source</h4><p>The single biggest build-speed lever. Copy the manifest, install, then copy the code.</p></div>
  <div class="card"><div class="icon">🏷️</div><h4>Never deploy <code>:latest</code></h4><p>Tag with a version or a commit SHA so you can always answer "what is actually running?"</p></div>
  <div class="card"><div class="icon">🧹</div><h4>Use <code>--rm</code> for throwaways</h4><p>Stopped containers accumulate silently. <code>--rm</code> keeps <code>docker ps -a</code> readable.</p></div>
  <div class="card"><div class="icon">👤</div><h4>Add a non-root <code>USER</code></h4><p>Two lines. Containers default to root, and root in the container is root on the host kernel.</p></div>
  <div class="card"><div class="icon">📢</div><h4>Log to stdout</h4><p>It is what <code>docker logs</code>, log shippers, and every orchestrator expect.</p></div>
</div>

## Debugging a container that will not start

<ol class="guide-steps">
  <li><b>Read the logs</b><code>docker logs NAME</code>. Even a container that exited leaves its output behind until you remove it.</li>
  <li><b>Check the exit code</b><code>docker ps -a</code> shows it. <b>0</b> = finished normally · <b>1</b> = application error · <b>125</b> = bad <code>docker run</code> flags · <b>126</b> = command not executable · <b>127</b> = command not found · <b>137</b> = killed, usually out of memory · <b>143</b> = stopped by SIGTERM.</li>
  <li><b>Override the entrypoint to get a shell</b><code>docker run -it --entrypoint sh myapp</code> starts the image without running your app, so you can look around and try the command by hand.</li>
  <li><b>Check the file is where you think</b>Inside that shell: <code>ls -la</code>, <code>pwd</code>, <code>cat</code> the config. A wrong <code>WORKDIR</code> or a file excluded by <code>.dockerignore</code> explains a lot of "not found" errors.</li>
  <li><b>Inspect the resolved config</b><code>docker inspect NAME</code> shows the real entrypoint, command, env, mounts, and networks — after every layer of defaults and overrides.</li>
</ol>

```bash
# 127 = command not found: check the binary exists and PATH is right
docker run -it --entrypoint sh myapp
> which uvicorn
> ls -la /app

# 137 = OOM-killed: give it more memory or find the leak
docker inspect NAME --format '{{.State.OOMKilled}}'
```

## Build-time versus run-time

Half of all beginner Dockerfile bugs live here.

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Build time — baked into the image</h4>
    <ul>
      <li><code>RUN</code>, <code>COPY</code>, <code>ARG</code></li>
      <li>Happens once, during <code>docker build</code></li>
      <li>Results become layers</li>
      <li>Install dependencies here</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Run time — happens per container</h4>
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
  Both end up in the image and in <code>docker history</code>, readable by anyone who can pull it. Deleting the file in a later layer does not help — the earlier layer still contains it. Pass secrets at run time with <code>-e</code> or a mounted file.
</div>

## Making builds fast

```dockerfile Dockerfile
FROM python:3.11-slim

WORKDIR /app

# 1. Dependency manifest only — this layer is cached until it changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. Source last — edits only invalidate from here down
COPY . .

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

| Trick | Why |
|---|---|
| Manifest before source | The expensive install layer stays cached |
| `--no-cache-dir` on pip | The wheel cache is dead weight in the image |
| `npm ci` not `npm install` | Reproducible, and faster in CI |
| One `RUN` for `apt-get update && install && rm -rf /var/lib/apt/lists/*` | Separate `RUN`s cache the stale index and keep the package lists in a layer |
| A good `.dockerignore` | Less context to send, fewer accidental cache busts |

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
| `python:3.11-alpine` | ~50 MB | Size matters and you have tested it — musl libc breaks some wheels |
| `ubuntu:22.04` | ~78 MB | You need a general-purpose OS and will install everything |

<div class="callout tip">
  <span class="ct">Start with <code>-slim</code></span>
  Alpine looks attractive but uses musl instead of glibc, which breaks prebuilt Python wheels and some Node native modules — you end up compiling from source and the build gets slower and larger than slim. Reach for Alpine deliberately, not by default.
</div>

Always pin a tag. `FROM python:3.11-slim` is fine; `FROM python:latest` means your build changes under you without a single commit.

## Develop inside the container

Rebuilding the image after every code change is painful and unnecessary. Bind-mount your source and let the app reload itself.

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

The second volume line is the trick people miss. Mounting `.:/app` hides everything the image installed at `/app`, including `node_modules`. Adding an anonymous volume at `/app/node_modules` lets the image's installed dependencies show through the mount.

<div class="callout tip">
  <span class="ct">Rebuild only when dependencies change</span>
  With a bind mount, code edits need no rebuild at all. You only run <code>docker compose up --build</code> when the Dockerfile or the dependency manifest changes. If you find yourself rebuilding constantly, your source is not mounted.
</div>

## Inspect anything with `--format`

`docker inspect` returns a wall of JSON. A Go template turns it into the one answer you wanted, and these are worth keeping in your shell history.

```bash
# Why did it stop?
docker inspect api --format '{{.State.ExitCode}} {{.State.OOMKilled}} {{.State.Error}}'

# Which image is this container actually running?
docker inspect api --format '{{.Config.Image}} → {{.Image}}'

# What environment did it really get?
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

Docker behaves slightly differently depending on where you run it, and each difference has bitten a lot of people.

| Platform | Watch out for |
|---|---|
| **macOS / Windows** | Docker runs in a Linux VM, so bind-mount file I/O is much slower than native. Keep `node_modules` and build caches in volumes, not bind mounts |
| **Apple Silicon** | Builds produce `arm64` images. Deploying to an `amd64` server gives "exec format error" — build with `--platform linux/amd64` |
| **Windows / WSL2** | Keep your project inside the WSL filesystem (`~/code`), not `/mnt/c/...`. Cross-filesystem mounts are dramatically slower |
| **Linux** | `-v "$(pwd)":/app` keeps host ownership, so UID mismatches cause permission errors that Mac and Windows users never see |
| **All** | `host.docker.internal` reaches the host from a container on Desktop; on plain Linux you need `--add-host=host.docker.internal:host-gateway` |

<div class="callout warn">
  <span class="ct">"Works on my Mac, exec format error on the server"</span>
  This is the single most common cross-platform surprise. Check the architecture before you debug anything else: <code>docker image inspect myapp --format '{{.Architecture}}'</code>.
</div>

## Keeping your machine clean

```bash
docker system df                 # what is using space
docker ps -a                     # stopped containers still hold their layer
docker image prune               # dangling (untagged) images
docker system prune              # containers, networks, dangling images, cache
docker system prune -a --volumes # everything unused — read this twice first
```

<div class="callout warn">
  <span class="ct"><code>--volumes</code> deletes your data</span>
  <code>docker system prune -a --volumes</code> removes unused volumes, which includes the database of a project you stopped last week. Run <code>docker volume ls</code> first.
</div>

## Small things worth doing from day one

**Name your containers.** `--name web` beats hunting for `nostalgic_bardeen` in `docker ps`.

**Pin base image tags.** Never `:latest` in a `FROM`, and never `:latest` in a deployment.

**Use `--restart unless-stopped`** for anything you want to survive a reboot.

**Set `-m` and `--cpus` locally.** A runaway container should not freeze your laptop.

**Prefer `docker compose` even for one service.** The file documents the ports, environment, and volumes that would otherwise live in your shell history.

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

## A starter setup worth keeping

Copy this into a new project and delete what you do not need. Every line here is something from this page.

```text .dockerignore
.git
node_modules
__pycache__
*.pyc
.venv
.env
dist
build
*.log
```

```dockerfile Dockerfile
FROM python:3.11-slim                       # pinned, slim, not :latest

RUN useradd --create-home --uid 10001 appuser
WORKDIR /app

COPY requirements.txt .                     # manifest first — cached install
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

Six details in there are the whole lesson of this page: a `.dockerignore` written before the first build, the dependency manifest copied before the source, a pinned slim base, a non-root user, a named volume for anything that must survive, and a health check so the API waits for a database that is actually ready.
