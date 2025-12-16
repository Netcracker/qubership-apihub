package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	mcpserver "github.com/mark3labs/mcp-go/server"
)

type MCPController interface {
	MakeMCPServer() http.Handler
}

type mcpControllerImpl struct {
	mcpService service.MCPService
}

func (m mcpControllerImpl) MakeMCPServer() http.Handler {
	handler := mcpserver.NewStreamableHTTPServer(m.mcpService.MakeMCPServer())
	return handler
}

func NewMCPController(mcpService service.MCPService) MCPController {
	return &mcpControllerImpl{mcpService: mcpService}
}
