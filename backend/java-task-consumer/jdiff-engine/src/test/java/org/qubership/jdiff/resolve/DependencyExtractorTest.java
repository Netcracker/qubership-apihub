package org.qubership.jdiff.resolve;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URISyntaxException;
import java.nio.file.Path;
import java.util.List;
import org.apache.maven.model.Model;
import org.junit.jupiter.api.Test;

class DependencyExtractorTest {

    @Test
    void directDependenciesResolvesVersionsAndExcludesTestScope() throws URISyntaxException {
        Path fixturesDir = EffectivePomBuilderTest.resolveFixturesDir();
        EffectivePomBuilder pomBuilder = new EffectivePomBuilder(new FakeArtifactResolver(fixturesDir));
        DependencyExtractor extractor = new DependencyExtractor(pomBuilder);

        Model effective = pomBuilder.build(fixturesDir.resolve("app-1.0.pom"));
        List<ResolvedDependency> deps = extractor.directDependencies(effective);

        assertThat(deps).extracting(d -> d.gav().artifactId())
                .containsExactlyInAnyOrder("lib-a", "lib-c");

        ResolvedDependency libA = deps.stream().filter(d -> d.gav().artifactId().equals("lib-a")).findFirst().orElseThrow();
        assertThat(libA.gav().version()).isEqualTo("2.5");
        assertThat(libA.scope()).isEqualTo("compile");
        assertThat(libA.optional()).isFalse();

        ResolvedDependency libC = deps.stream().filter(d -> d.gav().artifactId().equals("lib-c")).findFirst().orElseThrow();
        assertThat(libC.gav().version()).isEqualTo("4.1");
    }
}
