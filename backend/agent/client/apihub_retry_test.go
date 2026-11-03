package client

import (
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/agent/secctx"
)

func TestApihubClient_GetVersions_RetriesOnServerError(t *testing.T) {
	var calls int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if atomic.AddInt32(&calls, 1) <= 2 {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"versions":[]}`))
	}))
	defer server.Close()

	retryCfg := RetryConfig{
		Count:       3,
		WaitTime:    10 * time.Millisecond,
		MaxWaitTime: 50 * time.Millisecond,
	}
	c, err := NewApihubClient(server.URL, "token", "cloud", retryCfg)
	if err != nil {
		t.Fatalf("failed to create client: %v", err)
	}

	versions, err := c.GetVersions(secctx.CreateSystemContext(), "pkg1", 0, 100)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if versions == nil {
		t.Fatal("expected non-nil versions")
	}
	if got := atomic.LoadInt32(&calls); got != 3 {
		t.Fatalf("expected 3 calls (2 failures + 1 success), got %d", got)
	}
}
