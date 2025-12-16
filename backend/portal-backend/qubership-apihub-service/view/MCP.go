package view

import (
	"encoding/json"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
)

// TransformedOperation represents a transformed operation for MCP response
type TransformedOperation struct {
	OperationId string `json:"operationId"`
	ApiKind     string `json:"apiKind"`
	ApiType     string `json:"apiType"`
	ApiAudience string `json:"apiAudience"`
	Path        string `json:"path"`
	Method      string `json:"method"`
	PackageId   string `json:"packageId"`
	PackageName string `json:"packageName"`
	Version     string `json:"version"`
	Title       string `json:"title"`
}

// ToolMetadata Tool metadata structure
type ToolMetadata struct {
	Name              string
	Schema            json.RawMessage
	DescriptionMCP    string
	DescriptionOpenAI string
}

// MCPToolRequestWrapper wraps arguments for creating mcp.CallToolRequest
type MCPToolRequestWrapper struct {
	Name      string
	Arguments []byte
}

// ToCallToolRequest converts the wrapper to mcp.CallToolRequest
func (r *MCPToolRequestWrapper) ToCallToolRequest() mcp.CallToolRequest {
	// Parse arguments as map[string]any for GetArguments() to work correctly
	var args map[string]any
	if err := json.Unmarshal(r.Arguments, &args); err != nil {
		// If unmarshal fails, use empty map
		args = make(map[string]any)
	}

	return mcp.CallToolRequest{
		Params: mcp.CallToolParams{
			Name:      r.Name,
			Arguments: args,
		},
	}
}

func (r *MCPToolRequestWrapper) RequireString(key string) (string, error) {
	var args map[string]interface{}
	if err := json.Unmarshal(r.Arguments, &args); err != nil {
		return "", fmt.Errorf("failed to unmarshal arguments: %w", err)
	}
	value, ok := args[key]
	if !ok {
		return "", fmt.Errorf("required parameter %s is missing", key)
	}
	str, ok := value.(string)
	if !ok {
		return "", fmt.Errorf("parameter %s is not a string", key)
	}
	return str, nil
}

func (r *MCPToolRequestWrapper) GetString(key string, defaultValue string) string {
	var args map[string]interface{}
	if err := json.Unmarshal(r.Arguments, &args); err != nil {
		return defaultValue
	}
	value, ok := args[key]
	if !ok {
		return defaultValue
	}
	str, ok := value.(string)
	if !ok {
		return defaultValue
	}
	return str
}

func (r *MCPToolRequestWrapper) GetInt(key string, defaultValue int) int {
	var args map[string]interface{}
	if err := json.Unmarshal(r.Arguments, &args); err != nil {
		return defaultValue
	}
	value, ok := args[key]
	if !ok {
		return defaultValue
	}
	// JSON numbers are unmarshaled as float64
	if num, ok := value.(float64); ok {
		return int(num)
	}
	return defaultValue
}
