package org.qubership.jdiff.upgrade;

/**
 * A requested upgrade that could not be matched to the consumer's resolved dependency tree
 * (and could not be expanded from a BOM into tree-managed jars).
 *
 * @param upgrade the original upgrade string ({@code groupId:artifactId=newVersion})
 * @param reason  machine-readable reason code
 */
public record UnmatchedUpgrade(String upgrade, String reason) {

    public static final String NOT_IN_RESOLVED_TREE = "NOT_IN_RESOLVED_TREE";
    public static final String BOM_NOT_EXPANDED = "BOM_NOT_EXPANDED";
}
