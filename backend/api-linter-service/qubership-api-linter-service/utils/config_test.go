package utils

import (
	"testing"

	"github.com/Netcracker/qubership-api-linter-service/config"
)

func TestValidateConfigAILinter(t *testing.T) {
	tests := []struct {
		name    string
		cfg     config.AILinterConfig
		wantErr bool
	}{
		{
			name:    "disabled without API key passes",
			cfg:     config.AILinterConfig{Enabled: false, Workers: 1, OpenAI: config.OpenAIConfig{RateLimitRPS: 10, RateLimitBurst: 30}},
			wantErr: false,
		},
		{
			name:    "enabled without API key fails",
			cfg:     config.AILinterConfig{Enabled: true, Workers: 1, OpenAI: config.OpenAIConfig{RateLimitRPS: 10, RateLimitBurst: 30}},
			wantErr: true,
		},
		{
			name:    "enabled with API key passes",
			cfg:     config.AILinterConfig{Enabled: true, Workers: 1, OpenAI: config.OpenAIConfig{APIKey: "sk-test", RateLimitRPS: 10, RateLimitBurst: 30}},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateConfig(tt.cfg)
			if tt.wantErr && err == nil {
				t.Fatal("expected a validation error, got nil")
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("expected no validation error, got: %v", err)
			}
		})
	}
}
