# Copyright 2024-2026 NetCracker Technology Corporation
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

# Note: this uses the host platform for the build and asks go build to target the needed platform (no qemu emulation).
FROM --platform=$BUILDPLATFORM docker.io/golang:1.27.2-alpine3.23 AS builder
ARG BUILDPLATFORM
ARG TARGETOS
ARG TARGETARCH

# Built from backend/documents-backend: the module does not use commons-go.
WORKDIR /workspace/documents-backend

COPY . .

# GOWORK=off: the image builds this module alone, so go.mod must hold the versions
# `go work sync` writes; CI checks that.
RUN GOWORK=off GOSUMDB=off CGO_ENABLED=0 GOFLAGS=-mod=readonly go mod download && GOWORK=off CGO_ENABLED=0 GOFLAGS=-mod=readonly GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o qubership-apihub-documents-backend .


FROM ghcr.io/netcracker/qubership-core-base:2.5.10@sha256:51173b982248bb866b236f504579b71c0a9c4a41975b957595f9faa9ab3fb5d6

# GIT_BRANCH, GIT_HASH, and COMMIT_TIME are added to the branch tag by tools/ci/ref-overlay, not to this image.

WORKDIR /app/qubership-apihub-documents-backend

COPY --chown=10001:0 --chmod=555 --from=builder /workspace/documents-backend/qubership-apihub-documents-backend ./qubership-apihub-documents-backend
COPY --chown=10001:0 --chmod=555 --from=builder /workspace/documents-backend/resources ./resources
COPY --chown=10001:0 --chmod=555 --from=builder /workspace/documents-backend/docs/api ./api

USER 10001:10001
EXPOSE 8080

CMD ["./qubership-apihub-documents-backend"]
