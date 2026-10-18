package org.qubership.jdiff.resolve;

/**
 * A single remote Maven repository: an identifier and its base URL.
 */
public record RemoteRepo(String id, String url) {
}
