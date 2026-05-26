package entity

import (
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type AiChatMessageEntity struct {
	tableName struct{} `pg:"ai_chat_message, alias:ai_chat_message"`

	ID              string                      `pg:"id, pk, type:uuid"`
	ChatID          string                      `pg:"chat_id, type:uuid"`
	Role            string                      `pg:"role, type:varchar"`
	Content         string                      `pg:"content, type:text"`
	ClientMessageID *string                     `pg:"client_message_id, type:uuid"`
	ToolInvocations []view.AiChatToolInvocation `pg:"tool_invocations, type:jsonb"`
	CreatedAt       time.Time                   `pg:"created_at"`
}

func MakeAiChatMessageView(m *AiChatMessageEntity) *view.AiChatMessage {
	var cl *string
	if m.ClientMessageID != nil {
		c := *m.ClientMessageID
		cl = &c
	}
	return &view.AiChatMessage{
		MessageID:       m.ID,
		ClientMessageID: cl,
		Role:            m.Role,
		Content:         m.Content,
		CreatedAt:       m.CreatedAt.UTC().Format(time.RFC3339),
		ToolInvocations: m.ToolInvocations,
	}
}
