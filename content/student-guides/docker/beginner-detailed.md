This is part one of three. It covers **everything you need to do real work with Docker** — not a teaser. By the end you can build an image, run and debug a container, keep data alive, wire two services together, and hand a colleague one command that starts your whole project. Mid-level and Senior take the same topics further; nothing here is thrown away.

Each section ends with a **Try it** task. Do them as you go — they take a few minutes each, and these concepts only stick once you have watched your own container start, crash, and start again properly.

## What Docker is, and the problem it solves

Docker packages an application **together with the environment it needs to run** — the language runtime, the libraries, the system packages, the configuration — into a single file called an image. You can then run that image as a container on any machine that has Docker, and it behaves the same way.

<div class="flow">
  <div class="node">DOCKERFILE<small>a recipe</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">IMAGE<small>a frozen snapshot</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">CONTAINER<small>a running copy</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">ANYWHERE<small>laptop, CI, server</small></div>
</div>

That is genuinely the whole idea. The reason it matters is what it replaces.

Before containers, getting a project running meant a page of setup instructions: install this version of Python, install these system libraries, set these environment variables, start Postgres, create a database. Every developer executed those steps slightly differently, so every developer's machine was slightly different. Then the server was different again — a different distribution, a different libc, an older OpenSSL — and code that passed every test locally failed in production for reasons nobody could reproduce.

**"It works on my machine" is not a joke about carelessness. It is a description of a real, structural problem**: the environment was never part of the thing you tested. Docker makes it part of the thing you ship.

Two consequences of that design shape everything else in this guide, so notice them now rather than discovering them later.

**The environment is described in a file you commit.** Your `Dockerfile` sits next to your source code, so it is versioned, branched, reviewed, and diffed like any other code. When the build breaks, `git log` tells you who changed the environment and why. This sounds administrative; in practice it is the single biggest reason teams stop being afraid of their deployment.

**A container is disposable.** You do not repair a container, you delete it and start a new one from the image. That is what makes containers safe to experiment with — and it is also the biggest source of confusion for newcomers, because anything you wrote inside the container disappears with it. We will come back to that repeatedly.

What people actually use it for:

<div class="cards">
  <div class="card"><div class="icon">💻</div><h4>One-command development</h4><p>A new team member clones the repository, runs one command, and has the app plus its database running.</p></div>
  <div class="card"><div class="icon">🧪</div><h4>Honest CI</h4><p>Tests run in the same image that will run in production, so a pass actually means something.</p></div>
  <div class="card"><div class="icon">🚀</div><h4>Predictable deploys</h4><p>The artifact that passed CI is byte-for-byte the artifact that ships. No rebuild, no drift.</p></div>
  <div class="card"><div class="icon">🧰</div><h4>Disposable tools</h4><p>Run Postgres, Redis, or a specific Python version for ten minutes and leave nothing installed behind.</p></div>
</div>

You need remarkably little to follow along: Docker installed, a terminal, and any small project. A brand-new folder with a three-line web app is genuinely the best place to experiment, because a failed build costs you nothing.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Write down, from memory, every step needed to run one of your projects on a brand-new laptop.</li>
    <li>Mark each step as <strong>environment</strong> (install a runtime, a library, a service) or <strong>your code</strong>.</li>
    <li>Count the environment steps.</li>
  </ol>
  <em>a list where most of the work is environment rather than code. Every one of those lines is something a Dockerfile can describe once, and the reason this guide is worth your afternoon.</em>
</div>

## Container versus virtual machine

This is the most common interview opener and the most common source of wrong mental models, so it is worth getting straight before anything else.

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Container</h4>
    <ul>
      <li>Shares the host's kernel</li>
      <li>Starts in milliseconds</li>
      <li>Tens to hundreds of megabytes</li>
      <li>Isolation from kernel features (namespaces, cgroups)</li>
      <li>Run dozens on a laptop</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Virtual machine</h4>
    <ul>
      <li>Ships a whole guest kernel and OS</li>
      <li>Starts in tens of seconds</li>
      <li>Gigabytes</li>
      <li>Isolation from a hypervisor — stronger</li>
      <li>Run a handful on a laptop</li>
    </ul>
  </div>
</div>

Here is the sentence to keep: **a container is a process on your machine with a restricted view of the filesystem, the network, and the process table.** It is not a small computer. There is no second operating system booting inside it, which is exactly why it starts in the time it takes to start any other program.

That restricted view is convincing enough to be confusing. Inside a container, `ls /` shows a different filesystem, `ps aux` shows only the container's own processes, and `hostname` returns something unfamiliar. None of that is emulation — the Linux kernel is simply showing that process a different picture. Senior level covers precisely how, because the security consequences matter. For now, the practical takeaways are:

| Because a container… | You get |
|---|---|
| Shares the host kernel | Startup in milliseconds, tiny memory overhead |
| Has no guest OS | Images measured in megabytes, not gigabytes |
| Is just a process | `docker stats` looks like a process monitor, because it is |
| Uses kernel-level isolation | Weaker separation than a VM — real, but not a security boundary for untrusted code |

<div class="callout note">
  <span class="ct">Docker on macOS and Windows does use a VM</span>
  Containers are a Linux kernel feature, so on a Mac or a Windows machine Docker Desktop quietly runs a small Linux virtual machine and your containers live inside it. This is why file access to mounted host folders is slower there than on Linux, and it explains a class of platform-specific surprises covered in the Tips &amp; Tricks section.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run <code>docker run --rm -it alpine sh</code>, then inside it run <code>ls /</code>, <code>ps aux</code>, and <code>hostname</code>.</li>
    <li>In a second terminal on your host, run <code>ps aux | grep sh</code> and find that shell.</li>
    <li>Type <code>exit</code> in the container.</li>
  </ol>
  <em>inside, <code>ps aux</code> shows one or two processes and the hostname is a random hex string. On the host, that same shell is visible as an ordinary process. That is the whole model in one experiment: one process, two views.</em>
</div>

## Image, container, registry: the three nouns

Three words that get used interchangeably in conversation and mean very different things in practice.

| | Image | Container | Registry |
|---|---|---|---|
| Is | A read-only template | A running instance of an image | A server that stores images |
| Analogy | A class · an installer | An object · the installed program | A package index |
| Count | One | Many, from the same image | Docker Hub, GHCR, ECR |
| Changes | Immutable | Thin writable layer, lost on removal | Versioned by tag and digest |
| Command | `docker build`, `docker pull` | `docker run` | `docker push`, `docker pull` |

```bash
docker run hello-world       # pulls the image from a registry, then runs a container
```

That one command exercises all three ideas: Docker looks for the `hello-world` image locally, does not find it, pulls it from Docker Hub, creates a container from it, runs it, and the container exits when its program finishes.

<div class="callout note">
  <span class="ct">One image, many containers</span>
  <code>docker run -d nginx</code> three times gives you three independent containers from one image. They share the image's read-only layers on disk — so the third costs almost no extra space — and each gets its own thin writable layer for anything it changes.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run <code>docker run hello-world</code> and read the output it prints — it describes exactly the steps above.</li>
    <li>Run it a second time and notice that nothing is downloaded, because the image is now local.</li>
    <li>Run <code>docker images</code> to see the image, and <code>docker ps -a</code> to see both containers you created.</li>
  </ol>
  <em>one image and two containers. Two containers from one run command each, both stopped, both still taking up a little disk until you remove them — which is the first hint that stopped containers do not disappear on their own.</em>
</div>

## Check your setup: client, daemon, registry

Before writing anything, confirm what you have. Three commands tell you everything that matters.

```bash
docker version          # client and server versions — the server line is the daemon
docker info             # storage driver, root directory, resources, warnings
docker run hello-world  # end-to-end proof: pull, create, run
```

`docker version` printing a **Client** section but failing on **Server** is the single most common setup problem, and it has one meaning: the Docker daemon is not running. Start Docker Desktop, or on Linux `sudo systemctl start docker`.

