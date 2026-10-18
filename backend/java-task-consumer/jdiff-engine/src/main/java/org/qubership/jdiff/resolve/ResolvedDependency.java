package org.qubership.jdiff.resolve;

import org.qubership.jdiff.model.Gav;

/**
 * A dependency of a Maven module, with its scope and effective version already resolved.
 *
 * @param gav      coordinate including the resolved version
 * @param scope    Maven scope ({@code compile}, {@code runtime}, {@code provided}, …)
 * @param optional whether the dependency is optional
 * @param depth    0 for a direct dependency, &gt;0 for a transitive one
 */
public record ResolvedDependency(Gav gav, String scope, boolean optional, int depth) {

    /**
     * Convenience for direct dependencies ({@code depth == 0}).
     */
    public ResolvedDependency(Gav gav, String scope, boolean optional) {
        this(gav, scope, optional, 0);
    }

    public boolean direct() {
        return depth == 0;
    }
}
