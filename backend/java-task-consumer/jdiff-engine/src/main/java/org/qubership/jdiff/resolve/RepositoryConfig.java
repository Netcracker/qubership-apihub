package org.qubership.jdiff.resolve;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Configuration of the remote repositories and local repository used to resolve artifacts.
 */
public record RepositoryConfig(
        List<RemoteRepo> repositories, Path localRepository, Map<String, ServerCredentials> serverCredentials) {

    private static final Logger LOG = LoggerFactory.getLogger(RepositoryConfig.class);

    private static final String CENTRAL_URL = "https://repo1.maven.org/maven2/";

    private static final Pattern LOCAL_REPOSITORY_PATTERN =
            Pattern.compile("<localRepository>\\s*(.*?)\\s*</localRepository>", Pattern.DOTALL);

    private static final Pattern SERVER_PATTERN = Pattern.compile(
            "<server>\\s*<id>\\s*(.*?)\\s*</id>\\s*<username>\\s*(.*?)\\s*</username>\\s*<password>\\s*(.*?)\\s*</password>\\s*</server>",
            Pattern.DOTALL);

    /**
     * @return default configuration: Maven Central only, local repository at {@code ~/.m2/repository}
     */
    public static RepositoryConfig defaults() {
        return new RepositoryConfig(
                List.of(new RemoteRepo("central", CENTRAL_URL)), defaultLocalRepository(), Map.of());
    }

    /**
     * Builds a configuration from explicit repository tokens and an optional settings.xml.
     *
     * <p>Each token is either a bare URL (assigned id {@code repo0}, {@code repo1}, … by list index) or
     * {@code id=url} so the id can match a {@code <server><id>} entry in settings.xml.
     *
     * @param repoTokens  repository tokens; empty or {@code null} falls back to Central
     * @param settingsXml optional path to a settings.xml to read {@code <localRepository>} and
     *                    {@code <servers>} from; may be {@code null}. Mirrors, profiles and proxies are
     *                    out of scope.
     * @return the resulting configuration
     */
    public static RepositoryConfig of(List<String> repoTokens, Path settingsXml) {
        List<RemoteRepo> repos;
        if (repoTokens == null || repoTokens.isEmpty()) {
            repos = List.of(new RemoteRepo("central", CENTRAL_URL));
        } else {
            List<RemoteRepo> mutable = new ArrayList<>();
            Set<String> seenIds = new HashSet<>();
            for (int i = 0; i < repoTokens.size(); i++) {
                RemoteRepo repo = parseRepoToken(repoTokens.get(i), i);
                if (!seenIds.add(repo.id())) {
                    throw new IllegalArgumentException("Duplicate repository id '" + repo.id() + "'");
                }
                mutable.add(repo);
            }
            repos = List.copyOf(mutable);
        }

        Path localRepository = defaultLocalRepository();
        Map<String, ServerCredentials> serverCredentials = Map.of();
        if (settingsXml != null) {
            LOG.warn("Only <localRepository> and <servers> are read from {}; mirrors, profiles and "
                    + "proxies are out of scope", settingsXml);
            if (Files.isRegularFile(settingsXml)) {
                try {
                    String content = Files.readString(settingsXml);
                    Path fromSettings = readLocalRepository(content);
                    if (fromSettings != null) {
                        localRepository = fromSettings;
                    }
                    serverCredentials = readServerCredentials(content);
                } catch (IOException e) {
                    LOG.warn("Failed to read {}: {}", settingsXml, e.getMessage());
                }
            } else {
                LOG.warn("settings.xml {} does not exist, keeping default local repository", settingsXml);
            }
        }
        return new RepositoryConfig(repos, localRepository, serverCredentials);
    }

    /**
     * Parses one {@code --repo} token: {@code id=url} or a bare URL (id {@code repo}{@code index}).
     */
    static RemoteRepo parseRepoToken(String token, int index) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Repository token must not be blank");
        }
        String trimmed = token.trim();
        int eq = trimmed.indexOf('=');
        if (eq < 0) {
            return new RemoteRepo("repo" + index, trimmed);
        }
        String id = trimmed.substring(0, eq).trim();
        String url = trimmed.substring(eq + 1).trim();
        if (id.isEmpty() || url.isEmpty()) {
            throw new IllegalArgumentException(
                    "Invalid repository token '" + token + "': expected 'id=url' with non-blank id and url");
        }
        return new RemoteRepo(id, url);
    }

    private static Path defaultLocalRepository() {
        return Path.of(System.getProperty("user.home"), ".m2", "repository");
    }

    private static Path readLocalRepository(String settingsContent) {
        Matcher matcher = LOCAL_REPOSITORY_PATTERN.matcher(settingsContent);
        if (matcher.find() && !matcher.group(1).isBlank()) {
            return Path.of(matcher.group(1).trim());
        }
        return null;
    }

    private static Map<String, ServerCredentials> readServerCredentials(String settingsContent) {
        Map<String, ServerCredentials> credentials = new LinkedHashMap<>();
        Matcher matcher = SERVER_PATTERN.matcher(settingsContent);
        while (matcher.find()) {
            String id = matcher.group(1).trim();
            String username = matcher.group(2).trim();
            String password = matcher.group(3).trim();
            if (!id.isEmpty()) {
                credentials.put(id, new ServerCredentials(username, password));
            }
        }
        return Map.copyOf(credentials);
    }
}
