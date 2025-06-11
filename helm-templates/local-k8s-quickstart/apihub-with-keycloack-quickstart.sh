cd ./scripts
./1-start-kind-cluster.sh
echo "Sleep 30 seconds, wait for Kind init"
sleep 30
./2-deploy-postgres.sh
echo "Sleep 30 seconds, wait for PG init"
sleep 30
./3-generate-secrets.sh
./4-deploy-keycloack.sh
echo "Sleep 70 seconds, wait for Keycloack init"
sleep 70
./5-deploy-apihub-with-keycloack.sh
cd ..