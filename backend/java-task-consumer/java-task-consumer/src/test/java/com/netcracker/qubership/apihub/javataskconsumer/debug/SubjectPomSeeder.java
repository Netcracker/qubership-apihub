package com.netcracker.qubership.apihub.javataskconsumer.debug;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;

/**
 * qip-micro-engine 0.2.5 is not on Maven Central. Seed the tagged POM into the local repo so
 * upgrade-impact can resolve the docker subject's coordinates.
 */
final class SubjectPomSeeder {

    static final String GROUP_PATH = "org/qubership/integration/platform";
    static final String ARTIFACT_ID = "qip-micro-engine";
    static final String VERSION = "0.2.5";
    private static final URI SOURCE = URI.create(
            "https://raw.githubusercontent.com/Netcracker/qubership-integration-platform/"
                    + "micro-engine-v0.2.5/micro-engine/pom.xml");

    private SubjectPomSeeder() {
    }

    static Path ensure(Path localMavenRepo) throws IOException, InterruptedException {
        Path dir = localMavenRepo.resolve(GROUP_PATH).resolve(ARTIFACT_ID).resolve(VERSION);
        Path pom = dir.resolve(ARTIFACT_ID + "-" + VERSION + ".pom");
        if (Files.isRegularFile(pom)) {
            return pom;
        }
        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(30)).build();
        HttpRequest request = HttpRequest.newBuilder(SOURCE).timeout(Duration.ofMinutes(1)).GET().build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new IOException("Failed to download qip-micro-engine POM: HTTP " + response.statusCode());
        }
        String rewritten = response.body().replace("<changelist>-SNAPSHOT</changelist>", "<changelist></changelist>");
        Files.createDirectories(dir);
        Files.writeString(pom, rewritten, StandardCharsets.UTF_8);
        return pom;
    }

    static Path defaultLocalMavenRepo() {
        return Path.of(System.getProperty("user.home"), ".m2", "repository");
    }
}
