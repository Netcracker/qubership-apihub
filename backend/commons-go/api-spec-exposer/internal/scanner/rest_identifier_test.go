package scanner

import (
	"testing"

	"github.com/Netcracker/qubership-apihub-commons-go/api-spec-exposer/config"
)

func TestRestIdentifierCanHandle(t *testing.T) {
	identifier := &RestIdentifier{}

	tests := []struct {
		path     string
		expected bool
	}{
		{"/path/to/spec.json", true},
		{"/path/to/spec.yaml", true},
		{"/path/to/spec.yml", true},
		{"/path/to/spec.JSON", true},
		{"/path/to/spec.YAML", true},
		{"/path/to/spec.graphql", false},
		{"/path/to/spec.md", false},
		{"/path/to/spec.txt", false},
		{"/path/to/spec", false},
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			result := identifier.CanHandle(tt.path)
			if result != tt.expected {
				t.Errorf("Expected %v, got %v", tt.expected, result)
			}
		})
	}
}

func TestRestIdentifierIdentifyOpenAPI31(t *testing.T) {
	identifier := &RestIdentifier{}
	content := []byte(`{
		"openapi": "3.1.0",
		"info": {
			"title": "Test API",
			"version": "1.0.0"
		}
	}`)

	spec, warnings, errors := identifier.Identify("test.json", content)

	if spec == nil {
		t.Fatal("Expected spec to be identified, got nil")
	}

	if spec.Name != "Test API" {
		t.Errorf("Expected name 'Test API', got '%s'", spec.Name)
	}

	if spec.Type != config.DocTypeOpenAPI31 {
		t.Errorf("Expected type DocTypeOpenAPI31, got %v", spec.Type)
	}

	if spec.ApiType != config.ApiTypeRest {
		t.Errorf("Expected ApiType ApiTypeRest, got %v", spec.ApiType)
	}

	if spec.Format != config.FormatJSON {
		t.Errorf("Expected format FormatJSON, got %v", spec.Format)
	}

	if spec.FilePath != "test.json" {
		t.Errorf("Expected FilePath 'test.json', got '%s'", spec.FilePath)
	}

	if len(warnings) != 0 {
		t.Errorf("Expected no warnings, got %d", len(warnings))
	}

	if len(errors) != 0 {
		t.Errorf("Expected no errors, got %d", len(errors))
	}
}

func TestRestIdentifierIdentifyOpenAPI30(t *testing.T) {
	identifier := &RestIdentifier{}
	content := []byte(`{
		"openapi": "3.0.0",
		"info": {
			"title": "Test API",
			"version": "1.0.0"
		}
	}`)

	spec, warnings, errors := identifier.Identify("test.json", content)

	if spec == nil {
		t.Fatal("Expected spec to be identified, got nil")
	}

	if spec.Type != config.DocTypeOpenAPI30 {
		t.Errorf("Expected type DocTypeOpenAPI30, got %v", spec.Type)
	}

	if spec.ApiType != config.ApiTypeRest {
		t.Errorf("Expected ApiType ApiTypeRest, got %v", spec.ApiType)
	}

	if len(warnings) != 0 {
		t.Errorf("Expected no warnings, got %d", len(warnings))
	}

	if len(errors) != 0 {
		t.Errorf("Expected no errors, got %d", len(errors))
	}
}

func TestRestIdentifierIdentifySwagger20(t *testing.T) {
	identifier := &RestIdentifier{}
	content := []byte(`{
		"swagger": "2.0",
		"info": {
			"title": "Swagger API",
			"version": "1.0.0"
		}
	}`)

	spec, warnings, errors := identifier.Identify("swagger.json", content)

	if spec == nil {
		t.Fatal("Expected spec to be identified, got nil")
	}

	if spec.Type != config.DocTypeOpenAPI20 {
		t.Errorf("Expected type DocTypeOpenAPI20, got %v", spec.Type)
	}

	if spec.Name != "Swagger API" {
		t.Errorf("Expected name 'Swagger API', got '%s'", spec.Name)
	}

	if len(warnings) != 0 {
		t.Errorf("Expected no warnings, got %d", len(warnings))
	}

	if len(errors) != 0 {
		t.Errorf("Expected no errors, got %d", len(errors))
	}
}

func TestRestIdentifierIdentifyYAML(t *testing.T) {
	identifier := &RestIdentifier{}
	content := []byte("openapi: 3.0.0\n" +
		"info:\n" +
		"  title: YAML API\n" +
		"  version: 1.0.0")

	spec, warnings, errors := identifier.Identify("test.yaml", content)

	if spec == nil {
		t.Fatal("Expected spec to be identified, got nil")
	}

	if spec.Name != "YAML API" {
		t.Errorf("Expected name 'YAML API', got '%s'", spec.Name)
	}

	if spec.Format != config.FormatYAML {
		t.Errorf("Expected format FormatYAML, got %v", spec.Format)
	}

	if spec.Type != config.DocTypeOpenAPI30 {
		t.Errorf("Expected type DocTypeOpenAPI30, got %v", spec.Type)
	}

	if len(warnings) != 0 {
		t.Errorf("Expected no warnings, got %d", len(warnings))
	}

	if len(errors) != 0 {
		t.Errorf("Expected no errors, got %d", len(errors))
	}
}

