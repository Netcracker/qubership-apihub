package org.qubership.jdiff.pipeline;

import java.nio.file.Path;
import java.util.List;
import org.apache.maven.model.Model;
import org.qubership.jdiff.model.Gav;
import org.qubership.jdiff.resolve.ArtifactResolver;
import org.qubership.jdiff.resolve.EffectivePomBuilder;

/**
 * Test double that returns a fixed {@link BuildOutcome} regardless of the requested POM, bypassing
 * real Maven model building entirely.
 */
class FakeEffectivePomBuilder extends EffectivePomBuilder {

    private final BuildOutcome outcome;

    FakeEffectivePomBuilder(ArtifactResolver resolver) {
        this(resolver, new BuildOutcome(new Model(), List.of()));
    }

    FakeEffectivePomBuilder(ArtifactResolver resolver, BuildOutcome outcome) {
        super(resolver);
        this.outcome = outcome;
    }

    @Override
    public BuildOutcome buildFull(Path pomFile) {
        return outcome;
    }

    @Override
    public BuildOutcome buildFull(Gav gav) {
        return outcome;
    }
}
