# APIHUB documentation

Guides for people who install, run, use, and change Qubership APIHUB. The pages are Markdown files in the
[`docs/`](https://github.com/Netcracker/qubership-apihub/tree/main/docs) folder of the repository. They change together
with the code, and the site shows the same files.

## Who reads what

| You want to | Start with |
|-------------|------------|
| Try APIHUB or bring up an environment | [Installation guide](./installation-guide.md) |
| Operate an installation | [Admin guide](./admin-guide.md) and [Maintenance guide](./maintenance-guide.md) |
| Publish, browse, and compare APIs | [User guide](./user-guide.md) |
| Understand how the product is built | [Architecture](./architecture/README.md) |
| Change the code | [Developer guide](./development/README.md) |

## Get started

- [Installation guide](./installation-guide.md): prerequisites, the Compose and Podman walkthrough, Helm install and
  upgrade, and the local Kubernetes quickstart.
- [Configuration reference](./configuration-reference.md): every setting, from the Helm values to each service's
  `config.yaml` or environment, with the tokens and URLs that must match across services.

## User guide

- [User guide](./user-guide.md): vocabulary and everyday workflows.
- [Portal user guide](./user-guide/portal.md): workspaces, packages, versions, comparison, and operations.
- [Agents user guide](./user-guide/agent.md): discovering APIs in a Kubernetes cluster and promoting them to the Portal.
- [Making a service discoverable](./user-guide/agent-discovery.md): what the APIHUB agent looks for in a service.

## Reference

- [API changes](./reference/api-changes/README.md): the rules that classify an API change as breaking, deprecating,
  non-breaking, or annotation, for OpenAPI, GraphQL, and schemas.

## Administration

- [Admin guide](./admin-guide.md): single sign-on, Helm operations, Compose caveats, and the extensions.
- [Maintenance guide](./maintenance-guide.md): backups, cleanup jobs, and token handling.
- [Administration topics](./administration/security-model.md): the security model, data maintenance, business metrics,
  static resources, and migration analysis. The [admin guide](./admin-guide.md) links each one.

## Architecture

- [Architecture](./architecture/README.md): the [system overview](./architecture/overview.md), the
  [feature list](./architecture/features.md), the [processing libraries](./architecture/processing-libraries.md), the
  [build process](./architecture/build-process.md), and the [database structure](./architecture/database.md).
- The [generated database ERDs](https://netcracker.github.io/qubership-apihub/erd/) show the schema of each backend.

## Design items

- [Design items](./design/README.md): how each feature behaves, by area, with the ID scheme and a template for new
  items.

## Development

- [Developer guide](./development/README.md): workstation setup, workflow, build and test, local run, debugging, CI,
  API guidelines, and the release process.

## Internal records

- [Internal](./internal/README.md): architecture decision records, project history, and the team process. These pages
  are on GitHub only and not on the documentation site.

## Deployment assets

The deployment assets live outside this folder, in [`deploy/`](../deploy/README.md):

| Path | Role |
|------|------|
| [`deploy/docker-compose/apihub-generic/`](../deploy/docker-compose/apihub-generic/README.md) | Reference Compose stack with `generate_env_and_up_compose.sh` |
| [`deploy/docker-compose/with-keycloak/`](../deploy/docker-compose/with-keycloak/README.md) | Compose stack with a Keycloak SSO recipe |
| [`deploy/helm-templates/`](../deploy/helm-templates/README.md) | The Helm chart and its commented production `values.yaml` |
| [`deploy/helm-templates/local-k8s-quickstart/`](../deploy/helm-templates/local-k8s-quickstart/README.md) | Kind and Rancher lab automation; not for production |

The annotated service configuration templates sit next to each module, for example
[`backend/portal-backend/config.template.yaml`](../backend/portal-backend/config.template.yaml) and
[`backend/agent/config.template.yaml`](../backend/agent/config.template.yaml).
