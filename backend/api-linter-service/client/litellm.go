package client

import (
	"errors"
	"strings"
)

func NewLiteLLMClient(apiKey string, model string, proxy string, rateLimitRPS float64, rateLimitBurst int, maxConcurrentRequests int, maxRetries int, extraBodyJSON string) (LLMClient, error) {
	if apiKey == "" {
		return nil, errors.New("LiteLLM: api key is required")
	}
	proxy = strings.TrimSpace(proxy)
	if proxy == "" {
		return nil, errors.New("LiteLLM: proxy URL is required")
	}
	model = strings.TrimSpace(model)
	if model == "" {
		return nil, errors.New("LiteLLM: model is required")
	}
	provider := llmProvider{
		name: "LiteLLM",
		diagnosticHeaders: []string{
			"Retry-After",
			"Retry-After-Ms",
			"X-Litellm-Call-Id",
			"X-Litellm-Model-Id",
			"X-Litellm-Attempted-Retries",
			"rate_limit_type",
			"reset_at",
			"X-Litellm-Key-Rpm-Limit",
			"X-Litellm-Timeout",
		},
		allowEmptyFinishReason:  true,
		contextLengthErrorCodes: []string{openAIContextLengthExceededCode},
		contextLengthErrorMarkers: []string{
			"contextwindowexceedederror",
			"contextwindow",
			"context_length",
			"context length",
			"context window",
			"input tokens exceed",
		},
	}
	return newOAIClient(provider, apiKey, model, proxy, rateLimitRPS, rateLimitBurst, maxConcurrentRequests, maxRetries, extraBodyJSON)
}
