package org.qubership.jdiff.resolve;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.apache.commons.compress.archivers.tar.TarArchiveEntry;
import org.apache.commons.compress.archivers.tar.TarArchiveOutputStream;
import org.apache.commons.compress.compressors.gzip.GzipCompressorOutputStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.qubership.jdiff.resolve.oci.OciLayerMerger;

class ContainerImageJarExtractorTest {

    @TempDir
    Path tempDir;

    @Test
    void extractsJarFromMergedLayers() throws Exception {
        OciLayerMerger merger = new OciLayerMerger();
        merger.applyLayer(tarGzLayer("app/java-task-consumer.jar", "jar-content"));

        var extractor = new ContainerImageJarExtractor(tempDir.resolve("work"), reference -> merger);

        Path jar = extractor.extractJar("ghcr.io/example/app:1.0", null);

        assertThat(Files.readString(jar)).isEqualTo("jar-content");
    }

    @Test
    void failsWhenImagePullFails() {
        var extractor = new ContainerImageJarExtractor(tempDir, reference -> {
            throw new JarResolutionException("pull failed");
        });

        assertThatThrownBy(() -> extractor.extractJar("ghcr.io/example/app:1.0", null))
                .isInstanceOf(JarResolutionException.class)
                .hasMessageContaining("pull failed");
    }

    @Test
    void inventoriesPackagedLibrariesFromQuarkusLayout() throws Exception {
        byte[] appJar = jarBytesWithPom("org.example", "svc", "1.0");
        byte[] libJar = jarBytesWithPom("com.dep", "api", "1.0.0");
        OciLayerMerger merger = new OciLayerMerger();
        merger.applyLayer(tarGzLayer("app/quarkus-run.jar", "runner"));
        merger.applyLayer(tarGzBytes("app/app/svc-1.0.jar", appJar));
        merger.applyLayer(tarGzBytes("app/lib/main/api-1.0.0.jar", libJar));

        var extractor = new ContainerImageJarExtractor(tempDir.resolve("work"), reference -> merger);

        ImageClasspath classpath = extractor.extractClasspath("ghcr.io/example/app:1.0", "quarkus-run.jar", null);

        assertThat(Files.readAllBytes(classpath.applicationJar())).isEqualTo(appJar);
        assertThat(classpath.packagedLibraries()).extracting(dep -> dep.gav().toString())
                .containsExactly("com.dep:api:1.0.0");
    }

    private static ByteArrayInputStream tarGzLayer(String entryPath, String content) throws Exception {
        return tarGzBytes(entryPath, content.getBytes(StandardCharsets.UTF_8));
    }

    private static ByteArrayInputStream tarGzBytes(String entryPath, byte[] bytes) throws Exception {
        ByteArrayOutputStream tarBytes = new ByteArrayOutputStream();
        try (TarArchiveOutputStream tar = new TarArchiveOutputStream(tarBytes)) {
            TarArchiveEntry entry = new TarArchiveEntry(entryPath);
            entry.setSize(bytes.length);
            tar.putArchiveEntry(entry);
            tar.write(bytes);
            tar.closeArchiveEntry();
        }
        ByteArrayOutputStream gzipBytes = new ByteArrayOutputStream();
        try (GzipCompressorOutputStream gzip = new GzipCompressorOutputStream(gzipBytes)) {
            gzip.write(tarBytes.toByteArray());
        }
        return new ByteArrayInputStream(gzipBytes.toByteArray());
    }

    private static byte[] jarBytesWithPom(String groupId, String artifactId, String version) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (java.util.jar.JarOutputStream jar = new java.util.jar.JarOutputStream(out)) {
            String entryName = "META-INF/maven/" + groupId.replace('.', '/') + "/" + artifactId + "/pom.properties";
            jar.putNextEntry(new java.util.jar.JarEntry(entryName));
            jar.write(("groupId=" + groupId + "\nartifactId=" + artifactId + "\nversion=" + version + "\n")
                    .getBytes(StandardCharsets.UTF_8));
            jar.closeEntry();
        }
        return out.toByteArray();
    }
}
