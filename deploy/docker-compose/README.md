# Qubership-APIHUB docker-compose files collection

Folders here contain Qubership APIHUB setups for Docker Compose or Podman Compose. They are for local development,
demos, and tests. For production, use the Helm chart in [`../helm-templates`](../helm-templates/README.md).

- [`apihub-generic`](apihub-generic/README.md): all APIHUB services and PostgreSQL, without add-ons or integrations.
  The [installation guide](../../docs/installation-guide.md#docker-compose) describes the walkthrough.
- [`with-keycloak`](with-keycloak/README.md): the generic stack plus Keycloak with SAML and OIDC integration.
- [`backend-debug`](backend-debug/README.md): everything except the backend (UI, builder, PostgreSQL), so you run and
  debug the backend from your IDE.

Every file the scripts and the services read is explained in the
[configuration reference](../../docs/configuration-reference.md). The
[local run guide](../../docs/development/local-run.md) shows how to run these stacks with locally built images.
