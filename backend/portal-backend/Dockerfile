# Note: this uses host platform for the build, and we ask go build to target the needed platform, so we do not spend time on qemu emulation when running "go build"
FROM --platform=$BUILDPLATFORM docker.io/golang:1.26.6-alpine3.23 AS builder
ARG BUILDPLATFORM
ARG TARGETOS
ARG TARGETARCH

WORKDIR /workspace

# Built from backend/, so that `replace ... => ../commons-go` in go.mod resolves to
# /workspace/commons-go.
COPY commons-go ./commons-go
COPY portal-backend ./portal-backend

WORKDIR /workspace/portal-backend

# GOWORK=off: the image builds this module alone, so go.mod must hold the versions
# `go work sync` writes; CI checks that.
RUN GOWORK=off GOSUMDB=off CGO_ENABLED=0 GOFLAGS=-mod=readonly go mod download && GOWORK=off GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o qubership-apihub-service .

FROM ghcr.io/netcracker/qubership-core-base:2.5.8@sha256:0c2c9e4b49e73efffb30edf8d3de8b3eb43194a6c4f688da08ec3236b570b486

ARG GIT_BRANCH=unknown
ARG GIT_HASH=unknown

ENV GIT_BRANCH=$GIT_BRANCH
ENV GIT_HASH=$GIT_HASH

WORKDIR /app/qubership-apihub-service

COPY --chown=10001:0 --chmod=555 --from=builder /workspace/portal-backend/qubership-apihub-service ./qubership-apihub-service
COPY --chown=10001:0 --chmod=555 portal-backend/static ./static
COPY --chown=10001:0 --chmod=555 portal-backend/resources ./resources
COPY --chown=10001:0 --chmod=555 portal-backend/docs/api ./api

USER 10001:10001

CMD ["./qubership-apihub-service"]

