package repository

import (
	"context"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
)

const DefaultAiContextMessagesLimit = 200

type AiChatsListFilter struct {
	UserID   string
	Search   string
	Before   *time.Time
	BeforeID string
	Limit    int
}

type AiMessagesListFilter struct {
	ChatID   string
	Before   *time.Time
	BeforeID string
	Limit    int
}

type AiChatRepository interface {
	CreateChat(ctx context.Context, row *entity.AiChatEntity) error
	GetChatByIDForUser(ctx context.Context, chatID, userID string) (*entity.AiChatEntity, error)
	UpdateChat(ctx context.Context, row *entity.AiChatEntity) error
	DeleteChat(ctx context.Context, chatID, userID string) (int, error)
	ListChats(ctx context.Context, f AiChatsListFilter) ([]entity.AiChatEntity, error)
	PinChatForUser(ctx context.Context, chatID, userID string, maxPinned int) (bool, error)

	InsertMessage(ctx context.Context, m *entity.AiChatMessageEntity) error
	TryInsertUserMessageIdempotent(ctx context.Context, m *entity.AiChatMessageEntity) (inserted bool, err error)
	FindUserMessageByClientID(ctx context.Context, chatID, clientMsgID string) (*entity.AiChatMessageEntity, error)
	FindNextAssistantMessage(ctx context.Context, chatID string, afterCreatedAt time.Time) (*entity.AiChatMessageEntity, error)
	ListMessages(ctx context.Context, f AiMessagesListFilter) ([]entity.AiChatMessageEntity, error)
	ListMessagesChronological(ctx context.Context, chatID string, maxMessages int) ([]entity.AiChatMessageEntity, error)

	ListUserIDs(ctx context.Context) ([]string, error)
	DeleteUserChatsByRetention(ctx context.Context, userID string, retentionDays, pinnedForeverCount int) (int, error)
}
