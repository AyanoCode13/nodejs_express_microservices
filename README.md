# Node.js Express Microservices

Two Express services written for Bun:

- **api-gateway** (port `8080`): the public entry point. It forwards `/orders` requests to the orders service.
- **orders** (port `3002`): the orders microservice, backed by PostgreSQL through Prisma.

The project runs on Kubernetes (minikube), is built and deployed with Skaffold, and gets its database URL from HashiCorp Vault instead of from files in the repo.

```
Browser -> localhost:8080 -> api-gateway-service -> orders-service:3002 -> orders pods -> PostgreSQL
                                                                              ^
                                              DATABASE_URL injected by the Vault agent sidecar
```

## Project layout

```
app/api-gateway/index.ts     Gateway entry point
app/orders/index.ts          Orders service entry point
src/prisma/db.ts             Prisma client
k8s/configMap.yaml           Shared settings (app-config)
k8s/api-gateway.yaml         Gateway Deployment and Service
k8s/orders/orders.yaml       Orders ServiceAccount, Service and Deployment (with Vault annotations)
scripts/vault-setup.sh       Configures Vault for the orders service
skaffold.yaml                Build, deploy and port-forward configuration
Dockerfile                   Image used by both services
```

## Prerequisites

| Tool | Used for |
|---|---|
| [Docker](https://docs.docker.com/engine/install/) | Container runtime for minikube |
| [minikube](https://minikube.sigs.k8s.io/docs/start/) | Local Kubernetes cluster |
| [kubectl](https://kubernetes.io/docs/tasks/tools/) | Talking to the cluster |
| [Helm](https://helm.sh/docs/intro/install/) | Installing Vault |
| [Skaffold](https://skaffold.dev/docs/install/) | Build, deploy and port-forward loop |
| [Bun](https://bun.sh) | Only needed to run without Kubernetes |
| A PostgreSQL database | Must be reachable from inside the cluster (see [Database](#database)) |

## Configuration

| Variable | Used by | Value on Kubernetes | Value locally |
|---|---|---|---|
| `PORT` | orders | `3002` | `3002` |
| `ORDERS_SERVICE_URL` | gateway | `http://orders-service:3002` | `http://localhost:3002` |
| `ORDERS_ROUTE` | gateway | `/orders` | `/orders` |
| `DATABASE_URL` | orders | Injected by Vault at `/vault/secrets/db` | Set it in your shell or a local `.env` |

The Kubernetes values live in `k8s/configMap.yaml`. Do not commit a real `DATABASE_URL`.

## Option A: Run locally with Bun (no Kubernetes)

```bash
bun install
bun run start:dev
```

This starts both services together:

- Gateway: http://localhost:8080
- Orders: http://localhost:3002

Set `ORDERS_SERVICE_URL=http://localhost:3002` and `DATABASE_URL` in your environment first.

## Option B: Run on Kubernetes (minikube + Skaffold + Vault)

### 1. Start minikube with the Docker runtime

Skaffold builds images inside minikube's Docker daemon, so the cluster must use the Docker runtime, not containerd.

```bash
minikube config set container-runtime docker      # one-time default
minikube start --driver=docker --container-runtime=docker
kubectl get nodes -o wide                          # CONTAINER-RUNTIME should show docker://...
```

### 2. Install Vault (dev mode)

```bash
helm repo add hashicorp https://helm.releases.hashicorp.com
helm install vault hashicorp/vault --set "server.dev.enabled=true"
kubectl get pods -w
```

Wait until `vault-0` is `1/1 Running` and `vault-agent-injector-...` is Running, then press `Ctrl+C`.

### 3. Configure Vault

```bash
DATABASE_URL="postgresql://USER:PASS@HOST:5432/DBNAME" sh scripts/vault-setup.sh
```

The script:

1. Waits for `vault-0` to be ready.
2. Stores the URL at `secret/orders/db`.
3. Enables the `kubernetes` auth method and configures it.
4. Writes the `orders` policy (read access to that one secret).
5. Creates the `orders` role, bound to the `orders` ServiceAccount.
6. Restarts the orders Deployment so it retries Vault injection.

Always set `DATABASE_URL` in front of the command. Without it, an empty URL is stored and the orders service fails with `Postgres URL must be a non-empty string`. On a first run, the final restart step reports that the Deployment is not found, which is harmless because nothing is deployed yet.

### 4. Build and deploy with Skaffold

```bash
skaffold dev --port-forward
```

Skaffold builds both images, applies the manifests in `k8s/`, forwards `localhost:8080` to the gateway, and streams logs. Leave it running. It rebuilds and redeploys when you save a file.

### 5. Check that it works

In a second terminal:

```bash
kubectl get pods                     # orders pods should be 2/2 (app + vault-agent sidecar)
curl http://localhost:8080/orders
```

Stop Skaffold with `Ctrl+C`. It deletes the resources it created.

## After a restart

Dev-mode Vault keeps everything in memory. Whenever minikube, WSL, or the `vault-0` pod restarts, Vault comes back empty and the orders pod hangs in `Init`. Recover with:

1. `minikube start`, then wait for `vault-0` to be `1/1 Running`.
2. `DATABASE_URL="..." sh scripts/vault-setup.sh`
3. `skaffold dev --port-forward`

If you ran `minikube delete`, the Vault install is gone as well, so repeat step 2 above (Helm install) first.

## Database

The orders service reads its connection string from `DATABASE_URL`. Pods cannot reach a database on your own machine through `localhost`, so use either:

- **A hosted PostgreSQL** (for example Supabase or Neon): store its connection URL in Vault.
- **PostgreSQL inside minikube**: a Deployment or StatefulSet plus a Service named `postgres`, with the URL `postgresql://USER:PASS@postgres:5432/DBNAME`.

To change the stored URL:

```bash
kubectl exec vault-0 -- sh -c 'VAULT_TOKEN=root vault kv put secret/orders/db url="postgresql://USER:PASS@HOST:5432/DBNAME"'
kubectl rollout restart deploy/orders-deployment
```

Once the `Order` model is in the Prisma schema, create the tables with:

```bash
DATABASE_URL="..." bunx prisma migrate dev --name init
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `failed to connect to the docker API at ssh://docker@127.0.0.1...` | minikube is running on containerd | `minikube delete`, then start with `--container-runtime=docker` |
| `localhost:8080` refuses connections | No port-forward, or wrong Service name | Run `skaffold dev --port-forward`; the `portForward` entry must name `api-gateway-service` |
| Orders pod stuck in `Init`; `vault-agent-init` logs show `403 permission denied` | Vault restarted and lost its config | Rerun `scripts/vault-setup.sh`, then `kubectl rollout restart deploy/orders-deployment` |
| `Postgres URL must be a non-empty string` | Empty URL stored in Vault | Store the real URL (see [Database](#database)) and restart orders |
| `FailedCreate ... service account "orders" not found` | The ServiceAccount is missing | Make sure `k8s/orders/orders.yaml` defines the `orders` ServiceAccount |
| `unknown field "spec.serviceAccountName"` | Field is at the wrong level | It belongs under `spec.template.spec`, next to `containers:` |
| Gateway returns `ECONNREFUSED` for orders | Orders pods not Ready, or `ORDERS_SERVICE_URL` points to localhost | Check `kubectl get endpoints orders-service` and set `http://orders-service:3002` |
| Skaffold deletes everything after a failed deploy | Status check failed and it cleaned up | Debug with `skaffold dev --port-forward --status-check=false` to keep the pods |

## Useful commands

```bash
kubectl get pods,svc,endpoints                          # overview
kubectl describe pod <pod>                              # events (look at the bottom)
kubectl logs <pod> -c orders --previous                 # logs from the last crash
kubectl logs <pod> -c vault-agent-init                  # Vault injection problems
kubectl exec deploy/orders-deployment -c orders -- cat /vault/secrets/db
skaffold delete                                         # remove what Skaffold deployed
minikube delete                                         # remove the whole cluster (including Vault)
```

## Security notes

- Vault runs in **dev mode**: in-memory, auto-unsealed, with the root token `root`. Use it for learning only.
- Only the Vault path (`secret/data/orders/db`) appears in the manifests. Keep real credentials out of the repo, shell history shared with others, and CI logs.
