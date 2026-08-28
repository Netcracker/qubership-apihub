package com.netcracker.qubership.apihub.javataskconsumer.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;

@JsonIgnoreProperties(ignoreUnknown = true)
public record JavaBuildConfig(
        String publishId,
        String packageId,
        BuildType buildType,
        JsonNode metadata
) {
}
