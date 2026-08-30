<div class="guide-stat-strip">
  <div class="guide-stat"><b>26</b><span>sections, mental model to production</span></div>
  <div class="guide-stat"><b>70+</b><span>runnable commands and files</span></div>
  <div class="guide-stat"><b>1</b><span>host needed: your laptop</span></div>
  <div class="guide-stat"><b>0</b><span>prior container experience assumed</span></div>
</div>

## 01 Docker Mental Model

Docker packages an application and its runtime dependencies into an **image**. A running instance of that image is a **container**. Containers share the host kernel, so they start faster and use fewer resources than full virtual machines.

<div class="flow">
  <div class="node">DOCKERFILE<small>the recipe you write</small></div>
  <span class="arrow">→</span>
  <div class="node">IMAGE<small>immutable layers</small></div>
  <span class="arrow">→</span>
  <div class="node">CONTAINER<small>a running process</small></div>
  <span class="arrow">→</span>
  <div class="node">REGISTRY<small>where images travel</small></div>
</div>

### Key concepts and commands

| Concept | Purpose | Command |
|---|---|---|
| Image | Immutable application template | `docker image ls` |
| Container | Running or stopped image instance | `docker container ls -a` |
| Registry | Stores and distributes images | `docker pull`, `docker push` |
| Dockerfile | Reproducible image instructions | `docker build` |
| Docker daemon | Builds images and manages containers | `docker info` |

### Container or virtual machine

| | Container | Virtual machine |
|---|---|---|
| Isolates | Processes, filesystem, network namespace | A whole machine including its kernel |
| Boots in | Milliseconds to a second | Tens of seconds |
| Overhead | Megabytes | Gigabytes |
| Shares | The host kernel | Nothing; each has its own kernel |
| Good for | Packaging and shipping one application | Running a different operating system |

### Practical example

```bash
docker version
docker info
docker run --rm hello-world
```

### Expected result or use case

Docker downloads the `hello-world` image if needed, creates a container, prints a confirmation message, and removes the stopped container because of `--rm`. This verifies that the Docker client can communicate with the daemon.

<div class="callout note">
  <span class="ct">Cannot connect to the Docker daemon?</span>
  The client and the daemon are separate programs. On macOS and Windows, start Docker Desktop. On Linux, run <code>sudo systemctl start docker</code> and add yourself to the <code>docker</code> group with <code>sudo usermod -aG docker "$USER"</code>, then open a new shell. Every command in this guide talks to the daemon, so fix this before continuing.
</div>

## 02 Images and Containers

Images are read-only layers. Containers add a temporary writable layer on top. Removing a container does not remove its image, and removing an image does not affect containers that are currently using it.

### Key commands

| Task | Command |
|---|---|
| Download an image | `docker pull nginx:1.27-alpine` |
| List images | `docker image ls` |
| Run a container | `docker run` |
| List running containers | `docker ps` |
| List all containers | `docker ps -a` |
| Stop and remove | `docker stop NAME`, `docker rm NAME` |
| Remove unused data | `docker system prune` |

### Practical example

```bash
docker pull nginx:1.27-alpine
docker run --name web -d -p 8080:80 nginx:1.27-alpine
docker ps
curl http://localhost:8080
docker stop web
docker rm web
```

### Expected result or use case

The Nginx welcome page is available at `http://localhost:8080`. Port `8080` on the host forwards to port `80` in the container. This is the standard pattern for running a packaged web service locally.

<div class="callout tip">
  <span class="ct">The distinction that unblocks most beginners</span>
  An image is a <em>class</em>; a container is an <em>instance</em>. One image can back a hundred containers. <code>docker ps</code> lists instances, <code>docker image ls</code> lists templates, and a change you make inside a running container lives only in that instance's writable layer until you rebuild the image.
</div>

## 03 Running Containers Effectively

`docker run` combines image selection, container creation, configuration, and startup. The most useful flags control names, cleanup, ports, environment variables, working directories, and resource limits.

### Key commands and flags

| Flag | Meaning |
|---|---|
| `--name api` | Give the container a stable name |
| `-d` | Run in the background |
| `--rm` | Remove the container after it exits |
| `-p 8080:80` | Publish host port 8080 to container port 80 |
| `-e KEY=value` | Set an environment variable |
| `--env-file .env` | Read environment variables from a file |
| `-w /app` | Set the working directory |
| `--memory 512m --cpus 1` | Limit memory and CPU |
| `-it` | Interactive terminal, for shells and REPLs |
| `--restart unless-stopped` | Restart automatically after a crash or reboot |

### Practical example

```bash
docker run --rm \
  --name python-check \
  -e APP_ENV=development \
  -w /workspace \
  python:3.12-alpine \
  sh -c 'echo "Environment: $APP_ENV" && python --version && pwd'
```

### Expected result or use case

The output shows the environment value, Python version, and `/workspace` directory. The container disappears after completion. This pattern is useful for one-off tools and reproducible scripts without installing their runtime locally.

<div class="callout warn">
  <span class="ct">-p 8080:80 exposes the port to your whole network</span>
  Published ports bind to every interface by default, so anyone on the same Wi-Fi can reach a development database you started with <code>-p 5432:5432</code>. Bind explicitly during development: <code>-p 127.0.0.1:5432:5432</code>. Remember the order is always <strong>host:container</strong>.
</div>

## 04 Container Lifecycle and Inspection

Containers move through created, running, paused, and exited states. Inspection commands reveal configuration and runtime behavior without rebuilding anything.

### Key commands

```bash
docker start CONTAINER
docker stop CONTAINER
docker restart CONTAINER
docker pause CONTAINER
docker unpause CONTAINER
docker inspect CONTAINER
docker stats
docker top CONTAINER
docker port CONTAINER
```

### Practical example

```bash
docker run --name sleeper -d alpine:3.20 sleep 300
docker inspect --format '{{.State.Status}}' sleeper
docker top sleeper
docker stats --no-stream sleeper
docker stop sleeper
docker inspect --format '{{.State.ExitCode}}' sleeper
docker rm sleeper
```

### Expected result or use case

