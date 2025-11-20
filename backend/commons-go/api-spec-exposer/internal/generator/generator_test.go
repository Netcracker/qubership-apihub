package generator

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/qubership-apihub-commons-go/api-spec-exposer/config"
)

func TestGeneratorGroupSpecsByType(t *testing.T) {
	specs := []config.SpecMetadata{
		{ApiType: config.ApiTypeRest, Name: "API 1"},
		{ApiType: config.ApiTypeRest, Name: "API 2"},
		{ApiType: config.ApiTypeGraphQL, Name: "GraphQL 1"},
		{ApiType: config.ApiTypeMarkdown, Name: "Doc 1"},
	}

	gen := New(specs)
	grouped := gen.groupSpecsByType()

	if len(grouped[config.ApiTypeRest]) != 2 {
		t.Errorf("Expected 2 REST specs, got %d", len(grouped[config.ApiTypeRest]))
	}

	if len(grouped[config.ApiTypeGraphQL]) != 1 {
		t.Errorf("Expected 1 GraphQL spec, got %d", len(grouped[config.ApiTypeGraphQL]))
	}

	if len(grouped[config.ApiTypeMarkdown]) != 1 {
		t.Errorf("Expected 1 Markdown spec, got %d", len(grouped[config.ApiTypeMarkdown]))
	}
}

func TestGeneratorGetContentType(t *testing.T) {
	gen := New([]config.SpecMetadata{})

	tests := []struct {
		format   config.Format
		expected string
	}{
		{config.FormatJSON, "application/json"},
		{config.FormatYAML, "application/yaml"},
		{config.FormatGraphQL, "text/plain"},
		{config.FormatMarkdown, "text/markdown"},
		{config.FormatUnknown, "application/octet-stream"},
	}

	for _, tt := range tests {
		t.Run(string(tt.format), func(t *testing.T) {
			result := gen.getContentType(tt.format)
			if result != tt.expected {
				t.Errorf("Expected content type '%s', got '%s'", tt.expected, result)
			}
		})
	}
}

func TestGeneratorMakeUnique(t *testing.T) {
	specs := []config.SpecMetadata{
		{FileId: "api-spec"},
		{FileId: "api-spec"},
		{FileId: "other-spec"},
	}

	gen := New(specs)

	tests := []struct {
		fileId   string
		expected string
	}{
		{"api-spec", "api-spec-2"},
		{"other-spec", "other-spec"},
	}

	for _, tt := range tests {
		t.Run(tt.fileId, func(t *testing.T) {
			result := gen.makeUnique(tt.fileId)
			if result != tt.expected {
				t.Errorf("Expected '%s', got '%s'", tt.expected, result)
			}
		})
	}
}

func TestGeneratorGenerateGraphQLWithIntrospection(t *testing.T) {
	specs := []config.SpecMetadata{
		{
			Name:     "GraphQL Schema",
			FilePath: "schema.graphql",
			Type:     config.DocTypeGraphQL,
			ApiType:  config.ApiTypeGraphQL,
			Format:   config.FormatGraphQL,
			FileId:   "schema",
			XApiKind: "BWC",
		},
		{
			Name:     "Introspection",
			FilePath: "introspection.json",
			Type:     config.DocTypeIntrospection,
			ApiType:  config.ApiTypeGraphQL,
			Format:   config.FormatJSON,
			FileId:   "introspection",
			XApiKind: "BWC",
		},
	}

	gen := New(specs)
	endpoints := gen.Generate()

	if len(endpoints) != 2 {
		t.Fatalf("Expected 2 endpoints, got %d", len(endpoints))
	}

	var hasSchema, hasIntrospection bool
	for _, endpoint := range endpoints {
		if endpoint.Path == "/api/graphql-server/schema" {
			hasSchema = true
		}
		if endpoint.Path == "/graphql/introspection" {
			hasIntrospection = true
		}
	}

	if !hasSchema {
		t.Error("Expected GraphQL schema endpoint")
	}

	if !hasIntrospection {
		t.Error("Expected introspection endpoint")
	}
}

func TestGeneratorEndpointHandlerJSON(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "generator-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	content := []byte(`{"openapi": "3.0"}`)
	filePath := filepath.Join(tempDir, "test.json")
	err = os.WriteFile(filePath, content, 0644)
	if err != nil {
		t.Fatalf("Failed to write test file: %v", err)
	}

	specs := []config.SpecMetadata{
		{
			Name:     "Test API",
			FilePath: filePath,
			Type:     config.DocTypeOpenAPI30,
			ApiType:  config.ApiTypeRest,
			Format:   config.FormatJSON,
			FileId:   "test",
			XApiKind: "BWC",
		},
	}

	gen := New(specs)
	endpoints := gen.Generate()

	if len(endpoints) == 0 {
		t.Fatal("Expected at least 1 endpoint")
	}

	req := httptest.NewRequest("GET", endpoints[0].Path, nil)
	w := httptest.NewRecorder()

	endpoints[0].Handler(w, req)

	resp := w.Result()
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("Expected Content-Type 'application/json', got '%s'", contentType)
	}
}

