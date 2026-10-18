package com.netcracker.qubership.apihub.javataskconsumer.debug;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

/**
 * GitHub Packages hosts {@code com.netcracker.cloud.*} artifacts. Aether needs explicit repo URLs
 * plus a settings.xml {@code <server>} matching each repo id.
 */
final class GithubPackageSettings {

    static final List<String> REPOS = List.of(
            "central=https://repo1.maven.org/maven2/",
            "github-quarkus-ext=https://maven.pkg.github.com/Netcracker/qubership-core-quarkus-extensions",
            "github-maas=https://maven.pkg.github.com/Netcracker/qubership-maas-client",
            "github-core-libs=https://maven.pkg.github.com/Netcracker/qubership-core-java-libs",
            "github-qip=https://maven.pkg.github.com/Netcracker/qubership-integration-platform");

    private GithubPackageSettings() {
    }

    static Path write(Path workDir, String token) throws IOException {
        String username = firstNonBlank(System.getenv("GHCR_USERNAME"), System.getenv("GITHUB_ACTOR"),
                "x-access-token");
        String escapedToken = xmlEscape(token);
        String escapedUser = xmlEscape(username);
        StringBuilder xml = new StringBuilder();
        xml.append("<settings xmlns=\"http://maven.apache.org/SETTINGS/1.2.0\">\n  <servers>\n");
        for (String tokenRepo : REPOS) {
            String id = tokenRepo.substring(0, tokenRepo.indexOf('='));
            if ("central".equals(id)) {
                continue;
            }
            xml.append("    <server>\n      <id>").append(id).append("</id>\n      <username>")
                    .append(escapedUser).append("</username>\n      <password>")
                    .append(escapedToken).append("</password>\n    </server>\n");
        }
        xml.append("  </servers>\n</settings>\n");
        Path file = workDir.resolve("github-settings.xml");
        Files.writeString(file, xml.toString(), StandardCharsets.UTF_8);
        return file;
    }

    static String githubToken() {
        return firstNonBlank(System.getenv("GHCR_TOKEN"), System.getenv("GITHUB_TOKEN"));
    }

    private static String xmlEscape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }
}
