package client

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Netcracker/qubership-api-linter-service/view"
	"github.com/invopop/jsonschema"
	"github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"
	"golang.org/x/time/rate"
)

type LLMClient interface {
	LintOasDocument(ctx context.Context, docStr string, prompt string) ([]view.AiValidationIssue, error)
	DeduplicateIssues(ctx context.Context, issues []view.ValidationIssue) ([]view.AiValidationIssue, error)
}

func dialTimeout(network, addr string) (net.Conn, error) {
	return net.DialTimeout(network, addr, 1800*time.Second)
}

func NewOpenaiClient(apiKey string, model string, proxy string, rateLimitRPS float64, rateLimitBurst int) (LLMClient, error) {
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
		if _, ok := validChatModels[model]; !ok {
			return nil, errors.New("openai: model must be a valid ChatModel from github.com/openai/openai-go/v3")
		}
		openAIModel = model
	} else {
		openAIModel = openai.ChatModelGPT5
	}

	tr := http.Transport{
		Dial:                  dialTimeout,
		TLSClientConfig:       &tls.Config{InsecureSkipVerify: true},
		TLSHandshakeTimeout:   time.Second * 1800,
		IdleConnTimeout:       time.Second * 1800,
		ResponseHeaderTimeout: time.Second * 1800,
	}
	cl := http.Client{Transport: &tr, Timeout: time.Second * 1800}

	opts = append(opts, option.WithHTTPClient(&cl))

	limiter := rate.NewLimiter(rate.Limit(rateLimitRPS), rateLimitBurst)

	return &OAIClientImpl{
		client:  openai.NewClient(opts...),
		model:   openAIModel,
		limiter: limiter,
	}, nil
}

type OAIClientImpl struct {
	client  openai.Client
	model   openai.ChatModel
	limiter *rate.Limiter

	generateProblemsPrompt string
	fixProblemsPrompt      string
}

var AiValidationIssuesOutputResponseSchema = generateSchema[view.AiValidationIssuesOutput]()

func (o OAIClientImpl) LintOasDocument(ctx context.Context, docStr string, prompt string) ([]view.AiValidationIssue, error) {
	if err := o.limiter.Wait(ctx); err != nil {
		return nil, err
	}

	messages := []openai.ChatCompletionMessageParamUnion{
		openai.SystemMessage(prompt),
		openai.UserMessage(docStr),
	}

	schemaParam := openai.ResponseFormatJSONSchemaJSONSchemaParam{
		Name:   "oas_doc_lint_response",
		Schema: AiValidationIssuesOutputResponseSchema,
		Strict: openai.Bool(true),
	}

	reasoningEffort := ""
	if o.model == openai.ChatModelGPT5 {
		reasoningEffort = string(openai.ReasoningEffortMinimal)
	}

	chat, err := o.client.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{

		Messages: messages,
		ResponseFormat: openai.ChatCompletionNewParamsResponseFormatUnion{
			OfJSONSchema: &openai.ResponseFormatJSONSchemaParam{JSONSchema: schemaParam},
		},
		ReasoningEffort: openai.ReasoningEffort(reasoningEffort),
		//Verbosity:       openai.ChatCompletionNewParamsVerbosityLow,
		Model: o.model,
	})

	if err != nil {
		return nil, err
	}

	var result view.AiValidationIssuesOutput
	err = json.Unmarshal([]byte(chat.Choices[0].Message.Content), &result)
	if err != nil {
		return nil, err
	}

	return result.Issues, nil
}

func (o OAIClientImpl) DeduplicateIssues(ctx context.Context, issues []view.ValidationIssue) ([]view.AiValidationIssue, error) {
	if err := o.limiter.Wait(ctx); err != nil {
		return nil, err
	}

	issuesStr, err := json.Marshal(issues)
	if err != nil {
		return nil, err
	}

	messages := []openai.ChatCompletionMessageParamUnion{
		openai.SystemMessage("Remove duplicates(same sense) from the list of issues. Do not modify issue content. Do not add new entries."),
		openai.UserMessage(string(issuesStr)),
	}

	schemaParam := openai.ResponseFormatJSONSchemaJSONSchemaParam{
		Name:   "oas_doc_lint_response",
		Schema: AiValidationIssuesOutputResponseSchema,
		Strict: openai.Bool(true),
	}

	reasoningEffort := ""
	if o.model == openai.ChatModelGPT5 {
		reasoningEffort = string(openai.ReasoningEffortMinimal)
	}

	chat, err := o.client.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
		Messages: messages,
		ResponseFormat: openai.ChatCompletionNewParamsResponseFormatUnion{
			OfJSONSchema: &openai.ResponseFormatJSONSchemaParam{JSONSchema: schemaParam},
		},
		ReasoningEffort: openai.ReasoningEffort(reasoningEffort),
		//Verbosity:       openai.ChatCompletionNewParamsVerbosityLow,
		Model: o.model,
	})

	if err != nil {
		return nil, err
	}

	var result view.AiValidationIssuesOutput
	err = json.Unmarshal([]byte(chat.Choices[0].Message.Content), &result)
	if err != nil {
		return nil, err
	}

	return result.Issues, nil
}

