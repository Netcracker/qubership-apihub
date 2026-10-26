# The thin layer that gives a branch tag its own ref. The content image (src-<hash>) is built once per content
# hash and knows nothing about branches; this adds the branch and the short commit as environment variables.
# ENV only, no RUN, so it works for every base image and builds for both platforms in seconds.
#
#   docker buildx build --platform linux/amd64,linux/arm64 \
#     --build-arg BASE=<image>:src-<hash> --build-arg GIT_BRANCH=<branch> --build-arg GIT_HASH=<short sha> \
#     -t <image>:<branch tag> --push tools/ci/ref-overlay

ARG BASE
FROM ${BASE}

ARG GIT_BRANCH
ARG GIT_HASH

ENV GIT_BRANCH=${GIT_BRANCH}
ENV GIT_HASH=${GIT_HASH}
