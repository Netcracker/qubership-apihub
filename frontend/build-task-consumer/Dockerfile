# APIHUB build-task-consumer, a NestJS service. The build context is the workspace root, and the
# image copies a production tree that `pnpm deploy` writes on the host first:
#
#   pnpm deploy --filter=./frontend/build-task-consumer --prod .deploy/build-task-consumer
#   docker build -f frontend/build-task-consumer/Dockerfile .

FROM docker.io/node:24-alpine

# No GIT_BRANCH or GIT_HASH build args: the content hash cannot see them, so a retagged image
# reported the ref that built it first. The commit and branch are OCI annotations on each branch
# tag instead (`docker buildx imagetools inspect <image>:<tag>`).

ENV NODE_ENV=production

WORKDIR /usr/src/app

COPY .deploy/build-task-consumer/package.json  ./package.json
COPY .deploy/build-task-consumer/node_modules  ./node_modules

COPY frontend/build-task-consumer/dist ./dist

# Package managers are not needed at runtime.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
           /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*

USER 10001

CMD ["node", "--max-old-space-size=3100", "--max-semi-space-size=32", "dist/main"]
