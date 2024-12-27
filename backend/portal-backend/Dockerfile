FROM docker.io/golang:1.23.4-alpine3.21

MAINTAINER qubership.org

WORKDIR /app/qubership-apihub-service

USER root

RUN apk --no-cache add curl

ADD qubership-apihub-service/qubership-apihub-service ./qubership-apihub-service
ADD qubership-apihub-service/static ./static
ADD qubership-apihub-service/resources ./resources
ADD docs/api ./api

RUN chmod -R a+rwx /app

USER 10001

ENTRYPOINT ./qubership-apihub-service
