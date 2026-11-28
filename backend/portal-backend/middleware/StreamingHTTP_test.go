package midldleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
)

func TestIsMCPPath(t *testing.T) {
	assert.True(t, isMCPPath("/api/v1/mcp"))
	assert.True(t, isMCPPath("/api/v1/mcp/"))
	assert.True(t, isMCPPath("/api/v1/mcp/sse"))
	assert.False(t, isMCPPath("/api/v1/mcpx"))
	assert.False(t, isMCPPath("/api/v1/packages"))
}

func TestSkipResponseCompression_MCPWithAndWithoutTrailingSlash(t *testing.T) {
	assert.True(t, SkipResponseCompression("/api/v1/mcp"))
	assert.True(t, SkipResponseCompression("/api/v1/mcp/"))
	assert.False(t, SkipResponseCompression("/api/v1/packages"))
}

func TestRegisterMCPRoutes_BothFormsReachHandler(t *testing.T) {
	for _, path := range []string{"/api/v1/mcp", "/api/v1/mcp/"} {
		t.Run(path, func(t *testing.T) {
			r := mux.NewRouter()
			r.SkipClean(true)
			r.UseEncodedPath()
			called := false
			RegisterMCPRoutes(r, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				called = true
				w.WriteHeader(http.StatusAccepted)
			}))
			r.PathPrefix("/").HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				w.WriteHeader(http.StatusMisdirectedRequest)
			})

			rec := httptest.NewRecorder()
			r.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, path, nil))

			assert.True(t, called)
			assert.Equal(t, http.StatusAccepted, rec.Code)
		})
	}
}

func TestRequestTimeoutMiddleware_ExemptsMCPWithoutTrailingSlash(t *testing.T) {
	for _, path := range []string{"/api/v1/mcp", "/api/v1/mcp/"} {
		t.Run(path, func(t *testing.T) {
			var hasDeadline bool
			h := RequestTimeoutMiddleware(time.Second)(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
				_, hasDeadline = r.Context().Deadline()
			}))
			h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, path, nil))
			assert.False(t, hasDeadline)
		})
	}

	var hasDeadline bool
	h := RequestTimeoutMiddleware(time.Second)(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		_, hasDeadline = r.Context().Deadline()
	}))
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/api/v1/packages", nil))
	assert.True(t, hasDeadline)
}

func TestWriteDeadlineMiddleware_SkipsMCPWithoutTrailingSlash(t *testing.T) {
	for _, path := range []string{"/api/v1/mcp", "/api/v1/mcp/"} {
		t.Run(path, func(t *testing.T) {
			var wrapped bool
			h := WriteDeadlineMiddleware(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				_, wrapped = w.(*deadlineResponseWriter)
			}))
			h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, path, nil))
			assert.False(t, wrapped)
		})
	}
}
