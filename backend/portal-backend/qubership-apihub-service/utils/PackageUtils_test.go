package utils

import (
	"reflect"
	"testing"
)

func TestGetParentPackageIds(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected []string
	}{
		{
			name:     "empty string",
			input:    "",
			expected: []string{},
		},
		{
			name:     "single part",
			input:    "a",
			expected: []string{},
		},
		{
			name:     "two parts",
			input:    "a.b",
			expected: []string{"a"},
		},
		{
			name:     "three parts",
			input:    "a.b.c",
			expected: []string{"a", "a.b"},
		},
		{
			name:     "four parts",
			input:    "a.b.c.d",
			expected: []string{"a", "a.b", "a.b.c"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := GetParentPackageIds(tt.input)
			if !reflect.DeepEqual(got, tt.expected) {
				t.Errorf("GetParentPackageIds(%q) = %v, want %v", tt.input, got, tt.expected)
			}
		})
	}
}

func TestGetPackageHierarchy(t *testing.T) {
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
			expected: []string{"a", "a.b"},
		},
		{
			name:     "three parts",
			input:    "a.b.c",
			expected: []string{"a", "a.b", "a.b.c"},
		},
		{
			name:     "four parts",
			input:    "a.b.c.d",
			expected: []string{"a", "a.b", "a.b.c", "a.b.c.d"},
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
