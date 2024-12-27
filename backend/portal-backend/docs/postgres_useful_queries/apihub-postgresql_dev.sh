#!/bin/bash

kubectl config set-cluster k8s-server --insecure-skip-tls-verify=true --server=https://k8s-server.qubership.org:6443
kubectl config set-credentials admin/k8s-server --token="K8S_TOKEN_HERE"
kubectl config set-context context-admin/k8s-server --user=admin/k8s-server --namespace=apihub-postgresql --cluster=k8s-server
kubectl config use-context context-admin/k8s-server

MAIN_POD_ID=$(kubectl get pods -l pgtype=master -o name 2>/dev/null | grep -Po "(pg-patroni-.*?-.*?-.*?\$)")
echo "main pod = $MAIN_POD_ID"

kubectl port-forward $MAIN_POD_ID 15432:5432
