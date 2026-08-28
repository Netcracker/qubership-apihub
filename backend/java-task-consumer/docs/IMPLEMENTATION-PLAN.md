# Java Task Consumer — Implementation Plan

> **Goal:** Deliver a production-ready APIHUB worker for Java API builds, vendoring PoC engine code and
> integrating with a new backend Java-build API (backend implemented separately).

**Architecture:** Plain Java Maven multi-module; poll/status worker + embedded `jdiff-engine`.

**Tech stack:** Java 21, Maven shade, japicmp CLI, JDK jdeps, Docker, Helm.

---

## Phase 0 — Skeleton (done)

- [x] Parent POM + `jdiff-engine` + `java-task-consumer` modules
- [x] Worker poll loop, registry client, health server, build dispatch stubs
- [x] `JarSource` interface + Docker stub
- [x] Dockerfile, docker-compose, Helm chart, README, DESIGN.md

## Phase 1 — Vendored engine core (done)

- [x] Copy `jdiff-core` packages into `jdiff-engine`
- [x] Align `jdiff-engine/pom.xml` dependencies with PoC (Aether, Maven model, etc.)
- [x] Port unit tests from PoC (`jdeps`, `japicmp` parsers, pipelines) — 74 tests green
- [x] `JarSource` / `GavJarSource` seam for future Docker extraction
- [x] `mvn verify` green

## Phase 2 — Build executors (done)

- [x] `JdiffBuildService` parses `metadata` JSON per `buildType`
- [x] `BuildExecutor` wires all three build types to engine pipelines
- [x] `JdiffEngineFactory` configures resolver, japicmp, jdeps
- [ ] Integration test with real japicmp jar + Maven Central artifact (`-Djdiff.it=true`)

## Phase 3 — Backend contract validation (done)

- [x] Document OpenAPI fragment for Java builder endpoints (`docs/backend-api.md`)
- [x] WireMock tests: poll ZIP → run → multipart status
- [x] GitHub Actions CI (`mvn verify` + Docker build smoke)
- [ ] Manual test against real backend when Java builder API lands

## Phase 4 — Container & ops

- [ ] CI workflow: `mvn verify`, Docker build → `ghcr.io/netcracker/qubership-apihub-java-task-consumer`
- [ ] Optional: `settings.xml` / Maven repo secret mount for private artifacts
- [ ] Resource limits tuning (memory 2–4Gi per replica under load)
- [ ] Integrate Helm templates into `qubership-apihub/helm-templates` umbrella chart
- [ ] Add service to `qubership-apihub/docker-compose/apihub-generic`

## Phase 5 — Hardening (post-MVP)

- [ ] `DockerImageJarSource` implementation (skopeo/crane + extract)
- [ ] Partial failure handling for upgrade-impact (per-module errors)
- [ ] Metrics endpoint or Micrometer agent (optional)
- [ ] Async publish status (`result_ready`) when backend supports it

## Task sizing (next actionable steps)

1. Copy `org.qubership.jdiff.model` from PoC → run `mvn -pl jdiff-engine test`
2. Copy `resolve` + `japicmp` + `jdeps` → run tests
3. Copy `pipeline` + `upgrade` → wire `BuildExecutor`
4. Add WireMock poll/status test in `java-task-consumer`
5. Docker smoke: `mvn package && docker build && docker compose up`

## Backend follow-up (separate track)

- New tables/entities for Java builds (or extend existing build queue with `builderType=java`)
- Routes: `/api/v2/java-builders/{id}/tasks`, `/api/v3/.../java-publish/.../status`
- UI triggers for Java build types
