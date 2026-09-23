package org.qubership.jdiff.resolve;

import java.nio.file.Path;
import java.util.List;
import org.qubership.jdiff.model.Gav;

/**
 * Application JAR and packaged library coordinates discovered from a materialized {@code /app}
 * directory (Quarkus fast-jar or a single service JAR).
 *
 * @param applicationJar     JAR used for jdeps (Quarkus {@code app/*.jar}, or the explicit/single
 *                           service JAR)
 * @param applicationGav     coordinate from the application JAR's {@code pom.properties}, if any
 * @param packagedLibraries  library GAV versions found in the image; the application itself is
 *                           excluded
 */
public record ImageClasspath(
        Path applicationJar,
        Gav applicationGav,
        List<ResolvedDependency> packagedLibraries
) {
}
