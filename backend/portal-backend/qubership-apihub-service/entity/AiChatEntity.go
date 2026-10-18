package entity

import (
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

func MakeAiChatView(e *AiChatEntity) *view.AiChat {
	pinned := e.Pinned
	return &view.AiChat{
		ChatID:        e.ID,
		Title:         e.Title,
		Pinned:        &pinned,
		CreatedAt:     e.CreatedAt.UTC().Format(time.RFC3339),
		LastMessageAt: e.LastMessageAt.UTC().Format(time.RFC3339),
		MessagesCount: e.MessagesCount,
	}
}

type AiChatEntity struct {
	tableName struct{} `pg:"ai_chat, alias:ai_chat"`

	ID                     string     `pg:"id, pk, type:uuid"`
	UserID                 string     `pg:"user_id, type:varchar"`
	Title                  string     `pg:"title, type:text"`
	Pinned                 bool       `pg:"pinned"`
	CreatedAt              time.Time  `pg:"created_at"`
	LastMessageAt          time.Time  `pg:"last_message_at"`
	MessagesCount          int        `pg:"messages_count"`
	CompactedUpToCreatedAt *time.Time `pg:"compacted_up_to_created_at"`
	CompactionSummary      *string    `pg:"compaction_summary, type:text"`
	LastTurnTokens         *int       `pg:"last_turn_tokens"`
}
