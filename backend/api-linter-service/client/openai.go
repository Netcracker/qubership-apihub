package client

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"slices"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/exception"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/utils"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
	"github.com/invopop/jsonschema"
	"github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"
	log "github.com/sirupsen/logrus"
	"golang.org/x/sync/semaphore"
	"golang.org/x/time/rate"
)

const (
	DefaultOpenAIModel              = openai.ChatModelGPT5
	openAIContextLengthExceededCode = "context_length_exceeded"

	finishReasonStop   = "stop"
	finishReasonLength = "length"

	httpClientTimeout = 1800 * time.Second
	secretMask        = "***"
)

type llmProvider struct {
	name                      string
	diagnosticHeaders         []string
	allowEmptyFinishReason    bool
	contextLengthErrorCodes   []string
	contextLengthErrorMarkers []string
}

type errReader struct{ err error }

func (r errReader) Read([]byte) (int, error) {
	return 0, r.err
}

func dialTimeout(network, addr string) (net.Conn, error) {
	return net.DialTimeout(network, addr, httpClientTimeout)
}

func NewOpenaiClient(apiKey string, model string, proxy string, rateLimitRPS float64, rateLimitBurst int, maxConcurrentRequests int, maxRetries int, extraBodyJSON string) (LLMClient, error) {
	if model != "" {
		model = strings.TrimSpace(model)
		if model == "" {
			return nil, errors.New("OpenAI: model cannot be empty or whitespace")
		}
	} else {
		model = DefaultOpenAIModel
	}
	provider := llmProvider{
		name: "OpenAI",
		diagnosticHeaders: []string{
			"Retry-After",
			"Retry-After-Ms",
			"X-Request-Id",
			"X-Ratelimit-Limit-Requests",
			"X-Ratelimit-Limit-Tokens",
			"X-Ratelimit-Remaining-Requests",
			"X-Ratelimit-Remaining-Tokens",
			"X-Ratelimit-Reset-Requests",
			"X-Ratelimit-Reset-Tokens",
		},
		allowEmptyFinishReason:  false,
		contextLengthErrorCodes: []string{openAIContextLengthExceededCode},
	}
	return newOAIClient(provider, apiKey, model, proxy, rateLimitRPS, rateLimitBurst, maxConcurrentRequests, maxRetries, extraBodyJSON)
}

func newOAIClient(provider llmProvider, apiKey string, model string, proxy string,
	rateLimitRPS float64, rateLimitBurst int, maxConcurrentRequests int, maxRetries int, extraBodyJSON string) (LLMClient, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("%s: api key is required", provider.name)
	}
	opts := []option.RequestOption{option.WithAPIKey(apiKey)}

	var proxyPassword string
	if proxy != "" {
		parsed, err := url.Parse(proxy)
		if err != nil {
			return nil, errors.Join(fmt.Errorf("%s: invalid proxy URL", provider.name), err)
		}
		if parsed.Scheme == "" || parsed.Host == "" {
			return nil, fmt.Errorf("%s: proxy URL must have scheme and host", provider.name)
		}
		if parsed.Scheme != "http" && parsed.Scheme != "https" {
			return nil, fmt.Errorf("%s: proxy URL must use http or https scheme", provider.name)
		}
		if parsed.User != nil {
			proxyPassword, _ = parsed.User.Password()
		}
		opts = append(opts, option.WithBaseURL(proxy))
	}

	tlsConfig, err := utils.BuildSecureTLSConfig(nil)
	if err != nil {
		return nil, fmt.Errorf("build TLS config: %w", err)
	}
	tr := http.Transport{
		Dial:                  dialTimeout,
		TLSClientConfig:       tlsConfig,
		TLSHandshakeTimeout:   httpClientTimeout,
		IdleConnTimeout:       httpClientTimeout,
		ResponseHeaderTimeout: httpClientTimeout,
	}
	cl := http.Client{Transport: &tr, Timeout: httpClientTimeout}

	opts = append(opts, option.WithHTTPClient(&cl), option.WithMaxRetries(maxRetries))

	var extraBodyOpts []option.RequestOption
	if extraBodyJSON != "" {
		var extraBody map[string]any
		if err := json.Unmarshal([]byte(extraBodyJSON), &extraBody); err != nil {
			return nil, fmt.Errorf("%s: parse extra body: %w", provider.name, err)
		}
		for key, value := range extraBody {
			extraBodyOpts = append(extraBodyOpts, option.WithJSONSet(key, value))
		}
	}

	var concurrencyLimiter *semaphore.Weighted
	if maxConcurrentRequests > 0 {
		concurrencyLimiter = semaphore.NewWeighted(int64(maxConcurrentRequests))
	}

	return &oaiClientImpl{
		provider:            provider,
		apiKey:              apiKey,
		proxyPassword:       proxyPassword,
		bearerTokenPattern:  regexp.MustCompile(`(?i)(bearer\s+)[A-Za-z0-9._~+/=-]+`),
		client:              openai.NewClient(opts...),
		model:               model,
		rateLimiter:         rate.NewLimiter(rate.Limit(rateLimitRPS), rateLimitBurst),
		concurrencyLimiter:  concurrencyLimiter,
		extraBodyOpts:       extraBodyOpts,
		lintSchema:          generateSchema[view.AiValidationIssuesOutput](),
		deduplicationSchema: generateSchema[view.AiDeduplicationOutput](),
	}, nil
}

