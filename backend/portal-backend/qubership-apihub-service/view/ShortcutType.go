package view

type ShortcutType string

// todo maybe add plain text type
const (
	OpenAPI31     ShortcutType = "openapi-3-1"
	OpenAPI30     ShortcutType = "openapi-3-0"
	OpenAPI20     ShortcutType = "openapi-2-0"
	AsyncAPI30    ShortcutType = "asyncapi-3-0"
	JsonSchema    ShortcutType = "json-schema"
	MD            ShortcutType = "markdown"
	GraphQLSchema ShortcutType = "graphql-schema"
	GraphAPI      ShortcutType = "graphapi"
	Introspection ShortcutType = "introspection"
	Unknown       ShortcutType = "unknown"
)

func (s ShortcutType) String() string {
	return string(s)
}

func ParseTypeFromString(s string) ShortcutType {
	switch s {
	case "openapi-3-0":
		return OpenAPI30
	case "openapi-3-1":
		return OpenAPI31
	case "openapi-2-0":
		return OpenAPI20
	case "asyncapi-3-0":
		return AsyncAPI30
	case "markdown":
		return MD
	case "unknown":
		return Unknown
	case "json-schema":
		return JsonSchema
	case "graphql-schema":
		return GraphQLSchema
	case "graphapi":
		return GraphAPI
	case "introspection":
		return Introspection
	default:
		return Unknown
	}
}
