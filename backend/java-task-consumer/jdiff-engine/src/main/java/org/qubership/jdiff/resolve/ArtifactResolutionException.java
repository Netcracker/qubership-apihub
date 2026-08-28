package org.qubership.jdiff.resolve;

/**
 * Thrown when an artifact, POM, or effective model cannot be resolved or built.
 */
public class ArtifactResolutionException extends RuntimeException {

    public ArtifactResolutionException(String message) {
        super(message);
    }

    public ArtifactResolutionException(String message, Throwable cause) {
        super(message, cause);
    }
}
