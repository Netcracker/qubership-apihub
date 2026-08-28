package org.qubership.jdiff.jdeps;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JdepsOutputParserTest {

    private static final String FIXTURE = "/jdeps/jdeps-picocli-report.txt";

    @Test
    void parsesFixtureIntoExpectedUsageCount() {
        Set<ClassUsage> usages = JdepsOutputParser.parse(readFixture(), Set.of("picocli-4.7.7.jar"));

        assertThat(usages).hasSize(15);
    }

    @Test
    void containsExpectedClassUsage() {
        Set<ClassUsage> usages = JdepsOutputParser.parse(readFixture(), Set.of("picocli-4.7.7.jar"));

        assertThat(usages).contains(new ClassUsage(
                "com.puppycrawl.tools.checkstyle.Main",
                "picocli.CommandLine$ParseResult",
                "picocli-4.7.7.jar"));
    }

    @Test
    void ownerSetMatchesCheckstyleClassesInFixture() {
        Set<ClassUsage> usages = JdepsOutputParser.parse(readFixture(), Set.of("picocli-4.7.7.jar"));

        assertThat(usages.stream().map(ClassUsage::ownerClass)).containsExactlyInAnyOrder(
                "com.puppycrawl.tools.checkstyle.JavadocPropertiesGenerator",
                "com.puppycrawl.tools.checkstyle.JavadocPropertiesGenerator",
                "com.puppycrawl.tools.checkstyle.JavadocPropertiesGenerator",
                "com.puppycrawl.tools.checkstyle.JavadocPropertiesGenerator$CliOptions",
                "com.puppycrawl.tools.checkstyle.JavadocPropertiesGenerator$CliOptions",
                "com.puppycrawl.tools.checkstyle.JavadocPropertiesGenerator$CliOptions",
                "com.puppycrawl.tools.checkstyle.JavadocPropertiesGenerator$CliOptions",
                "com.puppycrawl.tools.checkstyle.Main",
                "com.puppycrawl.tools.checkstyle.Main",
                "com.puppycrawl.tools.checkstyle.Main",
                "com.puppycrawl.tools.checkstyle.Main$CliOptions",
                "com.puppycrawl.tools.checkstyle.Main$CliOptions",
                "com.puppycrawl.tools.checkstyle.Main$CliOptions",
                "com.puppycrawl.tools.checkstyle.Main$CliOptions",
                "com.puppycrawl.tools.checkstyle.Main$CliOptions");
        assertThat(usages.stream().map(ClassUsage::ownerClass).distinct()).containsExactlyInAnyOrder(
                "com.puppycrawl.tools.checkstyle.JavadocPropertiesGenerator",
                "com.puppycrawl.tools.checkstyle.JavadocPropertiesGenerator$CliOptions",
                "com.puppycrawl.tools.checkstyle.Main",
                "com.puppycrawl.tools.checkstyle.Main$CliOptions");
    }

    @Test
    void jarLevelHeaderLineProducesNoUsage() {
        Set<ClassUsage> usages = JdepsOutputParser.parse(readFixture(), Set.of("picocli-4.7.7.jar"));

        assertThat(usages).noneMatch(usage ->
                usage.ownerClass().equals("checkstyle-13.9.0.jar")
                        || usage.usedClass().contains("checkstyle-13.9.0.jar"));
    }

    @Test
    void emptyAllowedSetYieldsEmptyResult() {
        Set<ClassUsage> usages = JdepsOutputParser.parse(readFixture(), Set.of());

        assertThat(usages).isEmpty();
    }

    @Test
    void dropsLinesWithJdkModuleOrNotFoundProviders() {
        String synthetic = String.join("\n",
                "target.jar -> java.base",
                "target.jar -> dep.jar",
                "   com.example.Owner -> java.lang.String                 java.base",
                "   com.example.Owner -> com.example.other.Missing        not found",
                "   com.example.Owner -> com.example.dep.Used             dep.jar");

        Set<ClassUsage> usages = JdepsOutputParser.parse(synthetic, Set.of("dep.jar"));

        assertThat(usages).containsExactly(
                new ClassUsage("com.example.Owner", "com.example.dep.Used", "dep.jar"));
    }

    private static String readFixture() {
        try (InputStream in = JdepsOutputParserTest.class.getResourceAsStream(FIXTURE)) {
            if (in == null) {
                throw new IllegalStateException("Fixture not found on classpath: " + FIXTURE);
            }
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
