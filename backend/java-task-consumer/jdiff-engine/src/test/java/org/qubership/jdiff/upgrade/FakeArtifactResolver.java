package org.qubership.jdiff.upgrade;

import java.nio.file.Files;
import java.nio.file.Path;
import org.qubership.jdiff.model.Gav;
import org.qubership.jdiff.resolve.ArtifactResolutionException;
import org.qubership.jdiff.resolve.ArtifactResolver;

/**
 * Test double serving fixture POMs from a directory by GAV, using the naming convention
 * {@code <artifactId>-<version>.pom}. Does not serve jars.
 */
class FakeArtifactResolver implements ArtifactResolver {

    private final Path fixturesDir;

    FakeArtifactResolver(Path fixturesDir) {
        this.fixturesDir = fixturesDir;
    }

    @Override
    public Path resolveJar(Gav gav) {
        throw new UnsupportedOperationException("FakeArtifactResolver does not serve jars: " + gav);
    }

    @Override
    public Path resolvePom(Gav gav) {
        Path pomFile = fixturesDir.resolve(gav.artifactId() + "-" + gav.version() + ".pom");
        if (!Files.isRegularFile(pomFile)) {
            throw new ArtifactResolutionException("No fixture POM for " + gav + " at " + pomFile);
        }
        return pomFile;
    }
}
