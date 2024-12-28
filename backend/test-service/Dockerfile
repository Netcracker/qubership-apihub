FROM docker.io/golang:1.18.10-alpine3.17

MAINTAINER qubership.org

WORKDIR /app/qubership-apihub-test-service

ADD qubership-apihub-test-service/qubership-apihub-test-service ./qubership-apihub-test-service
ADD qubership-apihub-test-service/static ./static

RUN chmod -R a+rwx /app

USER 10001

ENTRYPOINT ./qubership-apihub-test-service
