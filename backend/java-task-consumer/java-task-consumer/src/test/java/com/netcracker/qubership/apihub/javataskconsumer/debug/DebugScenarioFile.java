package com.netcracker.qubership.apihub.javataskconsumer.debug;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;

record DebugScenarioFile(String libraryId, List<DebugTaskSpec> tasks) {
}

record DebugTaskSpec(String id, String buildType, JsonNode metadata) {
}
