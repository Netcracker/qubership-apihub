generate_random_string() {
  local length=$1
  cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w $length | head -n 1
}

generate_jwt_private_key() {
  openssl genpkey -algorithm RSA -out rsakey.pem -pkeyopt rsa_keygen_bits:2048
  base64 rsakey.pem | tr -d '\n' > jwt_private_key
}

generate_saml_private_cert_and_key() {
  openssl req -x509 -newkey rsa:2048 -keyout private_key.pem -out certificate.pem -days 365 -nodes -subj "//CN=localhost"
}

echo "---Start generating secrets---"

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
export SAML_CRT=$(echo -n "$SAML_CRT_ORIG" | base64 -w 0)
export SAML_KEY=$(echo -n "$SAML_KEY_ORIG" | base64 -w 0)
export OIDC_CLIENT_SECRET=$(generate_random_string 32)
export APIHUB_USER_USERNAME=$(generate_random_string 6)
export APIHUB_USER_PASSWORD=$(generate_random_string 6)

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