It is worth knowing the shape of what you just installed, because it explains several error messages:

<div class="guide-arch" style="--arch-cols:3">
  <div class="arch-lane" style="--lane-cols:1">
    <span class="arch-label">your machine</span>
    <div class="arch-node" data-kind="entry"><b><code>docker</code> CLI</b><small>A thin client. Sends every request over a socket — it builds nothing itself</small></div>
  </div>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down"></i>
  <div class="arch-lane" style="--lane-cols:3">
    <span class="arch-label">dockerd — the daemon does the work</span>
    <div class="arch-node" data-kind="worker"><b>Builder</b><small>Receives the build context, runs each instruction, writes layers</small></div>
    <div class="arch-node" data-kind="worker"><b>Runtime</b><small>Creates namespaces and cgroups, starts your process</small></div>
    <div class="arch-node" data-kind="store"><b>Storage</b><small>Images, layers, volumes, under the Docker root directory</small></div>
  </div>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down"></i>
  <i class="arch-edge" data-dir="down" data-flow="optional"></i>
  <div class="arch-node"><b>Image layers</b><small>Read-only, shared between containers</small></div>
  <div class="arch-node"><b>Container</b><small>One process, plus a thin writable layer</small></div>
  <div class="arch-node" data-kind="external"><b>Registry</b><small>Docker Hub, GHCR, ECR — pulled on demand</small></div>
  <p class="arch-note"><b>Why this matters:</b> the daemon must be running for any command to work; the build context is uploaded <b>to</b> the daemon, which is why its size affects build speed; and on Linux the socket is root-owned, which is why commands need <code>sudo</code> until your user joins the <code>docker</code> group.</p>
</div>

The `docker` command you type is only a client. It sends your request over a socket to a background service — the **daemon** — which builds images, starts containers, and manages storage. This matters in three practical ways: the daemon needs to be running for any command to work, files are sent *to* the daemon at build time (which is why build context size affects speed), and on Linux the socket is root-owned, which is why Docker commands need `sudo` until your user is added to the `docker` group.

| Symptom | Means |
|---|---|
| `Cannot connect to the Docker daemon` | The daemon is not running |
| `permission denied … /var/run/docker.sock` | Your user is not in the `docker` group |
| `no space left on device` | Docker's storage area is full — see the cleanup section |

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run <code>docker version</code> and confirm you get both a Client and a Server section.</li>
    <li>Run <code>docker info</code> and find three values: the storage driver, the Docker root directory, and the total memory available to containers.</li>
    <li>On Linux, run <code>ls -l /var/run/docker.sock</code> and note who owns it.</li>
  </ol>
  <em>a Server section (so the daemon is alive), and an <code>info</code> output that tells you where images are stored and how much memory containers can use. Knowing the root directory is what makes "my disk is full" solvable later.</em>
</div>

## Your first containers

Now run something real. These six commands are the core loop of working with Docker, and you will type them thousands of times.

```bash
# 1. Run a web server in the background, mapped to localhost:8080
docker run -d -p 8080:80 --name web nginx

# 2. Confirm it is running
docker ps

# 3. Read what it is printing
docker logs web

# 4. Get a shell inside it and look around
docker exec -it web sh

# 5. Stop it
docker stop web

# 6. Delete it
docker rm web
```

Open `http://localhost:8080` after the first command and nginx is serving a page — with nothing installed on your machine, no configuration file edited, and nothing to uninstall afterwards.

Read that first command flag by flag, because each one answers a question you will keep asking:

| Part | Does |
|---|---|
| `docker run` | Create a container from an image and start it |
| `-d` | Detached: run in the background and give you your prompt back |
| `-p 8080:80` | Publish **host** port 8080 to **container** port 80 |
| `--name web` | Name it, instead of accepting a random one like `nostalgic_bardeen` |
| `nginx` | The image. No tag means `nginx:latest` |

Without `-d` the container runs in the foreground and your terminal shows its output until you press Ctrl+C. That is often what you want while developing, and always what you want the first time you run something new — you get to see it fail.

<div class="callout tip">
  <span class="ct">Use <code>--rm</code> for anything throwaway</span>
  <code>docker run --rm -it python:3.11 python</code> gives you a Python 3.11 REPL and leaves nothing behind. Without <code>--rm</code>, every experiment leaves a stopped container behind until <code>docker ps -a</code> becomes a wall of text and your disk quietly fills.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run all six commands above in order, visiting <code>localhost:8080</code> between steps 1 and 5.</li>
    <li>Inside the container at step 4, run <code>ls /usr/share/nginx/html</code> and <code>cat /etc/nginx/nginx.conf</code>.</li>
    <li>Now run <code>docker run --rm -it python:3.11 python</code>, print <code>import sys; sys.version</code>, and exit.</li>
    <li>Run <code>docker ps -a</code> and confirm the Python container is not listed.</li>
  </ol>
  <em>a working web server you never installed, a Python version you do not have on your machine, and — thanks to <code>--rm</code> — no leftovers from the second experiment. That contrast between the nginx container you had to remove and the Python one that cleaned itself up is the habit to take away.</em>
</div>

## The commands you will actually use, by verb

There are hundreds of Docker subcommands. In day-to-day work you use about fifteen.

| Command | Does |
|---|---|
| `docker run IMAGE` | Create and start a container |
| `docker ps` / `docker ps -a` | Running containers / all containers including stopped |
| `docker logs -f NAME` | Stream a container's output |
| `docker exec -it NAME sh` | Open a shell inside a **running** container |
| `docker stop` / `start` / `restart NAME` | Stop, start, restart a container |
| `docker rm NAME` | Delete a stopped container |
| `docker images` | List local images |
| `docker rmi IMAGE` | Delete an image |
| `docker build -t name:tag .` | Build an image from a Dockerfile |
| `docker pull` / `push IMAGE` | Download from / upload to a registry |
| `docker inspect NAME` | Full JSON: config, mounts, network, state |
| `docker stats` | Live CPU and memory per container |
| `docker cp NAME:/path ./` | Copy a file out of (or into) a container |
| `docker system df` | How much disk Docker is using |
| `docker system prune` | Reclaim space from unused objects |

And the `docker run` flags worth memorising early:

| Flag | Means |
|---|---|
| `-d` | Detached — run in the background |
| `-it` | Interactive + TTY, so you get a usable shell |
| `-p 8080:80` | Publish host port 8080 → container port 80 |
| `--name web` | Give it a name instead of a random one |
| `--rm` | Delete the container automatically when it exits |
| `-e KEY=value` | Set an environment variable |
| `--env-file .env` | Set many environment variables from a file |
| `-v name:/path` | Mount a volume or a host folder |
| `-w /app` | Set the working directory |
| `--entrypoint sh` | Replace the image's entrypoint — the debugging escape hatch |
| `--restart unless-stopped` | Restart it automatically after a crash or reboot |

Two of those deserve a note now because they save real time. `docker exec -it NAME sh` only works on a **running** container; if the container has already exited there is nothing to exec into, and you want `--entrypoint sh` instead. And `docker inspect` is the answer to almost every "but I set that" argument — it shows the container's configuration after every default, image setting, and command-line override has been resolved.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Start a container: <code>docker run -d --name web -p 8080:80 nginx</code>.</li>
    <li>Run <code>docker inspect web</code> and find three things in the JSON: the image it came from, the published ports, and its environment variables.</li>
    <li>Now get the same answers as one line each: <code>docker inspect web --format '{{.Config.Image}}'</code> and <code>docker inspect web --format '{{json .NetworkSettings.Ports}}'</code>.</li>
    <li>Run <code>docker stats --no-stream</code> and note the memory the container is using.</li>
  </ol>
  <em>a wall of JSON, then the same facts as single lines. <code>--format</code> is the difference between <code>inspect</code> being unusable and being the first tool you reach for — the Tips section has a set worth keeping in your shell history.</em>
</div>

## The container lifecycle, state by state

A container moves through a small number of states, and most beginner confusion comes from not knowing which one it is in.

