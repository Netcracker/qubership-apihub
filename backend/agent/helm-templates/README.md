# Qubership APIHUB Agent Helm Chart

This folder contains `qubership-apihub-agent` Helm chart for Qubership APIHUB Agent deployment to k8s cluster.

It is ready for usage Helm chart. 

## 3rd party dependencies

| Name | Version | Mandatory/Optional | Comment |
| ---- | ------- |------------------- | ------- |
| Kubernetes | 1.23+ | Mandatory |  |
| Qubership APIHUB | any | Mandatory |  |

## HWE

|     | CPU request | CPU limit | RAM request | RAM limit |
| --- | ----------- | --------- | ----------- | --------- |
| Default values | 30m | 1 | 256Mi | 256Mi |

## Prerequisites

1. kubectl installed and configured for k8s cluster access. Cluster admin permissions required because Qubership APIHUB Agent Helm chart brings ClusterRoleBinding for ClusterView role.
1. Helm installed

## Set up values.yml

1. Download Qubership APIHUB Agent helm chart
2. Review [`config.template.yaml`](../qubership-apihub-agent/config.template.yaml) for the full list of configuration parameters and their descriptions
3. Fill `values.yaml` with your deploy parameters:
   - Helm-specific settings (image, resources) are at the top level under `qubershipApihubAgent`
   - Application configuration is under `qubershipApihubAgent.env` and follows the same structure as `config.template.yaml`

## Execute helm install

In order to deploy Qubership APIHUB Agent to your k8s cluster execute the following command:

```
helm install qubership-apihub-agent -n qubership-apihub-agent --create-namespace -f ./qubership-apihub-agent/values.yaml ./qubership-apihub-agent
```

In order to uninstall Qubership APIHUB from your k8s cluster execute the following command:

```
helm uninstall qubership-apihub-agent -n qubership-apihub-agent
```

## Dev cases

**Installation to local k8s cluster**

File `local-k8s-values.yaml` has predefined deploy parameters for deploy to local k8s cluster on your PC.

Prerequisites:

- Qubership APIHUB installed
- Fill `accessToken` value in `local-k8s-values.yaml`

Execute the following command to deploy Qubership APIHUB Agent:

```
helm install qubership-apihub-agent -n qubership-apihub-agent --create-namespace -f ./qubership-apihub-agent/local-k8s-values.yaml ./qubership-apihub-agent
```