package view

// ChatMessage represents a single message in the chat conversation
type ChatMessage struct {
	Role    string `json:"role" validate:"required,oneof=user assistant system"`
	Content string `json:"content" validate:"required"`
}

// ChatRequest represents a request to the chat API
type ChatRequest struct {
	Messages []ChatMessage `json:"messages" validate:"required,min=1"`
	Stream   bool           `json:"stream,omitempty"`
}

// ChatResponse represents a response from the chat API
type ChatResponse struct {
	Message ChatMessage `json:"message"`
	Usage   *ChatUsage   `json:"usage,omitempty"`
}

// ChatUsage represents token usage information
type ChatUsage struct {
	PromptTokens     int `json:"promptTokens"`
	CompletionTokens int `json:"completionTokens"`
	TotalTokens      int `json:"totalTokens"`
}

// ChatStreamChunk represents a chunk in streaming response
type ChatStreamChunk struct {
	Delta   string `json:"delta"`
	Done    bool   `json:"done"`
	Usage   *ChatUsage `json:"usage,omitempty"`
}

