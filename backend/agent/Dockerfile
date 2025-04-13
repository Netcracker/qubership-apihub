# Note: this uses host platform for the build, and we ask go build to target the needed platform, so we do not spend time on qemu emulation when running "go build"
FROM --platform=$BUILDPLATFORM docker.io/golang:1.23.4-alpine3.21 as builder
ARG BUILDPLATFORM
ARG TARGETOS
ARG TARGETARCH

WORKDIR /workspace

COPY qubership-apihub-agent ./qubership-apihub-agent

WORKDIR /workspace/qubership-apihub-agent

RUN go mod tidy

RUN set GOSUMDB=off && set CGO_ENABLED=0 && go mod tidy && go mod download && GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build .


FROM docker.io/golang:1.23.4-alpine3.21

MAINTAINER qubership.org

USER root

RUN apk --no-cache add curl

WORKDIR /app/qubership-apihub-agent

COPY --from=builder /workspace/qubership-apihub-agent/api-linter-service ./qubership-apihub-agent
COPY --from=builder /workspace/qubership-apihub-agent/resources ./resources

RUN chmod -R a+rwx /app

USER 10001

ENTRYPOINT ./qubership-apihub-agent