You see the container state, its `sleep` process, a one-time resource snapshot, and exit code `0`. These commands answer whether a container is alive, what it is running, and how many resources it consumes.

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>created</span><strong>Container exists, nothing runs</strong><small>Produced by <code>docker create</code>, or by <code>docker run</code> for a moment before startup.</small></div>
  <div class="guide-timeline-item"><span>running</span><strong>The main process is alive</strong><small>PID 1 in the container is your <code>CMD</code> or <code>ENTRYPOINT</code>. If it exits, the container exits.</small></div>
  <div class="guide-timeline-item"><span>paused</span><strong>Processes frozen, memory kept</strong><small>Rarely used outside debugging. <code>docker unpause</code> resumes exactly where it stopped.</small></div>
  <div class="guide-timeline-item"><span>exited</span><strong>Stopped, filesystem preserved</strong><small>Logs and the writable layer survive, so you can still inspect a crash before <code>docker rm</code>.</small></div>
  <div class="guide-timeline-item"><span>removed</span><strong>Gone, including its writable layer</strong><small>Only named volumes outlive this step, which is why persistent data belongs in one.</small></div>
</div>

<div class="callout note">
  <span class="ct">A container lives exactly as long as PID 1</span>
  There is no "container that just sits there". If your image's command finishes, the container exits — which is why <code>docker run alpine</code> appears to do nothing, while <code>docker run alpine sleep 300</code> stays up. Foreground your server process; never start it with <code>&amp;</code> or in a background daemon mode.
</div>

## 05 Building Images with Dockerfile

A Dockerfile records every step needed to create an image. Keep the build deterministic: pin base-image versions, copy dependency files before source files, and use `.dockerignore` to exclude unnecessary content.

### Key instructions

| Instruction | Purpose |
|---|---|
| `FROM` | Select the base image |
| `WORKDIR` | Set the working directory |
| `COPY` | Copy files into the image |
| `RUN` | Execute a build-time command |
| `ENV` | Define a runtime environment default |
| `ARG` | Define a build-time variable |
| `EXPOSE` | Document the listening port |
| `CMD` | Set the default process |
| `ENTRYPOINT` | Set a fixed executable |
| `HEALTHCHECK` | Declare how readiness is measured |
| `USER` | Drop from root to an unprivileged account |

### Practical example

Create `app.py`:

```python app.py
from http.server import BaseHTTPRequestHandler, HTTPServer

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = b"Hello from Docker\n"
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

HTTPServer(("0.0.0.0", 8000), Handler).serve_forever()
```

Create `Dockerfile`:

```dockerfile Dockerfile
FROM python:3.12-alpine

WORKDIR /app
COPY app.py .

EXPOSE 8000
CMD ["python", "app.py"]
```

Build and run it:

```bash
docker build -t hello-python:1.0 .
docker run --rm -p 8000:8000 hello-python:1.0
```

### Expected result or use case

Opening `http://localhost:8000` returns `Hello from Docker`. Anyone with the files can build the same runtime without configuring Python on the host.

### CMD or ENTRYPOINT

| | `CMD` | `ENTRYPOINT` |
|---|---|---|
| Role | The default arguments | The fixed executable |
| Overridden by | Anything after the image name in `docker run` | Only `--entrypoint` |
| Use it for | A default command users may replace | A wrapper the image must always run |
| Together | `ENTRYPOINT ["python"]` plus `CMD ["app.py"]` means `docker run img other.py` runs `python other.py` |  |

<div class="callout warn">
  <span class="ct">Always bind to 0.0.0.0 inside a container</span>
  A server listening on <code>127.0.0.1</code> inside a container is unreachable from the host no matter how you publish ports, because <code>localhost</code> there means the container itself. This single mistake accounts for a large share of "the port mapping does not work" reports. Use <code>0.0.0.0</code> in the container and restrict access with <code>-p 127.0.0.1:PORT:PORT</code> on the host instead.
</div>

## 06 Build Context, Layers, and Cache

Each Dockerfile instruction usually creates a layer. Docker reuses unchanged layers, so instruction order directly affects build speed. Copy stable dependency files first and frequently changed source files later.

### Key concepts and commands

```bash
docker build --progress=plain -t app:dev .
docker history app:dev
docker build --no-cache -t app:fresh .
docker builder prune
```

Create `.dockerignore`:

```text .dockerignore
.git
.env
node_modules
coverage
dist
*.log
```

### Layer ordering decides your build time

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Cache-friendly order</h4>
    <ul>
      <li><code>COPY package*.json ./</code> then <code>RUN npm ci</code></li>
      <li>Source copied <em>after</em> dependencies are installed</li>
      <li>Base image pinned to a specific tag or digest</li>
      <li>A <code>.dockerignore</code> that keeps the context small</li>
      <li>Editing a source file rebuilds only the last two layers</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Cache-busting order</h4>
    <ul>
      <li><code>COPY . .</code> as the first instruction</li>
      <li>Dependencies installed after the source is copied</li>
      <li><code>FROM node:latest</code>, which silently changes over time</li>
      <li>No <code>.dockerignore</code>, so <code>.git</code> and <code>node_modules</code> are shipped to the daemon</li>
      <li>Editing one comment reinstalls every dependency</li>
    </ul>
  </div>
</div>

### Practical example

```dockerfile Dockerfile — dependencies before source
FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
CMD ["npm", "start"]
```

### Expected result or use case

Changing application source reuses the dependency installation layer. `npm ci` runs again only when a package file changes, making repeated builds much faster and preventing secrets or local dependencies from entering the build context.

<div class="callout tip">
  <span class="ct">How the cache actually decides</span>
  For <code>RUN</code>, Docker compares the instruction text. For <code>COPY</code> and <code>ADD</code>, it compares the <em>contents</em> of the copied files. Once one layer misses, every layer after it rebuilds — the cache never recovers mid-build. That is the whole reason ordering matters.
</div>

## 07 Ports, Logs, and Container Access

Containers are isolated by default. Publish only the ports users need, write application logs to standard output and standard error, and use `docker exec` for temporary diagnostics rather than permanent manual changes.

### Key commands

```bash
docker logs CONTAINER
docker logs -f --tail 100 CONTAINER
docker exec -it CONTAINER sh
docker cp CONTAINER:/path/file ./file
docker port CONTAINER
```

### Practical example

```bash
docker run --name web -d -p 127.0.0.1:8080:80 nginx:1.27-alpine
docker logs web
docker exec web nginx -t
docker exec web sh -c 'echo healthy > /usr/share/nginx/html/health.txt'
curl http://localhost:8080/health.txt
docker rm -f web
```

