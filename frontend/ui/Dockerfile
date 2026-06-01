FROM docker.io/node:24 AS builder

ARG TAG=dev

WORKDIR /workspace

RUN --mount=type=secret,id=npmrc,target=.npmrc mv "$(npm pack @netcracker/qubership-apihub-ui-agents@"$TAG")" qubership-apihub-ui-agents.tgz
RUN --mount=type=secret,id=npmrc,target=.npmrc mv "$(npm pack @netcracker/qubership-apihub-ui-portal@"$TAG")" qubership-apihub-ui-portal.tgz

FROM docker.io/nginx:1.30.1-alpine3.23

WORKDIR /tmp/build

COPY nginx/errors                        /var/www/error
COPY nginx/nginx.conf.template           /app/nginx.conf.template
COPY nginx/entrypoint.sh                 /app

RUN mkdir /usr/share/nginx/html/agents && mkdir /usr/share/nginx/html/portal

COPY --from=builder /workspace/qubership-apihub-ui-agents.tgz qubership-apihub-ui-agents.tgz
COPY --from=builder /workspace/qubership-apihub-ui-portal.tgz qubership-apihub-ui-portal.tgz

RUN tar zxvf ./qubership-apihub-ui-agents.tgz && mv ./package/dist/* /usr/share/nginx/html/agents && rm -rf ./package
RUN tar zxvf ./qubership-apihub-ui-portal.tgz && mv ./package/dist/* /usr/share/nginx/html/portal && rm -rf ./package

# Sets the correct file creation time. For more information, see here https://github.com/Netcracker/qubership-apihub/issues/238#issuecomment-3019713963
RUN find /usr/share/nginx/html -type f -exec touch {} +

# giving permissions to nginx
RUN mkdir -p /app/nginx && \
    chmod -R 777 /var/log/nginx /var/cache/nginx/ /var/run/ /usr/share/nginx/html/ /app/nginx && \
    chmod -R +x /app/

WORKDIR /app

EXPOSE 8080

USER 1000

ENTRYPOINT ["/app/entrypoint.sh"]
