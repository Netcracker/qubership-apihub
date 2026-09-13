package org.qubership.jdiff.resolve;

import java.nio.file.Path;

/**
 * Resolves {@link JarSource} instances to local JAR paths.
 */
public final class JarSourceResolver {

    private final ArtifactResolver artifactResolver;
    private final ContainerImageJarExtractor imageExtractor;

    public JarSourceResolver(ArtifactResolver artifactResolver, ContainerImageJarExtractor imageExtractor) {
        this.artifactResolver = artifactResolver;
        this.imageExtractor = imageExtractor;
    }

    public Path resolve(JarSource source) throws JarResolutionException {
        return switch (source) {
            case GavJarSource gav -> gav.resolve(artifactResolver);
            case DockerImageJarSource docker -> docker.resolve(imageExtractor);
        };
    }
}
