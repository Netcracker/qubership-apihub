# Qubership APIHUB documentation hub

Shipped beside Helm charts and Compose stacks inside repository [**qubership-apihub**](https://github.com/Netcracker/qubership-apihub). This hub is deliberately **installation- and operator-centric** so a single checkout answers “how do I run it reproducibly?”

High-level narratives (architecture roadmap, backlog process) evolve on the [GitHub Wiki](https://github.com/Netcracker/qubership-apihub/wiki).

---

## How guides are layered

| Guide | Audience | Scope |
|-------|----------|-------|
| [Configuration reference](./configuration-reference.md) | DevOps / platform | **Helm-first K8s contract**, then compose; **runtime truth per service source** (`config.yaml` for backend, agent, linter, and agents-backend; UI and builder env-only) |
| [Installation guide](./installation-guide.md) | Same | Prerequisites, Compose/Podman walkthrough (ports, JWT, substitutions), Helm install/upgrade, quickstart pointers |
| [Admin guide](./admin-guide.md) | Platform owners post-install | SSO rotation, Helm operations, Compose caveats (`generate_env_*`), extensions matrix |
| [Maintenance guide](./maintenance-guide.md) | Operators on-call | Postgres backup tables, TTL links, SSO/token wiki hops |
| [User guide](./user-guide.md) | Portal/API authors | Everyday vocabulary/workflows + links into UI-repo Markdown UX guides |

**Upstream depth:** whenever behaviour is protocol-level (OAuth dance, SAML attributes, MCP API), link to **`qubership-apihub-backend/docs`** on GitHub (`develop`). Do not duplicate long PDFs inside this umbrella repo—the goal is coherent navigation plus accurate deployment facts.

---

## Wiki vs this folder

| Topic | Where it lives |
|-------|----------------|
| Landscape diagram, TS processing stack matrix | Wiki — [Architecture landscape](https://github.com/Netcracker/qubership-apihub/wiki/Architecture-landscape) |
| Feature inventory (`asyncapi`, AI scoring…) | Wiki — [Features list](https://github.com/Netcracker/qubership-apihub/wiki/Features-list) |
| Process / ticketing / branching | Wiki — [Development Management Guide](https://github.com/Netcracker/qubership-apihub/wiki/Development-Management-Guide) |
| **Exact chart values, Compose env keys, JWT scripts** | This repo — `docs/` + `helm-templates/` + `docker-compose/` |

---

## Deployment artifacts (outside `docs/`)

| Path | Role |
|------|------|
| [`../docker-compose/apihub-generic/`](../docker-compose/apihub-generic/) | Reference Podman Compose stack + `init.sql` + `generate_env_and_up_compose.sh` |
| [`../docker-compose/with-keycloak/`](../docker-compose/with-keycloak/) | Compose + Keycloak SAML/OIDC recipe |
| [`../helm-templates/README.md`](../helm-templates/README.md) | Chart entry text |
| [`../helm-templates/qubership-apihub/values.yaml`](../helm-templates/qubership-apihub/values.yaml) | Commented production values (mirrors backend `config.template.yaml` shape) |
| [`../helm-templates/local-k8s-quickstart/`](../helm-templates/local-k8s-quickstart/) | Kind/Rancher lab automation — **not** production |

---

## Annotated templates in component repositories

Use these as **copy/paste starting points** (comments describe every knob):

| Component | Remote template |
|-----------|----------------|
| Backend / Registry | [`config.template.yaml`](https://github.com/Netcracker/qubership-apihub-backend/blob/develop/qubership-apihub-service/config.template.yaml) |
| Kubernetes discovery Agent | [`config.template.yaml`](https://github.com/Netcracker/qubership-apihub-agent/blob/develop/qubership-apihub-agent/config.template.yaml) |

When working from the **APIHUB-ALL** workspace layouts, mirrored paths (`../qubership-apihub-backend/...`) match those templates one-to-one.

---

## Generated database ERD

Static HTML under [`./pages/erd/`](./pages/erd/index.html) — open in a browser for schema-only reference. Regeneration happens through backend/CI automation; this tree is read-only for most readers.

---

## Related component docs (GitHub `develop`)

| Area | Link |
|------|------|
| Backend security & data maintenance | [`qubership-apihub-backend/docs`](https://github.com/Netcracker/qubership-apihub-backend/tree/develop/docs) |
| Portal & Agents UX Markdown | [`qubership-apihub-ui/docs`](https://github.com/Netcracker/qubership-apihub-ui/tree/develop/docs) |
| Reusable CI | [`qubership-apihub-ci`](https://github.com/Netcracker/qubership-apihub-ci) |

---

**Next step:** open [Configuration reference](./configuration-reference.md) if you are editing manifests, or [Installation guide](./installation-guide.md) if you are bringing an environment up for the first time.