<div class="guide-timeline">
  <div class="guide-timeline-item"><span>created</span><strong><code>docker create</code></strong><small>The writable layer exists and configuration is fixed; nothing is running yet.</small></div>
  <div class="guide-timeline-item"><span>running</span><strong><code>docker start</code> / <code>docker run</code></strong><small>The main process is alive. <code>docker ps</code> shows it.</small></div>
  <div class="guide-timeline-item"><span>paused</span><strong><code>docker pause</code></strong><small>Processes frozen in place. Rare, but it exists.</small></div>
  <div class="guide-timeline-item"><span>exited</span><strong>the process ended, or <code>docker stop</code></strong><small>SIGTERM, then SIGKILL after ten seconds. The filesystem and logs still exist.</small></div>
  <div class="guide-timeline-item"><span>gone</span><strong><code>docker rm</code></strong><small>The writable layer is deleted. Anything not in a volume is lost forever.</small></div>
</div>

The rule that explains most surprises: **a container lives exactly as long as its main process.** Not "as long as you want it to", and not "until you stop it" — as long as process number one inside it keeps running.

```bash
docker run ubuntu                 # exits immediately
docker run -it ubuntu bash        # stays, because bash has a terminal to read from
docker run -d nginx               # stays, because nginx is a server that does not exit
docker run --rm alpine echo hi    # prints "hi", exits, removes itself
```

<div class="callout warn">
  <span class="ct"><code>docker run ubuntu</code> exiting instantly is not a bug</span>
  Ubuntu's default command is a shell. A shell with no terminal attached has nothing to read, so it finishes immediately — and when the main process finishes, the container is done. Adding <code>-it</code> attaches a terminal and gives the shell something to wait for. A container is not a machine you log into; it is one process with a restricted view.
</div>

An **exited** container still exists. Its filesystem, its logs, and its exit code are all still there, which is exactly what you need in order to debug it — and it is why `docker ps -a` fills up with corpses if you never use `--rm`.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run <code>docker run --name ghost ubuntu</code>. Confirm it is not in <code>docker ps</code> but is in <code>docker ps -a</code>.</li>
    <li>Read its exit code from the STATUS column, then run <code>docker logs ghost</code>.</li>
    <li>Run <code>docker start ghost</code> — the same container starts again and exits again.</li>
    <li>Now run <code>docker run --name alive -it ubuntu bash</code>, type <code>sleep 30</code>, and from a second terminal run <code>docker stop alive</code> and watch what happens in the first.</li>
  </ol>
  <em>the first container exits instantly with code 0 — it succeeded, it simply had nothing to do. The second survives because <code>-it</code> gave the shell a terminal, and <code>docker stop</code> visibly ends it. Those two runs together explain about a third of all "my container won't stay up" questions.</em>
</div>

## Images, tags, and registries

An image reference has three parts, and Docker fills in the ones you leave out — which is where surprises come from.

```text
ghcr.io/my-org/myapp:1.4.2
└──┬──┘ └──┬───┘ └─┬─┘ └┬─┘
registry  owner   name  tag
```

| You write | Docker resolves it to | Note |
|---|---|---|
| `nginx` | `docker.io/library/nginx:latest` | Official image, latest tag |
| `nginx:1.27` | `docker.io/library/nginx:1.27` | Pinned to a minor version |
| `myuser/myapp` | `docker.io/myuser/myapp:latest` | A user's image on Docker Hub |
| `ghcr.io/org/app:1.4.2` | Exactly that | A different registry |

```bash
docker pull nginx:1.27           # download without running
docker images                    # what you have locally
docker tag myapp:1.0 myuser/myapp:1.0
echo "$TOKEN" | docker login ghcr.io -u USERNAME --password-stdin
docker push myuser/myapp:1.0
docker rmi nginx:1.27            # delete a local image
```

<div class="callout warn">
  <span class="ct"><code>:latest</code> does not mean "the newest version"</span>
  It is just the tag Docker assumes when you do not give one, and it points at whatever the publisher last pushed under that name. It can move under you between two builds an hour apart. Pin a real tag in every <code>FROM</code> line and in every deployment — <code>nginx:1.27</code>, not <code>nginx</code> — so that "what is running?" always has an answer. Mid-level shows why even a version tag is not fully immutable, and what is.
</div>

Choosing a base image is your first real decision, and the sensible default is narrower than people expect:

| Base | Size | Use it when |
|---|---|---|
| `python:3.11` | ~1 GB | You need compilers and headers; fine for experiments |
| `python:3.11-slim` | ~150 MB | The sensible default for most applications |
| `python:3.11-alpine` | ~50 MB | Size really matters *and* you have tested it |
| `ubuntu:22.04` | ~78 MB | You want a general-purpose OS and will install everything yourself |

<div class="callout tip">
  <span class="ct">Start with <code>-slim</code>, not Alpine</span>
  Alpine looks like the obvious choice because it is smallest, but it uses musl instead of glibc, which means many prebuilt Python wheels and Node native modules do not apply and get compiled from source instead. The build gets slower, needs a toolchain, and often ends up <em>larger</em> than the slim variant. Reach for Alpine deliberately and with a measurement, not by default.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Pull three variants: <code>docker pull python:3.11</code>, then <code>python:3.11-slim</code>, then <code>python:3.11-alpine</code>.</li>
    <li>Run <code>docker images python</code> and read the SIZE column.</li>
    <li>Run <code>docker run --rm python:3.11-slim python -c "print('works')"</code> and then the same on the alpine tag.</li>
    <li>Try <code>docker run --rm python:3.11-alpine bash</code> and note the error.</li>
  </ol>
  <em>roughly 1 GB, 150 MB, and 50 MB for the same Python version — and the Alpine image has no <code>bash</code> at all, only <code>sh</code>. That error is the one you will hit again the first time you try to <code>exec</code> into a slim image.</em>
</div>

## Writing a Dockerfile

Running other people's images is useful. Building your own is the point.

A `Dockerfile` is a plain text file, named exactly that, describing how to construct an image. Each instruction takes the result of the previous one and adds something.

```dockerfile Dockerfile
FROM python:3.11-slim          # the base image to start from

WORKDIR /app                   # cd into /app, creating it if needed

COPY requirements.txt .        # copy one file from your machine into the image
RUN pip install --no-cache-dir -r requirements.txt   # runs at BUILD time

COPY . .                       # now copy the rest of the source

EXPOSE 8000                    # documentation: this app listens on 8000

CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t myapp:1.0 .    # the "." is the build context, not the Dockerfile
docker run -d -p 8000:8000 myapp:1.0
```

Let me walk through every line, because this small file contains the entire conceptual model.

`FROM python:3.11-slim` says "start from this image". You are never building from nothing; you are adding to something. This must be the first instruction.

`WORKDIR /app` sets the working directory for every instruction after it, and for the container at run time. It creates the directory if it does not exist, which is why you rarely need `mkdir`.

`COPY requirements.txt .` copies from the **build context** (your project folder) into the image at the current `WORKDIR`. Note it copies *into the image*, permanently — this is a build-time action, and the file is baked in.

`RUN pip install …` executes a command **while building** and saves the result as part of the image. The installed packages are now in the image forever. This is the instruction people misuse most, and the next section explains why.

`COPY . .` copies everything else. It comes after the install deliberately — that ordering is the single biggest speed lever available to you, and it has its own section below.

`EXPOSE 8000` is documentation. It publishes nothing at all.

`CMD [...]` is the default command run when a container starts. Not during the build — at run time, every time.

And the `-t myapp:1.0` in the build command is the tag you are giving the result, in `name:tag` form. Skip it and you get an untagged image identified only by a hash, which is how "dangling" images accumulate.