### Expected result or use case

Nginx validates its configuration and serves `healthy`. Binding to `127.0.0.1` keeps the development service accessible only from the local machine. Changes made with `exec` disappear when the container is replaced, so permanent changes belong in the image.

<div class="callout note">
  <span class="ct">Log to stdout, never to a file</span>
  <code>docker logs</code> reads the container's standard output and standard error. An application that writes to <code>/var/log/app.log</code> inside the container produces an empty <code>docker logs</code> and a file nobody will ever rotate. Write structured lines to stdout and let the platform collect them — this is the same contract Kubernetes and every hosted runtime expect.
</div>

## 08 Persistent Data with Volumes

The container writable layer is disposable. Use named volumes for Docker-managed persistent data and bind mounts when the host must directly edit or inspect files.

### Storage choices

| Type | Best use | Example |
|---|---|---|
| Named volume | Database and application state | `-v db-data:/var/lib/postgresql/data` |
| Bind mount | Local source and configuration | `-v "$PWD/src:/app/src"` |
| tmpfs | Temporary sensitive or high-speed data | `--tmpfs /tmp` |

### Practical example

```bash
docker volume create demo-data
docker run --rm -v demo-data:/data alpine:3.20 sh -c 'date > /data/created.txt'
docker run --rm -v demo-data:/data alpine:3.20 cat /data/created.txt
docker volume inspect demo-data
docker volume rm demo-data
```

### Expected result or use case

The second container reads a file created by the first container. The data survives container removal because its lifecycle belongs to the named volume.

<div class="callout warn">
  <span class="ct">Three volume traps</span>
  ① A bind mount <em>hides</em> whatever the image had at that path, which is why mounting your source over <code>/app</code> can erase the <code>node_modules</code> the image installed — mount an anonymous volume over <code>/app/node_modules</code> to shadow it back. ② Files written by a container are owned by the container's user, so a root-created file can be unwritable on your host. ③ <code>docker compose down -v</code> deletes named volumes, database included.
</div>

## 09 Docker Networking

User-defined bridge networks provide automatic DNS: containers reach each other by container name. Publish ports only for traffic entering from outside Docker; container-to-container traffic uses the internal port.

### Key commands

```bash
docker network create app-net
docker network ls
docker network inspect app-net
docker network connect app-net CONTAINER
docker network disconnect app-net CONTAINER
```

### Practical example

```bash
docker network create app-net
docker run --name web --network app-net -d nginx:1.27-alpine
docker run --rm --network app-net curlimages/curl:8.10.1 http://web
docker rm -f web
docker network rm app-net
```

### Expected result or use case

The temporary curl container receives the Nginx page through `http://web`. No host port is required because both containers communicate over the private Docker network.

<div class="callout warn">
  <span class="ct">localhost inside a container is not your machine</span>
  Each container has its own network namespace, so <code>localhost</code> means "this container". To reach another container use its name on a shared user-defined network; to reach a service on your host use <code>host.docker.internal</code> on Docker Desktop, or <code>--add-host=host.docker.internal:host-gateway</code> on Linux. The default <code>bridge</code> network has no DNS between containers, which is why <code>docker network create</code> comes first.
</div>

## 10 Multi-Container Apps with Docker Compose

Compose describes related services, networks, and volumes in one YAML file. It is ideal for local development, integration tests, and single-host deployments.

### Key commands

```bash
docker compose config
docker compose up -d
docker compose ps
docker compose logs -f
docker compose exec SERVICE COMMAND
docker compose down
docker compose down -v
```

### Practical example

Create `compose.yaml`:

```yaml compose.yaml
services:
  web:
    image: nginx:1.27-alpine
    ports:
      - "8080:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
    depends_on:
      api:
        condition: service_healthy

  api:
    image: python:3.12-alpine
    command: ["python", "-m", "http.server", "5678"]
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:5678')"]
      interval: 5s
      timeout: 2s
      retries: 5
```

Run the stack:

```bash
mkdir -p html
echo '<h1>Compose works</h1>' > html/index.html
docker compose config
docker compose up -d
docker compose ps
curl http://localhost:8080
docker compose down
```

### Expected result or use case

Compose validates the file, starts both services, waits for the API health check before considering dependencies ready, and serves the local HTML through Nginx.

<div class="callout tip">
  <span class="ct">depends_on alone does not wait for readiness</span>
  Plain <code>depends_on: [api]</code> waits only until the container has <em>started</em>, not until the application inside it accepts connections. Always pair it with <code>condition: service_healthy</code> and a real <code>healthcheck</code>, as above. Without that, an API that boots faster than its database fails on the first request of every fresh <code>up</code>.
</div>

<div class="callout note">
  <span class="ct">Live reload with compose watch</span>
  Modern Compose can sync files and rebuild on change without a bind mount: add a <code>develop.watch</code> block with <code>action: sync</code> for source paths and <code>action: rebuild</code> for dependency manifests, then run <code>docker compose watch</code>. It keeps the container's own <code>node_modules</code> or virtualenv intact, which is the usual problem with mounting your whole project directory.
</div>

## 11 Compose Configuration and Environments

Keep environment-specific values outside the image. Compose supports variable interpolation, `env_file`, profiles, multiple files, and command-line overrides.

### Key concepts

| Feature | Use case |
|---|---|
| `.env` interpolation | Configure Compose values such as image tags and ports |
| `env_file` | Pass runtime variables to a container |
| Profiles | Start optional services such as debugging tools |
| Multiple files | Layer development or production overrides |

### Practical example

Create `.env`:

```text .env
WEB_PORT=8080
NGINX_TAG=1.27-alpine
```

Create `compose.yaml`:

```yaml compose.yaml
services:
  web:
    image: nginx:${NGINX_TAG}
    ports:
      - "${WEB_PORT}:80"

  tools:
    image: curlimages/curl:8.10.1
    profiles: [debug]
    command: ["sleep", "infinity"]
```

```bash
docker compose config
docker compose up -d web
docker compose --profile debug up -d
docker compose down
```

### Expected result or use case

The web service uses values from `.env`; the tools container starts only when the `debug` profile is enabled. This keeps optional development tooling out of normal runs.

