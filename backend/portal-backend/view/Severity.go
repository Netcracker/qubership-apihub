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

func ValidSeverity(s string) bool {
	return slices.Contains(Severities, Severity(s))
}

// FindInvalidSeverity returns the first value that is not one of Severities, and false when every value is valid.
func FindInvalidSeverity(severities []string) (string, bool) {
	for _, severity := range severities {
		if !ValidSeverity(severity) {
			return severity, true
		}
	}
	return "", false
}
