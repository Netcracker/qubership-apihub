package org.qubership.jdiff.resolve;

import java.nio.file.Path;
import org.qubership.jdiff.model.Gav;

/**
 * A single module of a scanned multi-module Maven project.
 *
 * @param targetJar {@code <moduleDir>/target/<artifactId>-<version>.jar} if that file exists, else {@code null}
 */
public record MavenModule(Gav gav, Path pomFile, String packaging, Path targetJar) {
}