<div class="callout warn">
  <span class="ct">Two different .env files</span>
  The <code>.env</code> file next to <code>compose.yaml</code> is read by <strong>Compose itself</strong> to substitute <code>${VAR}</code> in the YAML. It does <em>not</em> automatically become environment variables inside your containers — that requires <code>env_file:</code> or an explicit <code>environment:</code> block. Mixing the two up is why a variable is visible in <code>docker compose config</code> but missing inside the container. Always run <code>docker compose config</code> to see the fully resolved file.
</div>

## 12 Registries, Tags, and Image Distribution

An image name follows `[registry/]namespace/repository:tag`. Tags are movable labels, while digests identify exact immutable image content. Use meaningful version tags and record digests for reproducible production deployments.

### Key commands

```bash
docker tag local-app:1.0 ghcr.io/example/app:1.0.0
docker login ghcr.io
docker push ghcr.io/example/app:1.0.0
docker pull ghcr.io/example/app:1.0.0
docker image inspect --format '{{index .RepoDigests 0}}' IMAGE
```

### Practical example

```bash
docker pull alpine:3.20
docker tag alpine:3.20 my-alpine:stable
docker image ls my-alpine
docker image inspect --format '{{.Id}}' my-alpine:stable
```

### Expected result or use case

Both tags point to the same local image ID. In a real delivery pipeline, the second tag would include your registry and be pushed for other environments to pull.

<div class="callout tip">
  <span class="ct">Tags move, digests do not</span>
  <code>app:1.0.0</code> is a label someone can repoint at different content tomorrow; <code>app@sha256:...</code> names exact bytes forever. Use readable tags for humans and deploy by digest in production, so a rollback restores the identical image rather than whatever the tag means today.
</div>

## 13 Multi-Stage Builds

Multi-stage builds separate compilation tools from the final runtime. Copy only the built artifact into a small runtime image to reduce size and attack surface.

### What each stage buys you

<div class="cards">
  <div class="card"><div class="icon">📉</div><h4>Smaller images</h4><p>Compilers, headers, and package caches stay in the build stage and never reach the registry.</p></div>
  <div class="card"><div class="icon">🛡️</div><h4>Smaller attack surface</h4><p>No shell, no package manager, no source code for an attacker to use after a breakout.</p></div>
  <div class="card"><div class="icon">⚡</div><h4>Faster deploys</h4><p>Fewer megabytes to pull means faster rollouts and faster autoscaling.</p></div>
  <div class="card"><div class="icon">🎯</div><h4>One file, many targets</h4><p><code>--target test</code> in CI and <code>--target production</code> for release, from a single Dockerfile.</p></div>
</div>

### Key concepts

```bash
docker build --target build -t app:build .
docker build -t app:runtime .
docker history app:runtime
```

### Practical example

```dockerfile Dockerfile — build stage plus distroless runtime
FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod main.go ./
RUN CGO_ENABLED=0 go build -o /out/server main.go

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/server /server
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/server"]
```

### Expected result or use case

The final image contains the compiled server but not the Go compiler, package manager, or source code. This produces a smaller production artifact with fewer tools available to an attacker.

<div class="callout note">
  <span class="ct">Distroless means no shell</span>
  A distroless or <code>scratch</code> runtime has no <code>sh</code>, so <code>docker exec -it app sh</code> fails and shell-form <code>HEALTHCHECK</code> commands do not work. Debug by adding a temporary stage based on the same image with tools installed, or by attaching a sidecar. The trade is real: much smaller and safer in exchange for less convenient debugging.
</div>

## 14 Health Checks and Reliable Startup

A running process is not necessarily ready to serve traffic. Health checks let Docker and Compose report whether the application is actually responsive. Applications should also handle termination signals and stop gracefully.

### Key concepts and commands

```dockerfile Dockerfile — a HEALTHCHECK instruction
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1
```

```bash
docker inspect --format '{{json .State.Health}}' CONTAINER
docker stop --time 20 CONTAINER
```

### Practical example

```bash
docker run --name health-demo -d \
  --health-cmd='wget -qO- http://localhost || exit 1' \
  --health-interval=5s \
  --health-retries=3 \
  nginx:1.27-alpine

docker inspect --format '{{.State.Health.Status}}' health-demo
docker rm -f health-demo
```

### Expected result or use case

After startup the status changes from `starting` to `healthy`. Deployment systems can use this state to avoid routing traffic to an unready instance.

<div class="callout warn">
  <span class="ct">Handle SIGTERM or lose ten seconds on every deploy</span>
  <code>docker stop</code> sends <code>SIGTERM</code>, waits ten seconds, then sends <code>SIGKILL</code>. A process that ignores <code>SIGTERM</code> is killed mid-request on every single deployment. Two common causes: the process is started through a shell (<code>CMD npm start</code>) so signals never reach it — use exec form <code>CMD ["node", "server.js"]</code> — or no signal handler is registered. Adding <code>--init</code> (or <code>init: true</code> in Compose) also reaps zombie processes correctly.
</div>

## 15 Container Security

Secure containers by reducing privileges, dependencies, writable paths, and secret exposure. Containers are a process-isolation boundary, not a reason to trust arbitrary code.

### Security checklist

| Practice | Docker control |
|---|---|
| Run as non-root | `USER`, `--user` |
| Drop Linux capabilities | `--cap-drop ALL` |
| Prevent privilege escalation | `--security-opt no-new-privileges:true` |
| Read-only filesystem | `--read-only` |
| Limit resources | `--memory`, `--cpus`, `--pids-limit` |
| Scan images | `docker scout cves IMAGE` |
| Avoid secrets in layers | BuildKit secret mounts or runtime secret files |
| Pin trusted bases | Version tags and image digests |

### Practical example

```bash
docker run --rm \
  --user 65534:65534 \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --memory 128m \
  --pids-limit 100 \
  alpine:3.20 id
```

### Expected result or use case

