#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
cd "${SCRIPT_DIR}"

generate_random_string() {
  length=$1
  # Portable-ish: prefer /dev/urandom, fall back to openssl
  if [ -r /dev/urandom ]; then
    LC_ALL=C tr -dc 'a-zA-Z0-9' </dev/urandom | fold -w "${length}" | head -n 1
  else
    openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | fold -w "${length}" | head -n 1
  fi
}

generate_jwt_private_key() {
  openssl genpkey -algorithm RSA -out rsakey.pem -pkeyopt rsa_keygen_bits:2048
  base64 rsakey.pem | tr -d '\n' > jwt_private_key
}

generate_saml_private_cert_and_key() {
  case "$(uname -s 2>/dev/null || echo unknown)" in
    MINGW*|MSYS*|CYGWIN*)
      subj="//CN=localhost"
      ;;
    *)
      subj="/CN=localhost"
      ;;
  esac
  openssl req -x509 -newkey rsa:2048 -keyout private_key.pem -out certificate.pem -days 365 -nodes -subj "${subj}"
}

to_b64() {
  # Single-line base64 without relying on GNU base64 -w
  base64 | tr -d '\n'
}

echo "---Start generating secrets---"

./generate-local-tls.sh

generate_jwt_private_key
generate_saml_private_cert_and_key

export APIHUB_ADMIN_EMAIL=x_apihub_$(generate_random_string 6)@qubership.org
export APIHUB_ADMIN_PASSWORD=$(generate_random_string 8)
export APIHUB_ACCESS_TOKEN=$(generate_random_string 30)
export JWT_PRIVATE_KEY=$(cat ./jwt_private_key)
export SAML_CRT_ORIG=$(cat certificate.pem)
export SAML_KEY_ORIG=$(cat private_key.pem)
export SAML_CRT_KEYCLOAK=$(echo "$SAML_CRT_ORIG" | sed '1d;$d' | tr -d '\n')
export SAML_KEY_KEYCLOAK=$(echo "$SAML_KEY_ORIG" | sed '1d;$d' | tr -d '\n')
export SAML_CRT=$(printf '%s' "$SAML_CRT_ORIG" | to_b64)
export SAML_KEY=$(printf '%s' "$SAML_KEY_ORIG" | to_b64)
export OIDC_CLIENT_SECRET=$(generate_random_string 32)
export APIHUB_USER_USERNAME=$(generate_random_string 6)
export APIHUB_USER_PASSWORD=$(generate_random_string 6)
export APIHUB_TLS_CRT=$(to_b64 < ../qubership-apihub/certs/tls.crt)
export APIHUB_TLS_KEY=$(to_b64 < ../qubership-apihub/certs/tls.key)

rm -f rsakey.pem
rm -f jwt_private_key
rm -f private_key.pem
rm -f certificate.pem

envsubst < ../qubership-apihub/local-secrets.yaml.template > ../qubership-apihub/local-secrets.yaml
envsubst < ../qubership-apihub/with-keycloak-local-secrets.yaml.template > ../qubership-apihub/with-keycloak-local-secrets.yaml
envsubst < ../keycloak/files/realm.json.template > ../keycloak/files/realm.json

echo "APIHUB_ADMIN_EMAIL = $APIHUB_ADMIN_EMAIL"
echo "APIHUB_ADMIN_PASSWORD = $APIHUB_ADMIN_PASSWORD"
echo "APIHUB_ACCESS_TOKEN = $APIHUB_ACCESS_TOKEN"
echo "APIHUB_USER_USERNAME (for SAML / OIDC) = $APIHUB_USER_USERNAME"
echo "APIHUB_USER_PASSWORD (for SAML / OIDC) = $APIHUB_USER_PASSWORD"
echo "Ingress TLS certificate generated for qubership-apihub.localtest.me (see qubership-apihub/certs/)"
