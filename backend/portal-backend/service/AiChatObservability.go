package service

import "context"

type aiChatCorrelationIDKey struct{}

func WithAiChatCorrelationID(ctx context.Context, id string) context.Context {
	if id == "" {
		return ctx
	}
	return context.WithValue(ctx, aiChatCorrelationIDKey{}, id)
}

func AiChatCorrelationIDFromContext(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	if v, ok := ctx.Value(aiChatCorrelationIDKey{}).(string); ok {
		return v
	}
	return ""
}

type aiChatTurnKey struct{}

type AiChatTurn struct {
	UserID string
	ChatID string
}

func WithAiChatTurn(ctx context.Context, userID, chatID string) context.Context {
	if userID == "" && chatID == "" {
		return ctx
	}
	return context.WithValue(ctx, aiChatTurnKey{}, AiChatTurn{UserID: userID, ChatID: chatID})
}

func AiChatTurnFromContext(ctx context.Context) (AiChatTurn, bool) {
	if ctx == nil {
		return AiChatTurn{}, false
	}
	v, ok := ctx.Value(aiChatTurnKey{}).(AiChatTurn)
	return v, ok
}
