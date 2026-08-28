package com.netcracker.qubership.apihub.javataskconsumer.worker;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.containing;
import static com.github.tomakehurst.wiremock.client.WireMock.equalTo;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.postRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.stubFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.client.WireMock.verify;
import static org.assertj.core.api.Assertions.assertThat;

import com.github.tomakehurst.wiremock.junit5.WireMockRuntimeInfo;
import com.github.tomakehurst.wiremock.junit5.WireMockTest;
import com.netcracker.qubership.apihub.javataskconsumer.config.WorkerConfig;
import com.netcracker.qubership.apihub.javataskconsumer.model.BuildTask;
import com.netcracker.qubership.apihub.javataskconsumer.registry.RegistryClient;
import com.netcracker.qubership.apihub.javataskconsumer.support.TestSupport;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

@WireMockTest
class BuildFlowWireMockTest {

    private static final String BUILDER_ID = "builder-flow-1";
    private static final String PACKAGE_ID = "flow-pkg";
    private static final String PUBLISH_ID = "flow-pub";

    @TempDir
    Path workDir;

    private RegistryClient registry;
    private WorkerConfig config;

    @BeforeEach
    void setUp(WireMockRuntimeInfo wm) {
        config = TestSupport.workerConfig(wm.getHttpPort(), workDir, BUILDER_ID);
        registry = new RegistryClient(config);
    }

    @Test
    void pollBuildAndPostCompleteResult() throws Exception {
        String configJson = """
                {
                  "publishId": "%s",
                  "packageId": "%s",
                  "buildType": "java-api-report",
                  "metadata": {"gav": "com.example:lib:1.0.0"}
                }
                """.formatted(PUBLISH_ID, PACKAGE_ID);

        stubFor(post(urlPathEqualTo("/api/v2/java-builders/" + BUILDER_ID + "/tasks"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/zip")
                        .withBody(TestSupport.taskZip(configJson))));

        stubFor(post(urlPathEqualTo("/api/v3/packages/" + PACKAGE_ID + "/java-publish/" + PUBLISH_ID + "/status"))
                .willReturn(aResponse().withStatus(204)));

        Optional<BuildTask> task = registry.findTask();
        assertThat(task).isPresent();

        BuildOrchestrator orchestrator = new BuildOrchestrator(registry, config, t ->
                "{\"mode\":\"api-report\"}".getBytes(StandardCharsets.UTF_8));
        orchestrator.run(task.get());

        verify(postRequestedFor(urlPathEqualTo(
                "/api/v3/packages/" + PACKAGE_ID + "/java-publish/" + PUBLISH_ID + "/status"))
                .withRequestBody(containing("name=\"status\""))
                .withRequestBody(containing("complete"))
                .withRequestBody(containing("report.json")));
    }

    @Test
    void buildFailurePostsErrorStatus() throws Exception {
        String configJson = """
                {
                  "publishId": "%s",
                  "packageId": "%s",
                  "buildType": "java-api-diff",
                  "metadata": {}
                }
                """.formatted(PUBLISH_ID, PACKAGE_ID);

        stubFor(post(urlPathEqualTo("/api/v2/java-builders/" + BUILDER_ID + "/tasks"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withBody(TestSupport.taskZip(configJson))));

        stubFor(post(urlPathEqualTo("/api/v3/packages/" + PACKAGE_ID + "/java-publish/" + PUBLISH_ID + "/status"))
                .willReturn(aResponse().withStatus(204)));

        BuildTask task = registry.findTask().orElseThrow();
        BuildOrchestrator orchestrator = new BuildOrchestrator(registry, config, t -> {
            throw new IllegalStateException("engine failed");
        });
        orchestrator.run(task);

        verify(postRequestedFor(urlPathEqualTo(
                "/api/v3/packages/" + PACKAGE_ID + "/java-publish/" + PUBLISH_ID + "/status"))
                .withRequestBody(containing("name=\"status\""))
                .withRequestBody(containing("error"))
                .withRequestBody(containing("engine failed")));
    }
}
