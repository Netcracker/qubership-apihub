generate_random_string() {
  local length=$1
  cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w $length | head -n 1
}

generate_jwt_private_key() {
  openssl genpkey -algorithm RSA -out rsakey.pem -pkeyopt rsa_keygen_bits:2048
  base64 rsakey.pem | tr -d '\n' > jwt_private_key
}

generate_jwt_private_key

export APIHUB_ADMIN_EMAIL=$(generate_random_string 6)
export APIHUB_ADMIN_PASSWORD=$(generate_random_string 6)
export APIHUB_ACCESS_TOKEN=$(generate_random_string 30)
export JWT_PRIVATE_KEY=$(cat ./jwt_private_key)

rm -f rsakey.pem
rm -f jwt_private_key

echo "APIHUB_ADMIN_EMAIL=$APIHUB_ADMIN_EMAIL"
echo "APIHUB_ADMIN_PASSWORD=$APIHUB_ADMIN_PASSWORD"
echo "APIHUB_ACCESS_TOKEN=$APIHUB_ACCESS_TOKEN"

for file in *.env; do
  if [ -f "$file" ]; then
    envsubst < "$file" > "${file}.tmp"
    mv "${file}.tmp" "$file"
    echo "Templating $file"
  fi
done

envsubst < qubership-apihub-backend-config.yaml > qubership-apihub-backend-config.yaml.tmp
mv qubership-apihub-backend-config.yaml.tmp qubership-apihub-backend-config.yaml
echo "Templating qubership-apihub-backend-config.yaml"