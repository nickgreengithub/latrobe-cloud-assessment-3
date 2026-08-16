# Deploying to EC2

The whole stack — application, OpenTelemetry Collector, Jaeger and Prometheus
— runs from one `docker compose up`. What follows is the sequence that works
on an AWS Academy Learner Lab account.

## 1. Instance

| Setting | Value | Why |
|---|---|---|
| AMI | Amazon Linux 2023 | Docker installs from the default repositories |
| Type | **t3.large** (2 vCPU, 8 GB) | The app is ~500 MB and the collector, Jaeger and Prometheus are ~1 GB together. A 1 GB instance runs out of memory partway through starting the stack |
| Storage | **30 GB** gp3 | The default 8 GB fills while pulling images |
| Key pair | your own `.pem` | `chmod 400 the-key.pem` before use |

### Security group

Open each port **with a description**. An unlabelled open port is the first
thing anyone reviewing the instance will ask about, and you will not remember.

| Port | Description to enter |
|---|---|
| 22 | SSH — admin access |
| 3000 | RSS server — application and API |
| 16686 | Jaeger UI — trace inspection |
| 9090 | Prometheus — metrics queries |
| 4318 | OTLP/HTTP — collector ingest |

Ports 16686, 9090 and 4318 are open here because the demonstration needs them
reachable from a browser. On anything real they would stay closed and be
reached through the VPC or an SSH tunnel — telemetry endpoints expose how the
system is built, and Prometheus has no authentication of its own.

## 2. Install Docker

```bash
ssh -i the-key.pem ec2-user@<public-ip>

sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user

# Compose v2 as a CLI plugin
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/download/v2.32.4/docker-compose-linux-aarch64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
```

Log out and back in so the `docker` group membership takes effect, then check
`docker compose version`.

> On an x86 instance type, use the `docker-compose-linux-x86_64` asset instead.

## 3. Clone and configure

```bash
git clone https://github.com/nickgreengithub/latrobe-cloud-assessment-3.git
cd latrobe-cloud-assessment-3
```

**`SITE_URL` must be edited before starting.** It is the host written into
every `<link>` and `<guid>` in the published RSS. Left at `localhost`, the
feed validates but every link in it points at the subscriber's own machine.

In `docker-compose.yml`:

```yaml
SITE_URL: "http://<public-ip>:3000"
```

## 4. Start

```bash
docker compose up -d --build
docker compose ps          # all four services Up
```

The first build takes several minutes. Migrations and the seed run
automatically from `docker-entrypoint.sh` on every start.

## 5. Verify — from your own machine, not the instance

This is the step that matters. The application is server-rendered, but the
dashboard and the RSS client fetch from the browser, so they run on the
viewer's machine. Anything that resolves only inside the container or only on
localhost works perfectly over SSH and fails completely for anyone else.

```bash
curl -i http://<public-ip>:3000/api/health          # 200, database connected
curl    http://<public-ip>:3000/rss | head -20      # RSS 2.0
curl -s http://<public-ip>:3000/api/metrics | head  # Prometheus text
```

Then in a browser **on a different device**:

- `http://<public-ip>:3000/dashboard` — tiles populated, counters moving
- `http://<public-ip>:3000/client` — fetch a feed, items render
- `http://<public-ip>:16686` — service `rss-server`, custom `rss.*` spans
- `http://<public-ip>:9090/targets` — all three targets `up`

If the dashboard renders but stays empty, open the browser console. A failed
request to `localhost:3000` there is the symptom of the problem above.

## 6. Cost

The instance is the only thing that costs meaningfully — roughly US$0.08/hour
for a t3.large. **Stop it when not demonstrating.** Data on the volume
survives a stop; a terminate destroys it.

```bash
docker compose down          # stop the stack, keep the data volume
docker compose down -v       # also delete the database
```

## Before the live demonstration

- Start the instance and the stack **at least ten minutes early**. Cold boot,
  image pull and the first Next.js request together take longer than a slot
  allows, and the assessment is not waiting on a build.
- Generate some traffic first (`./load/run-stages.sh` at x10, or just poll a
  few feeds) so the dashboard has something to show. A dashboard reading zero
  demonstrates nothing.
- Have `docker compose ps`, `docker compose logs -f rss-server` and a shell
  into the database ready in separate tabs:

```bash
docker compose exec rss-server sh -c \
  'apk add --no-cache sqlite 2>/dev/null; sqlite3 /data/rss.db \
   "select feedSlug, count(*) from RequestLog group by feedSlug;"'
```

  Being able to show the rows behind the dashboard, rather than only the
  dashboard, is the difference between claiming persistence and proving it.
