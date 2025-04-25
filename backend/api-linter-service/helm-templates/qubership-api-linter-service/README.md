# Qubership API Linter Service Helm Chart

This folder contains `qubership-api-linter-service` Helm chart for Qubership API Linter Service deployment to k8s cluster.

It is ready for usage Helm chart. 

## 3rd party dependencies

| Name | Version | Mandatory/Optional | Comment |
| ---- | ------- |------------------- | ------- |
| Kubernetes | 1.23+ | Mandatory |  |

## HWE

|     | CPU request | CPU limit | RAM request | RAM limit |
| --- | ----------- | --------- | ----------- | --------- |
| Default values | 30m | 1 | 150Mi | 150Mi |

## Prerequisites

1. kubectl installed and configured for k8s cluster access.
1. Helm installed

## Set up values.yml

1. Download Qubership API Linter Service helm chart
1. Fill `values.yaml` with corresponding deploy parameters. `values.yaml` is self-documented, so please refer to it

## Execute helm install

In order to deploy Qubership API Linter Service to your k8s cluster execute the following command:

```
helm install qubership-api-linter-service -n qubership-api-linter-service --create-namespace  -f ./qubership-api-linter-service/values.yaml ./qubership-api-linter-service
```

In order to uninstall Qubership API Linter Service from your k8s cluster execute the following command:

```
helm uninstall qubership-api-linter-service -n qubership-api-linter-service
```

## Dev cases

**Installation to local k8s cluster**

File `local-k8s-values.yaml` has predefined deploy parameters for deploy to local k8s cluster on your PC.

Execute the following command to deploy Qubership API Linter Service:

```
helm install qubership-api-linter-service -n qubership-api-linter-service --create-namespace  -f ./qubership-api-linter-service/local-k8s-values.yaml ./qubership-api-linter-service
```