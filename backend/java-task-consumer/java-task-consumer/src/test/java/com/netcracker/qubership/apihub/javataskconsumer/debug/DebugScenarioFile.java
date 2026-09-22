package com.netcracker.qubership.apihub.javataskconsumer.debug;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;

record DebugScenarioFile(String packageId, List<DebugTaskSpec> tasks) {
}

record DebugTaskSpec(String id, String buildType, JsonNode metadata) {
}
