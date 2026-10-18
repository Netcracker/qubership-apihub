package org.qubership.jdiff.tools;

import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Locates executables shipped with the JDK that runs this tool.
 */
public final class JdkTools {

    private JdkTools() {
    }

    /**
     * Returns the path to a JDK binary such as {@code java} or {@code jdeps},
     * resolving against {@code java.home} and appending {@code .exe} on Windows.
     */
    public static Path binary(String name) {
        String exe = System.getProperty("os.name", "").toLowerCase().contains("win") ? name + ".exe" : name;
        Path path = Path.of(System.getProperty("java.home"), "bin", exe);
        if (!Files.isRegularFile(path)) {
            throw new ToolExecutionException("JDK binary not found: " + path
                    + " (java.home=" + System.getProperty("java.home") + ")");
        }
        return path;
    }
}
