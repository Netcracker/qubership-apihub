#!/bin/sh
# Generate a local CA and a server certificate for qubership-apihub.localtest.me.
# Outputs PEM files under ../qubership-apihub/certs/ for ingress TLS and customCa mounts.
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
CERTS_DIR="${SCRIPT_DIR}/../qubership-apihub/certs"

case "$(uname -s 2>/dev/null || echo unknown)" in
  MINGW*|MSYS*|CYGWIN*)
    CA_SUBJ="//CN=APIHUB Local Kind CA"
    SERVER_SUBJ="//CN=qubership-apihub.localtest.me"
    ;;
  *)
    CA_SUBJ="/CN=APIHUB Local Kind CA"
    SERVER_SUBJ="/CN=qubership-apihub.localtest.me"
    ;;
esac

mkdir -p "${CERTS_DIR}"
rm -f \
  "${CERTS_DIR}/ca.key" \
  "${CERTS_DIR}/ca.crt" \
  "${CERTS_DIR}/tls.key" \
  "${CERTS_DIR}/tls.crt" \
  "${CERTS_DIR}/tls.csr" \
  "${CERTS_DIR}/tls.ext" \
  "${CERTS_DIR}/ca.srl"

echo "---Generating local TLS CA and certificate for *.localtest.me---"

openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout "${CERTS_DIR}/ca.key" \
  -out "${CERTS_DIR}/ca.crt" \
  -days 3650 \
  -subj "${CA_SUBJ}"

openssl req -newkey rsa:2048 -nodes \
  -keyout "${CERTS_DIR}/tls.key" \
  -out "${CERTS_DIR}/tls.csr" \
  -subj "${SERVER_SUBJ}"

cat > "${CERTS_DIR}/tls.ext" <<'EOF'
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = qubership-apihub.localtest.me
DNS.2 = *.localtest.me
DNS.3 = localhost
DNS.4 = keycloak.localtest.me
EOF

openssl x509 -req \
  -in "${CERTS_DIR}/tls.csr" \
  -CA "${CERTS_DIR}/ca.crt" \
  -CAkey "${CERTS_DIR}/ca.key" \
  -CAcreateserial \
  -out "${CERTS_DIR}/tls.crt" \
  -days 825 \
  -extfile "${CERTS_DIR}/tls.ext"

rm -f "${CERTS_DIR}/tls.csr" "${CERTS_DIR}/tls.ext" "${CERTS_DIR}/ca.srl"

echo "Local TLS files written to ${CERTS_DIR}"
echo "  ca.crt  — mount via customCa (/tmp/cert) on backend, linter, agents-backend"
echo "  tls.crt / tls.key — use as ingress TLS secret (base64 in Helm values)"
