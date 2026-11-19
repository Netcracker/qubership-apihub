package security

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/portal-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/portal-backend/responder"
)

func TestRespondWithAuthFailedError_RespectsDebugFlag(t *testing.T) {
	secretCause := errors.New("ldap bind failed: secret")

	tests := []struct {
		name         string
		includeDebug bool
		wantDebug    bool
	}{
		{name: "omits debug when flag is off", includeDebug: false, wantDebug: false},
		{name: "includes debug when flag is on", includeDebug: true, wantDebug: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			a := Authenticator{responder: responder.NewResponder(tt.includeDebug)}
			rec := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodGet, "/", nil)

			a.respondWithAuthFailedError(rec, req, secretCause)

			if rec.Code != http.StatusUnauthorized {
				t.Fatalf("status = %d, want %d", rec.Code, http.StatusUnauthorized)
			}

			var body exception.CustomError
			if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
				t.Fatalf("unmarshal response: %v", err)
			}
			if body.Message != http.StatusText(http.StatusUnauthorized) {
				t.Fatalf("message = %q, want %q", body.Message, http.StatusText(http.StatusUnauthorized))
			}
			if tt.wantDebug {
				if body.Debug != secretCause.Error() {
					t.Fatalf("debug = %q, want %q", body.Debug, secretCause.Error())
				}
				return
			}
			if body.Debug != "" {
				t.Fatalf("debug = %q, want empty", body.Debug)
			}
		})
	}
}
