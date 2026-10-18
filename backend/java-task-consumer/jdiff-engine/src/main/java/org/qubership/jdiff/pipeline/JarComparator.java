package org.qubership.jdiff.pipeline;

import java.nio.file.Path;
import org.qubership.jdiff.japicmp.JapicmpResult;

/**
 * Seam over the japicmp runner and parser so pipelines are unit-testable without spawning processes.
 */
public interface JarComparator {

    /**
     * Compares {@code oldJar} against {@code newJar}.
     *
     * @param oldJar  the old jar
     * @param newJar  the new jar
     * @param fullApi whether to compute the full API inventory (old = new jar) rather than just
     *                the differences
     * @return the parsed comparison result
     */
    JapicmpResult compare(Path oldJar, Path newJar, boolean fullApi);
}
