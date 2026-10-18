package com.netcracker.qubership.apihub.javataskconsumer.debug;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.netcracker.qubership.apihub.javataskconsumer.support.TestSupport;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Enqueues each debug task only after the previous publish has a terminal status.
 */
final class DebugScenarioRunner {

    private static final Logger log = LoggerFactory.getLogger(DebugScenarioRunner.class);
    private static final Duration TASK_TIMEOUT = Duration.ofMinutes(45);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private DebugScenarioRunner() {
    }

    static List<LocalJavaBuildQueue.PublishResult> run(
            LocalJavaBuildQueue queue,
            String builderId,
            Path inbox,
            InputStream scenarioJson
    ) throws Exception {
        DebugScenarioFile scenario = MAPPER.readValue(scenarioJson, DebugScenarioFile.class);
        if (scenario.tasks() == null || scenario.tasks().isEmpty()) {
            throw new IllegalArgumentException("debug scenario must list at least one task");
        }
        Files.createDirectories(inbox);
        List<LocalJavaBuildQueue.PublishResult> results = new ArrayList<>();
        for (DebugTaskSpec task : scenario.tasks()) {
            ObjectNode config = MAPPER.createObjectNode();
            config.put("publishId", task.id());
            config.put("packageId", scenario.packageId());
            config.put("buildType", task.buildType());
            config.set("metadata", task.metadata());
            byte[] zip = TestSupport.taskZip(MAPPER.writeValueAsString(config));
            var pending = queue.watch(task.id());
            queue.enqueue(builderId, zip, scenario.packageId(), task.id());
            log.info("Waiting for {} ({})", task.id(), task.buildType());
            LocalJavaBuildQueue.PublishResult result =
                    pending.get(TASK_TIMEOUT.toMillis(), TimeUnit.MILLISECONDS);
            results.add(result);
            writeInbox(inbox, task.id(), result);
            if (result.complete()) {
                log.info("Finished {} -> complete", task.id());
            } else {
                log.error("Finished {} -> {} ({})", task.id(), result.status(), result.errors());
            }
        }
        return results;
    }

    static DebugScenarioFile loadClasspath(String resource) throws IOException {
        try (InputStream in = DebugScenarioRunner.class.getResourceAsStream(resource)) {
            if (in == null) {
                throw new IOException("classpath resource not found: " + resource);
            }
            return MAPPER.readValue(in, DebugScenarioFile.class);
        }
    }

    private static void writeInbox(Path inbox, String publishId, LocalJavaBuildQueue.PublishResult result)
            throws IOException {
        Path dir = inbox.resolve(publishId);
        Files.createDirectories(dir);
        if (result.errors() != null) {
            Files.writeString(dir.resolve("errors.txt"), result.errors(), StandardCharsets.UTF_8);
        }
        if (result.resultZip() == null || result.resultZip().length == 0) {
            return;
        }
        Files.write(dir.resolve("package.zip"), result.resultZip());
        try (ZipInputStream zis = new ZipInputStream(Files.newInputStream(dir.resolve("package.zip")))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if ("report.json".equals(entry.getName())) {
                    Files.write(dir.resolve("report.json"), zis.readAllBytes());
                    break;
                }
            }
        }
    }
}
