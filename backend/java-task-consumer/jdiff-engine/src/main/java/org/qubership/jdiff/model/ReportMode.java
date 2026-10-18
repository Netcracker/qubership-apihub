package org.qubership.jdiff.model;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * The kind of report a jdiff run produces.
 */
public enum ReportMode {
    UPGRADE_IMPACT("upgrade-impact"),
    API_REPORT("api-report"),
    API_DIFF("api-diff");

    private final String wireValue;

    ReportMode(String wireValue) {
        this.wireValue = wireValue;
    }

    @JsonValue
    public String wireValue() {
        return wireValue;
    }
}
