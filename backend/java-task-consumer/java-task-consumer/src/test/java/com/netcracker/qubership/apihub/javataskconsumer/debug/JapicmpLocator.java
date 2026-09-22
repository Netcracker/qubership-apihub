package com.netcracker.qubership.apihub.javataskconsumer.debug;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

final class JapicmpLocator {

    private static final Logger log = LoggerFactory.getLogger(JapicmpLocator.class);
    static final String VERSION = "0.26.1";
    static final String FILE_NAME = "japicmp-" + VERSION + "-jar-with-dependencies.jar";
    private static final URI DOWNLOAD = URI.create(
            "https://repo1.maven.org/maven2/com/github/siom79/japicmp/japicmp/"
                    + VERSION + "/" + FILE_NAME);

    private JapicmpLocator() {
    }

    static Path resolve(Path repoRoot) throws IOException, InterruptedException {
        String env = System.getenv("JDIFF_JAPICMP_JAR");
        if (env != null && !env.isBlank()) {
            Path fromEnv = Path.of(env.trim());
            if (!Files.isRegularFile(fromEnv)) {
                throw new IOException("JDIFF_JAPICMP_JAR is not a file: " + fromEnv);
            }
            return fromEnv;
        }
        Path bundled = repoRoot.resolve("japicmp").resolve(FILE_NAME);
        if (Files.isRegularFile(bundled)) {
            return bundled;
        }
        Files.createDirectories(bundled.getParent());
        log.info("Downloading japicmp {} to {}", VERSION, bundled);
        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(30)).build();
        HttpRequest request = HttpRequest.newBuilder(DOWNLOAD).timeout(Duration.ofMinutes(2)).GET().build();
        HttpResponse<InputStream> response = client.send(request, HttpResponse.BodyHandlers.ofInputStream());
        if (response.statusCode() != 200) {
            throw new IOException("Failed to download japicmp: HTTP " + response.statusCode());
        }
        Path tmp = bundled.resolveSibling(FILE_NAME + ".part");
        try (InputStream in = response.body()) {
            Files.copy(in, tmp, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        }
        Files.move(tmp, bundled, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        return bundled;
    }
}
