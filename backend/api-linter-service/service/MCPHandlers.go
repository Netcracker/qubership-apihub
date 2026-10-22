package service

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	log "github.com/sirupsen/logrus"
)

func (m *mcpService) executeListLinterIssuesTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	packageId, err := req.RequireString("packageId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	version, err := req.RequireString("version")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	log.Infof("%s: packageId=%s version=%s", ToolNameListLinterIssuesForPackageVersion, packageId, version)

	ok, err := m.authorizationService.HasReadPackagePermission(ctx, packageId)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	if !ok {
		return mcp.NewToolResultError("insufficient privileges to read lint results for this package"), nil
	}

	result, err := m.validationService.GetLintIssuesForPackageVersion(ctx, packageId, version)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	if result == nil {
		return mcp.NewToolResultError(
			fmt.Sprintf("no stored lint results for package %s version %s (version may not be linted yet)", packageId, version),
		), nil
	}

	payload := map[string]any{"versionLintIssues": result}
	payloadJSON, _ := json.Marshal(payload)
	log.Debugf("MCP tool %s response: %s", ToolNameListLinterIssuesForPackageVersion, string(payloadJSON))

	return mcp.NewToolResultStructuredOnly(payload), nil
}