<div class="callout warn">
  <span class="ct">The two mistakes everyone makes here</span>
  <b><code>RUN</code> happens at build time; <code>CMD</code> happens at run time.</b> Putting your application's start command in a <code>RUN</code> makes the build hang forever, waiting for a server that never exits. <br>
  <b><code>EXPOSE</code> does not publish anything.</b> It is a note for humans and tooling. Without <code>-p 8000:8000</code> on <code>docker run</code>, nothing on your machine can reach the container.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Create a folder with three files: a one-line <code>requirements.txt</code> containing <code>fastapi[standard]</code>, an <code>app.py</code> with a single route, and the Dockerfile above.</li>
    <li>Run <code>docker build -t myapp:1.0 .</code> and read the output — every line is one instruction, and Docker tells you what it is doing.</li>
    <li>Run it: <code>docker run -d -p 8000:8000 --name myapp myapp:1.0</code>, then visit <code>localhost:8000</code>.</li>
    <li>Now break it deliberately: change <code>CMD</code> to <code>RUN</code> on the last line and rebuild. Cancel it with Ctrl+C after ten seconds.</li>
  </ol>
  <em>a working image you built, and then a build that hangs forever because you asked Docker to run a web server as a build step. Causing that hang on purpose is worth the sixty seconds — it makes the build-time versus run-time distinction permanent.</em>
</div>

## The Dockerfile instructions worth knowing

There are about eighteen instructions. These are the ones that appear in real Dockerfiles.

| Instruction | Runs at | Does |
|---|---|---|
| `FROM` | — | Sets the base image. Always first |
| `WORKDIR` | Build + run | Sets the working directory for what follows |
| `COPY src dst` | Build | Copies from the build context into the image |
| `ADD` | Build | Like `COPY`, but also unpacks archives and fetches URLs |
| `RUN` | **Build** | Executes a command and saves the result as a layer |
| `ENV KEY=value` | Build + run | Sets an environment variable in the image |
| `ARG KEY=value` | **Build only** | A variable you can pass with `--build-arg` |
| `EXPOSE` | — | Documents a port. `-p` publishes |
| `USER` | Run | Switches the user for what follows |
| `VOLUME` | Run | Declares a path as a mount point |
| `CMD` | **Run** | Default command, overridable by `docker run img args` |
| `ENTRYPOINT` | Run | The fixed executable; `CMD` becomes its arguments |
| `HEALTHCHECK` | Run | How Docker decides whether the container is healthy |
| `LABEL` | — | Metadata: maintainer, source repository, version |

Three of them are worth extra words now, because they are commonly confused.

**`COPY` versus `ADD`.** They look interchangeable. `ADD` additionally auto-extracts local tar archives and can download a URL — behaviour that is convenient once and surprising thereafter. Use `COPY` always, and reach for `ADD` only when you specifically want tar extraction.

**`ENV` versus `ARG`.** `ARG` exists only during the build; `ENV` persists into the running container. Both are visible to anyone who can pull the image, so neither is a place for a secret.

```dockerfile
ARG PYTHON_VERSION=3.11        # build only; pass with --build-arg
FROM python:${PYTHON_VERSION}-slim

ENV LOG_LEVEL=info             # a default, present at run time and overridable with -e
ENV PYTHONUNBUFFERED=1         # makes Python flush stdout, so docker logs works properly
```

`PYTHONUNBUFFERED=1` deserves a special mention. Python buffers stdout when it is not a terminal, so in a container your log lines can sit in a buffer for a long time and `docker logs` looks empty while the app is clearly working. One `ENV` line removes an entire class of confusion.

**`LABEL`** costs nothing and answers "where did this image come from?" six months later:

```dockerfile
LABEL org.opencontainers.image.source="https://github.com/my-org/myapp"
LABEL org.opencontainers.image.description="Checkout API"
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add <code>ENV PYTHONUNBUFFERED=1</code> and the two <code>LABEL</code> lines to your Dockerfile, and rebuild.</li>
    <li>Add <code>ARG APP_VERSION=dev</code> above <code>FROM</code>, then <code>ENV APP_VERSION=${APP_VERSION}</code> after it. Rebuild with <code>--build-arg APP_VERSION=1.0</code>.</li>
    <li>Confirm the value arrived: <code>docker run --rm myapp:1.0 env | grep APP_VERSION</code>.</li>
    <li>Override it at run time: <code>docker run --rm -e APP_VERSION=hotfix myapp:1.0 env | grep APP_VERSION</code>.</li>
  </ol>
  <em><code>1.0</code> from the build argument, then <code>hotfix</code> from the run-time flag. You have just seen the two-stage configuration model that the whole "build once, run anywhere" idea depends on: bake a default, override per environment.</em>
</div>

## Layers: why `COPY` order decides your build time

This is the single biggest speed lever a beginner can pull, and it takes one minute to apply.

Every instruction in a Dockerfile produces a **layer** — a record of what changed in the filesystem. An image is those layers stacked on top of each other, read-only. A container adds one thin writable layer on top of the stack.

<div class="flow">
  <div class="node">FROM<small>base layers</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">COPY<small>+ a diff</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">RUN<small>+ a diff</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">CONTAINER<small>+ writable layer</small></div>
</div>

Docker caches layers. When you rebuild, it walks the instructions from the top and reuses each layer whose inputs have not changed. **The moment one layer is invalidated, every layer after it must be rebuilt.**

Now the consequence. Your source code changes constantly; your dependency list barely ever changes. So the order of two instructions decides whether every build reinstalls all your dependencies:

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Fast — dependencies first</h4>
    <ul>
      <li><code>COPY requirements.txt .</code></li>
      <li><code>RUN pip install …</code></li>
      <li><code>COPY . .</code></li>
      <li>Editing source reuses the cached install</li>
      <li>Rebuild: a couple of seconds</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Slow — everything first</h4>
    <ul>
      <li><code>COPY . .</code></li>
      <li><code>RUN pip install …</code></li>
      <li>Any source edit invalidates the install layer</li>
      <li>Every build reinstalls everything</li>
      <li>Rebuild: a couple of minutes</li>
    </ul>
  </div>
</div>

The same reasoning applies inside a single `RUN`. Package manager metadata and cleanup must happen in the *same* instruction, because a later instruction cannot remove anything from an earlier layer:

```dockerfile
# Wrong: the stale package index gets cached, and the lists stay in the image
RUN apt-get update
RUN apt-get install -y curl

# Right: one layer, cleaned up inside that same layer
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*
```

<div class="callout warn">
  <span class="ct">Layers are additive — deleting does not shrink</span>
  A file added in one layer and deleted in a later one is <b>still in the image</b>, and still readable by anyone who can pull it. This is why <code>COPY .env .</code> followed by <code>RUN rm .env</code> does not remove the secret; it just hides it from a casual look. Mid and Senior levels return to this, because it is the mechanism behind most leaked credentials in images.
</div>

You can see the layers you built:

```bash
docker history myapp:1.0                  # every layer, its size, and the instruction
docker image inspect myapp:1.0 --format '{{.Size}}'
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Build your image, then change one character in <code>app.py</code> and build again. Time it.</li>
    <li>Now swap the order: put <code>COPY . .</code> <em>before</em> the <code>pip install</code> line. Build, edit one character, build again. Time it.</li>
    <li>Put the ordering back, then run <code>docker history myapp:1.0</code> and find the biggest layer.</li>
    <li>Watch the build output for the words <code>CACHED</code> — that is Docker telling you which layers it skipped.</li>
  </ol>
  <em>a rebuild that takes a second or two in one ordering and a full reinstall in the other. Seeing <code>CACHED</code> disappear from your build output the moment you move one line is the clearest possible demonstration of why layer order is a design decision.</em>
</div>

## The build context and `.dockerignore`

When you run `docker build -t myapp .`, that trailing dot is not "the Dockerfile" — it is the **build context**, the directory that gets packaged up and sent to the Docker daemon before the build even starts.

That has two consequences people discover the hard way. First, it is slow if the folder is large: `.git`, `node_modules`, a virtualenv, build output, and datasets all get transferred. Second, and more seriously, **anything in the context can end up in the image** — including the `.env` file you never meant to ship.

