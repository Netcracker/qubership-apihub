package utils

import "testing"

func TestSplitFileId(t *testing.T) {
	tests := []struct {
		name     string
		fileId   string
		wantDir  string
		wantName string
	}{
		{"nested file", "specs/openapi.yaml", "specs", "openapi.yaml"},
		{"deeper nesting", "a/b/c.json", "a/b", "c.json"},
		{"file with no directory", "openapi.yaml", "", "openapi.yaml"},
		{"absolute file id", "/openapi.yaml", "", "openapi.yaml"},
		{"directory with trailing slash", "a/b/", "a/b", ""},
		{"single directory with trailing slash", "specs/", "specs", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotDir, gotName := SplitFileId(tt.fileId)
			if gotDir != tt.wantDir || gotName != tt.wantName {
				t.Errorf("SplitFileId(%q) = (%q, %q), want (%q, %q)", tt.fileId, gotDir, gotName, tt.wantDir, tt.wantName)
			}
		})
	}
}
