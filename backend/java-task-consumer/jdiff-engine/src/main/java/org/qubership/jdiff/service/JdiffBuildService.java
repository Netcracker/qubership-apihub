package org.qubership.jdiff.service;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import org.qubership.jdiff.config.JdiffEngineConfig;
import org.qubership.jdiff.model.DiffReport;
import org.qubership.jdiff.model.Gav;
import org.qubership.jdiff.model.JsonSupport;
import org.qubership.jdiff.pipeline.UpgradeRequest;
import org.qubership.jdiff.resolve.DockerImageJarSource;
import org.qubership.jdiff.resolve.JarSource;
import org.qubership.jdiff.upgrade.UpgradeSpec;

/**
 * High-level API used by java-task-consumer to run Java build types.
 */
public final class JdiffBuildService {

    private final JdiffEngineFactory factory;

    public JdiffBuildService(JdiffEngineConfig config) {
        this.factory = new JdiffEngineFactory(config);
    }

    public byte[] runApiReport(JsonNode metadata) {
        Gav gav = parseGav(metadata);
        DiffReport report = factory.apiReportPipeline().run(gav);
        return JsonSupport.toJsonBytes(report);
    }

    public byte[] runApiDiff(JsonNode metadata) {
        String groupId = requiredText(metadata, "groupId");
        String artifactId = requiredText(metadata, "artifactId");
        String oldVersion = requiredText(metadata, "oldVersion");
        String newVersion = requiredText(metadata, "newVersion");
        DiffReport report = factory.apiDiffPipeline().run(groupId, artifactId, oldVersion, newVersion);
        return JsonSupport.toJsonBytes(report);
    }

    public byte[] runUpgradeImpact(JsonNode metadata) {
        JarSource subject = parseSubject(metadata.get("subject"));
        List<UpgradeSpec> upgrades = parseUpgrades(metadata.get("upgrades"));
        if (upgrades.isEmpty()) {
            throw new IllegalArgumentException("metadata.upgrades must not be empty");
        }
        UpgradeRequest request = switch (subject) {
            case org.qubership.jdiff.resolve.GavJarSource gavSource ->
                    new UpgradeRequest(null, gavSource.gav(), upgrades);
            case DockerImageJarSource dockerSource ->
                    throw new UnsupportedOperationException(
                            "Docker subject is not implemented yet (image=" + dockerSource.imageReference() + ")");
        };
        DiffReport report = factory.upgradeImpactPipeline().run(request);
        return JsonSupport.toJsonBytes(report);
    }

    private static Gav parseGav(JsonNode metadata) {
        if (metadata.hasNonNull("gav")) {
            return Gav.parse(metadata.get("gav").asText());
        }
        return new Gav(
                requiredText(metadata, "groupId"),
                requiredText(metadata, "artifactId"),
                requiredText(metadata, "version"),
                optionalText(metadata, "classifier"));
    }

    private static JarSource parseSubject(JsonNode node) {
        if (node == null || node.isNull()) {
            throw new IllegalArgumentException("metadata.subject is required");
        }
        String type = requiredText(node, "type");
        return switch (type) {
            case "gav" -> new org.qubership.jdiff.resolve.GavJarSource(
                    requiredText(node, "groupId"),
                    requiredText(node, "artifactId"),
                    requiredText(node, "version"));
            case "docker" -> new DockerImageJarSource(
                    requiredText(node, "imageReference"),
                    optionalText(node, "jarPathInImage"));
            default -> throw new IllegalArgumentException("Unsupported subject type: " + type);
        };
    }

    private static List<UpgradeSpec> parseUpgrades(JsonNode node) {
        if (node == null || !node.isArray()) {
            throw new IllegalArgumentException("metadata.upgrades must be a JSON array");
        }
        List<UpgradeSpec> upgrades = new ArrayList<>();
        for (JsonNode item : node) {
            upgrades.add(new UpgradeSpec(
                    requiredText(item, "groupId"),
                    requiredText(item, "artifactId"),
                    requiredText(item, "version")));
        }
        return upgrades;
    }

    private static String requiredText(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull() || value.asText().isBlank()) {
            throw new IllegalArgumentException("metadata." + field + " is required");
        }
        return value.asText();
    }

    private static String optionalText(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull() || value.asText().isBlank()) {
            return null;
        }
        return value.asText();
    }
}
