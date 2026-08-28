package org.qubership.jdiff.jdeps;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.qubership.jdiff.tools.ExternalToolRunner;
import org.qubership.jdiff.tools.ToolResult;

import static org.assertj.core.api.Assertions.assertThat;

class JdepsRunnerTest {

    @TempDir
    Path tempDir;

    @Test
    void parseAndNormalizeUsagesRemapsStubProviderToOriginalJarName() {
        String stdout = String.join("\n",
                "app.jar -> dep-0.jar",
                "   com.example.Client -> org.maas.HttpClient   dep-0.jar");
        List<Path> deps = List.of(Path.of("cache/maas-client-11.1.3.jar"));
        Map<String, String> stubToOriginal = Map.of("dep-0.jar", "maas-client-11.1.3.jar");

        Set<ClassUsage> usages = JdepsRunner.parseAndNormalizeUsages(stdout, deps, stubToOriginal);

        assertThat(usages).containsExactly(
                new ClassUsage("com.example.Client", "org.maas.HttpClient", "maas-client-11.1.3.jar"));
    }

    @Test
    void parseAndNormalizeUsagesKeepsOriginalNamesWhenNotStubbing() {
        String stdout = "   com.example.Client -> org.maas.HttpClient   maas-client-11.1.3.jar\n";
        List<Path> deps = List.of(Path.of("cache/maas-client-11.1.3.jar"));

        Set<ClassUsage> usages = JdepsRunner.parseAndNormalizeUsages(stdout, deps, Map.of());

        assertThat(usages).containsExactly(
                new ClassUsage("com.example.Client", "org.maas.HttpClient", "maas-client-11.1.3.jar"));
    }

    @Test
    void analyzeWithForcedShortClasspathUsesRelativeCpAndRemapsProviders() throws Exception {
        Path targetJar = tempDir.resolve("app.jar");
        Path maasJar = tempDir.resolve("maas-client-11.1.3.jar");
        Files.write(targetJar, new byte[0]);
        Files.write(maasJar, new byte[0]);

        AtomicReference<List<String>> capturedCommand = new AtomicReference<>();
        AtomicReference<Path> capturedWorkDir = new AtomicReference<>();
        ExternalToolRunner fake = new ExternalToolRunner() {
            @Override
            public ToolResult run(List<String> command, Path workDir, Duration timeout) {
                capturedCommand.set(List.copyOf(command));
                capturedWorkDir.set(workDir);
                return new ToolResult(0,
                        "   com.example.Client -> org.maas.HttpClient   dep-0.jar\n",
                        "",
                        Duration.ZERO);
            }
        };

        JdepsRunner runner = new JdepsRunner(fake);
        runner.forceShortClasspathForTests = true;

        Set<ClassUsage> usages = runner.analyze(targetJar, List.of(maasJar));

        assertThat(capturedWorkDir.get()).isNotNull();
        int cpIdx = capturedCommand.get().indexOf("-cp");
        assertThat(cpIdx).isGreaterThanOrEqualTo(0);
        assertThat(capturedCommand.get().get(cpIdx + 1)).isEqualTo("dep-0.jar");
        assertThat(usages).containsExactly(
                new ClassUsage("com.example.Client", "org.maas.HttpClient", "maas-client-11.1.3.jar"));
    }
}
