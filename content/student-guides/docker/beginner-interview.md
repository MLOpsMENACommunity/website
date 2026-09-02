Read this in twenty minutes before an interview. Fast review first, common questions at the end.

## The thirty-second answer

> Docker packages an application together with its runtime, libraries, and system dependencies into an image. A container is a running instance of that image — a process on the host, isolated by kernel namespaces and cgroups rather than by a hypervisor. Because the image carries its own environment, the same artifact runs identically on a laptop, in CI, and in production.

Then the practitioner's sentence: *"the thing people miss is that a container lives exactly as long as its main process, and anything not in a volume disappears when the container is removed."*

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
      <li>Isolated by a hypervisor — stronger</li>
      <li>A simulated computer</li>
    </ul>
  </div>
</div>

Know the follow-up: *"so is a container less secure?"* Yes — shared-kernel isolation is weaker than a hypervisor. A kernel vulnerability is a container-escape path, which is why you drop privileges and do not run untrusted code in a plain container.

## Image versus container

| | Image | Container |
|---|---|---|
| Is | Read-only template of stacked layers | A running instance |
| Analogy | Class · installer | Object · running program |
| Mutability | Immutable | Thin writable layer, lost on `rm` |
| Count | One | Many from the same image |

## Vocabulary

| Term | Say this |
|---|---|
| **Image** | Read-only stack of filesystem layers plus metadata |
| **Layer** | The filesystem diff produced by one Dockerfile instruction |
| **Container** | A running instance: image layers + a writable layer |
| **Volume** | Docker-managed storage that outlives the container |
| **Bind mount** | A host directory mounted into a container |
| **Registry** | Where images are stored and shared — Docker Hub, GHCR, ECR |
| **Tag** | A human label on an image, `myapp:1.2.0` |
| **Build context** | The directory sent to the daemon at build time |
| **Dockerfile** | The recipe that produces an image |

## The commands to have ready

```bash
docker run -d -p 8080:80 --name web nginx   # detached, port-mapped, named
docker ps -a                                 # all containers, running or not
docker logs -f --tail 50 web                 # follow output
docker exec -it web sh                       # shell inside a running container
docker build -t myapp:1.0 .                  # build from ./Dockerfile
docker inspect web                           # full JSON config
docker stats                                 # live CPU / memory
docker system df                             # disk usage
docker system prune -a                       # reclaim space
```

| Flag | Means |
|---|---|
| `-d` | Detached (background) |
| `-p host:container` | Publish a port — **host first** |
| `-it` | Interactive + TTY |
| `--rm` | Auto-remove on exit |
| `-e KEY=value` | Environment variable |
| `-v name:/path` | Volume or bind mount |

## Dockerfile instructions

```dockerfile Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

| Instruction | When it runs | Note |
|---|---|---|
| `FROM` | — | Always first; sets the base |
| `RUN` | **Build time** | Result is saved as a layer |
| `CMD` | **Run time** | Default command; overridable by `docker run … args` |
| `ENTRYPOINT` | Run time | The fixed executable; `CMD` supplies its arguments |
| `COPY` | Build time | From build context into the image |
| `WORKDIR` | Build + run | Sets the directory for later instructions |
| `ENV` | Build + run | Persists into the container |
| `EXPOSE` | — | **Documentation only.** `-p` publishes |

Two exam favourites: **`RUN` is build time, `CMD` is run time**, and **`EXPOSE` publishes nothing**.

## Layer caching and COPY order

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Dependencies first</h4>
    <ul>
      <li><code>COPY requirements.txt .</code> then <code>RUN pip install</code></li>
      <li><code>COPY . .</code> last</li>
      <li>Source edits reuse the cached install</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Everything first</h4>
    <ul>
      <li><code>COPY . .</code> then <code>RUN pip install</code></li>
      <li>Any source change busts the install layer</li>
      <li>Every build reinstalls from scratch</li>
    </ul>
  </div>
</div>

Docker reuses a layer when its inputs are unchanged. Once a layer is invalidated, **every layer after it is rebuilt too**.

## Volumes

```bash
docker run -v pgdata:/var/lib/postgresql/data postgres:16   # named volume
docker run -v "$(pwd)":/app myapp:dev                        # bind mount
```

| | Named volume | Bind mount |
|---|---|---|
| Managed by | Docker | You |
| Location | Docker's storage area | A path on the host |
| Portable | Yes | No — host-path dependent |
| Use for | Databases, app state | Live-reload development |

Data written outside a volume lives in the container's writable layer and dies with `docker rm`.

## Ports and networking basics

<div class="flow">
  <div class="node">HOST<small>localhost:8080</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">-p 8080:80<small>host : container</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">CONTAINER<small>listening on 80</small></div>
</div>

Two facts that come up constantly: the mapping is **host first**, and inside a container your app must bind **`0.0.0.0`**, not `127.0.0.1`, or the published port appears dead.

Containers on the same user-defined network reach each other **by container or service name** — that is why a Compose app connects to `db:5432`, not `localhost:5432`.

## Compose

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
    volumes: ['pgdata:/var/lib/postgresql/data']
volumes:
  pgdata:
```

