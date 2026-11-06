package utils

import (
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/config"
)

func TestValidateConfigAILinter(t *testing.T) {
	openAI := config.OpenAIConfig{RateLimitRPS: 10, RateLimitBurst: 30, MaxConcurrentRequests: 10, MaxRetries: 5}
	openAIWithKey := openAI
	openAIWithKey.APIKey = "sk-test"
	deduplication := config.AIDeduplicationConfig{CriteriaPrompt: "test criterion", RequestTokenBudget: 24000, MaxCompletionTokens: 4000}
	withoutCriteria := deduplication
	withoutCriteria.CriteriaPrompt = ""
	withSmallRequestTokenBudget := deduplication
	withSmallRequestTokenBudget.RequestTokenBudget = 3999
	withSmallMaxCompletionTokens := deduplication
	withSmallMaxCompletionTokens.MaxCompletionTokens = 999
	withServiceOwnedExtraBodyKey := openAIWithKey
	withServiceOwnedExtraBodyKey.ExtraBodyJSON = `{"response_format":{}}`
	withNonObjectExtraBody := openAIWithKey
	withNonObjectExtraBody.ExtraBodyJSON = `null`
	withNegativeMaxRetries := openAIWithKey
	withNegativeMaxRetries.MaxRetries = -1
	lint := config.AILintConfig{MaxCompletionTokens: 12000, MaxRetriesOnInvalidOutput: 2}
	withSmallLintMaxCompletionTokens := lint
	withSmallLintMaxCompletionTokens.MaxCompletionTokens = 999
	withNegativeLintMaxRetriesOnInvalidOutput := lint
	withNegativeLintMaxRetriesOnInvalidOutput.MaxRetriesOnInvalidOutput = -1
	withZeroLintMaxRetriesOnInvalidOutput := lint
	withZeroLintMaxRetriesOnInvalidOutput.MaxRetriesOnInvalidOutput = 0

	tests := []struct {
		name    string
		cfg     config.AILinterConfig
		wantErr bool
	}{
		{
			name:    "disabled without API key passes",
			cfg:     config.AILinterConfig{Enabled: false, Workers: 1, OpenAI: openAI, Lint: lint, Deduplication: deduplication},
			wantErr: false,
		},
		{
			name:    "enabled without API key fails",
			cfg:     config.AILinterConfig{Enabled: true, Workers: 1, OpenAI: openAI, Lint: lint, Deduplication: deduplication},
			wantErr: true,
		},
		{
			name:    "enabled without deduplication criteria prompt fails",
			cfg:     config.AILinterConfig{Enabled: true, Workers: 1, OpenAI: openAIWithKey, Lint: lint, Deduplication: withoutCriteria},
			wantErr: true,
		},
		{
			name:    "deduplication request token budget below the minimum fails",
			cfg:     config.AILinterConfig{Enabled: true, Workers: 1, OpenAI: openAIWithKey, Lint: lint, Deduplication: withSmallRequestTokenBudget},
			wantErr: true,
		},
		{
			name:    "deduplication max completion tokens below the minimum fails",
			cfg:     config.AILinterConfig{Enabled: true, Workers: 1, OpenAI: openAIWithKey, Lint: lint, Deduplication: withSmallMaxCompletionTokens},
			wantErr: true,
		},
		{
			name:    "extra body setting a service-owned key fails",
			cfg:     config.AILinterConfig{Enabled: true, Workers: 1, OpenAI: withServiceOwnedExtraBodyKey, Lint: lint, Deduplication: deduplication},
			wantErr: true,
		},
		{
			name:    "extra body that is not a JSON object fails",
			cfg:     config.AILinterConfig{Enabled: true, Workers: 1, OpenAI: withNonObjectExtraBody, Lint: lint, Deduplication: deduplication},
			wantErr: true,
		},
		{
			name:    "negative max retries fails",
			cfg:     config.AILinterConfig{Enabled: true, Workers: 1, OpenAI: withNegativeMaxRetries, Lint: lint, Deduplication: deduplication},
			wantErr: true,
		},
		{
			name:    "lint max completion tokens below the minimum fails",
			cfg:     config.AILinterConfig{Enabled: true, Workers: 1, OpenAI: openAIWithKey, Lint: withSmallLintMaxCompletionTokens, Deduplication: deduplication},
			wantErr: true,
		},
		{
			name:    "negative lint max output retries fails",
			cfg:     config.AILinterConfig{Enabled: true, Workers: 1, OpenAI: openAIWithKey, Lint: withNegativeLintMaxRetriesOnInvalidOutput, Deduplication: deduplication},
			wantErr: true,
		},
		{
			name:    "zero lint max output retries passes",
			cfg:     config.AILinterConfig{Enabled: true, Workers: 1, OpenAI: openAIWithKey, Lint: withZeroLintMaxRetriesOnInvalidOutput, Deduplication: deduplication},
			wantErr: false,
		},
		{
			name:    "enabled with API key and deduplication settings passes",
			cfg:     config.AILinterConfig{Enabled: true, Workers: 1, OpenAI: openAIWithKey, Lint: lint, Deduplication: deduplication},
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
