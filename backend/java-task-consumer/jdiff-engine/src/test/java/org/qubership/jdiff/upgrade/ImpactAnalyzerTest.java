package org.qubership.jdiff.upgrade;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.qubership.jdiff.jdeps.ClassUsage;
import org.qubership.jdiff.model.ApiChange;
import org.qubership.jdiff.model.UsageRef;

class ImpactAnalyzerTest {

    private static final String OLD_JAR = "api-1.0.0.jar";

    @Test
    void impactedChangeAggregatesUsageAcrossModulesIncludingInnerClasses() {
        ApiChange changed = new ApiChange("com.dep.Api", "METHOD", "void doStuff()", "REMOVED",
                List.of("METHOD_REMOVED"), null, false, false, true, "MAJOR", null);
        ApiChange unused = new ApiChange("com.dep.Unused", "METHOD", "void other()", "REMOVED",
                List.of("METHOD_REMOVED"), null, false, false, true, "MAJOR", null);

        Set<ClassUsage> m1Usages = Set.of(
                new ClassUsage("com.m1.Owner", "com.dep.Api", OLD_JAR),
                new ClassUsage("com.m1.Other", "com.dep.Unrelated", OLD_JAR),
                new ClassUsage("com.m1.WrongJar", "com.dep.Api", "other-1.0.0.jar"));
        Set<ClassUsage> m2Usages = Set.of(
                new ClassUsage("com.m2.OwnerA", "com.dep.Api$Inner", OLD_JAR),
                new ClassUsage("com.m2.OwnerB", "com.dep.Api", OLD_JAR));

        Map<String, Set<ClassUsage>> usageByModule = Map.of(
                "org.example:m1", m1Usages,
                "org.example:m2", m2Usages);

        List<ApiChange> impacted = ImpactAnalyzer.impacted(List.of(changed, unused), usageByModule, OLD_JAR);

        assertThat(impacted).hasSize(1);
        ApiChange result = impacted.get(0);
        assertThat(result.className()).isEqualTo("com.dep.Api");
        assertThat(result.usedBy()).containsExactlyInAnyOrder(
                new UsageRef("org.example:m1", List.of("com.m1.Owner")),
                new UsageRef("org.example:m2", List.of("com.m2.OwnerA", "com.m2.OwnerB")));
    }

    @Test
    void unusedChangeIsFilteredOut() {
        ApiChange unused = new ApiChange("com.dep.Unused", "METHOD", "void other()", "REMOVED",
                List.of("METHOD_REMOVED"), null, false, false, true, "MAJOR", null);
        Map<String, Set<ClassUsage>> usageByModule = Map.of("org.example:m1",
                Set.of(new ClassUsage("com.m1.Owner", "com.dep.Api", OLD_JAR)));

        List<ApiChange> impacted = ImpactAnalyzer.impacted(List.of(unused), usageByModule, OLD_JAR);

        assertThat(impacted).isEmpty();
    }

    @Test
    void providerJarMismatchIsFilteredOut() {
        ApiChange changed = new ApiChange("com.dep.Api", "METHOD", "void doStuff()", "REMOVED",
                List.of("METHOD_REMOVED"), null, false, false, true, "MAJOR", null);
        Map<String, Set<ClassUsage>> usageByModule = Map.of("org.example:m1",
                Set.of(new ClassUsage("com.m1.Owner", "com.dep.Api", "different-1.0.0.jar")));

        List<ApiChange> impacted = ImpactAnalyzer.impacted(List.of(changed), usageByModule, OLD_JAR);

        assertThat(impacted).isEmpty();
    }
}
