# Note: this uses host platform for the build, and we ask go build to target the needed platform, so we do not spend time on qemu emulation when running "go build"
FROM --platform=$BUILDPLATFORM docker.io/golang:1.23.4-alpine3.21 as builder
ARG BUILDPLATFORM
ARG TARGETOS
ARG TARGETARCH

WORKDIR /workspace

COPY qubership-apihub-service qubership-apihub-service 

WORKDIR /workspace/qubership-apihub-service 

RUN set GOSUMDB=off && set CGO_ENABLED=0 && go mod tidy && go mod download && go GOOS=${TARGETOS} GOARCH=${TARGETARCH} build .

FROM docker.io/golang:1.23.4-alpine3.21

MAINTAINER qubership.org

WORKDIR /app/qubership-apihub-service

USER root

RUN apk --no-cache add curl

COPY --from=builder /workspace/qubership-apihub-service/qubership-apihub-service ./qubership-apihub-service
ADD qubership-apihub-service/static ./static
ADD qubership-apihub-service/resources ./resources
ADD docs/api ./api

RUN chmod -R a+rwx /app

USER 10001

ENTRYPOINT ./qubership-apihub-service
