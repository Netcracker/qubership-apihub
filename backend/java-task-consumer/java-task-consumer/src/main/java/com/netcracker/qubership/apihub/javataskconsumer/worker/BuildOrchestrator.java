package com.netcracker.qubership.apihub.javataskconsumer.worker;

import com.netcracker.qubership.apihub.javataskconsumer.config.WorkerConfig;
import com.netcracker.qubership.apihub.javataskconsumer.model.BuildStatus;
import com.netcracker.qubership.apihub.javataskconsumer.model.BuildTask;
import com.netcracker.qubership.apihub.javataskconsumer.packaging.ResultPackager;
import com.netcracker.qubership.apihub.javataskconsumer.registry.RegistryClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public final class BuildOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(BuildOrchestrator.class);

    private final RegistryClient registry;
    private final WorkerConfig config;
    private final BuildRunner buildRunner;

    public BuildOrchestrator(RegistryClient registry, WorkerConfig config) {
        this(registry, config, new BuildExecutor(config));
    }

    BuildOrchestrator(RegistryClient registry, WorkerConfig config, BuildRunner buildRunner) {
        this.registry = registry;
        this.config = config;
        this.buildRunner = buildRunner;
    }

    public void run(BuildTask task) {
        log.info("Starting build publishId={} type={}", task.publishId(), task.config().buildType());
        ScheduledExecutorService heartbeat = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "build-heartbeat");
            t.setDaemon(true);
            return t;
        });
        heartbeat.scheduleAtFixedRate(() -> sendStatus(task, BuildStatus.RUNNING, null, null),
                0, config.statusIntervalMs(), TimeUnit.MILLISECONDS);
        try {
            byte[] reportJson = buildRunner.execute(task);
            byte[] resultZip = ResultPackager.zipReport(reportJson);
            sendStatus(task, BuildStatus.COMPLETE, resultZip, null);
        } catch (Exception e) {
            log.error("Build error publishId={}", task.publishId(), e);
            sendStatus(task, BuildStatus.ERROR, null, e.getMessage());
        } finally {
            heartbeat.shutdownNow();
        }
    }

    private void sendStatus(BuildTask task, BuildStatus status, byte[] zip, String error) {
        try {
            registry.postBuildStatus(task.packageId(), task.publishId(), status, zip, error);
        } catch (Exception e) {
            log.error("Failed to post status {} for publishId={}", status, task.publishId(), e);
        }
    }
}
