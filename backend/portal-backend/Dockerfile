# Note: this uses host platform for the build, and we ask go build to target the needed platform, so we do not spend time on qemu emulation when running "go build"
FROM --platform=$BUILDPLATFORM docker.io/golang:1.26.5-alpine3.23 AS builder
ARG BUILDPLATFORM
ARG TARGETOS
ARG TARGETARCH

WORKDIR /workspace

COPY qubership-apihub-service qubership-apihub-service

WORKDIR /workspace/qubership-apihub-service

RUN GOSUMDB=off CGO_ENABLED=0 go mod tidy && go mod download && GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build .

FROM ghcr.io/netcracker/qubership-core-base:2.3.7@sha256:b917b3a1731a2ae26b507d22565f030ec25ff8d28b75a80b8b08bbc946f4d73b

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

