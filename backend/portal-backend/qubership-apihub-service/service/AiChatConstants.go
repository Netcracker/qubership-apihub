package service

import "time"

const (
	ChatRoleUser      = "user"
	ChatRoleAssistant = "assistant"
	ChatRoleSystem    = "system"
	ChatRoleTool      = "tool"

	MaxMessagesBeforeStopAutoTitle = 6
	AiChatStreamReplayChunkRunes   = 64
	AiChatStreamChannelBuffer      = 32
	MaxTitlePromptRunesPerSide     = 600
	MaxGeneratedChatTitleRunes     = 80
	MaxCompactionMessageRunes      = 4000
	MaxClarificationLogPreviewRunes = 120
	MaxGeneratedFilenameRunes      = 200

	AiChatToolStatusOK    = "ok"
	AiChatToolStatusError = "error"

	AiChatTurnModeSync   = "sync"
	AiChatTurnModeStream = "stream"

	MimeTypeMarkdown = "text/markdown"

	PackagesListCacheTTL       = 24 * time.Hour
	AutoTitleGenerationTimeout = 30 * time.Second
)
