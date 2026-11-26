package client

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/exception"
	"github.com/openai/openai-go/v3"
	log "github.com/sirupsen/logrus"
)

func TestNewLiteLLMClientValidation(t *testing.T) {
	tests := []struct {
		name      string
		apiKey    string
		model     string
		proxy     string
		extraBody string
		wantErr   string
	}{
		{name: "missing api key", model: testModel, proxy: "https://litellm.example.com", wantErr: "LiteLLM: api key is required"},
		{name: "missing proxy URL", apiKey: "k", model: testModel, wantErr: "LiteLLM: proxy URL is required"},
		{name: "whitespace proxy URL", apiKey: "k", model: testModel, proxy: "   ", wantErr: "LiteLLM: proxy URL is required"},
		{name: "invalid proxy URL scheme", apiKey: "k", model: testModel, proxy: "ftp://litellm.example.com", wantErr: "LiteLLM: proxy URL must use http or https scheme"},
		{name: "missing proxy URL host", apiKey: "k", model: testModel, proxy: "https://", wantErr: "LiteLLM: proxy URL must have scheme and host"},
		{name: "missing model", apiKey: "k", proxy: "https://litellm.example.com", wantErr: "LiteLLM: model is required"},
		{name: "whitespace model", apiKey: "k", model: "  ", proxy: "https://litellm.example.com", wantErr: "LiteLLM: model is required"},
		{name: "invalid extra body JSON", apiKey: "k", model: testModel, proxy: "https://litellm.example.com", extraBody: "{bad", wantErr: "LiteLLM: parse extra body"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := NewLiteLLMClient(tt.apiKey, tt.model, tt.proxy, testRateLimitRPS, testRateLimitBurst, testMaxConcurrent, 0, tt.extraBody)
			if err == nil || !strings.Contains(err.Error(), tt.wantErr) {
				t.Fatalf("expected error containing %q, got %v", tt.wantErr, err)
			}
		})
	}
}

func TestLiteLLMResponses(t *testing.T) {
	tests := []struct {
		name       string
		status     int
		body       string
		wantErr    error
		wantPrefix string
	}{
		{
			name:       "ContextWindowExceededError in message",
			status:     http.StatusBadRequest,
			body:       `{"error":{"message":"litellm.ContextWindowExceededError: Input tokens exceed the configured limit of 272000 tokens","type":null,"param":null,"code":"400"}}`,
			wantErr:    aiError(exception.AiContextLengthExceeded, ""),
			wantPrefix: "LiteLLM API error: 400 Bad Request",
		},
		{
			name:       "contextwindow marker in type",
			status:     http.StatusBadRequest,
			body:       `{"error":{"message":"too many tokens","type":"ContextWindowError","param":null,"code":"400"}}`,
			wantErr:    aiError(exception.AiContextLengthExceeded, ""),
			wantPrefix: "LiteLLM API error: 400 Bad Request",
		},
		{
			name:       "standard context_length_exceeded code",
			status:     http.StatusBadRequest,
			body:       `{"error":{"message":"limit reached","type":"invalid_request_error","param":"messages","code":"context_length_exceeded"}}`,
			wantErr:    aiError(exception.AiContextLengthExceeded, ""),
			wantPrefix: "LiteLLM API error: 400 Bad Request",
		},
		{
			name:       "unrelated 400 stays untyped with LiteLLM prefix",
			status:     http.StatusBadRequest,
			body:       `{"error":{"message":"Invalid schema","type":"invalid_request_error","param":null,"code":"400"}}`,
			wantErr:    errUntyped,
			wantPrefix: "LiteLLM API error: 400 Bad Request",
		},
		{
			name:   "empty finish reason is accepted",
			status: http.StatusOK,
			body:   completionBody("", `{"duplicates":[]}`, "", fullUsage),
		},
		{
			name:    "length finish reason returns AiOutputLengthExceeded",
			status:  http.StatusOK,
			body:    completionBody("length", "", "", fullUsage),
			wantErr: aiError(exception.AiOutputLengthExceeded, ""),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(tt.status)
				_, _ = io.WriteString(w, tt.body)
			}))
			t.Cleanup(server.Close)

			cl, err := NewLiteLLMClient("litellm-custom-secret", testModel, server.URL, testRateLimitRPS, testRateLimitBurst, testMaxConcurrent, 0, "")
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			pairs, _, err := cl.DeduplicateIssues(context.Background(), "system prompt", testDeduplicationRequest, testMaxCompletionToken)
			if tt.wantErr == nil {
				if err != nil || pairs == nil {
					t.Fatalf("expected success with empty pairs, got %#v, %v", pairs, err)
				}
				return
			}
			if tt.wantErr == errUntyped {
				for _, typed := range []error{nil, aiError(exception.AiContextLengthExceeded, ""), aiError(exception.AiOutputLengthExceeded, ""), aiError(exception.AiRequestRefused, ""), aiError(exception.AiRateLimitExceeded, ""), aiError(exception.AiMalformedOutput, "")} {
					if errors.Is(err, typed) {
						t.Fatalf("expected untyped error, got %v", err)
					}
				}
			} else if !errors.Is(err, tt.wantErr) {
				t.Fatalf("expected error %v, got %v", tt.wantErr, err)
			}
			if errors.As(err, new(*openai.Error)) {
				t.Errorf("expected SDK error detached from chain, got %v", err)
			}
			if tt.wantPrefix != "" && !strings.Contains(err.Error(), tt.wantPrefix) {
				t.Errorf("expected error containing %q, got %q", tt.wantPrefix, err.Error())
			}
		})
	}
}

