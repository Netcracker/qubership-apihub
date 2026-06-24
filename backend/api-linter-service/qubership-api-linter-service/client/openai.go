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
		// Do not validate model to allow other vendors that support the same API
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
