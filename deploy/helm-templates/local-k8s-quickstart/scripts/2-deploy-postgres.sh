echo "---Start PG deploy using Helm---"
helm install postgres-db -n postgres-db --create-namespace ../postgres-db
echo "---Complete PG deploy using Helm---"