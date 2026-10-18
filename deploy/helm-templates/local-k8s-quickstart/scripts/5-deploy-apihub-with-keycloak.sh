echo "---Start APIHUB deploy using Helm---"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
cd "${SCRIPT_DIR}"
./create-custom-ca-secrets.sh
helm install apihub -n qubership-apihub --create-namespace -f ../qubership-apihub/with-keycloak-local-k8s-values.yaml -f ../qubership-apihub/with-keycloak-local-secrets.yaml ../../qubership-apihub
echo "---Complete APIHUB deploy using Helm---"
