---
name: advanced-verification
description: "Build the APIHub backend, start it locally with local_config, author or extend a Postman/Newman E2E collection under tests/api covering the change, run it, and analyze and fix failures. Use after implementing a non-trivial backend change, before finishing the task, to verify it end-to-end against a real running instance."
---

# Advanced Verification

Verifies a backend change end-to-end against a real local instance: build, run, hit real HTTP
endpoints via a Postman/Newman collection stored in `tests/api`, and iterate on failures.

Complements, does not replace, `postman-e2e-followup` — that skill only reminds about follow-up
in the **external** `qubership-apihub-postman-collections` repo. This skill runs in-repo
verification only. For commands, config recipes, and a full collection example, see
[reference.md](reference.md).

## When to use

Only for changes with an HTTP-observable effect: new/changed endpoint, altered response/status
codes, changed validation, or a migration that affects API behavior. Skip for pure refactors
with no behavior change.

## Workflow

1. **Author or extend the Postman collection** in `tests/api/<slug>.postman_collection.json`,
   following the structure (collection
   `description` with purpose/endpoints/auth, `variable[]` block with `baseUrl`/`apiKey`
   defaulting to the local zero-day token, numbered folders, `pm.test` assertions,
   `Date.now()`-suffixed throwaway IDs for isolation). Extend an existing collection instead of
   creating a duplicate when one already targets the same feature area.

2. **Check Postgres** is reachable at `localhost:5432` (matches
   `qubership-apihub-service/local_config/config.yaml`). If unreachable, **stop and ask the
   user** whether to start it via the local docker-compose DB stack or point to another
   instance — do not start containers unprompted.

3. **Build**: `go build .` from `qubership-apihub-service/` (do not force
   `GOOS=linux`/`GOARCH=amd64` — that's only for the container build script).

4. **Start locally with `local_config`**: set `APIHUB_CONFIG_FOLDER` to
   `qubership-apihub-service/local_config` and run the built binary from
   `qubership-apihub-service/`. Default listen address is `:8090`. There is no env-var override
   for config values in this codebase — if the port is occupied, do not edit the committed
   `local_config/config.yaml`; copy it to a scratch directory, edit
   `technicalParameters.listenAddress` in the copy, and point `APIHUB_CONFIG_FOLDER` at the copy
   for that run only. The `zeroDayConfiguration.accessToken` in `local_config/config.yaml` is
   auto-provisioned as a sysadm `api-key` at startup — no login flow needed.

5. **Run the collection** with Newman against the running instance.

6. **Analyze failures**, map them back to the relevant Go source, and fix root causes per
   `AGENTS.md` error-handling rules — no swallowing or masking. Rebuild, restart, and rerun.
   Iterate until the collection passes.

7. **Stop the local service** when done; keep any temporary config copy out of git.

8. Note in the completion summary that `postman-e2e-followup` is a separate, external-repo
   concern — running this skill does not replace that reminder.
