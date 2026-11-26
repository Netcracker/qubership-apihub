package client

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/exception"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
	"github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"
	log "github.com/sirupsen/logrus"
	logtest "github.com/sirupsen/logrus/hooks/test"
	"golang.org/x/time/rate"
)

const (
	testModel              = "test-model"
	testMaxCompletionToken = 1234
	testRateLimitRPS       = 1000
	testRateLimitBurst     = 1000
	testMaxConcurrent      = 10
	testMaxRetries         = 2
	queuedRequestTimeout   = 50 * time.Millisecond
	boundedTestTimeout     = 10 * time.Second
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

func newTestClient(t *testing.T, handler http.HandlerFunc, maxConcurrent int, maxRetries int, extraBodyJSON string) LLMClient {
	t.Helper()
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)
	cl, err := NewOpenaiClient("sk-test", testModel, server.URL, testRateLimitRPS, testRateLimitBurst, maxConcurrent, maxRetries, extraBodyJSON)
	if err != nil {
		t.Fatalf("failed to create client: %v", err)
	}
	return cl
}

func respond(t *testing.T, failing int32, failStatus int, status int, body string, captured *map[string]any) http.HandlerFunc {
	var requests atomic.Int32
	return func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewDecoder(r.Body).Decode(captured); err != nil {
			t.Errorf("failed to decode request body: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		if requests.Add(1) <= failing {
			w.Header().Set("Retry-After-Ms", "1")
			w.WriteHeader(failStatus)
			_, _ = fmt.Fprintf(w, `{"error":{"message":%q,"type":null,"param":null,"code":null}}`, http.StatusText(failStatus))
			return
		}
		w.WriteHeader(status)
		_, _ = io.WriteString(w, body)
	}
}

func TestDeduplicateIssuesResponses(t *testing.T) {
	const sdkAttempts = testMaxRetries + 1
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
		{name: "empty finish reason is rejected", body: completionBody("", `{"duplicates":[]}`, "", fullUsage), wantErr: errUntyped, wantUsage: wantFullUsage},
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
			name:    "gateway context window message without OpenAI code stays untyped",
			status:  http.StatusBadRequest,
			body:    `{"error":{"message":"litellm.ContextWindowExceededError: Input tokens exceed the configured limit of 272000 tokens","type":null,"param":null,"code":"400"}}`,
			wantErr: errUntyped,
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
			cl := newTestClient(t, respond(t, tt.rateLimited, http.StatusTooManyRequests, status, tt.body, &captured), testMaxConcurrent, testMaxRetries, "")

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

func TestLintOasDocumentSendsCompletionLimitAndExtraBody(t *testing.T) {
	var captured map[string]any
	body := completionBody("stop", `{"issues":[{"path":["info"],"code":"c","severity":"info","message":"m"}]}`, "", fullUsage)
	cl := newTestClient(t, respond(t, 0, 0, http.StatusOK, body, &captured), testMaxConcurrent, testMaxRetries, `{"thinking":{"type":"disabled"}}`)

	issues, _, err := cl.LintOasDocument(context.Background(), `{"info":{}}`, "prompt", testMaxCompletionToken)
	if err != nil || len(issues) != 1 {
		t.Fatalf("expected one issue, got %v, %v", issues, err)
	}
	if got := captured["max_completion_tokens"]; got != float64(testMaxCompletionToken) {
		t.Errorf("expected max_completion_tokens %d, got %v", testMaxCompletionToken, got)
	}
	if thinking, ok := captured["thinking"].(map[string]any); !ok || thinking["type"] != "disabled" {
		t.Errorf("expected thinking.type=disabled in request body, got %v", captured["thinking"])
	}
}

func TestLintOasDocumentRejectsMissingIssues(t *testing.T) {
	tests := []struct {
		name    string
		content string
		wantErr bool
	}{
		{name: "missing issues field", content: `{}`, wantErr: true},
		{name: "null issues", content: `{"issues":null}`, wantErr: true},
		{name: "empty issues", content: `{"issues":[]}`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var captured map[string]any
			cl := newTestClient(t, respond(t, 0, 0, http.StatusOK, completionBody("stop", tt.content, "", fullUsage), &captured), testMaxConcurrent, testMaxRetries, "")

			issues, _, err := cl.LintOasDocument(context.Background(), `{"info":{}}`, "prompt", testMaxCompletionToken)

			if tt.wantErr && !errors.Is(err, aiError(exception.AiMalformedOutput, "")) {
				t.Fatalf("expected a malformed output error, got %v, %v", issues, err)
			}
			if !tt.wantErr && (err != nil || issues == nil || len(issues) != 0) {
				t.Fatalf("expected an empty issue list, got %#v, %v", issues, err)
			}
		})
	}
}

