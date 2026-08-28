package org.qubership.jdiff.config;

import java.nio.file.Path;
import java.util.List;

/**
 * Runtime configuration for {@link org.qubership.jdiff.service.JdiffBuildService}.
 */
public record JdiffEngineConfig(
        Path workDir,
        Path japicmpJar,
        Path settingsXml,
        List<String> repositoryTokens,
        int threads
) {

    public static JdiffEngineConfig defaults(Path workDir, Path japicmpJar) {
        return new JdiffEngineConfig(workDir, japicmpJar, null, List.of(), 4);
    }
}
