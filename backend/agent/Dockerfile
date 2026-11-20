# Note: this uses host platform for the build, and we ask go build to target the needed platform, so we do not spend time on qemu emulation when running "go build"
FROM --platform=$BUILDPLATFORM docker.io/golang:1.27.2-alpine3.23 AS builder
ARG BUILDPLATFORM
ARG TARGETOS
ARG TARGETARCH

WORKDIR /workspace

# Built from backend/, so that `replace ... => ../commons-go` in go.mod resolves to
# /workspace/commons-go.
COPY commons-go ./commons-go
COPY agent ./agent

WORKDIR /workspace/agent

# GOWORK=off: the image builds this module alone, so go.mod must hold the versions
# `go work sync` writes; CI checks that.
RUN GOWORK=off GOSUMDB=off CGO_ENABLED=0 GOFLAGS=-mod=readonly go mod download && GOWORK=off GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o qubership-apihub-agent .

FROM ghcr.io/netcracker/qubership-core-base:2.5.11@sha256:1b80a6ba225210f2308c68679aa40e5211d4712269200a55862ec2a9061a55de

ARG GIT_BRANCH=unknown
ARG GIT_HASH=unknown

ENV GIT_BRANCH=$GIT_BRANCH
ENV GIT_HASH=$GIT_HASH

WORKDIR /app/qubership-apihub-agent

COPY --chown=10001:0 --chmod=555 --from=builder /workspace/agent/qubership-apihub-agent ./qubership-apihub-agent

USER 10001:10001

CMD ["./qubership-apihub-agent"]

