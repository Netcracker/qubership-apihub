package org.qubership.jdiff.japicmp;

/**
 * Options controlling how japicmp compares two jars.
 *
 * @param onlyModified          whether to restrict the report to modified classes/members only
 *                              ({@code --only-modified})
 * @param ignoreMissingClasses  whether to ignore classes missing from the classpath
 *                              ({@code --ignore-missing-classes})
 */
public record JapicmpOptions(boolean onlyModified, boolean ignoreMissingClasses) {

    /**
     * Defaults for upgrade-impact and API-diff modes: only modifications are relevant.
     */
    public static JapicmpOptions diffDefaults() {
        return new JapicmpOptions(true, true);
    }

    /**
     * Defaults for API-report mode (old = new jar): the full API inventory is needed.
     */
    public static JapicmpOptions fullApiDefaults() {
        return new JapicmpOptions(false, true);
    }
}
