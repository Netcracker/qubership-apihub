# APIHUB agent

The agent is a Go service that runs in a Kubernetes cluster and discovers the API specifications that the cluster's
services expose: OpenAPI, GraphQL, AsyncAPI, JSON Schema, and Markdown documents. It calls the services through the
Kubernetes API, so it needs the `ClusterView` permission. The `agents-backend` service of the product talks to the
agent, and the Agents UI shows what it finds. The module ships the image `qubership-apihub-agent` and the
`qubership-apihub-agent` Helm chart.

The agent is the Kubernetes side of the product; see the [architecture overview](../../docs/architecture/overview.md)
and [`agents-backend`](../agents-backend/README.md), the plug-in that manages agents.

## Build, test, and lint

The Nx project is `agent` (tag `lang:go`). Run from the repository root:

```bash
pnpm exec nx run agent:build
pnpm exec nx run agent:test
pnpm exec nx run agent:lint
```

`build` writes the binary to `dist/backend/agent`. `tidy` and `generate` are the other Go targets. How to set up the
tools and what the targets do: [Getting started](../../docs/development/getting-started.md) and
[Build and test](../../docs/development/build-and-test.md).

## Run and debug locally

The agent needs a Kubernetes API, so it does not run in the Compose stacks. To run it outside a cluster, copy
[`config.template.yaml`](config.template.yaml) to `config.yaml`, point it at a cluster and an APIHUB, and start
`main.go` from this folder; `AGENT_CONFIG_FOLDER` names another folder for `config.yaml`. To run it in a local
cluster, follow [Kind quickstart](../../docs/development/local-run.md#kind-quickstart) and
[`local-k8s-values.yaml`](helm-templates/README.md#installation-to-local-k8s-cluster). Breakpoints in the IDE:
[Debugging: Go service](../../docs/development/debugging.md#go-service).

## Configuration

The agent reads `config.yaml` from the working directory or from `AGENT_CONFIG_FOLDER`.
[`config.template.yaml`](config.template.yaml) lists every parameter with its default. The product-wide view is in the
[configuration reference](../../docs/configuration-reference.md). Helm values are in
[`helm-templates/`](helm-templates/README.md).

## API specifications

The OpenAPI files of the agent are in [`docs/api/`](docs/README.md#api-specification): the admin API and two
internal APIs.

## Further reading

- [Module documentation index](docs/README.md)
- [Make a service discoverable by the agent](../../docs/user-guide/agent-discovery.md): discovery process, default
  URLs, and the contract for service owners
- [Agent user guide](../../docs/user-guide/agent.md)
- [Helm chart installation](helm-templates/README.md)
