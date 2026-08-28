package org.qubership.jdiff.pipeline;

import java.util.List;
import org.apache.maven.model.Model;
import org.qubership.jdiff.resolve.DependencyExtractor;
import org.qubership.jdiff.resolve.EffectivePomBuilder;
import org.qubership.jdiff.resolve.ResolvedDependency;

/**
 * Test double that returns a fixed list of direct dependencies regardless of the given model.
 */
class FakeDependencyExtractor extends DependencyExtractor {

    private final List<ResolvedDependency> directDeps;

    FakeDependencyExtractor(EffectivePomBuilder pomBuilder, List<ResolvedDependency> directDeps) {
        super(pomBuilder);
        this.directDeps = directDeps;
    }

    @Override
    public List<ResolvedDependency> directDependencies(Model effectiveModel) {
        return directDeps;
    }
}
