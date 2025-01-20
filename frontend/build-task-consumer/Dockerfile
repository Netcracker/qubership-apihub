FROM docker.io/node:20

WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y jq && rm -rf /var/lib/apt/lists/*

ARG TAG=dev
RUN --mount=type=secret,id=npmrc,target=.npmrc mv $(npm pack @netcracker/qubership-apihub-build-task-consumer@"$(npm view @netcracker/qubership-apihub-build-task-consumer --json | jq -r '."dist-tags".'$TAG)") qubership-apihub-build-task-consumer.tgz
RUN tar zxvf ./qubership-apihub-build-task-consumer.tgz && mv ./package/dist dist

USER 10001

CMD [ "node", "--max-old-space-size=3100", "--max-semi-space-size=32", "dist/main" ]