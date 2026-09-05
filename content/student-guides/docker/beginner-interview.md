Part one of three. A twenty-five-minute review of the **Beginner Detailed track**, then the questions interviewers ask. Mid-level reviews this plus its own material; Senior reviews all three.

## The thirty-second answer

> Docker packages an application with its runtime, libraries, and system dependencies into an immutable image. A container is a running instance of that image: a process on the host, isolated by kernel namespaces and cgroups rather than a hypervisor. Because the image carries its own environment, the artifact that passed CI is the artifact that runs in production.

Then the line that shows you have used it: *"a container lives as long as its main process, and anything not in a volume disappears when the container is removed."*

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

| Term | Say this |
|---|---|
| **Image** | A read-only stack of filesystem layers plus metadata |
| **Layer** | The filesystem diff produced by one Dockerfile instruction |
| **Container** | A running instance: the image's layers plus a thin writable layer |
| **Volume** | Docker-managed storage that outlives the container |
| **Bind mount** | A host directory mounted into a container |
| **Registry** | Where images are stored and shared: Docker Hub, GHCR, ECR |
| **Tag** | A mutable human label on an image, `myapp:1.2.0` |
| **Build context** | The directory sent to the daemon at build time |
| **Dockerfile** | The recipe that produces an image |
| **Daemon** | The background service that does the work; the CLI only talks to it |

## Container versus VM

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Container</h4>
    <ul>
      <li>Shares the host kernel</li>
      <li>Milliseconds to start, tens of MB</li>
      <li>Isolated by namespaces and cgroups</li>
      <li>A process with a restricted view</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Virtual machine</h4>
    <ul>
      <li>Ships its own guest kernel and OS</li>
      <li>Tens of seconds, gigabytes</li>
      <li>Isolated by a hypervisor (stronger)</li>
      <li>A simulated computer</li>
    </ul>
  </div>
</div>

The follow-up: *"so is a container less secure?"* Yes. Shared-kernel isolation is weaker than a hypervisor, and a kernel vulnerability is an escape path. Drop privileges, and keep untrusted code out of a plain container.

One more fact: containers are a Linux kernel feature, so Docker Desktop runs a small Linux VM on macOS and Windows. Bind-mount file I/O is slower there.

## Image versus container

| | Image | Container |
|---|---|---|
| Is | Read-only template of stacked layers | A running instance |
| Analogy | A class · an installer | An object · the running program |
| Mutability | Immutable | Thin writable layer, lost on `rm` |
| Count | One | Many from the same image |
| Built by | `docker build` | `docker run` |

Three containers from one image share its read-only layers on disk, and anything you write outside a volume dies with `docker rm`.

## The commands to have ready

```bash
docker run -d -p 8080:80 --name web nginx   # detached, port-mapped, named
docker ps -a                                 # all containers; exit codes live here
docker logs -f --tail 50 web                 # follow output
docker exec -it web sh                       # shell inside a RUNNING container
docker run -it --entrypoint sh myapp         # shell in an image that crashes on start
docker build -t myapp:1.0 .                  # build; "." is the build context
docker inspect web                           # resolved config after all overrides
docker stats                                 # live CPU / memory
docker system df                             # disk usage by category
docker system prune                          # reclaim space
```

| Flag | Means |
|---|---|
| `-d` | Detached (background) |
| `-p host:container` | Publish a port: **host first** |
| `-it` | Interactive + TTY |
| `--rm` | Auto-remove on exit |
| `-e KEY=value` / `--env-file` | Environment |
| `-v name:/path` | Volume or bind mount |
| `--entrypoint sh` | Override the entrypoint: the debugging escape hatch |
| `--restart unless-stopped` | Survive crashes and reboots |

## Lifecycle and exit codes

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>running</span><strong><code>docker run</code></strong><small>PID 1 is alive. <code>docker ps</code> shows it.</small></div>
  <div class="guide-timeline-item"><span>exited</span><strong>process ended, or <code>docker stop</code></strong><small>SIGTERM, then SIGKILL after ten seconds. Filesystem and logs survive.</small></div>
  <div class="guide-timeline-item"><span>gone</span><strong><code>docker rm</code></strong><small>Writable layer deleted. Anything not in a volume is lost.</small></div>
</div>

**A container lives as long as its main process.** That is why `docker run ubuntu` exits at once: its default command is a shell, and a shell with no terminal has nothing to read.

