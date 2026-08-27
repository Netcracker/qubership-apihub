package service

import "time"

const (
	ChatRoleUser      = "user"
	ChatRoleAssistant = "assistant"
	ChatRoleSystem    = "system"
	ChatRoleTool      = "tool"

	MaxMessagesBeforeStopAutoTitle  = 6
	AiChatStreamReplayChunkRunes    = 64
	AiChatStreamChannelBuffer       = 32
	MaxTitlePromptRunesPerSide      = 600
	MaxGeneratedChatTitleRunes      = 80
	MaxCompactionMessageRunes       = 4000
	MaxClarificationLogPreviewRunes = 120
	MaxGeneratedFilenameRunes       = 200

	AiChatToolStatusOK    = "ok"
	AiChatToolStatusError = "error"

	AiChatTurnModeSync   = "sync"
	AiChatTurnModeStream = "stream"

	MimeTypeMarkdown = "text/markdown"

	PackagesListCacheTTL       = 24 * time.Hour
	AutoTitleGenerationTimeout = 30 * time.Second

	// SaveGeneratedFileTimeout is a safety net for one save_generated_file call: a local write plus one row insert.
	SaveGeneratedFileTimeout = 2 * time.Minute

	// AiChatTurnTimeout bounds a whole chat turn, streaming and non-streaming alike. It covers a heavy
	// turn and stays below both the 30-min SSE write deadline and the 1800s nginx timeout on the chat routes.
	AiChatTurnTimeout = 25 * time.Minute

	// AiChatStreamTerminalEmitTimeout bounds delivery of the closing SSE error frame; the consumer drains
	// the channel until it is closed, so this is only a safety cap.
	AiChatStreamTerminalEmitTimeout = 30 * time.Second
)
