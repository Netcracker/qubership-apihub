package org.qubership.jdiff.model;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

class GavTest {

    @Test
    void parsesGroupArtifactVersion() {
        Gav gav = Gav.parse("org.example:foo:1.0.0");

        assertThat(gav.groupId()).isEqualTo("org.example");
        assertThat(gav.artifactId()).isEqualTo("foo");
        assertThat(gav.version()).isEqualTo("1.0.0");
        assertThat(gav.classifier()).isNull();
    }

    @Test
    void parsesGroupArtifactVersionWithClassifier() {
        Gav gav = Gav.parse("org.example:foo:1.0.0:sources");

        assertThat(gav.groupId()).isEqualTo("org.example");
        assertThat(gav.artifactId()).isEqualTo("foo");
        assertThat(gav.version()).isEqualTo("1.0.0");
        assertThat(gav.classifier()).isEqualTo("sources");
    }

    @Test
    void gaReturnsGroupAndArtifactId() {
        Gav gav = Gav.parse("org.example:foo:1.0.0");

        assertThat(gav.ga()).isEqualTo("org.example:foo");
    }

    @Test
    void toStringRoundTripsWithoutClassifier() {
        Gav gav = Gav.parse("org.example:foo:1.0.0");

        assertThat(gav.toString()).isEqualTo("org.example:foo:1.0.0");
    }

    @Test
    void toStringRoundTripsWithClassifier() {
        Gav gav = Gav.parse("org.example:foo:1.0.0:sources");

        assertThat(gav.toString()).isEqualTo("org.example:foo:1.0.0:sources");
    }

    @Test
    void rejectsTooFewSegments() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> Gav.parse("org.example:foo"))
                .withMessageContaining("org.example:foo");
    }

    @Test
    void rejectsTooManySegments() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> Gav.parse("org.example:foo:1.0:sources:extra"));
    }

    @Test
    void rejectsBlankSegments() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> Gav.parse("org.example::1.0"));
    }

    @Test
    void rejectsBlankInput() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> Gav.parse("   "));
    }

    @Test
    void rejectsNullInput() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> Gav.parse(null));
    }
}
