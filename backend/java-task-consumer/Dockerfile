# syntax=docker/dockerfile:1

# Java 21 JDK (Corretto) + platform entrypoint; see qubership-core-base-images README.
ARG JAVA_BASE_TAG=21-alpine-latest
FROM ghcr.io/netcracker/qubership-java-base:${JAVA_BASE_TAG}

ARG JAPICMP_VERSION=0.26.1

USER root

RUN mkdir -p /opt/jdiff /tmp/java-task-consumer \
 && chown -R 10001:0 /opt/jdiff /tmp/java-task-consumer

# japicmp is invoked as external process (same as PoC)
ADD --chown=10001:0 \
    https://repo1.maven.org/maven2/com/github/siom79/japicmp/japicmp/${JAPICMP_VERSION}/japicmp-${JAPICMP_VERSION}-jar-with-dependencies.jar \
    /opt/jdiff/japicmp.jar

WORKDIR /app

COPY --chown=10001:0 java-task-consumer/target/java-task-consumer-*.jar /app/java-task-consumer.jar

USER 10001:10001

ENV HEALTH_PORT=3000 \
    WORK_DIR=/tmp/java-task-consumer \
    JDIFF_JAPICMP_JAR=/opt/jdiff/japicmp.jar \
    JOB_REQUEST_INTERVAL=3000 \
    JOB_STATUS_INTERVAL=5000 \
    JDIFF_THREADS=4

EXPOSE 3000

CMD ["java", "-XX:+UseContainerSupport", "-jar", "/app/java-task-consumer.jar"]
