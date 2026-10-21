# Backend documentation

What stays in the module: the Go development guide, the debugging notes, the API specifications, and a few scripts and
examples. Guides that concern the whole product moved to [`docs/`](../../../docs/README.md) at the repository root.
For the module itself, start with the [backend README](../README.md).

## Development

- [Development guide](development_guide.md): logging, pull requests, and the project structure of the Go code
- [Running and probing](running-and-probing.md): the traps of a local backend, with the commands that probe it
- [Newcomer environment setup](newcomer_env_setup.md): the tools a backend developer installs
- [Local development](local_development/local_development.md): the backend against a database and UI in Compose
- [Getting started](../../../docs/development/getting-started.md): tools, clone, install, first build
- [Run APIHUB locally](../../../docs/development/local-run.md): Compose, kind, and the backend from the IDE
- [Debugging](../../../docs/development/debugging.md): Delve and IDE launch configurations
- [API guidelines](../../../docs/development/api-guidelines.md): API-first design, changes, and deprecation

## API specifications

- [APIHUB API](api/APIHUB_API.yaml)
- [APIHUB Admin API](<api/Admin API.yaml>)
- [APIHUB Internal API](api/APIHUB_API_internal.yaml)
- [APIHUB Admin Internal API](api/Admin_API_internal.yaml)
- [AI Chat API collection](postman/AI_Chat_API.postman_collection.json): chat lifecycle, streaming SSE, generated file
  download
- [Migration collection](data_migration/Migration.postman_collection.json)
- [All Newman collections](../../../tests/README.md#newman-collections)

## Operations helpers

- [Useful PostgreSQL queries and scripts](postgres_useful_queries/)
- [Auto-labeler configuration example](examples/auto-labeler-config.yaml)

## Guides that moved to the repository documentation

- [Build process](../../../docs/architecture/build-process.md)
- [Security model](../../../docs/administration/security-model.md)
- [Data maintenance](../../../docs/administration/data-maintenance.md)
- [Business metrics](../../../docs/administration/business-metrics.md)
- [Operations migration analysis](../../../docs/administration/operations-migration-analysis.md)
- [Modifying published version sources](../../../docs/administration/modify-published-sources.md)
- [Static resource customization](../../../docs/administration/static-resources-customization.md)
- [MinIO storage](../../../docs/configuration-reference.md#minio-s3-storage)
- AI assistant design: [AI chat](../../../docs/design/ai-assistant/feature-ai-chat-design.md),
  [IDS document generation](../../../docs/design/ai-assistant/feature-ids-generation-design.md), and the
  [frontend contract](../../../docs/design/ai-assistant/ai-chat-frontend-contract.md)
