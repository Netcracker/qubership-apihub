package org.qubership.jdiff.upgrade;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.qubership.jdiff.model.Gav;
import org.qubership.jdiff.resolve.ResolvedDependency;

class UpgradeMatcherTest {

    @Test
    void directMatchTakesOldVersionFromTheDependency() {
        ResolvedDependency dep = new ResolvedDependency(new Gav("org.example", "lib-a", "2.5", null), "compile", false, 0);
        UpgradeSpec spec = UpgradeSpec.parse("org.example:lib-a=2.6");

        UpgradeMatcher.MatchResult result = new UpgradeMatcher().match(List.of(spec), List.of(dep));

        assertThat(result.matched()).containsExactly(new UpgradeItem("org.example", "lib-a", "2.5", "2.6", true));
        assertThat(result.unmatchedSpecs()).isEmpty();
    }

    @Test
    void transitiveMatchTakesOldVersionFromTheResolvedTree() {
        ResolvedDependency transitive =
                new ResolvedDependency(new Gav("org.example", "lib-a", "2.5", null), "compile", false, 2);
        UpgradeSpec spec = UpgradeSpec.parse("org.example:lib-a=2.6");

        UpgradeMatcher.MatchResult result = new UpgradeMatcher().match(List.of(spec), List.of(transitive));

        assertThat(result.matched()).containsExactly(new UpgradeItem("org.example", "lib-a", "2.5", "2.6", false));
        assertThat(result.unmatchedSpecs()).isEmpty();
    }

    @Test
    void nonMatchingUpgradeIsReportedUnmatched() {
        ResolvedDependency dep = new ResolvedDependency(new Gav("org.example", "lib-a", "2.5", null), "compile", false, 0);
        UpgradeSpec spec = UpgradeSpec.parse("org.example:lib-z=9.0");

        UpgradeMatcher.MatchResult result = new UpgradeMatcher().match(List.of(spec), List.of(dep));

        assertThat(result.matched()).isEmpty();
        assertThat(result.unmatchedSpecs()).containsExactly(spec);
    }
}
