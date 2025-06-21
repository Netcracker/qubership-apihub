echo "---Start APIHUB deploy using Helm---"
helm install apihub -n apihub --create-namespace -f ../qubership-apihub/with-keycloack-local-k8s-values.yaml -f ../qubership-apihub/with-keycloack-local-secrets.yaml ../../qubership-apihub
echo "---Complete APIHUB deploy using Helm---"