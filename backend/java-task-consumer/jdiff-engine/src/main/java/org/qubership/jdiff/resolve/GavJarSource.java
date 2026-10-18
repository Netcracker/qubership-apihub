package org.qubership.jdiff.resolve;

import org.qubership.jdiff.model.Gav;

/**
 * Resolves a JAR from Maven coordinates.
 */
public final class GavJarSource implements JarSource {

    private final Gav gav;

    public GavJarSource(String groupId, String artifactId, String version) {
        this(new Gav(groupId, artifactId, version, null));
    }

    public GavJarSource(Gav gav) {
        this.gav = gav;
    }

    public Gav gav() {
        return gav;
    }

    @Override
    public java.nio.file.Path resolve(ArtifactResolver resolver) throws JarResolutionException {
        try {
            return resolver.resolveJar(gav);
        } catch (ArtifactResolutionException e) {
            throw new JarResolutionException("Failed to resolve " + gav, e);
        }
    }
}
