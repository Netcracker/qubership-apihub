package exposer

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/Netcracker/qubership-apihub-commons-go/api-spec-exposer/config"
)

func TestSpecExposerDiscoverEmptyDirectory(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "exposer-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	cfg := config.DiscoveryConfig{
		ScanDirectory:   tempDir,
		ExcludePatterns: []string{},
	}

	exposer := New(cfg)
	result := exposer.Discover()

	if len(result.Endpoints) != 0 {
		t.Errorf("Expected 0 endpoints, got %d", len(result.Endpoints))
	}

	if len(result.Warnings) != 0 {
		t.Errorf("Expected 0 warnings, got %d", len(result.Warnings))
	}

	if len(result.Errors) != 0 {
		t.Errorf("Expected 0 errors, got %d", len(result.Errors))
	}
}

func TestSpecExposerDiscoverWithSingleSpec(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "exposer-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	openapiContent := []byte(`{
		"openapi": "3.0.0",
		"info": {
			"title": "Test API",
			"version": "1.0.0"
		}
	}`)
	openapiPath := filepath.Join(tempDir, "openapi.json")
	err = os.WriteFile(openapiPath, openapiContent, 0644)
	if err != nil {
		t.Fatalf("Failed to write test file: %v", err)
	}

	cfg := config.DiscoveryConfig{
		ScanDirectory:   tempDir,
		ExcludePatterns: []string{},
	}

	exposer := New(cfg)
	result := exposer.Discover()

	if len(result.Endpoints) != 1 {
		t.Fatalf("Expected 1 endpoint, got %d", len(result.Endpoints))
	}

	endpoint := result.Endpoints[0]
	if endpoint.Path != "/v3/api-docs" {
		t.Errorf("Expected path '/v3/api-docs', got '%s'", endpoint.Path)
	}

	if endpoint.Name != "Test API" {
		t.Errorf("Expected name 'Test API', got '%s'", endpoint.Name)
	}

	if endpoint.Type != config.DocTypeOpenAPI30 {
		t.Errorf("Expected type DocTypeOpenAPI30, got %v", endpoint.Type)
	}

	if endpoint.Handler == nil {
		t.Error("Expected handler to be non-nil")
	}

	if len(result.Warnings) != 0 {
		t.Errorf("Expected 0 warnings, got %d", len(result.Warnings))
	}

	if len(result.Errors) != 0 {
		t.Errorf("Expected 0 errors, got %d", len(result.Errors))
	}
}

func TestSpecExposerDiscoverWithMultipleSpecs(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "exposer-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	files := map[string][]byte{
		"api1.json": []byte(`{"openapi": "3.0.0", "info": {"title": "API 1", "version": "1.0.0"}}`),
		"api2.json": []byte(`{"openapi": "3.0.0", "info": {"title": "API 2", "version": "1.0.0"}}`),
		"schema.graphql": []byte(`type Query {
			hello: String
		}`),
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

	exposer := New(cfg)
	result := exposer.Discover()

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	// Should have: 2 REST specs + 1 swagger-config + 1 GraphQL = 4 endpoints
	if len(result.Endpoints) != 4 {
		t.Fatalf("Expected 4 endpoints, got %d", len(result.Endpoints))
	}

	var hasRestConfig, hasGraphQL bool
	for _, endpoint := range result.Endpoints {
		if endpoint.Path == "/v3/api-docs/swagger-config" {
			hasRestConfig = true
		}
		if endpoint.Path == "/api/graphql-server/schema" {
			hasGraphQL = true
		}
	}

	if !hasRestConfig {
		t.Error("Expected swagger-config endpoint")
	}

	if !hasGraphQL {
		t.Error("Expected GraphQL endpoint")
	}

	if len(result.Warnings) != 0 {
		t.Errorf("Expected 0 warnings, got %d", len(result.Warnings))
	}

	if len(result.Errors) != 0 {
		t.Errorf("Expected 0 errors, got %d", len(result.Errors))
	}
}

func TestSpecExposerDiscoverWithWarnings(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "exposer-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	openapiContent := []byte(`{
		"openapi": "3.0.0",
		"info": {
			"version": "1.0.0"
		}
	}`)
	openapiPath := filepath.Join(tempDir, "openapi.json")
	err = os.WriteFile(openapiPath, openapiContent, 0644)
	if err != nil {
		t.Fatalf("Failed to write test file: %v", err)
	}

	cfg := config.DiscoveryConfig{
		ScanDirectory:   tempDir,
		ExcludePatterns: []string{},
	}

	exposer := New(cfg)
	result := exposer.Discover()

	if len(result.Endpoints) != 1 {
		t.Fatalf("Expected 1 endpoint, got %d", len(result.Endpoints))
	}

	if len(result.Warnings) != 1 {
		t.Errorf("Expected 1 warning, got %d", len(result.Warnings))
	}

	if len(result.Errors) != 0 {
		t.Errorf("Expected 0 errors, got %d", len(result.Errors))
	}
}

func TestSpecExposerDiscoverWithErrors(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "exposer-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	invalidContent := []byte(`{invalid json}`)
	invalidPath := filepath.Join(tempDir, "invalid.json")
	err = os.WriteFile(invalidPath, invalidContent, 0644)
	if err != nil {
		t.Fatalf("Failed to write test file: %v", err)
	}

	cfg := config.DiscoveryConfig{
		ScanDirectory:   tempDir,
		ExcludePatterns: []string{},
	}

	exposer := New(cfg)
	result := exposer.Discover()

	if len(result.Errors) != 1 {
		t.Errorf("Expected 1 error, got %d", len(result.Errors))
	}
}

func TestSpecExposerDiscoverWithExcludePatterns(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "exposer-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	subDir := filepath.Join(tempDir, "specs")
	err = os.Mkdir(subDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create subdirectory: %v", err)
	}

	files := map[string][]byte{
		filepath.Join(tempDir, "api.json"):      []byte(`{"openapi": "3.0.0", "info": {"title": "API", "version": "1.0.0"}}`),
		filepath.Join(subDir, "test.json"):      []byte(`{"openapi": "3.0.0", "info": {"title": "Test", "version": "1.0.0"}}`),
		filepath.Join(tempDir, "internal.json"): []byte(`{"openapi": "3.0.0", "info": {"title": "Internal", "version": "1.0.0"}}`),
	}

	for path, content := range files {
		err = os.WriteFile(path, content, 0644)
		if err != nil {
			t.Fatalf("Failed to write test file %s: %v", path, err)
		}
	}

	cfg := config.DiscoveryConfig{
		ScanDirectory:   tempDir,
		ExcludePatterns: []string{"internal.json", "specs"},
	}

	exposer := New(cfg)
	result := exposer.Discover()

	if len(result.Endpoints) != 1 {
		t.Fatalf("Expected 1 endpoint (others excluded), got %d", len(result.Endpoints))
	}

	if result.Endpoints[0].Name != "API" {
		t.Errorf("Expected name 'API', got '%s'", result.Endpoints[0].Name)
	}

	if len(result.Warnings) != 0 {
		t.Errorf("Expected 0 warnings, got %d", len(result.Warnings))
	}

	if len(result.Errors) != 0 {
		t.Errorf("Expected 0 errors, got %d", len(result.Errors))
	}
}

func TestSpecExposerDiscoverInvalidDirectory(t *testing.T) {
	cfg := config.DiscoveryConfig{
		ScanDirectory:   "/nonexistent/directory",
		ExcludePatterns: []string{},
	}

	exposer := New(cfg)
	result := exposer.Discover()

	if len(result.Endpoints) != 0 {
		t.Errorf("Expected 0 endpoints for invalid directory, got %d", len(result.Endpoints))
	}

	if len(result.Errors) != 1 {
		t.Errorf("Expected 1 error for invalid directory, got %d", len(result.Errors))
	}
}

func TestSpecExposerDiscoverWithNestedDirectories(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "exposer-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	subDir := filepath.Join(tempDir, "specs")
	err = os.Mkdir(subDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create subdirectory: %v", err)
	}

	files := map[string][]byte{
		filepath.Join(tempDir, "root.json"):  []byte(`{"openapi": "3.0.0", "info": {"title": "Root API", "version": "1.0.0"}}`),
		filepath.Join(subDir, "nested.json"): []byte(`{"openapi": "3.0.0", "info": {"title": "Nested API", "version": "1.0.0"}}`),
	}

	for path, content := range files {
		err = os.WriteFile(path, content, 0644)
		if err != nil {
			t.Fatalf("Failed to write test file %s: %v", path, err)
		}
	}

	cfg := config.DiscoveryConfig{
		ScanDirectory:   tempDir,
		ExcludePatterns: []string{},
	}

	exposer := New(cfg)
	result := exposer.Discover()

	// Should have: 2 REST specs + 1 swagger-config = 3 endpoints
	if len(result.Endpoints) != 3 {
		t.Fatalf("Expected 3 endpoints, got %d", len(result.Endpoints))
	}

	if len(result.Warnings) != 0 {
		t.Errorf("Expected 0 warnings, got %d", len(result.Warnings))
	}

	if len(result.Errors) != 0 {
		t.Errorf("Expected 0 errors, got %d", len(result.Errors))
	}
}

func TestSpecExposerDiscoverWithMixedTypes(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "exposer-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	files := map[string][]byte{
		"openapi.yaml": []byte("openapi: 3.0.0\n" +
			"info:\n" +
			"  title: YAML API\n" +
			"  version: 1.0.0"),
		"swagger.json": []byte(`{"swagger": "2.0", "info": {"title": "Swagger API", "version": "1.0.0"}}`),
		"schema.graphql": []byte(`type Query {
			test: String
		}`),
		"introspection.json": []byte(`{
			"data": {
				"__schema": {
					"queryType": {"name": "Query"}
				}
			}
		}`),
		"README.md": []byte(`# API Documentation`),
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

	exposer := New(cfg)
	result := exposer.Discover()

	if len(result.Endpoints) < 5 {
		t.Errorf("Expected at least 5 endpoints, got %d", len(result.Endpoints))
	}

	var hasRest, hasGraphQL, hasIntrospection, hasMarkdown bool
	for _, endpoint := range result.Endpoints {
		switch {
		case endpoint.ApiType == config.ApiTypeRest && endpoint.Path != "/v3/api-docs/swagger-config":
			hasRest = true
		case endpoint.Path == "/api/graphql-server/schema":
			hasGraphQL = true
		case endpoint.Path == "/graphql/introspection":
			hasIntrospection = true
		case endpoint.ApiType == config.ApiTypeMarkdown:
			hasMarkdown = true
		}
	}

	if !hasRest {
		t.Error("Expected REST endpoint")
	}

	if !hasGraphQL {
		t.Error("Expected GraphQL endpoint")
	}

	if !hasIntrospection {
		t.Error("Expected introspection endpoint")
	}

	if !hasMarkdown {
		t.Error("Expected Markdown endpoint")
	}

	if len(result.Warnings) != 0 {
		t.Errorf("Expected 0 warnings, got %d", len(result.Warnings))
	}

	if len(result.Errors) != 0 {
		t.Errorf("Expected 0 errors, got %d", len(result.Errors))
	}
}
