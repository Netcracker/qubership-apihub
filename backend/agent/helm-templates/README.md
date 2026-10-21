# APIHUB agent Helm chart

This folder contains the `qubership-apihub-agent` Helm chart. It deploys the [APIHUB agent](../README.md) to a
Kubernetes cluster.

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

1. `kubectl` installed and configured for cluster access. Cluster admin permissions are required, because the chart
   creates a ClusterRoleBinding for the `ClusterView` role.
2. Helm 3.8 or later (OCI registry support)

## Set up values.yaml

1. Print the values of the agent version you install:
   `helm show values oci://ghcr.io/netcracker/charts/qubership-apihub-agent --version <X.Y.Z>`
2. Review [`config.template.yaml`](../config.template.yaml) for the full list of configuration parameters and their
   descriptions. The [configuration reference](../../../docs/configuration-reference.md) covers the whole product.
3. Write a `values.yaml` with your deploy parameters; leave `image.tag` out to keep the pinned agent version:
   - Helm-specific settings (image, resources, `goMemLimit`) are at the top level under `qubershipApihubAgent`
   - Application configuration is under `qubershipApihubAgent.env` and follows the structure of
     `config.template.yaml`
   - Keep `goMemLimit` below `resource.memory.limit` (~80% of the limit in chart defaults)

## Execute helm install

To deploy the agent to your cluster, run:

```bash
helm install qubership-apihub-agent -n qubership-apihub-agent --create-namespace -f values.yaml \
  oci://ghcr.io/netcracker/charts/qubership-apihub-agent --version <X.Y.Z>
```

From the chart sources, for development:

```bash
helm install qubership-apihub-agent -n qubership-apihub-agent --create-namespace -f ./qubership-apihub-agent/values.yaml ./qubership-apihub-agent
```

To uninstall the agent, run:

```bash
helm uninstall qubership-apihub-agent -n qubership-apihub-agent
```

## Dev cases

### Installation to local k8s cluster

The file `local-k8s-values.yaml` holds deploy parameters for a local cluster on your machine, such as the one in
[Kind quickstart](../../../docs/development/local-run.md#kind-quickstart).

Prerequisites:

- APIHUB installed in the cluster
- A value for `accessToken` in `local-k8s-values.yaml`

Deploy the agent:

```bash
helm install qubership-apihub-agent -n qubership-apihub-agent --create-namespace -f ./qubership-apihub-agent/local-k8s-values.yaml ./qubership-apihub-agent
```

## Custom CA certificates

The agent runtime image is based on `ghcr.io/netcracker/qubership-core-base`. The base image entrypoint loads custom CA
certificates from `/tmp/cert/` into the system trust store before the application starts.

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

The default is `customCa.enabled: false`, which mounts nothing.
