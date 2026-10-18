package client

import "context"

type LlmClient interface {
	Execute(ctx context.Context, req LLMRequest) (*LLMResponse, error)
	ExecuteStreaming(
		ctx context.Context,
		req LLMRequest,
		onDelta func(delta string),
		onToolStart func(callID, name string),
	) (*LLMResponse, error)
	ContextWindowSize() int
}

type LLMRequest struct {
	SystemMessage string
	Messages      []ChatMessage
	Tools         []LLMTool
	CorrelationID string
}

type LLMResponse struct {
	AssistantText string
	ToolCalls     []LLMToolCall
	Usage         ChatUsage
}

type LLMToolCall struct {
	ID        string
	Name      string
	Arguments string
}

type LLMTool struct {
	Name        string
	Description string
	Parameters  map[string]interface{}
}

type ChatMessage struct {
	Role       string        `json:"role"`
	Content    string        `json:"content"`
	ToolCalls  []LLMToolCall `json:"toolCalls,omitempty"`
	ToolCallID string        `json:"toolCallId,omitempty"`
}

type ChatUsage struct {
	PromptTokens     int `json:"promptTokens"`
	CompletionTokens int `json:"completionTokens"`
	TotalTokens      int `json:"totalTokens"`
}
