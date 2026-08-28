package org.qubership.jdiff.tools;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Runs an external process, captures stdout/stderr fully, and enforces a timeout.
 * Logging: DEBUG for command line and exit code, TRACE for full captured output.
 */
public class ExternalToolRunner {

    private static final Logger log = LoggerFactory.getLogger(ExternalToolRunner.class);

    public ToolResult run(List<String> command, Path workDir, Duration timeout) {
        log.debug("Running external tool: {} (workDir={}, timeout={})", String.join(" ", command), workDir, timeout);
        Instant start = Instant.now();
        Process process;
        try {
            ProcessBuilder builder = new ProcessBuilder(command);
            if (workDir != null) {
                builder.directory(workDir.toFile());
            }
            process = builder.start();
        } catch (IOException e) {
            throw new ToolExecutionException("Failed to start process: " + String.join(" ", command), e);
        }
        CompletableFuture<String> stdout = readAsync(process.getInputStream());
        CompletableFuture<String> stderr = readAsync(process.getErrorStream());
        try {
            boolean finished = process.waitFor(timeout.toMillis(), java.util.concurrent.TimeUnit.MILLISECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new ToolExecutionException(
                        "Process timed out after " + timeout + ": " + String.join(" ", command));
            }
            Duration duration = Duration.between(start, Instant.now());
            ToolResult result = new ToolResult(process.exitValue(), stdout.get(), stderr.get(), duration);
            log.debug("External tool finished: exitCode={}, duration={}", result.exitCode(), duration);
            log.trace("External tool stdout:\n{}", result.stdout());
            log.trace("External tool stderr:\n{}", result.stderr());
            return result;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            process.destroyForcibly();
            throw new ToolExecutionException("Interrupted while waiting for: " + String.join(" ", command), e);
        } catch (ExecutionException e) {
            throw new ToolExecutionException("Failed to capture output of: " + String.join(" ", command), e.getCause());
        }
    }

    private static CompletableFuture<String> readAsync(InputStream stream) {
        return CompletableFuture.supplyAsync(() -> {
            try (InputStream in = stream) {
                return new String(in.readAllBytes(), StandardCharsets.UTF_8);
            } catch (IOException e) {
                throw new java.io.UncheckedIOException(e);
            }
        });
    }
}
