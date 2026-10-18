package view

type AiChat struct {
	ChatID        string `json:"chatId"`
	Title         string `json:"title"`
	Pinned        *bool  `json:"pinned,omitempty"`
	CreatedAt     string `json:"createdAt"`
	LastMessageAt string `json:"lastMessageAt"`
	MessagesCount int    `json:"messagesCount"`
}

type AiChatsListResponse struct {
	Chats   []AiChat `json:"chats"`
	HasMore bool     `json:"hasMore"`
}

type AiChatCreateRequest struct {
	Title *string `json:"title,omitempty" validate:"omitempty,max=120"`
}

type AiChatUpdateRequest struct {
	Title  *string `json:"title,omitempty" validate:"omitempty,min=1,max=120"`
	Pinned *bool   `json:"pinned,omitempty"`
}

// AiChatMessage is one persisted message
type AiChatMessage struct {
	MessageID        string                 `json:"messageId"`
	ClientMessageID  *string                `json:"clientMessageId,omitempty"`
	Role             string                 `json:"role"`
	Content          string                 `json:"content"`
	CreatedAt        string                 `json:"createdAt"`
	ToolInvocations  []AiChatToolInvocation `json:"toolInvocations,omitempty"`
}

type AiChatToolInvocation struct {
	Name       string `json:"name"`
	Status     string `json:"status"`
	DurationMs *int   `json:"durationMs,omitempty"`
}

type AiChatMessagesListResponse struct {
	Messages []AiChatMessage `json:"messages"`
	HasMore  bool            `json:"hasMore"`
}

type AiChatSendMessageRequest struct {
	Content         string  `json:"content" validate:"required,min=1,max=32000"`
	ClientMessageID *string `json:"clientMessageId,omitempty"`
}

type AiChatSendMessageResponse struct {
	UserMessage      AiChatMessage `json:"userMessage"`
	AssistantMessage AiChatMessage `json:"assistantMessage"`
}
