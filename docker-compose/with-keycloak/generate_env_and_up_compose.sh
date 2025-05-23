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

generate_jwt_private_key
generate_saml_private_cert_and_key

export APIHUB_ADMIN_EMAIL=$(generate_random_string 6)@qubership.org
export APIHUB_ADMIN_PASSWORD=$(generate_random_string 6)
export APIHUB_ACCESS_TOKEN=$(generate_random_string 10)
export JWT_PRIVATE_KEY=$(cat ./jwt_private_key)
export SAML_CRT_ORIG=$(cat certificate.pem)
export SAML_KEY_ORIG=$(cat private_key.pem)
export SAML_CRT_KEYCLOAK=$(echo "$SAML_CRT_ORIG" | sed '1d;$d' | tr -d '\n')
export SAML_KEY_KEYCLOAK=$(echo "$SAML_KEY_ORIG" | sed '1d;$d' | tr -d '\n')
export SAML_CRT=$(echo -n "$SAML_CRT_ORIG" | base64 -w 0)
export SAML_KEY=$(echo -n "$SAML_KEY_ORIG" | base64 -w 0)
export APIHUB_USER_USERNAME=$(generate_random_string 6)
export APIHUB_USER_PASSWORD=$(generate_random_string 6)

rm -f rsakey.pem
rm -f jwt_private_key
rm -f private_key.pem
rm -f certificate.pem

echo "APIHUB_ADMIN_EMAIL = $APIHUB_ADMIN_EMAIL"
echo "APIHUB_ADMIN_PASSWORD = $APIHUB_ADMIN_PASSWORD"
echo "APIHUB_ACCESS_TOKEN = $APIHUB_ACCESS_TOKEN"
echo "APIHUB_USER_USERNAME = $APIHUB_USER_USERNAME"
echo "APIHUB_USER_PASSWORD = $APIHUB_USER_PASSWORD"

for file in *.env; do
  if [ -f "$file" ]; then
    envsubst < "$file" > "${file}.tmp"
    mv "${file}.tmp" "$file"
    echo "Templating $file"
  fi
done

for file in ./keycloak/*.json; do
  if [ -f "$file" ]; then
    envsubst < "$file" > "${file}.tmp"
    mv "${file}.tmp" "$file"
    echo "Templating $file"
  fi
done

echo "Startup compose"
podman compose up