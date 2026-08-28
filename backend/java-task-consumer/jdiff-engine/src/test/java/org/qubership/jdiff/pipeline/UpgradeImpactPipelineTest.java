package org.qubership.jdiff.pipeline;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.qubership.jdiff.japicmp.JapicmpResult;
import org.qubership.jdiff.jdeps.ClassUsage;
import org.qubership.jdiff.model.ApiChange;
import org.qubership.jdiff.model.ArtifactReport;
import org.qubership.jdiff.model.DiffReport;
import org.qubership.jdiff.model.Gav;
import org.qubership.jdiff.model.ReportMode;
import org.qubership.jdiff.model.UsageRef;
import org.qubership.jdiff.resolve.EffectivePomBuilder;
import org.qubership.jdiff.resolve.MavenModule;
import org.qubership.jdiff.resolve.ResolvedDependency;
import org.qubership.jdiff.upgrade.UnmatchedUpgrade;
import org.qubership.jdiff.upgrade.UpgradeSpec;

class UpgradeImpactPipelineTest {

    private static final Gav MODULE_GAV = new Gav("com.example", "app", "1.0.0", null);
    private static final Gav OLD_DEP_GAV = new Gav("com.dep", "api", "1.0.0", null);
    private static final Gav NEW_DEP_GAV = new Gav("com.dep", "api", "2.0.0", null);

    @Test
    void wiresDirectUpgradeEndToEndAndKeepsOnlyImpactedChanges(@TempDir Path tempDir) throws IOException {
        Path moduleJar = Files.createFile(tempDir.resolve("app-1.0.0.jar"));
        Path pomFile = Files.createFile(tempDir.resolve("pom.xml"));
        Path oldDepJar = Files.createFile(tempDir.resolve("api-1.0.0.jar"));
        Path newDepJar = Files.createFile(tempDir.resolve("api-2.0.0.jar"));

        MavenModule module = new MavenModule(MODULE_GAV, pomFile, "jar", null);
        ResolvedDependency treeDep = new ResolvedDependency(OLD_DEP_GAV, "compile", false, 0);

        FakeArtifactResolver resolver = new FakeArtifactResolver()
                .withJar(MODULE_GAV, moduleJar)
                .withJar(OLD_DEP_GAV, oldDepJar)
                .withJar(NEW_DEP_GAV, newDepJar)
                .withDependencyTree(List.of(treeDep));
        EffectivePomBuilder pomBuilder = new FakeEffectivePomBuilder(resolver);
        FakeProjectScanner scanner = new FakeProjectScanner(pomBuilder, List.of(module));

        List<ApiChange> changes = List.of(
                new ApiChange("com.dep.Api", "METHOD", "void doStuff()", "REMOVED",
                        List.of("METHOD_REMOVED"), null, false, false, true, "MAJOR", null),
                new ApiChange("com.dep.Unrelated", "METHOD", "void doOther()", "REMOVED",
                        List.of("METHOD_REMOVED"), null, false, false, true, "MAJOR", null));
        FakeJarComparator comparator = new FakeJarComparator(new JapicmpResult("1.0.0", "2.0.0", "MAJOR", changes));

        Set<ClassUsage> usages = Set.of(
                new ClassUsage("com.example.Main", "com.dep.Api", "api-1.0.0.jar"),
                new ClassUsage("com.example.Main", "com.dep.OtherUnrelated", "api-1.0.0.jar"));
        FakeJdepsRunner jdeps = new FakeJdepsRunner(usages);

        UpgradeImpactPipeline pipeline = new UpgradeImpactPipeline(resolver, pomBuilder, scanner, jdeps,
                comparator, 2);
        UpgradeRequest request = new UpgradeRequest(tempDir, null, List.of(UpgradeSpec.parse("com.dep:api=2.0.0")));

        DiffReport report = pipeline.run(request);

        assertThat(report.mode()).isEqualTo(ReportMode.UPGRADE_IMPACT);
        assertThat(report.input()).containsEntry("project", tempDir.toString());
        assertThat(report.input()).containsEntry("requestedUpgrades", List.of("com.dep:api=2.0.0"));
        assertThat(report.input()).containsEntry("unmatchedUpgrades", List.of());
        assertThat(report.input()).containsEntry("modulesAnalyzed", List.of("com.example:app:1.0.0"));
        assertThat(report.input()).containsEntry("totalChanges", 2);
        assertThat(report.input()).containsEntry("impactedChanges", 1);

        assertThat(report.artifacts()).hasSize(1);
        ArtifactReport artifact = report.artifacts().get(0);
        assertThat(artifact.groupId()).isEqualTo("com.dep");
        assertThat(artifact.artifactId()).isEqualTo("api");
        assertThat(artifact.oldVersion()).isEqualTo("1.0.0");
        assertThat(artifact.newVersion()).isEqualTo("2.0.0");
        assertThat(artifact.semverVerdict()).isEqualTo("MAJOR");
        assertThat(artifact.dependencyOrigin()).isEqualTo("direct");
        assertThat(artifact.changes()).hasSize(1);
        ApiChange impactedChange = artifact.changes().get(0);
        assertThat(impactedChange.className()).isEqualTo("com.dep.Api");
        assertThat(impactedChange.usedBy()).containsExactly(
                new UsageRef("com.example:app", List.of("com.example.Main")));
    }

