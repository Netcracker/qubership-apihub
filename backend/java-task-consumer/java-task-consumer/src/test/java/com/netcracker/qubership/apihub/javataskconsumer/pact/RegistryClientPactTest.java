package com.netcracker.qubership.apihub.javataskconsumer.pact;

import static com.netcracker.qubership.apihub.javataskconsumer.pact.LibrariesBackendPact.API_KEY;
import static com.netcracker.qubership.apihub.javataskconsumer.pact.LibrariesBackendPact.BUILDER_ID;
import static com.netcracker.qubership.apihub.javataskconsumer.pact.LibrariesBackendPact.CONSUMER;
import static com.netcracker.qubership.apihub.javataskconsumer.pact.LibrariesBackendPact.MULTIPART_CONTENT_TYPE_REGEX;
import static com.netcracker.qubership.apihub.javataskconsumer.pact.LibrariesBackendPact.PACKAGE_ID;
import static com.netcracker.qubership.apihub.javataskconsumer.pact.LibrariesBackendPact.POLL_PATH;
import static com.netcracker.qubership.apihub.javataskconsumer.pact.LibrariesBackendPact.PROVIDER;
import static com.netcracker.qubership.apihub.javataskconsumer.pact.LibrariesBackendPact.PUBLISH_ID;
import static com.netcracker.qubership.apihub.javataskconsumer.pact.LibrariesBackendPact.STATE_NO_TASKS;
import static com.netcracker.qubership.apihub.javataskconsumer.pact.LibrariesBackendPact.STATE_PUBLISH_EXISTS;
import static com.netcracker.qubership.apihub.javataskconsumer.pact.LibrariesBackendPact.STATE_TASK_QUEUED;
import static com.netcracker.qubership.apihub.javataskconsumer.pact.LibrariesBackendPact.STATUS_PATH;
import static com.netcracker.qubership.apihub.javataskconsumer.pact.LibrariesBackendPact.TASK_CONFIG_JSON;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import au.com.dius.pact.consumer.MockServer;
import au.com.dius.pact.consumer.dsl.PactDslWithProvider;
import au.com.dius.pact.consumer.junit5.PactConsumerTestExt;
import au.com.dius.pact.consumer.junit5.PactTestFor;
import au.com.dius.pact.core.model.PactSpecVersion;
import au.com.dius.pact.core.model.RequestResponsePact;
import au.com.dius.pact.core.model.annotations.Pact;
import au.com.dius.pact.core.model.matchingrules.NotEmptyMatcher;
import com.netcracker.qubership.apihub.javataskconsumer.model.BuildStatus;
import com.netcracker.qubership.apihub.javataskconsumer.model.BuildTask;
import com.netcracker.qubership.apihub.javataskconsumer.model.BuildType;
import com.netcracker.qubership.apihub.javataskconsumer.packaging.ResultPackager;
import com.netcracker.qubership.apihub.javataskconsumer.registry.RegistryClient;
import com.netcracker.qubership.apihub.javataskconsumer.support.TestSupport;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;

@ExtendWith(PactConsumerTestExt.class)
@PactTestFor(providerName = PROVIDER, pactVersion = PactSpecVersion.V3)
class RegistryClientPactTest {

    @Pact(consumer = CONSUMER)
    RequestResponsePact noTasksAvailable(PactDslWithProvider builder) {
        return builder
                .given(STATE_NO_TASKS)
                .uponReceiving("a poll when the java build queue is empty")
                .path(POLL_PATH)
                .method("POST")
                .headers("api-key", API_KEY)
                .willRespondWith()
                .status(204)
                .toPact();
    }

    @Pact(consumer = CONSUMER)
    RequestResponsePact taskAvailable(PactDslWithProvider builder) throws Exception {
        return builder
                .given(STATE_TASK_QUEUED)
                .uponReceiving("a poll that takes a java-api-report task")
                .path(POLL_PATH)
                .method("POST")
                .headers("api-key", API_KEY)
                .willRespondWith()
                .status(200)
                .withBinaryData(TestSupport.taskZip(TASK_CONFIG_JSON), "application/zip")
                .toPact();
    }

    @Pact(consumer = CONSUMER)
    RequestResponsePact runningStatus(PactDslWithProvider builder) {
        return withNonEmptyMultipartBody(builder
                .given(STATE_PUBLISH_EXISTS)
                .uponReceiving("a running heartbeat for a java publish")
                .path(STATUS_PATH)
                .method("POST")
                .headers("api-key", API_KEY)
                .matchHeader("Content-Type", MULTIPART_CONTENT_TYPE_REGEX, PactMultipart.contentType())
                .body(PactMultipart.running())
                .willRespondWith()
                .status(204)
                .toPact());
    }

