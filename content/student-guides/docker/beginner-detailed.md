"It works on my machine" is the problem. Docker is the answer. Here is the whole idea in one line:

<div class="flow">
  <div class="node">DOCKERFILE<small>a recipe</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">IMAGE<small>a frozen snapshot</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">CONTAINER<small>a running copy</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">ANYWHERE<small>laptop, CI, server</small></div>
</div>

A container packages your app **with** its runtime, libraries, and system tools. It runs identically on your laptop, a colleague's Windows machine, and a production server, because it brings its own environment with it.

## Container versus virtual machine

The single most common interview opener, and worth getting straight before anything else.

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Container</h4>
    <ul>
      <li>Shares the host's kernel</li>
      <li>Starts in milliseconds</li>
      <li>Tens of megabytes</li>
      <li>Isolation by kernel features (namespaces, cgroups)</li>
      <li>Run dozens on a laptop</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Virtual machine</h4>
    <ul>
      <li>Ships a whole guest kernel and OS</li>
      <li>Starts in tens of seconds</li>
      <li>Gigabytes</li>
      <li>Isolation by a hypervisor — stronger</li>
      <li>Run a handful on a laptop</li>
    </ul>
  </div>
</div>

A container is **a process on your machine** with a restricted view of the filesystem, network, and process table. It is not a small computer.

## Image versus container

| | Image | Container |
|---|---|---|
| Is | A read-only template | A running instance of an image |
| Analogy | A class | An object |
| Analogy | An installer / an ISO | The installed, running program |
| Count | One image | Many containers from it |
| Changes | Immutable | Writable layer on top, lost on removal |

```bash
docker run hello-world       # pulls the image, then runs a container from it
```

<div class="callout note">
  <span class="ct">One image, many containers</span>
  <code>docker run nginx</code> three times gives you three independent containers from one image. They share the image's read-only layers on disk and each gets its own thin writable layer.
</div>

## Your first containers

```bash
# Run something and see output, then exit
docker run hello-world

# Run a web server in the background, mapped to localhost:8080
docker run -d -p 8080:80 --name web nginx

# Look at what is running
docker ps

# Read its logs
docker logs web

# Get a shell inside it
docker exec -it web bash

# Stop and remove it
docker stop web
docker rm web
```

Open `http://localhost:8080` after the third command and nginx is serving — with nothing installed on your machine.

## The commands you will actually use

| Command | Does |
|---|---|
| `docker run IMAGE` | Create and start a container |
| `docker ps` / `docker ps -a` | Running containers / all containers |
| `docker logs -f NAME` | Stream a container's output |
| `docker exec -it NAME sh` | Open a shell inside a running container |
| `docker stop` / `start` / `rm NAME` | Stop, start, delete a container |
| `docker images` | List local images |
| `docker rmi IMAGE` | Delete an image |
| `docker build -t name:tag .` | Build an image from a Dockerfile |
| `docker pull` / `push` | Download from / upload to a registry |
| `docker system df` | How much disk Docker is using |
| `docker system prune` | Reclaim space from unused objects |

The flags that matter early:

| Flag | Means |
|---|---|
| `-d` | Detached — run in the background |
| `-p 8080:80` | Publish host port 8080 → container port 80 |
| `-it` | Interactive + TTY, so you get a usable shell |
| `--name web` | Give it a name instead of a random one |
| `--rm` | Delete the container automatically when it exits |
| `-e KEY=value` | Set an environment variable |
| `-v host:container` | Mount a volume or a folder |

<div class="callout tip">
  <span class="ct">Use <code>--rm</code> for anything throwaway</span>
  <code>docker run --rm -it python:3.11 python</code> gives you a Python REPL and leaves nothing behind. Without <code>--rm</code>, stopped containers accumulate quietly until <code>docker ps -a</code> is a wall of text.
</div>

