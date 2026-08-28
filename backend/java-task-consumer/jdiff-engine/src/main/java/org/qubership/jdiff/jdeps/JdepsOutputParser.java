package org.qubership.jdiff.jdeps;

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Parses the output of {@code jdeps -verbose:class}.
 */
public final class JdepsOutputParser {

    private JdepsOutputParser() {
    }

    /**
     * Parses {@code jdeps -verbose:class} stdout, keeping only class-level dependency edges whose
     * provider is one of {@code dependencyJarFileNames}.
     *
     * <p>Jdeps output format:
     * <ul>
     *   <li>non-indented lines are jar-level headers, e.g.
     *       {@code "checkstyle-13.9.0.jar -> C:\...\picocli-4.7.7.jar"} - ignored;</li>
     *   <li>indented lines are class-level edges, e.g. {@code "   owner -> used   providerToken"},
     *       where {@code providerToken} is a jar file name, a JDK module name (e.g. {@code java.base}),
     *       or {@code "not found"}.</li>
     * </ul>
     */
    public static Set<ClassUsage> parse(String jdepsStdout, Set<String> dependencyJarFileNames) {
        Set<ClassUsage> usages = new LinkedHashSet<>();
        if (jdepsStdout == null || jdepsStdout.isEmpty()) {
            return usages;
        }
        for (String rawLine : jdepsStdout.split("\r?\n")) {
            if (rawLine.isEmpty() || !Character.isWhitespace(rawLine.charAt(0))) {
                continue;
            }
            String line = rawLine.trim();
            int arrowIdx = line.indexOf("->");
            if (arrowIdx < 0) {
                continue;
            }
            String owner = line.substring(0, arrowIdx).trim();
            String rest = line.substring(arrowIdx + 2).trim();
            String[] parts = rest.split("\\s+");
            if (parts.length < 2) {
                continue;
            }
            String used = parts[0];
            String provider = parts[parts.length - 1];
            if (dependencyJarFileNames.contains(provider)) {
                usages.add(new ClassUsage(owner, used, provider));
            }
        }
        return usages;
    }
}
