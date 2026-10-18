package org.qubership.jdiff.jdeps;

/**
 * One class-level dependency edge reported by jdeps.
 *
 * @param ownerClass  FQCN inside the analyzed target jar
 *                     (e.g. {@code "com.puppycrawl.tools.checkstyle.Main$CliOptions"})
 * @param usedClass   FQCN provided by a dependency jar (e.g. {@code "picocli.CommandLine$Option"})
 * @param providerJar file name of the dependency jar as printed by jdeps (e.g. {@code "picocli-4.7.7.jar"})
 */
public record ClassUsage(String ownerClass, String usedClass, String providerJar) {
}
