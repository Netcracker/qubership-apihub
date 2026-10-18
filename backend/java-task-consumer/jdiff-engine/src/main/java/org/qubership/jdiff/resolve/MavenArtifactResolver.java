package org.qubership.jdiff.resolve;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.apache.maven.model.Dependency;
import org.apache.maven.model.DependencyManagement;
import org.apache.maven.model.Model;
import org.apache.maven.repository.internal.MavenRepositorySystemUtils;
import org.eclipse.aether.DefaultRepositorySystemSession;
import org.eclipse.aether.RepositorySystem;
import org.eclipse.aether.RepositorySystemSession;
import org.eclipse.aether.artifact.Artifact;
import org.eclipse.aether.artifact.DefaultArtifact;
import org.eclipse.aether.collection.CollectRequest;
import org.eclipse.aether.collection.CollectResult;
import org.eclipse.aether.collection.DependencyCollectionException;
import org.eclipse.aether.graph.DependencyNode;
import org.eclipse.aether.repository.Authentication;
import org.eclipse.aether.repository.LocalRepository;
import org.eclipse.aether.repository.RemoteRepository;
import org.eclipse.aether.resolution.ArtifactRequest;
import org.eclipse.aether.resolution.ArtifactResult;
import org.eclipse.aether.supplier.RepositorySystemSupplier;
import org.eclipse.aether.util.artifact.JavaScopes;
import org.eclipse.aether.util.repository.AuthenticationBuilder;
import org.qubership.jdiff.model.Gav;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Resolves jars and POMs by GAV using the Maven Resolver (Aether) libraries, downloading into
 * (and reusing artifacts already cached in) the local repository configured via {@link RepositoryConfig}.
 * Also collects resolved dependency trees via Aether {@link CollectRequest}.
 */
public class MavenArtifactResolver implements ArtifactResolver {

    private static final Logger LOG = LoggerFactory.getLogger(MavenArtifactResolver.class);

    private static final Set<String> INCLUDED_SCOPES = Set.of(
            JavaScopes.COMPILE, JavaScopes.RUNTIME, JavaScopes.PROVIDED);

    private final RepositorySystem repositorySystem;
    private final RepositorySystemSession session;
    private final List<RemoteRepository> remoteRepositories;

    public MavenArtifactResolver(RepositoryConfig config) {
        this.repositorySystem = new RepositorySystemSupplier().get();
        this.session = newSession(repositorySystem, config.localRepository());
        this.remoteRepositories = config.repositories().stream()
                .map(repo -> {
                    RemoteRepository.Builder builder =
                            new RemoteRepository.Builder(repo.id(), "default", repo.url());
                    ServerCredentials credentials = config.serverCredentials().get(repo.id());
                    if (credentials != null) {
                        builder.setAuthentication(toAuthentication(credentials));
                    }
                    return builder.build();
                })
                .toList();
    }

    private static Authentication toAuthentication(ServerCredentials credentials) {
        return new AuthenticationBuilder()
                .addUsername(credentials.username())
                .addPassword(credentials.password())
                .build();
    }

    private static RepositorySystemSession newSession(RepositorySystem system, Path localRepository) {
        DefaultRepositorySystemSession session = MavenRepositorySystemUtils.newSession();
        LocalRepository localRepo = new LocalRepository(localRepository.toFile());
        session.setLocalRepositoryManager(system.newLocalRepositoryManager(session, localRepo));
        return session;
    }

    @Override
    public Path resolveJar(Gav gav) {
        return resolve(gav, "jar");
    }

    @Override
    public Path resolvePom(Gav gav) {
        return resolve(gav, "pom");
    }

    @Override
    public List<ResolvedDependency> resolveDependencyTree(Gav moduleGav, Model effectiveModel) {
        CollectRequest collectRequest = new CollectRequest();
        Artifact rootArtifact = new DefaultArtifact(
                moduleGav.groupId(),
                moduleGav.artifactId(),
                moduleGav.classifier() == null ? "" : moduleGav.classifier(),
                "jar",
                moduleGav.version());
        collectRequest.setRootArtifact(rootArtifact);

        for (Dependency dependency : effectiveModel.getDependencies()) {
            org.eclipse.aether.graph.Dependency aetherDep = toAetherDependency(dependency);
            if (aetherDep != null) {
                collectRequest.addDependency(aetherDep);
            }
        }
        DependencyManagement management = effectiveModel.getDependencyManagement();
        if (management != null) {
            for (Dependency dependency : management.getDependencies()) {
                org.eclipse.aether.graph.Dependency aetherDep = toAetherDependency(dependency);
                if (aetherDep != null) {
                    collectRequest.addManagedDependency(aetherDep);
                }
            }
        }
        collectRequest.setRepositories(remoteRepositories);

        try {
            CollectResult collectResult = repositorySystem.collectDependencies(session, collectRequest);
            List<ResolvedDependency> result = new ArrayList<>();
            flatten(collectResult.getRoot(), result, -1);
            LOG.debug("Resolved dependency tree of {}: {} node(s)", moduleGav, result.size());
            return result;
        } catch (DependencyCollectionException e) {
            throw new ArtifactResolutionException("Failed to resolve dependency tree for " + moduleGav, e);
        }
    }

    private void flatten(DependencyNode node, List<ResolvedDependency> out, int depth) {
        if (depth >= 0 && node.getDependency() != null && node.getArtifact() != null) {
            org.eclipse.aether.graph.Dependency dependency = node.getDependency();
            String scope = dependency.getScope();
            if (scope == null || scope.isBlank()) {
                scope = JavaScopes.COMPILE;
            }
            if (INCLUDED_SCOPES.contains(scope)) {
                Artifact artifact = node.getArtifact();
                String classifier = artifact.getClassifier();
                if (classifier != null && classifier.isBlank()) {
                    classifier = null;
                }
                Gav gav = new Gav(artifact.getGroupId(), artifact.getArtifactId(), artifact.getVersion(), classifier);
                out.add(new ResolvedDependency(gav, scope, dependency.isOptional(), depth));
            }
        }
        for (DependencyNode child : node.getChildren()) {
            flatten(child, out, depth + 1);
        }
    }

    private static org.eclipse.aether.graph.Dependency toAetherDependency(Dependency dependency) {
        String version = dependency.getVersion();
        if (version == null || version.isBlank()) {
            version = "";
        }
        String type = dependency.getType();
        if (type == null || type.isBlank()) {
            type = "jar";
        }
        String classifier = dependency.getClassifier();
        if (classifier == null) {
            classifier = "";
        }
        String scope = dependency.getScope();
        if (scope == null || scope.isBlank()) {
            scope = JavaScopes.COMPILE;
        }
        Artifact artifact = new DefaultArtifact(
                dependency.getGroupId(),
                dependency.getArtifactId(),
                classifier,
                type,
                version);
        return new org.eclipse.aether.graph.Dependency(artifact, scope, dependency.isOptional());
    }

    private Path resolve(Gav gav, String extension) {
        Artifact artifact = new DefaultArtifact(
                gav.groupId(), gav.artifactId(), gav.classifier(), extension, gav.version());
        ArtifactRequest request = new ArtifactRequest(artifact, remoteRepositories, null);
        try {
            ArtifactResult result = repositorySystem.resolveArtifact(session, request);
            Path path = result.getArtifact().getFile().toPath();
            LOG.debug("Resolved {} -> {}", gav, path);
            return path;
        } catch (org.eclipse.aether.resolution.ArtifactResolutionException e) {
            throw new ArtifactResolutionException("Failed to resolve " + extension + " for " + gav, e);
        }
    }
}
