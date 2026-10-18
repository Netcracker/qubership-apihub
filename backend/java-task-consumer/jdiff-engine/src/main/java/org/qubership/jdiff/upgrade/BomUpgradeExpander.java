package org.qubership.jdiff.upgrade;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.maven.model.Dependency;
import org.apache.maven.model.DependencyManagement;
import org.apache.maven.model.Model;
import org.qubership.jdiff.model.Gav;
import org.qubership.jdiff.resolve.EffectivePomBuilder;
import org.qubership.jdiff.resolve.ResolvedDependency;

/**
 * Expands an upgrade of a BOM into the individual dependency upgrades it implies for a module:
 * every artifact in the module's resolved dependency tree that the BOM manages, whose managed
 * version changes (or differs from the tree version when only the new BOM is known).
 */
public class BomUpgradeExpander {

    private final EffectivePomBuilder pomBuilder;

    public BomUpgradeExpander(EffectivePomBuilder pomBuilder) {
        this.pomBuilder = pomBuilder;
    }

    /**
     * @param oldBom           coordinate (with concrete version) of the BOM currently in use
     * @param newBomVersion    the version to upgrade the BOM to
     * @param resolvedTreeDeps the module's resolved dependency tree (any depth)
     * @return one {@link UpgradeItem} per tree dependency managed by {@code oldBom} whose version
     *         the new BOM changes; empty if none apply
     */
    public List<UpgradeItem> expand(Gav oldBom, String newBomVersion, List<ResolvedDependency> resolvedTreeDeps) {
        Map<String, String> oldManaged = managedVersions(oldBom);
        Gav newBom = new Gav(oldBom.groupId(), oldBom.artifactId(), newBomVersion, null);
        Map<String, String> newManaged = managedVersions(newBom);

        List<UpgradeItem> items = new ArrayList<>();
        for (ResolvedDependency dep : resolvedTreeDeps) {
            String ga = dep.gav().ga();
            String oldManagedVersion = oldManaged.get(ga);
            if (oldManagedVersion == null) {
                continue;
            }
            String newManagedVersion = newManaged.get(ga);
            if (newManagedVersion == null || newManagedVersion.equals(oldManagedVersion)) {
                continue;
            }
            if (newManagedVersion.equals(dep.gav().version())) {
                continue;
            }
            items.add(new UpgradeItem(dep.gav().groupId(), dep.gav().artifactId(), dep.gav().version(),
                    newManagedVersion, dep.direct()));
        }
        return items;
    }

    /**
     * Expands using only the new BOM's managed versions against the tree (when the old BOM version
     * is unknown). Includes a tree dependency when the new BOM manages it at a different version.
     */
    public List<UpgradeItem> expandFromNewBom(Gav newBom, List<ResolvedDependency> resolvedTreeDeps) {
        Map<String, String> newManaged = managedVersions(newBom);
        List<UpgradeItem> items = new ArrayList<>();
        for (ResolvedDependency dep : resolvedTreeDeps) {
            String newManagedVersion = newManaged.get(dep.gav().ga());
            if (newManagedVersion != null && !newManagedVersion.equals(dep.gav().version())) {
                items.add(new UpgradeItem(dep.gav().groupId(), dep.gav().artifactId(), dep.gav().version(),
                        newManagedVersion, dep.direct()));
            }
        }
        return items;
    }

    /**
     * @return {@code true} when the artifact at {@code bomGav} is a POM with dependency management
     */
    public boolean isBom(Gav bomGav) {
        Model effective = pomBuilder.build(bomGav);
        if (!"pom".equals(effective.getPackaging())) {
            return false;
        }
        DependencyManagement management = effective.getDependencyManagement();
        return management != null && !management.getDependencies().isEmpty();
    }

    private Map<String, String> managedVersions(Gav bomGav) {
        Model effective = pomBuilder.build(bomGav);
        Map<String, String> managed = new HashMap<>();
        DependencyManagement management = effective.getDependencyManagement();
        if (management != null) {
            for (Dependency dep : management.getDependencies()) {
                managed.put(dep.getGroupId() + ":" + dep.getArtifactId(), dep.getVersion());
            }
        }
        return managed;
    }
}
