package org.qubership.jdiff.resolve.oci;

import static org.assertj.core.api.Assertions.assertThat;

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

class OciLayerMergerTest {

    @TempDir
    Path tempDir;

    @Test
    void mergesLayersAndWritesAppDirectory() throws Exception {
        OciLayerMerger merger = new OciLayerMerger();
        merger.applyLayer(tarGzLayer("app/service.jar", "payload"));

        Path appDir = tempDir.resolve("app");
        merger.writeAppDirectory(appDir);

        assertThat(Files.readString(appDir.resolve("service.jar"))).isEqualTo("payload");
    }

    @Test
    void laterLayerOverridesEarlierFile() throws Exception {
        OciLayerMerger merger = new OciLayerMerger();
        merger.applyLayer(tarGzLayer("app/service.jar", "v1"));
        merger.applyLayer(tarGzLayer("app/service.jar", "v2"));

        Path appDir = tempDir.resolve("app");
        merger.writeAppDirectory(appDir);

        assertThat(Files.readString(appDir.resolve("service.jar"))).isEqualTo("v2");
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
