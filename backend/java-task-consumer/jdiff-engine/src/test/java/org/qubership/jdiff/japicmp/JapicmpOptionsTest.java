package org.qubership.jdiff.japicmp;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class JapicmpOptionsTest {

    @Test
    void diffDefaultsRestrictsToModifiedAndIgnoresMissingClasses() {
        JapicmpOptions options = JapicmpOptions.diffDefaults();

        assertThat(options.onlyModified()).isTrue();
        assertThat(options.ignoreMissingClasses()).isTrue();
    }

    @Test
    void fullApiDefaultsReportsFullInventoryAndIgnoresMissingClasses() {
        JapicmpOptions options = JapicmpOptions.fullApiDefaults();

        assertThat(options.onlyModified()).isFalse();
        assertThat(options.ignoreMissingClasses()).isTrue();
    }
}
