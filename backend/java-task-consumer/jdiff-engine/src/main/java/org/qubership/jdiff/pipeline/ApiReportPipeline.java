package org.qubership.jdiff.pipeline;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.qubership.jdiff.japicmp.JapicmpResult;
import org.qubership.jdiff.model.ArtifactReport;
import org.qubership.jdiff.model.DiffReport;
import org.qubership.jdiff.model.Gav;
import org.qubership.jdiff.model.ReportMode;
import org.qubership.jdiff.resolve.ArtifactResolver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Produces a full API inventory report for a single artifact (mode: {@code api-report}).
 */
public class ApiReportPipeline {

    private static final Logger LOG = LoggerFactory.getLogger(ApiReportPipeline.class);

    private final ArtifactResolver resolver;
    private final JarComparator comparator;

    public ApiReportPipeline(ArtifactResolver resolver, JarComparator comparator) {
        this.resolver = resolver;
        this.comparator = comparator;
    }

    /**
     * @param gav coordinate of the artifact to report on
     * @return the assembled {@link DiffReport}
     */
    public DiffReport run(Gav gav) {
        LOG.info("Resolving {}", gav);
        Path jar = resolver.resolveJar(gav);

        JapicmpResult result = comparator.compare(jar, jar, true);

        ArtifactReport artifactReport = new ArtifactReport(gav.groupId(), gav.artifactId(),
                gav.version(), gav.version(), null, result.changes());
        return DiffReport.create(ReportMode.API_REPORT, Map.of("gav", gav.toString()), List.of(artifactReport));
    }
}
