package com.netcracker.qubership.apihub.javataskconsumer.support;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import com.netcracker.qubership.apihub.javataskconsumer.config.WorkerConfig;

public final class TestSupport {

    private TestSupport() {
    }

    public static WorkerConfig workerConfig(int backendPort, Path workDir, String builderId) {
        return new WorkerConfig(
                "localhost:" + backendPort,
                "test-api-key",
                builderId,
                1_000,
                60_000,
                3_000,
                workDir,
                Path.of("target/missing-japicmp.jar"),
                4,
                null,
                List.of());
    }

    public static byte[] taskZip(String configJson) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(out)) {
            ZipEntry entry = new ZipEntry("config.json");
            zos.putNextEntry(entry);
            zos.write(configJson.getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();
        }
        return out.toByteArray();
    }

    public static Path tempWorkDir() throws IOException {
        return Files.createTempDirectory("jtc-test-");
    }
}
