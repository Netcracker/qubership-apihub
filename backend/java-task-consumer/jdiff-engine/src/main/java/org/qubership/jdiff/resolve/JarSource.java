package org.qubership.jdiff.resolve;

import java.nio.file.Path;

/**
 * Describes how to obtain the subject JAR for upgrade-impact analysis.
 */
public sealed interface JarSource permits GavJarSource, DockerImageJarSource {

    /**
     * @param resolver Maven resolver used for GAV-based sources
     * @return local path to the subject JAR
     */
    Path resolve(ArtifactResolver resolver) throws JarResolutionException;
}