The process runs as an unprivileged user with no extra capabilities, a read-only root filesystem, bounded memory and process count, and a temporary writable `/tmp`. Apply these controls to production services where compatible.

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Do</h4>
    <ul>
      <li>Add a <code>USER</code> line to every Dockerfile that ships a long-running service</li>
      <li>Pin the base image by digest and rebuild on a schedule to absorb patches</li>
      <li>Mount secrets at run time from a secret store or an <code>--env-file</code> kept out of Git</li>
      <li>Scan images in CI and fail the build on new high-severity findings</li>
      <li>Prefer slim or distroless runtimes so there is less installed to exploit</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Do not</h4>
    <ul>
      <li>Run <code>--privileged</code>, which effectively removes the isolation boundary</li>
      <li>Mount the Docker socket into a container unless you fully trust its contents</li>
      <li>Pass credentials through <code>ARG</code> or <code>ENV</code>; both persist in image history</li>
      <li>Use <code>latest</code>, which makes "what is actually deployed" unanswerable</li>
      <li>Treat a container as a security sandbox for untrusted code — use a VM for that</li>
    </ul>
  </div>
</div>

## 16 Build Secrets and Supply-Chain Safety

Never copy credentials into an image or pass them through `ARG`; image layers and build history can retain them. BuildKit mounts secrets temporarily for a single build step without storing the value in the result.

### Key commands and concepts

```dockerfile Dockerfile — a BuildKit secret mount
# syntax=docker/dockerfile:1
FROM alpine:3.20
RUN --mount=type=secret,id=token \
    TOKEN=$(cat /run/secrets/token) && \
    echo "Use token here without saving it"
```

```bash
DOCKER_BUILDKIT=1 docker build --secret id=token,src=./token.txt -t secure-build .
docker buildx build --provenance=true --sbom=true -t app:1.0 .
```

### Practical example

```bash
printf 'temporary-value' > token.txt
DOCKER_BUILDKIT=1 docker build --secret id=token,src=token.txt -t secret-demo .
docker history secret-demo
rm token.txt
```

### Expected result or use case

The build can read the secret, but the value does not appear in the Dockerfile, final filesystem, or normal image history. Use this for private package registries and authenticated dependency downloads.

<div class="callout warn">
  <span class="ct">Deleting a secret in a later layer does not remove it</span>
  Layers are additive. <code>COPY .npmrc .</code> followed by <code>RUN rm .npmrc</code> leaves the file fully readable in the earlier layer — anyone who pulls the image can extract it. The only safe options are a BuildKit secret mount, a multi-stage build where the secret never enters the final stage, or supplying the credential at run time.
</div>

## 17 Debugging Containers

Debug from observable evidence: state, exit code, logs, process list, configuration, resource use, filesystem, and network. Avoid rebuilding until the failure is understood.

### Debugging sequence

<ol class="guide-steps">
  <li><b>Is it even there?</b><code>docker ps -a</code> shows stopped containers too. An <code>exited</code> container with a non-zero code is an application failure; a missing container means the run never started.</li>
  <li><b>What did it say?</b><code>docker logs --tail 200 CONTAINER</code>. Read from the <em>first</em> error downwards, not from the last line upwards.</li>
  <li><b>How did it exit?</b><code>docker inspect --format '{{.State.ExitCode}} {{.State.Error}}' CONTAINER</code>. Code 137 is <code>SIGKILL</code>, usually the memory limit; 139 is a segfault; 143 is <code>SIGTERM</code>.</li>
  <li><b>Is the config what you think?</b><code>docker inspect</code> shows the effective command, environment, mounts, and networks — often different from what you intended to pass.</li>
  <li><b>Is it resource-starved?</b><code>docker stats --no-stream CONTAINER</code> next to your <code>--memory</code> limit. Silent OOM kills look like random restarts.</li>
  <li><b>Look from inside</b><code>docker exec -it CONTAINER sh</code> for a live container, or start a throwaway one with the same image, mounts, and network to reproduce the state.</li>
  <li><b>What changed on disk?</b><code>docker diff CONTAINER</code> lists every file added, changed, or deleted relative to the image — the fastest way to spot an unexpected write.</li>
</ol>

```bash
docker ps -a
docker inspect CONTAINER
docker logs --tail 200 CONTAINER
docker top CONTAINER
docker stats --no-stream CONTAINER
docker exec -it CONTAINER sh
docker diff CONTAINER
docker events --since 10m
```

### Practical example

```bash
docker run --name broken alpine:3.20 sh -c 'echo starting; echo failure >&2; exit 42'
docker ps -a --filter name=broken
docker logs broken
docker inspect --format 'status={{.State.Status}} exit={{.State.ExitCode}} error={{.State.Error}}' broken
docker rm broken
```

### Expected result or use case

The container is `exited`, logs show both messages, and inspection reports exit code `42`. This distinguishes an application failure from an image pull, runtime, or networking failure.

<div class="callout tip">
  <span class="ct">Debugging a container that exits instantly</span>
  Override the entrypoint to get a shell in the failing image instead of guessing: <code>docker run --rm -it --entrypoint sh IMAGE</code>. From there you can check that files landed where you expect, run the real command manually, and read its full error output.
</div>

## 18 Debugging Networks and Volumes

Many container failures are incorrect DNS names, ports, bind addresses, permissions, or mount paths. Inspect the effective network and mount configuration before changing application code.

### Key commands

```bash
docker network inspect NETWORK
docker inspect --format '{{json .NetworkSettings.Networks}}' CONTAINER
docker inspect --format '{{json .Mounts}}' CONTAINER
docker volume inspect VOLUME
docker exec CONTAINER getent hosts SERVICE
```

### Practical example

```bash
docker network create debug-net
docker run --name server --network debug-net -d nginx:1.27-alpine
docker run --rm --network debug-net busybox:1.36 nslookup server
docker run --rm --network debug-net busybox:1.36 wget -qO- http://server
docker rm -f server
docker network rm debug-net
```

### Expected result or use case

DNS resolves `server` to its container IP and HTTP succeeds. If DNS works but HTTP fails, investigate the application port or bind address rather than the Docker network.

## 19 Image Optimization

Smaller images pull and start faster, consume less storage, and contain fewer vulnerable packages. Optimize after measuring: use multi-stage builds, a suitable minimal runtime, combined package-manager steps, and cache mounts.

### Key practices

```dockerfile Dockerfile — cache mounts plus a pruned runtime stage
# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
CMD ["node", "dist/server.js"]
```

### The levers, in order of impact

