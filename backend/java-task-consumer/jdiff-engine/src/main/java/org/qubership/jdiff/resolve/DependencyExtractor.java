package org.qubership.jdiff.resolve;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.apache.maven.model.Dependency;
import org.apache.maven.model.Model;
import org.qubership.jdiff.model.Gav;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Extracts the direct dependencies of a Maven module's effective model, with versions already
 * resolved by {@link EffectivePomBuilder} (i.e. filled in from {@code dependencyManagement} /
 * imported BOMs).
 */
public class DependencyExtractor {

    private static final Logger LOG = LoggerFactory.getLogger(DependencyExtractor.class);

    private static final Set<String> INCLUDED_SCOPES = Set.of("compile", "runtime", "provided");

    private final EffectivePomBuilder pomBuilder;

    public DependencyExtractor(EffectivePomBuilder pomBuilder) {
        this.pomBuilder = pomBuilder;
    }

    /**
     * @param effectiveModel an effective model, as produced by {@link EffectivePomBuilder}
     * @return the direct dependencies in scope compile/runtime/provided (unset scope treated as compile),
     *         excluding scope test
     */
    public List<ResolvedDependency> directDependencies(Model effectiveModel) {
        List<ResolvedDependency> result = new ArrayList<>();
        for (Dependency dependency : effectiveModel.getDependencies()) {
            String scope = dependency.getScope();
            scope = (scope == null || scope.isBlank()) ? "compile" : scope;
            if (!INCLUDED_SCOPES.contains(scope)) {
                continue;
            }
            String version = dependency.getVersion();
            if (version == null || version.isBlank()) {
                LOG.warn("Skipping dependency {}:{} with no resolved version in {}",
                        dependency.getGroupId(), dependency.getArtifactId(), effectiveModel.getId());
                continue;
            }
            Gav gav = new Gav(dependency.getGroupId(), dependency.getArtifactId(), version,
                    blankToNull(dependency.getClassifier()));
            result.add(new ResolvedDependency(gav, scope, dependency.isOptional()));
        }
        LOG.trace("Direct dependencies of {}: {}", effectiveModel.getId(), result);
        return result;
    }

    /**
     * @param artifact coordinate of the module to resolve and build the effective model of
     * @return see {@link #directDependencies(Model)}
     */
    public List<ResolvedDependency> directDependencies(Gav artifact) {
        return directDependencies(pomBuilder.build(artifact));
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}
