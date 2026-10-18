#!/bin/sh
# Create Kubernetes Secrets with the local Kind CA for backend HTTPS outbound trust.
# Must run after generate-local-tls.sh and before helm install/upgrade of APIHUB.
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
CA_FILE="${SCRIPT_DIR}/../qubership-apihub/certs/ca.crt"
NS="qubership-apihub"
SECRET_NAME="apihub-local-custom-ca"

if [ ! -f "${CA_FILE}" ]; then
  echo "Error: ${CA_FILE} not found. Run generate-local-tls.sh first." >&2
  exit 1
fi

echo "---Creating custom CA Secret ${NS}/${SECRET_NAME}---"

kubectl create namespace "${NS}" --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic "${SECRET_NAME}" \
  --from-file=localtest-me-ca.pem="${CA_FILE}" \
  --namespace "${NS}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Secret ${NS}/${SECRET_NAME} is ready (mounted at /tmp/cert when customCa.enabled=true)."
