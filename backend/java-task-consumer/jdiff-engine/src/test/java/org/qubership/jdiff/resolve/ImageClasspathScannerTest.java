package org.qubership.jdiff.resolve;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.jar.JarEntry;
import java.util.jar.JarOutputStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.qubership.jdiff.model.Gav;

class ImageClasspathScannerTest {

    @TempDir
    Path tempDir;

    @Test
    void readsLibraryVersionsFromQuarkusLayoutAndSkipsRunnerJar() throws Exception {
        Path appDir = tempDir.resolve("app");
        Files.createDirectories(appDir.resolve("app"));
        Files.createDirectories(appDir.resolve("lib").resolve("main"));

        Path appJar = writeJarWithPom(
                appDir.resolve("app").resolve("qip-micro-engine-0.2.5.jar"),
                "org.qubership.integration.platform",
                "qip-micro-engine",
                "0.2.5");
        writeJarWithPom(
                appDir.resolve("lib").resolve("main").resolve("framework-contexts-9.0.1.jar"),
                "com.netcracker.cloud.quarkus",
                "framework-contexts",
                "9.0.1");
        Files.writeString(appDir.resolve("quarkus-run.jar"), "launcher");

        ImageClasspath classpath = ImageClasspathScanner.scan(appDir, "quarkus-run.jar", null);

        assertThat(classpath.applicationJar()).isEqualTo(appJar);
        assertThat(classpath.applicationGav()).isEqualTo(
                new Gav("org.qubership.integration.platform", "qip-micro-engine", "0.2.5", null));
        assertThat(classpath.packagedLibraries()).extracting(dep -> dep.gav().toString())
                .containsExactly("com.netcracker.cloud.quarkus:framework-contexts:9.0.1");
        assertThat(classpath.packagedLibraries()).noneMatch(dep ->
                "qip-micro-engine".equals(dep.gav().artifactId()));
    }

    @Test
    void ignoresJarsWithoutMavenPomProperties() throws Exception {
        Path appDir = tempDir.resolve("app");
        Files.createDirectories(appDir);
        Path serviceJar = appDir.resolve("service.jar");
        Files.writeString(serviceJar, "plain-jar");
        writeJarWithPom(
                appDir.resolve("lib-api-1.0.0.jar"),
                "com.dep",
                "api",
                "1.0.0");

        ImageClasspath classpath = ImageClasspathScanner.scan(appDir, "service.jar", null);

        assertThat(classpath.applicationJar()).isEqualTo(serviceJar);
        assertThat(classpath.packagedLibraries()).extracting(dep -> dep.gav().toString())
                .containsExactly("com.dep:api:1.0.0");
    }

    static Path writeJarWithPom(Path jar, String groupId, String artifactId, String version) throws IOException {
        Files.createDirectories(jar.getParent());
        try (JarOutputStream out = new JarOutputStream(Files.newOutputStream(jar))) {
            String entryName = "META-INF/maven/" + groupId.replace('.', '/') + "/" + artifactId + "/pom.properties";
            out.putNextEntry(new JarEntry(entryName));
            String properties = "groupId=" + groupId + "\nartifactId=" + artifactId + "\nversion=" + version + "\n";
            out.write(properties.getBytes(StandardCharsets.UTF_8));
            out.closeEntry();
        }
        return jar;
    }
}
