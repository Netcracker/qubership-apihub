package org.qubership.jdiff.upgrade;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;
import org.qubership.jdiff.jdeps.ClassUsage;
import org.qubership.jdiff.model.ApiChange;
import org.qubership.jdiff.model.UsageRef;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Intersects API changes of an upgraded dependency with the actual usage of that dependency across
 * modules, to keep only the changes that impact something.
 */
public final class ImpactAnalyzer {

    private static final Logger LOG = LoggerFactory.getLogger(ImpactAnalyzer.class);

    private ImpactAnalyzer() {
    }

    /**
     * @param changes         API changes detected between the old and new version of a dependency
     * @param usageByModule   each module's ({@code groupId:artifactId}) set of class usages, as reported by jdeps
     * @param oldDepJarFileName file name of the old dependency jar, as it appears in {@link ClassUsage#providerJar()}
     * @return the subset of {@code changes} that are actually used by at least one module, each with
     *         {@code usedBy} populated with the consuming modules and their owner classes
     */
    public static List<ApiChange> impacted(List<ApiChange> changes, Map<String, Set<ClassUsage>> usageByModule,
            String oldDepJarFileName) {
        List<ApiChange> result = new ArrayList<>();
        for (ApiChange change : changes) {
            List<UsageRef> usedBy = new ArrayList<>();
            for (Map.Entry<String, Set<ClassUsage>> entry : usageByModule.entrySet()) {
                Set<String> owners = entry.getValue().stream()
                        .filter(usage -> oldDepJarFileName.equals(usage.providerJar()))
                        .filter(usage -> usesClass(usage.usedClass(), change.className()))
                        .map(ClassUsage::ownerClass)
                        .collect(Collectors.toCollection(TreeSet::new));
                if (!owners.isEmpty()) {
                    usedBy.add(new UsageRef(entry.getKey(), List.copyOf(owners)));
                }
            }
            if (usedBy.isEmpty()) {
                continue;
            }
            usedBy.sort(Comparator.comparing(UsageRef::module));
            ApiChange impacted = new ApiChange(change.className(), change.elementType(), change.member(),
                    change.status(), change.changeTypes(), change.details(), change.binaryCompatible(),
                    change.sourceCompatible(), change.breaking(), change.semver(), usedBy);
            LOG.trace("Impacted change: {}", impacted);
            result.add(impacted);
        }
        return result;
    }

    private static boolean usesClass(String usedClass, String changeClassName) {
        return usedClass.equals(changeClassName) || usedClass.startsWith(changeClassName + "$");
    }
}
