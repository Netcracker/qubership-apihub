package service

const aiChatSSEFieldType = "type"

const (
	aiChatSSEContextCompacted        = "context.compacted"
	aiChatSSEMessageAssistantStart   = "message.assistant.start"
	aiChatSSEMessageAssistantDelta   = "message.assistant.delta"
	aiChatSSEMessageAssistantCompleted = "message.assistant.completed"
	aiChatSSEToolStarted             = "tool.started"
	aiChatSSEToolCompleted           = "tool.completed"
	aiChatSSEDone                    = "done"
	aiChatSSEError                   = "error"
)