## The lifecycle

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>created</span><strong><code>docker create</code></strong><small>The writable layer exists; nothing is running.</small></div>
  <div class="guide-timeline-item"><span>running</span><strong><code>docker start</code> / <code>run</code></strong><small>The main process is alive. <code>docker ps</code> shows it.</small></div>
  <div class="guide-timeline-item"><span>stopped</span><strong><code>docker stop</code></strong><small>Sends SIGTERM, then SIGKILL after a grace period. The filesystem still exists.</small></div>
  <div class="guide-timeline-item"><span>gone</span><strong><code>docker rm</code></strong><small>The writable layer is deleted. Anything not in a volume is lost forever.</small></div>
</div>

<div class="callout warn">
  <span class="ct">A container lives exactly as long as its main process</span>
  <code>docker run ubuntu</code> exits instantly — the default command is a shell with no input, so it finishes and the container stops. This is not a bug. A container is not a machine you log into; it is one process with a restricted view.
</div>

## Writing a Dockerfile

A Dockerfile is a recipe. Each instruction adds a layer.

```dockerfile Dockerfile
FROM python:3.11-slim          # the base image to start from

WORKDIR /app                   # cd, and create it if needed

COPY requirements.txt .        # copy from your machine into the image
RUN pip install --no-cache-dir -r requirements.txt   # run at BUILD time

COPY . .                       # now copy the rest of the source

EXPOSE 8000                    # documentation: this app listens on 8000

CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t myapp:1.0 .    # the "." is the build context
docker run -d -p 8000:8000 myapp:1.0
```

| Instruction | Meaning |
|---|---|
| `FROM` | The base image. Always first |
| `WORKDIR` | Set the working directory for everything after it |
| `COPY src dst` | Copy files from the build context into the image |
| `RUN` | Execute a command **while building** and save the result |
| `ENV` | Set an environment variable in the image |
| `EXPOSE` | Documents a port. Does **not** publish it — `-p` does that |
| `CMD` | Default command when a container starts |
| `ENTRYPOINT` | The fixed executable; `CMD` becomes its arguments |

<div class="callout warn">
  <span class="ct">The two mistakes everyone makes here</span>
  <b>`RUN` happens at build time, `CMD` at run time.</b> Putting your app's start command in `RUN` makes the build hang forever. <br>
  <b><code>EXPOSE</code> does not publish anything.</b> It is a note for humans and tooling. Without <code>-p 8000:8000</code> nothing on your machine can reach the container.
</div>

## Why the COPY order matters

This is the single biggest speed lever a beginner can pull.

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Fast — dependencies first</h4>
    <ul>
      <li><code>COPY requirements.txt .</code></li>
      <li><code>RUN pip install …</code></li>
      <li><code>COPY . .</code></li>
      <li>Editing source reuses the cached install</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Slow — everything first</h4>
    <ul>
      <li><code>COPY . .</code></li>
      <li><code>RUN pip install …</code></li>
      <li>Any source edit invalidates the install layer</li>
      <li>Every build reinstalls everything</li>
    </ul>
  </div>
</div>

Docker caches each layer. If a layer's inputs have not changed, it is reused. Since your source changes constantly and your dependency list rarely does, copying the dependency list first means the expensive install step is cached almost always.

## Ports

<div class="flow">
  <div class="node">YOUR BROWSER<small>localhost:8080</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">-p 8080:80<small>host : container</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">CONTAINER<small>nginx on 80</small></div>
</div>

```bash
docker run -d -p 8080:80 nginx        # localhost:8080 → container:80
docker run -d -p 3000:3000 myapp      # same port both sides
docker run -d -P nginx                # publish all EXPOSEd ports randomly
```

The order is **host first, container second**. Getting it backwards is a classic.

<div class="callout warn">
  <span class="ct">Bind to <code>0.0.0.0</code>, not <code>127.0.0.1</code></span>
  If your app listens on <code>127.0.0.1</code> inside the container, it is only reachable from <em>inside</em> that container, and <code>-p</code> will appear to do nothing. Inside a container you must listen on <code>0.0.0.0</code>. This is the most common "my port mapping doesn't work" cause.