func TestLiteLLMRateLimitedAttemptsLogProviderDiagnostics(t *testing.T) {
	const providerMessage = "No deployments available for selected model, Try again in 60 seconds"
	hook := captureLogs(t)
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		requests.Add(1)
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Retry-After", "60")
		w.Header().Set("Retry-After-Ms", "1")
		w.Header().Set("X-Litellm-Call-Id", "call-1")
		w.Header().Set("X-Litellm-Model-Id", "model-1")
		w.Header().Set("X-Litellm-Attempted-Retries", "0")
		w.Header()["rate_limit_type"] = []string{"requests"}
		w.Header()["reset_at"] = []string{"2026-11-02T12:00:00Z"}
		w.Header().Set("X-Litellm-Key-Rpm-Limit", "10")
		w.Header().Set("X-Litellm-Timeout", "30")
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = fmt.Fprintf(w, "{\n  \"error\": {\"message\": %q, \"type\": \"None\", \"param\": null, \"code\": \"429\"}\n}", providerMessage)
	}))
	t.Cleanup(server.Close)

	cl, err := NewLiteLLMClient("litellm-key", testModel, server.URL, testRateLimitRPS, testRateLimitBurst, testMaxConcurrent, 1, "")
	if err != nil {
		t.Fatalf("failed to create client: %v", err)
	}

	_, report, err := cl.DeduplicateIssues(context.Background(), "system prompt", testDeduplicationRequest, testMaxCompletionToken)

	if !errors.Is(err, aiError(exception.AiRateLimitExceeded, "")) {
		t.Fatalf("expected the rate limit error, got %v", err)
	}
	if wantSuffix := "LiteLLM API error: 429 Too Many Requests: " + providerMessage + " (code 429)"; !strings.HasSuffix(err.Error(), wantSuffix) {
		t.Errorf("expected the error to end with %q, got %q", wantSuffix, err.Error())
	}
	if report.ProviderAttempts != 2 || requests.Load() != 2 {
		t.Fatalf("expected 2 attempts, got %d reported and %d received", report.ProviderAttempts, requests.Load())
	}
	entries := hook.AllEntries()
	if len(entries) != 2 {
		t.Fatalf("expected a warning per attempt, got %d entries", len(entries))
	}
	wantDetails := `, Retry-After=60, Retry-After-Ms=1, X-Litellm-Call-Id=call-1, X-Litellm-Model-Id=model-1, ` +
		`X-Litellm-Attempted-Retries=0, rate_limit_type=requests, reset_at=2026-11-02T12:00:00Z, ` +
		`X-Litellm-Key-Rpm-Limit=10, X-Litellm-Timeout=30, ` +
		`body: { "error": {"message": "` + providerMessage + `", "type": "None", "param": null, "code": "429"} }`
	for i, entry := range entries {
		wantPrefix := fmt.Sprintf("AI request oas_issue_deduplication_response: attempt %d failed with HTTP 429 after ", i+1)
		if entry.Level != log.WarnLevel || !strings.HasPrefix(entry.Message, wantPrefix) || !strings.HasSuffix(entry.Message, wantDetails) {
			t.Errorf("unexpected log entry %s: %q", entry.Level, entry.Message)
		}
	}
}
