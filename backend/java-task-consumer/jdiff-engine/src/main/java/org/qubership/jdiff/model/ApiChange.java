package org.qubership.jdiff.model;

import java.util.List;

/**
 * A single API-level change detected between two versions of an artifact.
 *
 * @param className         fully-qualified class name the change belongs to
 * @param elementType       one of {@code CLASS|INTERFACE|ENUM|ANNOTATION|METHOD|CONSTRUCTOR|FIELD}
 *                          (plain string, not an enum — the japicmp vocabulary may grow)
 * @param member            member signature, {@code null} for class-level entries
 * @param status            one of {@code NEW|REMOVED|MODIFIED|UNCHANGED}
 * @param changeTypes       japicmp compatibility-change codes, e.g. {@code METHOD_REMOVED}
 * @param details           human-readable summary of non-compatibility changes (e.g. class file format),
 *                          {@code null} when there is nothing extra to report
 * @param binaryCompatible  whether the change is binary compatible, may be {@code null}
 * @param sourceCompatible  whether the change is source compatible, may be {@code null}
 * @param breaking          whether the change is considered breaking
 * @param semver            one of {@code MAJOR|MINOR|PATCH|NONE}
 * @param usedBy            consumers of the changed element; {@code null}/empty except in upgrade-impact mode
 */
public record ApiChange(String className, String elementType, String member, String status,
                         List<String> changeTypes, String details, Boolean binaryCompatible, Boolean sourceCompatible,
                         boolean breaking, String semver, List<UsageRef> usedBy) {
}