func TestRestIdentifierIdentifyWithoutInfo(t *testing.T) {
	identifier := &RestIdentifier{}
	content := []byte(`{
		"openapi": "3.0.0"
	}`)

	spec, warnings, errors := identifier.Identify("test.json", content)

	if spec == nil {
		t.Fatal("Expected spec to be identified, got nil")
	}

	if spec.Name != "test" {
		t.Errorf("Expected name 'test' (from filename), got '%s'", spec.Name)
	}

	if len(warnings) != 1 {
		t.Errorf("Expected 1 warning, got %d", len(warnings))
	} else if warnings[0] == "" {
		t.Error("Expected warning message to be non-empty")
	}

	if len(errors) != 0 {
		t.Errorf("Expected no errors, got %d", len(errors))
	}
}

func TestRestIdentifierIdentifyWithoutTitle(t *testing.T) {
	identifier := &RestIdentifier{}
	content := []byte(`{
		"openapi": "3.0.0",
		"info": {
			"version": "1.0.0"
		}
	}`)

	spec, warnings, errors := identifier.Identify("test.json", content)

	if spec == nil {
		t.Fatal("Expected spec to be identified, got nil")
	}

	if spec.Name != "test" {
		t.Errorf("Expected name 'test' (from filename), got '%s'", spec.Name)
	}

	if len(warnings) != 1 {
		t.Errorf("Expected 1 warning, got %d", len(warnings))
	}

	if len(errors) != 0 {
		t.Errorf("Expected no errors, got %d", len(errors))
	}
}

func TestRestIdentifierIdentifyWithEmptyTitle(t *testing.T) {
	identifier := &RestIdentifier{}
	content := []byte(`{
		"openapi": "3.0.0",
		"info": {
			"title": "",
			"version": "1.0.0"
		}
	}`)

	spec, warnings, errors := identifier.Identify("test.json", content)

	if spec == nil {
		t.Fatal("Expected spec to be identified, got nil")
	}

	if spec.Name != "test" {
		t.Errorf("Expected name 'test' (from filename), got '%s'", spec.Name)
	}

	if len(warnings) != 1 {
		t.Errorf("Expected 1 warning, got %d", len(warnings))
	}

	if len(errors) != 0 {
		t.Errorf("Expected no errors, got %d", len(errors))
	}
}

func TestRestIdentifierIdentifyWithXApiKind(t *testing.T) {
	tests := []struct {
		name          string
		xApiKind      string
		expectedValue string
		expectWarning bool
	}{
		{
			name:          "Valid BWC",
			xApiKind:      "BWC",
			expectedValue: "BWC",
			expectWarning: false,
		},
		{
			name:          "Valid no-BWC",
			xApiKind:      "no-BWC",
			expectedValue: "no-BWC",
			expectWarning: false,
		},
		{
			name:          "Valid lowercase bwc",
			xApiKind:      "bwc",
			expectedValue: "bwc",
			expectWarning: false,
		},
		{
			name:          "Invalid value",
			xApiKind:      "invalid",
			expectedValue: "BWC",
			expectWarning: true,
		},
		{
			name:          "Empty value",
			xApiKind:      "",
			expectedValue: "BWC",
			expectWarning: false,
		},
	}

	identifier := &RestIdentifier{}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var content string
			if tt.xApiKind == "" {
				content = `{
					"openapi": "3.0.0",
					"info": {"title": "Test"}
				}`
			} else {
				content = `{
					"openapi": "3.0.0",
					"info": {"title": "Test"},
					"x-api-kind": "` + tt.xApiKind + `"
				}`
			}

			spec, warnings, errors := identifier.Identify("test.json", []byte(content))

			if spec == nil {
				t.Fatal("Expected spec to be identified, got nil")
			}

			if spec.XApiKind != tt.expectedValue {
				t.Errorf("Expected XApiKind '%s', got '%s'", tt.expectedValue, spec.XApiKind)
			}

			if tt.expectWarning && len(warnings) == 0 {
				t.Error("Expected warning, got none")
			}

			if !tt.expectWarning && len(warnings) > 0 {
				t.Errorf("Expected no warnings, got %d: %v", len(warnings), warnings)
			}

			if len(errors) != 0 {
				t.Errorf("Expected no errors, got %d", len(errors))
			}
		})
	}
}

func TestRestIdentifierIdentifyNotOpenAPI(t *testing.T) {
	identifier := &RestIdentifier{}
	content := []byte(`{
		"name": "Not an OpenAPI spec",
		"version": "1.0.0"
	}`)

	spec, warnings, errors := identifier.Identify("test.json", content)

	if spec != nil {
		t.Error("Expected spec to be nil for non-OpenAPI content")
	}

	if len(warnings) != 0 {
		t.Errorf("Expected no warnings, got %d", len(warnings))
	}

	if len(errors) != 0 {
		t.Errorf("Expected no errors, got %d", len(errors))
	}
}

func TestRestIdentifierIdentifyInvalidJSON(t *testing.T) {
	identifier := &RestIdentifier{}
	content := []byte(`{invalid json}`)

	spec, warnings, errors := identifier.Identify("test.json", content)

	if spec != nil {
		t.Error("Expected spec to be nil for invalid JSON")
	}

	if len(warnings) != 0 {
		t.Errorf("Expected no warnings, got %d", len(warnings))
	}

	if len(errors) != 1 {
		t.Errorf("Expected 1 error, got %d", len(errors))
	}
}

func TestRestIdentifierIdentifyInvalidYAML(t *testing.T) {
	identifier := &RestIdentifier{}
	content := []byte("openapi: 3.0.0\n" +
		"  invalid: [unclosed")

	spec, warnings, errors := identifier.Identify("test.yaml", content)

	if spec != nil {
		t.Error("Expected spec to be nil for invalid YAML")
	}

	if len(warnings) != 0 {
		t.Errorf("Expected no warnings, got %d", len(warnings))
	}

	if len(errors) != 1 {
		t.Errorf("Expected 1 error, got %d", len(errors))
	}
}
