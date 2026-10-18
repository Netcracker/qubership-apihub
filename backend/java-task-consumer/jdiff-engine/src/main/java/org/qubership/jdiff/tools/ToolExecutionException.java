package org.qubership.jdiff.tools;

/**
 * Thrown when an external tool cannot be started, times out, or exits abnormally
 * in a way the caller did not opt to handle via {@link ToolResult#exitCode()}.
 */
public class ToolExecutionException extends RuntimeException {

    public ToolExecutionException(String message) {
        super(message);
    }

    public ToolExecutionException(String message, Throwable cause) {
        super(message, cause);
    }
}
