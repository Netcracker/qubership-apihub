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

    private static ByteArrayInputStream tarGzLayer(String entryPath, String content) throws Exception {
        ByteArrayOutputStream tarBytes = new ByteArrayOutputStream();
        try (TarArchiveOutputStream tar = new TarArchiveOutputStream(tarBytes)) {
            TarArchiveEntry entry = new TarArchiveEntry(entryPath);
            byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
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
}
