# Note: this uses host platform for the build, and we ask go build to target the needed platform, so we do not spend time on qemu emulation when running "go build"
FROM --platform=$BUILDPLATFORM docker.io/golang:1.26.1-alpine3.23 AS builder
ARG BUILDPLATFORM
ARG TARGETOS
ARG TARGETARCH

WORKDIR /workspace

COPY qubership-apihub-service qubership-apihub-service

WORKDIR /workspace/qubership-apihub-service

RUN GOSUMDB=off CGO_ENABLED=0 go mod tidy && go mod download && GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build .

FROM ghcr.io/netcracker/qubership-core-base:2.3.3@sha256:1339716127a7d170ba307b89f3a933f5e09c447607c89e16bf8d5a379db4e1f6

ARG GIT_BRANCH=unknown
ARG GIT_HASH=unknown

ENV GIT_BRANCH=$GIT_BRANCH
ENV GIT_HASH=$GIT_HASH

WORKDIR /app/qubership-apihub-service

COPY --chown=10001:0 --chmod=555 --from=builder /workspace/qubership-apihub-service/qubership-apihub-service ./qubership-apihub-service
COPY --chown=10001:0 --chmod=555 qubership-apihub-service/static ./static
COPY --chown=10001:0 --chmod=555 qubership-apihub-service/resources ./resources
COPY --chown=10001:0 --chmod=555 docs/api ./api

USER 10001:10001

CMD ["./qubership-apihub-service"]