func TestTrackAttemptsLogsCancelledAttemptAtDebug(t *testing.T) {
	hook := captureLogs(t)
	logger := log.StandardLogger()
	previousLevel := logger.GetLevel()
	logger.SetLevel(log.DebugLevel)
	t.Cleanup(func() { logger.SetLevel(previousLevel) })
	errSibling := errors.New("sibling request failed")
	ctx, cancel := context.WithCancelCause(context.Background())
	defer cancel(nil)
	attempts := 0
	cl := &oaiClientImpl{provider: llmProvider{name: "OpenAI"}, rateLimiter: rate.NewLimiter(rate.Inf, 0)}

	_, err := cl.trackAttempts("schema", &attempts)(httptest.NewRequestWithContext(ctx, http.MethodPost, "/", nil), func(*http.Request) (*http.Response, error) {
		cancel(errSibling)
		return nil, errSibling
	})

	if !errors.Is(err, errSibling) {
		t.Fatalf("expected the transport error, got %v", err)
	}
	entries := hook.AllEntries()
	if len(entries) != 1 || entries[0].Level != log.DebugLevel || !strings.HasPrefix(entries[0].Message, "AI request schema: attempt 1 cancelled after ") {
		t.Fatalf("expected one debug entry for the cancelled attempt, got %v", entries)
	}
}

func TestTrackAttemptsDoesNotDispatchCancelledAttempt(t *testing.T) {
	exhausted := rate.NewLimiter(0, 1)
	exhausted.Allow()
	tests := []struct {
		name       string
		limiter    *rate.Limiter
		newContext func(t *testing.T) context.Context
	}{
		{
			name:    "context cancelled before the attempt",
			limiter: rate.NewLimiter(rate.Inf, 0),
			newContext: func(*testing.T) context.Context {
				ctx, cancel := context.WithCancel(context.Background())
				cancel()
				return ctx
			},
		},
		{
			name:    "context cancelled while waiting for a token",
			limiter: exhausted,
			newContext: func(t *testing.T) context.Context {
				ctx, cancel := context.WithCancel(context.Background())
				t.Cleanup(cancel)
				go func() {
					// The token count goes negative once Wait has reserved a token and is about to block.
					for exhausted.Tokens() >= 0 && ctx.Err() == nil {
						time.Sleep(time.Millisecond)
					}
					cancel()
				}()
				return ctx
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			attempts := 0
			cl := &oaiClientImpl{provider: llmProvider{name: "OpenAI"}, rateLimiter: tt.limiter}

			_, err := cl.trackAttempts("schema", &attempts)(httptest.NewRequestWithContext(tt.newContext(t), http.MethodPost, "/", nil), func(*http.Request) (*http.Response, error) {
				t.Error("expected the attempt not to be dispatched")
				return nil, nil
			})

			if !errors.Is(err, context.Canceled) || attempts != 0 {
				t.Fatalf("expected the context error and no attempts, got %d, %v", attempts, err)
			}
		})
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
	}, 1, testMaxRetries, "")
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
	}, 0, testMaxRetries, "")

	done := make(chan error, 2)
	for range 2 {
		go func() {
			_, _, err := cl.DeduplicateIssues(context.Background(), "system prompt", testDeduplicationRequest, testMaxCompletionToken)
			done <- err
		}()
	}
	for range 2 {
		<-entered
	}
	close(release)
	for range 2 {
		if err := <-done; err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	}
}

