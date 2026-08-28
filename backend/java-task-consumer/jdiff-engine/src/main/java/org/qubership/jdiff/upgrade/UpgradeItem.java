package org.qubership.jdiff.upgrade;

/**
 * A resolved dependency upgrade: a concrete {@code groupId:artifactId} moving from {@code oldVersion}
 * to {@code newVersion}, whether matched directly, transitively, or via BOM expansion.
 *
 * @param groupId    the artifact's group id
 * @param artifactId the artifact id
 * @param oldVersion the version currently in use (from the resolved dependency tree)
 * @param newVersion the version to upgrade to
 * @param direct     {@code true} when the artifact is a direct dependency of the consumer module
 */
public record UpgradeItem(String groupId, String artifactId, String oldVersion, String newVersion, boolean direct) {

    /**
     * @return {@code groupId:artifactId}
     */
    public String ga() {
        return groupId + ":" + artifactId;
    }
}
