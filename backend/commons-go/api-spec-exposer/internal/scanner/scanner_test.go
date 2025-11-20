package scanner

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/qubership-apihub-commons-go/api-spec-exposer/config"
)

func TestScannerScanWithHiddenFiles(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "scanner-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	files := map[string][]byte{
		"api.json":     []byte(`{"openapi": "3.0.0", "info": {"title": "API", "version": "1.0.0"}}`),
		".hidden.json": []byte(`{"openapi": "3.0.0", "info": {"title": "Hidden", "version": "1.0.0"}}`),
	}

	for name, content := range files {
		path := filepath.Join(tempDir, name)
		err = os.WriteFile(path, content, 0644)
		if err != nil {
			t.Fatalf("Failed to write test file %s: %v", name, err)
		}
	}

	cfg := config.DiscoveryConfig{
		ScanDirectory:   tempDir,
		ExcludePatterns: []string{},
	}

	scanner := New(cfg)
	specs, warnings, errors := scanner.Scan()

	if len(specs) != 1 {
		t.Fatalf("Expected 1 spec (hidden file excluded), got %d", len(specs))
	}

	if specs[0].Name != "API" {
		t.Errorf("Expected name 'API', got '%s'", specs[0].Name)
	}

	if len(warnings) != 0 {
		t.Errorf("Expected 0 warnings, got %d", len(warnings))
	}

	if len(errors) != 0 {
		t.Errorf("Expected 0 errors, got %d", len(errors))
	}
}

func TestScannerScanInvalidDirectory(t *testing.T) {
	cfg := config.DiscoveryConfig{
		ScanDirectory:   "/nonexistent/directory",
		ExcludePatterns: []string{},
	}

	scanner := New(cfg)
	specs, warnings, errors := scanner.Scan()

	if len(specs) != 0 {
		t.Errorf("Expected 0 specs for invalid directory, got %d", len(specs))
	}

	if len(warnings) != 0 {
		t.Errorf("Expected 0 warnings, got %d", len(warnings))
	}

	if len(errors) != 1 {
		t.Fatalf("Expected 1 error for invalid directory, got %d", len(errors))
	}
}

func TestScannerScanEmptyScanDirectory(t *testing.T) {
	cfg := config.DiscoveryConfig{
		ScanDirectory:   "",
		ExcludePatterns: []string{},
	}

	scanner := New(cfg)
	specs, warnings, errors := scanner.Scan()

	if len(specs) != 0 {
		t.Errorf("Expected 0 specs for empty scan directory, got %d", len(specs))
	}

	if len(warnings) != 0 {
		t.Errorf("Expected 0 warnings, got %d", len(warnings))
	}

	if len(errors) != 1 {
		t.Fatalf("Expected 1 error for empty scan directory, got %d", len(errors))
	}
}

func TestScannerShouldExcludeHiddenFiles(t *testing.T) {
	cfg := config.DiscoveryConfig{
		ScanDirectory:   "/test",
		ExcludePatterns: []string{},
	}

	scanner := New(cfg)

	tests := []struct {
		path     string
		expected bool
	}{
		{"/test/.hidden", true},
		{"/test/.git", true},
		{"/test/visible.txt", false},
		{"/test/path/.hidden", true},
		{"/test/normal/file.txt", false},
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			result := scanner.shouldExclude(tt.path)
			if result != tt.expected {
				t.Errorf("Expected %v for '%s', got %v", tt.expected, tt.path, result)
			}
		})
	}
}

func TestScannerShouldExcludePatterns(t *testing.T) {
	cfg := config.DiscoveryConfig{
		ScanDirectory:   "/test",
		ExcludePatterns: []string{"*.test", "vendor", "tmp"},
	}

	scanner := New(cfg)

	tests := []struct {
		path     string
		expected bool
	}{
		{"/test/file.test", true},
		{"/test/file.txt", false},
		{"/test/vendor", true},
		{"/test/src/main.go", false},
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			result := scanner.shouldExclude(tt.path)
			if result != tt.expected {
				t.Errorf("Expected %v for '%s', got %v", tt.expected, tt.path, result)
			}
		})
	}
}

func TestScannerReadFileNonexistent(t *testing.T) {
	cfg := config.DiscoveryConfig{
		ScanDirectory:   "/test",
		ExcludePatterns: []string{},
	}

	scanner := New(cfg)
	_, err := scanner.readFile("/nonexistent/file.txt")

	if err == nil {
		t.Error("Expected error for nonexistent file, got nil")
	}
}
