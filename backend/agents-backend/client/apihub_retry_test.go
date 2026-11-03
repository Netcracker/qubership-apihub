package client

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/agents-backend/view"
)

func testRetryConfig() RetryConfig {
	return RetryConfig{
		Count:       3,
		WaitTime:    10 * time.Millisecond,
		MaxWaitTime: 50 * time.Millisecond,
	}
}

func TestApihubClient_GetPackageById_RetriesOnServerError(t *testing.T) {
	var calls int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if atomic.AddInt32(&calls, 1) <= 2 {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"packageId":"pkg1"}`))
	}))
	defer server.Close()

	c, err := NewApihubClient(server.URL, "token", testRetryConfig())
	if err != nil {
		t.Fatalf("failed to create client: %v", err)
	}

	pkg, err := c.GetPackageById(context.Background(), "pkg1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if pkg == nil || pkg.Id != "pkg1" {
		t.Fatalf("unexpected package: %+v", pkg)
	}
	if got := atomic.LoadInt32(&calls); got != 3 {
		t.Fatalf("expected 3 calls (2 failures + 1 success), got %d", got)
	}
}

func TestApihubClient_CreatePackage_DoesNotRetryOnServerError(t *testing.T) {
	var calls int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&calls, 1)
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer server.Close()

	c, err := NewApihubClient(server.URL, "token", testRetryConfig())
	if err != nil {
		t.Fatalf("failed to create client: %v", err)
	}

	_, err = c.CreatePackage(context.Background(), view.PackageCreateRequest{Name: "pkg1"})
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if got := atomic.LoadInt32(&calls); got != 1 {
		t.Fatalf("expected exactly 1 call (no retry), got %d", got)
	}
}
