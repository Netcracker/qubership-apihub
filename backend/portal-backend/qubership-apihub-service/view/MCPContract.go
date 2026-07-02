package view

type McpEntityListView struct {
	Entities []interface{}                `json:"entities"`
	Packages map[string]PackageVersionRef `json:"packages,omitempty"`
}

type McpEntityView struct {
	McpEntityId               string `json:"mcpEntityId"`
	Kind                      string `json:"kind"`
	Title                     string `json:"title"`
	Description               string `json:"description,omitempty"`
	McpEndpoint               string `json:"mcpEndpoint"`
	DocumentId                string `json:"documentId"`
	VersionInternalDocumentId string `json:"versionInternalDocumentId"`
	PackageRef                string `json:"packageRef,omitempty"`
}

type McpEntityDetailView struct {
	McpEntityView
	Data     interface{}                  `json:"data"`
	Packages map[string]PackageVersionRef `json:"packages,omitempty"`
}

const McpKindInit = "init"
const McpKindTool = "tool"
const McpKindPrompt = "prompt"
const McpKindResource = "resource"

type McpEntitySearchResult struct {
	PackageId      string   `json:"packageId"`
	PackageName    string   `json:"name"`
	ParentPackages []string `json:"parentPackages"`
	VersionStatus  string   `json:"status"`
	Version        string   `json:"version"`
	EntityId       string   `json:"entityId"`
	Kind           string   `json:"kind"`
	Name           string   `json:"entityName,omitempty"`
	McpEndpoint    string   `json:"mcpEndpoint"`
}

// URL segment → kind mapping
var McpEntitySegmentToKind = map[string]string{
	"inits":     McpKindInit,
	"tools":     McpKindTool,
	"prompts":   McpKindPrompt,
	"resources": McpKindResource,
}
