package org.qubership.jdiff.resolve.oci;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ParsedImageReferenceTest {

    @Test
    void parsesGhcrImage() {
        ParsedImageReference ref = ParsedImageReference.parse(
                "ghcr.io/netcracker/qubership-apihub-java-task-consumer:dev");
        assertThat(ref.registryHost()).isEqualTo("ghcr.io");
        assertThat(ref.repository()).isEqualTo("netcracker/qubership-apihub-java-task-consumer");
        assertThat(ref.reference()).isEqualTo("dev");
        assertThat(ref.registryBaseUrl()).isEqualTo("https://ghcr.io");
    }

    @Test
    void parsesDockerHubShortName() {
        ParsedImageReference ref = ParsedImageReference.parse("ubuntu:latest");
        assertThat(ref.registryHost()).isEqualTo("registry-1.docker.io");
        assertThat(ref.repository()).isEqualTo("library/ubuntu");
        assertThat(ref.reference()).isEqualTo("latest");
    }

    @Test
    void parsesDigestReference() {
        ParsedImageReference ref = ParsedImageReference.parse(
                "ghcr.io/org/app@sha256:abc123");
        assertThat(ref.reference()).isEqualTo("sha256:abc123");
    }
}