func TestDeduplicateIssuesRetries(t *testing.T) {
	okBody := completionBody("stop", `{"duplicates":[]}`, "", fullUsage)
	tests := []struct {
		name         string
		maxRetries   int
		failing      int32
		wantErr      bool
		wantAttempts int
	}{
		{name: "gateway timeout recovered by a retry", maxRetries: testMaxRetries, failing: 1, wantAttempts: 2},
		{name: "gateway timeout on every attempt", maxRetries: 5, failing: 6, wantErr: true, wantAttempts: 6},
		{name: "zero retries", maxRetries: 0, failing: 1, wantErr: true, wantAttempts: 1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var captured map[string]any
			var bodies []string
			handler := respond(t, tt.failing, http.StatusGatewayTimeout, http.StatusOK, okBody, &captured)
			cl := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
				body, err := io.ReadAll(r.Body)
				if err != nil {
					t.Errorf("failed to read request body: %v", err)
				}
				bodies = append(bodies, string(body))
				r.Body = io.NopCloser(bytes.NewReader(body))
				handler(w, r)
			}, testMaxConcurrent, tt.maxRetries, "")

			pairs, report, err := cl.DeduplicateIssues(context.Background(), "system prompt", testDeduplicationRequest, testMaxCompletionToken)

			if tt.wantErr && (err == nil || !strings.Contains(err.Error(), "504 Gateway Timeout")) {
				t.Fatalf("expected the gateway timeout error, got %v", err)
			}
			if !tt.wantErr && (err != nil || pairs == nil) {
				t.Fatalf("expected empty pairs, got %v, %v", pairs, err)
			}
			if report.ProviderAttempts != tt.wantAttempts || len(bodies) != tt.wantAttempts {
				t.Fatalf("expected %d attempts, got %d reported and %d received", tt.wantAttempts, report.ProviderAttempts, len(bodies))
			}
			for _, body := range bodies[1:] {
				if body != bodies[0] {
					t.Errorf("expected a retry to resend the same body, got %s and %s", bodies[0], body)
				}
			}
		})
	}
}

func TestRateLimitAppliesToEveryAttempt(t *testing.T) {
	const maxRetries, sdkAttempts = 3, 4
	var captured map[string]any
	var requests atomic.Int32
	handler := respond(t, sdkAttempts, http.StatusTooManyRequests, http.StatusOK, "", &captured)
	cl := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		handler(w, r)
	}, testMaxConcurrent, maxRetries, "")
	limiter := rate.NewLimiter(0, sdkAttempts)
	cl.(*oaiClientImpl).rateLimiter = limiter
	ctx, cancel := context.WithTimeout(context.Background(), boundedTestTimeout)
	defer cancel()

	_, report, err := cl.DeduplicateIssues(ctx, "system prompt", testDeduplicationRequest, testMaxCompletionToken)

	if !errors.Is(err, aiError(exception.AiRateLimitExceeded, "")) {
		t.Fatalf("expected the rate limit error, got %v", err)
	}
	if report.ProviderAttempts != sdkAttempts || requests.Load() != sdkAttempts {
		t.Errorf("expected %d attempts, got %d reported and %d received", sdkAttempts, report.ProviderAttempts, requests.Load())
	}
	if tokens := limiter.Tokens(); tokens != 0 {
		t.Errorf("expected every attempt to take a token, %v left", tokens)
	}
}

func TestDeduplicateIssuesRetriesTransportFailure(t *testing.T) {
	var captured map[string]any
	var requests atomic.Int32
	handler := respond(t, 0, 0, http.StatusOK, completionBody("stop", `{"duplicates":[]}`, "", fullUsage), &captured)
	cl := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		if requests.Add(1) == 1 {
			conn, _, err := w.(http.Hijacker).Hijack()
			if err != nil {
				t.Errorf("failed to hijack the connection: %v", err)
				return
			}
			_ = conn.Close()
			return
		}
		handler(w, r)
	}, testMaxConcurrent, testMaxRetries, "")

	_, report, err := cl.DeduplicateIssues(context.Background(), "system prompt", testDeduplicationRequest, testMaxCompletionToken)
	if err != nil || report.ProviderAttempts != 2 {
		t.Fatalf("expected success after 2 attempts, got %+v, %v", report, err)
	}
}

func TestDeduplicateIssuesCancelledDuringRetryDelay(t *testing.T) {
	var requests atomic.Int32
	responded := make(chan struct{}, 1)
	cl := newTestClient(t, func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Retry-After-Ms", "10000")
		w.WriteHeader(http.StatusGatewayTimeout)
		w.(http.Flusher).Flush()
		if requests.Add(1) == 1 {
			responded <- struct{}{}
		}
	}, testMaxConcurrent, testMaxRetries, "")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go func() {
		<-responded
		cancel()
	}()
	_, report, err := cl.DeduplicateIssues(ctx, "system prompt", testDeduplicationRequest, testMaxCompletionToken)
	if !errors.Is(err, context.Canceled) || report.ProviderAttempts != 1 || requests.Load() != 1 {
		t.Fatalf("expected the context error after 1 attempt, got %+v, %d received, %v", report, requests.Load(), err)
	}
}

