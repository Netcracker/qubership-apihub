# Qubership APIHIB Installation on Local Kubernetes Cluster (Rancher Desktop)

[Rancher Desktop Official Site](https://rancherdesktop.io/)

## Prerequisites
1. Install Rancher Desktop:   
   Official Installation Guide(https://docs.rancherdesktop.io/getting-started/installation)
2. Start Kubernetes cluster in Rancher Desktop

## 1. Ingress Controller
Default ports used:
- 80 (HTTP)
- 443 (HTTPS)

If ports are busy:
-  Change ports in Rancher Desktop settings, OR
-  Use port forwarding

## 2. Generate Required Secrets
    cd qubership-apihub/helm-templates/qubership-apihub

    # Generate JWT key
    ./generate_jwt_pkey.sh

    # Generate passwords
    ./generate-local-passwords.sh

## 3. Deploy PostgreSQL Database
    helm install postgres-db -n postgres-db --create-namespace \
      ../helm-templates/postgres-db

## 4. Deploy APIHIB Application
    helm install apihub -n apihub --create-namespace \
      -f ../helm-templates/qubership-apihub/local-k8s-values.yaml \
      -f ../helm-templates/qubership-apihub/local-secrets.yaml \
      ../helm-templates/qubership-apihub

## 5. Verify Installation
Check running pods:
    kubectl get pods -n apihub

Expected output:
     NAMESPACE       NAME                                                    READY   STATUS    RESTARTS       AGE
     apihub          qubership-apihub-backend-866965f5cc-lxv9l               1/1     Running   0              3m
     apihub          qubership-apihub-build-task-consumer-588bf5d685-bkjjm   1/1     Running   0              3m
     apihub          qubership-apihub-ui-99d98758b-sh5tk                     1/1     Running   0              3m

## Uninstallation
    helm uninstall apihub -n apihub
    heml uninstall postgres-db -n postgres-db

