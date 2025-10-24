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
FROM --platform=$BUILDPLATFORM docker.io/golang:1.25.1-alpine3.22 as builder
ARG BUILDPLATFORM
ARG TARGETOS
ARG TARGETARCH

WORKDIR /workspace

COPY qubership-apihub-agent ./qubership-apihub-agent

WORKDIR /workspace/qubership-apihub-agent

RUN go mod tidy

RUN GOSUMDB=off CGO_ENABLED=0 go mod tidy && go mod download && GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build .

FROM docker.io/alpine:3.22.1

ARG GIT_BRANCH=unknown
ARG GIT_HASH=unknown

ENV GIT_BRANCH=$GIT_BRANCH
ENV GIT_HASH=$GIT_HASH

USER root

# hadolint ignore=DL3018
RUN apk --no-cache add curl

WORKDIR /app/qubership-apihub-agent

COPY --from=builder /workspace/qubership-apihub-agent/qubership-apihub-agent ./qubership-apihub-agent
COPY qubership-apihub-agent/config.yaml ./

RUN chmod -R a+rwx /app

USER 10001

ENTRYPOINT ["./qubership-apihub-agent"]