```bash
docker compose up -d
docker compose logs -f app
docker compose down          # add -v to delete volumes too
```

Compose creates a network automatically and puts every service on it, addressable by service name.

<div class="callout warn">
  <span class="ct">Know the limit of <code>depends_on</code></span>
  It waits for the container to <b>start</b>, not for the service inside to be <b>ready</b>. A database accepting connections thirty seconds later will still break your app's first query. The fix is a health check plus <code>depends_on: { db: { condition: service_healthy } }</code>, or retry logic in the app.
</div>

## Common interview questions

<ol class="guide-steps">
  <li><b>What is Docker, and why use it?</b>It packages an app with its dependencies into an immutable image, so the artifact that passed CI is the artifact that runs in production. It removes environment drift, makes onboarding a single command, and gives you fast, disposable, isolated environments.</li>
  <li><b>Container versus virtual machine?</b>A container shares the host kernel and is a process with a restricted view — milliseconds to start, tens of megabytes. A VM ships a full guest OS and is isolated by a hypervisor — slower, larger, stronger isolation.</li>
  <li><b>Image versus container?</b>An image is a read-only template of stacked layers; a container is a running instance with a thin writable layer on top. One image, many containers.</li>
  <li><b>Why does <code>docker run ubuntu</code> exit immediately?</b>A container lives exactly as long as its main process. The default command is a shell with no input attached, so it finishes and the container stops. Use <code>-it</code> to attach a terminal.</li>
  <li><b>What is the difference between <code>RUN</code> and <code>CMD</code>?</b><code>RUN</code> executes at build time and its result becomes a layer. <code>CMD</code> sets the default command executed when a container starts. Putting the app's start command in <code>RUN</code> makes the build hang.</li>
  <li><b><code>CMD</code> versus <code>ENTRYPOINT</code>?</b><code>ENTRYPOINT</code> is the fixed executable; <code>CMD</code> supplies default arguments to it. Arguments after <code>docker run image</code> replace <code>CMD</code> but are appended to <code>ENTRYPOINT</code>. Use <code>ENTRYPOINT</code> when the container should always run one program.</li>
  <li><b>Does <code>EXPOSE</code> publish a port?</b>No. It is documentation for humans and tooling. <code>-p host:container</code> is what actually publishes.</li>
  <li><b>My port mapping does not work. Why?</b>Most often the app inside is listening on <code>127.0.0.1</code>, which is only reachable inside the container. Bind to <code>0.0.0.0</code>. Otherwise: wrong order in <code>-p</code>, or the app is on a different port than mapped.</li>
  <li><b>How do you persist data?</b>A named volume. Anything written to the container's writable layer is deleted with the container.</li>
  <li><b>Named volume versus bind mount?</b>A named volume is Docker-managed and portable — right for databases. A bind mount maps a host directory, is host-path dependent and permission-sensitive — right for development live-reload, wrong for production data.</li>
  <li><b>How do two containers talk to each other?</b>Put them on the same user-defined network and address each other by container or service name. Compose does this automatically, which is why the connection string is <code>db:5432</code>.</li>
  <li><b>Why is my rebuild so slow?</b>Almost always COPY order. Copy the dependency manifest and install first, then copy the source, so source edits reuse the cached install layer.</li>
  <li><b>What is the build context, and why does it matter?</b>The directory passed to <code>docker build</code>, sent in full to the daemon. Without a <code>.dockerignore</code> you ship <code>.git</code>, <code>node_modules</code>, and possibly <code>.env</code> — slow, and a real way to leak secrets into an image.</li>
  <li><b>How do you debug a container that will not start?</b><code>docker logs</code> first. Then <code>docker inspect</code> for the config and exit code. If it exits instantly, override the entrypoint to get a shell: <code>docker run -it --entrypoint sh myapp</code>.</li>
  <li><b>Where should an app write its logs?</b>stdout and stderr. That is what <code>docker logs</code>, log shippers, and orchestrators read. Writing to a file inside the container hides them and fills the writable layer.</li>
</ol>

## Sixty-second self-test

- Give the container-versus-VM answer in two sentences.
- Explain image versus container with an analogy.
- Say when `RUN` runs and when `CMD` runs.
- Explain what `EXPOSE` does and does not do.
- Give the two causes of a dead published port.
- Say why COPY order changes build speed.
- Name the storage that survives `docker rm`.
- Explain how Compose services find each other.
