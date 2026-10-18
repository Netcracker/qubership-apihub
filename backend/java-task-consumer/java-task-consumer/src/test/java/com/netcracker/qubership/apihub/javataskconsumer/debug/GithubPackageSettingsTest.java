package com.netcracker.qubership.apihub.javataskconsumer.debug;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class GithubPackageSettingsTest {

    @TempDir
    Path tempDir;

    @Test
    void writesServerEntriesForGithubRepos() throws Exception {
        Path settings = GithubPackageSettings.write(tempDir, "ghp_secret<>&");
        String xml = Files.readString(settings);
        assertThat(xml).contains("<id>github-quarkus-ext</id>");
        assertThat(xml).contains("<id>github-maas</id>");
        assertThat(xml).contains("<password>ghp_secret&lt;&gt;&amp;</password>");
        assertThat(xml).doesNotContain("<id>central</id>");
    }
}