func TestGeneratorConfigEndpointHandler(t *testing.T) {
	specs := []config.SpecMetadata{
		{
			Name:     "API 1",
			FilePath: "api1.json",
			Type:     config.DocTypeOpenAPI30,
			ApiType:  config.ApiTypeRest,
			Format:   config.FormatJSON,
			FileId:   "api-1",
			XApiKind: "BWC",
		},
		{
			Name:     "API 2",
			FilePath: "api2.json",
			Type:     config.DocTypeOpenAPI30,
			ApiType:  config.ApiTypeRest,
			Format:   config.FormatJSON,
			FileId:   "api-2",
			XApiKind: "no-BWC",
		},
	}

	gen := New(specs)
	endpoints := gen.Generate()

	var configEndpoint *config.EndpointConfig
	for i := range endpoints {
		if endpoints[i].Path == "/v3/api-docs/swagger-config" {
			configEndpoint = &endpoints[i]
			break
		}
	}

	if configEndpoint == nil {
		t.Fatal("Expected swagger-config endpoint")
	}

	req := httptest.NewRequest("GET", configEndpoint.Path, nil)
	w := httptest.NewRecorder()

	configEndpoint.Handler(w, req)

	resp := w.Result()
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("Expected Content-Type 'application/json', got '%s'", contentType)
	}

	var apiConfig config.ApiSpecConfig
	err := json.NewDecoder(resp.Body).Decode(&apiConfig)
	if err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if apiConfig.ConfigURL != "/v3/api-docs/swagger-config" {
		t.Errorf("Expected ConfigURL '/v3/api-docs/swagger-config', got '%s'", apiConfig.ConfigURL)
	}

	if len(apiConfig.URLs) != 2 {
		t.Errorf("Expected 2 URLs, got %d", len(apiConfig.URLs))
	}
}

func TestGeneratorMixedSpecs(t *testing.T) {
	specs := []config.SpecMetadata{
		{
			Name:     "REST API",
			FilePath: "api.json",
			Type:     config.DocTypeOpenAPI30,
			ApiType:  config.ApiTypeRest,
			Format:   config.FormatJSON,
			FileId:   "rest-api",
			XApiKind: "BWC",
		},
		{
			Name:     "GraphQL Schema",
			FilePath: "schema.graphql",
			Type:     config.DocTypeGraphQL,
			ApiType:  config.ApiTypeGraphQL,
			Format:   config.FormatGraphQL,
			FileId:   "graphql-schema",
			XApiKind: "BWC",
		},
		{
			Name:     "Documentation",
			FilePath: "doc.md",
			Type:     config.DocTypeMarkdown,
			ApiType:  config.ApiTypeMarkdown,
			Format:   config.FormatMarkdown,
			FileId:   "doc-md",
			XApiKind: "BWC",
		},
	}

	gen := New(specs)
	endpoints := gen.Generate()

	// Should have: 1 REST + 1 GraphQL + 1 Markdown + 1 apihub-config = 4 endpoints
	if len(endpoints) != 4 {
		t.Fatalf("Expected 4 endpoints, got %d", len(endpoints))
	}

	var hasRest, hasGraphQL, hasMarkdown, hasConfig bool
	for _, endpoint := range endpoints {
		switch endpoint.Path {
		case "/v3/api-docs":
			hasRest = true
		case "/api/graphql-server/schema":
			hasGraphQL = true
		case "/v3/api-docs/doc-md":
			hasMarkdown = true
		case "/v3/api-docs/apihub-swagger-config":
			hasConfig = true
		}
	}

	if !hasRest {
		t.Error("Expected REST endpoint")
	}

	if !hasGraphQL {
		t.Error("Expected GraphQL endpoint")
	}

	if !hasMarkdown {
		t.Error("Expected Markdown endpoint")
	}

	if !hasConfig {
		t.Error("Expected apihub-swagger-config endpoint")
	}
}

func TestGeneratorEndpointHandlerFileNotFound(t *testing.T) {
	specs := []config.SpecMetadata{
		{
			Name:     "Test API",
			FilePath: "/nonexistent/file.json",
			Type:     config.DocTypeOpenAPI30,
			ApiType:  config.ApiTypeRest,
			Format:   config.FormatJSON,
			FileId:   "test",
			XApiKind: "BWC",
		},
	}

	gen := New(specs)
	endpoints := gen.Generate()

	if len(endpoints) == 0 {
		t.Fatal("Expected at least 1 endpoint")
	}

	req := httptest.NewRequest("GET", endpoints[0].Path, nil)
	w := httptest.NewRecorder()

	endpoints[0].Handler(w, req)

	resp := w.Result()
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusInternalServerError {
		t.Errorf("Expected status 500, got %d", resp.StatusCode)
	}
}

func TestGeneratorMultipleGraphQLEndpoints(t *testing.T) {
	specs := []config.SpecMetadata{
		{
			Name:     "Schema 1",
			FilePath: "schema1.graphql",
			Type:     config.DocTypeGraphQL,
			ApiType:  config.ApiTypeGraphQL,
			Format:   config.FormatGraphQL,
			FileId:   "schema-1",
			XApiKind: "BWC",
		},
		{
			Name:     "Schema 2",
			FilePath: "schema2.graphql",
			Type:     config.DocTypeGraphQL,
			ApiType:  config.ApiTypeGraphQL,
			Format:   config.FormatGraphQL,
			FileId:   "schema-2",
			XApiKind: "BWC",
		},
		{
			Name:     "Schema 3",
			FilePath: "schema3.graphql",
			Type:     config.DocTypeGraphQL,
			ApiType:  config.ApiTypeGraphQL,
			Format:   config.FormatGraphQL,
			FileId:   "schema-3",
			XApiKind: "BWC",
		},
	}

	gen := New(specs)
	endpoints := gen.Generate()

	// Should have 3 schema endpoints + 1 domains config endpoint = 4 endpoints
	if len(endpoints) != 4 {
		t.Fatalf("Expected 4 endpoints, got %d", len(endpoints))
	}

	var hasConfig bool
	for _, endpoint := range endpoints {
		if endpoint.Path == "/api/graphql-server/schema/domains" {
			hasConfig = true
		}
	}

	if !hasConfig {
		t.Error("Expected GraphQL domains config endpoint")
	}
}

