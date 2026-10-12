# nodejs_express_microservices

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.4.2. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.


minikube start --driver=docker --container-runtime=docker
vault helm repo add hashicorp https://helm.releases.hashicorp.com

helm repo add hashicorp https://helm.releases.hashicorp.com
helm install vault hashicorp/vault --set "server.dev.enabled=true"
kubectl get pods -w        # wait for vault-0 1/1 and the injector Running, then Ctrl+C

# 2. Secret, auth, policy, role
DATABASE_URL="postgresql://user:pass@host:5432/dbname" sh scripts/vault-setup.sh

# 3. Your services
skaffold dev --port-forward
