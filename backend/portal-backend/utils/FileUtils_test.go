package utils

import "testing"

func TestSanitizeFilename(t *testing.T) {
	tests := []struct {
		name     string
		filename string
		fallback string
		expected string
	}{
		{"safe filename preserved", "good-name.yaml", "template", "good-name.yaml"},
		{"unsafe chars stripped, extension kept", "bad§name.json", "template", "badname.json"},
		{"all-unsafe base uses fallback with extension", "файл.yaml", "template", "template.yaml"},
		{"no extension, all-unsafe base uses fallback", "файл", "template", "template"},
		{"path traversal stripped", "../../etc/passwd.yaml", "template", "passwd.yaml"},
		{"double extension collapsed", "file.php.yaml", "template", "filephp.yaml"},
		{"double extension with non-standard ext", "file.php.txt", "template", "filephp.txt"},
		{"dots-only base uses fallback with extension", "...yaml", "template", "template.yaml"},
		{"underscore and hyphen preserved", "my_file-v2.yml", "template", "my_file-v2.yml"},
		{"empty filename uses fallback", "", "template", "template"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := SanitizeFilename(tt.filename, tt.fallback)
			if got != tt.expected {
				t.Errorf("SanitizeFilename(%q, %q) = %q, want %q", tt.filename, tt.fallback, got, tt.expected)
			}
		})
	}
}
