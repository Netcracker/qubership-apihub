package controller

import (
	"context"
	"net/http"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/service"
	mcpserver "github.com/mark3labs/mcp-go/server"
)

const mcpSessionIdleTTL = 15 * time.Minute

type MCPController interface {
	MakeMCPServer() http.Handler
}

func NewMCPController(mcpService service.MCPService) MCPController {
	return &mcpControllerImpl{mcpService: mcpService}
}

type mcpControllerImpl struct {
	mcpService service.MCPService
}

func (m *mcpControllerImpl) MakeMCPServer() http.Handler {
	return mcpserver.NewStreamableHTTPServer(
		m.mcpService.MakeMCPServer(),
		mcpserver.WithSessionIdleTTL(mcpSessionIdleTTL),
		mcpserver.WithHTTPContextFunc(func(ctx context.Context, r *http.Request) context.Context {
			return secctx.MakeUserContext(r)
		}),
	)
}
