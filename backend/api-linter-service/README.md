# API linter service

The API linter service is a Go service that lints and validates API specifications (OpenAPI and AsyncAPI) for APIHUB.
It reacts to version-publication events from the backend through the Olric cache, runs Spectral (and an optional
AI-based linter) over the documents, stores the results in PostgreSQL, and exposes REST endpoints for validation
summaries and scoring. The module ships the image `qubership-api-linter-service`. Its status is a development preview:
the service is not yet recommended for production.

It is an extension service of the backend; see the [architecture overview](../../docs/architecture/overview.md).

## Build, test, and lint

The Nx project is `api-linter-service` (tag `lang:go`). Run from the repository root:

```bash
pnpm exec nx run api-linter-service:build
pnpm exec nx run api-linter-service:test
pnpm exec nx run api-linter-service:lint
```

The service needs the Spectral binary. The image build downloads it with `tools/download-linter-tools`; the versions
are in [`third-party-tools.env`](third-party-tools.env). For a local run, `build_golang_binary.cmd` (Windows) runs the
download tool and builds a Linux binary. For the image, see
[Build and test: Images](../../docs/development/build-and-test.md#images).

## Run and debug locally

The generic Compose stack starts the service with the rest of the product; see
[Run APIHUB locally](../../docs/development/local-run.md). To run it from the IDE, copy
[`config.template.yaml`](config.template.yaml) to a folder as `config.yaml`, set the database, the Olric settings, and
`linters.spectral.binPath`, and start `main.go` from this folder. Breakpoints and the config folder variable:
[Debugging: Go service](../../docs/development/debugging.md#go-service).

## Configuration

The service loads parameters from `config.yaml`. The format, the defaults, and examples are in
[`config.template.yaml`](config.template.yaml). By default it looks for `config.yaml` in the working directory; set
`LINTER_CONFIG_FOLDER` to use another directory. The
[configuration reference](../../docs/configuration-reference.md) describes the deployment settings.

The remaining environment-only settings are:

- `LINTER_CONFIG_FOLDER`: the directory that contains `config.yaml`; defaults to `.`.
- `LOG_LEVEL`: the initial log level; defaults to `info` when empty or invalid. A system administrator can change it at
  runtime with `/api/v1/debug/logs/setLevel`.

## API specifications

The OpenAPI files and a Postman collection are in [`docs/api/`](docs/api/):
[`linter_service_api.yaml`](docs/api/linter_service_api.yaml) and [`admin_api.yaml`](docs/api/admin_api.yaml).

## Further reading

The early design diagrams of the validation flow, as draw.io files, are in [`docs/arch_proposal/`](docs/arch_proposal/).
