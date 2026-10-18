package org.qubership.jdiff.japicmp;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URISyntaxException;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.qubership.jdiff.model.ApiChange;

class JapicmpXmlParserTest {

    @Test
    void parsesGuavaFixtureVersionsAndSemverVerdict() {
        JapicmpResult result = JapicmpXmlParser.parse(guavaFixture(), false);

        assertThat(result.oldVersion()).isEqualTo("32.1.3");
        assertThat(result.newVersion()).isEqualTo("33.4.0");
        assertThat(result.semverVerdict()).isEqualTo("MAJOR");
    }

    @Test
    void parsesGuavaFixtureMethodReturnTypeChange() {
        JapicmpResult result = JapicmpXmlParser.parse(guavaFixture(), false);

        assertThat(result.changes()).anySatisfy(change -> {
            assertThat(change.className()).isEqualTo("com.google.common.graph.Graphs");
            assertThat(change.elementType()).isEqualTo("METHOD");
            assertThat(change.member()).isEqualTo(
                    "com.google.common.collect.ImmutableSet reachableNodes(com.google.common.graph.Graph, java.lang.Object)");
            assertThat(change.status()).isEqualTo("MODIFIED");
            assertThat(change.changeTypes()).contains("METHOD_RETURN_TYPE_CHANGED");
            assertThat(change.breaking()).isTrue();
            assertThat(change.semver()).isEqualTo("MAJOR");
        });
    }

    @Test
    void parsesGuavaFixtureFieldAnnotationChangeOnUnchangedField() {
        JapicmpResult result = JapicmpXmlParser.parse(guavaFixture(), false);

        assertThat(result.changes()).anySatisfy(change -> {
            assertThat(change.className()).isEqualTo("com.google.common.base.Charsets");
            assertThat(change.elementType()).isEqualTo("FIELD");
            assertThat(change.member()).isEqualTo("java.nio.charset.Charset US_ASCII");
            assertThat(change.status()).isEqualTo("UNCHANGED");
            assertThat(change.changeTypes()).contains("ANNOTATION_DEPRECATED_ADDED");
            assertThat(change.breaking()).isFalse();
            assertThat(change.semver()).isEqualTo("PATCH");
        });
    }

    @Test
    void guavaFixtureHasNoUnchangedEntryWithEmptyChangeTypesWhenUnchangedExcluded() {
        JapicmpResult result = JapicmpXmlParser.parse(guavaFixture(), false);

        assertThat(result.changes()).noneMatch(
                change -> "UNCHANGED".equals(change.status()) && change.changeTypes().isEmpty());
    }

    @Test
    void guavaFixtureOrdersClassEntriesBeforeTheirMemberEntries() {
        List<ApiChange> changes = JapicmpXmlParser.parse(guavaFixture(), false).changes();

        Map<String, Integer> firstClassLevelIndexByClassName = new java.util.HashMap<>();
        for (int i = 0; i < changes.size(); i++) {
            ApiChange change = changes.get(i);
            if (change.member() == null) {
                firstClassLevelIndexByClassName.putIfAbsent(change.className(), i);
            }
        }

        for (int i = 0; i < changes.size(); i++) {
            ApiChange change = changes.get(i);
            if (change.member() != null) {
                Integer classIndex = firstClassLevelIndexByClassName.get(change.className());
                if (classIndex != null) {
                    assertThat(classIndex).as("class-level entry for %s should precede member entry at index %d",
                            change.className(), i).isLessThan(i);
                }
            }
        }
    }

    @Test
    void miniFixtureIncludeUnchangedTrueEmitsUnchangedMethodWithNoneSemver() {
        JapicmpResult result = JapicmpXmlParser.parse(miniFixture(), true);

        assertThat(result.changes()).anySatisfy(change -> {
            assertThat(change.member()).contains("unchangedMethod");
            assertThat(change.status()).isEqualTo("UNCHANGED");
            assertThat(change.semver()).isEqualTo("NONE");
        });
    }

    @Test
    void miniFixtureIncludeUnchangedFalseOmitsUnchangedMethod() {
        JapicmpResult result = JapicmpXmlParser.parse(miniFixture(), false);

        assertThat(result.changes()).noneMatch(change -> change.member() != null
                && change.member().contains("unchangedMethod"));
    }

    @Test
    void miniFixtureRemovedMethodIsBreaking() {
        JapicmpResult result = JapicmpXmlParser.parse(miniFixture(), false);

        assertThat(result.changes()).anySatisfy(change -> {
            assertThat(change.member()).isEqualTo("void removedMethod(java.lang.String)");
            assertThat(change.status()).isEqualTo("REMOVED");
            assertThat(change.breaking()).isTrue();
            assertThat(change.semver()).isEqualTo("MAJOR");
        });
    }

    @Test
    void miniFixtureRemovedClassFallsBackToOldTypeForElementType() {
        JapicmpResult result = JapicmpXmlParser.parse(miniFixture(), false);

        assertThat(result.changes()).anySatisfy(change -> {
            assertThat(change.className()).isEqualTo("com.example.RemovedClass");
            assertThat(change.member()).isNull();
            assertThat(change.elementType()).isEqualTo("CLASS");
            assertThat(change.status()).isEqualTo("REMOVED");
            assertThat(change.breaking()).isTrue();
            assertThat(change.semver()).isEqualTo("MAJOR");
        });
    }

    @Test
    void miniFixtureNewClassIsEmittedAsClassLevelEntry() {
        JapicmpResult result = JapicmpXmlParser.parse(miniFixture(), false);

        assertThat(result.changes()).anySatisfy(change -> {
            assertThat(change.className()).isEqualTo("com.example.NewClass");
            assertThat(change.member()).isNull();
            assertThat(change.elementType()).isEqualTo("CLASS");
            assertThat(change.status()).isEqualTo("NEW");
            assertThat(change.breaking()).isFalse();
            assertThat(change.semver()).isEqualTo("MINOR");
        });
    }

    @Test
    void parsesClassFileFormatVersionChangeIntoDetails() {
        JapicmpResult result = JapicmpXmlParser.parse(classFileFormatFixture(), false);

        assertThat(result.changes()).anySatisfy(change -> {
            assertThat(change.className()).isEqualTo(
                    "com.netcracker.cloud.dbaas.client.config.SpringDbaasApiProperties");
            assertThat(change.status()).isEqualTo("MODIFIED");
            assertThat(change.changeTypes()).isEmpty();
            assertThat(change.details()).isEqualTo(
                    "Class file format version: 61.0 (Java 17) -> 65.0 (Java 21)");
            assertThat(change.breaking()).isFalse();
            assertThat(change.semver()).isEqualTo("PATCH");
        });
    }

    private static Path classFileFormatFixture() {
        return resource("/japicmp/class-file-format-report.xml");
    }

    private static Path guavaFixture() {
        return resource("/japicmp/guava-report.xml");
    }

    private static Path miniFixture() {
        return resource("/japicmp/mini-report.xml");
    }

    private static Path resource(String name) {
        try {
            return Path.of(JapicmpXmlParserTest.class.getResource(name).toURI());
        } catch (URISyntaxException e) {
            throw new IllegalStateException(e);
        }
    }
}
