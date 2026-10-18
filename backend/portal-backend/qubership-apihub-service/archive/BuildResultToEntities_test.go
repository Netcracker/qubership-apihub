package archive

import (
	"strings"
	"testing"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
)

func TestEnrichSearchTextWithMetadata(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		title    string
		metadata entity.Metadata
		want     []string
	}{
		{
			name:     "appends title and metadata",
			input:    "operation-body",
			title:    "Get User",
			metadata: entity.Metadata{"path": "/users/{id}", "method": "GET"},
			want:     []string{"operation-body", "Get User", `"/users/{id}"`, `"GET"`},
		},
		{
			name:     "appends metadata when title is empty",
			input:    "operation-body",
			title:    "",
			metadata: entity.Metadata{"path": "/users", "method": "POST"},
			want:     []string{"operation-body", `"/users"`, `"POST"`},
		},
		{
			name:     "appends empty metadata json",
			input:    "operation-body",
			title:    "List Users",
			metadata: entity.Metadata{},
			want:     []string{"operation-body", "List Users", "{}"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := enrichSearchTextWithMetadata([]byte(tt.input), tt.title, tt.metadata)
			if err != nil {
				t.Fatalf("enrichSearchTextWithMetadata() error = %v", err)
			}
			gotStr := string(got)
			for _, fragment := range tt.want {
				if !strings.Contains(gotStr, fragment) {
					t.Errorf("search text %q does not contain %q", gotStr, fragment)
				}
			}
		})
	}
}
