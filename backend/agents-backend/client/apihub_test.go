package client

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/agents-backend/view"
	"gopkg.in/resty.v1"
)

func newTestApihubClient(t *testing.T, status int) (apihubClientImpl, func()) {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(status)
		fmt.Fprint(w, "{}")
	}))
	return apihubClientImpl{apihubUrl: srv.URL, client: resty.New()}, srv.Close
}

// Regression for issue #1027: a non-200 answer that is not an explicit
// not-found or unauthorized used to end in `return nil, err` with a nil error,
// silently returning (nil, nil), so APIHUB failures read as invalid credentials.
func TestGetApiKeyByKeyNon200Statuses(t *testing.T) {
	cases := []struct {
		name    string
		status  int
		wantNil bool
		wantErr bool
	}{
		{name: "not found means unknown key", status: http.StatusNotFound, wantNil: true},
		{name: "unauthorized means invalid key", status: http.StatusUnauthorized, wantNil: true},
		{name: "forbidden means invalid key", status: http.StatusForbidden, wantNil: true},
		{name: "internal server error is an error", status: http.StatusInternalServerError, wantErr: true},
		{name: "service unavailable is an error", status: http.StatusServiceUnavailable, wantErr: true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			c, closeSrv := newTestApihubClient(t, tc.status)
			defer closeSrv()

			apiKey, err := c.GetApiKeyByKey(context.Background(), "key")
			if tc.wantErr && err == nil {
				t.Fatalf("err = nil, want an error carrying status %d", tc.status)
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("err = %v, want nil", err)
			}
			if tc.wantNil && apiKey != nil {
				t.Fatalf("apiKey = %+v, want nil", apiKey)
			}
		})
	}
}

func TestGetApiKeyByKeySuccess(t *testing.T) {
	c, closeSrv := newTestApihubClient(t, http.StatusOK)
	defer closeSrv()

	apiKey, err := c.GetApiKeyByKey(context.Background(), "key")
	if err != nil {
		t.Fatalf("err = %v, want nil", err)
	}
	if apiKey == nil {
		t.Fatal("apiKey = nil, want a parsed view")
	}
}

// Regression for issue #1027: same accidental (nil, nil) pattern as
// GetApiKeyByKey; 404 and 401/403 keep the documented (nil, nil) contract.
func TestGetPatByPATNon200Statuses(t *testing.T) {
	cases := []struct {
		name    string
		status  int
		wantNil bool
		wantErr bool
	}{
		{name: "not found means unknown token", status: http.StatusNotFound, wantNil: true},
		{name: "unauthorized means rejected token", status: http.StatusUnauthorized, wantNil: true},
		{name: "forbidden means rejected token", status: http.StatusForbidden, wantNil: true},
		{name: "internal server error is an error", status: http.StatusInternalServerError, wantErr: true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			c, closeSrv := newTestApihubClient(t, tc.status)
			defer closeSrv()

			pat, err := c.GetPatByPAT(context.Background(), "token")
			if tc.wantErr && err == nil {
				t.Fatalf("err = nil, want an error carrying status %d", tc.status)
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("err = %v, want nil", err)
			}
			if tc.wantNil && pat != nil {
				t.Fatalf("pat = %+v, want nil", pat)
			}
		})
	}
}

func TestCheckAuthTokenNon200Statuses(t *testing.T) {
	cases := []struct {
		name    string
		status  int
		wantOk  bool
		wantErr bool
	}{
		{name: "unauthorized token is not authenticated", status: http.StatusUnauthorized},
		{name: "forbidden token is not authenticated", status: http.StatusForbidden},
		{name: "internal server error is an error", status: http.StatusInternalServerError, wantErr: true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			c, closeSrv := newTestApihubClient(t, tc.status)
			defer closeSrv()

			ok, err := c.CheckAuthToken(context.Background(), "token")
			if tc.wantErr && err == nil {
				t.Fatalf("err = nil, want an error carrying status %d", tc.status)
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("err = %v, want nil", err)
			}
			if !tc.wantErr && ok {
				t.Fatalf("ok = true, want false")
			}
		})
	}
}

// A transport failure in GetPackages is returned as an error, not as an empty
// result.
func TestGetPackagesTransportError(t *testing.T) {
	c, closeSrv := newTestApihubClient(t, http.StatusOK)
	closeSrv()

	_, err := c.GetPackages(context.Background(), view.PackagesSearchReq{})
	if err == nil {
		t.Fatal("err = nil, want a transport error")
	}
}
