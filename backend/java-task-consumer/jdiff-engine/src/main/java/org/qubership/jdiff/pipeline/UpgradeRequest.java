package org.qubership.jdiff.pipeline;

import java.nio.file.Path;
import java.util.List;
import org.qubership.jdiff.model.Gav;
import org.qubership.jdiff.upgrade.UpgradeSpec;

/**
 * Input to {@link UpgradeImpactPipeline}: either a local project directory or a single artifact
 * coordinate, plus the dependency upgrades to analyze the impact of.
 *
 * @param projectDir path to a local multi-module project; {@code null} when {@code targetGav} is set
 * @param targetGav  coordinate of a single artifact to analyze; {@code null} when {@code projectDir} is set
 * @param upgrades   the requested dependency upgrades
 */
public record UpgradeRequest(Path projectDir, Gav targetGav, List<UpgradeSpec> upgrades) {

    public UpgradeRequest {
        if ((projectDir == null) == (targetGav == null)) {
            throw new IllegalArgumentException("Exactly one of projectDir or targetGav must be set");
        }
    }
}
