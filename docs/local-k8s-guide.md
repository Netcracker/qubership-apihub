# Qubership APIHUB Installation on local k8s cluster

This guide is for development purposes mainly.
It describes how to set up local k8s cluster and use it for APIHUB deployment.

This can be helpful for development cases. It is not a production ready deployment schema.

# Kind

Official site: https://kind.sigs.k8s.io/docs/user/quick-start/

## Prerequisites

1. Install podman and set it up
2. Install kubectl
3. Install OpenLENS for managing the cluster (Optional)

## Installing 

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

## APIHUB installation and usage

Do installation of APIHUB and its prerequisite (Postgres) via Helm.
For more details please refer to a Helm Chart guide (TODO)

```
kubectl create namespace postgres-db
helm install postgres-db -n postgres-db ./postgres-db
kubectl create namespace apihub
helm install apihub -n apihub ./qubership-apihub 
```

The APIHUB is accessible via http://localhost/login

Removing APIHUB: 
```
helm uninstall apihub -n apihub
```

# Rancher Desktop

TODO