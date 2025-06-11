#!/bin/sh
set -eu

# Namespace where your Deployments live
NS="apihub"

# Ingress controller service info
INGRESS_NS="ingress-nginx"
INGRESS_SVC="ingress-nginx-controller"

# 1) Get the ClusterIP of your ingress controller
INGRESS_IP=$(kubectl get svc -n "$INGRESS_NS" "$INGRESS_SVC" \
  -o jsonpath='{.spec.clusterIP}')

if [ -z "$INGRESS_IP" ]; then
  echo "Error: could not determine ClusterIP for $INGRESS_NS/$INGRESS_SVC" >&2
  exit 1
fi

# 2) List all Deployments in the target namespace
DEPLOYMENTS=$(kubectl get deployments -n "$NS" -o jsonpath='{.items[*].metadata.name}')

if [ -z "$DEPLOYMENTS" ]; then
  echo "No Deployments found in namespace $NS." >&2
  exit 0
fi

# 3) Patch each Deployment to add the hostAliases section
for dep in $DEPLOYMENTS; do
  echo "Patching deployment/$dep in namespace $NS..."
  kubectl patch deployment "$dep" -n "$NS" --type='merge' -p "\
spec:
  template:
    spec:
      hostAliases:
        - ip: \"$INGRESS_IP\"
          hostnames:
            - \"keycloak.localtest.me\"
"
done

echo "All Deployments in namespace '$NS' have been patched with hostAliases → $INGRESS_IP keycloak.localtest.me."
