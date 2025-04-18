# Qubership APIHUB Installation on local k8s cluster

This guide is for development purposes mainly.
It describes how to set up local k8s cluster and use it for APIHUB deployment.

This can be helpful for development cases. It is not a production ready deployment schema.

- [How to set up k8s cluster on your PC](#how-to-set-up-k8s-cluster-on-your-pc)
  * [Kind](#kind)
    + [Prerequisites](#prerequisites)
    + [Installing](#installing)
    + [Uninstalling](#uninstalling)
  * [Rancher Desktop](#rancher-desktop)
    + [Installing](#installing-1)
    + [Ingress Controller](#ingress-controller)
- [APIHUB installation via Helm](#apihub-installation-via-helm)
  * [Deployment via single script](#deployment-via-single-script)
  * [Verify Installation](#verify-installation)
  * [Uninstallation](#uninstallation)

# How to set up k8s cluster on your PC

Two possible tools described below. In general there are a lot more options how to run k8s locally. You can use any k8s distribution on your choice.

## Kind

Official site: https://kind.sigs.k8s.io/docs/user/quick-start/

### Prerequisites

1. Install podman and set it up
2. Install kubectl
3. Install OpenLENS for managing the cluster (Optional)

### Installing 

Download and install corresponding binary from https://github.com/kubernetes-sigs/kind/releases

Start the cluster by the following command (bash/Power Shell)

```
cat <<EOF | kind create cluster --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
EOF
```

```
@"
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
"@ | kind create cluster --config=-
```

Install Ingress Controller `kubectl apply -f https://kind.sigs.k8s.io/examples/ingress/deploy-ingress-nginx.yaml`

### Uninstalling 

```
kind delete cluster
```

## Rancher Desktop

[Rancher Desktop Official Site](https://rancherdesktop.io/)

### Installing

1. Install Rancher Desktop:   
   Official Installation Guide(https://docs.rancherdesktop.io/getting-started/installation)
1. Start Kubernetes cluster in Rancher Desktop

### Ingress Controller

Default ports used:
- 80 (HTTP)
- 443 (HTTPS)

If ports are busy:
-  Change ports in Rancher Desktop settings, OR
-  Use port forwarding


# APIHUB installation via Helm

No manual action required, special `local-k8s-values.yaml` prefilled with values which fits for deployment in local k8s cluster. Secrets values which can't be prefilled are generated by scripts.

Please also refer to official [Installation Notes](/docs/installation-guide.md)

## Deployment via single script 

```
    cd qubership-apihub/helm-templates/qubership-apihub

    # Generate JWT key
    generate_jwt_pkey.sh

    # Generate passwords
    generate-local-passwords.sh
    
    # Deploy PostgreSQL Database
    helm install postgres-db -n postgres-db --create-namespace ../postgres-db

    # Deploy APIHIB Application
    helm install apihub -n apihub --create-namespace -f ../qubership-apihub/local-k8s-values.yaml -f ../qubership-apihub/local-secrets.yaml ../qubership-apihub
```

## Verify Installation
Check running pods: `kubectl get pods -n apihub`

Expected output:

```
     NAMESPACE       NAME                                                    READY   STATUS    RESTARTS       AGE
     apihub          qubership-apihub-backend-866965f5cc-lxv9l               1/1     Running   0              3m
     apihub          qubership-apihub-build-task-consumer-588bf5d685-bkjjm   1/1     Running   0              3m
     apihub          qubership-apihub-ui-99d98758b-sh5tk                     1/1     Running   0              3m
```

Qubership APIHUB will be accessible on [https://qubership-apihub.localhost/login](https://qubership-apihub.localhost/login)

Credentials for login can be found in `/helm-templates/qubership-apihub/local-secrets.yaml` file


## Uninstallation

```
    helm uninstall apihub -n apihub
    helm uninstall postgres-db -n postgres-db
```

# Appendix

Script for setting up everything

```
cat <<EOF | kind create cluster --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
EOF

kubectl apply -f https://kind.sigs.k8s.io/examples/ingress/deploy-ingress-nginx.yaml
./generate_jwt_pkey.sh
./generate-local-passwords.sh
sleep 30
helm install postgres-db -n postgres-db --create-namespace ../postgres-db
sleep 30
helm install apihub -n apihub --create-namespace -f ../qubership-apihub/local-k8s-values.yaml -f ../qubership-apihub/local-secrets.yaml ../qubership-apihub
sleep 30
echo "######"
echo "APIHUB is accesible by https://qubership-apihub.localhost/login"
cat local-secrets.yaml | grep -E 'adminEmail|adminPassword|accessToken'
echo "######"
```