`.dockerignore` fixes both. It sits next to your Dockerfile and uses the same syntax as `.gitignore`.

```text .dockerignore
# Version control and tooling
.git
.gitignore
.github

# Dependencies — reinstalled inside the image
node_modules
__pycache__
*.pyc
.venv
venv

# Local configuration and secrets
.env
.env.*
*.pem
*.key

# Build output and noise
dist
build
*.log
coverage
.pytest_cache

# Editor and OS files
.vscode
.idea
.DS_Store
```

Write this **before your first build**, not after your first slow build. It is the cheapest file in your project.

<div class="callout tip">
  <span class="ct">Confirm what actually landed in the image</span>
  <code>docker run --rm myapp:1.0 ls -la /app</code> lists what is really there. This one command settles both "is my file missing because of <code>.dockerignore</code>?" and "did I accidentally ship <code>.env</code>?" — and it is much faster than reasoning about it.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Note the "transferring context" size in your build output.</li>
    <li>Create a large junk file in your project: <code>dd if=/dev/zero of=big.bin bs=1M count=200</code> (or any 200 MB file). Rebuild and compare the context size.</li>
    <li>Add <code>big.bin</code> to <code>.dockerignore</code> and rebuild.</li>
    <li>Run <code>docker run --rm myapp:1.0 ls -la /app</code> and confirm <code>big.bin</code> is not inside.</li>
  </ol>
  <em>the context jumps by 200 MB and the build visibly slows, then returns to normal once the file is ignored. That "transferring context" line is worth glancing at on every build — it is an early warning that something large has crept into your project.</em>
</div>

## `CMD` versus `ENTRYPOINT`

Both describe what runs when the container starts, and the difference between them is a favourite interview question because it reveals whether you have actually shipped an image.

| | `CMD` | `ENTRYPOINT` |
|---|---|---|
| Is | The default command | The fixed executable |
| Arguments after `docker run img` | **Replace** it entirely | Are **appended** to it |
| Use for | A default that users may want to change | A container that always runs one program |

```dockerfile
# CMD only: the whole command is a default
CMD ["uvicorn", "app:app", "--host", "0.0.0.0"]
# docker run myapp                 → runs uvicorn
# docker run myapp python -V       → runs python -V instead

# ENTRYPOINT + CMD: fixed program, default arguments
ENTRYPOINT ["uvicorn", "app:app"]
CMD ["--host", "0.0.0.0", "--port", "8000"]
# docker run myapp                 → uvicorn app:app --host 0.0.0.0 --port 8000
# docker run myapp --port 9000     → uvicorn app:app --port 9000
```

The pairing in the second example is the pattern worth copying for a real service: `ENTRYPOINT` names the program, `CMD` supplies arguments a user might reasonably want to override.

There is a second, less obvious distinction that matters more than the first one — **exec form versus shell form**.

```dockerfile
CMD ["node", "server.js"]     # exec form (a JSON array): your process is PID 1
CMD node server.js            # shell form: PID 1 is /bin/sh, which runs your process
```

<div class="callout warn">
  <span class="ct">Always use the exec form (a JSON array)</span>
  With the shell form, process 1 inside the container is <code>/bin/sh</code>, and it does <b>not</b> pass signals on to your application. So <code>docker stop</code> sends <code>SIGTERM</code>, your app never sees it, and ten seconds later Docker kills the container hard — mid-request, mid-transaction. Note the syntax detail too: the array uses <b>double quotes</b>, because it is JSON. Single quotes are a build error.
</div>

`--entrypoint` on `docker run` overrides `ENTRYPOINT`, which is the single most useful debugging flag in Docker:

```bash
docker run -it --entrypoint sh myapp:1.0     # skip the app, get a shell, look around
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Build an image whose only instruction after <code>FROM alpine</code> is <code>CMD ["echo", "default"]</code>. Run it with no arguments, then as <code>docker run img echo replaced</code>.</li>
    <li>Change it to <code>ENTRYPOINT ["echo"]</code> plus <code>CMD ["default"]</code>. Run both ways again.</li>
    <li>Now run <code>docker run -it --entrypoint sh yourimage</code> and confirm you get a shell instead of the echo.</li>
  </ol>
  <em>with <code>CMD</code> alone your argument replaces everything; with <code>ENTRYPOINT</code> it is appended to <code>echo</code>. And <code>--entrypoint sh</code> bypasses both — remember that flag, it is how you get inside an image that crashes on startup.</em>
</div>

## Ports and publishing

A container has its own network namespace, which means its ports are its own. Nothing on your machine can reach them until you publish one.

<div class="flow">
  <div class="node">YOUR BROWSER<small>localhost:8080</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">-p 8080:80<small>host : container</small></div>
  <span class="arrow">&rarr;</span>
  <div class="node">CONTAINER<small>nginx on 80</small></div>
</div>

```bash
docker run -d -p 8080:80 nginx            # localhost:8080 → container port 80
docker run -d -p 3000:3000 myapp          # same port on both sides
docker run -d -p 127.0.0.1:8080:80 nginx  # only reachable from this machine
docker run -d -P nginx                    # publish every EXPOSEd port to random host ports
docker port web                            # what is actually mapped
```

The order is **host first, container second**. Getting it backwards is a classic, and the error it produces is not obvious — you get a container that appears to run but refuses connections.

Two rules cover almost every port problem you will hit:

**Inside a container, your app must listen on `0.0.0.0`.** Not `127.0.0.1`, and not `localhost`. Binding to loopback inside a container means "reachable only from inside this container", so `-p` appears to do nothing at all. Most frameworks default to loopback, which is why nearly every containerised app command has a `--host 0.0.0.0` in it.

**One host port can only be used once.** `bind: address already in use` means something else — often a previous container you forgot to remove — already has it. `docker ps` then `docker rm -f` clears it.

<div class="callout warn">
  <span class="ct">The most common "port mapping doesn't work" cause</span>
  Your app is listening on <code>127.0.0.1</code> inside the container. Confirm it from inside: <code>docker exec web sh -c 'netstat -tlnp 2>/dev/null || ss -tlnp'</code>. If the address column shows <code>127.0.0.1:8000</code> rather than <code>0.0.0.0:8000</code>, the mapping was never the problem.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run your app bound to loopback on purpose: change the command to <code>--host 127.0.0.1</code> and run with <code>-p 8000:8000</code>. Visit the page and watch it fail.</li>
    <li>From inside, check what is listening: <code>docker exec NAME sh -c 'ss -tlnp || netstat -tlnp'</code>.</li>
    <li>Change it back to <code>0.0.0.0</code> and confirm it works.</li>
    <li>Now try to start a second container on the same host port and read the error.</li>
  </ol>
  <em>a refused connection that looks exactly like a broken port mapping, and an <code>ss</code> output showing <code>127.0.0.1:8000</code> as the reason. Then a clear "address already in use" for the duplicate. Those are two of the three port errors you will ever see.</em>
</div>

## Configuration: environment variables and files

An image should be built **once** and then run in development, staging, and production without modification. That only works if everything environment-specific arrives at run time.

```bash
docker run -e LOG_LEVEL=debug -e DATABASE_URL="$DB_URL" myapp:1.0
docker run --env-file ./local.env myapp:1.0
docker run --rm myapp:1.0 env                  # see what the container actually got
```

```text local.env
LOG_LEVEL=debug
DATABASE_URL=postgres://postgres:secret@db:5432/app
FEATURE_NEW_CHECKOUT=true
```

The mechanisms and where each one belongs:

| Mechanism | Set at | Visible in the image | Use for |
|---|---|---|---|
| `ENV` in the Dockerfile | Build | **Yes** | Sensible non-secret defaults |
| `ARG` + `--build-arg` | Build only | **Yes**, in `docker history` | Base versions, build flags |
| `-e KEY=value` | Run | No | Per-environment configuration |
| `--env-file` | Run | No | Many values at once, locally |
| A mounted file | Run | No | Credentials |

<div class="callout warn">
  <span class="ct">Neither <code>ENV</code> nor <code>ARG</code> is a secret</span>
  Both are recorded in image metadata and readable with <code>docker history</code> by anyone who can pull the image. A password passed as a build argument is in that history forever, and deleting the file in a later layer does not help. At this level the rule is simple: <b>secrets arrive at run time, never at build time.</b> Senior level covers the proper build-time mechanism.
</div>

Precedence, most specific first: `-e` on the command line beats `--env-file`, which beats `ENV` in the Dockerfile. That layering is exactly what makes one image work everywhere.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Add <code>ENV LOG_LEVEL=info</code> to your Dockerfile and rebuild.</li>
    <li>Run <code>docker run --rm myapp:1.0 env | grep LOG_LEVEL</code> — the baked default.</li>
    <li>Run it again with <code>-e LOG_LEVEL=debug</code> and confirm the override wins.</li>
    <li>Write a <code>local.env</code> with three variables, run with <code>--env-file local.env</code>, and confirm all three arrived.</li>
    <li>Now check whether a build argument is really invisible: add <code>ARG DEMO_TOKEN=abc</code>, rebuild, and run <code>docker history --no-trunc myapp:1.0 | grep DEMO_TOKEN</code>.</li>
  </ol>
  <em>the override behaves as expected — and the last step finds your build argument sitting in the image history in plain text. Seeing that yourself is far more persuasive than being told "don't put secrets in <code>ARG</code>".</em>
</div>

## Logs, and getting inside a container

Two commands cover almost all day-to-day investigation.

```bash
docker logs web                  # everything the container has printed
docker logs -f --tail 50 web     # follow, starting from the last 50 lines
docker logs --since 10m web      # only the last ten minutes
docker logs -t web               # with timestamps

