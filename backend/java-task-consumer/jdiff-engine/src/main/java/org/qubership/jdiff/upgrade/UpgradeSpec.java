package org.qubership.jdiff.upgrade;

/**
 * A requested dependency upgrade, as given on the command line.
 *
 * @param groupId    the artifact's group id
 * @param artifactId the artifact id
 * @param newVersion the version to upgrade to
 */
public record UpgradeSpec(String groupId, String artifactId, String newVersion) {

    /**
     * Parses a {@code groupId:artifactId=newVersion} upgrade specification.
     *
     * @param s the upgrade specification string
     * @return the parsed {@link UpgradeSpec}
     * @throws IllegalArgumentException if {@code s} is not of the form {@code groupId:artifactId=newVersion}
     */
    public static UpgradeSpec parse(String s) {
        if (s == null || s.isBlank()) {
            throw new IllegalArgumentException("Upgrade spec must not be blank: " + s);
        }
        int eq = s.indexOf('=');
        if (eq < 0) {
            throw new IllegalArgumentException(
                    "Invalid upgrade spec '" + s + "': expected 'groupId:artifactId=newVersion'");
        }
        String ga = s.substring(0, eq);
        String newVersion = s.substring(eq + 1);
        String[] parts = ga.split(":", -1);
        if (parts.length != 2 || parts[0].isBlank() || parts[1].isBlank() || newVersion.isBlank()) {
            throw new IllegalArgumentException(
                    "Invalid upgrade spec '" + s + "': expected 'groupId:artifactId=newVersion'");
        }
        return new UpgradeSpec(parts[0], parts[1], newVersion);
    }

    /**
     * @return {@code groupId:artifactId}
     */
    public String ga() {
        return groupId + ":" + artifactId;
    }
}
