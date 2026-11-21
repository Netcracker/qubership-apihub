package view

type TaskStatus string

const (
	TaskStatusNotStarted     TaskStatus = "not_started"
	TaskStatusProcessing     TaskStatus = "processing"
	TaskStatusWaitingForDocs TaskStatus = "waiting_for_docs" // version task only
	TaskStatusSuccess        TaskStatus = "success"
	TaskStatusError          TaskStatus = "error"
)

type ValidationProcessStatus string

const (
	ValidationProcessNotStarted ValidationProcessStatus = "not_started"
	ValidationProcessProcessing ValidationProcessStatus = "processing"
	ValidationProcessSuccess    ValidationProcessStatus = "success"
	ValidationProcessError      ValidationProcessStatus = "error"
)
