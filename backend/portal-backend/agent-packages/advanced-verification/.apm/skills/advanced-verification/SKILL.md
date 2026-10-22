---
name: advanced-verification
description: "Build portal-backend, start it locally from a scratch config, author or extend a Postman/Newman collection under backend/portal-backend/tests/api covering the change, run it, and analyze and fix failures. Use after implementing a non-trivial portal-backend change with an HTTP-observable effect, before finishing the task, to verify it end-to-end against a real running instance."
---

# Advanced Verification

Verifies a `backend/portal-backend` change end-to-end against a real local instance: build, run, hit real HTTP
endpoints via a Postman/Newman collection stored in `backend/portal-backend/tests/api`, and iterate on failures.

Complements, does not replace, `postman-e2e-followup`. That skill only reminds about follow-up in the shared E2E
suite under `tests/postman-collections`. This skill runs the in-module verification only. For commands, config
recipes, and collection conventions, see [reference.md](reference.md).

## When to use

Only for changes with an HTTP-observable effect: new or changed endpoint, altered response or status codes, changed
validation, or a migration that affects API behavior. Skip for pure refactors with no behavior change.

## Workflow

1. **Author or extend the Postman collection** in `backend/portal-backend/tests/api/<slug>.postman_collection.json`,
   following the structure in the reference (collection `description` with purpose, endpoints, and auth; a
   `variable[]` block with `baseUrl` and `apiKey`; numbered folders; `pm.test` assertions; `Date.now()`-suffixed
   throwaway IDs for isolation). Extend an existing collection instead of creating a duplicate when one already
   targets the same feature area.

2. **Check Postgres** is reachable at `localhost:5432`. If unreachable, **stop and ask the user** whether to start it
   with the local DB compose stack or to point to another instance. Do not start containers unprompted.

3. **Create a scratch config** outside git: copy `backend/portal-backend/config.template.yaml` to a temporary folder
   as `config.yaml` and set the minimum from the reference (database, `productionMode: false`, JWT key,
   `zeroDayConfiguration`, `listenAddress`, cache ports). There is no committed local config.

4. **Build**: `go build .` from `backend/portal-backend`. Do not force `GOOS=linux` or `GOARCH=amd64`; that is only
   for the container build.

5. **Start** the binary with `APIHUB_CONFIG_FOLDER` pointing at the scratch folder and **with
   `backend/portal-backend` as the working directory**, because migrations and assets resolve relative to it. See
   `backend/portal-backend/docs/running-and-probing.md` for ports, readiness, and false-healthy traps. The
   `zeroDayConfiguration.accessToken` is provisioned as a sysadm `api-key` at startup, so no login flow is needed.

6. **Run the collection** with Newman against the running instance.

7. **Analyze failures**, map them back to the relevant Go source, and fix root causes per the module `AGENTS.md`
   error-handling rules. Do not swallow or mask errors. Rebuild, restart, and rerun until the collection passes.

8. **Stop the local service** when done and keep the scratch config out of git.

9. Note in the completion summary that `postman-e2e-followup` is a separate concern for the shared suite. Running
   this skill does not replace that reminder.
