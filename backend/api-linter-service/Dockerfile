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
FROM --platform=$BUILDPLATFORM docker.io/golang:1.26.1-alpine3.23 AS builder
ARG BUILDPLATFORM
ARG TARGETOS
ARG TARGETARCH

WORKDIR /workspace

COPY qubership-api-linter-service ./qubership-api-linter-service

WORKDIR /workspace/qubership-api-linter-service

RUN GOSUMDB=off CGO_ENABLED=0 go mod tidy && go mod download && GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build .

FROM ghcr.io/netcracker/qubership-core-base:2.3.3@sha256:1339716127a7d170ba307b89f3a933f5e09c447607c89e16bf8d5a379db4e1f6

ARG GIT_BRANCH=unknown
ARG GIT_HASH=unknown

ENV GIT_BRANCH=$GIT_BRANCH
ENV GIT_HASH=$GIT_HASH

WORKDIR /app/qubership-api-linter-service

COPY --chown=10001:0 --chmod=555 --from=builder /workspace/qubership-api-linter-service/qubership-api-linter-service ./qubership-api-linter-service
COPY --chown=10001:0 --chmod=555 --from=builder /workspace/qubership-api-linter-service/resources ./resources
COPY --chown=10001:0 --chmod=555 docs/api ./api

USER 10001:10001

CMD ["./qubership-api-linter-service"]
