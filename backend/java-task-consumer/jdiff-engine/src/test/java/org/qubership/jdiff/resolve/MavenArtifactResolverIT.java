package org.qubership.jdiff.resolve;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.qubership.jdiff.model.Gav;

/**
 * Needs network access to Maven Central; run with {@code -Djdiff.it=true}.
 */
@EnabledIfSystemProperty(named = "jdiff.it", matches = "true")
class MavenArtifactResolverIT {

    @Test
    void resolvesJarAndPomFromCentral() {
        MavenArtifactResolver resolver = new MavenArtifactResolver(RepositoryConfig.defaults());
        Gav gav = new Gav("org.apache.commons", "commons-csv", "1.12.0", null);

        Path jar = resolver.resolveJar(gav);
        Path pom = resolver.resolvePom(gav);

        assertThat(jar).isRegularFile();
        assertThat(jar.getFileName().toString()).isEqualTo("commons-csv-1.12.0.jar");
        assertThat(pom).isRegularFile();
        assertThat(pom.getFileName().toString()).isEqualTo("commons-csv-1.12.0.pom");
    }
}
