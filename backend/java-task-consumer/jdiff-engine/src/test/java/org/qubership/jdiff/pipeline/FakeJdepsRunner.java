package org.qubership.jdiff.pipeline;

import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import org.qubership.jdiff.jdeps.ClassUsage;
import org.qubership.jdiff.jdeps.JdepsRunner;

/**
 * Test double that returns a fixed usage set regardless of the target jar or dependency jars,
 * bypassing spawning the real {@code jdeps} process.
 */
class FakeJdepsRunner extends JdepsRunner {

    private final Set<ClassUsage> usages;
    private volatile Path lastTargetJar;
    private volatile List<Path> lastClasspath = List.of();

    FakeJdepsRunner(Set<ClassUsage> usages) {
        super(null, Path.of("unused"));
        this.usages = usages;
    }

    @Override
    public Set<ClassUsage> analyze(Path targetJar, List<Path> dependencyJars) {
        this.lastTargetJar = targetJar;
        this.lastClasspath = List.copyOf(dependencyJars);
        return usages;
    }

    Path lastTargetJar() {
        return lastTargetJar;
    }

    List<Path> lastClasspath() {
        return lastClasspath;
    }
}