| Lever | Typical saving | Cost |
|---|---|---|
| Multi-stage build | Often 60-90% of the image | A slightly longer Dockerfile |
| Smaller base (`slim`, `alpine`, distroless) | 100 MB to 800 MB | Fewer debug tools; Alpine uses musl, not glibc |
| `.dockerignore` | Faster context upload, no leaked files | None |
| Cache mounts (`--mount=type=cache`) | Most of the install time on rebuilds | Requires BuildKit |
| Combine `RUN` steps and clean package caches | 20-150 MB | Slightly less granular caching |
| Prune dev dependencies | 50-400 MB in Node projects | None |

### Practical example

```bash
docker build -t app:optimized .
docker image ls app:optimized
docker history app:optimized
docker run --rm app:optimized
```

### Expected result or use case

The runtime image excludes source files, development dependencies, and build tools. `docker history` helps identify unexpectedly large layers before publishing.

<div class="callout tip">
  <span class="ct">Measure before you optimise</span>
  <code>docker history IMAGE</code> ranks your own layers, and <code>docker system df -v</code> shows what is actually consuming disk. Chasing the base image is pointless if a stray 900 MB dataset copied by <code>COPY . .</code> is the real problem — and a <code>.dockerignore</code> fixes that in one line.
</div>

## 20 Production Runtime Practices

Production containers should be immutable, disposable, observable, resource-bounded, and configured externally. Replace failed instances instead of repairing them manually.

### Production checklist

| Area | Practice |
|---|---|
| Image | Pin versions, scan, sign, and deploy by digest |
| Process | One primary responsibility; handle `SIGTERM` |
| Config | Environment variables or mounted configuration |
| Secrets | Runtime secret store; never image layers |
| Data | External database or managed volume with backups |
| Network | Expose only required ports; use private networks |
| Resources | Set CPU, memory, and process limits |
| Reliability | Health checks, restart policy, graceful shutdown |
| Logs | Write structured logs to stdout/stderr |
| Delivery | Test the exact image that will be deployed |

### Practical example

```yaml
services:
  api:
    image: ghcr.io/example/api@sha256:REPLACE_WITH_REAL_DIGEST
    restart: unless-stopped
    init: true
    read_only: true
    tmpfs:
      - /tmp:size=64m,noexec,nosuid
    cap_drop: [ALL]
    security_opt:
      - no-new-privileges:true
    environment:
      LOG_LEVEL: info
    ports:
      - "127.0.0.1:8080:8080"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8080/health"]
      interval: 30s
      timeout: 3s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
```

### Expected result or use case

The service runs from immutable image content with constrained privileges and resources, a read-only filesystem, local-only published port, automatic restart, and readiness visibility. Replace the sample digest and health command with values from the real application.

## 21 Complete Real-World Stack

This final example combines an application, PostgreSQL, private networking, persistent storage, health checks, and a development-friendly build.

### Application Dockerfile

```dockerfile Dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

RUN useradd --create-home appuser
USER appuser

EXPOSE 8000
CMD ["python", "app.py"]
```

### Compose stack

```yaml compose.yaml
services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://app:development-only@db:5432/app
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: development-only
      POSTGRES_DB: app
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d app"]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  postgres-data:
```

### Key commands

```bash
docker compose build
docker compose up -d
docker compose ps
docker compose logs -f api
docker compose exec db psql -U app -d app
docker compose down
docker compose down -v  # also deletes development database data
```

### Expected result or use case

Compose builds the API, creates a private default network, starts PostgreSQL with persistent data, waits for database health, then starts the API. The API connects to hostname `db`, not `localhost`, because service names are DNS names inside the Compose network.

## 22 Containers for Machine Learning

ML images break the assumptions that work for web services: dependencies are measured in gigabytes, the artifact you ship is a model rather than a binary, and correctness depends on the exact versions of numerical libraries. The techniques are the same ones from earlier sections, applied with different priorities.

### What makes ML images different

| Challenge | Practical response |
|---|---|
| Multi-gigabyte wheels such as `torch` | Install them in their own early layer so source edits never reinstall them |
| CUDA and driver coupling | Use an `nvidia/cuda` or framework base image; the host supplies the driver, the image supplies the toolkit |
| Non-deterministic resolution | Pin every version with a lockfile (`uv.lock`, `requirements.txt` from `pip-compile`, or `poetry.lock`) |
| Model weights | Keep them out of the image; download at startup from object storage or a model registry |
| Datasets | Never in the image or the build context; mount or fetch them |
| Notebook-driven code | Ship a package with an entrypoint; notebooks are for exploration, not for production images |

### Practical example

```dockerfile Dockerfile — training image with a cached dependency layer
# syntax=docker/dockerfile:1
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Heavy, rarely-changing dependencies first: this layer is cached across
# every source edit and shared by the serving stage below.
COPY requirements.lock .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --require-hashes -r requirements.lock

COPY src/ ./src/
COPY configs/ ./configs/

RUN useradd --create-home --uid 10001 mlops
USER mlops

ENTRYPOINT ["python", "-m", "src.train"]
CMD ["--config", "configs/default.yaml"]
```

```dockerfile Dockerfile.serve — GPU inference image
# syntax=docker/dockerfile:1
FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    MODEL_DIR=/models

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3.11 python3-pip curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements-serve.lock .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip3 install --no-cache-dir -r requirements-serve.lock

COPY src/serve/ ./src/serve/

# Weights are mounted or downloaded at start, never baked in.
VOLUME ["/models"]

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -fsS http://localhost:8080/healthz || exit 1

USER 10001
ENTRYPOINT ["python3", "-m", "src.serve.main"]
```

```bash
# Train reproducibly, mounting data and writing artifacts back out.
docker build -t ml-train:1.0 .
docker run --rm \
  -v "$PWD/data:/data:ro" \
  -v "$PWD/artifacts:/artifacts" \
  -e DATA_DIR=/data -e OUTPUT_DIR=/artifacts \
  --memory 8g --cpus 4 \
  ml-train:1.0 --config configs/default.yaml

# Serve on a GPU. --gpus needs the NVIDIA Container Toolkit on the host.
docker build -f Dockerfile.serve -t ml-serve:1.0 .
docker run --rm -d --name serve \
  --gpus all \
  -v "$PWD/artifacts/model:/models:ro" \
  -p 127.0.0.1:8080:8080 \
  ml-serve:1.0

curl -fsS http://localhost:8080/healthz
docker exec serve nvidia-smi
docker rm -f serve
```

