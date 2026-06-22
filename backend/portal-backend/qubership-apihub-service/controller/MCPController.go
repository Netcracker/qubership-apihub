package controller

import (
	"context"
	"net/http"
	"time"

	secctx "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
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
	return mcpserver.NewStreamableHTTPServer(
		m.mcpService.MakeMCPServer(),
		mcpserver.WithSessionIdleTTL(15*time.Minute),
		mcpserver.WithHTTPContextFunc(func(ctx context.Context, r *http.Request) context.Context {
			secCtx := secctx.Create(r)
			return service.SetSecCtxOnMCPCtx(ctx, secCtx)
		}),
	)
}

func NewMCPController(mcpService service.MCPService) MCPController {
	return &mcpControllerImpl{mcpService: mcpService}
}
