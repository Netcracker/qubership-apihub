# Note: this uses host platform for the build, and we ask go build to target the needed platform, so we do not spend time on qemu emulation when running "go build"
FROM --platform=$BUILDPLATFORM docker.io/golang:1.27.2-alpine3.23 as builder
ARG BUILDPLATFORM
ARG TARGETOS
ARG TARGETARCH

WORKDIR /workspace

# Built from backend/, so that `replace ... => ../commons-go` in go.mod resolves to
# /workspace/commons-go.
COPY commons-go ./commons-go
COPY test-service ./test-service

WORKDIR /workspace/test-service

# GOWORK=off: the image builds this module alone, so go.mod must hold the versions
# `go work sync` writes; CI checks that.
RUN GOWORK=off GOSUMDB=off CGO_ENABLED=0 GOFLAGS=-mod=readonly go mod download && GOWORK=off GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o qubership-apihub-test-service .

FROM docker.io/alpine:3.24.3

ARG GIT_BRANCH=unknown
ARG GIT_HASH=unknown

ENV GIT_BRANCH=$GIT_BRANCH
ENV GIT_HASH=$GIT_HASH

WORKDIR /app/qubership-apihub-test-service

COPY --from=builder /workspace/test-service/qubership-apihub-test-service ./qubership-apihub-test-service
COPY test-service/static ./static

RUN chmod -R a+rwx /app

USER 10001

ENTRYPOINT ["./qubership-apihub-test-service"]
