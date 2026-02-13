package view

const (
	OpenAPI31Type     string = "openapi-3-1"
	OpenAPI30Type     string = "openapi-3-0"
	OpenAPI20Type     string = "openapi-2-0"
	AsyncAPIType      string = "asyncapi-2"
	JsonSchemaType    string = "json-schema"
	MDType            string = "markdown"
	GraphQLSchemaType string = "graphql-schema"
	GraphAPIType      string = "graphapi"
	GraphQLType       string = "graphql"
	IntrospectionType string = "introspection"
	UnknownType       string = "unknown"
)

func ValidDocumentType(documentType string) bool {
	switch documentType {
	case OpenAPI31Type, OpenAPI30Type, OpenAPI20Type, AsyncAPIType, JsonSchemaType, MDType, GraphQLSchemaType, GraphAPIType, IntrospectionType, GraphQLType, UnknownType:
		return true
	}
	return false
}

func DocTypeToApiType(documentType string) ApiType {
	switch documentType {
	case OpenAPI31Type, OpenAPI30Type, OpenAPI20Type:
		return ATRest
	case GraphAPIType, GraphQLType, IntrospectionType:
		return ATGraphql
	case MDType:
		return ATMarkdown
	case JsonSchemaType:
		return ATJsonSchema
	default:
		return ATUnknown
	}
}

func GetDocExtensionByType(documentType string) string {
	switch documentType {
	case MDType:
		return MarkdownExtension
	case JsonSchemaType:
		return JsonExtension
	default:
		return UnknownExtension
	}
}