type oaiClientImpl struct {
	provider           llmProvider
	apiKey             string
	proxyPassword      string
	bearerTokenPattern *regexp.Regexp
	client             openai.Client
	model              openai.ChatModel
	rateLimiter        *rate.Limiter
	concurrencyLimiter *semaphore.Weighted
	extraBodyOpts      []option.RequestOption

	lintSchema          any
	deduplicationSchema any
}

func (o *oaiClientImpl) Model() string {
	return o.model
}

func (o *oaiClientImpl) LintOasDocument(ctx context.Context, docStr string, prompt string, maxCompletionTokens int) ([]view.AiValidationIssue, RequestReport, error) {
	var result view.AiValidationIssuesOutput
	report, err := o.complete(ctx, prompt, docStr, "oas_doc_lint_response", o.lintSchema, maxCompletionTokens, &result)
	if err != nil {
		return nil, report, err
	}
	if result.Issues == nil {
		return nil, report, fmt.Errorf("%w: the 'issues' field is missing or null", aiError(exception.AiMalformedOutput, exception.AiMalformedOutputMsg))
	}
	return result.Issues, report, nil
}

func (o *oaiClientImpl) DeduplicateIssues(ctx context.Context, systemPrompt string, request view.AiDeduplicationRequest, maxCompletionTokens int) ([]view.AiDuplicatePair, RequestReport, error) {
	report := RequestReport{Model: o.model}
	requestStr, err := json.Marshal(request)
	if err != nil {
		return nil, report, fmt.Errorf("failed to marshal deduplication request: %w", err)
	}

	var result view.AiDeduplicationOutput
	report, err = o.complete(ctx, systemPrompt, string(requestStr), "oas_issue_deduplication_response", o.deduplicationSchema, maxCompletionTokens, &result)
	if err != nil {
		return nil, report, err
	}
	return result.Duplicates, report, nil
}

