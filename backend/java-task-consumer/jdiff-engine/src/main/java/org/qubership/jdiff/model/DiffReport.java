package org.qubership.jdiff.model;

import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Properties;

/**
 * The top-level unified report produced by every jdiff run, regardless of {@link ReportMode}.
 *
 * @param tool         always {@code "jdiff"}
 * @param toolVersion  the jdiff version that produced the report
 * @param mode         the kind of report
 * @param generatedAt  when the report was generated
 * @param input        the inputs used to produce the report (GAVs, versions, options, etc.)
 * @param artifacts    per-artifact API changes
 */
public record DiffReport(String tool, String toolVersion, ReportMode mode, Instant generatedAt,
                          Map<String, Object> input, List<ArtifactReport> artifacts) {

    private static final String TOOL_NAME = "jdiff";
    private static final String FALLBACK_VERSION = "dev";

    /**
     * Builds a {@link DiffReport}, filling {@code tool}, {@code toolVersion} and {@code generatedAt}
     * automatically.
     *
     * @param mode      the kind of report
     * @param input     the inputs used to produce the report
     * @param artifacts per-artifact API changes
     * @return the assembled report
     */
    public static DiffReport create(ReportMode mode, Map<String, Object> input, List<ArtifactReport> artifacts) {
        return new DiffReport(TOOL_NAME, readToolVersion(), mode, Instant.now(), input, artifacts);
    }

    private static String readToolVersion() {
        try (InputStream in = DiffReport.class.getResourceAsStream("/jdiff.properties")) {
            if (in == null) {
                return FALLBACK_VERSION;
            }
            Properties props = new Properties();
            props.load(in);
            String version = props.getProperty("version");
            if (version == null || version.isBlank() || version.contains("${")) {
                return FALLBACK_VERSION;
            }
            return version;
        } catch (IOException e) {
            return FALLBACK_VERSION;
        }
    }
}
