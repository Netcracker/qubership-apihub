package org.qubership.jdiff.pipeline;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.qubership.jdiff.japicmp.JapicmpOptions;
import org.qubership.jdiff.japicmp.JapicmpResult;
import org.qubership.jdiff.japicmp.JapicmpRunner;
import org.qubership.jdiff.japicmp.JapicmpXmlParser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * {@link JarComparator} backed by the real japicmp runner and XML parser.
 */
public class JapicmpJarComparator implements JarComparator {

    private static final Logger LOG = LoggerFactory.getLogger(JapicmpJarComparator.class);

    private final JapicmpRunner runner;
    private final Path workDir;

    public JapicmpJarComparator(JapicmpRunner runner, Path workDir) {
        this.runner = runner;
        this.workDir = workDir;
    }

    @Override
    public JapicmpResult compare(Path oldJar, Path newJar, boolean fullApi) {
        JapicmpOptions options = fullApi ? JapicmpOptions.fullApiDefaults() : JapicmpOptions.diffDefaults();
        Path outputXml = workDir.resolve("japicmp-" + UUID.randomUUID() + ".xml");

        LOG.info("Running japicmp ({} -> {})", oldJar, newJar);
        runner.compare(oldJar, newJar, outputXml, options);

        try {
            JapicmpResult result = JapicmpXmlParser.parse(outputXml, fullApi);
            LOG.info("Parsed {} changes", result.changes().size());
            return result;
        } finally {
            try {
                Files.deleteIfExists(outputXml);
            } catch (IOException e) {
                LOG.debug("Failed to delete temporary japicmp XML {}: {}", outputXml, e.getMessage());
            }
        }
    }
}
