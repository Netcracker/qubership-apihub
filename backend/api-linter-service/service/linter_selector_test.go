package service

import (
	"testing"
)

func TestMatchesPackagePattern(t *testing.T) {
	tests := []struct {
		name      string
		packageId string
		pattern   string
		want      bool
	}{
		// Exact match (no wildcard)
		{"exact match", "A.B.C", "A.B.C", true},
		{"exact match single segment", "A", "A", true},
		{"exact mismatch", "A.B.C", "A.B.D", false},
		{"exact wrong length", "A.B", "A.B.C", false},
		{"exact wrong length reverse", "A.B.C", "A.B", false},

		// Trailing * - matches any number of segments (0 or more)
		{"A.* matches A (zero segments)", "A", "A.*", true},
		{"A.* matches A.B (one segment)", "A.B", "A.*", true},
		{"A.* matches A.B.C (multiple segments)", "A.B.C", "A.*", true},
		{"A.* matches A.B.C.D", "A.B.C.D", "A.*", true},
		{"A.B.* matches A.B (zero segments)", "A.B", "A.B.*", true},
		{"A.B.* matches A.B.C (one segment)", "A.B.C", "A.B.*", true},
		{"A.B.* matches A.B.C.D (multiple segments)", "A.B.C.D", "A.B.*", true},
		{"A.B.* does not match A (prefix too short)", "A", "A.B.*", false},
		{"A.B.* does not match A.C (prefix mismatch)", "A.C", "A.B.*", false},

		// * alone matches everything
		{"* matches empty", "", "*", true},
		{"* matches single", "A", "*", true},
		{"* matches multiple", "A.B.C.D", "*", true},

		// Empty and edge cases
		{"empty pattern and empty packageId", "", "", true},
		{"empty pattern with packageId", "A.B", "", false},
		{"empty packageId with non-empty pattern", "", "A.*", false},

		// Exact match with * in middle (single segment)
		{"A.*.C matches A.B.C", "A.B.C", "A.*.C", true},
		{"A.*.C does not match A.B.D", "A.B.D", "A.*.C", false},
		{"A.*.C does not match A.B.C.D", "A.B.C.D", "A.*.C", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := matchesPackagePattern(tt.packageId, tt.pattern)
			if got != tt.want {
				t.Errorf("matchesPackagePattern(%v, %v) = %v, want %v", tt.packageId, tt.pattern, got, tt.want)
			}
		})
	}
}
