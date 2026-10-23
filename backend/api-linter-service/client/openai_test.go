package client

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"reflect"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/exception"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
)

const (
	testModel              = "test-model"
	testMaxCompletionToken = 1234
	testRateLimitRPS       = 1000
	testRateLimitBurst     = 1000
	testMaxConcurrent      = 10
	queuedRequestTimeout   = 50 * time.Millisecond
)

var (
	fullUsage = map[string]any{
		"prompt_tokens":             100,
		"completion_tokens":         20,
		"total_tokens":              120,
		"completion_tokens_details": map[string]any{"reasoning_tokens": 5},
		"prompt_tokens_details":     map[string]any{"cached_tokens": 40},
	}
	wantFullUsage = &TokenUsage{PromptTokens: 100, CompletionTokens: 20, ReasoningTokens: 5, CachedPromptTokens: 40}

	testDeduplicationRequest = view.AiDeduplicationRequest{Groups: []view.AiDeduplicationGroup{{
		Path:  []string{"paths", "/pets"},
		Known: []view.AiDeduplicationIssue{},
		New:   []view.AiDeduplicationIssue{{Id: 0, Code: "c", Severity: "warning", Message: "m"}, {Id: 1, Code: "c", Severity: "warning", Message: "m2"}},
	}}}

	errUntyped = errors.New("any untyped error")
)

// completionBody builds a chat completion response; a nil usage omits the field.
func completionBody(finishReason, content, refusal string, usage map[string]any) string {
	message := map[string]any{"role": "assistant", "content": content, "refusal": nil}
	if refusal != "" {
		message["refusal"] = refusal
	}
	body := map[string]any{
		"id":      "chatcmpl-test",
		"object":  "chat.completion",
		"created": 1,
		"model":   testModel,
		"choices": []any{map[string]any{"index": 0, "finish_reason": finishReason, "message": message, "logprobs": nil}},
	}
	if usage != nil {
		body["usage"] = usage
	}
	serialised, err := json.Marshal(body)
	if err != nil {
		panic(err)
	}
	return string(serialised)
}

func newTestClient(t *testing.T, handler http.HandlerFunc, maxConcurrent int, extraBodyJSON string) LLMClient {
	t.Helper()
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)
	cl, err := NewOpenaiClient("sk-test", testModel, server.URL, testRateLimitRPS, testRateLimitBurst, maxConcurrent, extraBodyJSON)
	if err != nil {
		t.Fatalf("failed to create client: %v", err)
	}
	return cl
}

// respond answers the first rateLimited requests with 429 and the rest with status and body; it keeps the last request body.
func respond(t *testing.T, rateLimited int32, status int, body string, captured *map[string]any) http.HandlerFunc {
	var requests atomic.Int32
	return func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewDecoder(r.Body).Decode(captured); err != nil {
			t.Errorf("failed to decode request body: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		if requests.Add(1) <= rateLimited {
			w.Header().Set("Retry-After-Ms", "1")
			w.WriteHeader(http.StatusTooManyRequests)
			_, _ = io.WriteString(w, `{"error":{"message":"Rate limit reached","type":"requests","param":null,"code":"rate_limit_exceeded"}}`)
			return
		}
		w.WriteHeader(status)
		_, _ = io.WriteString(w, body)
	}
}

