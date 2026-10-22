package service

import (
	"context"
	"encoding/json"

	"github.com/mark3labs/mcp-go/mcp"
	mcpserver "github.com/mark3labs/mcp-go/server"
)

type MCPService interface {
	MakeMCPServer() *mcpserver.MCPServer
}

func NewMCPService(
	validationService ValidationService,
	authorizationService AuthorizationService,
) MCPService {
	return &mcpService{
		validationService:    validationService,
		authorizationService: authorizationService,
	}
}

type mcpService struct {
	validationService    ValidationService
	authorizationService AuthorizationService
}

func (m *mcpService) MakeMCPServer() *mcpserver.MCPServer {
	s := mcpserver.NewMCPServer(
		"apihub-linter-mcp",
		"0.0.1",
		mcpserver.WithToolCapabilities(false),
		mcpserver.WithInstructions(mcpInstructionsLinter),
	)

	meta := getLinterToolMetadata()[0]
	s.AddTool(mcp.Tool{
		Name:           meta.Name,
		Description:    meta.DescriptionMCP,
		RawInputSchema: meta.Schema,
	}, func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		return m.executeListLinterIssuesTool(ctx, req)
	})

	return s
}

const (
	ToolNameListLinterIssuesForPackageVersion = "list_linter_issues_for_package_version"
)

var listLinterIssuesSchema = json.RawMessage(`{
	"type": "object",
	"properties": {
		"packageId": {
			"type": "string",
			"description": "Package ID (same as in APIHub REST API paths)"
		},
		"version": {
			"type": "string",
			"description": "Published version string in YYYY.Q format (e.g. 2024.3), optionally with revision suffix if your deployment uses it"
		}
	},
	"required": ["packageId", "version"]
}`)

const toolDescriptionListLinterIssuesMCP = `Returns all linter findings stored for a specific package and published version.

Each API specification document (slug) in that version may have been validated with one or more linters (e.g. Spectral, AI OAS). The tool returns issues grouped by document and linter/ruleset.

When to use:
- User asks for lint / validation / Spectral / quality issues for a given package and version
- Cross-check findings after locating a package and version via other tools (e.g. APIHub package list)

This tool only reads persisted lint results. If the response shows versionStatus \"inProgress\", lint has not finished yet. If no data exists for the version, the tool reports that the version has no stored lint results yet.`

type linterToolMetadata struct {
	Name           string
	Schema         json.RawMessage
	DescriptionMCP string
}

func getLinterToolMetadata() []linterToolMetadata {
	return []linterToolMetadata{
		{
			Name:           ToolNameListLinterIssuesForPackageVersion,
			Schema:         listLinterIssuesSchema,
			DescriptionMCP: toolDescriptionListLinterIssuesMCP,
		},
	}
}

const mcpInstructionsLinter = `The apihub-linter-mcp server exposes API linting results persisted by the API Linter service.

DATA:
- Lint issues are stored per package, published version, and API document (slug).
- Multiple linters may run per document; each produces its own list of issues with path, rule code, severity, and message.

WHEN TO USE:
- Questions about validation problems, Spectral rules, or API quality checks for a specific package version.

AVAILABLE TOOLS:
1. list_linter_issues_for_package_version — return all stored linter issues for a packageId and version.

RESPONSES:
- Summarize findings by severity and document; include rule codes when helpful.
- If the version is still being linted (versionStatus inProgress), say so and suggest retrying later.`