docker exec -it web sh           # a shell inside a RUNNING container
docker exec web env              # run one command without a shell session
docker exec -u root -it web sh   # as root, when you need to install a debug tool
```

`docker logs` reads whatever the container's main process wrote to **stdout and stderr**. That is the whole mechanism, and it has one important implication: if your app writes to a log file inside the container instead, `docker logs` shows nothing and your logs die with the container.

<div class="callout tip">
  <span class="ct">Log to stdout, always</span>
  It is what <code>docker logs</code> reads, what every log shipper collects, and what every orchestrator expects. Writing to a file inside a container hides your logs, fills the writable layer, and gains you nothing. Most frameworks do this by default; if yours writes to a file, change the configuration rather than working around it.
</div>

<div class="callout tip">
  <span class="ct">If <code>bash</code> is not found, use <code>sh</code></span>
  Slim and Alpine images frequently have no bash. <code>docker exec -it NAME sh</code> works nearly everywhere. If an image has no shell at all — a distroless or scratch image — you cannot exec into it, and that is deliberate rather than broken.
</div>

Three more commands complete the toolkit:

```bash
docker inspect web               # resolved config: entrypoint, env, mounts, network, state
docker stats                     # live CPU and memory, per container
docker cp web:/etc/nginx/nginx.conf ./     # copy a file out to look at it properly
```

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Start your app and run <code>docker logs -f NAME</code> in one terminal while you hit the endpoint from another.</li>
    <li>Get a shell inside it and explore: <code>ls -la /app</code>, <code>env</code>, <code>ps aux</code>, <code>cat</code> a config file.</li>
    <li>Change your app to write a log line to a file instead of stdout, rebuild, and confirm <code>docker logs</code> is now empty.</li>
    <li>Copy that file out with <code>docker cp</code> to prove the lines really were written.</li>
  </ol>
  <em>live log streaming, then a container whose logs are invisible to Docker even though the app is working fine. That contrast is the argument for stdout logging, and you now have it first-hand.</em>
</div>

## Keeping data: volumes

Delete a container and its writable layer goes with it. Anything you want to survive must live in a **volume**.

```bash
# Named volume — Docker manages the storage. Right for databases and app state.
docker run -d --name db \
  -e POSTGRES_PASSWORD=secret \
  -v pgdata:/var/lib/postgresql/data \
  postgres:16

# Bind mount — a real folder on your machine. Right for live-reload development.
docker run -d -p 8000:8000 -v "$(pwd)":/app myapp:dev

# Read-only mount, for configuration the container must not change
docker run -d -v ./config.yaml:/etc/app/config.yaml:ro myapp:1.0

docker volume ls
docker volume inspect pgdata
docker volume rm pgdata          # only works if no container is using it
```

<div class="guide-compare">
  <div class="guide-compare-col good">
    <h4>Named volume</h4>
    <ul>
      <li><code>-v pgdata:/var/lib/postgresql/data</code></li>
      <li>Docker owns the storage location</li>
      <li>Portable across machines and hosts</li>
      <li>Ownership initialised correctly for you</li>
      <li>Right for databases and app state</li>
    </ul>
  </div>
  <div class="guide-compare-col bad">
    <h4>Bind mount</h4>
    <ul>
      <li><code>-v "$(pwd)":/app</code></li>
      <li>A real folder on your host</li>
      <li>Host-path dependent, so not portable</li>
      <li>Permission-sensitive: keeps the host's ownership</li>
      <li>Right for development, wrong for production data</li>
    </ul>
  </div>
</div>

The distinction is worth stating plainly because it decides real outcomes: a **named volume** is storage Docker created and manages, referenced by a name; a **bind mount** is a path on your machine grafted into the container. Named volumes survive `docker rm`, move with your project, and get sensible permissions. Bind mounts are for when you *want* the host's actual files — chiefly so your editor and the container see the same source code.

<div class="callout warn">
  <span class="ct">A bind mount hides whatever was already there</span>
  Mounting your project folder over <code>/app</code> replaces the image's <code>/app</code> entirely, including anything installed there during the build. For Node projects this is the notorious <code>node_modules</code> disappearance. The fix is an anonymous volume over the subdirectory — the Tips section shows it.
</div>

<div class="guide-try">
  <span class="ct">Try it — the one that makes it stick</span>
  <ol>
    <li>Run Postgres with <strong>no</strong> volume, create a table with <code>docker exec</code>, then <code>docker rm -f</code> it and start it again. Look for your table.</li>
    <li>Now run it with <code>-v pgdata:/var/lib/postgresql/data</code>, create the table again, remove the container, and start a new one with the same volume.</li>
    <li>Run <code>docker volume ls</code> and <code>docker volume inspect pgdata</code>.</li>
    <li>Finally, bind-mount your source into your app container and edit a file on your host while it is running.</li>
  </ol>
  <em>the table is gone in the first case and present in the second, from a completely different container. Destroying your own data once, deliberately, is the fastest way to never do it accidentally.</em>
</div>

## Networking: how containers find each other

One container is rarely enough. As soon as you have an app and a database, they need to talk — and the way they find each other surprises everyone once.

```bash
docker network create appnet

docker run -d --name db  --network appnet -e POSTGRES_PASSWORD=secret postgres:16
docker run -d --name api --network appnet -p 8000:8000 \
  -e DATABASE_URL=postgres://postgres:secret@db:5432/postgres myapp:1.0
