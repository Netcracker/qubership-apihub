package org.qubership.jdiff.pipeline;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.qubership.jdiff.japicmp.JapicmpResult;
import org.qubership.jdiff.model.ApiChange;
import org.qubership.jdiff.model.ArtifactReport;
import org.qubership.jdiff.model.DiffReport;
import org.qubership.jdiff.model.Gav;
import org.qubership.jdiff.model.ReportMode;

class ApiDiffPipelineTest {

    @Test
    void buildsADiffReportFromTwoResolvedVersions(@TempDir Path tempDir) throws Exception {
        Gav oldGav = new Gav("com.example", "widget", "1.0.0", null);
        Gav newGav = new Gav("com.example", "widget", "2.0.0", null);
        Path oldJar = tempDir.resolve("widget-1.0.0.jar");
        Path newJar = tempDir.resolve("widget-2.0.0.jar");
        Files.createFile(oldJar);
        Files.createFile(newJar);
        FakeArtifactResolver resolver = new FakeArtifactResolver().withJar(oldGav, oldJar).withJar(newGav, newJar);

        List<ApiChange> changes = List.of(
                new ApiChange("com.example.Widget", "METHOD", "void doStuff()", "REMOVED",
                        List.of("METHOD_REMOVED"), null, false, false, true, "MAJOR", null),
                new ApiChange("com.example.Widget", "METHOD", "void doOther()", "NEW",
                        List.of(), null, true, true, false, "MINOR", null),
                new ApiChange("com.example.Widget", "FIELD", "int count", "MODIFIED",
                        List.of("FIELD_TYPE_CHANGED"), null, true, true, false, "PATCH", null));
        FakeJarComparator comparator = new FakeJarComparator(new JapicmpResult("1.0.0", "2.0.0", "MAJOR", changes));

        DiffReport report = new ApiDiffPipeline(resolver, comparator)
                .run("com.example", "widget", "1.0.0", "2.0.0");

        assertThat(report.mode()).isEqualTo(ReportMode.API_DIFF);
        assertThat(report.input()).containsExactlyInAnyOrderEntriesOf(Map.of(
                "gav", "com.example:widget",
                "oldVersion", "1.0.0",
                "newVersion", "2.0.0"));
        assertThat(report.artifacts()).hasSize(1);
        ArtifactReport artifactReport = report.artifacts().get(0);
        assertThat(artifactReport.groupId()).isEqualTo("com.example");
        assertThat(artifactReport.artifactId()).isEqualTo("widget");
        assertThat(artifactReport.oldVersion()).isEqualTo("1.0.0");
        assertThat(artifactReport.newVersion()).isEqualTo("2.0.0");
        assertThat(artifactReport.semverVerdict()).isEqualTo("MAJOR");
        assertThat(artifactReport.changes()).isEqualTo(changes);

        assertThat(comparator.callCount).isEqualTo(1);
        assertThat(comparator.lastFullApi).isFalse();
        assertThat(comparator.lastOldJar).isEqualTo(oldJar);
        assertThat(comparator.lastNewJar).isEqualTo(newJar);
    }
}
