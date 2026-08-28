package org.qubership.jdiff.upgrade;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.qubership.jdiff.resolve.ResolvedDependency;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Matches requested upgrades against a module's resolved dependency tree by {@code groupId:artifactId},
 * at any depth (direct or transitive).
 */
public class UpgradeMatcher {

    private static final Logger LOG = LoggerFactory.getLogger(UpgradeMatcher.class);

    /**
     * @param specs             requested upgrades
     * @param resolvedTreeDeps  the module's resolved dependency tree (any depth)
     * @return the specs that matched a tree dependency (old version taken from the tree),
     *         plus the specs that matched none (candidates for BOM matching, or eventually unmatched)
     */
    public MatchResult match(List<UpgradeSpec> specs, List<ResolvedDependency> resolvedTreeDeps) {
        Map<String, ResolvedDependency> byGa = resolvedTreeDeps.stream()
                .collect(Collectors.toMap(dep -> dep.gav().ga(), dep -> dep, (first, second) ->
                        first.depth() <= second.depth() ? first : second));

        List<UpgradeItem> matched = new ArrayList<>();
        List<UpgradeSpec> unmatched = new ArrayList<>();
        for (UpgradeSpec spec : specs) {
            ResolvedDependency dep = byGa.get(spec.ga());
            if (dep == null) {
                unmatched.add(spec);
                continue;
            }
            UpgradeItem item = new UpgradeItem(spec.groupId(), spec.artifactId(), dep.gav().version(),
                    spec.newVersion(), dep.direct());
            LOG.info("Matched {} dependency upgrade {}: {} -> {}",
                    item.direct() ? "direct" : "transitive", spec.ga(), item.oldVersion(), item.newVersion());
            matched.add(item);
        }
        return new MatchResult(matched, unmatched);
    }

    /**
     * @param matched        upgrades that matched a dependency in the resolved tree
     * @param unmatchedSpecs requested upgrades that matched none of the tree dependencies
     */
    public record MatchResult(List<UpgradeItem> matched, List<UpgradeSpec> unmatchedSpecs) {
    }
}
