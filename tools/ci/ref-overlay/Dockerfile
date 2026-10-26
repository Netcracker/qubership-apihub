# The thin layer that gives a branch tag its own ref. The content image (src-<hash>) is built once per content
# hash and knows nothing about branches; this adds the branch and the short commit as environment variables.
# ENV only, no RUN, so it works for every base image and builds for both platforms in seconds.
#
#   docker buildx build --platform linux/amd64,linux/arm64 \
#     --build-arg BASE=<image>:src-<hash> --build-arg GIT_BRANCH=<branch> --build-arg GIT_HASH=<short sha> \
#     -t <image>:<branch tag> --push tools/ci/ref-overlay

# BASE is a src-<hash> content image built by the same workflow run, so there is no tag to pin and no user to add:
# the base image sets USER, and this layer inherits it.
# checkov:skip=CKV_DOCKER_7: BASE is the content image of this run
# checkov:skip=CKV_DOCKER_3: the user is inherited from BASE
ARG BASE
# hadolint ignore=DL3006
FROM ${BASE}

ARG GIT_BRANCH
ARG GIT_HASH

ENV GIT_BRANCH=${GIT_BRANCH}
ENV GIT_HASH=${GIT_HASH}
