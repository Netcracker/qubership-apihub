package client

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/exception"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/utils"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
	"github.com/invopop/jsonschema"
	"github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"
	"golang.org/x/sync/semaphore"
	"golang.org/x/time/rate"
)

type LLMClient interface {
	LintOasDocument(ctx context.Context, docStr string, prompt string) ([]view.AiValidationIssue, RequestReport, error)
	DeduplicateIssues(ctx context.Context, systemPrompt string, request view.AiDeduplicationRequest, maxCompletionTokens int) ([]view.AiDuplicatePair, RequestReport, error)
}

const (
	finishReasonStop   = "stop"
	finishReasonLength = "length"
)

type TokenUsage struct {
	PromptTokens       int
	CompletionTokens   int
	ReasoningTokens    int
	CachedPromptTokens int
}

// RequestReport describes one chat completion request
type RequestReport struct {
	Model            string
	FinishReason     string
	Usage            *TokenUsage
	ProviderAttempts int //counts HTTP requests including SDK retries; 0 means the request was never dispatched
	Duration         time.Duration
}

func dialTimeout(network, addr string) (net.Conn, error) {
	return net.DialTimeout(network, addr, 1800*time.Second)
}

func NewOpenaiClient(apiKey string, model string, proxy string, rateLimitRPS float64, rateLimitBurst int, maxConcurrentRequests int, extraBodyJSON string) (LLMClient, error) {
	var opts []option.RequestOption
	if apiKey != "" {
		opts = append(opts, option.WithAPIKey(apiKey))
	} else {
		return nil, errors.New("openai: api key is required")
	}

	if proxy != "" {
		parsed, err := url.Parse(proxy)
		if err != nil {
			return nil, errors.Join(errors.New("openai: invalid proxy URL"), err)
		}
		if parsed.Scheme == "" || parsed.Host == "" {
			return nil, errors.New("openai: proxy URL must have scheme and host")
		}
		if parsed.Scheme != "http" && parsed.Scheme != "https" {
			return nil, errors.New("openai: proxy URL must use http or https scheme")
		}
		opts = append(opts, option.WithBaseURL(proxy))
	}

	var openAIModel openai.ChatModel
	if model != "" {
		model = strings.TrimSpace(model)
		if model == "" {
			return nil, errors.New("openai: model cannot be empty or whitespace")
		}
		// Do not validate model to allow other vendors that support the same API
		openAIModel = model
	} else {
		openAIModel = openai.ChatModelGPT5
	}

	tlsConfig, err := utils.BuildSecureTLSConfig(nil)
	if err != nil {
		return nil, fmt.Errorf("build TLS config: %w", err)
	}
	tr := http.Transport{
		Dial:                  dialTimeout,
		TLSClientConfig:       tlsConfig,
		TLSHandshakeTimeout:   time.Second * 1800,
		IdleConnTimeout:       time.Second * 1800,
		ResponseHeaderTimeout: time.Second * 1800,
	}
	cl := http.Client{Transport: &tr, Timeout: time.Second * 1800}

	opts = append(opts, option.WithHTTPClient(&cl))

	var extraBodyOpts []option.RequestOption
	if extraBodyJSON != "" {
		var extraBody map[string]any
		if err := json.Unmarshal([]byte(extraBodyJSON), &extraBody); err != nil {
			return nil, fmt.Errorf("openai: parse extra body: %w", err)
		}
		for key, value := range extraBody {
			extraBodyOpts = append(extraBodyOpts, option.WithJSONSet(key, value))
		}
	}

	var concurrencyLimiter *semaphore.Weighted
	if maxConcurrentRequests > 0 {
		concurrencyLimiter = semaphore.NewWeighted(int64(maxConcurrentRequests))
	}

	return &OAIClientImpl{
		client:              openai.NewClient(opts...),
		model:               openAIModel,
		rateLimiter:         rate.NewLimiter(rate.Limit(rateLimitRPS), rateLimitBurst),
		concurrencyLimiter:  concurrencyLimiter,
		extraBodyOpts:       extraBodyOpts,
		lintSchema:          generateSchema[view.AiValidationIssuesOutput](),
		deduplicationSchema: generateSchema[view.AiDeduplicationOutput](),
	}, nil
}

type OAIClientImpl struct {
	client             openai.Client
	model              openai.ChatModel
	rateLimiter        *rate.Limiter
	concurrencyLimiter *semaphore.Weighted
	extraBodyOpts      []option.RequestOption

	lintSchema          any
	deduplicationSchema any
}