func TestCancelledRequestKeepsTheContextErrorAndTheCause(t *testing.T) {
	errCause := errors.New("sibling request failed")
	tests := []struct {
		name       string
		newContext func(t *testing.T, dispatched <-chan struct{}) context.Context
		wantErr    error
	}{
		{
			name: "cancelled with a cause",
			newContext: func(t *testing.T, dispatched <-chan struct{}) context.Context {
				ctx, cancel := context.WithCancelCause(context.Background())
				t.Cleanup(func() { cancel(nil) })
				go func() {
					<-dispatched
					cancel(errCause)
				}()
				return ctx
			},
			wantErr: context.Canceled,
		},
		{
			name: "deadline with a cause",
			newContext: func(t *testing.T, _ <-chan struct{}) context.Context {
				ctx, cancel := context.WithTimeoutCause(context.Background(), queuedRequestTimeout, errCause)
				t.Cleanup(cancel)
				return ctx
			},
			wantErr: context.DeadlineExceeded,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var requests atomic.Int32
			dispatched := make(chan struct{}, 1)
			cl := newTestClient(t, func(_ http.ResponseWriter, r *http.Request) {
				// The server notices the closed connection only once the request body is read.
				_, _ = io.Copy(io.Discard, r.Body)
				if requests.Add(1) == 1 {
					dispatched <- struct{}{}
				}
				<-r.Context().Done()
			}, testMaxConcurrent, testMaxRetries, "")

			_, report, err := cl.LintOasDocument(tt.newContext(t, dispatched), `{"info":{}}`, "prompt", testMaxCompletionToken)

			if !errors.Is(err, tt.wantErr) || !strings.Contains(err.Error(), errCause.Error()) {
				t.Fatalf("expected %v with the cause %q, got %v", tt.wantErr, errCause, err)
			}
			if report.ProviderAttempts != 1 || requests.Load() != 1 {
				t.Fatalf("expected 1 attempt, got %d reported and %d received", report.ProviderAttempts, requests.Load())
			}
		})
	}
}

func captureLogs(t *testing.T) *logtest.Hook {
	t.Helper()
	logger := log.StandardLogger()
	previous := logger.ReplaceHooks(make(log.LevelHooks))
	t.Cleanup(func() { logger.ReplaceHooks(previous) })
	return logtest.NewLocal(logger)
}

func TestRateLimitedAttemptsLogOpenAIDiagnostics(t *testing.T) {
	providerMessage := "Rate limit reached for gpt-5: " + strings.Repeat("detail ", 120) + "try again shortly"
	hook := captureLogs(t)
	var requests atomic.Int32
	cl := newTestClient(t, func(w http.ResponseWriter, _ *http.Request) {
		requests.Add(1)
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Retry-After", "60")
		w.Header().Set("Retry-After-Ms", "1")
		w.Header().Set("X-Request-Id", "req-1")
		w.Header().Set("X-Ratelimit-Limit-Requests", "100")
		w.Header().Set("X-Ratelimit-Remaining-Tokens", "0")
		w.Header().Set("X-Ratelimit-Reset-Tokens", "2s")
		w.Header().Set("X-Litellm-Call-Id", "ignored-by-openai-client")
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = fmt.Fprintf(w, "{\n  \"error\": {\"message\": %q, \"type\": \"tokens\", \"param\": null, \"code\": \"rate_limit_exceeded\"}\n}", providerMessage)
	}, testMaxConcurrent, 1, "")

	_, report, err := cl.DeduplicateIssues(context.Background(), "system prompt", testDeduplicationRequest, testMaxCompletionToken)

	if !errors.Is(err, aiError(exception.AiRateLimitExceeded, "")) {
		t.Fatalf("expected the rate limit error, got %v", err)
	}
	if wantSuffix := ": " + providerMessage + " (code rate_limit_exceeded)"; !strings.HasSuffix(err.Error(), wantSuffix) {
		t.Errorf("expected the error to end with %q, got %q", wantSuffix, err.Error())
	}
	if report.ProviderAttempts != 2 || requests.Load() != 2 {
		t.Fatalf("expected 2 attempts, got %d reported and %d received", report.ProviderAttempts, requests.Load())
	}
	entries := hook.AllEntries()
	if len(entries) != 2 {
		t.Fatalf("expected a warning per attempt, got %d entries", len(entries))
	}
	wantDetails := `, Retry-After=60, Retry-After-Ms=1, X-Request-Id=req-1, X-Ratelimit-Limit-Requests=100, ` +
		`X-Ratelimit-Remaining-Tokens=0, X-Ratelimit-Reset-Tokens=2s, ` +
		`body: { "error": {"message": "` + providerMessage + `", "type": "tokens", "param": null, "code": "rate_limit_exceeded"} }`
	for i, entry := range entries {
		wantPrefix := fmt.Sprintf("AI request oas_issue_deduplication_response: attempt %d failed with HTTP 429 after ", i+1)
		if entry.Level != log.WarnLevel || !strings.HasPrefix(entry.Message, wantPrefix) || !strings.HasSuffix(entry.Message, wantDetails) {
			t.Errorf("unexpected log entry %s: %q", entry.Level, entry.Message)
		}
		if strings.Contains(entry.Message, "X-Litellm-Call-Id") {
			t.Errorf("expected OpenAI client not to log LiteLLM headers, got %q", entry.Message)
		}
	}
}