    @Test
    void matchesTransitiveUpgradeFromResolvedTree(@TempDir Path tempDir) throws IOException {
        Path moduleJar = Files.createFile(tempDir.resolve("app-1.0.0.jar"));
        Path pomFile = Files.createFile(tempDir.resolve("pom.xml"));
        Path oldDepJar = Files.createFile(tempDir.resolve("api-1.0.0.jar"));
        Path newDepJar = Files.createFile(tempDir.resolve("api-2.0.0.jar"));

        MavenModule module = new MavenModule(MODULE_GAV, pomFile, "jar", null);
        ResolvedDependency transitiveDep = new ResolvedDependency(OLD_DEP_GAV, "compile", false, 2);

        FakeArtifactResolver resolver = new FakeArtifactResolver()
                .withJar(MODULE_GAV, moduleJar)
                .withJar(OLD_DEP_GAV, oldDepJar)
                .withJar(NEW_DEP_GAV, newDepJar)
                .withDependencyTree(List.of(transitiveDep));
        EffectivePomBuilder pomBuilder = new FakeEffectivePomBuilder(resolver);
        FakeProjectScanner scanner = new FakeProjectScanner(pomBuilder, List.of(module));

        List<ApiChange> changes = List.of(new ApiChange("com.dep.Api", "METHOD", "void doStuff()", "REMOVED",
                List.of("METHOD_REMOVED"), null, false, false, true, "MAJOR", null));
        FakeJarComparator comparator = new FakeJarComparator(new JapicmpResult("1.0.0", "2.0.0", "MAJOR", changes));
        FakeJdepsRunner jdeps = new FakeJdepsRunner(Set.of(
                new ClassUsage("com.example.Main", "com.dep.Api", "api-1.0.0.jar")));

        UpgradeImpactPipeline pipeline = new UpgradeImpactPipeline(resolver, pomBuilder, scanner, jdeps,
                comparator, 2);
        DiffReport report = pipeline.run(new UpgradeRequest(tempDir, null,
                List.of(UpgradeSpec.parse("com.dep:api=2.0.0"))));

        assertThat(report.input()).containsEntry("unmatchedUpgrades", List.of());
        assertThat(report.artifacts()).hasSize(1);
        assertThat(report.artifacts().get(0).dependencyOrigin()).isEqualTo("transitive");
        assertThat(report.input()).containsEntry("impactedChanges", 1);
        assertThat(jdeps.lastClasspath()).containsExactly(oldDepJar);
    }

