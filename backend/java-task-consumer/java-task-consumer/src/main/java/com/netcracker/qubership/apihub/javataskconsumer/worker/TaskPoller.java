package com.netcracker.qubership.apihub.javataskconsumer.worker;

import com.netcracker.qubership.apihub.javataskconsumer.config.WorkerConfig;
import com.netcracker.qubership.apihub.javataskconsumer.model.BuildTask;
import com.netcracker.qubership.apihub.javataskconsumer.registry.RegistryClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Optional;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

public final class TaskPoller {

    private static final Logger log = LoggerFactory.getLogger(TaskPoller.class);

    private final RegistryClient registry;
    private final BuildOrchestrator orchestrator;
    private final WorkerConfig config;
    private final AtomicBoolean running = new AtomicBoolean(true);
    private final AtomicBoolean building = new AtomicBoolean(false);
    private ScheduledExecutorService scheduler;

    public TaskPoller(RegistryClient registry, BuildOrchestrator orchestrator, WorkerConfig config) {
        this.registry = registry;
        this.orchestrator = orchestrator;
        this.config = config;
    }

    public void start() {
        scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "task-poller");
            t.setDaemon(false);
            return t;
        });
        scheduler.scheduleWithFixedDelay(this::pollOnce, 0, config.requestIntervalMs(), TimeUnit.MILLISECONDS);
    }

    public void stop() {
        running.set(false);
        if (scheduler != null) {
            scheduler.shutdownNow();
        }
    }

    private void pollOnce() {
        if (!running.get() || building.get()) {
            return;
        }
        Optional<BuildTask> task = registry.findTask();
        if (task.isEmpty()) {
            return;
        }
        building.set(true);
        try {
            orchestrator.run(task.get());
        } catch (Exception e) {
            log.error("Build failed unexpectedly", e);
        } finally {
            building.set(false);
        }
    }
}
