package view

type TaskStatus string

const (
	TaskStatusNotStarted     TaskStatus = "not_started"
	TaskStatusProcessing     TaskStatus = "processing"
	TaskStatusWaitingForDocs TaskStatus = "waiting_for_docs" // version task only
	TaskStatusSuccess        TaskStatus = "success"
	TaskStatusError          TaskStatus = "error"
)
