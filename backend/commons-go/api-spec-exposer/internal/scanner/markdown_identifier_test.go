package scanner

import (
	"testing"

	"github.com/Netcracker/qubership-apihub-commons-go/api-spec-exposer/config"
)

func TestMarkdownIdentifierCanHandle(t *testing.T) {
	identifier := &MarkdownIdentifier{}

	tests := []struct {
		path     string
		expected bool
	}{
		{"/path/to/doc.md", true},
		{"/path/to/README.markdown", true},
		{"/path/to/DOC.MD", true},
		{"/path/to/README.MARKDOWN", true},
		{"/path/to/spec.json", false},
		{"/path/to/spec.yaml", false},
		{"/path/to/schema.graphql", false},
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

func TestMarkdownIdentifierIdentify(t *testing.T) {
	identifier := &MarkdownIdentifier{}
	content := []byte(`# API Documentation

## Overview
This is a comprehensive API documentation.

## Endpoints

### GET /users
Retrieves all users.

### POST /users
Creates a new user.
`)

	spec, warnings, errors := identifier.Identify("api-docs.md", content)

	if spec == nil {
		t.Fatal("Expected spec to be identified, got nil")
	}

	if spec.Name != "api-docs" {
		t.Errorf("Expected name 'api-docs', got '%s'", spec.Name)
	}

	if spec.Type != config.DocTypeMarkdown {
		t.Errorf("Expected type DocTypeMarkdown, got %v", spec.Type)
	}

	if spec.ApiType != config.ApiTypeMarkdown {
		t.Errorf("Expected ApiType ApiTypeMarkdown, got %v", spec.ApiType)
	}

	if spec.Format != config.FormatMarkdown {
		t.Errorf("Expected format FormatMarkdown, got %v", spec.Format)
	}

	if spec.FilePath != "api-docs.md" {
		t.Errorf("Expected FilePath 'api-docs.md', got '%s'", spec.FilePath)
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
