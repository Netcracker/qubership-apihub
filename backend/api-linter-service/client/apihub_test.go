package client

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"gopkg.in/resty.v1"
)

func newTestApihubClient(t *testing.T, status int, body string) (apihubClientImpl, func()) {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(status)
		fmt.Fprint(w, body)
	}))
	return apihubClientImpl{apihubUrl: srv.URL, client: resty.New()}, srv.Close
}

// Regression for issue #1027: a non-200 status other than 401, 403, or 404
// used to end in `return nil, err` with a nil error, so an APIHUB failure was
// returned as (nil, nil), the same result as no access.
func TestGetAvailableRolesNon200Statuses(t *testing.T) {
	cases := []struct {
		name    string
		status  int
		wantNil bool
		wantErr bool
		errPart string
	}{
		{name: "unauthorized means no access", status: http.StatusUnauthorized, wantNil: true},
		{name: "forbidden means no access", status: http.StatusForbidden, wantNil: true},
		{name: "not found means no access", status: http.StatusNotFound, wantNil: true},
		{name: "internal server error is an error", status: http.StatusInternalServerError, wantErr: true, errPart: "500"},
		{name: "service unavailable is an error", status: http.StatusServiceUnavailable, wantErr: true, errPart: "503"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			c, closeSrv := newTestApihubClient(t, tc.status, "")
			defer closeSrv()

			roles, err := c.GetAvailableRoles(context.Background(), "pkg")
			if tc.wantErr {
				if err == nil {
					t.Fatalf("err = nil, want an error carrying status %d", tc.status)
				}
				if !strings.Contains(err.Error(), tc.errPart) {
					t.Fatalf("err = %v, want it to mention status %s", err, tc.errPart)
				}
			} else {
				if err != nil {
					t.Fatalf("err = %v, want nil", err)
				}
			}
			if tc.wantNil && roles != nil {
				t.Fatalf("roles = %+v, want nil", roles)
			}
		})
	}
}

func TestGetAvailableRolesSuccess(t *testing.T) {
	c, closeSrv := newTestApihubClient(t, http.StatusOK, `{"roles":[{"roleId":"developer","permissions":["manage_draft_version"]}]}`)
	defer closeSrv()

	roles, err := c.GetAvailableRoles(context.Background(), "pkg")
	if err != nil {
		t.Fatalf("err = %v, want nil", err)
	}
	if roles == nil || len(roles.Roles) != 1 {
		t.Fatalf("roles = %+v, want one role", roles)
	}
}

func TestGetAvailableRolesTransportError(t *testing.T) {
	c, closeSrv := newTestApihubClient(t, http.StatusOK, "")
	closeSrv()

	_, err := c.GetAvailableRoles(context.Background(), "pkg")
	if err == nil {
		t.Fatal("err = nil, want a transport error")
	}
}

// Regression for issue #1027: same accidental (nil, nil) pattern as
// GetAvailableRoles; 404 and 401/403 keep the documented (nil, nil) contract.
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
			c, closeSrv := newTestApihubClient(t, tc.status, "")
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

func TestGetPatByPATSuccess(t *testing.T) {
	c, closeSrv := newTestApihubClient(t, http.StatusOK, `{"name":"ci-token"}`)
	defer closeSrv()

	pat, err := c.GetPatByPAT(context.Background(), "token")
	if err != nil {
		t.Fatalf("err = %v, want nil", err)
	}
	if pat == nil {
		t.Fatal("pat = nil, want a parsed view")
	}
}

// Regression for issue #1027: GetApiKeyByKey returned (nil, nil) for any
// non-200 status, so an APIHUB failure was reported as an invalid key.
func TestGetApiKeyByKeyNon200Statuses(t *testing.T) {
	cases := []struct {
		name    string
		status  int
		wantErr bool
	}{
		{name: "not found means unknown key", status: http.StatusNotFound},
		{name: "unauthorized means rejected key", status: http.StatusUnauthorized},
		{name: "forbidden means rejected key", status: http.StatusForbidden},
		{name: "internal server error is an error", status: http.StatusInternalServerError, wantErr: true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			c, closeSrv := newTestApihubClient(t, tc.status, "")
			defer closeSrv()

			apiKey, err := c.GetApiKeyByKey("key")
			if tc.wantErr && err == nil {
				t.Fatalf("err = nil, want an error carrying status %d", tc.status)
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("err = %v, want nil", err)
			}
			if apiKey != nil {
				t.Fatalf("apiKey = %+v, want nil", apiKey)
			}
		})
	}
}

// Regression for issue #1027: GetRsaPublicKey returned (nil, nil) for an
// unexpected status, and startup then failed with "rsa public key is empty"
// instead of the status APIHUB returned.
func TestGetRsaPublicKeyUnexpectedStatusIsError(t *testing.T) {
	c, closeSrv := newTestApihubClient(t, http.StatusInternalServerError, "")
	defer closeSrv()

	key, err := c.GetRsaPublicKey(context.Background())
	if err == nil {
		t.Fatal("err = nil, want an error carrying status 500")
	}
	if !strings.Contains(err.Error(), "500") {
		t.Fatalf("err = %v, want it to mention status 500", err)
	}
	if key != nil {
		t.Fatalf("key = %+v, want nil", key)
	}
}
