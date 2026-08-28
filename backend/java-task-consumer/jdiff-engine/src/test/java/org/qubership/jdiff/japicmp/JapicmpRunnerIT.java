package org.qubership.jdiff.japicmp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.api.io.TempDir;
import org.qubership.jdiff.tools.ExternalToolRunner;

/**
 * Runs the real japicmp jar against itself. Enabled only with {@code -Djdiff.it=true}.
 */
@EnabledIfSystemProperty(named = "jdiff.it", matches = "true")
class JapicmpRunnerIT {

    @Test
    void comparingTheJapicmpJarWithItselfProducesAFullNonBreakingInventory(@TempDir Path tempDir) {
        Path japicmpJar = Path.of("..", "japicmp", "japicmp-0.26.1-jar-with-dependencies.jar").normalize();
        assumeTrue(Files.isRegularFile(japicmpJar), "japicmp jar not found at " + japicmpJar.toAbsolutePath());

        JapicmpRunner runner = new JapicmpRunner(new ExternalToolRunner(), japicmpJar);
        Path outputXml = tempDir.resolve("self-compare.xml");

        Path result = runner.compare(japicmpJar, japicmpJar, outputXml, JapicmpOptions.fullApiDefaults());

        assertThat(result).isEqualTo(outputXml);
        assertThat(outputXml).isRegularFile();

        JapicmpResult parsed = JapicmpXmlParser.parse(outputXml, true);
        assertThat(parsed.changes()).isNotEmpty();
        assertThat(parsed.changes()).allSatisfy(change -> assertThat(change.breaking()).isFalse());
    }
}
