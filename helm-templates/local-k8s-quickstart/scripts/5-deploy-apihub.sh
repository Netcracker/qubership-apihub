echo "---Start APIHUB deploy using Helm---"
helm install apihub -n qubership-apihub --create-namespace -f ../qubership-apihub/local-k8s-values.yaml -f ../qubership-apihub/local-secrets.yaml ../../qubership-apihub
echo "---Complete APIHUB deploy using Helm---"