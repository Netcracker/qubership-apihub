package scanner

import (
	"path/filepath"
	"testing"
)

func TestParseJSON(t *testing.T) {
	tests := []struct {
		name      string
		content   []byte
		expectErr bool
		validate  func(*testing.T, map[string]interface{})
	}{
		{
			name:      "Valid JSON",
			content:   []byte(`{"name": "test", "version": "1.0"}`),
			expectErr: false,
			validate: func(t *testing.T, data map[string]interface{}) {
				if data["name"] != "test" {
					t.Errorf("Expected name 'test', got %v", data["name"])
				}
				if data["version"] != "1.0" {
					t.Errorf("Expected version '1.0', got %v", data["version"])
				}
			},
		},
		{
			name:      "Invalid JSON",
			content:   []byte(`{"name": "test", invalid}`),
			expectErr: true,
			validate:  nil,
		},
		{
			name:      "Empty JSON object",
			content:   []byte(`{}`),
			expectErr: false,
			validate: func(t *testing.T, data map[string]interface{}) {
				if len(data) != 0 {
					t.Errorf("Expected empty map, got %d elements", len(data))
				}
			},
		},
		{
			name:      "Nested JSON",
			content:   []byte(`{"info": {"title": "API", "version": "2.0"}}`),
			expectErr: false,
			validate: func(t *testing.T, data map[string]interface{}) {
				info, ok := data["info"].(map[string]interface{})
				if !ok {
					t.Error("Expected 'info' to be a map")
					return
				}
				if info["title"] != "API" {
					t.Errorf("Expected title 'API', got %v", info["title"])
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data, err := parseJSON(tt.content)

			if tt.expectErr && err == nil {
				t.Error("Expected error, got nil")
			}

			if !tt.expectErr && err != nil {
				t.Errorf("Expected no error, got %v", err)
			}

			if tt.validate != nil && data != nil {
				tt.validate(t, data)
			}
		})
	}
}

func TestParseYAML(t *testing.T) {
	tests := []struct {
		name      string
		content   []byte
		expectErr bool
		validate  func(*testing.T, map[string]interface{})
	}{
		{
			name: "Valid YAML",
			content: []byte(`name: test
version: "1.0"`),
			expectErr: false,
			validate: func(t *testing.T, data map[string]interface{}) {
				if data["name"] != "test" {
					t.Errorf("Expected name 'test', got %v", data["name"])
				}
				if data["version"] != "1.0" {
					t.Errorf("Expected version '1.0', got %v", data["version"])
				}
			},
		},
		{
			name:      "Invalid YAML",
			content:   []byte(`name: test\n  invalid: [unclosed`),
			expectErr: true,
			validate:  nil,
		},
		{
			name:      "Empty YAML",
			content:   []byte(``),
			expectErr: false,
			validate: func(t *testing.T, data map[string]interface{}) {
				if data != nil && len(data) > 0 {
					t.Errorf("Expected empty or nil map for empty YAML, got %v", data)
				}
			},
		},
		{
			name: "Nested YAML",
			content: []byte("info:\n" +
				"  title: API\n" +
				"  version: \"2.0\""),
			expectErr: false,
			validate: func(t *testing.T, data map[string]interface{}) {
				info, ok := data["info"].(map[string]interface{})
				if !ok {
					t.Error("Expected 'info' to be a map")
					return
				}
				if info["title"] != "API" {
					t.Errorf("Expected title 'API', got %v", info["title"])
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data, err := parseYAML(tt.content)

			if tt.expectErr && err == nil {
				t.Error("Expected error, got nil")
			}

			if !tt.expectErr && err != nil {
				t.Errorf("Expected no error, got %v", err)
			}

			if tt.validate != nil {
				tt.validate(t, data)
			}
		})
	}
}

func TestConvertYamlToJsonMap(t *testing.T) {
	tests := []struct {
		name     string
		input    map[interface{}]interface{}
		validate func(*testing.T, map[string]interface{})
	}{
		{
			name: "Simple conversion",
			input: map[interface{}]interface{}{
				"name":    "test",
				"version": "1.0",
			},
			validate: func(t *testing.T, result map[string]interface{}) {
				if result["name"] != "test" {
					t.Errorf("Expected name 'test', got %v", result["name"])
				}
				if result["version"] != "1.0" {
					t.Errorf("Expected version '1.0', got %v", result["version"])
				}
			},
		},
		{
			name: "Nested conversion",
			input: map[interface{}]interface{}{
				"info": map[interface{}]interface{}{
					"title": "API",
				},
			},
			validate: func(t *testing.T, result map[string]interface{}) {
				info, ok := result["info"].(map[string]interface{})
				if !ok {
					t.Error("Expected 'info' to be a map")
					return
				}
				if info["title"] != "API" {
					t.Errorf("Expected title 'API', got %v", info["title"])
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := convertYamlToJsonMap(tt.input)
			if result == nil {
				t.Error("Expected non-nil result")
				return
			}
			tt.validate(t, result)
		})
	}
}

func TestConvertMapI2MapS(t *testing.T) {
	tests := []struct {
		name     string
		input    interface{}
		expected interface{}
	}{
		{
			name:     "String value",
			input:    "test",
			expected: "test",
		},
		{
			name:     "Integer value",
			input:    42,
			expected: 42,
		},
		{
			name: "Map with string keys",
			input: map[interface{}]interface{}{
				"key": "value",
			},
			expected: map[string]interface{}{
				"key": "value",
			},
		},
		{
			name: "Map with integer keys",
			input: map[interface{}]interface{}{
				1: "value",
			},
			expected: map[string]interface{}{
				"1": "value",
			},
		},
		{
			name:     "Slice of values",
			input:    []interface{}{"a", "b", "c"},
			expected: []interface{}{"a", "b", "c"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := convertMapI2MapS(tt.input)
			if result == nil && tt.expected != nil {
				t.Error("Expected non-nil result")
			}
		})
	}
}

func TestGetFileExtension(t *testing.T) {
	tests := []struct {
		path     string
		expected string
	}{
		{"/path/to/file.json", "json"},
		{"/path/to/file.yaml", "yaml"},
		{"/path/to/file.yml", "yml"},
		{"/path/to/file.graphql", "graphql"},
		{"/path/to/file.gql", "gql"},
		{"/path/to/file.md", "md"},
		{"/path/to/file.JSON", "json"},
		{"/path/to/file.YAML", "yaml"},
		{"/path/to/file", ""},
		{"/path/to/file.tar.gz", "gz"},
		{"file.txt", "txt"},
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			result := getFileExtension(tt.path)
			if result != tt.expected {
				t.Errorf("Expected extension '%s', got '%s'", tt.expected, result)
			}
		})
	}
}

func TestGetFileName(t *testing.T) {
	tests := []struct {
		path     string
		expected string
	}{
		{"/path/to/api-spec.json", "api-spec"},
		{"/path/to/schema.yaml", "schema"},
		{"/path/to/doc.md", "doc"},
		{"file.txt", "file"},
		{"/path/to/file", "file"},
		{"complex-file-name.graphql", "complex-file-name"},
		{filepath.Join("path", "to", "test.yml"), "test"},
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			result := getFileName(tt.path)
			if result != tt.expected {
				t.Errorf("Expected filename '%s', got '%s'", tt.expected, result)
			}
		})
	}
}

