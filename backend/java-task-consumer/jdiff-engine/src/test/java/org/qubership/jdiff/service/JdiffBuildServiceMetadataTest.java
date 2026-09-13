package org.qubership.jdiff.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.qubership.jdiff.config.JdiffEngineConfig;
import org.qubership.jdiff.model.Gav;

class JdiffBuildServiceMetadataTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void parseGavFromMetadataFields() throws Exception {
        var node = mapper.readTree("""
                {"groupId":"com.example","artifactId":"lib","version":"1.0.0"}
                """);
        assertThatThrownBy(() -> new JdiffBuildService(engineConfig()).runApiReport(node))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("japicmp jar not found");
    }

    @Test
    void parseSubjectGav() throws Exception {
        var node = mapper.readTree("""
                {
                  "subject": {"type":"gav","groupId":"com.app","artifactId":"svc","version":"1.0"},
                  "upgrades": [{"groupId":"org.lib","artifactId":"core","version":"2.0"}]
                }
                """);
        assertThatThrownBy(() -> new JdiffBuildService(engineConfig()).runUpgradeImpact(node))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("japicmp jar not found");
    }

    @Test
    void dockerSubjectRequiresMavenCoordinates() throws Exception {
        var node = mapper.readTree("""
                {
                  "subject": {"type":"docker","imageReference":"ghcr.io/org/app:1.0"},
                  "upgrades": [{"groupId":"org.lib","artifactId":"core","version":"2.0"}]
                }
                """);
        assertThatThrownBy(() -> JdiffBuildService.parseSubject(node.get("subject")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("groupId");
    }

    @Test
    void dockerSubjectReachesEngineWhenCoordinatesPresent() throws Exception {
        var node = mapper.readTree("""
                {
                  "subject": {
                    "type":"docker",
                    "imageReference":"ghcr.io/org/app:1.0",
                    "groupId":"com.app",
                    "artifactId":"svc",
                    "version":"1.0"
                  },
                  "upgrades": [{"groupId":"org.lib","artifactId":"core","version":"2.0"}]
                }
                """);
        assertThatThrownBy(() -> new JdiffBuildService(engineConfig()).runUpgradeImpact(node))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("japicmp jar not found");
    }

    @Test
    void gavJarSourceExposesCoordinate() {
        var source = new org.qubership.jdiff.resolve.GavJarSource("g", "a", "1");
        assertThat(source.gav()).isEqualTo(new Gav("g", "a", "1", null));
    }

    private static JdiffEngineConfig engineConfig() {
        return JdiffEngineConfig.defaults(
                java.nio.file.Path.of("target/test-work"),
                java.nio.file.Path.of("target/missing-japicmp.jar"));
    }
}