### Expected result or use case

Training runs identically on your laptop and on a build agent, source edits rebuild in seconds because the multi-gigabyte dependency layer is cached, and the serving image can be promoted through environments while the model it loads is swapped by changing a mount rather than rebuilding.

<div class="callout warn">
  <span class="ct">Do not bake weights or data into the image</span>
  A 4 GB checkpoint inside an image means every deployment pulls 4 GB, every registry copy stores it again, and a new model version invalidates the whole image. Keep weights in object storage or a model registry, reference them by version, and mount or download them at startup. The same rule applies with more force to datasets, which also leak into the build context unless <code>.dockerignore</code> excludes them.
</div>

<div class="callout tip">
  <span class="ct">GPU checklist</span>
  The host needs the NVIDIA driver and the NVIDIA Container Toolkit; the image needs a matching CUDA <em>runtime</em>, not the full toolkit. Verify the chain end to end with <code>docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi</code> before debugging your own image, and pin the CUDA minor version because framework wheels are built against a specific one.
</div>

## 23 Docker in CI/CD Pipelines

A container image is the natural unit of delivery: CI builds it once, tests run against that exact image, and the same digest is promoted through every environment. The build details differ from local development mainly because the cache is not on the machine any more.

### What changes in CI

| Local | In CI |
|---|---|
| Layer cache lives on your disk | Cache must be exported to a remote backend or it is lost each run |
| One architecture, your own | Often multi-architecture via `buildx` and QEMU |
| You trust the tag you just built | Promote by **digest** so the tested bytes are the deployed bytes |
| Secrets in your shell | Injected as short-lived credentials, ideally via OIDC |
| Tag whatever you like | Tags derived from the branch, the semver tag, and the commit SHA |

### Practical example

```bash
# Reusable, cache-aware build that works on any CI system
docker buildx create --use --name ci-builder 2>/dev/null || docker buildx use ci-builder

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --cache-from "type=registry,ref=ghcr.io/example/app:buildcache" \
  --cache-to   "type=registry,ref=ghcr.io/example/app:buildcache,mode=max" \
  --tag "ghcr.io/example/app:${GIT_SHA}" \
  --provenance=true --sbom=true \
  --push .

# Resolve the immutable digest and deploy that, not the tag
DIGEST=$(docker buildx imagetools inspect "ghcr.io/example/app:${GIT_SHA}" \
         --format '{{json .Manifest.Digest}}' | tr -d '"')
echo "deploying ghcr.io/example/app@${DIGEST}"
```

```yaml compose.ci.yaml — run the test suite against the built image
services:
  tests:
    image: ghcr.io/example/app:${GIT_SHA}
    command: ["pytest", "-q", "tests/integration"]
    environment:
      DATABASE_URL: postgresql://app:ci@db:5432/app
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: ci
      POSTGRES_DB: app
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d app"]
      interval: 3s
      retries: 15
```

```bash
GIT_SHA=$(git rev-parse --short HEAD) \
  docker compose -f compose.ci.yaml run --rm --exit-code-from tests tests
```

### Expected result or use case

The pipeline produces one multi-architecture image, tests run inside that image against a real database, and deployment references a digest. Because layers are cached in the registry, a dependency-free change rebuilds in seconds even though every CI run starts on a clean machine.

<div class="callout tip">
  <span class="ct">The GitHub Actions version of this</span>
  On GitHub Actions the same pipeline is a dozen lines using <code>docker/setup-buildx-action</code>, <code>docker/login-action</code>, <code>docker/metadata-action</code>, and <code>docker/build-push-action</code> with <code>cache-from: type=gha</code>. Section 21 of the GitHub Actions guide on this site contains the complete workflow, including image scanning and build provenance.
</div>

<div class="callout warn">
  <span class="ct">Docker-in-Docker is rarely the answer</span>
  Mounting <code>/var/run/docker.sock</code> into a build container hands it full control of the host daemon, and true nested Docker (<code>--privileged</code>) is slow and fragile. Prefer a builder that is designed for it — <code>buildx</code> with a remote or container driver, or a rootless builder such as BuildKit or Buildah — and keep image building in the CI runner rather than inside your application container.
</div>

## 24 Beyond a Single Host

Compose is excellent up to the point where one machine is enough. Past that you need something that schedules containers across machines, restarts them elsewhere when a host dies, and rolls out new versions without downtime. Almost everything you have learned transfers; the vocabulary changes.

### How the concepts map

| Docker / Compose | Orchestrator equivalent |
|---|---|
| `image` | Identical, still the deployment unit |
| `services:` entry | Deployment or service definition |
| Container replica count | Replicas managed by a controller, with rescheduling |
| `ports:` | Service plus ingress or load balancer |
| Service name DNS | Cluster-internal DNS, same idea |
| `environment:` / `env_file:` | ConfigMap or parameter store |
| Secrets in an env file | Secret object backed by a real secret manager |
| `volumes:` | Persistent volume claim or managed storage |
| `healthcheck:` | Liveness and readiness probes, which are separate |
| `restart: unless-stopped` | The default: the controller keeps desired state |
| `deploy.resources.limits` | Resource requests and limits, used for scheduling |

### Choosing a next step

<div class="cards">
  <div class="card"><div class="icon">🧱</div><h4>Stay on Compose</h4><p>One host, a handful of services, downtime during deploys is acceptable. Simplest thing that works.</p></div>
  <div class="card"><div class="icon">☁️</div><h4>Managed container service</h4><p>ECS, Cloud Run, App Runner, Azure Container Apps. You hand over an image and a config; no cluster to operate.</p></div>
  <div class="card"><div class="icon">⛵</div><h4>Kubernetes</h4><p>Many services, autoscaling, multi-team platforms. Powerful and the industry default, with real operational cost.</p></div>
  <div class="card"><div class="icon">🐝</div><h4>Docker Swarm</h4><p>Multi-host with Compose-like syntax and a fraction of the complexity. Small ecosystem, so check long-term support.</p></div>
</div>

### Practical example

