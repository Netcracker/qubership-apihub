package controller

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"
	"github.com/shaj13/go-guardian/v2/auth"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/exception"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/responder"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/service"
)

type permStubAuthorizationService struct {
	sufficientPrivileges bool
	permErr              error
}

func (s permStubAuthorizationService) HasRulesetReadPermission(context.Context) (bool, error) {
	return false, nil
}
func (s permStubAuthorizationService) HasRulesetListPermission(context.Context) (bool, error) {
	return false, nil
}
func (s permStubAuthorizationService) HasRulesetManagementPermission(context.Context) (bool, error) {
	return false, nil
}
func (s permStubAuthorizationService) HasReadPackagePermission(context.Context, string) (bool, error) {
	return false, nil
}
func (s permStubAuthorizationService) HasPublishPackagePermission(context.Context, string) (bool, error) {
	return s.sufficientPrivileges, s.permErr
}

var _ service.AuthorizationService = permStubAuthorizationService{}

// Checks how ValidateVersion maps the result of the permission check: an error
// becomes 500, a denial becomes 403 InsufficientPrivileges. The client and
// service fixes for issue #1027 are covered in their own packages.
func TestValidateVersionPermissionCheck(t *testing.T) {
	cases := []struct {
		name       string
		sufficient bool
		permErr    error
		wantStatus int
	}{
		{
			name:       "permission check failure is an error response without panic",
			sufficient: false,
			permErr:    errors.New("failed to get available roles for package 'pkg': status code 500"),
			wantStatus: http.StatusInternalServerError,
		},
		{
			name:       "insufficient privileges are a 403",
			sufficient: false,
			permErr:    nil,
			wantStatus: http.StatusForbidden,
		},
		{
			name:       "granted privileges start validation",
			sufficient: true,
			permErr:    nil,
			wantStatus: http.StatusAccepted,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			ctrl := NewValidationController(
				stubValidationService{},
				permStubAuthorizationService{sufficientPrivileges: tc.sufficient, permErr: tc.permErr},
				responder.NewResponder(true),
			)

			rec := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodPost, "/", nil)
			req = mux.SetURLVars(req, map[string]string{"packageId": "pkg", "version": "1.0.0"})
			req = auth.RequestWithUser(auth.NewDefaultUser("test", "test-id", nil, auth.Extensions{}), req)

			ctrl.ValidateVersion(rec, req)

			if rec.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d; body = %s", rec.Code, tc.wantStatus, rec.Body.String())
			}
			assertInsufficientPrivilegesCode(t, rec)
		})
	}
}

// Checks the same mapping for StartBulkValidation.
func TestStartBulkValidationPermissionCheck(t *testing.T) {
	cases := []struct {
		name       string
		sufficient bool
		permErr    error
		wantStatus int
	}{
		{
			name:       "permission check failure is an error response without panic",
			sufficient: false,
			permErr:    errors.New("failed to get available roles for package 'pkg': status code 503"),
			wantStatus: http.StatusInternalServerError,
		},
		{
			name:       "insufficient privileges are a 403",
			sufficient: false,
			permErr:    nil,
			wantStatus: http.StatusForbidden,
		},
		{
			name:       "granted privileges start bulk validation",
			sufficient: true,
			permErr:    nil,
			wantStatus: http.StatusAccepted,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			ctrl := NewValidationController(
				stubValidationService{},
				permStubAuthorizationService{sufficientPrivileges: tc.sufficient, permErr: tc.permErr},
				responder.NewResponder(true),
			)

			rec := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString(`{"packageId":"pkg"}`))
			req = auth.RequestWithUser(auth.NewDefaultUser("test", "test-id", nil, auth.Extensions{}), req)

			ctrl.StartBulkValidation(rec, req)

			if rec.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d; body = %s", rec.Code, tc.wantStatus, rec.Body.String())
			}
			assertInsufficientPrivilegesCode(t, rec)
		})
	}
}

func assertInsufficientPrivilegesCode(t *testing.T, rec *httptest.ResponseRecorder) {
	t.Helper()
	if rec.Code != http.StatusForbidden {
		return
	}
	var body exception.CustomError
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("body = %s, want a JSON error: %v", rec.Body.String(), err)
	}
	if body.Code != exception.InsufficientPrivileges {
		t.Fatalf("code = %q, want %q", body.Code, exception.InsufficientPrivileges)
	}
}
