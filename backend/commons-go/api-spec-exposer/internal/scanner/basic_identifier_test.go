package scanner

import (
	"testing"

	"github.com/qubership-apihub-commons-go/api-spec-exposer/config"
)

func TestBasicIdentifierCanHandle(t *testing.T) {
	identifier := &BasicIdentifier{}

	tests := []struct {
		path string
	}{
		{"/path/to/file.txt"},
		{"/path/to/file.xml"},
		{"/path/to/file.pdf"},
		{"/path/to/file.bin"},
		{"/path/to/file"},
		{"/path/to/some.unknown.extension"},
		{""},
	}

	// BasicIdentifier should handle any file
	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			result := identifier.CanHandle(tt.path)
			if !result {
				t.Errorf("Expected BasicIdentifier to handle '%s'", tt.path)
			}
		})
	}
}

func TestBasicIdentifierIdentify(t *testing.T) {
	identifier := &BasicIdentifier{}
	content := []byte(`Some arbitrary content that doesn't match any known spec format.`)

	spec, warnings, errors := identifier.Identify("unknown.txt", content)

	if spec == nil {
		t.Fatal("Expected spec to be identified, got nil")
	}

	if spec.Name != "unknown" {
		t.Errorf("Expected name 'unknown', got '%s'", spec.Name)
	}

	if spec.Type != config.DocTypeUnknown {
		t.Errorf("Expected type DocTypeUnknown, got %v", spec.Type)
	}

	if spec.ApiType != config.ApiTypeUnknown {
		t.Errorf("Expected ApiType ApiTypeUnknown, got %v", spec.ApiType)
	}

	if spec.Format != config.FormatUnknown {
		t.Errorf("Expected format FormatUnknown, got %v", spec.Format)
	}

	if spec.FilePath != "unknown.txt" {
		t.Errorf("Expected FilePath 'unknown.txt', got '%s'", spec.FilePath)
	}

	if spec.XApiKind != "BWC" {
		t.Errorf("Expected XApiKind 'BWC', got '%s'", spec.XApiKind)
	}

	if len(warnings) != 0 {
		t.Errorf("Expected no warnings, got %d", len(warnings))
	}

	if len(errors) != 0 {
		t.Errorf("Expected no errors, got %d", len(errors))
	}
}
