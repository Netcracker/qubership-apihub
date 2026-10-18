package org.qubership.jdiff.pipeline;

import java.nio.file.Path;
import org.qubership.jdiff.japicmp.JapicmpResult;

/**
 * Test double that records the arguments of its last {@link #compare(Path, Path, boolean)} call
 * and returns a canned {@link JapicmpResult}.
 */
class FakeJarComparator implements JarComparator {

    private final JapicmpResult result;

    Path lastOldJar;
    Path lastNewJar;
    boolean lastFullApi;
    int callCount;

    FakeJarComparator(JapicmpResult result) {
        this.result = result;
    }

    @Override
    public JapicmpResult compare(Path oldJar, Path newJar, boolean fullApi) {
        this.lastOldJar = oldJar;
        this.lastNewJar = newJar;
        this.lastFullApi = fullApi;
        this.callCount++;
        return result;
    }
}
