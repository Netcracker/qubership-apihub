package com.netcracker.qubership.apihub.javataskconsumer.debug;

import static org.assertj.core.api.Assertions.assertThat;

import com.netcracker.qubership.apihub.javataskconsumer.config.WorkerConfig;
import com.netcracker.qubership.apihub.javataskconsumer.model.BuildStatus;
import com.netcracker.qubership.apihub.javataskconsumer.model.BuildType;
import com.netcracker.qubership.apihub.javataskconsumer.packaging.ResultPackager;
import com.netcracker.qubership.apihub.javataskconsumer.registry.RegistryClient;
import com.netcracker.qubership.apihub.javataskconsumer.support.TestSupport;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class LocalJavaBuildQueueTest {

    private static final String BUILDER_ID = "debug-builder-1";
    private static final String PACKAGE_ID = "debug-pkg";
    private static final String PUBLISH_ID = "report";

    @TempDir
    Path workDir;

    @Test
    void pollAndCompleteGoThroughTheRealRegistryClient() throws Exception {
        String configJson = """
                {
                  "publishId": "%s",
                  "packageId": "%s",
                  "buildType": "java-api-report",
                  "metadata": {"gav": "org.qubership:qip-catalog-library:2025.1.1.15"}
                }
                """.formatted(PUBLISH_ID, PACKAGE_ID);
        byte[] reportZip = ResultPackager.zipReport("{\"mode\":\"api-report\"}".getBytes(StandardCharsets.UTF_8));
        try (LocalJavaBuildQueue queue = new LocalJavaBuildQueue("test-api-key")) {
            int port = queue.start(0);
            WorkerConfig config = TestSupport.workerConfig(port, workDir, BUILDER_ID);
            RegistryClient registry = new RegistryClient(config);

            assertThat(registry.findTask()).isEmpty();

            var pending = queue.watch(PUBLISH_ID);
            queue.enqueue(BUILDER_ID, TestSupport.taskZip(configJson), PACKAGE_ID, PUBLISH_ID);

            var task = registry.findTask();
            assertThat(task).isPresent();
            assertThat(task.get().publishId()).isEqualTo(PUBLISH_ID);
            assertThat(task.get().config().buildType()).isEqualTo(BuildType.JAVA_API_REPORT);

            registry.postBuildStatus(PACKAGE_ID, PUBLISH_ID, BuildStatus.COMPLETE, reportZip, null);

            LocalJavaBuildQueue.PublishResult result = pending.get(5, TimeUnit.SECONDS);
            assertThat(result.complete()).isTrue();
            assertThat(result.resultZip()).isEqualTo(reportZip);
        }
    }

    @Test
    void buildErrorCompletesTheWatcher() throws Exception {
        String configJson = """
                {
                  "publishId": "diff",
                  "packageId": "%s",
                  "buildType": "java-api-diff",
                  "metadata": {}
                }
                """.formatted(PACKAGE_ID);
        try (LocalJavaBuildQueue queue = new LocalJavaBuildQueue("test-api-key")) {
            int port = queue.start(0);
            WorkerConfig config = TestSupport.workerConfig(port, workDir, BUILDER_ID);
            RegistryClient registry = new RegistryClient(config);
            var pending = queue.watch("diff");
            queue.enqueue(BUILDER_ID, TestSupport.taskZip(configJson), PACKAGE_ID, "diff");
            assertThat(registry.findTask()).isPresent();

            registry.postBuildStatus(PACKAGE_ID, "diff", BuildStatus.ERROR, null, "engine failed");

            LocalJavaBuildQueue.PublishResult result = pending.get(5, TimeUnit.SECONDS);
            assertThat(result.complete()).isFalse();
            assertThat(result.status()).isEqualTo(BuildStatus.ERROR.wireValue());
            assertThat(result.errors()).contains("engine failed");
        }
    }

    @Test
    void scenarioRunnerEnqueuesTheNextTaskOnlyAfterThePreviousStatus(@TempDir Path inbox)
            throws Exception {
        try (LocalJavaBuildQueue queue = new LocalJavaBuildQueue("test-api-key");
                var scenario = DebugScenarioRunner.class.getResourceAsStream("/debug/netcracker-scenarios.json")) {
            int port = queue.start(0);
            WorkerConfig config = TestSupport.workerConfig(port, workDir, BUILDER_ID);
            RegistryClient registry = new RegistryClient(config);
            byte[] zip = ResultPackager.zipReport("{}".getBytes(StandardCharsets.UTF_8));

            Thread responder = new Thread(() -> {
                try {
                    int done = 0;
                    long deadline = System.currentTimeMillis() + 10_000;
                    while (done < 4 && System.currentTimeMillis() < deadline) {
                        var task = registry.findTask();
                        if (task.isPresent()) {
                            registry.postBuildStatus(
                                    task.get().packageId(),
                                    task.get().publishId(),
                                    BuildStatus.COMPLETE,
                                    zip,
                                    null);
                            done++;
                        } else {
                            Thread.sleep(20);
                        }
                    }
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            }, "queue-responder");
            responder.start();

            List<LocalJavaBuildQueue.PublishResult> results =
                    DebugScenarioRunner.run(queue, BUILDER_ID, inbox, scenario);
            responder.join(5_000);

            assertThat(results).hasSize(4);
            assertThat(results).allMatch(LocalJavaBuildQueue.PublishResult::complete);
            assertThat(Files.isRegularFile(inbox.resolve("report").resolve("report.json"))).isTrue();
            assertThat(Files.isRegularFile(inbox.resolve("upgrade-impact").resolve("report.json"))).isTrue();
            assertThat(Files.isRegularFile(inbox.resolve("upgrade-impact-docker").resolve("report.json"))).isTrue();
        }
    }
}
