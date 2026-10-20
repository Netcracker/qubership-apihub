# Qubership APIHUB Agent Helm Chart

This folder contains `qubership-apihub-agent` Helm chart for Qubership APIHUB Agent deployment to k8s cluster.

Each agent release publishes the chart as `oci://ghcr.io/netcracker/charts/qubership-apihub-agent`, with the chart
version and the image tag equal to the agent version, and attaches the `.tgz` to the
[agent release](https://github.com/Netcracker/qubership-apihub/releases). The sources in this folder use the `dev`
image tag: install from them only for development.

## Third-party dependencies

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
1. Helm 3.8 or later (OCI registry support)

## Set up values.yml

1. Print the values of the agent version you install:
   `helm show values oci://ghcr.io/netcracker/charts/qubership-apihub-agent --version <X.Y.Z>`
2. Review [`config.template.yaml`](../config.template.yaml) for the full list of configuration parameters and their descriptions
3. Write a `values.yaml` with your deploy parameters; leave `image.tag` out to keep the pinned agent version:
   - Helm-specific settings (image, resources, `goMemLimit`) are at the top level under `qubershipApihubAgent`
   - Application configuration is under `qubershipApihubAgent.env` and follows the same structure as `config.template.yaml`
   - Keep `goMemLimit` below `resource.memory.limit` (~80% of the limit in chart defaults)

## Execute helm install

In order to deploy Qubership APIHUB Agent to your k8s cluster execute the following command:

```bash
helm install qubership-apihub-agent -n qubership-apihub-agent --create-namespace -f values.yaml \
  oci://ghcr.io/netcracker/charts/qubership-apihub-agent --version <X.Y.Z>
```

From the chart sources, for development:

```bash
helm install qubership-apihub-agent -n qubership-apihub-agent --create-namespace -f ./qubership-apihub-agent/values.yaml ./qubership-apihub-agent
```

In order to uninstall Qubership APIHUB from your k8s cluster execute the following command:

```bash
helm uninstall qubership-apihub-agent -n qubership-apihub-agent
```

## Dev cases

### Installation to local k8s cluster

File `local-k8s-values.yaml` has predefined deploy parameters for deploy to local k8s cluster on your PC.

Prerequisites:

- Qubership APIHUB installed
- Fill `accessToken` value in `local-k8s-values.yaml`

Execute the following command to deploy Qubership APIHUB Agent:

```bash
helm install qubership-apihub-agent -n qubership-apihub-agent --create-namespace -f ./qubership-apihub-agent/local-k8s-values.yaml ./qubership-apihub-agent
```

## Custom CA certificates

The agent runtime image is based on `ghcr.io/netcracker/qubership-core-base`. Custom CA certificates are loaded into the system trust store by the base image entrypoint from `/tmp/cert/` before the application starts.

1. Create a Kubernetes Secret with one or more `.crt`, `.cer`, or `.pem` files.
2. Enable the optional Helm mount:

```yaml
qubershipApihubAgent:
  customCa:
    enabled: true
    secretName: apihub-agent-custom-ca
```

Example:

```bash
kubectl create secret generic apihub-agent-custom-ca \
  --from-file=company-ca.pem=./company-ca.pem \
  -n qubership-apihub-agent
```

Default remains `customCa.enabled: false` (no mount).
