package org.qubership.jdiff.tools;

import java.time.Duration;

/**
 * Outcome of an external tool invocation.
 */
public record ToolResult(int exitCode, String stdout, String stderr, Duration duration) {

    public boolean success() {
        return exitCode == 0;
    }
}
