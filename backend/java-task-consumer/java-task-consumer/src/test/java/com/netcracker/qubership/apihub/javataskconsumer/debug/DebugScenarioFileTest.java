package com.netcracker.qubership.apihub.javataskconsumer.debug;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class DebugScenarioFileTest {

    @Test
    void classpathScenarioCoversEveryBuildType() throws Exception {
        DebugScenarioFile scenario = DebugScenarioRunner.loadClasspath("/debug/netcracker-scenarios.json");

        assertThat(scenario.packageId()).isEqualTo("debug-pkg");
        assertThat(scenario.tasks()).extracting(DebugTaskSpec::id)
                .containsExactly("report", "diff", "upgrade-impact", "upgrade-impact-docker");
        assertThat(scenario.tasks()).extracting(DebugTaskSpec::buildType)
                .containsExactly(
                        "java-api-report",
                        "java-api-diff",
                        "java-upgrade-impact",
                        "java-upgrade-impact");
        assertThat(scenario.tasks().get(0).metadata().get("gav").asText())
                .isEqualTo("org.qubership:qip-catalog-library:2025.1.1.15");
        assertThat(scenario.tasks().get(2).metadata().get("subject").get("type").asText())
                .isEqualTo("gav");
        assertThat(scenario.tasks().get(3).metadata().get("subject").get("type").asText())
                .isEqualTo("docker");
        assertThat(scenario.tasks().get(3).metadata().get("subject").get("imageReference").asText())
                .startsWith("ghcr.io/netcracker/qubership-integration-micro-engine:");
        assertThat(scenario.tasks().get(3).metadata().get("upgrades")).isNotEmpty();
    }
}
