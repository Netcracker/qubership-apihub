package org.qubership.jdiff.resolve;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.apache.maven.model.Model;
import org.qubership.jdiff.model.Gav;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Scans a local multi-module Maven project and reports every module (including {@code packaging=pom}
 * aggregators) with its resolved GAV.
 */
public class ProjectScanner {

    private static final Logger LOG = LoggerFactory.getLogger(ProjectScanner.class);

    private final EffectivePomBuilder pomBuilder;

    public ProjectScanner(EffectivePomBuilder pomBuilder) {
        this.pomBuilder = pomBuilder;
    }

    /**
     * @param projectRoot directory containing the aggregator {@code pom.xml}
     * @return all modules found while recursively walking {@code <modules>}, including aggregators
     */
    public List<MavenModule> scan(Path projectRoot) {
        List<MavenModule> modules = new ArrayList<>();
        scanModule(projectRoot, modules);
        return modules;
    }

    private void scanModule(Path moduleDir, List<MavenModule> modules) {
        Path pomFile = moduleDir.resolve("pom.xml");
        if (!Files.isRegularFile(pomFile)) {
            LOG.warn("Module directory {} has no pom.xml, skipping", moduleDir);
            return;
        }

        Model effective = pomBuilder.build(pomFile);
        Gav gav = new Gav(effective.getGroupId(), effective.getArtifactId(), effective.getVersion(), null);
        String packaging = effective.getPackaging() == null ? "jar" : effective.getPackaging();
        Path targetJar = moduleDir.resolve("target").resolve(effective.getArtifactId() + "-" + effective.getVersion() + ".jar");
        if (!Files.isRegularFile(targetJar)) {
            targetJar = null;
        }

        LOG.debug("Discovered module {} ({}) at {}", gav, packaging, pomFile);
        modules.add(new MavenModule(gav, pomFile, packaging, targetJar));

        for (String modulePath : effective.getModules()) {
            Path childDir = moduleDir.resolve(modulePath).normalize();
            if (!Files.isDirectory(childDir)) {
                LOG.warn("Module '{}' referenced from {} does not exist, skipping", modulePath, pomFile);
                continue;
            }
            scanModule(childDir, modules);
        }
    }
}
