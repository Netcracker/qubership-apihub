package midldleware

import (
	"net/http"
	"strings"
	"time"
)

const (
	mcpPathPrefix              = "/api/v1/mcp/"
	aiChatChatsPathPrefix      = "/api/v1/ai-chat/chats/"
	aiChatMessagesStreamSuffix = "/messages/stream"
)

// StreamingResponseWriteDeadline is the write deadline for AI chat SSE (long model turns, tool loops).
// MCP uses no per-write deadline (see WriteDeadlineMiddleware).
const StreamingResponseWriteDeadline = 30 * time.Minute

func isMCPPath(path string) bool {
	return strings.HasPrefix(path, mcpPathPrefix)
}

func isAiChatSSEPath(path string) bool {
	return strings.HasPrefix(path, aiChatChatsPathPrefix) && strings.HasSuffix(path, aiChatMessagesStreamSuffix)
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
