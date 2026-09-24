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
	DDL           ShortcutType = "ddl"
	MCPInit       ShortcutType = "mcp-init"
	MCPTools      ShortcutType = "mcp-tools"
	MCPResources  ShortcutType = "mcp-resources"
	MCPPrompts    ShortcutType = "mcp-prompts"
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
	case "ddl":
		return DDL
	case "mcp-init":
		return MCPInit
	case "mcp-tools":
		return MCPTools
	case "mcp-resources":
		return MCPResources
	case "mcp-prompts":
		return MCPPrompts
	default:
		return Unknown
	}
}
