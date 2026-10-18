package com.netcracker.qubership.apihub.javataskconsumer.registry;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.containing;
import static com.github.tomakehurst.wiremock.client.WireMock.equalTo;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.postRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.stubFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.client.WireMock.verify;
import static org.assertj.core.api.Assertions.assertThat;

import com.github.tomakehurst.wiremock.junit5.WireMockRuntimeInfo;
import com.github.tomakehurst.wiremock.junit5.WireMockTest;
import com.netcracker.qubership.apihub.javataskconsumer.config.WorkerConfig;
import com.netcracker.qubership.apihub.javataskconsumer.model.BuildStatus;
import com.netcracker.qubership.apihub.javataskconsumer.model.BuildTask;
import com.netcracker.qubership.apihub.javataskconsumer.model.BuildType;
import com.netcracker.qubership.apihub.javataskconsumer.support.TestSupport;
import java.nio.file.Path;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

@WireMockTest
class RegistryClientWireMockTest {

    private static final String BUILDER_ID = "builder-test-1";

    @TempDir
    Path workDir;

    private RegistryClient client;

    @BeforeEach
    void setUp(WireMockRuntimeInfo wm) {
        WorkerConfig config = TestSupport.workerConfig(wm.getHttpPort(), workDir, BUILDER_ID);
        client = new RegistryClient(config);
    }

    @Test
    void findTaskReturnsEmptyOn204() {
        stubFor(post(urlEqualTo("/api/v2/java-builders/" + BUILDER_ID + "/tasks"))
                .withHeader("api-key", equalTo("test-api-key"))
                .willReturn(aResponse().withStatus(204)));

        assertThat(client.findTask()).isEmpty();
    }

    @Test
    void findTaskParsesConfigFromZip() throws Exception {
        String configJson = """
                {
                  "publishId": "pub-42",
                  "packageId": "demo-pkg",
                  "buildType": "java-api-report",
                  "metadata": {"gav": "com.example:lib:1.0.0"}
                }
                """;
        stubFor(post(urlEqualTo("/api/v2/java-builders/" + BUILDER_ID + "/tasks"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/zip")
                        .withBody(TestSupport.taskZip(configJson))));

        Optional<BuildTask> task = client.findTask();
        assertThat(task).isPresent();
        assertThat(task.get().publishId()).isEqualTo("pub-42");
        assertThat(task.get().packageId()).isEqualTo("demo-pkg");
        assertThat(task.get().config().buildType()).isEqualTo(BuildType.JAVA_API_REPORT);
        assertThat(task.get().config().metadata().get("gav").asText()).isEqualTo("com.example:lib:1.0.0");
    }

    @Test
    void postBuildStatusSendsMultipartComplete() throws Exception {
        String packageId = "demo-pkg";
        String publishId = "pub-99";
        stubFor(post(urlPathEqualTo("/api/v3/packages/" + packageId + "/java-publish/" + publishId + "/status"))
                .willReturn(aResponse().withStatus(204)));

        byte[] zip = new byte[] {1, 2, 3};
        client.postBuildStatus(packageId, publishId, BuildStatus.COMPLETE, zip, null);

        verify(postRequestedFor(urlPathEqualTo(
                "/api/v3/packages/" + packageId + "/java-publish/" + publishId + "/status"))
                .withHeader("api-key", equalTo("test-api-key"))
                .withRequestBody(containing("name=\"status\""))
                .withRequestBody(containing("complete"))
                .withRequestBody(containing("name=\"builderId\""))
                .withRequestBody(containing(BUILDER_ID))
                .withRequestBody(containing("name=\"data\"")));
    }

    @Test
    void postBuildStatusSendsErrorMessage() throws Exception {
        String packageId = "demo-pkg";
        String publishId = "pub-err";
        stubFor(post(urlPathEqualTo("/api/v3/packages/" + packageId + "/java-publish/" + publishId + "/status"))
                .willReturn(aResponse().withStatus(204)));

        client.postBuildStatus(packageId, publishId, BuildStatus.ERROR, null, "boom");

        verify(postRequestedFor(urlPathEqualTo(
                "/api/v3/packages/" + packageId + "/java-publish/" + publishId + "/status"))
                .withRequestBody(containing("name=\"errors\""))
                .withRequestBody(containing("boom")));
    }
}
