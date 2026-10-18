package org.qubership.jdiff.jdeps;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.qubership.jdiff.tools.ExternalToolRunner;

import static org.assertj.core.api.Assertions.assertThat;

@EnabledIfSystemProperty(named = "jdiff.it", matches = "true")
class JdepsRunnerIT {

    private static final Path TARGET_JAR =
            Path.of("..", "japicmp", "japicmp-0.26.1-jar-with-dependencies.jar").normalize();

    @Test
    void analyzesRealJarWithEmptyDependencyListWithoutThrowing() {
        Assumptions.assumeTrue(Files.exists(TARGET_JAR), "Fixture jar not present: " + TARGET_JAR);

        JdepsRunner jdepsRunner = new JdepsRunner(new ExternalToolRunner());

        Set<ClassUsage> usages = jdepsRunner.analyze(TARGET_JAR, List.of());

        assertThat(usages).isEmpty();
    }
}
