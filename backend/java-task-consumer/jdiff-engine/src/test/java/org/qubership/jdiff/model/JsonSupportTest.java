package org.qubership.jdiff.model;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class JsonSupportTest {

    @Test
    void serializesAndDeserializesDiffReport() throws Exception {
        ApiChange breaking = new ApiChange(
                "org.example.Foo", "METHOD", "bar()", "REMOVED",
                List.of("METHOD_REMOVED"), null, false, false, true, "MAJOR",
                List.of(new UsageRef("org.example:consumer", List.of("org.example.Consumer"))));
        ApiChange nonBreaking = new ApiChange(
                "org.example.Baz", "CLASS", null, "UNCHANGED",
                List.of(), null, null, null, false, "NONE", null);
        ArtifactReport artifactReport = new ArtifactReport(
                "org.example", "foo", "1.0.0", "2.0.0", "MAJOR", List.of(breaking, nonBreaking));
        DiffReport report = DiffReport.create(ReportMode.API_DIFF, Map.of("gav", "org.example:foo"),
                List.of(artifactReport));

        String json = JsonSupport.toJson(report);

        assertThat(json).contains("\"mode\" : \"api-diff\"");
        assertThat(json).doesNotContain("\"member\" : null");
        assertThat(json).doesNotContain("\"usedBy\" : null");
        assertThat(json).doesNotContain("\"details\" : null");
        assertThat(json).doesNotContain("\"binaryCompatible\" : null");

        JsonNode tree = JsonSupport.mapper().readTree(json);
        assertThat(tree.get("generatedAt").asText()).matches("\\d{4}-\\d{2}-\\d{2}T.*Z");

        DiffReport parsed = JsonSupport.fromJson(json, DiffReport.class);

        assertThat(parsed.tool()).isEqualTo(report.tool());
        assertThat(parsed.toolVersion()).isEqualTo(report.toolVersion());
        assertThat(parsed.mode()).isEqualTo(ReportMode.API_DIFF);
        assertThat(parsed.generatedAt()).isEqualTo(report.generatedAt());
        assertThat(parsed.input()).isEqualTo(report.input());
        assertThat(parsed.artifacts()).isEqualTo(report.artifacts());
    }

    @Test
    void generatedAtIsCloseToNow() {
        DiffReport report = DiffReport.create(ReportMode.UPGRADE_IMPACT, Map.of(), List.of());

        assertThat(report.generatedAt()).isCloseTo(Instant.now(), within(10, java.time.temporal.ChronoUnit.SECONDS));
    }
}