    @Test
    void reportsUnmatchedUpgradeWithReasonAndUsageWarning(@TempDir Path tempDir) throws IOException {
        Path moduleJar = Files.createFile(tempDir.resolve("app-1.0.0.jar"));
        Path pomFile = Files.createFile(tempDir.resolve("pom.xml"));

        MavenModule module = new MavenModule(MODULE_GAV, pomFile, "jar", null);
        FakeArtifactResolver resolver = new FakeArtifactResolver()
                .withJar(MODULE_GAV, moduleJar)
                .withDependencyTree(List.of());
        EffectivePomBuilder pomBuilder = new FakeEffectivePomBuilder(resolver);
        FakeProjectScanner scanner = new FakeProjectScanner(pomBuilder, List.of(module));
        FakeJarComparator comparator = new FakeJarComparator(new JapicmpResult("1.0.0", "2.0.0", "NONE", List.of()));
        FakeJdepsRunner jdeps = new FakeJdepsRunner(Set.of(
                new ClassUsage("com.example.Main", "com.dep.Api", "api-1.0.0.jar")));

        UpgradeImpactPipeline pipeline = new UpgradeImpactPipeline(resolver, pomBuilder, scanner, jdeps,
                comparator, 2);
        DiffReport report = pipeline.run(new UpgradeRequest(tempDir, null,
                List.of(UpgradeSpec.parse("com.dep:api=2.0.0"))));

        assertThat(report.artifacts()).isEmpty();
        assertThat(report.input().get("unmatchedUpgrades")).isEqualTo(List.of(
                new UnmatchedUpgrade("com.dep:api=2.0.0", UnmatchedUpgrade.NOT_IN_RESOLVED_TREE)));
        @SuppressWarnings("unchecked")
        List<String> warnings = (List<String>) report.input().get("warnings");
        assertThat(warnings).anyMatch(w -> w.contains("API used from artifact 'api'")
                && w.contains(UnmatchedUpgrade.NOT_IN_RESOLVED_TREE));
    }

    @Test
    void fallsBackToTargetJarWhenModuleJarCannotBeResolved(@TempDir Path tempDir) throws IOException {
        Path fallbackJar = Files.createFile(tempDir.resolve("app-1.0.0.jar"));
        Path pomFile = Files.createFile(tempDir.resolve("pom.xml"));
        Path oldDepJar = Files.createFile(tempDir.resolve("api-1.0.0.jar"));
        Path newDepJar = Files.createFile(tempDir.resolve("api-2.0.0.jar"));

        MavenModule module = new MavenModule(MODULE_GAV, pomFile, "jar", fallbackJar);
        ResolvedDependency treeDep = new ResolvedDependency(OLD_DEP_GAV, "compile", false, 0);

        FakeArtifactResolver resolver = new FakeArtifactResolver()
                // module gav intentionally NOT registered, so resolveJar throws for it
                .withJar(OLD_DEP_GAV, oldDepJar)
                .withJar(NEW_DEP_GAV, newDepJar)
                .withDependencyTree(List.of(treeDep));
        EffectivePomBuilder pomBuilder = new FakeEffectivePomBuilder(resolver);
        FakeProjectScanner scanner = new FakeProjectScanner(pomBuilder, List.of(module));

        List<ApiChange> changes = List.of(new ApiChange("com.dep.Api", "METHOD", "void doStuff()", "REMOVED",
                List.of("METHOD_REMOVED"), null, false, false, true, "MAJOR", null));
        FakeJarComparator comparator = new FakeJarComparator(new JapicmpResult("1.0.0", "2.0.0", "MAJOR", changes));
        FakeJdepsRunner jdeps = new FakeJdepsRunner(Set.of());

        UpgradeImpactPipeline pipeline = new UpgradeImpactPipeline(resolver, pomBuilder, scanner, jdeps,
                comparator, 2);
        UpgradeRequest request = new UpgradeRequest(tempDir, null, List.of(UpgradeSpec.parse("com.dep:api=2.0.0")));

        DiffReport report = pipeline.run(request);

        assertThat(report.input()).containsEntry("modulesAnalyzed", List.of("com.example:app:1.0.0"));
        assertThat(jdeps.lastTargetJar()).isEqualTo(fallbackJar);
    }

