package com.netcracker.qubership.apihub.javataskconsumer.registry;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.netcracker.qubership.apihub.javataskconsumer.config.WorkerConfig;
import com.netcracker.qubership.apihub.javataskconsumer.model.BuildStatus;
import com.netcracker.qubership.apihub.javataskconsumer.model.BuildTask;
import com.netcracker.qubership.apihub.javataskconsumer.model.JavaBuildConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

public final class RegistryClient {

    private static final Logger log = LoggerFactory.getLogger(RegistryClient.class);
    private static final int RETRY_COUNT = 3;
    private static final Duration RETRY_DELAY = Duration.ofSeconds(2);

    private final WorkerConfig config;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public RegistryClient(WorkerConfig config) {
        this.config = config;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(30))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    public Optional<BuildTask> findTask() {
        String url = config.backendBaseUrl()
                + "/api/v2/java-builders/" + config.builderId() + "/tasks";
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofMinutes(2))
                    .header("api-key", config.apiKey())
                    .POST(HttpRequest.BodyPublishers.noBody())
                    .build();
            HttpResponse<byte[]> response = sendWithRetry(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() == 204 || response.body() == null || response.body().length == 0) {
                return Optional.empty();
            }
            if (response.statusCode() != 200) {
                log.warn("findTask unexpected status {} body={}", response.statusCode(),
                        new String(response.body(), StandardCharsets.UTF_8));
                return Optional.empty();
            }
            return Optional.of(parseTaskZip(response.body()));
        } catch (Exception e) {
            log.error("findTask failed", e);
            return Optional.empty();
        }
    }

    public void postBuildStatus(
            String packageId,
            String publishId,
            BuildStatus status,
            byte[] resultZip,
            String errorMessage
    ) throws IOException, InterruptedException {
        String url = config.backendBaseUrl()
                + "/api/v3/packages/" + encode(packageId)
                + "/java-publish/" + encode(publishId)
                + "/status";
        MultipartBody body = new MultipartBody()
                .field("status", status.wireValue())
                .field("builderId", config.builderId());
        if (status == BuildStatus.ERROR) {
            body.field("errors", errorMessage == null ? "unknown error" : errorMessage);
        } else if (status == BuildStatus.COMPLETE) {
            body.file("data", "package.zip", "application/zip", resultZip);
        }
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofMinutes(10))
                .header("api-key", config.apiKey())
                .header("Content-Type", "multipart/form-data; boundary=" + body.boundary())
                .POST(HttpRequest.BodyPublishers.ofByteArray(body.toBytes()))
                .build();
        HttpResponse<Void> response = sendWithRetry(request, HttpResponse.BodyHandlers.discarding());
        if (response.statusCode() != 204 && response.statusCode() != 200) {
            throw new IOException("postBuildStatus failed with status " + response.statusCode());
        }
    }

    private BuildTask parseTaskZip(byte[] zipBytes) throws IOException {
        Path tempZip = config.workDir().resolve("task-" + UUID.randomUUID() + ".zip");
        Files.write(tempZip, zipBytes);
        String configJson = null;
        try (ZipInputStream zis = new ZipInputStream(Files.newInputStream(tempZip))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if ("config.json".equals(entry.getName())) {
                    configJson = new String(zis.readAllBytes(), StandardCharsets.UTF_8);
                    break;
                }
            }
        }
        if (configJson == null) {
            throw new IOException("config.json not found in task ZIP");
        }
        JavaBuildConfig buildConfig = objectMapper.readValue(configJson, JavaBuildConfig.class);
        return new BuildTask(buildConfig, tempZip);
    }

    private <T> HttpResponse<T> sendWithRetry(
            HttpRequest request,
            HttpResponse.BodyHandler<T> handler
    ) throws IOException, InterruptedException {
        IOException lastIo = null;
        for (int attempt = 1; attempt <= RETRY_COUNT; attempt++) {
            try {
                HttpResponse<T> response = httpClient.send(request, handler);
                if (response.statusCode() == 400 || response.statusCode() == 404) {
                    return response;
                }
                if (response.statusCode() >= 500 && attempt < RETRY_COUNT) {
                    Thread.sleep(RETRY_DELAY.toMillis());
                    continue;
                }
                return response;
            } catch (IOException e) {
                lastIo = e;
                if (attempt < RETRY_COUNT) {
                    Thread.sleep(RETRY_DELAY.toMillis());
                }
            }
        }
        throw lastIo == null ? new IOException("request failed") : lastIo;
    }

    private static String encode(String value) {
        return java.net.URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    /**
     * Minimal multipart builder (no extra dependencies).
     */
    private static final class MultipartBody {
        private final String boundary = "----JavaTaskConsumer" + UUID.randomUUID();
        private final java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();

        String boundary() {
            return boundary;
        }

        MultipartBody field(String name, String value) {
            write("--" + boundary + "\r\n");
            write("Content-Disposition: form-data; name=\"" + name + "\"\r\n\r\n");
            write(value + "\r\n");
            return this;
        }

        MultipartBody file(String name, String filename, String contentType, byte[] data) {
            write("--" + boundary + "\r\n");
            write("Content-Disposition: form-data; name=\"" + name + "\"; filename=\"" + filename + "\"\r\n");
            write("Content-Type: " + contentType + "\r\n\r\n");
            try {
                out.write(data);
            } catch (IOException e) {
                throw new IllegalStateException(e);
            }
            write("\r\n");
            return this;
        }

        byte[] toBytes() {
            write("--" + boundary + "--\r\n");
            return out.toByteArray();
        }

        private void write(String text) {
            out.writeBytes(text.getBytes(StandardCharsets.UTF_8));
        }
    }
}
