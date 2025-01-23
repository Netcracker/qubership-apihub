FROM docker.io/node:20

ARG TAG=dev

WORKDIR /usr/src/app

RUN --mount=type=secret,id=npmrc,target=.npmrc mv $(npm pack @netcracker/qubership-apihub-build-task-consumer@"$TAG") qubership-apihub-build-task-consumer.tgz
RUN tar zxvf ./qubership-apihub-build-task-consumer.tgz && mv ./package/dist dist 
RUN --mount=type=secret,id=npmrc,target=.npmrc mv ./package/package.json package.json mv ./package/npm-shrinkwrap.json && npm ci

USER 10001

CMD [ "node", "--max-old-space-size=3100", "--max-semi-space-size=32", "dist/main" ]
