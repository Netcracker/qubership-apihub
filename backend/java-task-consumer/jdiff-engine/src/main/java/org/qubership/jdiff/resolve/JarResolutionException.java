package org.qubership.jdiff.resolve;

public class JarResolutionException extends Exception {

    public JarResolutionException(String message) {
        super(message);
    }

    public JarResolutionException(String message, Throwable cause) {
        super(message, cause);
    }
}