type readTrackingBody struct {
	io.Reader
	read   bool
	closed bool
}

func (b *readTrackingBody) Read(p []byte) (int, error) {
	b.read = true
	return b.Reader.Read(p)
}

func (b *readTrackingBody) Close() error {
	b.closed = true
	return nil
}

type oneOffErrReader struct{ err error }

func (r *oneOffErrReader) Read([]byte) (int, error) {
	if err := r.err; err != nil {
		r.err = nil
		return 0, err
	}
	return 0, io.EOF
}

func TestTrackAttemptsResponseBodies(t *testing.T) {
	longBody := `{"error":{"message":"` + strings.Repeat("x", 1500) + `"}}`
	tests := []struct {
		name       string
		status     int
		wantRead   bool
		wantLogged string
	}{
		{name: "successful response body is not read", status: http.StatusOK},
		{name: "long failed response body is logged in full", status: http.StatusTooManyRequests, wantRead: true, wantLogged: ", body: " + longBody},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hook := captureLogs(t)
			body := &readTrackingBody{Reader: strings.NewReader(longBody)}
			attempts := 0
			cl := &oaiClientImpl{provider: llmProvider{name: "OpenAI"}, rateLimiter: rate.NewLimiter(rate.Inf, 0)}

			resp, err := cl.trackAttempts("schema", &attempts)(httptest.NewRequest(http.MethodPost, "/", nil), func(*http.Request) (*http.Response, error) {
				return &http.Response{StatusCode: tt.status, Header: http.Header{}, Body: body}, nil
			})

			if err != nil || attempts != 1 {
				t.Fatalf("expected 1 attempt without error, got %d, %v", attempts, err)
			}
			if body.read != tt.wantRead {
				t.Errorf("expected body read %t, got %t", tt.wantRead, body.read)
			}
			if restored, err := io.ReadAll(resp.Body); err != nil || string(restored) != longBody {
				t.Errorf("expected the full body to stay readable, got %d bytes, %v", len(restored), err)
			}
			entries := hook.AllEntries()
			if tt.wantLogged == "" && len(entries) != 0 {
				t.Errorf("expected no log entries, got %q", hook.LastEntry().Message)
			}
			if tt.wantLogged != "" && (len(entries) != 1 || !strings.HasSuffix(entries[0].Message, tt.wantLogged)) {
				t.Errorf("expected one entry ending with %q, got %v", tt.wantLogged, entries)
			}
		})
	}
}

