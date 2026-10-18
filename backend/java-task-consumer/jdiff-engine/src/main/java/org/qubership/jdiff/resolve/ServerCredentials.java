package org.qubership.jdiff.resolve;

/**
 * Username/password pair for a Maven settings.xml {@code <server>} entry.
 */
public record ServerCredentials(String username, String password) {
}
