package org.qubership.jdiff.japicmp;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.qubership.jdiff.tools.ExternalToolRunner;
import org.qubership.jdiff.tools.JdkTools;
import org.qubership.jdiff.tools.ToolExecutionException;
import org.qubership.jdiff.tools.ToolResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Runs the japicmp CLI jar to compare two jars and produce an XML report.
 */
public class JapicmpRunner {

    private static final Logger log = LoggerFactory.getLogger(JapicmpRunner.class);

    private static final Duration TIMEOUT = Duration.ofMinutes(10);

    private final ExternalToolRunner runner;
    private final Path japicmpJar;

    public JapicmpRunner(ExternalToolRunner runner, Path japicmpJar) {
        this.runner = runner;
        this.japicmpJar = japicmpJar;
    }

    /**
     * Compares {@code oldJar} against {@code newJar} with japicmp, writing the XML report to
     * {@code outputXml}.
     *
     * @return {@code outputXml}
     */
    public Path compare(Path oldJar, Path newJar, Path outputXml, JapicmpOptions options) {
        Path parent = outputXml.toAbsolutePath().getParent();
        if (parent != null) {
            try {
                Files.createDirectories(parent);
            } catch (IOException e) {
                throw new UncheckedIOException("Failed to create output directory: " + parent, e);
            }
        }

        List<String> command = new ArrayList<>();
        command.add(JdkTools.binary("java").toString());
        command.add("-jar");
        command.add(japicmpJar.toString());
        command.add("--old");
        command.add(oldJar.toString());
        command.add("--new");
        command.add(newJar.toString());
        command.add("--xml-file");
        command.add(outputXml.toString());
        if (options.onlyModified()) {
            command.add("--only-modified");
        }
        if (options.ignoreMissingClasses()) {
            command.add("--ignore-missing-classes");
        }

        ToolResult result = runner.run(command, null, TIMEOUT);
        if (!Files.isRegularFile(outputXml)) {
            throw new ToolExecutionException(
                    "japicmp did not produce an XML report at " + outputXml + " (exitCode=" + result.exitCode() + ")");
        }
        if (!result.success()) {
            log.warn("japicmp exited with code {} but produced an XML report at {}", result.exitCode(), outputXml);
        }
        return outputXml;
    }
}
