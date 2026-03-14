echo "---Start Keycloak deploy using Helm---"
helm install keycloak -n keycloak --create-namespace ../keycloak
echo "---Complete Keycloak deploy using Helm---"