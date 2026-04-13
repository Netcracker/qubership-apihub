# Qubership APIHUB documentation

This folder contains **product documentation** shipped with the deployment repository: installation and operations guides, the user guide, project history, and **generated database documentation** (ERD). It complements the [GitHub Wiki](https://github.com/Netcracker/qubership-apihub/wiki), which holds architecture deep-dives and development process material.

Use the sections below to find the right entry point.

## Product overview (Wiki)

High-level material lives on the wiki and is updated independently of this repo:

| Topic | Wiki page |
|-------|-----------|
| System architecture, microservices, TS processing stack, API type matrix | [Architecture landscape](https://github.com/Netcracker/qubership-apihub/wiki/Architecture-landscape) |
| Feature inventory (AsyncAPI, linting, scoring, agents, UI, limits) | [Features list](https://github.com/Netcracker/qubership-apihub/wiki/Features-list) |
| Development management (ticketing, branches, releases) | [Development Management Guide](https://github.com/Netcracker/qubership-apihub/wiki/Development-Management-Guide) |
| Wiki home (agents, linter, sniffer, links) | [Home](https://github.com/Netcracker/qubership-apihub/wiki) |

## Guides in this repository

| Document | Audience | Description |
|----------|----------|-------------|
| [Installation guide](./installation-guide.md) | Platform / DevOps | Dependencies, hardware sizing, Docker Compose, Helm install |
| [Admin guide](./admin-guide.md) | Administrators | Day-one administration tasks |
| [Maintenance guide](./maintenance-guide.md) | Operators | Ongoing maintenance |
| [User guide](./user-guide.md) | End users | Using the Portal and core workflows |
| [Project history](./apihub-history.md) | Anyone | Why APIHUB exists, background and evolution |

## Deployment artifacts (outside `docs/`)

These paths are the usual starting points when installing or customizing the stack:

| Path | Purpose |
|------|---------|
| [../docker-compose/apihub-generic/](../docker-compose/apihub-generic/) | Full stack via Docker Compose (dev/test); Keycloak variant under `../docker-compose/with-keycloak/` |
| [../helm-templates/README.md](../helm-templates/README.md) | Production-oriented Helm chart for Kubernetes |
| [../helm-templates/qubership-apihub/values.yaml](../helm-templates/qubership-apihub/values.yaml) | Central configuration values (commented) |
| [../helm-templates/local-k8s-quickstart/README.md](../helm-templates/local-k8s-quickstart/README.md) | Local K8s quickstart (Kind/Rancher, optional **Apache Superset**, not production-grade) |

## Reference: database ERD (generated)

Static HTML generated from the backend database schema (e.g. SchemaSpy-style tables and relationships):

- [Database documentation (ERD)](./pages/erd/index.html) — open in a browser from a clone, or browse the `pages/erd/` tree in your IDE.

Regeneration procedures, if any, are typically described in backend or CI documentation; this folder is mainly for **read-only reference**.

## Related source repositories (docs & APIs)

Each component often has its own `docs/` or OpenAPI specs on GitHub:

| Component | Repository (docs / `develop` branch) |
|-----------|--------------------------------------|
| Backend (API registry, core REST API) | [qubership-apihub-backend](https://github.com/Netcracker/qubership-apihub-backend/tree/develop/docs) |
| Web UI (Portal + Agents) | [qubership-apihub-ui](https://github.com/Netcracker/qubership-apihub-ui/tree/develop/docs) |
| Build worker (NestJS) | [qubership-apihub-build-task-consumer](https://github.com/Netcracker/qubership-apihub-build-task-consumer/tree/develop/docs) |
| API Linter (Spectral, AI lint, version scoring) | [qubership-api-linter-service](https://github.com/Netcracker/qubership-api-linter-service) |
| K8s discovery agent | [qubership-apihub-agent](https://github.com/Netcracker/qubership-apihub-agent) |
| Agents backend | [qubership-apihub-agents-backend](https://github.com/Netcracker/qubership-apihub-agents-backend) |
| Reusable CI workflows | [qubership-apihub-ci](https://github.com/Netcracker/qubership-apihub-ci) |

---

**Tip:** The repository [root README](../README.md) summarizes product goals and modules; this `docs/README.md` focuses on **where to read** for install, operations, and architecture.
