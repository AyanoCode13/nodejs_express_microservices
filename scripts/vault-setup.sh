#!/bin/sh
set -e
kubectl wait --for=condition=Ready pod/vault-0 --timeout=120s

kubectl exec -i vault-0 -- sh -c '
vault login root >/dev/null
vault kv put secret/orders/db url="'"$DATABASE_URL"'"
vault auth enable kubernetes
vault write auth/kubernetes/config kubernetes_host="https://$KUBERNETES_PORT_443_TCP_ADDR:443"
vault policy write orders - <<EOF
path "secret/data/orders/db" {
  capabilities = ["read"]
}
EOF
vault write auth/kubernetes/role/orders \
  bound_service_account_names=orders \
  bound_service_account_namespaces=default \
  policies=orders ttl=1h
'

if kubectl get deploy orders-deployment >/dev/null 2>&1; then
  kubectl rollout restart deploy/orders-deployment
fi