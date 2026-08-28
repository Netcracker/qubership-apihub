package com.netcracker.qubership.apihub.javataskconsumer;

import com.netcracker.qubership.apihub.javataskconsumer.config.WorkerConfig;
import com.netcracker.qubership.apihub.javataskconsumer.health.HealthServer;
import com.netcracker.qubership.apihub.javataskconsumer.registry.RegistryClient;
import com.netcracker.qubership.apihub.javataskconsumer.worker.BuildOrchestrator;
import com.netcracker.qubership.apihub.javataskconsumer.worker.TaskPoller;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.concurrent.CountDownLatch;

public final class WorkerMain {

    private static final Logger log = LoggerFactory.getLogger(WorkerMain.class);

    public static void main(String[] args) throws Exception {
        WorkerConfig config = WorkerConfig.fromEnvironment();
        log.info("Starting java-task-consumer builderId={} backend={}", config.builderId(), config.backendAddress());

        HealthServer healthServer = new HealthServer(config.healthPort());
        healthServer.start();

        RegistryClient registry = new RegistryClient(config);
        BuildOrchestrator orchestrator = new BuildOrchestrator(registry, config);
        TaskPoller poller = new TaskPoller(registry, orchestrator, config);

        CountDownLatch shutdown = new CountDownLatch(1);
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            log.info("Shutdown signal received");
            poller.stop();
            shutdown.countDown();
        }));

        poller.start();
        shutdown.await();
        healthServer.stop();
        log.info("java-task-consumer stopped");
    }

    private WorkerMain() {
    }
}
