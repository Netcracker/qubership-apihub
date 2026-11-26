package client

import (
	"context"
	"errors"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
)

type LLMClient interface {
	Model() string
	LintOasDocument(ctx context.Context, docStr string, prompt string, maxCompletionTokens int) ([]view.AiValidationIssue, RequestReport, error)
	DeduplicateIssues(ctx context.Context, systemPrompt string, request view.AiDeduplicationRequest, maxCompletionTokens int) ([]view.AiDuplicatePair, RequestReport, error)
}

type TokenUsage struct {
	PromptTokens       int
	CompletionTokens   int
	ReasoningTokens    int
	CachedPromptTokens int
}

// RequestReport describes one chat completion request.
type RequestReport struct {
	Model            string
	FinishReason     string
	Usage            *TokenUsage
	ProviderAttempts int // counts HTTP requests including SDK retries; 0 means the request was never dispatched
	Duration         time.Duration
}

func NewStubLlmClient() LLMClient {
	return &stubLlmClient{}
}

type stubLlmClient struct{}

func (s stubLlmClient) Model() string {
	return ""
}

func (s stubLlmClient) LintOasDocument(ctx context.Context, docStr string, prompt string, maxCompletionTokens int) ([]view.AiValidationIssue, RequestReport, error) {
	return nil, RequestReport{}, errors.New("LLM client is not configured, using stub instead of implementation")
}

func (s stubLlmClient) DeduplicateIssues(ctx context.Context, systemPrompt string, request view.AiDeduplicationRequest, maxCompletionTokens int) ([]view.AiDuplicatePair, RequestReport, error) {
	return nil, RequestReport{}, errors.New("LLM client is not configured, using stub instead of implementation")
}
