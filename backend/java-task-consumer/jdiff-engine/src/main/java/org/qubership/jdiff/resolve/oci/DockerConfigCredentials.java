package org.qubership.jdiff.resolve.oci;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.Iterator;
import java.util.Map;
import java.util.Optional;

/**
 * Reads registry credentials from Docker config ({@code ~/.docker/config.json} or {@code DOCKER_CONFIG}).
 */
final class DockerConfigCredentials {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private DockerConfigCredentials() {
    }

    static Optional<BasicAuth> forRegistry(String registryHost) {
        Path configPath = dockerConfigPath();
        if (!Files.isRegularFile(configPath)) {
            return Optional.empty();
        }
        try {
            JsonNode root = MAPPER.readTree(configPath.toFile());
            JsonNode auths = root.get("auths");
            if (auths == null || !auths.isObject()) {
                return Optional.empty();
            }
            Optional<BasicAuth> direct = readAuth(auths.get(registryHost));
            if (direct.isPresent()) {
                return direct;
            }
            String https = "https://" + registryHost;
            direct = readAuth(auths.get(https));
            if (direct.isPresent()) {
                return direct;
            }
            Iterator<Map.Entry<String, JsonNode>> fields = auths.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> entry = fields.next();
                if (registryHost.equals(stripScheme(entry.getKey()))) {
                    return readAuth(entry.getValue());
                }
            }
            return Optional.empty();
        } catch (IOException e) {
            return Optional.empty();
        }
    }

    private static Path dockerConfigPath() {
        String dockerConfig = System.getenv("DOCKER_CONFIG");
        if (dockerConfig != null && !dockerConfig.isBlank()) {
            return Path.of(dockerConfig.trim(), "config.json");
        }
        String home = System.getProperty("user.home");
        if (home == null || home.isBlank()) {
            return Path.of("config.json");
        }
        return Path.of(home, ".docker", "config.json");
    }

    private static Optional<BasicAuth> readAuth(JsonNode authNode) {
        if (authNode == null || authNode.isNull()) {
            return Optional.empty();
        }
        JsonNode auth = authNode.get("auth");
        if (auth == null || auth.isNull() || auth.asText().isBlank()) {
            return Optional.empty();
        }
        String decoded = new String(Base64.getDecoder().decode(auth.asText()), StandardCharsets.UTF_8);
        int colon = decoded.indexOf(':');
        if (colon < 0) {
            return Optional.empty();
        }
        return Optional.of(new BasicAuth(decoded.substring(0, colon), decoded.substring(colon + 1)));
    }

    private static String stripScheme(String value) {
        if (value.startsWith("https://")) {
            return value.substring("https://".length());
        }
        if (value.startsWith("http://")) {
            return value.substring("http://".length());
        }
        return value;
    }

    record BasicAuth(String username, String password) {
    }
}
