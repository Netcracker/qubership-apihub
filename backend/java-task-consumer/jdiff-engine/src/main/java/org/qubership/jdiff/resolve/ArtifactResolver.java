package org.qubership.jdiff.resolve;

import java.nio.file.Path;
import java.util.List;
import org.apache.maven.model.Model;
import org.qubership.jdiff.model.Gav;

/**
 * Resolves Maven artifacts (jars and POMs) by coordinate to a local file, and optionally the
 * resolved dependency tree of a module.
 */
public interface ArtifactResolver {

    /**
     * @param gav coordinate of the jar to resolve
     * @return the local path of the resolved jar
     * @throws ArtifactResolutionException if the jar cannot be resolved
     */
    Path resolveJar(Gav gav);

    /**
     * @param gav coordinate of the POM to resolve
     * @return the local path of the resolved POM
     * @throws ArtifactResolutionException if the POM cannot be resolved
     */
    Path resolvePom(Gav gav);

    /**
     * Collects the resolved dependency tree of {@code moduleGav} using the dependencies and
     * dependency management from {@code effectiveModel}.
     *
     * @param moduleGav      coordinate of the consumer module (the tree root; not included in the result)
     * @param effectiveModel effective POM of that module
     * @return flattened compile/runtime/provided dependencies at any depth ({@code depth == 0} = direct)
     * @throws ArtifactResolutionException if the tree cannot be collected
     * @throws UnsupportedOperationException if this resolver does not support tree collection
     */
    default List<ResolvedDependency> resolveDependencyTree(Gav moduleGav, Model effectiveModel) {
        throw new UnsupportedOperationException("Dependency tree resolution is not supported by " + getClass().getName());
    }
}
