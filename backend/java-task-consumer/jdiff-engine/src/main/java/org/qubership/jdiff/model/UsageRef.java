package org.qubership.jdiff.model;

import java.util.List;

/**
 * A reference to a module and the consumer classes within it that use a changed API element.
 *
 * @param module  {@code g:a} of the consuming module
 * @param classes fully-qualified consumer class names
 */
public record UsageRef(String module, List<String> classes) {
}
