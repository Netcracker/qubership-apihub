package com.netcracker.qubership.apihub.javataskconsumer.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public enum BuildType {
    @JsonProperty("java-api-report")
    JAVA_API_REPORT,
    @JsonProperty("java-api-diff")
    JAVA_API_DIFF,
    @JsonProperty("java-upgrade-impact")
    JAVA_UPGRADE_IMPACT
}