| Exit code | Means |
|---|---|
| 0 | Finished normally |
| 1 | Application error |
| 125 | Bad `docker run` flags |
| 126 | Command found but not executable |
| 127 | Command not found, often the wrong image |
| 137 | Killed (SIGKILL), usually the memory limit |
| 143 | Stopped by SIGTERM: a clean shutdown |

## Dockerfile instructions

```dockerfile Dockerfile
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1
RUN useradd --create-home --uid 10001 appuser
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY --chown=appuser:appuser . .
USER 10001
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

| Instruction | Runs at | Note |
|---|---|---|
| `FROM` | n/a | Always first; pin the tag, never `:latest` |
| `RUN` | **Build** | Result is saved as a layer |
| `CMD` | **Run** | Default command; replaced by `docker run img args` |
| `ENTRYPOINT` | Run | Fixed executable; `CMD` supplies its arguments |
| `COPY` | Build | From the build context into the image |
| `ADD` | Build | Like `COPY` but unpacks archives; prefer `COPY` |
| `WORKDIR` | Build + run | Directory for everything after it |
| `ENV` | Build + run | Persists into the container |
| `ARG` | Build only | Visible in `docker history` |
| `EXPOSE` | n/a | **Documentation only.** `-p` publishes |
| `USER` | Run | Drops from root |

Three exam favourites: **`RUN` is build time, `CMD` is run time**, **`EXPOSE` publishes nothing**, and **`ENV PYTHONUNBUFFERED=1`** is why `docker logs` shows Python output without a buffer delay.

## Layer caching and COPY order

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Dependencies first</h4>
    <ul>
      <li><code>COPY requirements.txt .</code> then <code>RUN pip install</code></li>
      <li><code>COPY. .</code> last</li>
      <li>Source edits reuse the cached install</li>
      <li>Rebuild: seconds</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Everything first</h4>
    <ul>
      <li><code>COPY. .</code> then <code>RUN pip install</code></li>
      <li>Any source change busts the install layer</li>
      <li>Every build reinstalls from scratch</li>
      <li>Rebuild: minutes</li>
    </ul>
  </div>
</div>

Docker reuses a layer when its inputs are unchanged, and **once a layer is invalidated every layer after it is rebuilt too**. Two corollaries to state unprompted:

**Layers are additive, so deleting does not shrink or hide.** `COPY .env .` then `RUN rm .env` leaves the file in the earlier layer, readable by anyone who can pull the image.

**Clean up inside the same `RUN`.** Splitting `apt-get update` and `install` into separate instructions caches a stale package index and ships the package lists.

```dockerfile
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*
```

## Build context and `.dockerignore`

The trailing `.` in `docker build -t myapp .` names the **build context**: the CLI uploads that whole directory to the daemon before the build starts. Without a `.dockerignore` you ship `.git`, `node_modules`, your virtualenv, and possibly `.env`: slow builds and leaked secrets.

```text .dockerignore
.git
node_modules
__pycache__
*.pyc
.venv
.env
.env.*
dist
build
*.log
```

`docker run --rm myapp ls -la /app` settles "is my file missing?" and "did I ship `.env`?" in one command.

## Ports

<div class="flow">
  <div class="node">HOST<small>localhost:8080</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">-p 8080:80<small>host: container</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">CONTAINER<small>listening on 80</small></div>
</div>

The mapping is **host first**, and inside a container your app must bind **`0.0.0.0`**, not `127.0.0.1`, or the published port looks dead. Loopback there means "reachable only from inside this container".

## Configuration and secrets

| Mechanism | Available at | In the image | Use for |
|---|---|---|---|
| `ENV` | Build + run | **Yes** | Non-secret defaults |
| `ARG` | Build only | **Yes** (`docker history`) | Base versions, build flags |
| `-e` / `--env-file` | Run only | No | Per-environment configuration |
| Mounted file | Run only | No | Credentials |

Precedence, most specific wins: `-e` beats `--env-file` beats `ENV`. **Neither `ARG` nor `ENV` is a secret.** Both are image metadata, readable by anyone who can pull. At this level: secrets arrive at run time.

## Volumes

```bash
docker run -v pgdata:/var/lib/postgresql/data postgres:16   # named volume
docker run -v "$(pwd)":/app myapp:dev                        # bind mount
docker run -v ./conf.yaml:/etc/app/conf.yaml:ro myapp        # read-only config
```

| | Named volume | Bind mount |
|---|---|---|
| Managed by | Docker | You |
| Location | Docker's storage area | A path on the host |
| Portable | Yes | No, it depends on a host path |
| Permissions | Docker initialises them | Keeps the host's ownership |
| Use for | Databases, app state | Live-reload development |

Data you write outside a volume lands in the container's writable layer and dies with `docker rm`.

## Networking and Compose

Containers on a **user-defined** network reach each other by container or service name. The **default** bridge has no name resolution. That difference answers most "container cannot reach container" questions.

```bash
docker network create appnet
docker run -d --name db --network appnet postgres:16
docker run -d --name api --network appnet -p 8000:8000 myapp   # connects to db:5432
```

```yaml compose.yaml
services:
  api:
    build: .
    ports: ['8000:8000']
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/app
    depends_on: [db]
    restart: unless-stopped
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret
    volumes: ['pgdata:/var/lib/postgresql/data']
