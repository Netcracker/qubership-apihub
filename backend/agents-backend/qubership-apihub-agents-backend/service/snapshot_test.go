package service

import (
	"encoding/json"
	"testing"

	"github.com/Netcracker/qubership-apihub-agents-backend/view"
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
