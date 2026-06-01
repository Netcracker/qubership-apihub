package service

import (
	"context"
	"net/http"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/google/uuid"
)

type AiChatsService interface {
	ListChats(ctx context.Context, userID, search string, before *time.Time, beforeID string, limit int) (*view.AiChatsListResponse, error)
	CreateChat(ctx context.Context, userID string, title *string) (*view.AiChat, error)
	GetChat(ctx context.Context, userID, chatID string) (*view.AiChat, error)
	UpdateChat(ctx context.Context, userID, chatID string, req *view.AiChatUpdateRequest) (*view.AiChat, error)
	DeleteChat(ctx context.Context, userID, chatID string) error
	ListMessages(ctx context.Context, userID, chatID string, before *time.Time, beforeID string, limit int) (*view.AiChatMessagesListResponse, error)
}

func NewAiChatsService(repo repository.AiChatRepository) AiChatsService {
	return &aiChatsServiceImpl{repo: repo}
}

type aiChatsServiceImpl struct {
	repo repository.AiChatRepository
}

func (s *aiChatsServiceImpl) ListChats(ctx context.Context, userID, search string, before *time.Time, beforeID string, limit int) (*view.AiChatsListResponse, error) {
	rows, err := s.repo.ListChats(ctx, repository.AiChatsListFilter{
		UserID:   userID,
		Search:   search,
		Before:   before,
		BeforeID: beforeID,
		Limit:    limit + 1,
	})
	if err != nil {
		return nil, err
	}
	hasMore := len(rows) > limit
	if hasMore {
		rows = rows[:limit]
	}
	out := make([]view.AiChat, 0, len(rows))
	for i := range rows {
		out = append(out, *entity.MakeAiChatView(&rows[i]))
	}
	return &view.AiChatsListResponse{Chats: out, HasMore: hasMore}, nil
}

func (s *aiChatsServiceImpl) CreateChat(ctx context.Context, userID string, title *string) (*view.AiChat, error) {
	now := time.Now().UTC()
	id := uuid.NewString()
	t := ""
	if title != nil {
		t = *title
	}
	row := &entity.AiChatEntity{
		ID:            id,
		UserID:        userID,
		Title:         t,
		Pinned:        false,
		CreatedAt:     now,
		LastMessageAt: now,
		MessagesCount: 0,
	}
	if err := s.repo.CreateChat(ctx, row); err != nil {
		return nil, err
	}
	return entity.MakeAiChatView(row), nil
}

func (s *aiChatsServiceImpl) GetChat(ctx context.Context, userID, chatID string) (*view.AiChat, error) {
	ch, err := mustGetAiChat(ctx, s.repo, userID, chatID)
	if err != nil {
		return nil, err
	}
	return entity.MakeAiChatView(ch), nil
}

func (s *aiChatsServiceImpl) UpdateChat(ctx context.Context, userID, chatID string, req *view.AiChatUpdateRequest) (*view.AiChat, error) {
	if req == nil {
		return nil, &exception.CustomError{Status: http.StatusBadRequest, Code: exception.AiChatValidationFailed, Message: exception.AiChatEmptyBodyMsg}
	}
	ch, err := mustGetAiChat(ctx, s.repo, userID, chatID)
	if err != nil {
		return nil, err
	}
	if req.Title != nil {
		ch.Title = *req.Title
	}
	if req.Pinned != nil {
		if *req.Pinned && !ch.Pinned {
			pinned, err := s.repo.PinChatForUser(ctx, chatID, userID, MaxAiPinnedChatsPerUser)
			if err != nil {
				return nil, err
			}
			if !pinned {
				return nil, errAiPinLimit()
			}
			ch.Pinned = true
		} else if !*req.Pinned {
			ch.Pinned = false
		}
	}
	if err := s.repo.UpdateChat(ctx, ch); err != nil {
		return nil, err
	}
	return entity.MakeAiChatView(ch), nil
}

func (s *aiChatsServiceImpl) DeleteChat(ctx context.Context, userID, chatID string) error {
	n, err := s.repo.DeleteChat(ctx, chatID, userID)
	if err != nil {
		return err
	}
	if n == 0 {
		return errAiNotFound(chatID)
	}
	return nil
}

func (s *aiChatsServiceImpl) ListMessages(ctx context.Context, userID, chatID string, before *time.Time, beforeID string, limit int) (*view.AiChatMessagesListResponse, error) {
	if _, err := mustGetAiChat(ctx, s.repo, userID, chatID); err != nil {
		return nil, err
	}
	rows, err := s.repo.ListMessages(ctx, repository.AiMessagesListFilter{
		ChatID:   chatID,
		Before:   before,
		BeforeID: beforeID,
		Limit:    limit + 1,
	})
	if err != nil {
		return nil, err
	}
	hasMore := len(rows) > limit
	if hasMore {
		rows = rows[:limit]
	}
	out := make([]view.AiChatMessage, 0, len(rows))
	for i := range rows {
		out = append(out, *entity.MakeAiChatMessageView(&rows[i]))
	}
	return &view.AiChatMessagesListResponse{Messages: out, HasMore: hasMore}, nil
}
