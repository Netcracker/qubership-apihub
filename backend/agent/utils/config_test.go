package utils

import (
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/agent/config"
)

func TestValidateConfigIncludeLabels(t *testing.T) {
	tests := []struct {
		name          string
		includeLabels []string
		wantErr       bool
	}{
		{name: "empty list", includeLabels: []string{}},
		{name: "prefixed key", includeLabels: []string{"app.kubernetes.io/part-of=abc"}},
		{name: "empty value", includeLabels: []string{"key="}},
		{name: "no delimiter", includeLabels: []string{"key"}, wantErr: true},
		{name: "empty key", includeLabels: []string{"=value"}, wantErr: true},
		{name: "invalid key", includeLabels: []string{"bad key=v"}, wantErr: true},
		{name: "invalid value", includeLabels: []string{"a=b=c"}, wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateConfig(config.DiscoveryConfig{IncludeLabels: tt.includeLabels})
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateConfig(%q) error = %v, wantErr %v", tt.includeLabels, err, tt.wantErr)
			}
		})
	}
}
