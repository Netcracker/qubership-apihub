package client

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/config"
	"github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"
	"github.com/openai/openai-go/v3/shared"
	log "github.com/sirupsen/logrus"
)

const (
	openAIContextWindowDefault = 128000
	openAIContextWindow32K     = 32000
	openAIContextWindow16K     = 16000
)

type OpenAILlmClient struct {
	client openai.Client
	cfg    config.OpenAIConfig
}

func NewOpenAILlmClient(cfg config.OpenAIConfig) (LlmClient, error) {
	transport := &http.Transport{
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: true,
		},
	}
	httpClient := &http.Client{
		Transport: transport,
		Timeout:   20 * time.Minute,
	}

	opts := []option.RequestOption{
		option.WithAPIKey(cfg.ApiKey),
		option.WithHTTPClient(httpClient),
	}
	if cfg.ProxyURL != "" {
		opts = append(opts, option.WithBaseURL(cfg.ProxyURL))
	}

	c := openai.NewClient(opts...)
	return &OpenAILlmClient{client: c, cfg: cfg}, nil
}

func (c *OpenAILlmClient) Execute(ctx context.Context, req LLMRequest) (*LLMResponse, error) {
	apiReq := c.buildRequest(req)
	resp, err := c.client.Chat.Completions.New(ctx, apiReq, openAIRequestOptions(req.CorrelationID)...)
	if err != nil {
		logChatCompletionsError(err)
		return nil, fmt.Errorf("OpenAI Chat Completions API: %w", err)
	}
	if resp == nil || len(resp.Choices) == 0 {
		return nil, fmt.Errorf("empty response from OpenAI Chat Completions API")
	}
	return parseChatCompletion(resp), nil
}

func (c *OpenAILlmClient) ExecuteStreaming(
	ctx context.Context,
	req LLMRequest,
	onDelta func(delta string),
	onToolStart func(callID, name string),
) (*LLMResponse, error) {
	apiReq := c.buildRequest(req)
	// Streaming omits usage unless IncludeUsage is set on the final chunk.
	apiReq.StreamOptions = openai.ChatCompletionStreamOptionsParam{
		IncludeUsage: openai.Bool(true),
	}

	stream := c.client.Chat.Completions.NewStreaming(ctx, apiReq, openAIRequestOptions(req.CorrelationID)...)

	var result LLMResponse
	// Tool calls stream as fragments per index; arguments must be concatenated.
	type pendingCall struct {
		id        string
		name      string
		arguments strings.Builder
		started   bool
	}
	pending := make(map[int64]*pendingCall)
	var callOrder []int64

	for stream.Next() {
		chunk := stream.Current()

		if chunk.Usage.TotalTokens > 0 || chunk.Usage.PromptTokens > 0 || chunk.Usage.CompletionTokens > 0 {
			result.Usage = ChatUsage{
				PromptTokens:     int(chunk.Usage.PromptTokens),
				CompletionTokens: int(chunk.Usage.CompletionTokens),
				TotalTokens:      int(chunk.Usage.TotalTokens),
			}
		}

		if len(chunk.Choices) == 0 {
			continue
		}
		delta := chunk.Choices[0].Delta

		if delta.Content != "" {
			result.AssistantText += delta.Content
			if onDelta != nil {
				onDelta(delta.Content)
			}
		}

		for _, tc := range delta.ToolCalls {
			pc, ok := pending[tc.Index]
			if !ok {
				pc = &pendingCall{}
				pending[tc.Index] = pc
				callOrder = append(callOrder, tc.Index)
			}
			if tc.ID != "" {
				pc.id = tc.ID
			}
			if tc.Function.Name != "" {
				pc.name = tc.Function.Name
			}
			if tc.Function.Arguments != "" {
				pc.arguments.WriteString(tc.Function.Arguments)
			}
			if !pc.started && pc.id != "" && pc.name != "" {
				pc.started = true
				if onToolStart != nil {
					onToolStart(pc.id, pc.name)
				}
			}
		}
	}

	if err := stream.Err(); err != nil {
		_ = stream.Close()
		logChatCompletionsError(err)
		return nil, fmt.Errorf("streaming Chat Completions: %w", err)
	}
	_ = stream.Close()

	for _, idx := range callOrder {
		pc := pending[idx]
		if pc == nil {
			continue
		}
		if !pc.started && pc.id != "" && pc.name != "" {
			pc.started = true
			if onToolStart != nil {
				onToolStart(pc.id, pc.name)
			}
		}
		if pc.id != "" && pc.name != "" {
			result.ToolCalls = append(result.ToolCalls, LLMToolCall{
				ID:        pc.id,
				Name:      pc.name,
				Arguments: pc.arguments.String(),
			})
		}
	}

	return &result, nil
}

func (c *OpenAILlmClient) ContextWindowSize() int {
	return modelContextWindow(c.cfg.Model)
}

func modelContextWindow(model string) int {
	switch model {
	case "gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano",
		"o3-mini", "o4-mini", "gpt-5-mini", "gpt-5":
		return openAIContextWindowDefault
	case "gpt-4-turbo", "gpt-4-turbo-preview":
		return openAIContextWindowDefault
	case "gpt-4-32k":
		return openAIContextWindow32K
	case "gpt-3.5-turbo", "gpt-3.5-turbo-16k":
		return openAIContextWindow16K
	default:
		return openAIContextWindowDefault
	}
}