func TestTrackAttemptsReplaysBodyReadError(t *testing.T) {
	hook := captureLogs(t)
	errBodyRead := errors.New("connection reset")
	body := &readTrackingBody{Reader: io.MultiReader(strings.NewReader("partial"), &oneOffErrReader{err: errBodyRead})}
	attempts := 0
	cl := &oaiClientImpl{provider: llmProvider{name: "OpenAI"}, rateLimiter: rate.NewLimiter(rate.Inf, 0)}

	resp, err := cl.trackAttempts("schema", &attempts)(httptest.NewRequest(http.MethodPost, "/", nil), func(*http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: http.StatusTooManyRequests, Header: http.Header{}, Body: body}, nil
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	contents, readErr := io.ReadAll(resp.Body)
	closeErr := resp.Body.Close()

	if !errors.Is(readErr, errBodyRead) || string(contents) != "partial" {
		t.Errorf("expected the SDK to read 'partial' and then the read error, got %q, %v", contents, readErr)
	}
	if closeErr != nil || !body.closed {
		t.Errorf("expected the original body to be closed, got closed %t, %v", body.closed, closeErr)
	}
	if entry := hook.LastEntry(); entry == nil || !strings.HasSuffix(entry.Message, ", body read error: connection reset") {
		t.Errorf("expected the read error in the log, got %v", entry)
	}
}

type closeCancellingBody struct {
	io.Reader
	cancel func()
}

func (b closeCancellingBody) Close() error {
	b.cancel()
	return nil
}

func TestProviderErrorParsedAfterCancellationLeavesTheChain(t *testing.T) {
	errCause := errors.New("sibling request failed")
	ctx, cancel := context.WithCancelCause(context.Background())
	defer cancel(nil)
	body := `{"error":{"message":"unauthorized"}}`
	cl := newTestClient(t, func(http.ResponseWriter, *http.Request) {
		t.Error("expected the stubbed response to replace the request")
	}, testMaxConcurrent, 0, "")
	cl.(*oaiClientImpl).extraBodyOpts = []option.RequestOption{option.WithMiddleware(func(*http.Request, option.MiddlewareNext) (*http.Response, error) {
		return &http.Response{
			StatusCode: http.StatusUnauthorized,
			Header:     http.Header{},
			Body:       closeCancellingBody{Reader: strings.NewReader(body), cancel: func() { cancel(errCause) }},
		}, nil
	})}

	_, report, err := cl.DeduplicateIssues(ctx, "system prompt", testDeduplicationRequest, testMaxCompletionToken)

	if err == nil || ctx.Err() == nil {
		t.Fatalf("expected an error from a cancelled request, got %v with context error %v", err, ctx.Err())
	}
	if errors.As(err, new(*openai.Error)) {
		t.Errorf("expected the SDK error, which holds the raw response, to be out of the chain, got %v", err)
	}
	if !strings.Contains(err.Error(), "401 Unauthorized") || !strings.HasSuffix(err.Error(), errCause.Error()) {
		t.Errorf("expected the provider status and the cancellation cause, got %v", err)
	}
	if report.ProviderAttempts != 1 {
		t.Errorf("expected 1 attempt, got %d", report.ProviderAttempts)
	}
}

func TestProviderSecretsAreRedacted(t *testing.T) {
	const bearerToken, apiKey = "abc.def", "custom-provider-key-0000"

	t.Run("provider error response", func(t *testing.T) {
		hook := captureLogs(t)
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = fmt.Fprintf(w, `{"error":{"message":"Invalid header Authorization: Bearer %s for key %s","type":null,"param":null,"code":"401"}}`, bearerToken, apiKey)
		}))
		t.Cleanup(server.Close)
		cl, err := NewOpenaiClient(apiKey, testModel, server.URL, testRateLimitRPS, testRateLimitBurst, testMaxConcurrent, 0, "")
		if err != nil {
			t.Fatalf("failed to create client: %v", err)
		}

		_, _, err = cl.DeduplicateIssues(context.Background(), "system prompt", testDeduplicationRequest, testMaxCompletionToken)

		if err == nil || !strings.HasSuffix(err.Error(), ": Invalid header Authorization: Bearer *** for key *** (code 401)") {
			t.Fatalf("expected the redacted provider message in the error, got %v", err)
		}
		if errors.As(err, new(*openai.Error)) {
			t.Errorf("expected the SDK error, which holds the raw response, to be out of the chain, got %v", err)
		}
		entries := hook.AllEntries()
		if len(entries) != 1 {
			t.Fatalf("expected one warning, got %d entries", len(entries))
		}
		for _, secret := range []string{bearerToken, apiKey} {
			if strings.Contains(entries[0].Message, secret) || strings.Contains(err.Error(), secret) {
				t.Errorf("expected %q to be redacted, got log %q and error %q", secret, entries[0].Message, err.Error())
			}
		}
	})

	t.Run("refusal and malformed output", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_, _ = io.WriteString(w, completionBody("stop", "", "refused "+apiKey+" Bearer "+bearerToken, fullUsage))
		}))
		t.Cleanup(server.Close)
		cl, err := NewOpenaiClient(apiKey, testModel, server.URL, testRateLimitRPS, testRateLimitBurst, testMaxConcurrent, 0, "")
		if err != nil {
			t.Fatalf("failed to create client: %v", err)
		}

		_, _, err = cl.DeduplicateIssues(context.Background(), "system prompt", testDeduplicationRequest, testMaxCompletionToken)
		if !errors.Is(err, aiError(exception.AiRequestRefused, "")) {
			t.Fatalf("expected refusal error, got %v", err)
		}
		for _, secret := range []string{bearerToken, apiKey} {
			if strings.Contains(err.Error(), secret) {
				t.Errorf("expected %q redacted from refusal error, got %q", secret, err.Error())
			}
		}

		longInvalid := "not-json " + strings.Repeat("x", 300) + " " + apiKey + " Bearer " + bearerToken
		malformedServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_, _ = io.WriteString(w, completionBody("stop", longInvalid, "", fullUsage))
		}))
		t.Cleanup(malformedServer.Close)
		cl2, err := NewOpenaiClient(apiKey, testModel, malformedServer.URL, testRateLimitRPS, testRateLimitBurst, testMaxConcurrent, 0, "")
		if err != nil {
			t.Fatalf("failed to create client: %v", err)
		}

		_, _, err = cl2.DeduplicateIssues(context.Background(), "system prompt", testDeduplicationRequest, testMaxCompletionToken)
		if !errors.Is(err, aiError(exception.AiMalformedOutput, "")) {
			t.Fatalf("expected malformed output error, got %v", err)
		}
		if !strings.Contains(err.Error(), strings.Repeat("x", 300)) {
			t.Errorf("expected full malformed content without truncation, got %q", err.Error())
		}
		for _, secret := range []string{bearerToken, apiKey} {
			if strings.Contains(err.Error(), secret) {
				t.Errorf("expected %q redacted from malformed output error, got %q", secret, err.Error())
			}
		}
	})
}

