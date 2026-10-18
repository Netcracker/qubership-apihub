package com.netcracker.qubership.apihub.javataskconsumer.packaging;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.junit.jupiter.api.Test;

class ResultPackagerTest {

    @Test
    void zipContainsReportJson() throws Exception {
        byte[] json = "{\"mode\":\"api-report\"}".getBytes(StandardCharsets.UTF_8);
        byte[] zip = ResultPackager.zipReport(json);

        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(zip))) {
            ZipEntry entry = zis.getNextEntry();
            assertThat(entry.getName()).isEqualTo("report.json");
            assertThat(zis.readAllBytes()).isEqualTo(json);
            assertThat(zis.getNextEntry()).isNull();
        }
    }
}