volumes:
  pgdata:
```

```bash
docker compose up -d
docker compose logs -f api
docker compose down          # add -v to delete volumes too
```

Compose creates a network and puts every service on it, addressable by service name. That is why the connection string says `db`.

<div class="callout warn">
  <span class="ct">Know the limit of <code>depends_on</code></span>
  It waits for the container to <b>start</b>, not for the service inside to be <b>ready</b>. A database that accepts connections thirty seconds later still breaks your app's first query. The fix: a health check plus <code>depends_on: { db: { condition: service_healthy } }</code>, and retry logic in the app regardless.
</div>

## Non-root, in two lines

```dockerfile
RUN useradd --create-home --uid 10001 appuser
COPY --chown=appuser:appuser . .
USER 10001
```

`USER` comes **after** the installs, because installing to system paths needs the privilege you are about to drop. Use a numeric uid. Say the reason out loud: **root in a container is root on the host kernel**, with no hypervisor between them.

## Debugging order

<ol class="guide-steps">
  <li><b>Logs</b><code>docker logs NAME</code>. An exited container keeps its output until you remove it.</li>
  <li><b>Exit code</b><code>docker ps -a</code>. 137 is a kill (usually OOM), 127 command-not-found, 126 not-executable, and 143 a clean SIGTERM.</li>
  <li><b>Shell without the app</b><code>docker run -it --entrypoint sh myapp</code>, then run the command by hand.</li>
  <li><b>Is the file there?</b><code>pwd</code>, <code>ls -la</code> inside. A wrong <code>WORKDIR</code> or a <code>.dockerignore</code> exclusion explains most "not found" errors.</li>
  <li><b>Resolved config</b><code>docker inspect NAME</code> for the real entrypoint, env, mounts, and networks after every override.</li>
</ol>

## The traps, and why they share one cause

Three ideas explain most beginner failures: a container is **one process**, the writable layer is **temporary**, and build time is **not** run time.

| Symptom | Cause | Fix |
|---|---|---|
| Container exits instantly | The main process finished | `-it`, or run a real server |
| Published port refuses connections | App listening on `127.0.0.1` | Bind `0.0.0.0` |
| `EXPOSE` exposed nothing | It is documentation | Add `-p` |
| Build hangs forever | Start command in a `RUN` | It belongs in `CMD` |
| Every build reinstalls dependencies | `COPY . .` before the install | Manifest first |
| Data gone after `docker rm` | It was in the writable layer | A named volume |
| `bash: not found` | Slim/Alpine images have no bash | Use `sh` |
| `docker logs` is empty | App writes to a file | Log to stdout |
| Compose app cannot reach the DB | Used `localhost` | Use the service name |
| Deleted secret still in the image | Layers are additive | Rebuild without it, and rotate |

## Common interview questions

<ol class="guide-steps">
  <li><b>What is Docker, and why use it?</b>It packages an app with its dependencies into an immutable image, so the artifact that passed CI is the artifact that runs in production. It removes environment drift, makes onboarding one command, and gives you fast, disposable, isolated environments.</li>
  <li><b>Container versus virtual machine, and is a container less secure?</b>A container shares the host kernel and is a process with a restricted view: milliseconds to start, tens of megabytes. A VM ships a full guest OS behind a hypervisor: slower, larger, stronger isolation. Yes, weaker: a kernel vulnerability is an escape path, so run non-root and keep untrusted code out of a plain container.</li>
  <li><b>Image versus container?</b>An image is a read-only template of stacked layers; a container is a running instance with a thin writable layer on top. One image, many containers.</li>
  <li><b>Why does <code>docker run ubuntu</code> exit immediately?</b>A container lives as long as its main process. The default command is a shell with no terminal attached, so it finishes at once. <code>-it</code> gives it a terminal to wait on.</li>
  <li><b><code>RUN</code> versus <code>CMD</code>?</b><code>RUN</code> executes at build time and its result becomes a layer. <code>CMD</code> is the default command when a container starts. Putting the app's start command in <code>RUN</code> makes the build hang forever.</li>
  <li><b><code>CMD</code> versus <code>ENTRYPOINT</code>?</b><code>ENTRYPOINT</code> is the fixed executable; <code>CMD</code> supplies default arguments. Arguments after <code>docker run image</code> replace <code>CMD</code> but are appended to <code>ENTRYPOINT</code>. Use <code>ENTRYPOINT</code> when the container should always run one program, and always use the exec form, so your process is PID 1 and receives <code>SIGTERM</code>.</li>
  <li><b>Does <code>EXPOSE</code> publish a port?</b>No. It is documentation for humans and tooling. <code>-p host:container</code> is what publishes.</li>
  <li><b>My port mapping does not work. Why?</b>Usually the app inside listens on <code>127.0.0.1</code>, reachable only inside the container, so bind <code>0.0.0.0</code>. Otherwise the <code>-p</code> order is reversed, or the app uses a different port than the one you mapped.</li>
  <li><b>How do you persist data?</b>A named volume. Anything you write to the container's writable layer is deleted with the container.</li>
  <li><b>Named volume versus bind mount?</b>A named volume is Docker-managed, portable, and gets correct ownership: right for databases. A bind mount maps a host directory, depends on that path, and keeps host permissions: right for development live-reload, wrong for production data.</li>
  <li><b>How do two containers talk to each other?</b>Put them on the same user-defined network and address each other by container or service name. The default bridge has no DNS, so this fails if you skip creating a network. Compose creates one for you, hence <code>db:5432</code> in the connection string.</li>
  <li><b>Why is my rebuild so slow?</b>COPY order, most of the time. Copy the dependency manifest and install first, then copy the source, so source edits reuse the cached install layer. Once a layer is invalidated, everything after it rebuilds.</li>
  <li><b>I deleted a secret in a later layer. Is it safe?</b>No. Layers are additive, so the file is still in the earlier layer and readable by anyone who can pull the image. Rebuild without it and rotate the credential.</li>
  <li><b>What is the build context, and why does it matter?</b>The directory you pass to <code>docker build</code>, uploaded in full to the daemon. Without a <code>.dockerignore</code> you ship <code>.git</code>, <code>node_modules</code>, and possibly <code>.env</code>: a speed problem and a secret-leak path.</li>
  <li><b>How do you pass configuration?</b>At run time with <code>-e</code> or <code>--env-file</code>, so you promote one image across environments. Never secrets via <code>ARG</code> or <code>ENV</code>, because both land in image metadata and <code>docker history</code>.</li>
  <li><b>How do you debug a container that will not start?</b><code>docker logs</code> first, then the exit code from <code>docker ps -a</code>, then <code>docker run -it --entrypoint sh</code> to get inside without running the app, then <code>docker inspect</code> for the resolved configuration.</li>
  <li><b>What does exit code 137 mean?</b>The kernel SIGKILLed the process, in most cases at the memory limit. Confirm with <code>docker inspect --format '{{.State.OOMKilled}}'</code>.</li>
  <li><b>Where should an app write its logs?</b>stdout and stderr. That is what <code>docker logs</code>, log shippers, and orchestrators read. A file inside the container hides them and fills the writable layer.</li>
  <li><b>Why not run as root, and how do you avoid it?</b>Root in the container is root on the host kernel, with no hypervisor between them, so an escape lands as root. Add a user with a fixed numeric uid, <code>COPY --chown</code>, and <code>USER 10001</code> after the installs.</li>
  <li><b>Why not use <code>:latest</code>?</b>It is the tag Docker assumes when you give none, pointing at whatever was pushed last. It can move between two builds an hour apart, so "what is running?" becomes unanswerable and rollback undefined.</li>
</ol>

## Sixty-second self-test

- Give the container-versus-VM answer in two sentences, including the security follow-up.
- Explain image versus container with an analogy.
- Say when `RUN` runs and when `CMD` runs.
- Explain what `EXPOSE` does and does not do.
- Give the two causes of a dead published port.
- Say why COPY order changes build speed, and what "additive layers" means.
- Name the storage that survives `docker rm`.
- Explain how Compose services find each other, and what `depends_on` does not do.
- Say what exit codes 137, 127, and 143 mean.
- Give the two lines that make a container run as non-root, and why they go last.