```bash
# A Compose stack is already close to a portable deployment description
docker compose -f compose.yaml -f compose.prod.yaml config > resolved.yaml

# Swarm reads almost the same file across several nodes
docker swarm init
docker stack deploy -c compose.yaml myapp
docker stack services myapp
docker service scale myapp_api=3
docker service update --image ghcr.io/example/api@sha256:DIGEST myapp_api
docker stack rm myapp
```

### Expected result or use case

The same image and nearly the same declaration run on three nodes with rolling updates. When you later move to Kubernetes, only the description format changes — the image, the health endpoints, the twelve-factor configuration, and the stateless design you built in earlier sections all carry over unchanged.

<div class="callout note">
  <span class="ct">Readiness and liveness are not the same check</span>
  Docker has one <code>HEALTHCHECK</code>; orchestrators separate <em>liveness</em> ("restart me, I am stuck") from <em>readiness</em> ("do not send me traffic yet"). Expose two endpoints from the start — a cheap `/healthz` and a dependency-aware `/readyz` — and the migration costs you nothing. Using one endpoint for both causes restart loops whenever a database is briefly slow.
</div>

## 25 Troubleshooting Reference

Most container failures are one of a small number of patterns. Match the symptom first, then change one thing at a time.

| Symptom | Likely cause | Fix |
|---|---|---|
| `Cannot connect to the Docker daemon` | Daemon not running, or your user is not in the `docker` group | Start Docker Desktop or `systemctl start docker`; add yourself to the `docker` group and open a new shell |
| Container exits immediately, no logs | The main process finished, or it was started in the background | Run the server in the foreground with exec-form `CMD ["node", "server.js"]` |
| Exit code `137` | `SIGKILL`, almost always the memory limit | Raise `--memory`, or fix the leak; check `docker stats` while it runs |
| Exit code `143` | `SIGTERM` during `docker stop` | Expected on shutdown. If it truncates work, add a `SIGTERM` handler |
| Port mapping "does not work" | The app listens on `127.0.0.1` inside the container | Bind to `0.0.0.0` in the container; restrict on the host with `-p 127.0.0.1:PORT:PORT` |
| `port is already allocated` | Another process or container owns the host port | `docker ps` then pick a different host port, or stop the other container |
| `connection refused` between containers | Default `bridge` network has no inter-container DNS | Create a user-defined network, or use Compose, and connect by service name |
| `name or service not known` | Wrong hostname; using `localhost` for a peer service | Use the container or service name; verify with `docker exec c getent hosts other` |
| Builds are always slow | `COPY . .` before dependency install, or no `.dockerignore` | Copy manifests first, then install, then copy source; add `.dockerignore` |
| `no space left on device` | Accumulated images, build cache, and dangling volumes | `docker system df` then `docker system prune -a` and `docker builder prune` |
| `permission denied` on a mounted file | Container user differs from the host file owner | Match UID/GID with `--user "$(id -u):$(id -g)"`, or `chown` inside the image |
| Code changes do not appear | You rebuilt but ran the old tag, or the mount shadows the path | Rebuild and rerun the same tag; check `docker inspect` mounts |
| `node_modules` missing with a bind mount | The host mount hid the directory the image installed | Add an anonymous volume for `/app/node_modules` |
| Compose service starts before its database | `depends_on` without a health condition | Add a `healthcheck` and `condition: service_healthy` |
| `exec format error` | Image architecture does not match the host | Build for the right platform: `--platform linux/amd64` or a multi-arch `buildx` build |
| Image works locally, fails in CI | Stale local layers hide a missing file | Reproduce with `docker build --no-cache` |
| Secret visible in the image | Copied in one layer and deleted in a later one | Use a BuildKit secret mount or a multi-stage build |
| Container healthy but unreachable from outside | Port never published, or bound to loopback on the host | Check `docker port CONTAINER` and the `-p` value |

### Practical example

```bash
# A first-response sequence that identifies most failures in under a minute
docker ps -a --filter name=myapp
docker logs --tail 100 myapp
docker inspect --format 'status={{.State.Status}} exit={{.State.ExitCode}} oom={{.State.OOMKilled}}' myapp
docker inspect --format '{{json .NetworkSettings.Ports}}' myapp
docker inspect --format '{{json .Mounts}}' myapp
docker stats --no-stream myapp
docker system df
```

### Expected result or use case

Those seven commands answer whether the container ran, what it printed, how it exited, which ports and mounts it actually received, whether it was resource-starved, and whether the host is out of disk — which is enough to classify nearly every failure before you edit a file.

## 26 Command Cheat Sheet

Use this as a quick reference after completing the guide.

| Goal | Command |
|---|---|
| Run and auto-remove | `docker run --rm IMAGE COMMAND` |
| Run in background | `docker run -d --name NAME IMAGE` |
| Publish a port | `docker run -p HOST:CONTAINER IMAGE` |
| Publish locally only | `docker run -p 127.0.0.1:HOST:CONTAINER IMAGE` |
| Build an image | `docker build -t NAME:TAG .` |
| Build a specific stage | `docker build --target STAGE -t NAME:TAG .` |
| Multi-architecture build | `docker buildx build --platform linux/amd64,linux/arm64 --push -t NAME:TAG .` |
| View containers | `docker ps -a` |
| Follow logs | `docker logs -f --tail 100 NAME` |
| Open a shell | `docker exec -it NAME sh` |
| Shell in a broken image | `docker run --rm -it --entrypoint sh IMAGE` |
| Inspect details | `docker inspect NAME` |
| See filesystem changes | `docker diff NAME` |
| View resource use | `docker stats` |
| Create a volume | `docker volume create NAME` |
| Create a network | `docker network create NAME` |
| Run with a GPU | `docker run --gpus all IMAGE` |
| Start Compose | `docker compose up -d --build` |
| Stop Compose | `docker compose down` |
| Validate Compose | `docker compose config` |
| Watch and sync | `docker compose watch` |
| Remove unused data | `docker system prune` |
| Show disk usage | `docker system df -v` |
| Scan for vulnerabilities | `docker scout cves IMAGE` |

### Practical workflow

```bash
docker build -t myapp:dev .
docker run --rm -p 8080:8080 --name myapp myapp:dev
docker logs -f myapp
docker exec -it myapp sh
docker inspect myapp
```

### Expected result or use case

These commands cover the normal loop: build, run, observe, enter, and inspect. Use Compose when the application requires multiple cooperating services, and move to an orchestrator when one host is no longer enough.
