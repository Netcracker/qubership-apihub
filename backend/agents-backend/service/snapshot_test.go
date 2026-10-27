package service

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/agents-backend/client"
	"github.com/Netcracker/qubership-apihub/backend/agents-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/agents-backend/view"
)

func TestServiceWithChangesErrorFlagsFromVersionContent(t *testing.T) {
	tests := []struct {
		name                       string
		payload                    string
		expectedHasErrors          bool
		expectedChangelogHasErrors *bool // nil means the key must be absent from the response
	}{
		{"both true", `{"hasErrors":true,"changelogHasErrors":true}`, true, boolPtr(true)},
		{"build error only", `{"hasErrors":true,"changelogHasErrors":false}`, true, boolPtr(false)},
		{"changelog error only", `{"hasErrors":false,"changelogHasErrors":true}`, false, boolPtr(true)},
		{"changelog flag omitted", `{"hasErrors":true}`, true, nil},
		{"changelog flag null", `{"hasErrors":false,"changelogHasErrors":null}`, false, nil},
		{"older apihub payload", `{"packageId":"pkg","version":"v1"}`, false, nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var v view.VersionContent
			if err := json.Unmarshal([]byte(tt.payload), &v); err != nil {
				t.Fatalf("unmarshal failed: %v", err)
			}
			data, err := json.Marshal(view.ServiceWithChanges{
				HasErrors:          v.HasErrors,
				ChangelogHasErrors: v.ChangelogHasErrors,
			})
			if err != nil {
				t.Fatalf("marshal failed: %v", err)
			}
			var m map[string]interface{}
			if err := json.Unmarshal(data, &m); err != nil {
				t.Fatalf("unmarshal response failed: %v", err)
			}
			if got, ok := m["hasErrors"]; !ok || got != tt.expectedHasErrors {
				t.Errorf("hasErrors = %v (present=%v), want %v", got, ok, tt.expectedHasErrors)
			}
			got, ok := m["changelogHasErrors"]
			if tt.expectedChangelogHasErrors == nil {
				if ok {
					t.Errorf("changelogHasErrors = %v, want key absent: %s", got, data)
				}
				return
			}
			if !ok || got != *tt.expectedChangelogHasErrors {
				t.Errorf("changelogHasErrors = %v (present=%v), want %v", got, ok, *tt.expectedChangelogHasErrors)
			}
		})
	}
}

func boolPtr(b bool) *bool { return &b }

type systemInfoApihubClient struct {
	client.ApihubClient
	info  *view.ApihubSystemInfo
	err   error
	calls int
}

func (c *systemInfoApihubClient) GetSystemInfo(ctx context.Context) (*view.ApihubSystemInfo, error) {
	c.calls++
	return c.info, c.err
}

func TestGetValidationRulesSeverity(t *testing.T) {
	t.Run("server build does not call system info", func(t *testing.T) {
		apihubClient := &systemInfoApihubClient{err: errors.New("must not be called")}
		s := &snapshotServiceImpl{apihubClient: apihubClient}
		severity, err := s.getValidationRulesSeverity(context.Background(), false)
		if err != nil || severity != nil {
			t.Errorf("got (%+v, %v), want (nil, nil)", severity, err)
		}
		if apihubClient.calls != 0 {
			t.Errorf("GetSystemInfo calls = %d, want 0", apihubClient.calls)
		}
	})
	t.Run("client build fails when system info fails", func(t *testing.T) {
		apihubClient := &systemInfoApihubClient{err: errors.New("connection refused")}
		s := &snapshotServiceImpl{apihubClient: apihubClient}
		severity, err := s.getValidationRulesSeverity(context.Background(), true)
		customErr := assertCustomError(t, err, exception.ApihubSystemInfoUnavailable)
		if customErr.Debug != "connection refused" {
			t.Errorf("debug = %q, want the cause", customErr.Debug)
		}
		if severity != nil {
			t.Errorf("severity = %+v, want nil", severity)
		}
	})

	tests := []struct {
		name               string
		info               *view.ApihubSystemInfo
		expectedBrokenRefs string // empty means an InvalidValidationRulesSeverity error is expected
	}{
		{"error", &view.ApihubSystemInfo{ValidationRulesSeverity: &view.ValidationRulesSeverity{BrokenRefs: view.BrokenRefsSeverityError}}, view.BrokenRefsSeverityError},
		{"warning", &view.ApihubSystemInfo{ValidationRulesSeverity: &view.ValidationRulesSeverity{BrokenRefs: view.BrokenRefsSeverityWarning}}, view.BrokenRefsSeverityWarning},
		{"nil system info", nil, ""},
		{"older apihub without severity", &view.ApihubSystemInfo{}, ""},
		{"empty value", &view.ApihubSystemInfo{ValidationRulesSeverity: &view.ValidationRulesSeverity{}}, ""},
		{"unsupported value", &view.ApihubSystemInfo{ValidationRulesSeverity: &view.ValidationRulesSeverity{BrokenRefs: "info"}}, ""},
	}
	for _, tt := range tests {
		t.Run("client build, "+tt.name, func(t *testing.T) {
			apihubClient := &systemInfoApihubClient{info: tt.info}
			s := &snapshotServiceImpl{apihubClient: apihubClient}
			severity, err := s.getValidationRulesSeverity(context.Background(), true)
			if apihubClient.calls != 1 {
				t.Errorf("GetSystemInfo calls = %d, want 1", apihubClient.calls)
			}
			if tt.expectedBrokenRefs == "" {
				assertCustomError(t, err, exception.InvalidValidationRulesSeverity)
				if severity != nil {
					t.Errorf("severity = %+v, want nil", severity)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if severity == nil || severity.BrokenRefs != tt.expectedBrokenRefs {
				t.Errorf("severity = %+v, want brokenRefs %q", severity, tt.expectedBrokenRefs)
			}
		})
	}
}

func TestBuildConfigValidationRulesSeverityJSON(t *testing.T) {
	tests := []struct {
		name     string
		severity *view.ValidationRulesSeverity
	}{
		{"server build omits the key", nil},
		{"client build carries brokenRefs", &view.ValidationRulesSeverity{BrokenRefs: view.BrokenRefsSeverityError}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data, err := json.Marshal(view.BuildConfig{ValidationRulesSeverity: tt.severity})
			if err != nil {
				t.Fatalf("marshal failed: %v", err)
			}
			var m map[string]interface{}
			if err := json.Unmarshal(data, &m); err != nil {
				t.Fatalf("unmarshal failed: %v", err)
			}
			got, ok := m["validationRulesSeverity"]
			if tt.severity == nil {
				if ok {
					t.Errorf("validationRulesSeverity = %v, want key absent: %s", got, data)
				}
				return
			}
			gotMap, isMap := got.(map[string]interface{})
			if !isMap || gotMap["brokenRefs"] != tt.severity.BrokenRefs {
				t.Errorf("validationRulesSeverity = %v, want brokenRefs %q", got, tt.severity.BrokenRefs)
			}
		})
	}
}

func assertCustomError(t *testing.T, err error, expectedCode string) *exception.CustomError {
	t.Helper()
	var customErr *exception.CustomError
	if !errors.As(err, &customErr) {
		t.Fatalf("error = %v, want *exception.CustomError", err)
	}
	if customErr.Code != expectedCode {
		t.Errorf("code = %q, want %q", customErr.Code, expectedCode)
	}
	if customErr.Status != http.StatusFailedDependency {
		t.Errorf("status = %d, want %d", customErr.Status, http.StatusFailedDependency)
	}
	return customErr
}
