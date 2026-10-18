package org.qubership.jdiff.resolve.oci;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.qubership.jdiff.resolve.JarResolutionException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Minimal Docker Registry HTTP API V2 client (daemonless image pull).
 */
final class OciRegistryClient {

    private static final Logger LOG = LoggerFactory.getLogger(OciRegistryClient.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Duration TIMEOUT = Duration.ofMinutes(10);
    private static final Pattern BEARER_CHALLENGE =
            Pattern.compile("Bearer\\s+([^,]+(?:,\\s*[^,]+)*)", Pattern.CASE_INSENSITIVE);

    private final HttpClient httpClient;
    private final ParsedImageReference image;

    OciRegistryClient(ParsedImageReference image) {
        this(image, HttpClient.newBuilder().connectTimeout(TIMEOUT).followRedirects(HttpClient.Redirect.NORMAL).build());
    }

    OciRegistryClient(ParsedImageReference image, HttpClient httpClient) {
        this.image = image;
        this.httpClient = httpClient;
    }

    JsonNode pullManifest() throws JarResolutionException {
        String manifestUrl = manifestUrl();
        HttpResponse<String> response = send(manifestUrl, manifestRequest(manifestUrl, null));
        if (response.statusCode() == 401) {
            String token = bearerToken(response.headers().firstValue("www-authenticate").orElse(null));
            response = send(manifestUrl, manifestRequest(manifestUrl, token));
        }
        if (response.statusCode() / 100 != 2) {
            throw new JarResolutionException(
                    "Registry manifest request failed (" + response.statusCode() + ") for " + manifestUrl
                            + ": " + response.body());
        }
        try {
            return MAPPER.readTree(response.body());
        } catch (IOException e) {
            throw new JarResolutionException("Failed to parse manifest for " + image, e);
        }
    }

    byte[] pullBlob(String digest) throws JarResolutionException {
        String blobUrl = blobUrl(digest);
        HttpResponse<byte[]> response = sendBytes(blobUrl, blobRequest(blobUrl, null));
        if (response.statusCode() == 401) {
            String token = bearerToken(response.headers().firstValue("www-authenticate").orElse(null));
            response = sendBytes(blobUrl, blobRequest(blobUrl, token));
        }
        if (response.statusCode() / 100 != 2) {
            throw new JarResolutionException(
                    "Registry blob request failed (" + response.statusCode() + ") for " + blobUrl);
        }
        return response.body();
    }

    private HttpRequest manifestRequest(String url, String bearerToken) {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url))
                .timeout(TIMEOUT)
                .GET()
                .header("Accept", String.join(",",
                        "application/vnd.oci.image.manifest.v1+json",
                        "application/vnd.oci.image.index.v1+json",
                        "application/vnd.docker.distribution.manifest.v2+json",
                        "application/vnd.docker.distribution.manifest.list.v2+json"));
        applyAuth(builder, bearerToken);
        return builder.build();
    }

    private HttpRequest blobRequest(String url, String bearerToken) {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url)).timeout(TIMEOUT).GET();
        applyAuth(builder, bearerToken);
        return builder.build();
    }

    private void applyAuth(HttpRequest.Builder builder, String bearerToken) {
        if (bearerToken != null && !bearerToken.isBlank()) {
            builder.header("Authorization", "Bearer " + bearerToken);
            return;
        }
        DockerConfigCredentials.forRegistry(image.registryHost()).ifPresent(auth -> {
            String encoded = Base64.getEncoder()
                    .encodeToString((auth.username() + ":" + auth.password()).getBytes(StandardCharsets.UTF_8));
            builder.header("Authorization", "Basic " + encoded);
        });
    }

    private String bearerToken(String wwwAuthenticate) throws JarResolutionException {
        if (wwwAuthenticate == null || wwwAuthenticate.isBlank()) {
            throw new JarResolutionException("Registry requires authentication but did not send WWW-Authenticate");
        }
        Matcher matcher = BEARER_CHALLENGE.matcher(wwwAuthenticate);
        if (!matcher.find()) {
            throw new JarResolutionException("Unsupported WWW-Authenticate challenge: " + wwwAuthenticate);
        }
        String params = matcher.group(1);
        String realm = challengeParam(params, "realm");
        String service = challengeParam(params, "service");
        String scope = challengeParam(params, "scope");
        if (scope == null || scope.isBlank()) {
            scope = "repository:" + image.repository() + ":pull";
        }
        String tokenUrl = realm
                + "?service=" + encode(service)
                + "&scope=" + encode(scope);
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(tokenUrl)).timeout(TIMEOUT).GET();
        applyAuth(builder, null);
        HttpResponse<String> response = send(tokenUrl, builder.build());
        if (response.statusCode() / 100 != 2) {
            throw new JarResolutionException(
                    "Registry token request failed (" + response.statusCode() + "): " + response.body());
        }
        try {
            JsonNode token = MAPPER.readTree(response.body());
            JsonNode tokenValue = token.get("token");
            if (tokenValue == null || tokenValue.isNull()) {
                tokenValue = token.get("access_token");
            }
            if (tokenValue == null || tokenValue.isNull() || tokenValue.asText().isBlank()) {
                throw new JarResolutionException("Registry token response did not contain token");
            }
            return tokenValue.asText();
        } catch (IOException e) {
            throw new JarResolutionException("Failed to parse registry token response", e);
        }
    }

    private static String challengeParam(String params, String name) {
        Pattern pattern = Pattern.compile(name + "=\"([^\"]*)\"");
        Matcher matcher = pattern.matcher(params);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }

    private static String encode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private String manifestUrl() {
        return image.registryBaseUrl() + "/v2/" + image.repository() + "/manifests/" + image.reference();
    }

    private String blobUrl(String digest) {
        return image.registryBaseUrl() + "/v2/" + image.repository() + "/blobs/" + digest;
    }

    private HttpResponse<String> send(String url, HttpRequest request) throws JarResolutionException {
        try {
            LOG.debug("Registry GET {}", url);
            return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new JarResolutionException("Registry request failed for " + url, e);
        }
    }

    private HttpResponse<byte[]> sendBytes(String url, HttpRequest request) throws JarResolutionException {
        try {
            LOG.debug("Registry GET {}", url);
            return httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new JarResolutionException("Registry request failed for " + url, e);
        }
    }

    static List<String> layerDigests(JsonNode manifest) throws JarResolutionException {
        if (manifest.has("manifests")) {
            throw new JarResolutionException("Manifest list must be resolved before reading layers");
        }
        JsonNode layers = manifest.get("layers");
        if (layers == null || !layers.isArray()) {
            throw new JarResolutionException("Manifest does not contain layers");
        }
        List<String> digests = new ArrayList<>();
        for (JsonNode layer : layers) {
            JsonNode digest = layer.get("digest");
            if (digest == null || digest.isNull() || digest.asText().isBlank()) {
                throw new JarResolutionException("Manifest layer is missing digest");
            }
            digests.add(digest.asText());
        }
        return digests;
    }

    static Optional<JsonNode> selectManifestListEntry(JsonNode manifestList) {
        JsonNode manifests = manifestList.get("manifests");
        if (manifests == null || !manifests.isArray() || manifests.isEmpty()) {
            return Optional.empty();
        }
        for (JsonNode entry : manifests) {
            JsonNode platform = entry.get("platform");
            if (platform == null) {
                continue;
            }
            String os = textOrEmpty(platform, "os");
            String arch = textOrEmpty(platform, "architecture");
            if ("linux".equalsIgnoreCase(os) && ("amd64".equalsIgnoreCase(arch) || "arm64".equalsIgnoreCase(arch))) {
                return Optional.of(entry);
            }
        }
        return Optional.of(manifests.get(0));
    }

    static String digestReference(JsonNode manifestEntry) throws JarResolutionException {
        JsonNode digest = manifestEntry.get("digest");
        if (digest == null || digest.isNull() || digest.asText().isBlank()) {
            throw new JarResolutionException("Manifest list entry is missing digest");
        }
        return digest.asText();
    }

    ParsedImageReference imageWithDigestReference(String digest) {
        return new ParsedImageReference(image.registryHost(), image.repository(), digest);
    }

    private static String textOrEmpty(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? "" : value.asText();
    }
}
