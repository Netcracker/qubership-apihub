package org.qubership.jdiff.upgrade;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class UpgradeSpecTest {

    @Test
    void parsesAValidUpgradeSpec() {
        UpgradeSpec spec = UpgradeSpec.parse("org.example:lib-a=2.6");

        assertThat(spec.groupId()).isEqualTo("org.example");
        assertThat(spec.artifactId()).isEqualTo("lib-a");
        assertThat(spec.newVersion()).isEqualTo("2.6");
        assertThat(spec.ga()).isEqualTo("org.example:lib-a");
    }

    @Test
    void rejectsSpecWithoutEqualsSign() {
        assertThatThrownBy(() -> UpgradeSpec.parse("org.example:lib-a"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsSpecWithMissingArtifactId() {
        assertThatThrownBy(() -> UpgradeSpec.parse("org.example=2.6"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsSpecWithBlankVersion() {
        assertThatThrownBy(() -> UpgradeSpec.parse("org.example:lib-a="))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsBlankSpec() {
        assertThatThrownBy(() -> UpgradeSpec.parse("   "))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
