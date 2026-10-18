package org.qubership.jdiff.japicmp;

import java.util.List;
import org.qubership.jdiff.model.ApiChange;

/**
 * Parsed outcome of a japicmp XML report.
 *
 * @param oldVersion    the {@code oldVersion} attribute of the japicmp report root
 * @param newVersion    the {@code newVersion} attribute of the japicmp report root
 * @param semverVerdict {@code MAJOR|MINOR|PATCH}, derived from the report's {@code semanticVersioning}
 *                      attribute, or {@code null} when it is absent or unrecognized
 * @param changes       API changes in document order, class entries before their member entries
 */
public record JapicmpResult(String oldVersion, String newVersion, String semverVerdict, List<ApiChange> changes) {
}
