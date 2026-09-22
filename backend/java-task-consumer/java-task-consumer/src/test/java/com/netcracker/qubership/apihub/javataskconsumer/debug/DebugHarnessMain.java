package com.netcracker.qubership.apihub.javataskconsumer.debug;

import com.netcracker.qubership.apihub.javataskconsumer.config.WorkerConfig;
import com.netcracker.qubership.apihub.javataskconsumer.health.HealthServer;
import com.netcracker.qubership.apihub.javataskconsumer.registry.RegistryClient;
import com.netcracker.qubership.apihub.javataskconsumer.worker.BuildOrchestrator;
import com.netcracker.qubership.apihub.javataskconsumer.worker.TaskPoller;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Cursor debug entry point: in-process poll queue plus the real worker, then the Netcracker
 * GAV and docker scenarios one after another.
 *
 * <p>Not packaged into the production shade JAR ({@code src/test}). Docker/compose still runs
 * {@link com.netcracker.qubership.apihub.javataskconsumer.WorkerMain} only.
 */
public final class DebugHarnessMain {

    private static final Logger log = LoggerFactory.getLogger(DebugHarnessMain.class);
    private static final String SCENARIO_RESOURCE = "/debug/netcracker-scenarios.json";
    private static final String BUILDER_ID = "debug-builder-1";
    private static final String API_KEY = "debug-api-key";

    public static void main(String[] args) throws Exception {
        Path repoRoot = RepoLayout.locate();
        Path japicmp = JapicmpLocator.resolve(repoRoot);
        Path workDir = repoRoot.resolve("java-task-consumer").resolve("target").resolve("jtc-debug");
        Path inbox = workDir.resolve("inbox");
        Files.createDirectories(workDir);
        SubjectPomSeeder.ensure(SubjectPomSeeder.defaultLocalMavenRepo());

        Path settingsXml = null;
        List<String> mavenRepos = List.of();
        String githubToken = GithubPackageSettings.githubToken();
        if (githubToken != null) {
            settingsXml = GithubPackageSettings.write(workDir, githubToken);
            mavenRepos = GithubPackageSettings.REPOS;
            log.info("Using GitHub Packages for com.netcracker.cloud artifacts");
        } else {
            log.warn("GHCR_TOKEN/GITHUB_TOKEN is unset; GHCR pull may still work for public images, "
                    + "but cloud-library upgrades need GitHub Packages auth");
        }

        int queuePort = intEnv("DEBUG_QUEUE_PORT", 18080);
        int healthPort = intEnv("HEALTH_PORT", 13000);
        long pollMs = longEnv("JOB_REQUEST_INTERVAL", 500);
        long heartbeatMs = longEnv("JOB_STATUS_INTERVAL", 5_000);

        try (LocalJavaBuildQueue queue = new LocalJavaBuildQueue(API_KEY)) {
            int bound = queue.start(queuePort);
            WorkerConfig config = new WorkerConfig(
                    "127.0.0.1:" + bound,
                    API_KEY,
                    BUILDER_ID,
                    pollMs,
                    heartbeatMs,
                    healthPort,
                    workDir,
                    japicmp,
                    intEnv("JDIFF_THREADS", 4),
                    settingsXml,
                    mavenRepos);

            HealthServer health = new HealthServer(config.healthPort());
            health.start();
            RegistryClient registry = new RegistryClient(config);
            BuildOrchestrator orchestrator = new BuildOrchestrator(registry, config);
            TaskPoller poller = new TaskPoller(registry, orchestrator, config);

            CountDownLatch shutdown = new CountDownLatch(1);
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                poller.stop();
                health.stop();
                shutdown.countDown();
            }));

            poller.start();
            log.info("Worker polling debug queue on 127.0.0.1:{} (health {})", bound, healthPort);

            List<LocalJavaBuildQueue.PublishResult> results;
            try (InputStream scenario = DebugHarnessMain.class.getResourceAsStream(SCENARIO_RESOURCE)) {
                if (scenario == null) {
                    throw new IllegalStateException("Missing " + SCENARIO_RESOURCE);
                }
                results = DebugScenarioRunner.run(queue, BUILDER_ID, inbox, scenario);
            }

            long failed = results.stream().filter(r -> !r.complete()).count();
            log.info("Scenario finished. failed={} inbox={}", failed, inbox.toAbsolutePath());
            if (failed > 0) {
                log.error("{} task(s) ended with error. Inspect {} then stop the debug session.",
                        failed, inbox);
            } else {
                log.info("All modes completed. Reports are under {}. Stop the debug session when done.",
                        inbox);
            }
            shutdown.await();
        }
    }

    private static int intEnv(String name, int fallback) {
        String value = System.getenv(name);
        return value == null || value.isBlank() ? fallback : Integer.parseInt(value.trim());
    }

    private static long longEnv(String name, long fallback) {
        String value = System.getenv(name);
        return value == null || value.isBlank() ? fallback : Long.parseLong(value.trim());
    }

    private DebugHarnessMain() {
    }
}