func TestProviderErrorWithoutDetailKeepsStatus(t *testing.T) {
	const statusWithoutText = 522
	tests := []struct {
		name    string
		status  int
		body    string
		wantErr string
	}{
		{name: "empty error object", status: http.StatusBadGateway, body: `{"error":{}}`, wantErr: "OpenAI API error: 502 Bad Gateway"},
		{name: "non-JSON body", status: http.StatusBadGateway, body: "<html>upstream failed</html>", wantErr: "OpenAI API error: 502 Bad Gateway"},
		{name: "status without text", status: statusWithoutText, body: `{"error":{}}`, wantErr: "OpenAI API error: 522"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cl := newTestClient(t, func(w http.ResponseWriter, _ *http.Request) {
				w.WriteHeader(tt.status)
				_, _ = io.WriteString(w, tt.body)
			}, testMaxConcurrent, 0, "")

			_, _, err := cl.DeduplicateIssues(context.Background(), "system prompt", testDeduplicationRequest, testMaxCompletionToken)

			if err == nil || err.Error() != tt.wantErr || errors.As(err, new(*openai.Error)) {
				t.Fatalf("expected a plain error %q, got %v", tt.wantErr, err)
			}
		})
	}
}

func TestClientModel(t *testing.T) {
	openAIEmpty, err := NewOpenaiClient("sk-test", "", "", testRateLimitRPS, testRateLimitBurst, testMaxConcurrent, 0, "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if openAIEmpty.Model() != DefaultOpenAIModel {
		t.Fatalf("expected default OpenAI model %q, got %q", DefaultOpenAIModel, openAIEmpty.Model())
	}

	openAITrimmed, err := NewOpenaiClient("sk-test", "  gpt-5-mini  ", "", testRateLimitRPS, testRateLimitBurst, testMaxConcurrent, 0, "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if openAITrimmed.Model() != "gpt-5-mini" {
		t.Fatalf("expected trimmed OpenAI model %q, got %q", "gpt-5-mini", openAITrimmed.Model())
	}

	liteLLM, err := NewLiteLLMClient("litellm-key", "  openai/gpt-5  ", "https://litellm.example.com", testRateLimitRPS, testRateLimitBurst, testMaxConcurrent, 0, "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if liteLLM.Model() != "openai/gpt-5" {
		t.Fatalf("expected trimmed LiteLLM model %q, got %q", "openai/gpt-5", liteLLM.Model())
	}

	if got := NewStubLlmClient().Model(); got != "" {
		t.Fatalf("expected empty stub model, got %q", got)
	}
}