    @Pact(consumer = CONSUMER)
    RequestResponsePact completeStatus(PactDslWithProvider builder) throws Exception {
        byte[] resultZip = ResultPackager.zipReport("{\"mode\":\"api-report\"}".getBytes(StandardCharsets.UTF_8));
        return withNonEmptyMultipartBody(builder
                .given(STATE_PUBLISH_EXISTS)
                .uponReceiving("a complete status with a result ZIP")
                .path(STATUS_PATH)
                .method("POST")
                .headers("api-key", API_KEY)
                .matchHeader("Content-Type", MULTIPART_CONTENT_TYPE_REGEX, PactMultipart.contentType())
                .body(PactMultipart.complete(resultZip))
                .willRespondWith()
                .status(204)
                .toPact());
    }

    @Pact(consumer = CONSUMER)
    RequestResponsePact errorStatus(PactDslWithProvider builder) {
        return withNonEmptyMultipartBody(builder
                .given(STATE_PUBLISH_EXISTS)
                .uponReceiving("an error status with a human-readable message")
                .path(STATUS_PATH)
                .method("POST")
                .headers("api-key", API_KEY)
                .matchHeader("Content-Type", MULTIPART_CONTENT_TYPE_REGEX, PactMultipart.contentType())
                .body(PactMultipart.error("engine failed"))
                .willRespondWith()
                .status(204)
                .toPact());
    }

    @Test
    @PactTestFor(pactMethod = "noTasksAvailable")
    void findTaskReturnsEmptyWhenQueueIsEmpty(MockServer mockServer, @TempDir Path workDir) {
        RegistryClient client = newClient(mockServer, workDir);
        assertThat(client.findTask()).isEmpty();
    }

    @Test
    @PactTestFor(pactMethod = "taskAvailable")
    void findTaskParsesConfigJsonFromTaskZip(MockServer mockServer, @TempDir Path workDir) {
        RegistryClient client = newClient(mockServer, workDir);
        Optional<BuildTask> task = client.findTask();
        assertThat(task).isPresent();
        assertThat(task.get().publishId()).isEqualTo(PUBLISH_ID);
        assertThat(task.get().packageId()).isEqualTo(PACKAGE_ID);
        assertThat(task.get().config().buildType()).isEqualTo(BuildType.JAVA_API_REPORT);
        assertThat(task.get().config().metadata().get("gav").asText()).isEqualTo("com.example:lib:1.0.0");
    }

    @Test
    @PactTestFor(pactMethod = "runningStatus")
    void postBuildStatusSendsRunningHeartbeat(MockServer mockServer, @TempDir Path workDir) {
        RegistryClient client = newClient(mockServer, workDir);
        assertThatCode(() -> client.postBuildStatus(PACKAGE_ID, PUBLISH_ID, BuildStatus.RUNNING, null, null))
                .doesNotThrowAnyException();
    }

    @Test
    @PactTestFor(pactMethod = "completeStatus")
    void postBuildStatusSendsCompleteResultZip(MockServer mockServer, @TempDir Path workDir) throws Exception {
        RegistryClient client = newClient(mockServer, workDir);
        byte[] resultZip = ResultPackager.zipReport("{\"mode\":\"api-report\"}".getBytes(StandardCharsets.UTF_8));
        client.postBuildStatus(PACKAGE_ID, PUBLISH_ID, BuildStatus.COMPLETE, resultZip, null);
    }

    @Test
    @PactTestFor(pactMethod = "errorStatus")
    void postBuildStatusSendsErrorMessage(MockServer mockServer, @TempDir Path workDir) {
        RegistryClient client = newClient(mockServer, workDir);
        assertThatCode(() ->
                        client.postBuildStatus(PACKAGE_ID, PUBLISH_ID, BuildStatus.ERROR, null, "engine failed"))
                .doesNotThrowAnyException();
    }

    private static RegistryClient newClient(MockServer mockServer, Path workDir) {
        return new RegistryClient(TestSupport.workerConfig(mockServer.getPort(), workDir, BUILDER_ID));
    }

    /**
     * JTC generates a fresh multipart boundary per request, so the mock cannot compare raw bytes.
     * Provider verification still replays the example body from the pact file.
     */
    private static RequestResponsePact withNonEmptyMultipartBody(RequestResponsePact pact) {
        pact.getInteractions().forEach(interaction ->
                interaction.asSynchronousRequestResponse()
                        .getRequest()
                        .getMatchingRules()
                        .addCategory("body")
                        .setRule("$", NotEmptyMatcher.INSTANCE));
        return pact;
    }
}