func TestDeduplicateIssuesResponses(t *testing.T) {
	// The SDK makes one request and two retries by default.
	const sdkAttempts = 3
	tests := []struct {
		name         string
		rateLimited  int32
		status       int
		body         string
		wantErr      error
		wantPairs    []view.AiDuplicatePair
		wantUsage    *TokenUsage
		wantFinish   string
		wantAttempts int
	}{
		{name: "valid response with usage", body: completionBody("stop", `{"duplicates":[{"duplicateId":1,"keptId":0}]}`, "", fullUsage), wantPairs: []view.AiDuplicatePair{{DuplicateId: 1, KeptId: 0}}, wantUsage: wantFullUsage, wantFinish: "stop"},
		{name: "missing usage", body: completionBody("stop", `{"duplicates":[]}`, "", nil), wantPairs: []view.AiDuplicatePair{}, wantFinish: "stop"},
		{name: "missing duplicates field returns nil pairs", body: completionBody("stop", `{}`, "", fullUsage), wantUsage: wantFullUsage, wantFinish: "stop"},
		{name: "pair without 'keptId'", body: completionBody("stop", `{"duplicates":[{"duplicateId":1}]}`, "", fullUsage), wantErr: aiError(exception.AiMalformedOutput, ""), wantUsage: wantFullUsage, wantFinish: "stop"},
		{name: "length with content", body: completionBody("length", `{"duplicates":[`, "", fullUsage), wantErr: aiError(exception.AiOutputLengthExceeded, ""), wantUsage: wantFullUsage, wantFinish: "length"},
		{name: "length without content", body: completionBody("length", "", "", fullUsage), wantErr: aiError(exception.AiOutputLengthExceeded, ""), wantUsage: wantFullUsage, wantFinish: "length"},
		{name: "refusal", body: completionBody("stop", "", "I cannot help with that", fullUsage), wantErr: aiError(exception.AiRequestRefused, ""), wantUsage: wantFullUsage, wantFinish: "stop"},
		{name: "malformed output", body: completionBody("stop", "not json", "", fullUsage), wantErr: aiError(exception.AiMalformedOutput, ""), wantUsage: wantFullUsage, wantFinish: "stop"},
		{name: "empty choices", body: `{"id":"x","object":"chat.completion","created":1,"model":"test-model","choices":[]}`, wantErr: aiError(exception.AiMalformedOutput, "")},
		{
			name:    "OpenAI context length error",
			status:  http.StatusBadRequest,
			body:    `{"error":{"message":"This model's maximum context length is 128000 tokens.","type":"invalid_request_error","param":"messages","code":"context_length_exceeded"}}`,
			wantErr: aiError(exception.AiContextLengthExceeded, ""),
		},
		{
			name:    "LiteLLM context window error",
			status:  http.StatusBadRequest,
			body:    `{"error":{"message":"litellm.ContextWindowExceededError: Input tokens exceed the configured limit of 272000 tokens","type":null,"param":null,"code":"400"}}`,
			wantErr: aiError(exception.AiContextLengthExceeded, ""),
		},
		{
			name:    "other bad request",
			status:  http.StatusBadRequest,
			body:    `{"error":{"message":"Invalid schema for response_format","type":"invalid_request_error","param":null,"code":null}}`,
			wantErr: errUntyped,
		},
		{
			name:    "max_completion_tokens error",
			status:  http.StatusBadRequest,
			body:    `{"error":{"message":"max_completion_tokens is too large: 200000. This model supports at most 128000 completion tokens.","type":"invalid_request_error","param":"max_completion_tokens","code":null}}`,
			wantErr: errUntyped,
		},
		{name: "rate limit after SDK retries", rateLimited: sdkAttempts, wantErr: aiError(exception.AiRateLimitExceeded, ""), wantAttempts: sdkAttempts},
		{
			name:        "rate limit recovered by an SDK retry",
			rateLimited: 1,
			body:        completionBody("stop", `{"duplicates":[]}`, "", fullUsage),
			wantPairs:   []view.AiDuplicatePair{}, wantUsage: wantFullUsage, wantFinish: "stop", wantAttempts: 2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			status := tt.status
			if status == 0 {
				status = http.StatusOK
			}
			var captured map[string]any
			cl := newTestClient(t, respond(t, tt.rateLimited, status, tt.body, &captured), testMaxConcurrent, "")

			pairs, report, err := cl.DeduplicateIssues(context.Background(), "system prompt", testDeduplicationRequest, testMaxCompletionToken)

			if tt.wantErr == errUntyped {
				for _, typed := range []error{nil, aiError(exception.AiContextLengthExceeded, ""), aiError(exception.AiOutputLengthExceeded, ""), aiError(exception.AiRequestRefused, ""), aiError(exception.AiRateLimitExceeded, ""), aiError(exception.AiMalformedOutput, "")} {
					if errors.Is(err, typed) {
						t.Fatalf("expected an untyped error, got %v", err)
					}
				}
			} else if !errors.Is(err, tt.wantErr) {
				t.Fatalf("expected error %v, got %v", tt.wantErr, err)
			}
			if !reflect.DeepEqual(pairs, tt.wantPairs) {
				t.Errorf("expected pairs %#v, got %#v", tt.wantPairs, pairs)
			}
			wantAttempts := max(tt.wantAttempts, 1)
			if report.Model != testModel || report.FinishReason != tt.wantFinish || report.ProviderAttempts != wantAttempts || !reflect.DeepEqual(report.Usage, tt.wantUsage) {
				t.Errorf("expected model %s, finish reason %q, %d attempts and usage %+v, got %+v", testModel, tt.wantFinish, wantAttempts, tt.wantUsage, report)
			}
			if got := captured["max_completion_tokens"]; got != float64(testMaxCompletionToken) {
				t.Errorf("expected max_completion_tokens %d, got %v", testMaxCompletionToken, got)
			}
		})
	}
}

