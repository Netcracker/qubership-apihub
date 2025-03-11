package utils

import (
	"reflect"
	"testing"
)

func TestSplitPackageId(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected []string
	}{
		{
			name:     "empty string",
			input:    "",
			expected: []string{""},
		},
		{
			name:     "single part",
			input:    "a",
			expected: []string{"a"},
		},
		{
			name:     "two parts",
			input:    "a.b",
			expected: []string{"a.b", "a"},
		},
		{
			name:     "three parts",
			input:    "a.b.c",
			expected: []string{"a.b.c", "a", "a.b"},
		},
		{
			name:     "four parts",
			input:    "a.b.c.d",
			expected: []string{"a.b.c.d", "a", "a.b", "a.b.c"},
		},
		{
			name:     "package with empty parts",
			input:    "a..b",
			expected: []string{"a..b", "a", "a."},
		},
		{
			name:     "ends with dot",
			input:    "a.b.",
			expected: []string{"a.b.", "a", "a.b"},
		},
		{
			name:     "single dot",
			input:    ".",
			expected: []string{".", ""},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := GetPackageHierarchy(tt.input)
			if !reflect.DeepEqual(got, tt.expected) {
				t.Errorf("GetPackageHierarchy(%q) = %v, want %v", tt.input, got, tt.expected)
			}
		})
	}
}
