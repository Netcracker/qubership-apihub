# Copyright 2024-2025 NetCracker Technology Corporation
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Note: this uses host platform for the build, and we ask go build to target the needed platform, so we do not spend time on qemu emulation when running "go build"
FROM --platform=$BUILDPLATFORM docker.io/golang:1.26.6-alpine3.23 AS builder
ARG BUILDPLATFORM
ARG TARGETOS
ARG TARGETARCH

WORKDIR /workspace

# Built from backend/, so that `replace ... => ../commons-go` in go.mod resolves to
# /workspace/commons-go.
COPY commons-go ./commons-go
COPY api-linter-service ./api-linter-service

WORKDIR /workspace/api-linter-service

SHELL ["/bin/ash", "-eo", "pipefail", "-c"]

# GOWORK=off on every go command: the image builds this module alone, so go.mod must hold
# the versions `go work sync` writes; CI checks that.
RUN if env | grep -Eiq '^(http|https|all)_proxy=https?://https?://'; then unset HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy; fi; \
    GOWORK=off go run ./tools/download-linter-tools -os=${TARGETOS} -arch=${TARGETARCH}
RUN if env | grep -Eiq '^(http|https|all)_proxy=https?://https?://'; then unset HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy; fi; \
    GOWORK=off GOSUMDB=off CGO_ENABLED=0 GOFLAGS=-mod=readonly go mod download && GOWORK=off GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o qubership-api-linter-service .

FROM ghcr.io/netcracker/qubership-core-base:2.3.7@sha256:b917b3a1731a2ae26b507d22565f030ec25ff8d28b75a80b8b08bbc946f4d73b

ARG GIT_BRANCH=unknown
ARG GIT_HASH=unknown

ENV GIT_BRANCH=$GIT_BRANCH
ENV GIT_HASH=$GIT_HASH
ENV SPECTRAL_BIN_PATH=resources/spectral/linux/spectral

WORKDIR /app/qubership-api-linter-service

COPY --chown=10001:0 --chmod=555 --from=builder /workspace/api-linter-service/qubership-api-linter-service ./qubership-api-linter-service
COPY --chown=10001:0 --chmod=555 --from=builder /workspace/api-linter-service/resources ./resources
COPY --chown=10001:0 --chmod=555 api-linter-service/docs/api ./api

USER 10001:10001

CMD ["./qubership-api-linter-service"]