func (o OAIClientImpl) LintOasDocument(ctx context.Context, docStr string, prompt string) ([]view.AiValidationIssue, RequestReport, error) {
	var result view.AiValidationIssuesOutput
	report, err := o.complete(ctx, prompt, docStr, "oas_doc_lint_response", o.lintSchema, 0, &result)
	if err != nil {
		return nil, report, err
	}
	return result.Issues, report, nil
}

func (o OAIClientImpl) DeduplicateIssues(ctx context.Context, systemPrompt string, request view.AiDeduplicationRequest, maxCompletionTokens int) ([]view.AiDuplicatePair, RequestReport, error) {
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

// complete sends one chat completion with a strict JSON schema response format and unmarshals the answer into out
func (o OAIClientImpl) complete(ctx context.Context, systemPrompt string, userMessage string, schemaName string, schema any, maxCompletionTokens int, out any) (RequestReport, error) {
	report := RequestReport{Model: o.model}
	if o.concurrencyLimiter != nil {
		if err := o.concurrencyLimiter.Acquire(ctx, 1); err != nil {
			return report, err
		}
		defer o.concurrencyLimiter.Release(1)
	}
	if err := o.rateLimiter.Wait(ctx); err != nil {
		return report, err
	}

	reasoningEffort := ""
	if o.model == openai.ChatModelGPT5 {
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

	// The SDK calls the middleware once per HTTP attempt, including its own retries.
	attempts := 0
	countAttempts := option.WithMiddleware(func(req *http.Request, next option.MiddlewareNext) (*http.Response, error) {
		attempts++
		return next(req)
	})

	start := time.Now()
	requestOpts := append([]option.RequestOption{countAttempts}, o.extraBodyOpts...)
	chat, err := o.client.Chat.Completions.New(ctx, params, requestOpts...)
	report.Duration = time.Since(start)
	report.ProviderAttempts = attempts
	if err != nil {
		return report, classifyProviderError(err)
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
			Params: map[string]interface{}{"reason": choice.Message.Refusal}}
	}
	switch choice.FinishReason {
	// Some OpenAI-compatible gateways omit finish_reason; the response schema then decides whether the content is complete.
	case finishReasonStop, "":
	case finishReasonLength:
		// Reasoning tokens count against the limit too, so the content may be empty.
		return report, aiError(exception.AiOutputLengthExceeded, exception.AiOutputLengthExceededMsg)
	default:
		return report, fmt.Errorf("openai: unexpected finish reason '%s'", choice.FinishReason)
	}

	if err := json.Unmarshal([]byte(choice.Message.Content), out); err != nil {
		content := choice.Message.Content
		content = content[:min(len(content), 200)] // 200 bytes are enough to recognize the kind of malformed output without flooding the logs.
		return report, fmt.Errorf("%w (finish_reason=%s, content prefix=%q): %w", aiError(exception.AiMalformedOutput, exception.AiMalformedOutputMsg), choice.FinishReason, content, err)
	}
	return report, nil
}

func classifyProviderError(err error) error {
	var apiErr *openai.Error
	if !errors.As(err, &apiErr) {
		return err
	}
	switch apiErr.StatusCode {
	case http.StatusTooManyRequests:
		return fmt.Errorf("%w: %w", aiError(exception.AiRateLimitExceeded, exception.AiRateLimitExceededMsg), err)
	case http.StatusBadRequest:
		// Fragments of the 400 messages that OpenAI ("context_length_exceeded") and LiteLLM ("ContextWindowExceededError") use.
		contextLengthMarkers := []string{"context_length", "context length", "context window", "contextwindow", "input tokens exceed"}
		text := strings.ToLower(apiErr.Code + " " + apiErr.Message)
		for _, marker := range contextLengthMarkers {
			if strings.Contains(text, marker) {
				return fmt.Errorf("%w: %w", aiError(exception.AiContextLengthExceeded, exception.AiContextLengthExceededMsg), err)
			}
		}
	}
	return err
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
	schema := reflector.Reflect(v)
	return schema
}

func NewStubLlmClient() LLMClient {
	return &stubLlmClient{}
}

type stubLlmClient struct{}

var errLlmClientNotConfigured = errors.New("LLM client is not configured, using stub instead of implementation")

func (s stubLlmClient) LintOasDocument(ctx context.Context, docStr string, prompt string) ([]view.AiValidationIssue, RequestReport, error) {
	return nil, RequestReport{}, errLlmClientNotConfigured
}

func (s stubLlmClient) DeduplicateIssues(ctx context.Context, systemPrompt string, request view.AiDeduplicationRequest, maxCompletionTokens int) ([]view.AiDuplicatePair, RequestReport, error) {
	return nil, RequestReport{}, errLlmClientNotConfigured
}
