package client

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/Netcracker/qubership-apihub/backend/agent/exception"

	"gopkg.in/resty.v1"
)

func newTestApihubClient(t *testing.T, status int) (*apihubClientImpl, func()) {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(status)
		fmt.Fprint(w, "{}")
	}))
	return &apihubClientImpl{apihubUrl: srv.URL, restyClient: resty.New()}, srv.Close
}

// Regression for issue #1027: a non-200 answer that is not an explicit
// not-found or unauthorized used to end in `return nil, err` with a nil error,
// silently returning (nil, nil), so an APIHUB failure read as invalid
// credentials in the auth strategies.
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
			if tc.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
			if tc.wantNil {
				assert.Nil(t, apiKey)
			}
		})
	}
}

func TestGetApiKeyByKeySuccess(t *testing.T) {
	c, closeSrv := newTestApihubClient(t, http.StatusOK)
	defer closeSrv()

	apiKey, err := c.GetApiKeyByKey(context.Background(), "key")
	assert.NoError(t, err)
	assert.NotNil(t, apiKey)
}

// Regression for issue #1027: same accidental (nil, nil) pattern as
// GetApiKeyByKey; 404 keeps the documented (nil, nil) contract, 401/403 keep
// returning the NoApihubAccess error from checkUnauthorized.
func TestGetPatByPATNon200Statuses(t *testing.T) {
	cases := []struct {
		name     string
		status   int
		wantNil  bool
		wantErr  bool
		wantCode string
	}{
		{name: "not found means unknown token", status: http.StatusNotFound, wantNil: true},
		{name: "unauthorized is the NoApihubAccess error", status: http.StatusUnauthorized, wantErr: true, wantCode: exception.NoApihubAccess},
		{name: "forbidden is the NoApihubAccess error", status: http.StatusForbidden, wantErr: true, wantCode: exception.NoApihubAccess},
		{name: "internal server error is an error", status: http.StatusInternalServerError, wantErr: true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			c, closeSrv := newTestApihubClient(t, tc.status)
			defer closeSrv()

			pat, err := c.GetPatByPAT(context.Background(), "token")
			if tc.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
			if tc.wantCode != "" {
				var customErr *exception.CustomError
				if assert.ErrorAs(t, err, &customErr) {
					assert.Equal(t, tc.wantCode, customErr.Code)
				}
			}
			if tc.wantNil {
				assert.Nil(t, pat)
			}
		})
	}
}

func TestGetPatByPATSuccess(t *testing.T) {
	c, closeSrv := newTestApihubClient(t, http.StatusOK)
	defer closeSrv()

	pat, err := c.GetPatByPAT(context.Background(), "token")
	assert.NoError(t, err)
	assert.NotNil(t, pat)
}

func TestCheckAuthTokenNon200Statuses(t *testing.T) {
	cases := []struct {
		name    string
		status  int
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
			if tc.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
			assert.False(t, ok)
		})
	}
}

func TestCheckApiKeyValidNon200Statuses(t *testing.T) {
	cases := []struct {
		name    string
		status  int
		wantErr bool
	}{
		{name: "unauthorized key is not valid", status: http.StatusUnauthorized},
		{name: "forbidden key is not valid", status: http.StatusForbidden},
		{name: "internal server error is an error", status: http.StatusInternalServerError, wantErr: true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			c, closeSrv := newTestApihubClient(t, tc.status)
			defer closeSrv()

			ok, err := c.CheckApiKeyValid("key")
			if tc.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
			assert.False(t, ok)
		})
	}
}
