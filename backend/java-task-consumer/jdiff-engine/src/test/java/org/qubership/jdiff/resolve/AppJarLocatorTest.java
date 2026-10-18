package org.qubership.jdiff.resolve;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class AppJarLocatorTest {

    @TempDir
    Path tempDir;

    @Test
    void discoversSingleJarInAppDir() throws Exception {
        Path appDir = tempDir.resolve("app");
        Files.createDirectories(appDir);
        Path jar = appDir.resolve("service.jar");
        Files.writeString(jar, "jar");

        assertThat(AppJarLocator.locate(appDir, null)).isEqualTo(jar);
    }

    @Test
    void resolvesExplicitRelativePath() throws Exception {
        Path appDir = tempDir.resolve("app");
        Files.createDirectories(appDir);
        Path jar = appDir.resolve("nested").resolve("app.jar");
        Files.createDirectories(jar.getParent());
        Files.writeString(jar, "jar");

        assertThat(AppJarLocator.locate(appDir, "nested/app.jar")).isEqualTo(jar);
    }

    @Test
    void resolvesExplicitAbsoluteAppPath() throws Exception {
        Path appDir = tempDir.resolve("app");
        Files.createDirectories(appDir);
        Path jar = appDir.resolve("service.jar");
        Files.writeString(jar, "jar");

        assertThat(AppJarLocator.locate(appDir, "/app/service.jar")).isEqualTo(jar);
    }

    @Test
    void rejectsMultipleJarsWithoutExplicitPath() throws Exception {
        Path appDir = tempDir.resolve("app");
        Files.createDirectories(appDir);
        Files.writeString(appDir.resolve("a.jar"), "a");
        Files.writeString(appDir.resolve("b.jar"), "b");

        assertThatThrownBy(() -> AppJarLocator.locate(appDir, null))
                .isInstanceOf(JarResolutionException.class)
                .hasMessageContaining("Multiple jars");
    }

    @Test
    void rejectsPathEscapingAppDir() throws Exception {
        Path appDir = tempDir.resolve("app");
        Files.createDirectories(appDir);

        assertThatThrownBy(() -> AppJarLocator.locate(appDir, "../outside.jar"))
                .isInstanceOf(JarResolutionException.class)
                .hasMessageContaining("escapes");
    }
}
