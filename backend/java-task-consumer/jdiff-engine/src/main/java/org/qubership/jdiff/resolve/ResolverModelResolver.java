package org.qubership.jdiff.resolve;

import java.nio.file.Path;
import org.apache.maven.model.Dependency;
import org.apache.maven.model.Parent;
import org.apache.maven.model.Repository;
import org.apache.maven.model.building.FileModelSource;
import org.apache.maven.model.building.ModelSource;
import org.apache.maven.model.resolution.InvalidRepositoryException;
import org.apache.maven.model.resolution.ModelResolver;
import org.apache.maven.model.resolution.UnresolvableModelException;
import org.qubership.jdiff.model.Gav;

/**
 * Adapts an {@link ArtifactResolver} to the maven-model-builder {@link ModelResolver} SPI, so that
 * parent POMs and import-scoped BOMs referenced from a model are served through the same
 * repository/local-cache configuration as everything else.
 *
 * <p>Extra {@code <repositories>} declared inside processed POMs are ignored: the set of remote
 * repositories to use is fixed upfront via {@link RepositoryConfig}.
 */
class ResolverModelResolver implements ModelResolver {

    private final ArtifactResolver resolver;

    ResolverModelResolver(ArtifactResolver resolver) {
        this.resolver = resolver;
    }

    @Override
    public ModelSource resolveModel(String groupId, String artifactId, String version)
            throws UnresolvableModelException {
        try {
            Path pomFile = resolver.resolvePom(new Gav(groupId, artifactId, version, null));
            return new FileModelSource(pomFile.toFile());
        } catch (ArtifactResolutionException e) {
            throw new UnresolvableModelException(e, groupId, artifactId, version);
        }
    }

    @Override
    public ModelSource resolveModel(Parent parent) throws UnresolvableModelException {
        return resolveModel(parent.getGroupId(), parent.getArtifactId(), parent.getVersion());
    }

    @Override
    public ModelSource resolveModel(Dependency dependency) throws UnresolvableModelException {
        return resolveModel(dependency.getGroupId(), dependency.getArtifactId(), dependency.getVersion());
    }

    @Override
    public void addRepository(Repository repository) throws InvalidRepositoryException {
        // no-op: repositories are fixed via RepositoryConfig, see class Javadoc
    }

    @Override
    public void addRepository(Repository repository, boolean replace) throws InvalidRepositoryException {
        // no-op: repositories are fixed via RepositoryConfig, see class Javadoc
    }

    @Override
    public ModelResolver newCopy() {
        return new ResolverModelResolver(resolver);
    }
}
