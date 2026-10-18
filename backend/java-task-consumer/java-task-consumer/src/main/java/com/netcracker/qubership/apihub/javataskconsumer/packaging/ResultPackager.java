package com.netcracker.qubership.apihub.javataskconsumer.packaging;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

public final class ResultPackager {

    private ResultPackager() {
    }

    public static byte[] zipReport(byte[] reportJson) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(out)) {
            ZipEntry entry = new ZipEntry("report.json");
            zos.putNextEntry(entry);
            zos.write(reportJson);
            zos.closeEntry();
        }
        return out.toByteArray();
    }
}