func TestLintOasDocumentHasNoCompletionLimitAndSendsExtraBody(t *testing.T) {
	var captured map[string]any
	body := completionBody("stop", `{"issues":[{"path":["info"],"code":"c","severity":"info","message":"m"}]}`, "", fullUsage)
	cl := newTestClient(t, respond(t, 0, http.StatusOK, body, &captured), testMaxConcurrent, `{"thinking":{"type":"disabled"}}`)

	issues, _, err := cl.LintOasDocument(context.Background(), `{"info":{}}`, "prompt")
	if err != nil || len(issues) != 1 {
		t.Fatalf("expected one issue, got %v, %v", issues, err)
	}
	if _, exists := captured["max_completion_tokens"]; exists {
		t.Errorf("lint request must not set max_completion_tokens, got %v", captured["max_completion_tokens"])
	}
	if thinking, ok := captured["thinking"].(map[string]any); !ok || thinking["type"] != "disabled" {
		t.Errorf("expected thinking.type=disabled in request body, got %v", captured["thinking"])
	}
}

func TestMaxConcurrentRequestsBoundsInFlightRequests(t *testing.T) {
	entered := make(chan struct{})
	release := make(chan struct{})
	cl := newTestClient(t, func(w http.ResponseWriter, _ *http.Request) {
		entered <- struct{}{}
		<-release
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, completionBody("stop", `{"duplicates":[]}`, "", fullUsage))
	}, 1, "")
	deduplicate := func(ctx context.Context) (RequestReport, error) {
		_, report, err := cl.DeduplicateIssues(ctx, "system prompt", testDeduplicationRequest, testMaxCompletionToken)
		return report, err
	}

	first := make(chan error)
	go func() {
		_, err := deduplicate(context.Background())
		first <- err
	}()
	<-entered

	queuedCtx, cancel := context.WithTimeout(context.Background(), queuedRequestTimeout)
	defer cancel()
	if report, err := deduplicate(queuedCtx); !errors.Is(err, context.DeadlineExceeded) || report.ProviderAttempts != 0 {
		t.Errorf("a request cancelled while waiting for the slot must not be dispatched, got %+v, %v", report, err)
	}

	release <- struct{}{}
	if err := <-first; err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	go func() {
		<-entered
		release <- struct{}{}
	}()
	if report, err := deduplicate(context.Background()); err != nil || report.ProviderAttempts != 1 {
		t.Fatalf("expected the released slot to be reused, got %+v, %v", report, err)
	}
}

func TestZeroMaxConcurrentRequestsIsUnbounded(t *testing.T) {
	entered := make(chan struct{}, 2)
	release := make(chan struct{})
	cl := newTestClient(t, func(w http.ResponseWriter, _ *http.Request) {
		entered <- struct{}{}
		<-release
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, completionBody("stop", `{"duplicates":[]}`, "", fullUsage))
	}, 0, "")

	done := make(chan error, 2)
	for range 2 {
		go func() {
			_, _, err := cl.DeduplicateIssues(context.Background(), "system prompt", testDeduplicationRequest, testMaxCompletionToken)
			done <- err
		}()
	}
	for range 2 {
		<-entered // both requests are dispatched before either completes
	}
	close(release)
	for range 2 {
		if err := <-done; err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	}
}
