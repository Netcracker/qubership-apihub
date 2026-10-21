# Qubership-APIHUB docker-compose files collection

Folders here contains various Qubership-APIHUB setups using docker-compose

- `apihub-generic` - pure APIHUB with only single dependecy to Postgres, without any add-ons and integrations.
- `with-keycloak` - APIHUB with only single dependecy to Postgres, with SAML integration with Keycloak.
- `backend-debug` - everything except the backend (UI, build task consumer, Postgres), so you run and debug the
  backend from your IDE. See its [README](backend-debug/README.md).
