package org.qubership.jdiff.pipeline;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.maven.model.Model;
import org.qubership.jdiff.model.Gav;
import org.qubership.jdiff.resolve.ArtifactResolutionException;
import org.qubership.jdiff.resolve.ArtifactResolver;
import org.qubership.jdiff.resolve.ResolvedDependency;

/**
 * Test double that serves a fixed jar {@link Path} for each registered {@link Gav}, and, if a
 * fixtures directory is given, also serves fixture POMs from it by the naming convention
 * {@code <artifactId>-<version>.pom} (so a real {@link org.qubership.jdiff.resolve.EffectivePomBuilder}
 * can resolve parent POMs and BOM imports offline).
 */
class FakeArtifactResolver implements ArtifactResolver {

    private final Map<Gav, Path> jars = new HashMap<>();
    private final Path fixturesDir;
    private List<ResolvedDependency> dependencyTree = List.of();

    FakeArtifactResolver() {
        this(null);
    }

    FakeArtifactResolver(Path fixturesDir) {
        this.fixturesDir = fixturesDir;
    }

    FakeArtifactResolver withJar(Gav gav, Path jar) {
        jars.put(gav, jar);
        return this;
    }

    FakeArtifactResolver withDependencyTree(List<ResolvedDependency> dependencyTree) {
        this.dependencyTree = dependencyTree;
        return this;
    }

    @Override
    public Path resolveJar(Gav gav) {
        Path jar = jars.get(gav);
        if (jar == null) {
            throw new ArtifactResolutionException("No fake jar registered for " + gav);
        }
        return jar;
    }

    @Override
    public Path resolvePom(Gav gav) {
        if (fixturesDir == null) {
            throw new UnsupportedOperationException("FakeArtifactResolver does not serve POMs: " + gav);
        }
        Path pomFile = fixturesDir.resolve(gav.artifactId() + "-" + gav.version() + ".pom");
        if (!Files.isRegularFile(pomFile)) {
            throw new ArtifactResolutionException("No fixture POM for " + gav + " at " + pomFile);
        }
        return pomFile;
    }

    @Override
    public List<ResolvedDependency> resolveDependencyTree(Gav moduleGav, Model effectiveModel) {
        return dependencyTree;
    }
}
