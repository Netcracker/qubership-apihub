package org.qubership.jdiff.jdeps;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.qubership.jdiff.tools.ExternalToolRunner;
import org.qubership.jdiff.tools.JdkTools;
import org.qubership.jdiff.tools.ToolExecutionException;
import org.qubership.jdiff.tools.ToolResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Runs {@code jdeps -verbose:class} against a target jar and reports which classes of that jar
 * use which classes from which dependency jar.
 */
public class JdepsRunner {

    private static final Logger log = LoggerFactory.getLogger(JdepsRunner.class);

    private static final Duration TIMEOUT = Duration.ofMinutes(5);

    /**
     * On Windows, {@code ProcessBuilder} still encodes the full command line (~8191 chars). When the
     * joined {@code -cp} list exceeds this, materialize jars under a temp directory as short relative
     * names ({@code dep-0.jar}, …) and run jdeps with that directory as the working directory.
     *
     * <p>A manifest Class-Path stub jar does <em>not</em> work: jdeps does not expand {@code Class-Path}
     * headers from jars on {@code -cp}, so every dependency would show up as {@code not found}.
     */
    private static final int WINDOWS_CLASSPATH_SHORTEN_THRESHOLD = 7000;

    private final ExternalToolRunner runner;
    private final Path jdepsBinary;

    /** Package-visible test hook: force the short relative classpath path on any OS. */
    boolean forceShortClasspathForTests;

    public JdepsRunner(ExternalToolRunner runner) {
        this(runner, JdkTools.binary("jdeps"));
    }

    public JdepsRunner(ExternalToolRunner runner, Path jdepsBinary) {
        this.runner = runner;
        this.jdepsBinary = jdepsBinary;
    }

    public Set<ClassUsage> analyze(Path targetJar, List<Path> dependencyJars) {
        Path workDir = null;
        try {
            ClasspathMaterialization materialization = materializeClasspath(dependencyJars);

            List<String> command = new ArrayList<>();
            command.add(jdepsBinary.toAbsolutePath().toString());
            command.add("-verbose:class");
            command.add("--ignore-missing-deps");
            command.add("--multi-release");
            command.add("base");
            if (materialization.classpathArg() != null) {
                command.add("-cp");
                command.add(materialization.classpathArg());
            }
            command.add(targetJar.toAbsolutePath().toString());

            workDir = materialization.workDir();
            ToolResult result = runner.run(command, workDir, TIMEOUT);
            if (!result.success()) {
                throw new ToolExecutionException("jdeps exited with code " + result.exitCode()
                        + " for command: " + String.join(" ", command) + "\nstderr:\n" + result.stderr());
            }

            Set<ClassUsage> usages = parseAndNormalizeUsages(
                    result.stdout(), dependencyJars, materialization.shortNameToOriginal());

            log.debug("jdeps analyze: command={}, usageCount={}", command, usages.size());
            if (log.isTraceEnabled()) {
                usages.forEach(usage -> log.trace("ClassUsage: {}", usage));
            }
            return usages;
        } catch (IOException e) {
            throw new ToolExecutionException("Failed to prepare jdeps classpath for " + targetJar, e);
        } finally {
            if (workDir != null) {
                deleteRecursively(workDir);
            }
        }
    }

    /**
     * Parses jdeps stdout and normalizes provider jar names. When the short-classpath materialization
     * is used, jdeps prints {@code dep-N.jar}; callers (ImpactAnalyzer) expect the original jar file
     * names.
     */
    static Set<ClassUsage> parseAndNormalizeUsages(
            String stdout, List<Path> dependencyJars, Map<String, String> shortNameToOriginal) {
        Map<String, String> aliases = shortNameToOriginal == null ? Map.of() : shortNameToOriginal;
        Set<String> filterNames = aliases.isEmpty()
                ? dependencyJars.stream()
                        .map(path -> path.getFileName().toString())
                        .collect(Collectors.toSet())
                : aliases.keySet();
        Set<ClassUsage> usages = JdepsOutputParser.parse(stdout, filterNames);
        if (aliases.isEmpty()) {
            return usages;
        }
        Set<ClassUsage> normalized = new LinkedHashSet<>(usages.size());
        for (ClassUsage usage : usages) {
            String original = aliases.getOrDefault(usage.providerJar(), usage.providerJar());
            normalized.add(new ClassUsage(usage.ownerClass(), usage.usedClass(), original));
        }
        return normalized;
    }

    private ClasspathMaterialization materializeClasspath(List<Path> dependencyJars) throws IOException {
        if (dependencyJars.isEmpty()) {
            return new ClasspathMaterialization(null, null, Map.of());
        }
        String joined = dependencyJars.stream()
                .map(Path::toString)
                .collect(Collectors.joining(File.pathSeparator));
        if (!needsShortClasspath(joined)) {
            return new ClasspathMaterialization(joined, null, Map.of());
        }

        Path workDir = Files.createTempDirectory("jdeps-cp-");
        List<String> entryNames = new ArrayList<>();
        Map<String, String> shortNameToOriginal = new LinkedHashMap<>();
        for (int i = 0; i < dependencyJars.size(); i++) {
            String entryName = "dep-" + i + ".jar";
            Path linkTarget = workDir.resolve(entryName);
            Path source = dependencyJars.get(i);
            linkOrCopy(source, linkTarget);
            entryNames.add(entryName);
            shortNameToOriginal.put(entryName, source.getFileName().toString());
        }
        String shortClasspath = String.join(File.pathSeparator, entryNames);
        log.debug("jdeps classpath: {} jars materialized under {} (short relative -cp, {} chars)",
                dependencyJars.size(), workDir, shortClasspath.length());
        return new ClasspathMaterialization(shortClasspath, workDir, Map.copyOf(shortNameToOriginal));
    }

    private static void linkOrCopy(Path source, Path target) throws IOException {
        try {
            Files.createLink(target, source.toAbsolutePath());
        } catch (IOException | UnsupportedOperationException ex) {
            Files.copy(source, target, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    private boolean needsShortClasspath(String joinedClasspath) {
        if (forceShortClasspathForTests) {
            return true;
        }
        if (!System.getProperty("os.name", "").toLowerCase().contains("win")) {
            return false;
        }
        return joinedClasspath.length() > WINDOWS_CLASSPATH_SHORTEN_THRESHOLD;
    }

    private static void deleteRecursively(Path root) {
        try {
            if (!Files.exists(root)) {
                return;
            }
            Files.walk(root)
                    .sorted(Comparator.reverseOrder())
                    .forEach(path -> {
                        try {
                            Files.deleteIfExists(path);
                        } catch (IOException e) {
                            log.warn("Failed to delete {}: {}", path, e.getMessage());
                        }
                    });
        } catch (IOException e) {
            log.warn("Failed to clean up jdeps classpath dir {}: {}", root, e.getMessage());
        }
    }

    private record ClasspathMaterialization(
            String classpathArg, Path workDir, Map<String, String> shortNameToOriginal) {
    }
}
