package org.qubership.jdiff.resolve;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.URISyntaxException;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;

class RepositoryConfigTest {

    @Test
    void defaultsUseCentralAndHomeLocalRepository() {
        RepositoryConfig config = RepositoryConfig.defaults();

        assertThat(config.repositories()).hasSize(1);
        assertThat(config.repositories().get(0)).isEqualTo(new RemoteRepo("central", "https://repo1.maven.org/maven2/"));
        assertThat(config.localRepository()).isEqualTo(Path.of(System.getProperty("user.home"), ".m2", "repository"));
    }

    @Test
    void ofWithCustomUrlsAssignsSequentialRepoIds() {
        RepositoryConfig config = RepositoryConfig.of(
                List.of("https://repo.example.com/a", "https://repo.example.com/b"), null);

        assertThat(config.repositories()).containsExactly(
                new RemoteRepo("repo0", "https://repo.example.com/a"),
                new RemoteRepo("repo1", "https://repo.example.com/b"));
        assertThat(config.localRepository()).isEqualTo(Path.of(System.getProperty("user.home"), ".m2", "repository"));
    }

    @Test
    void ofParsesNamedRepoIds() {
        RepositoryConfig config = RepositoryConfig.of(
                List.of(
                        "central=https://repo1.maven.org/maven2/",
                        "github=https://maven.pkg.github.com/Netcracker/*"),
                null);

        assertThat(config.repositories()).containsExactly(
                new RemoteRepo("central", "https://repo1.maven.org/maven2/"),
                new RemoteRepo("github", "https://maven.pkg.github.com/Netcracker/*"));
    }

    @Test
    void ofAllowsMixingNamedAndBareRepoTokens() {
        RepositoryConfig config = RepositoryConfig.of(
                List.of("central=https://repo1.maven.org/maven2/", "https://repo.example.com/extra"), null);

        assertThat(config.repositories()).containsExactly(
                new RemoteRepo("central", "https://repo1.maven.org/maven2/"),
                new RemoteRepo("repo1", "https://repo.example.com/extra"));
    }

    @Test
    void ofRejectsDuplicateRepoIds() {
        assertThatThrownBy(() -> RepositoryConfig.of(
                        List.of("github=https://a.example/", "github=https://b.example/"), null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("github");
    }

    @Test
    void ofRejectsBlankNamedRepoIdOrUrl() {
        assertThatThrownBy(() -> RepositoryConfig.of(List.of("=https://a.example/"), null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> RepositoryConfig.of(List.of("github="), null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void ofWithEmptyUrlsFallsBackToCentral() {
        RepositoryConfig config = RepositoryConfig.of(List.of(), null);

        assertThat(config.repositories()).containsExactly(new RemoteRepo("central", "https://repo1.maven.org/maven2/"));
    }

    @Test
    void ofReadsLocalRepositoryFromSettingsXml() throws URISyntaxException {
        Path settingsXml = Path.of(getClass().getResource("/resolve/settings-with-local-repo.xml").toURI());

        RepositoryConfig config = RepositoryConfig.of(List.of(), settingsXml);

        assertThat(config.localRepository()).isEqualTo(Path.of("C:/custom/m2/repo"));
        assertThat(config.serverCredentials()).isEmpty();
    }

    @Test
    void ofReadsServerCredentialsFromSettingsXml() throws URISyntaxException {
        Path settingsXml = Path.of(getClass().getResource("/resolve/settings-with-server.xml").toURI());

        RepositoryConfig config = RepositoryConfig.of(
                List.of("https://maven.pkg.github.com/Netcracker/*"), settingsXml);

        assertThat(config.serverCredentials()).containsEntry(
                "repo0", new ServerCredentials("x-access-token", "secret-token"));
    }

    @Test
    void ofMatchesNamedRepoIdToServerCredentials() throws URISyntaxException {
        Path settingsXml = Path.of(getClass().getResource("/resolve/settings-with-github-server.xml").toURI());

        RepositoryConfig config = RepositoryConfig.of(
                List.of("github=https://maven.pkg.github.com/Netcracker/*"), settingsXml);

        assertThat(config.repositories().get(0).id()).isEqualTo("github");
        assertThat(config.serverCredentials()).containsEntry(
                "github", new ServerCredentials("x-access-token", "secret-token"));
    }
}
