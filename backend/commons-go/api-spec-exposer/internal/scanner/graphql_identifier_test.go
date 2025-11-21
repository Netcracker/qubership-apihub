package scanner

import (
	"testing"

	"github.com/Netcracker/qubership-apihub-commons-go/api-spec-exposer/config"
)

func TestGraphQLIdentifierCanHandle(t *testing.T) {
	identifier := &GraphQLIdentifier{}

	tests := []struct {
		path     string
		expected bool
	}{
		{"/path/to/schema.graphql", true},
		{"/path/to/schema.gql", true},
		{"/path/to/introspection.json", true},
		{"/path/to/schema.GRAPHQL", true},
		{"/path/to/schema.GQL", true},
		{"/path/to/schema.JSON", true},
		{"/path/to/spec.yaml", false},
		{"/path/to/spec.yml", false},
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

func TestGraphQLIdentifierIdentifyGraphQLSchema(t *testing.T) {
	identifier := &GraphQLIdentifier{}
	content := []byte(`type Query {
		hello: String
		user(id: ID!): User
	}

	type User {
		id: ID!
		name: String
	}`)

	spec, warnings, errors := identifier.Identify("schema.graphql", content)

	if spec == nil {
		t.Fatal("Expected spec to be identified, got nil")
	}

	if spec.Name != "schema" {
		t.Errorf("Expected name 'schema', got '%s'", spec.Name)
	}

	if spec.Type != config.DocTypeGraphQL {
		t.Errorf("Expected type DocTypeGraphQL, got %v", spec.Type)
	}

	if spec.ApiType != config.ApiTypeGraphQL {
		t.Errorf("Expected ApiType ApiTypeGraphQL, got %v", spec.ApiType)
	}

	if spec.Format != config.FormatGraphQL {
		t.Errorf("Expected format FormatGraphQL, got %v", spec.Format)
	}

	if spec.FilePath != "schema.graphql" {
		t.Errorf("Expected FilePath 'schema.graphql', got '%s'", spec.FilePath)
	}

	if len(warnings) != 0 {
		t.Errorf("Expected no warnings, got %d", len(warnings))
	}

	if len(errors) != 0 {
		t.Errorf("Expected no errors, got %d", len(errors))
	}
}

func TestGraphQLIdentifierIdentifyGQLFile(t *testing.T) {
	identifier := &GraphQLIdentifier{}
	content := []byte(`type Mutation {
		createUser(name: String!): User
	}

	type User {
		id: ID!
		name: String
	}`)

	spec, warnings, errors := identifier.Identify("schema.gql", content)

	if spec == nil {
		t.Fatal("Expected spec to be identified, got nil")
	}

	if spec.Type != config.DocTypeGraphQL {
		t.Errorf("Expected type DocTypeGraphQL, got %v", spec.Type)
	}

	if spec.Format != config.FormatGraphQL {
		t.Errorf("Expected format FormatGraphQL, got %v", spec.Format)
	}

	if len(warnings) != 0 {
		t.Errorf("Expected no warnings, got %d", len(warnings))
	}

	if len(errors) != 0 {
		t.Errorf("Expected no errors, got %d", len(errors))
	}
}

func TestGraphQLIdentifierIdentifyIntrospection(t *testing.T) {
	identifier := &GraphQLIdentifier{}
	content := []byte(`{
		"data": {
			"__schema": {
				"queryType": {
					"name": "Query"
				},
				"types": []
			}
		}
	}`)

	spec, warnings, errors := identifier.Identify("introspection.json", content)

	if spec == nil {
		t.Fatal("Expected spec to be identified, got nil")
	}

	if spec.Name != "introspection" {
		t.Errorf("Expected name 'introspection', got '%s'", spec.Name)
	}

	if spec.Type != config.DocTypeIntrospection {
		t.Errorf("Expected type DocTypeIntrospection, got %v", spec.Type)
	}

	if spec.ApiType != config.ApiTypeGraphQL {
		t.Errorf("Expected ApiType ApiTypeGraphQL, got %v", spec.ApiType)
	}

	if spec.Format != config.FormatJSON {
		t.Errorf("Expected format FormatJSON, got %v", spec.Format)
	}

	if len(warnings) != 0 {
		t.Errorf("Expected no warnings, got %d", len(warnings))
	}

	if len(errors) != 0 {
		t.Errorf("Expected no errors, got %d", len(errors))
	}
}

func TestGraphQLIdentifierIdentifyNotGraphQL(t *testing.T) {
	identifier := &GraphQLIdentifier{}
	content := []byte(`This is just some plain text content.`)

	spec, warnings, errors := identifier.Identify("schema.graphql", content)

	if spec != nil {
		t.Error("Expected spec to be nil for non-GraphQL content")
	}

	if len(warnings) != 0 {
		t.Errorf("Expected no warnings, got %d", len(warnings))
	}

	if len(errors) != 1 {
		t.Errorf("Expected 1 error, got %d", len(errors))
	}
}

func TestGraphQLIdentifierIdentifyJSONWithoutIntrospection(t *testing.T) {
	identifier := &GraphQLIdentifier{}
	content := []byte(`{
		"openapi": "3.0.0",
		"info": {
			"title": "Not GraphQL"
		}
	}`)

	spec, warnings, errors := identifier.Identify("test.json", content)

	if spec != nil {
		t.Error("Expected spec to be nil for non-GraphQL JSON")
	}

	if len(warnings) != 0 {
		t.Errorf("Expected no warnings, got %d", len(warnings))
	}

	if len(errors) != 0 {
		t.Errorf("Expected no errors, got %d", len(errors))
	}
}

func TestGraphQLIdentifierIdentifyInvalidJSON(t *testing.T) {
	identifier := &GraphQLIdentifier{}
	content := []byte(`{invalid json}`)

	spec, warnings, errors := identifier.Identify("introspection.json", content)

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

