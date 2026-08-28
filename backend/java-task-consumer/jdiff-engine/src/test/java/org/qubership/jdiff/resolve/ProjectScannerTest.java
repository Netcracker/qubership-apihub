package org.qubership.jdiff.resolve;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.qubership.jdiff.model.Gav;

class ProjectScannerTest {

    @Test
    void scanReturnsAllModulesWithResolvedGavsAndTargetJarOnlyWhereItExists(@TempDir Path tempDir) throws URISyntaxException, IOException {
        Path fixtureRoot = Path.of(getClass().getResource("/resolve/multi").toURI());
        Path projectRoot = tempDir.resolve("multi");
        copyDirectory(fixtureRoot, projectRoot);

        Path modJarTargetDir = projectRoot.resolve("mod-jar").resolve("target");
        Files.createDirectories(modJarTargetDir);
        Path dummyJar = modJarTargetDir.resolve("mod-jar-1.2.3.jar");
        Files.writeString(dummyJar, "dummy");

        EffectivePomBuilder pomBuilder = new EffectivePomBuilder(new FakeArtifactResolver(projectRoot));
        ProjectScanner scanner = new ProjectScanner(pomBuilder);

        List<MavenModule> modules = scanner.scan(projectRoot);

        assertThat(modules).hasSize(3);
        Map<String, MavenModule> byArtifact = modules.stream()
                .collect(Collectors.toMap(m -> m.gav().artifactId(), m -> m));

        assertThat(byArtifact.get("multi").gav()).isEqualTo(new Gav("org.example.multi", "multi", "1.2.3", null));
        assertThat(byArtifact.get("multi").packaging()).isEqualTo("pom");
        assertThat(byArtifact.get("multi").targetJar()).isNull();

        assertThat(byArtifact.get("mod-jar").gav()).isEqualTo(new Gav("org.example.multi", "mod-jar", "1.2.3", null));
        assertThat(byArtifact.get("mod-jar").packaging()).isEqualTo("jar");
        assertThat(byArtifact.get("mod-jar").targetJar()).isEqualTo(dummyJar);

        assertThat(byArtifact.get("mod-pom").gav()).isEqualTo(new Gav("org.example.multi", "mod-pom", "1.2.3", null));
        assertThat(byArtifact.get("mod-pom").packaging()).isEqualTo("pom");
        assertThat(byArtifact.get("mod-pom").targetJar()).isNull();
    }

    private static void copyDirectory(Path source, Path target) throws IOException {
        try (Stream<Path> stream = Files.walk(source)) {
            for (Path path : (Iterable<Path>) stream::iterator) {
                Path dest = target.resolve(source.relativize(path).toString());
                if (Files.isDirectory(path)) {
                    Files.createDirectories(dest);
                } else {
                    Files.createDirectories(dest.getParent());
                    Files.copy(path, dest);
                }
            }
        }
    }
}
