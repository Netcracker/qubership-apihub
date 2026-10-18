package com.netcracker.qubership.apihub.javataskconsumer.worker;

import com.netcracker.qubership.apihub.javataskconsumer.config.WorkerConfig;
import com.netcracker.qubership.apihub.javataskconsumer.model.BuildTask;
import java.nio.file.Path;
import java.util.List;
import org.qubership.jdiff.config.JdiffEngineConfig;
import org.qubership.jdiff.service.JdiffBuildService;

/**
 * Dispatches build types to jdiff-engine pipelines.
 */
final class BuildExecutor implements BuildRunner {

    private final JdiffBuildService buildService;

    BuildExecutor(WorkerConfig config) {
        Path settingsXml = config.mavenSettingsXml();
        List<String> repos = config.mavenRepositories();
        JdiffEngineConfig engineConfig = new JdiffEngineConfig(
                config.workDir(),
                config.japicmpJar(),
                settingsXml,
                repos,
                config.workerThreads());
        this.buildService = new JdiffBuildService(engineConfig);
    }

    @Override
    public byte[] execute(BuildTask task) throws Exception {
        var metadata = task.config().metadata();
        if (metadata == null || metadata.isNull()) {
            throw new IllegalArgumentException("config.metadata is required");
        }
        return switch (task.config().buildType()) {
            case JAVA_API_REPORT -> buildService.runApiReport(metadata);
            case JAVA_API_DIFF -> buildService.runApiDiff(metadata);
            case JAVA_UPGRADE_IMPACT -> buildService.runUpgradeImpact(metadata);
        };
    }
}