func TestGenerateFileId(t *testing.T) {
	tests := []struct {
		path     string
		expected string
	}{
		{"/path/to/api-spec.json", "api-spec-json"},
		{"/path/to/schema.yaml", "schema-yaml"},
		{"/path/to/My File.txt", "my-file-txt"},
		{"TEST_FILE.md", "test_file-md"}, // slug library keeps underscores
		{"file with spaces.json", "file-with-spaces-json"},
		{"file@special#chars.yaml", "fileatspecial-chars-yaml"}, // slug library behavior for @ and #
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			result := generateFileId(tt.path)
			if result != tt.expected {
				t.Errorf("Expected file ID '%s', got '%s'", tt.expected, result)
			}
		})
	}
}

func TestGetXApiKind(t *testing.T) {
	tests := []struct {
		path     string
		expected string
	}{
		{"/path/to/api_internal.json", "no-BWC"},
		{"/path/to/api_internal.yaml", "no-BWC"},
		{"/path/to/public_internal.yml", "no-BWC"},
		{"/path/to/api.json", "BWC"},
		{"/path/to/schema.yaml", "BWC"},
		{"/path/to/public.yml", "BWC"},
		{"internal_api.json", "BWC"}, // _internal suffix only
		{"api.json", "BWC"},
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			result := getXApiKind(tt.path)
			if result != tt.expected {
				t.Errorf("Expected x-api-kind '%s', got '%s'", tt.expected, result)
			}
		})
	}
}

func TestGetString(t *testing.T) {
	tests := []struct {
		name     string
		data     map[string]interface{}
		key      string
		expected string
	}{
		{
			name:     "String value exists",
			data:     map[string]interface{}{"name": "test"},
			key:      "name",
			expected: "test",
		},
		{
			name:     "Key doesn't exist",
			data:     map[string]interface{}{"name": "test"},
			key:      "version",
			expected: "",
		},
		{
			name:     "Value is not a string",
			data:     map[string]interface{}{"count": 42},
			key:      "count",
			expected: "",
		},
		{
			name:     "Empty string value",
			data:     map[string]interface{}{"name": ""},
			key:      "name",
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getString(tt.data, tt.key)
			if result != tt.expected {
				t.Errorf("Expected '%s', got '%s'", tt.expected, result)
			}
		})
	}
}

func TestHasKey(t *testing.T) {
	tests := []struct {
		name     string
		data     map[string]interface{}
		key      string
		expected bool
	}{
		{
			name:     "Key exists",
			data:     map[string]interface{}{"name": "test"},
			key:      "name",
			expected: true,
		},
		{
			name:     "Key doesn't exist",
			data:     map[string]interface{}{"name": "test"},
			key:      "version",
			expected: false,
		},
		{
			name:     "Key with nil value",
			data:     map[string]interface{}{"name": nil},
			key:      "name",
			expected: true,
		},
		{
			name:     "Empty map",
			data:     map[string]interface{}{},
			key:      "name",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := hasKey(tt.data, tt.key)
			if result != tt.expected {
				t.Errorf("Expected %v, got %v", tt.expected, result)
			}
		})
	}
}