```

The connection string says **`db`**, not `localhost`. On a network you created, Docker runs a DNS server and every container is reachable by its name. That is the whole mechanism.

| Network | Behaviour |
|---|---|
| `bridge` (the default) | Containers get IPs, but **no name resolution** |
| A network you create | Same, **plus automatic DNS by container name** |
| `host` | No network isolation at all; the container uses the host's stack |
| `none` | No networking |

The important row is the first two. If you never create a network, your containers land on the default bridge, where names do not resolve and you are left using IP addresses. Creating a network is one command and it is why Compose — which does it for you — feels so much easier.

<div class="callout warn">
  <span class="ct">Inside a container, <code>localhost</code> means <em>that container</em></span>
  It is the single most common networking mistake. A container cannot reach a sibling on <code>localhost</code>, and it cannot reach a service running on your host machine that way either. Use the container name for a sibling; use <code>host.docker.internal</code> to reach your host from inside a container on Docker Desktop.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Start two containers with <strong>no</strong> network flag, then from one run <code>docker exec -it NAME sh</code> and try <code>ping other</code>. It fails to resolve.</li>
    <li>Now <code>docker network create appnet</code> and start both with <code>--network appnet</code>. Try <code>ping other</code> again.</li>
    <li>From inside the app container, try <code>wget -qO- http://localhost:5432</code> and then <code>wget -qO- http://db:5432</code>.</li>
    <li>Run <code>docker network inspect appnet</code> and find both containers listed.</li>
  </ol>
  <em>name resolution fails on the default bridge and works on your own network. And <code>localhost</code> from inside the app container reaches nothing, because it means the app container itself — the single most valuable networking fact at this level.</em>
</div>

## Do not run as root

By default the process inside a container runs as root. Adding a user is two lines and it is the highest-value security change available to a beginner.

```dockerfile Dockerfile
FROM python:3.11-slim

# Create a real user with a fixed numeric id
RUN useradd --create-home --uid 10001 appuser

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Give the app's files to that user as they are copied
COPY --chown=appuser:appuser . .

USER 10001                     # everything after this runs unprivileged

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

Two details in there are deliberate. `USER` comes **after** the installs, because `pip install` into system directories needs the privileges you are about to drop. And the id is numeric rather than a name, because that form is unambiguous to tooling and to orchestrators.

<div class="callout warn">
  <span class="ct">Root in a container is root on the host kernel</span>
  There is no hypervisor between them. If a process escapes its container — through a kernel bug, a careless mount, or an over-permissive flag — it lands on the host with whatever privileges it had inside. That is why "it's only a container" is not a security argument, and why these two lines matter more than their length suggests. Senior level covers the full picture.
</div>

Order matters, and getting it wrong produces permission errors that look mysterious:

| Do | Why |
|---|---|
| Install dependencies before `USER` | Installing to system paths needs privilege |
| `COPY --chown=…` | Otherwise files are root-owned and your user cannot write them |
| Use a numeric uid in `USER` | Unambiguous, and survives image inspection tooling |
| Listen on a port above 1024 | Binding below 1024 requires privilege |

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run <code>docker run --rm myapp:1.0 id</code> before adding a user. Note <code>uid=0(root)</code>.</li>
    <li>Add the three lines above, rebuild, and run <code>id</code> again.</li>
    <li>Try to write somewhere privileged from inside: <code>docker run --rm myapp:1.0 sh -c 'touch /etc/test'</code>.</li>
    <li>Now put <code>USER 10001</code> <em>before</em> the <code>pip install</code> line and rebuild, to see the failure that ordering causes.</li>
  </ol>
  <em>root first, then <code>uid=10001</code>, then a clean "permission denied" proving the restriction is real, then a failed build proving why <code>USER</code> goes last. Four short runs and you understand the whole pattern.</em>
</div>

## Docker Compose: many containers, one file

By now a single `docker run` line has six flags on it, and you have two containers plus a network to start in the right order. That is what Compose is for: it moves everything you were typing into a file you commit.

```yaml compose.yaml
services:
  api:
    build: .                                # build from the Dockerfile here
    ports: ['8000:8000']
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/app
      LOG_LEVEL: debug
    depends_on: [db]
    restart: unless-stopped

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
docker compose up -d          # build if needed, create the network, start everything
docker compose ps             # what is running, and its health
docker compose logs -f api    # follow one service
docker compose exec api sh    # a shell in a service
docker compose down           # stop and remove containers and the network
docker compose down -v        # …and delete the named volumes too
```

Every key in that file maps to something you already know:

| Compose key | The `docker run` equivalent |
|---|---|
| `build: .` | `docker build -t … .` |
| `image:` | The image argument |
| `ports:` | `-p` |
| `environment:` / `env_file:` | `-e` / `--env-file` |
| `volumes:` | `-v` |
| `restart:` | `--restart` |
| `depends_on:` | Nothing — Compose adds startup ordering |
| The service name | `--name`, **and** the DNS hostname |

Two things Compose gives you for free are worth calling out. It **creates a network** and puts every service on it, so `api` reaches the database at the hostname `db` with no configuration at all. And it makes the whole stack one unit: `up`, `down`, `logs`, and `ps` operate on all of it.

<div class="callout warn">
  <span class="ct"><code>depends_on</code> waits for <em>started</em>, not <em>ready</em></span>
  It waits for the database container to start, not for Postgres inside it to accept connections — and those are several seconds apart. So your app's first query fails on a cold start, intermittently, in a way that looks like a bug in your code. Mid-level fixes this properly with health checks; for now, know that the gap exists and that retrying the connection in your app is the right instinct.
</div>

<div class="callout tip">
  <span class="ct">Use Compose even for a single service</span>
  A <code>compose.yaml</code> documents the ports, environment, and volumes that would otherwise live only in your shell history. "How do I run this?" becomes <code>docker compose up</code> — which is also the answer you want in your README.
</div>

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Write the <code>compose.yaml</code> above for your app and run <code>docker compose up</code> in the foreground so you can read both services' logs interleaved.</li>
    <li>Stop it with Ctrl+C, then start it detached with <code>-d</code> and use <code>docker compose ps</code> and <code>docker compose logs -f api</code>.</li>
    <li>Run <code>docker compose exec api sh</code> and from inside it try to reach the database by name.</li>
    <li>Run <code>docker compose down</code>, then <code>docker volume ls</code> — the volume is still there. Now <code>docker compose down -v</code> and check again.</li>
  </ol>
  <em>two services started by one command, reachable from each other by name, and a volume that survives <code>down</code> but not <code>down -v</code>. That last distinction is worth burning in: <code>-v</code> is how people delete their local database by accident.</em>
</div>

## Debugging a container that will not start

This is the skill everything else depends on, and it has an order. Work down the list rather than guessing.

<ol class="guide-steps">
  <li><b>Read the logs</b><code>docker logs NAME</code>. An exited container keeps its output until you remove it, so this works even after a crash. Most failures explain themselves here and you can stop at step one.</li>
  <li><b>Check the exit code</b><code>docker ps -a</code> shows it in the STATUS column. <b>0</b> = finished normally · <b>1</b> = application error · <b>125</b> = bad <code>docker run</code> flags · <b>126</b> = command not executable · <b>127</b> = command not found · <b>137</b> = killed, usually out of memory · <b>143</b> = stopped by SIGTERM.</li>
  <li><b>Override the entrypoint and look around</b><code>docker run -it --entrypoint sh myapp:1.0</code> starts the image <em>without</em> running your app, so you can inspect it and try the command by hand.</li>
  <li><b>Check the file is where you think it is</b>Inside that shell: <code>pwd</code>, <code>ls -la</code>, <code>cat</code> the config. A wrong <code>WORKDIR</code> or a file excluded by <code>.dockerignore</code> explains most "not found" errors.</li>
  <li><b>Run the command manually</b>Type the exact <code>CMD</code> yourself in that shell. The error message you get interactively is usually far more informative than the one in the logs.</li>
  <li><b>Inspect the resolved configuration</b><code>docker inspect NAME</code> shows the real entrypoint, command, environment, mounts, and networks after every default and override has been applied. This settles "but I set that".</li>
</ol>

```bash
# 127 = command not found: is the binary there, and is PATH right?
docker run -it --entrypoint sh myapp:1.0
> which uvicorn
> ls -la /app
> echo "$PATH"

# 137 = killed, almost always the memory limit
docker inspect NAME --format '{{.State.ExitCode}} {{.State.OOMKilled}}'

# "but I set that environment variable"
docker inspect NAME --format '{{range .Config.Env}}{{println .}}{{end}}'
```

<div class="callout tip">
  <span class="ct">Run it in the foreground first</span>
  When something new does not work, drop the <code>-d</code>. Watching a container fail in your terminal, with its output arriving live, is almost always faster than starting it detached and then going to fetch the logs.
