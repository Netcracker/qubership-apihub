package midldleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/mux"
)

const (
	// MCPPath is the MCP endpoint without the trailing slash. Some MCP clients strip the trailing
	// slash from the configured URL before sending the request, so the endpoint is served on both forms.
	MCPPath                    = "/api/v1/mcp"
	mcpPathPrefix              = MCPPath + "/"
	aiChatChatsPathPrefix      = "/api/v1/ai-chat/chats/"
	aiChatMessagesStreamSuffix = "/messages/stream"
	aiChatMessagesSuffix       = "/messages"
)

// StreamingResponseWriteDeadline is the write deadline for AI chat SSE (long model turns, tool loops).
// MCP uses no per-write deadline (see WriteDeadlineMiddleware).
const StreamingResponseWriteDeadline = 30 * time.Minute

func isMCPPath(path string) bool {
	return path == MCPPath || strings.HasPrefix(path, mcpPathPrefix)
}

// RegisterMCPRoutes serves the MCP handler on both /api/v1/mcp and /api/v1/mcp/.
func RegisterMCPRoutes(r *mux.Router, handler http.Handler) {
	r.Handle(MCPPath, handler)
	r.Handle(mcpPathPrefix, handler)
}

func isAiChatSSEPath(path string) bool {
	return strings.HasPrefix(path, aiChatChatsPathPrefix) && strings.HasSuffix(path, aiChatMessagesStreamSuffix)
}

func isAiChatTurnPath(path string) bool {
	if !strings.HasPrefix(path, aiChatChatsPathPrefix) {
		return false
	}
	return strings.HasSuffix(path, aiChatMessagesSuffix) || strings.HasSuffix(path, aiChatMessagesStreamSuffix)
}

// SkipResponseCompression is true for routes that must not use handlers.CompressHandler, to avoid
// buffering and broken flush semantics on long-lived streams.
func SkipResponseCompression(path string) bool {
	return isMCPPath(path) || isAiChatSSEPath(path)
}

// NewSelectiveCompressionHandler serves the router through compression except for long-lived
// streaming endpoints (MCP, AI chat SSE), which use corsOnly to skip CompressHandler.
func NewSelectiveCompressionHandler(corsOnly, corsWithCompression http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if SkipResponseCompression(r.URL.Path) {
			corsOnly.ServeHTTP(w, r)
			return
		}
		corsWithCompression.ServeHTTP(w, r)
	})
}
