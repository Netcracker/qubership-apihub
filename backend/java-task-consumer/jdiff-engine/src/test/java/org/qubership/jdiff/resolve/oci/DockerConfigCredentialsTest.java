package org.qubership.jdiff.resolve.oci;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;

class DockerConfigCredentialsTest {

    @Test
    void readsGhcrTokenFromEnv() {
        var auth = DockerConfigCredentials.fromGhcrEnv(Map.of("GHCR_TOKEN", "ghp_test"));
        assertThat(auth).contains(new DockerConfigCredentials.BasicAuth("x-access-token", "ghp_test"));
    }

    @Test
    void prefersGhcrUsernameWhenSet() {
        var auth = DockerConfigCredentials.fromGhcrEnv(Map.of(
                "GITHUB_TOKEN", "ghp_other",
                "GHCR_USERNAME", "alice"));
        assertThat(auth).contains(new DockerConfigCredentials.BasicAuth("alice", "ghp_other"));
    }

    @Test
    void ignoresBlankToken() {
        assertThat(DockerConfigCredentials.fromGhcrEnv(Map.of("GHCR_TOKEN", "  "))).isEmpty();
    }
}
