package com.netcracker.qubership.apihub.javataskconsumer.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;

/**
 * The {@code config.json} at the root of a task ZIP.
 *
 * <p>{@code libraryId} is libraries-backend's own {@code library.id}; it is not an APIHUB
 * {@code packageId}, which does not exist as a concept in that service.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record JavaBuildConfig(
        String publishId,
        String libraryId,
        BuildType buildType,
        JsonNode metadata
) {
}
