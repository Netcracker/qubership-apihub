package org.qubership.jdiff.model;

/**
 * A Maven coordinate: {@code groupId:artifactId:version} with an optional classifier.
 */
public record Gav(String groupId, String artifactId, String version, String classifier) {

    /**
     * Parses a {@code g:a:v} or {@code g:a:v:classifier} coordinate string.
     *
     * @param s the coordinate string
     * @return the parsed {@link Gav}
     * @throws IllegalArgumentException if {@code s} does not have 3 or 4 non-blank segments
     */
    public static Gav parse(String s) {
        if (s == null || s.isBlank()) {
            throw new IllegalArgumentException("GAV string must not be blank: " + s);
        }
        String[] parts = s.split(":", -1);
        if (parts.length < 3 || parts.length > 4) {
            throw new IllegalArgumentException(
                    "Invalid GAV '" + s + "': expected 'groupId:artifactId:version' "
                            + "or 'groupId:artifactId:version:classifier', got " + parts.length + " segment(s)");
        }
        for (int i = 0; i < parts.length; i++) {
            if (parts[i].isBlank()) {
                throw new IllegalArgumentException(
                        "Invalid GAV '" + s + "': segment " + (i + 1) + " must not be blank");
            }
        }
        String classifier = parts.length == 4 ? parts[3] : null;
        return new Gav(parts[0], parts[1], parts[2], classifier);
    }

    /**
     * @return {@code groupId:artifactId}
     */
    public String ga() {
        return groupId + ":" + artifactId;
    }

    @Override
    public String toString() {
        return classifier == null
                ? groupId + ":" + artifactId + ":" + version
                : groupId + ":" + artifactId + ":" + version + ":" + classifier;
    }
}
