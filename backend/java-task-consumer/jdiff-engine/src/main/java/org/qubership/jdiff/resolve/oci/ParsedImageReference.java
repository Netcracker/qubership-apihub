package org.qubership.jdiff.resolve.oci;

/**
 * Parsed OCI image reference ({@code registry/repository:tag} or digest).
 */
public record ParsedImageReference(String registryHost, String repository, String reference) {

    public String registryBaseUrl() {
        if (registryHost.startsWith("http://") || registryHost.startsWith("https://")) {
            return registryHost.endsWith("/") ? registryHost.substring(0, registryHost.length() - 1) : registryHost;
        }
        String host = registryHost;
        if (host.startsWith("localhost") || host.matches("^[^:]+:\\d+$")) {
            return "http://" + host;
        }
        return "https://" + host;
    }

  /**
   * Parses common image reference forms used by APIHUB.
   *
   * <ul>
   *   <li>{@code ghcr.io/org/app:1.0}
   *   <li>{@code ubuntu:latest} (Docker Hub)
   *   <li>{@code org/app@sha256:...}
   * </ul>
   */
    public static ParsedImageReference parse(String imageReference) {
        if (imageReference == null || imageReference.isBlank()) {
            throw new IllegalArgumentException("imageReference must not be blank");
        }
        String trimmed = imageReference.trim();
        String name = trimmed;
        String reference = "latest";
        int at = trimmed.indexOf('@');
        if (at >= 0) {
            name = trimmed.substring(0, at);
            reference = trimmed.substring(at + 1);
        } else {
            int colon = trimmed.lastIndexOf(':');
            if (colon > trimmed.lastIndexOf('/')) {
                name = trimmed.substring(0, colon);
                reference = trimmed.substring(colon + 1);
            }
        }
        if (name.isBlank() || reference.isBlank()) {
            throw new IllegalArgumentException("Invalid image reference: " + imageReference);
        }

        String registryHost = "registry-1.docker.io";
        String repository = name;
        int slash = name.indexOf('/');
        if (slash >= 0) {
            String first = name.substring(0, slash);
            if (isRegistryHost(first)) {
                registryHost = first;
                repository = name.substring(slash + 1);
            }
        } else {
            repository = "library/" + name;
        }
        return new ParsedImageReference(registryHost, repository, reference);
    }

    private static boolean isRegistryHost(String candidate) {
        return candidate.contains(".")
                || candidate.contains(":")
                || "localhost".equals(candidate);
    }
}
