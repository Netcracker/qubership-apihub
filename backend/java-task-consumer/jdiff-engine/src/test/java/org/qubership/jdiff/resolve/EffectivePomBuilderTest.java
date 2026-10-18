package org.qubership.jdiff.resolve;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URISyntaxException;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.apache.maven.model.Dependency;
import org.apache.maven.model.DependencyManagement;
import org.apache.maven.model.Model;
import org.junit.jupiter.api.Test;
import org.qubership.jdiff.resolve.EffectivePomBuilder.BuildOutcome;

class EffectivePomBuilderTest {

    @Test
    void appEffectiveModelResolvesBomVersionAndInterpolatesParentProperty() throws URISyntaxException {
        Path fixturesDir = resolveFixturesDir();
        EffectivePomBuilder builder = new EffectivePomBuilder(new FakeArtifactResolver(fixturesDir));

        Model effective = builder.build(fixturesDir.resolve("app-1.0.pom"));

        Map<String, Dependency> byArtifact = effective.getDependencies().stream()
                .collect(Collectors.toMap(Dependency::getArtifactId, d -> d));

        assertThat(byArtifact.get("lib-a").getVersion()).isEqualTo("2.5");
        assertThat(byArtifact.get("lib-c").getVersion()).isEqualTo("4.1");
    }

    @Test
    void buildFullExposesImportScopedBomDeclaredInAncestorRawModel() throws URISyntaxException {
        Path fixturesDir = resolveLineageFixturesDir();
        EffectivePomBuilder builder = new EffectivePomBuilder(new FakeArtifactResolver(fixturesDir));

        BuildOutcome outcome = builder.buildFull(fixturesDir.resolve("lineage-child-1.0.pom"));

        // The child's own raw model declares no dependencyManagement, so the lineage must reach into
        // the parent to find the import-scoped BOM entry.
        boolean ancestorHasImportBom = outcome.rawLineage().stream().anyMatch(rawModel -> {
            DependencyManagement management = rawModel.getDependencyManagement();
            return management != null && management.getDependencies().stream()
                    .anyMatch(dep -> "import".equals(dep.getScope())
                            && "my-bom".equals(dep.getArtifactId())
                            && "${mybom.version}".equals(dep.getVersion()));
        });
        assertThat(ancestorHasImportBom).isTrue();

        // The effective model still resolves the managed dependency's version via the inherited BOM.
        Map<String, Dependency> byArtifact = outcome.effective().getDependencies().stream()
                .collect(Collectors.toMap(Dependency::getArtifactId, d -> d));
        assertThat(byArtifact.get("managed-lib").getVersion()).isEqualTo("1.0.0");
    }

    static Path resolveFixturesDir() throws URISyntaxException {
        return Path.of(EffectivePomBuilderTest.class.getResource("/resolve").toURI());
    }

    static Path resolveLineageFixturesDir() throws URISyntaxException {
        return Path.of(EffectivePomBuilderTest.class.getResource("/upgrade/lineage").toURI());
    }
}
