package org.qubership.jdiff.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.qubership.jdiff.config.JdiffEngineConfig;
import org.qubership.jdiff.japicmp.JapicmpRunner;
import org.qubership.jdiff.jdeps.JdepsRunner;
import org.qubership.jdiff.pipeline.ApiDiffPipeline;
import org.qubership.jdiff.pipeline.ApiReportPipeline;
import org.qubership.jdiff.pipeline.JapicmpJarComparator;
import org.qubership.jdiff.pipeline.JarComparator;
import org.qubership.jdiff.pipeline.UpgradeImpactPipeline;
import org.qubership.jdiff.resolve.ArtifactResolver;
import org.qubership.jdiff.resolve.ContainerImageJarExtractor;
import org.qubership.jdiff.resolve.EffectivePomBuilder;
import org.qubership.jdiff.resolve.JarSourceResolver;
import org.qubership.jdiff.resolve.MavenArtifactResolver;
import org.qubership.jdiff.resolve.ProjectScanner;
import org.qubership.jdiff.resolve.RepositoryConfig;
import org.qubership.jdiff.tools.ExternalToolRunner;

/**
 * Wires jdiff-engine pipelines from {@link JdiffEngineConfig}.
 */
public final class JdiffEngineFactory {

    private final JdiffEngineConfig config;
    private final ArtifactResolver resolver;
    private final JarSourceResolver jarSourceResolver;
    private final JarComparator comparator;
    private final Path japicmpWorkDir;

    public JdiffEngineFactory(JdiffEngineConfig config) {
        this.config = config;
        if (!Files.isRegularFile(config.japicmpJar())) {
            throw new IllegalArgumentException("japicmp jar not found: " + config.japicmpJar());
        }
        RepositoryConfig repositoryConfig = RepositoryConfig.of(config.repositoryTokens(), config.settingsXml());
        this.resolver = new MavenArtifactResolver(repositoryConfig);
        Path containerExtractDir = createWorkDir(config.workDir().resolve("container-extract"));
        this.jarSourceResolver = new JarSourceResolver(
                resolver, new ContainerImageJarExtractor(containerExtractDir));
        JapicmpRunner japicmpRunner = new JapicmpRunner(new ExternalToolRunner(), config.japicmpJar());
        this.japicmpWorkDir = createWorkDir(config.workDir());
        this.comparator = new JapicmpJarComparator(japicmpRunner, japicmpWorkDir);
    }

    public JarSourceResolver jarSourceResolver() {
        return jarSourceResolver;
    }

    public ApiReportPipeline apiReportPipeline() {
        return new ApiReportPipeline(resolver, comparator);
    }

    public ApiDiffPipeline apiDiffPipeline() {
        return new ApiDiffPipeline(resolver, comparator);
    }

    public UpgradeImpactPipeline upgradeImpactPipeline() {
        EffectivePomBuilder pomBuilder = new EffectivePomBuilder(resolver);
        ProjectScanner scanner = new ProjectScanner(pomBuilder);
        JdepsRunner jdeps = new JdepsRunner(new ExternalToolRunner());
        return new UpgradeImpactPipeline(resolver, pomBuilder, scanner, jdeps, comparator, config.threads());
    }

    private static Path createWorkDir(Path parent) {
        try {
            Files.createDirectories(parent);
            return Files.createTempDirectory(parent, "japicmp-");
        } catch (IOException e) {
            throw new IllegalStateException("Failed to create japicmp work directory under " + parent, e);
        }
    }
}