</div>

<div class="guide-try">
  <span class="ct">Try it — cause each failure on purpose</span>
  <ol>
    <li>Produce a <b>127</b>: change <code>CMD</code> to a binary that does not exist, rebuild, run, and read the exit code.</li>
    <li>Produce a <b>1</b>: make your app raise an exception on startup.</li>
    <li>Produce a <b>137</b>: run with <code>-m 16m</code> so it is killed by the memory limit, then confirm with the <code>OOMKilled</code> format string.</li>
    <li>For each one, get to the answer using the steps above rather than by remembering what you broke.</li>
  </ol>
  <em>three recognisable failures and three distinct exit codes. Having produced them deliberately, you will recognise each instantly when it happens for real — which is the difference between a five-minute fix and a lost afternoon.</em>
</div>

## Keeping your machine clean: prune and reclaim

Docker accumulates. Images you pulled once, containers you forgot to remove, build cache, and volumes from projects you stopped last spring — and then one day a build fails with `no space left on device`.

```bash
docker system df                 # what is using space, by category
docker system df -v              # per-image, per-container, per-volume detail

docker ps -a                     # stopped containers still hold their writable layer
docker container prune           # remove all stopped containers
docker image prune               # remove dangling (untagged) images
docker builder prune             # remove build cache
docker system prune              # containers, networks, dangling images, build cache
```

Start with `docker system df`. It tells you which category is actually large, so you can stop guessing. Usually it is either the build cache or images.

<div class="callout warn">
  <span class="ct"><code>--volumes</code> deletes your data</span>
  <code>docker system prune -a --volumes</code> removes unused volumes, and "unused" includes the database of a project you are not running right now. Run <code>docker volume ls</code> and look at the list before you type it. This is the one Docker command that can lose work you cannot get back.
</div>

Worth understanding: a **dangling** image is one with no tag, usually because you rebuilt the same tag and the old image lost its name. Those are safe to remove. `docker image prune -a` is more aggressive — it removes every image not used by a container, which means re-pulling next time.

<div class="guide-try">
  <span class="ct">Try it</span>
  <ol>
    <li>Run <code>docker system df</code> and note the reclaimable figure in each row.</li>
    <li>Run <code>docker ps -a</code> and count how many stopped containers you have accumulated during this guide.</li>
    <li>Run <code>docker container prune</code> and then <code>docker image prune</code>, and compare <code>docker system df</code> before and after.</li>
    <li>Run <code>docker volume ls</code> and identify which volumes you would lose to a <code>--volumes</code> prune.</li>
  </ol>
  <em>usually more reclaimable space than expected, and a list of volumes that makes the warning above concrete. Getting into the habit of running <code>system df</code> occasionally is what stops "no space left on device" from ever surprising you.</em>
</div>

## Putting it all together

Everything above, in one project. Nothing here is new — read it as a whole and you should recognise every line and be able to say why it is there.

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
# Pinned and slim: reproducible, and a fraction of the full image's size
FROM python:3.11-slim

# Unbuffered stdout, so `docker logs` shows lines as they happen
ENV PYTHONUNBUFFERED=1 \
    LOG_LEVEL=info

# A real non-root user with a fixed numeric id
RUN useradd --create-home --uid 10001 appuser

WORKDIR /app

# Dependencies first — this layer stays cached while you edit source
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Source last, owned by the app's user
COPY --chown=appuser:appuser . .

# Drop privileges after everything that needed them
USER 10001

# Documentation only; `-p` or Compose `ports:` is what publishes
EXPOSE 8000

# Exec form, so the app is PID 1 and receives SIGTERM.
# 0.0.0.0, so the published port actually reaches it.
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml compose.yaml
services:
  api:
    build: .
    ports: ['8000:8000']
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/app
      LOG_LEVEL: debug              # override of the image's baked default
    depends_on: [db]                # startup order (readiness comes at Mid level)
    restart: unless-stopped

  db:
    image: postgres:16              # pinned major version
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: app
    volumes: ['pgdata:/var/lib/postgresql/data']   # named volume: state survives
    restart: unless-stopped

volumes:
  pgdata:
```

```bash
docker compose up -d --build      # build the image and start both services
docker compose logs -f api        # watch it come up
docker compose exec api sh        # get inside when something looks wrong
docker compose down               # stop everything; the database volume survives
```

Ten decisions in there are the whole lesson of this page, and each maps to a section above:

| Line | Why it is there |
|---|---|
| `.dockerignore` written first | Smaller context, and `.env` never reaches the image |
| `FROM python:3.11-slim` | Pinned, not `:latest`; slim, not the full 1 GB base |
| `ENV PYTHONUNBUFFERED=1` | `docker logs` shows output immediately |
| `COPY requirements.txt` before source | The expensive install layer stays cached |
| `--no-cache-dir` | pip's wheel cache is dead weight in the image |
| `COPY --chown` + `USER 10001` | The process is not root |
| `EXPOSE 8000` | Documents the port; publishing is separate |
| Exec-form `CMD` | The app is PID 1, so `docker stop` is graceful |
| `--host 0.0.0.0` | The published port reaches the app |
| Named volume for Postgres | The data outlives the container |

<div class="guide-try">
  <span class="ct">Try it — the one that matters</span>
  <ol>
    <li>Take this setup into a project you actually wrote, adapting the base image and commands to your language.</li>
    <li>Get it running with <code>docker compose up -d --build</code>, then confirm from inside the api container that it can reach <code>db</code>.</li>
    <li>Verify three things deliberately: <code>docker run --rm yourimage id</code> shows a non-root uid; a source edit rebuilds in seconds; and <code>docker compose down</code> followed by <code>up</code> keeps your database contents.</li>
    <li>Write a three-line "Running locally" section in your README that is just the commands above.</li>
  </ol>
  <em>a containerised project on real code, with cached rebuilds, a non-root process, and data that survives. This exercise is worth more than the rest of the page combined — and the README section is what makes it useful to somebody other than you.</em>
</div>

## What you can now do, and what comes next

You can explain what a container is and is not, build an image from a Dockerfile, order it so rebuilds are fast, publish ports correctly, configure one image for several environments, keep data in volumes, connect containers by name, run as a non-root user, start a multi-service stack with Compose, debug a container that refuses to start, and keep your disk under control. That is a working practitioner's toolkit — enough to containerise real projects and own the Dockerfiles in a repository.

| Can you… | |
|---|---|
| Explain a container versus a VM? | Shared kernel, a process with a restricted view |
| Explain an image versus a container? | Read-only template versus running instance |
| Say why `docker run ubuntu` exits at once? | The main process finished |
| Say what `EXPOSE` does? | Documents — `-p` publishes |
| Order a Dockerfile for fast rebuilds? | Dependency manifest before source |
| Say why deleting a file in a later layer is not enough? | Layers are additive |
| Fix "the published port refuses connections"? | Listen on `0.0.0.0` |
| Keep a database's data? | A named volume |
| Make two containers talk? | A user-defined network, address by name |
| Get a shell in an image that crashes on start? | `--entrypoint sh` |
| Read a container's real configuration? | `docker inspect --format` |
| Start an app plus its database with one command? | `docker compose up -d` |

**Mid-level takes every one of those topics further** — the layer cache's exact rules and how to make it work in CI, multi-stage builds that cut image size by an order of magnitude, network drivers and DNS in depth, volume backup and permission handling, Compose with health checks and per-environment override files, signals and graceful shutdown, registries and immutable tags, and debugging with `docker diff`, `docker events`, and a network sidecar.

**Senior then covers what you own when containers are your responsibility**: what namespaces, cgroups, and capabilities actually give you, hardening an image so an escape is bounded, keeping secrets out of layers with BuildKit mounts, supply-chain controls including SBOMs, scanning, signing, and provenance, multi-architecture builds, resource limits and the OOM killer, GPU and machine-learning images, where Docker stops and an orchestrator begins, and debugging production while it is on fire.