</div>

## Logs and getting inside

```bash
docker logs web                 # everything so far
docker logs -f --tail 50 web    # follow, last 50 lines
docker exec -it web sh          # a shell inside a RUNNING container
docker inspect web              # full JSON: mounts, network, env, config
docker stats                    # live CPU / memory per container
```

Your app should log to **stdout and stderr**, not to a file inside the container. That is what `docker logs` reads, and it is what every orchestrator and log shipper expects.

<div class="callout tip">
  <span class="ct">If <code>bash</code> is not found, use <code>sh</code></span>
  Slim and Alpine images often have no bash. <code>docker exec -it web sh</code> works nearly everywhere. If the image has no shell at all — a distroless or scratch image — you cannot exec into it, which is deliberate.
</div>

## Keeping data: volumes

Delete a container and its writable layer goes with it. Anything you want to survive must live in a volume.

```bash
# Named volume — Docker manages the location. Use for databases.
docker run -d --name db \
  -e POSTGRES_PASSWORD=secret \
  -v pgdata:/var/lib/postgresql/data \
  postgres:16

# Bind mount — a folder on your machine. Use for live-reload development.
docker run -d -p 8000:8000 -v "$(pwd)":/app myapp:dev

docker volume ls
docker volume inspect pgdata
```

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Named volume</h4>
    <ul>
      <li><code>-v pgdata:/var/lib/postgresql/data</code></li>
      <li>Docker owns the storage</li>
      <li>Portable across machines</li>
      <li>Right for databases and app state</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Bind mount</h4>
    <ul>
      <li><code>-v "$(pwd)":/app</code></li>
      <li>A real folder on your host</li>
      <li>Host-path dependent, permission-sensitive</li>
      <li>Right for development, wrong for production data</li>
    </ul>
  </div>
</div>

## `.dockerignore`

The build context is everything in the folder you point `docker build` at. Without this file you upload `.git`, `node_modules`, and your virtualenv to the Docker daemon on every build — slow, and a real way to leak secrets into an image.

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

## Putting it together

A small web app, built and run properly. Nothing here is new.

```dockerfile Dockerfile
FROM python:3.11-slim

# Do not run as root — one line, large payoff
RUN useradd --create-home --uid 1000 appuser
WORKDIR /app

# Dependencies first, so source edits reuse this layer
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=appuser:appuser . .

USER appuser
EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t myapp:1.0 .

docker run -d \
  --name myapp \
  -p 8000:8000 \
  -e LOG_LEVEL=info \
  --restart unless-stopped \
  myapp:1.0

docker logs -f myapp
```

And the same app with a database, which is where Compose starts to earn its keep:

```yaml compose.yaml
services:
  app:
    build: .
    ports: ['8000:8000']
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/app
    depends_on: [db]

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: app
    volumes: ['pgdata:/var/lib/postgresql/data']

volumes:
  pgdata:
```

```bash
docker compose up -d       # build and start everything
docker compose logs -f app # follow one service
docker compose down        # stop and remove (volumes survive)
```

Note that `app` reaches the database at the hostname **`db`** — Compose puts both on one network and each service is reachable by its service name. That is why the connection string says `db`, not `localhost`.

## Checklist before you move on

| Can you… | |
|---|---|
| Explain a container versus a VM? | Shared kernel, not a guest OS |
| Explain an image versus a container? | Template versus running instance |
| Say why `docker run ubuntu` exits immediately? | The main process finished |
| Say what `EXPOSE` does? | Documents — `-p` publishes |
| Order a Dockerfile for fast rebuilds? | Dependencies before source |
| Keep a database's data? | A named volume |
| Fix "port mapping doesn't work"? | Listen on `0.0.0.0` |
| Get a shell in a running container? | `docker exec -it NAME sh` |

Now containerise something you actually wrote. The concepts stick the moment you debug your own image that builds but will not start.
