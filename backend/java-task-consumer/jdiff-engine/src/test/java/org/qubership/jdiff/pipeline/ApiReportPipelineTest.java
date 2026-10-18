package org.qubership.jdiff.pipeline;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.qubership.jdiff.japicmp.JapicmpResult;
import org.qubership.jdiff.model.ApiChange;
import org.qubership.jdiff.model.ArtifactReport;
import org.qubership.jdiff.model.DiffReport;
import org.qubership.jdiff.model.Gav;
import org.qubership.jdiff.model.ReportMode;

class ApiReportPipelineTest {

    @Test
    void buildsAFullApiInventoryReportUsingOldEqualsNewTrick(@TempDir Path tempDir) throws Exception {
        Gav gav = new Gav("com.example", "widget", "1.0.0", null);
        Path jar = tempDir.resolve("widget-1.0.0.jar");
        Files.createFile(jar);
        FakeArtifactResolver resolver = new FakeArtifactResolver().withJar(gav, jar);

        List<ApiChange> changes = List.of(
                new ApiChange("com.example.Widget", "CLASS", null, "UNCHANGED",
                        List.of(), null, true, true, false, "NONE", null),
                new ApiChange("com.example.Widget", "METHOD", "void doStuff()", "UNCHANGED",
                        List.of(), null, true, true, false, "NONE", null));
        FakeJarComparator comparator = new FakeJarComparator(new JapicmpResult("1.0.0", "1.0.0", null, changes));

        DiffReport report = new ApiReportPipeline(resolver, comparator).run(gav);

        assertThat(report.mode()).isEqualTo(ReportMode.API_REPORT);
        assertThat(report.input()).containsExactly(java.util.Map.entry("gav", gav.toString()));
        assertThat(report.artifacts()).hasSize(1);
        ArtifactReport artifactReport = report.artifacts().get(0);
        assertThat(artifactReport.groupId()).isEqualTo("com.example");
        assertThat(artifactReport.artifactId()).isEqualTo("widget");
        assertThat(artifactReport.oldVersion()).isEqualTo("1.0.0");
        assertThat(artifactReport.newVersion()).isEqualTo("1.0.0");
        assertThat(artifactReport.semverVerdict()).isNull();
        assertThat(artifactReport.changes()).isEqualTo(changes);

        assertThat(comparator.callCount).isEqualTo(1);
        assertThat(comparator.lastFullApi).isTrue();
        assertThat(comparator.lastOldJar).isEqualTo(jar);
        assertThat(comparator.lastNewJar).isEqualTo(jar);
        assertThat(comparator.lastOldJar).isEqualTo(comparator.lastNewJar);
    }
}