// complete sends one chat completion with a strict JSON schema response format and unmarshals the answer into out.
func (o *oaiClientImpl) complete(ctx context.Context, systemPrompt string, userMessage string, schemaName string, schema any, maxCompletionTokens int, out any) (RequestReport, error) {
	report := RequestReport{Model: o.model}
	if o.concurrencyLimiter != nil {
		if err := o.concurrencyLimiter.Acquire(ctx, 1); err != nil {
			return report, err
		}
		defer o.concurrencyLimiter.Release(1)
	}

	reasoningEffort := ""
	if o.model == DefaultOpenAIModel {
		reasoningEffort = string(openai.ReasoningEffortMinimal)
	}

	params := openai.ChatCompletionNewParams{
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.SystemMessage(systemPrompt),
			openai.UserMessage(userMessage),
		},
		ResponseFormat: openai.ChatCompletionNewParamsResponseFormatUnion{
			OfJSONSchema: &openai.ResponseFormatJSONSchemaParam{JSONSchema: openai.ResponseFormatJSONSchemaJSONSchemaParam{
				Name:   schemaName,
				Schema: schema,
				Strict: openai.Bool(true),
			}},
		},
		ReasoningEffort: openai.ReasoningEffort(reasoningEffort),
		Model:           o.model,
	}
	if maxCompletionTokens > 0 {
		params.MaxCompletionTokens = openai.Int(int64(maxCompletionTokens))
	}

	attempts := 0
	start := time.Now()
	requestOpts := append([]option.RequestOption{option.WithMiddleware(o.trackAttempts(schemaName, &attempts))}, o.extraBodyOpts...)
	chat, err := o.client.Chat.Completions.New(ctx, params, requestOpts...)
	report.Duration = time.Since(start)
	report.ProviderAttempts = attempts
	if err != nil {
		err = o.classifyProviderError(err)
		if ctx.Err() != nil {
			// The SDK returns the bare context error and drops the cancellation cause, which names the request that failed first.
			if cause := context.Cause(ctx); !errors.Is(err, cause) {
				err = fmt.Errorf("%w: %s", err, o.maskSecrets(cause.Error()))
			}
		}
		return report, err
	}

	if chat.Model != "" {
		report.Model = chat.Model
	}
	if chat.JSON.Usage.Valid() {
		report.Usage = &TokenUsage{
			PromptTokens:       int(chat.Usage.PromptTokens),
			CompletionTokens:   int(chat.Usage.CompletionTokens),
			ReasoningTokens:    int(chat.Usage.CompletionTokensDetails.ReasoningTokens),
			CachedPromptTokens: int(chat.Usage.PromptTokensDetails.CachedTokens),
		}
	}
	if len(chat.Choices) == 0 {
		return report, fmt.Errorf("%w: response contains no choices", aiError(exception.AiMalformedOutput, exception.AiMalformedOutputMsg))
	}

	choice := chat.Choices[0]
	report.FinishReason = choice.FinishReason
	if choice.Message.Refusal != "" {
		return report, &exception.CustomError{Status: http.StatusBadGateway, Code: exception.AiRequestRefused, Message: exception.AiRequestRefusedMsg,
			Params: map[string]interface{}{"reason": o.maskSecrets(choice.Message.Refusal)}}
	}
	if choice.FinishReason == finishReasonLength {
		// Reasoning tokens count against the limit too, so the content may be empty.
		return report, aiError(exception.AiOutputLengthExceeded, exception.AiOutputLengthExceededMsg)
	}
	if choice.FinishReason != finishReasonStop && !(choice.FinishReason == "" && o.provider.allowEmptyFinishReason) {
		return report, fmt.Errorf("%s: unexpected finish reason '%s'", o.provider.name, choice.FinishReason)
	}

	if err := json.Unmarshal([]byte(choice.Message.Content), out); err != nil {
		content := o.maskSecrets(choice.Message.Content)
		return report, fmt.Errorf("%w (finish_reason=%s, content=%q): %w", aiError(exception.AiMalformedOutput, exception.AiMalformedOutputMsg), choice.FinishReason, content, err)
	}
	return report, nil
}

// The SDK calls the middleware once per attempt, including its own retries, before reading or closing the response body.
func (o *oaiClientImpl) trackAttempts(schemaName string, attempts *int) option.Middleware {
	return func(req *http.Request, next option.MiddlewareNext) (*http.Response, error) {
		if err := o.rateLimiter.Wait(req.Context()); err != nil {
			return nil, err
		}
		*attempts++
		attemptStart := time.Now()
		resp, err := next(req)
		elapsed := time.Since(attemptStart).Round(time.Millisecond)
		if err != nil && req.Context().Err() != nil {
			log.Debugf("AI request %s: attempt %d cancelled after %s", schemaName, *attempts, elapsed)
		} else if err != nil {
			log.Warnf("AI request %s: attempt %d failed with %s after %s", schemaName, *attempts, o.maskSecrets(err.Error()), elapsed)
		} else if resp.StatusCode >= http.StatusBadRequest {
			log.Warnf("AI request %s: attempt %d failed with HTTP %d after %s%s", schemaName, *attempts, resp.StatusCode, elapsed, o.describeFailedResponse(resp))
		}
		return resp, err
	}
}

