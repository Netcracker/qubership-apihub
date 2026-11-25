package view

import "slices"

type Severity string

const Annotation Severity = "annotation"
const Breaking Severity = "breaking"
const SemiBreaking Severity = "semi-breaking"
const Deprecated Severity = "deprecated"
const NonBreaking Severity = "non-breaking"
const Unclassified Severity = "unclassified"

// Severities lists every change severity, from the most to the least critical.
var Severities = []Severity{Breaking, SemiBreaking, Deprecated, NonBreaking, Annotation, Unclassified}

// HasInvalidSeverity reports whether severities holds a value that is not one of Severities, and returns the first
// such value.
func HasInvalidSeverity(severities []string) (string, bool) {
	for _, severity := range severities {
		if !slices.Contains(Severities, Severity(severity)) {
			return severity, true
		}
	}
	return "", false
}
