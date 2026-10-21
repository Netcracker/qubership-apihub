# Deploy

The deployment assets of APIHUB: the product Helm chart, the Docker Compose stacks, and a local Kubernetes quickstart.
Nothing here builds with Nx. For installation steps, see the [installation guide](../docs/installation-guide.md). The
[configuration reference](../docs/configuration-reference.md) maps every Helm value to an environment variable or a
`config.yaml` key, and it must change together with the assets.

## Helm charts

| Chart | Sources | Released with |
|-------|---------|---------------|
| `qubership-apihub` (the product) | [`helm-templates/qubership-apihub`](helm-templates/qubership-apihub/) | The product tag `X.Y.Z` |
| `qubership-apihub-agent` | [`backend/agent/helm-templates/qubership-apihub-agent`](../backend/agent/helm-templates/qubership-apihub-agent/) | The agent tag `agent/X.Y.Z` |

Both charts are published to `oci://ghcr.io/netcracker/charts`. The sources keep development defaults, such as the
image tag `dev`; the release pins the real versions in a staged copy. See
[Helm charts](../docs/development/release-process.md#helm-charts) in the release process. The product chart is
described in [`helm-templates/README.md`](helm-templates/README.md).

## Local Kubernetes quickstart

[`helm-templates/local-k8s-quickstart`](helm-templates/local-k8s-quickstart/README.md) sets up a lightweight cluster on
your machine (Kind or Rancher Desktop) and installs APIHUB and PostgreSQL into it with one script. It is for
developers and R&D, not for production. The `apihub-with-keycloak-quickstart.sh` script adds Keycloak.

## Docker Compose stacks

| Folder | What it starts |
|--------|----------------|
| [`docker-compose/apihub-generic`](docker-compose/apihub-generic/README.md) | APIHUB with PostgreSQL only, no add-ons or integrations |
| [`docker-compose/with-keycloak`](docker-compose/with-keycloak/README.md) | The same, with SAML integration through Keycloak |
| [`docker-compose/backend-debug`](docker-compose/backend-debug/README.md) | Everything except the backend (UI, builder, PostgreSQL), so you run and debug the backend from your IDE |

`docker-compose/with-gitlab` holds only a backend config that adds the GitLab integration. The
`generate_env_and_up_compose.sh` script of a stack rewrites its `.env` and `*-config.yaml` files in place, so run
`git restore .` in the folder before you commit. The commands are in
[Run APIHUB locally](../docs/development/local-run.md).

## Rules for changes

- Helm `values.yaml` and templates are the canonical Kubernetes contract. Compose reproduces the same logical split.
- Keep tokens and URLs aligned across the backend, linter, and agents-backend configs and the builder environment.
- The `extensions` URLs of the backend must match how each stack reaches the linter and agents-backend: cluster DNS
  on Kubernetes, `host.docker.internal` in Compose.
- Check changes with `helm lint` and `helm template`, or run the Compose scripts.