func (c *OpenAILlmClient) buildRequest(req LLMRequest) openai.ChatCompletionNewParams {
	messages := make([]openai.ChatCompletionMessageParamUnion, 0, len(req.Messages)+1)
	if strings.TrimSpace(req.SystemMessage) != "" {
		messages = append(messages, openai.SystemMessage(req.SystemMessage))
	}
	for _, m := range req.Messages {
		messages = append(messages, convertChatMessage(m))
	}

	apiReq := openai.ChatCompletionNewParams{
		Model:           shared.ChatModel(c.cfg.Model),
		Messages:        messages,
		Temperature:     openai.Float(c.cfg.Temperature),
		ReasoningEffort: convertReasoningEffort(c.cfg.ReasoningEffort),
		Verbosity:       convertVerbosity(c.cfg.Verbosity),
	}
	if len(req.Tools) > 0 {
		apiReq.Tools = convertToChatTools(req.Tools)
	}
	return apiReq
}

func parseChatCompletion(resp *openai.ChatCompletion) *LLMResponse {
	result := &LLMResponse{
		Usage: ChatUsage{
			PromptTokens:     int(resp.Usage.PromptTokens),
			CompletionTokens: int(resp.Usage.CompletionTokens),
			TotalTokens:      int(resp.Usage.TotalTokens),
		},
	}
	if len(resp.Choices) == 0 {
		return result
	}
	msg := resp.Choices[0].Message
	result.AssistantText = msg.Content
	for _, tc := range msg.ToolCalls {
		if tc.Type != "function" {
			log.Debugf("Ignoring non-function tool call of type %q", tc.Type)
			continue
		}
		result.ToolCalls = append(result.ToolCalls, LLMToolCall{
			ID:        tc.ID,
			Name:      tc.Function.Name,
			Arguments: tc.Function.Arguments,
		})
	}
	return result
}

func convertChatMessage(m ChatMessage) openai.ChatCompletionMessageParamUnion {
	const roleAssistant = "assistant"
	const roleSystem = "system"
	const roleTool = "tool"
	switch m.Role {
	case roleAssistant:
		if len(m.ToolCalls) == 0 {
			return openai.AssistantMessage(m.Content)
		}
		var asst openai.ChatCompletionAssistantMessageParam
		if m.Content != "" {
			asst.Content.OfString = openai.String(m.Content)
		}
		asst.ToolCalls = make([]openai.ChatCompletionMessageToolCallUnionParam, 0, len(m.ToolCalls))
		for _, tc := range m.ToolCalls {
			asst.ToolCalls = append(asst.ToolCalls, openai.ChatCompletionMessageToolCallUnionParam{
				OfFunction: &openai.ChatCompletionMessageFunctionToolCallParam{
					ID: tc.ID,
					Function: openai.ChatCompletionMessageFunctionToolCallFunctionParam{
						Name:      tc.Name,
						Arguments: tc.Arguments,
					},
				},
			})
		}
		return openai.ChatCompletionMessageParamUnion{OfAssistant: &asst}
	case roleSystem:
		return openai.SystemMessage(m.Content)
	case roleTool:
		return openai.ToolMessage(m.Content, m.ToolCallID)
	default:
		return openai.UserMessage(m.Content)
	}
}

func convertToChatTools(tools []LLMTool) []openai.ChatCompletionToolUnionParam {
	result := make([]openai.ChatCompletionToolUnionParam, 0, len(tools))
	for _, tool := range tools {
		params := map[string]any{}
		for k, v := range tool.Parameters {
			params[k] = v
		}
		result = append(result, openai.ChatCompletionFunctionTool(shared.FunctionDefinitionParam{
			Name:        tool.Name,
			Description: openai.String(tool.Description),
			Parameters:  params,
		}))
	}
	return result
}

func convertReasoningEffort(value string) shared.ReasoningEffort {
	switch value {
	case "minimal":
		return shared.ReasoningEffortMinimal
	case "low":
		return shared.ReasoningEffortLow
	case "medium":
		return shared.ReasoningEffortMedium
	case "high":
		return shared.ReasoningEffortHigh
	default:
		return shared.ReasoningEffortMedium
	}
}

func convertVerbosity(value string) openai.ChatCompletionNewParamsVerbosity {
	switch value {
	case "low":
		return openai.ChatCompletionNewParamsVerbosityLow
	case "medium":
		return openai.ChatCompletionNewParamsVerbosityMedium
	case "high":
		return openai.ChatCompletionNewParamsVerbosityHigh
	default:
		return openai.ChatCompletionNewParamsVerbosityMedium
	}
}

func openAIRequestOptions(correlationID string) []option.RequestOption {
	if correlationID == "" {
		return nil
	}
	return []option.RequestOption{option.WithHeader("X-Request-ID", correlationID)}
}

func logChatCompletionsError(err error) {
	var apiErr *openai.Error
	if errors.As(err, &apiErr) {
		log.WithFields(log.Fields{
			"error_type":     apiErr.Type,
			"error_code":     apiErr.Code,
			"error_message":  apiErr.Message,
			"error_param":    apiErr.Param,
			"status_code":    apiErr.StatusCode,
			"request_url":    apiErr.Request.URL.String(),
			"request_method": apiErr.Request.Method,
			"raw_json":       apiErr.RawJSON(),
		}).Errorf("OpenAI Chat Completions API error: %s %s returned status %d - %s (code: %s, param: %s)",
			apiErr.Request.Method, apiErr.Request.URL.String(),
			apiErr.StatusCode, apiErr.Message, apiErr.Code, apiErr.Param)
		if log.IsLevelEnabled(log.DebugLevel) {
			log.Debugf("OpenAI request details:\n%s", string(apiErr.DumpRequest(true)))
			log.Debugf("OpenAI response details:\n%s", string(apiErr.DumpResponse(true)))
		}
		return
	}
	log.WithError(err).Errorf("OpenAI Chat Completions API non-API error: %v", err)
}

var _ LlmClient = (*OpenAILlmClient)(nil)
