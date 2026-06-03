---
name: qubership-dockerfile-usage
description: Use when authoring a Dockerfile for a Qubership / Netcracker microservice (Java or Go) — must layer on the official Qubership base images, not generic alpine/eclipse-temurin/golang.
---

# Qubership Dockerfile authoring

Microservices in the Qubership platform must be built **on top of the official Qubership base images** maintained at https://github.com/Netcracker/qubership-core-base-images. These images bake in security defaults, certificate management, non-root user, init.d hooks, and signal handling that the platform relies on. Using `alpine`, `eclipse-temurin`, `golang` or any other public base directly for the runtime stage breaks platform contracts.

## Available base images

All images use `appuser` UID 10001 and `/app` workdir.

- `ghcr.io/netcracker/qubership-core-base` — generic runtime (Go binaries, native, scripts). Alpine.
- `ghcr.io/netcracker/qubership-java-base:21-alpine-<ver>` — Java 21 JDK.
- `ghcr.io/netcracker/qubership-java-base:25-alpine-<ver>` — Java 25 JRE (smaller).
- `ghcr.io/netcracker/qubership-java-base-prof:25-alpine-<ver>` — Java 25 JRE + Qubership profiler.
- `ghcr.io/netcracker/qubership-nginx-base` — NGINX + Lua + Brotli + OTel.

For runtimes not covered above (Python, Node, .NET, etc.), layer on top of `qubership-core-base` and install via `apk` in an intermediate stage.

## Versions

The tags shown in the templates below (`2.2.12`, `25-alpine-2.2.5`) are
illustrative snapshots and are **not** auto-updated when the skill runs.
Always check the upstream release page of `qubership-core-base-images`
for the current latest tag. If the user does not specify a version,
default to the version already in use elsewhere in the same repository
(check existing Dockerfiles or `pom.xml` / `go.mod` neighbours first).

## Common contracts every Dockerfile must follow

These come from the base image and breaking them breaks the platform:

- **User**: run as `USER 10001:10001` (the `appuser`). Never `root`.
- **Ownership of copied files**: use `--chown=10001:0` on every `COPY`. Group `0` is required so OpenShift's random UID still has read access.
- **Workdir**: `/app` (already set in the base, but re-declaring it is fine and explicit).
- **Init scripts** (optional): drop `*.sh` files into `/app/init.d/`, they run in alphabetical order before the main process.
- **No `RUN apk add` in the runtime stage** unless absolutely necessary — the base image is intentionally minimal; additions must be justified.

Do not override the entrypoint script of the base image unless you know exactly what you're doing — it handles trust store setup, profiler bootstrap, signal handling, and crash dumps.

## Go microservice template

Use a multi-stage build. The builder stage runs on the host architecture (`$BUILDPLATFORM`) to avoid QEMU; Go cross-compiles natively via `TARGETOS`/`TARGETARCH` which BuildKit injects.

```dockerfile
FROM --platform=$BUILDPLATFORM golang:1.26 AS builder
ARG TARGETOS
ARG TARGETARCH

WORKDIR /app
COPY go.mod go.mod
COPY go.sum go.sum
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH} \
    go build -a -o <service-binary> ./cmd/

FROM ghcr.io/netcracker/qubership-core-base:2.2.12
WORKDIR /app
COPY --chown=10001:0 --chmod=555 --from=builder /app/<service-binary> /app/<service-binary>
USER 10001:10001

CMD ["/app/<service-binary>"]
```

Key points to preserve when adapting this template:
- `--chmod=555` on the binary — read+execute for everyone, no write. Combined with `--chown=10001:0` this is what makes OpenShift random-UID happy.
- `CMD` (not `ENTRYPOINT`) — keeps the base image's `entrypoint.sh` in charge of certificate loading, `init.d` scripts, signal handling, and crash dumps.

## Java microservice template

Java services typically have their fat jar already built by Maven before `docker build` runs, so the Dockerfile is single-stage. **Pick the variant that matches your build framework.**

### Quarkus (fast-jar layout) or Spring Boot with layered jars

Dependencies live alongside the runner jar in `target/lib/`, so both must be copied:

```dockerfile
FROM ghcr.io/netcracker/qubership-java-base:25-alpine-2.2.5
LABEL maintainer="qubership"

ARG BASE_PATH=.

COPY --chown=10001:0 $BASE_PATH/<module>/target/lib/* /app/lib/
COPY --chown=10001:0 $BASE_PATH/<module>/target/<artifact>-*-runner.jar /app/<artifact>.jar
EXPOSE 8080

WORKDIR /app
USER 10001:10001

CMD ["java", "-Xmx512m", "-Dlog.level=INFO", "-jar", "/app/<artifact>.jar"]
```

### Spring Boot uber-jar (default Spring Boot Maven plugin output)

The fat jar already contains all dependencies, so no `target/lib/` copy is needed:

```dockerfile
FROM ghcr.io/netcracker/qubership-java-base:25-alpine-2.2.5
LABEL maintainer="qubership"

ARG BASE_PATH=.

COPY --chown=10001:0 $BASE_PATH/<module>/target/<artifact>-*.jar /app/<artifact>.jar
EXPOSE 8080

WORKDIR /app
USER 10001:10001

CMD ["java", "-Xmx512m", "-Dlog.level=INFO", "-jar", "/app/<artifact>.jar"]
```

Notes:
- `BASE_PATH` build-arg lets the same Dockerfile work both from the module dir and from the repo root (CI usually runs from root).
- The `target/lib/*` copy is **only** for builds that produce external dependencies alongside the jar (Quarkus fast-jar, Spring Boot with `layers` enabled). For a plain Spring Boot uber-jar use the second template — copying `target/lib/*` will fail at build time because the directory doesn't exist.
- Pick the right Java tag:
  - `25-alpine-<ver>` — default for new services on JRE 25.
  - `25-alpine-<ver>` from the `-prof` image — when the Qubership profiler is needed (set `PROFILER_ENABLED=true` at runtime).
  - `21-alpine-<ver>` — only if the service still requires JDK 21 (e.g. uses tools.jar, attach API, or hasn't migrated yet).
- `CMD` (not `ENTRYPOINT`) for Java — keeps the base image's entrypoint script in charge of init.d, certs, and signal handling.
- Heap (`-Xmx`) should match the k8s memory limit minus overhead; don't hardcode without checking the service's deployment manifest.

