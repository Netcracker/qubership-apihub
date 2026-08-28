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
 * Produces an API diff report for a single artifact between two versions (mode: {@code api-diff}).
 */
public class ApiDiffPipeline {

    private static final Logger LOG = LoggerFactory.getLogger(ApiDiffPipeline.class);

    private final ArtifactResolver resolver;
    private final JarComparator comparator;

    public ApiDiffPipeline(ArtifactResolver resolver, JarComparator comparator) {
        this.resolver = resolver;
        this.comparator = comparator;
    }

    /**
     * @param groupId    the artifact's group id
     * @param artifactId the artifact id
     * @param oldVersion the version to diff from
     * @param newVersion the version to diff to
     * @return the assembled {@link DiffReport}
     */
    public DiffReport run(String groupId, String artifactId, String oldVersion, String newVersion) {
        Gav oldGav = new Gav(groupId, artifactId, oldVersion, null);
        Gav newGav = new Gav(groupId, artifactId, newVersion, null);

        LOG.info("Resolving {}", oldGav);
        Path oldJar = resolver.resolveJar(oldGav);
        LOG.info("Resolving {}", newGav);
        Path newJar = resolver.resolveJar(newGav);

        JapicmpResult result = comparator.compare(oldJar, newJar, false);

        ArtifactReport artifactReport = new ArtifactReport(groupId, artifactId, oldVersion, newVersion,
                result.semverVerdict(), result.changes());
        Map<String, Object> input = Map.of(
                "gav", groupId + ":" + artifactId,
                "oldVersion", oldVersion,
                "newVersion", newVersion);
        return DiffReport.create(ReportMode.API_DIFF, input, List.of(artifactReport));
    }
}