    @Test
    void bomUpgradeDeclaredInParentPomFlowsThroughFullPipelineWithRealEffectivePomBuilder(@TempDir Path tempDir)
            throws IOException, URISyntaxException {
        Path fixturesDir = Path.of(getClass().getResource("/upgrade/lineage").toURI());
        Gav childGav = new Gav("org.example", "lineage-child", "1.0", null);
        Gav oldManagedGav = new Gav("org.example", "managed-lib", "1.0.0", null);
        Gav newManagedGav = new Gav("org.example", "managed-lib", "2.0.0", null);

        Path moduleJar = Files.createFile(tempDir.resolve("lineage-child-1.0.jar"));
        Path oldDepJar = Files.createFile(tempDir.resolve("managed-lib-1.0.0.jar"));
        Path newDepJar = Files.createFile(tempDir.resolve("managed-lib-2.0.0.jar"));

        ResolvedDependency treeDep = new ResolvedDependency(oldManagedGav, "compile", false, 0);
        FakeArtifactResolver resolver = new FakeArtifactResolver(fixturesDir)
                .withJar(childGav, moduleJar)
                .withJar(oldManagedGav, oldDepJar)
                .withJar(newManagedGav, newDepJar)
                .withDependencyTree(List.of(treeDep));

        EffectivePomBuilder pomBuilder = new EffectivePomBuilder(resolver);

        MavenModule module = new MavenModule(childGav, fixturesDir.resolve("lineage-child-1.0.pom"), "jar", null);
        FakeProjectScanner scanner = new FakeProjectScanner(pomBuilder, List.of(module));

        List<ApiChange> changes = List.of(new ApiChange("org.example.ManagedLib", "METHOD", "void doStuff()",
                "REMOVED", List.of("METHOD_REMOVED"), null, false, false, true, "MAJOR", null));
        FakeJarComparator comparator = new FakeJarComparator(new JapicmpResult("1.0.0", "2.0.0", "MAJOR", changes));

        Set<ClassUsage> usages = Set.of(
                new ClassUsage("org.example.LineageChildMain", "org.example.ManagedLib", "managed-lib-1.0.0.jar"));
        FakeJdepsRunner jdeps = new FakeJdepsRunner(usages);

        UpgradeImpactPipeline pipeline = new UpgradeImpactPipeline(resolver, pomBuilder, scanner, jdeps,
                comparator, 2);
        UpgradeRequest request = new UpgradeRequest(tempDir, null, List.of(UpgradeSpec.parse("org.example:my-bom=2.0")));

        DiffReport report = pipeline.run(request);

        assertThat(report.input()).containsEntry("unmatchedUpgrades", List.of());
        assertThat(report.artifacts()).hasSize(1);
        ArtifactReport artifact = report.artifacts().get(0);
        assertThat(artifact.groupId()).isEqualTo("org.example");
        assertThat(artifact.artifactId()).isEqualTo("managed-lib");
        assertThat(artifact.oldVersion()).isEqualTo("1.0.0");
        assertThat(artifact.newVersion()).isEqualTo("2.0.0");
        assertThat(artifact.changes()).hasSize(1);
        ApiChange impactedChange = artifact.changes().get(0);
        assertThat(impactedChange.className()).isEqualTo("org.example.ManagedLib");
        assertThat(impactedChange.usedBy()).containsExactly(
                new UsageRef("org.example:lineage-child", List.of("org.example.LineageChildMain")));
    }
}