// describeFailedResponse puts the body back after reading it, so that the SDK still parses the whole error.
func (o *oaiClientImpl) describeFailedResponse(resp *http.Response) string {
	var details strings.Builder
	for _, name := range o.provider.diagnosticHeaders {
		if value := resp.Header.Get(name); value != "" {
			fmt.Fprintf(&details, ", %s=%s", name, strings.Join(strings.Fields(value), " "))
		}
	}
	body, readErr := io.ReadAll(resp.Body)
	rest := io.Reader(bytes.NewReader(body))
	if readErr != nil {
		rest = io.MultiReader(rest, errReader{readErr})
	}
	resp.Body = struct {
		io.Reader
		io.Closer
	}{rest, resp.Body}
	if readErr != nil {
		fmt.Fprintf(&details, ", body read error: %s", o.maskSecrets(readErr.Error()))
	} else if len(body) > 0 {
		fmt.Fprintf(&details, ", body: %s", o.formatDiagnosticText(string(body)))
	}
	return details.String()
}

func (o *oaiClientImpl) formatDiagnosticText(text string) string {
	return strings.Join(strings.Fields(o.maskSecrets(text)), " ")
}

func (o *oaiClientImpl) maskSecrets(text string) string {
	if o.apiKey != "" {
		text = strings.ReplaceAll(text, o.apiKey, secretMask)
	}
	if o.proxyPassword != "" {
		text = strings.ReplaceAll(text, o.proxyPassword, secretMask)
	}
	if o.bearerTokenPattern != nil {
		text = o.bearerTokenPattern.ReplaceAllString(text, "${1}"+secretMask)
	}
	return text
}

func (o *oaiClientImpl) classifyProviderError(err error) error {
	var apiErr *openai.Error
	if !errors.As(err, &apiErr) {
		if masked := o.maskSecrets(err.Error()); masked != err.Error() {
			if errors.Is(err, context.Canceled) {
				return fmt.Errorf("%w: %s", context.Canceled, masked)
			}
			if errors.Is(err, context.DeadlineExceeded) {
				return fmt.Errorf("%w: %s", context.DeadlineExceeded, masked)
			}
			return errors.New(masked)
		}
		return err
	}
	detail := o.formatDiagnosticText(apiErr.Message)
	if apiErr.Code != "" {
		detail = strings.TrimSpace(fmt.Sprintf("%s (code %s)", detail, o.formatDiagnosticText(apiErr.Code)))
	}
	// The SDK error is not wrapped: it holds the raw provider response and the request with its Authorization header.
	summary := strings.TrimSpace(fmt.Sprintf("%s API error: %d %s", o.provider.name, apiErr.StatusCode, http.StatusText(apiErr.StatusCode)))
	if detail != "" {
		summary += ": " + detail
	}
	err = errors.New(summary)
	switch apiErr.StatusCode {
	case http.StatusTooManyRequests:
		return fmt.Errorf("%w: %w", aiError(exception.AiRateLimitExceeded, exception.AiRateLimitExceededMsg), err)
	case http.StatusBadRequest:
		if o.isContextLengthError(apiErr) {
			return fmt.Errorf("%w: %w", aiError(exception.AiContextLengthExceeded, exception.AiContextLengthExceededMsg), err)
		}
	}
	return err
}

func (o *oaiClientImpl) isContextLengthError(apiErr *openai.Error) bool {
	if slices.Contains(o.provider.contextLengthErrorCodes, apiErr.Code) {
		return true
	}
	if len(o.provider.contextLengthErrorMarkers) == 0 {
		return false
	}
	text := strings.ToLower(apiErr.Type + " " + apiErr.Code + " " + apiErr.Message)
	for _, marker := range o.provider.contextLengthErrorMarkers {
		if strings.Contains(text, marker) {
			return true
		}
	}
	return false
}

func aiError(code string, message string) error {
	return &exception.CustomError{Status: http.StatusBadGateway, Code: code, Message: message}
}

func generateSchema[T any]() any {
	reflector := jsonschema.Reflector{
		AllowAdditionalProperties: false,
		DoNotReference:            true,
	}
	var v T
	return reflector.Reflect(v)
}