func generateSchema[T any]() interface{} {
	reflector := jsonschema.Reflector{
		AllowAdditionalProperties: false,
		DoNotReference:            true,
	}
	var v T
	schema := reflector.Reflect(v)
	return schema
}

// validChatModels contains all ChatModel constants from github.com/openai/openai-go/v3 for validation.
var validChatModels = map[openai.ChatModel]struct{}{
	openai.ChatModelGPT5_2: {}, openai.ChatModelGPT5_2_2025_12_11: {}, openai.ChatModelGPT5_2ChatLatest: {},
	openai.ChatModelGPT5_2Pro: {}, openai.ChatModelGPT5_2Pro2025_12_11: {},
	openai.ChatModelGPT5_1: {}, openai.ChatModelGPT5_1_2025_11_13: {}, openai.ChatModelGPT5_1Codex: {},
	openai.ChatModelGPT5_1Mini: {}, openai.ChatModelGPT5_1ChatLatest: {},
	openai.ChatModelGPT5: {}, openai.ChatModelGPT5Mini: {}, openai.ChatModelGPT5Nano: {},
	openai.ChatModelGPT5_2025_08_07: {}, openai.ChatModelGPT5Mini2025_08_07: {}, openai.ChatModelGPT5Nano2025_08_07: {},
	openai.ChatModelGPT5ChatLatest: {},
	openai.ChatModelGPT4_1:         {}, openai.ChatModelGPT4_1Mini: {}, openai.ChatModelGPT4_1Nano: {},
	openai.ChatModelGPT4_1_2025_04_14: {}, openai.ChatModelGPT4_1Mini2025_04_14: {}, openai.ChatModelGPT4_1Nano2025_04_14: {},
	openai.ChatModelO4Mini: {}, openai.ChatModelO4Mini2025_04_16: {},
	openai.ChatModelO3: {}, openai.ChatModelO3_2025_04_16: {}, openai.ChatModelO3Mini: {}, openai.ChatModelO3Mini2025_01_31: {},
	openai.ChatModelO1: {}, openai.ChatModelO1_2024_12_17: {}, openai.ChatModelO1Preview: {}, openai.ChatModelO1Preview2024_09_12: {},
	openai.ChatModelO1Mini: {}, openai.ChatModelO1Mini2024_09_12: {},
	openai.ChatModelGPT4o: {}, openai.ChatModelGPT4o2024_11_20: {}, openai.ChatModelGPT4o2024_08_06: {}, openai.ChatModelGPT4o2024_05_13: {},
	openai.ChatModelGPT4oAudioPreview: {}, openai.ChatModelGPT4oAudioPreview2024_10_01: {},
	openai.ChatModelGPT4oAudioPreview2024_12_17: {}, openai.ChatModelGPT4oAudioPreview2025_06_03: {},
	openai.ChatModelGPT4oMiniAudioPreview: {}, openai.ChatModelGPT4oMiniAudioPreview2024_12_17: {},
	openai.ChatModelGPT4oSearchPreview: {}, openai.ChatModelGPT4oMiniSearchPreview: {},
	openai.ChatModelGPT4oSearchPreview2025_03_11: {}, openai.ChatModelGPT4oMiniSearchPreview2025_03_11: {},
	openai.ChatModelChatgpt4oLatest: {}, openai.ChatModelCodexMiniLatest: {},
	openai.ChatModelGPT4oMini: {}, openai.ChatModelGPT4oMini2024_07_18: {},
	openai.ChatModelGPT4Turbo: {}, openai.ChatModelGPT4Turbo2024_04_09: {},
	openai.ChatModelGPT4_0125Preview: {}, openai.ChatModelGPT4TurboPreview: {}, openai.ChatModelGPT4_1106Preview: {},
	openai.ChatModelGPT4VisionPreview: {},
	openai.ChatModelGPT4:              {}, openai.ChatModelGPT4_0314: {}, openai.ChatModelGPT4_0613: {},
	openai.ChatModelGPT4_32k: {}, openai.ChatModelGPT4_32k0314: {}, openai.ChatModelGPT4_32k0613: {},
	openai.ChatModelGPT3_5Turbo: {}, openai.ChatModelGPT3_5Turbo16k: {}, openai.ChatModelGPT3_5Turbo0301: {},
	openai.ChatModelGPT3_5Turbo0613: {}, openai.ChatModelGPT3_5Turbo1106: {}, openai.ChatModelGPT3_5Turbo0125: {},
	openai.ChatModelGPT3_5Turbo16k0613: {},
}

func NewStubLlmClient() LLMClient {
	return &stubLlmClient{}
}

type stubLlmClient struct{}

func (s stubLlmClient) LintOasDocument(ctx context.Context, docStr string, prompt string) ([]view.AiValidationIssue, error) {
	return nil, fmt.Errorf("LLM client is not configured, using stub instead of implementation")
}

func (s stubLlmClient) DeduplicateIssues(ctx context.Context, issues []view.ValidationIssue) ([]view.AiValidationIssue, error) {
	return nil, fmt.Errorf("LLM client is not configured, using stub instead of implementation")
}
