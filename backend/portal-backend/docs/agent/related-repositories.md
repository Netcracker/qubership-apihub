# Related repositories (outside this workspace)

Backend features often require follow-up in **separate repositories**. Agents must **remind** the developer with concrete actions and links; do **not** edit those repos unless they are open in the current workspace.

Update the URLs below when repository names or org paths change.

## Helm charts / Kubernetes deployment

| Field | Value |
|-------|--------|
| **Repository** | `https://github.com/Netcracker/qubership-apihub` |
| **Typical paths** | `values.yaml`, chart templates, ConfigMaps, Secrets, env var blocks |

**Remind the developer to update Helm when the backend change includes any of:**

- New or renamed **environment variables** or **secrets** (including defaults in `SystemInfoService` / config structs).
- New **feature flags** or config keys loaded at startup.
- New **ports**, health/readiness probes, or resource limits.
- New **background jobs**, cron schedules, or cleanup workers.
- New **volume mounts**, file paths, or object-storage settings.
- New **optional components** toggled at deploy time (e.g. AI chat enabled flag).

**Suggested reminder text (agent):**

> This change may require updates in the Helm charts repo: [link]. Check env vars, values.yaml, and templates for new configuration.

## E2E / Postman integration tests

| Field | Value |
|-------|--------|
| **Repository** | `https://github.com/Netcracker/qubership-apihub-postman-collections` |
| **Local reference** | `docs/postman_collections.md`, `docs/postman/` (examples only; canonical collections live in the external repo) |

**Remind the developer to update E2E Postman collections when the change includes any of:**

- New or changed **REST endpoints** (method, path, query, headers).
- Changed **request or response** JSON shape or status codes.
- New **auth** or permission behavior worth asserting.
- New **error codes** or validation rules covered by integration tests.

**Suggested reminder text (agent):**

> Add or update requests/assertions in the Postman E2E repo: [link]. Align with OpenAPI changes in `docs/api/`.

## Optional: other repos

Add rows here (URL + “remind when”) for frontend, builder, or shared libraries if needed later.

## Monorepo note

These reminders exist because charts and E2E tests are not in this repository yet. When migrated to a monorepo, replace links with in-repo paths and adjust `AGENTS.md` accordingly.
