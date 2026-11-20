package controller

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"
	"github.com/shaj13/go-guardian/v2/auth"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/responder"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/service"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
)

func TestValidationResultHandlersWriteASingleJSONBodyOnError(t *testing.T) {
	ctrl := NewValidationResultController(
		stubValidationService{resultErr: errors.New("cannot unmarshal string into Go struct field SpectralOutputItem.severity of type int")},
		stubAuthorizationService{},
		responder.NewResponder(true),
	)

	cases := []struct {
		name    string
		handler http.HandlerFunc
		vars    map[string]string
	}{
		{
			name:    "summary v2",
			handler: ctrl.GetValidationSummaryForVersion,
			vars:    map[string]string{"packageId": "pkg", "version": "0000.1"},
		},
		{
			name:    "summary v1",
			handler: ctrl.GetValidationSummaryForVersion_deprecated,
			vars:    map[string]string{"packageId": "pkg", "version": "0000.1"},
		},
		{
			name:    "details v2",
			handler: ctrl.GetValidationResultForDocument,
			vars:    map[string]string{"packageId": "pkg", "version": "0000.1", "slug": "public-api"},
		},
		{
			name:    "details v1",
			handler: ctrl.GetValidationResultForDocument_deprecated,
			vars:    map[string]string{"packageId": "pkg", "version": "0000.1", "slug": "public-api"},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			req = mux.SetURLVars(req, tc.vars)
			req = auth.RequestWithUser(auth.NewDefaultUser("test", "test-id", nil, auth.Extensions{}), req)

			tc.handler(rec, req)

			if rec.Code != http.StatusInternalServerError {
				t.Fatalf("status = %d, want 500; body = %s", rec.Code, rec.Body.String())
			}
			dec := json.NewDecoder(rec.Body)
			var payload map[string]interface{}
			if err := dec.Decode(&payload); err != nil {
				t.Fatalf("body is not a single JSON object: %v; body = %s", err, rec.Body.String())
			}
			if dec.More() {
				t.Fatalf("body contains a second JSON value: %s", rec.Body.String())
			}
			if payload["status"] != float64(http.StatusInternalServerError) {
				t.Fatalf("payload status = %v, want 500", payload["status"])
			}
		})
	}
}

type stubAuthorizationService struct{}

func (stubAuthorizationService) HasRulesetReadPermission(context.Context) (bool, error) {
	return false, nil
}
func (stubAuthorizationService) HasRulesetListPermission(context.Context) (bool, error) {
	return false, nil
}
func (stubAuthorizationService) HasRulesetManagementPermission(context.Context) (bool, error) {
	return false, nil
}
func (stubAuthorizationService) HasReadPackagePermission(context.Context, string) (bool, error) {
	return true, nil
}
func (stubAuthorizationService) HasPublishPackagePermission(context.Context, string) (bool, error) {
	return false, nil
}

type stubValidationService struct {
	resultErr error
}

func (s stubValidationService) ValidateVersion(context.Context, string, string, string, bool) (string, error) {
	return "", nil
}
func (s stubValidationService) GetVersionSummary(context.Context, string, string) (*view.ValidationSummaryForVersion, error) {
	return nil, s.resultErr
}
func (s stubValidationService) GetLintIssuesForPackageVersion(context.Context, string, string) (*view.VersionLintIssues, error) {
	return nil, nil
}
func (s stubValidationService) GetVersionSummary_deprecated(context.Context, string, string) (*view.ValidationSummaryForVersion, error) {
	return nil, s.resultErr
}
func (s stubValidationService) GetValidationResult_deprecated(context.Context, string, string, string) (*view.DocumentResult_deprecated, error) {
	return nil, s.resultErr
}
func (s stubValidationService) GetValidationResult(context.Context, string, string, string) (*view.DocumentResult, error) {
	return nil, s.resultErr
}
func (s stubValidationService) StartBulkValidation(context.Context, view.BulkValidationRequest) (string, error) {
	return "", nil
}
func (s stubValidationService) GetBulkValidationStatus(context.Context, string) (*view.BulkValidationStatusResponse, error) {
	return nil, nil
}

var _ service.ValidationService = stubValidationService{}
var _ service.AuthorizationService = stubAuthorizationService{}
