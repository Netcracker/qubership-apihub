package entity

import (
	"encoding/json"
	"time"
)

type AiLintStage string

const (
	AiLintStageLint          AiLintStage = "lint"
	AiLintStageDeduplication AiLintStage = "deduplication"
)

type AiRequestStatus string

const (
	AiRequestStatusSuccess AiRequestStatus = "success"
	AiRequestStatusError   AiRequestStatus = "error"
)

type AiRequestErrorClass string

const (
	AiRequestErrorClassContextLength AiRequestErrorClass = "context_length"
	AiRequestErrorClassOutputLength  AiRequestErrorClass = "output_length"
	AiRequestErrorClassRefusal       AiRequestErrorClass = "refusal"
	AiRequestErrorClassValidation    AiRequestErrorClass = "validation"
	AiRequestErrorClassRateLimit     AiRequestErrorClass = "rate_limit"
	AiRequestErrorClassOther         AiRequestErrorClass = "other"
)

// AiLintStats is one stage (lint or deduplication) of a document lint task. Details holds the marshalled
// AiLintStageDetails or AiDeduplicationStageDetails. ErrorClass is empty for a successful stage.
type AiLintStats struct {
	tableName struct{} `pg:"ai_lint_stats"`

	Id                 string              `pg:"id,pk,type:varchar"`
	DocumentLintTaskId string              `pg:"document_lint_task_id,type:varchar,notnull,use_zero"`
	PackageId          string              `pg:"package_id,type:varchar,notnull,use_zero"`
	Version            string              `pg:"version,type:varchar,notnull,use_zero"`
	Revision           int                 `pg:"revision,type:integer,notnull,use_zero"`
	FileId             string              `pg:"file_id,type:varchar,notnull,use_zero"`
	Stage              AiLintStage         `pg:"stage,type:varchar,notnull,use_zero"`
	Model              string              `pg:"model,type:varchar,notnull,use_zero"`
	Status             AiRequestStatus     `pg:"status,type:varchar,notnull,use_zero"`
	ErrorClass         AiRequestErrorClass `pg:"error_class,type:varchar,notnull,use_zero"`
	Requests           int                 `pg:"requests,type:integer,notnull,use_zero"`
	PromptTokens       int                 `pg:"prompt_tokens,type:integer,notnull,use_zero"`
	CompletionTokens   int                 `pg:"completion_tokens,type:integer,notnull,use_zero"`
	DurationMs         int64               `pg:"duration_ms,type:integer,notnull,use_zero"`
	Details            json.RawMessage     `pg:"details,type:jsonb,notnull,use_zero"`
	CreatedAt          time.Time           `pg:"created_at,type:timestamp without time zone,notnull,use_zero"`
}

type AiTokenUsage struct {
	PromptTokens       int `json:"prompt_tokens"`
	CompletionTokens   int `json:"completion_tokens"`
	ReasoningTokens    int `json:"reasoning_tokens"`
	CachedPromptTokens int `json:"cached_prompt_tokens"`
}

type AiRequestMetrics struct {
	Model                 string              `json:"model"`
	EstimatedPromptTokens int                 `json:"estimated_prompt_tokens"`
	Usage                 *AiTokenUsage       `json:"usage,omitempty"`
	FinishReason          string              `json:"finish_reason,omitempty"`
	ProviderAttempts      int                 `json:"provider_attempts"`
	Status                AiRequestStatus     `json:"status"`
	ErrorClass            AiRequestErrorClass `json:"error_class,omitempty"`
	DurationMs            int64               `json:"duration_ms"`
}

type AiLintOperationStats struct {
	OperationId string `json:"operation_id"`
	Issues      int    `json:"issues"`
	AiRequestMetrics
}

type AiLintStageDetails struct {
	Operations []AiLintOperationStats `json:"operations"`
}

type AiDeduplicationRequestStats struct {
	Groups      int `json:"groups"`
	NewIssues   int `json:"new_issues"`
	KnownIssues int `json:"known_issues"`
	Duplicates  int `json:"duplicates"`
	AiRequestMetrics
}

type AiDeduplicationStageDetails struct {
	IssuesIn          int                           `json:"issues_in"`
	Groups            int                           `json:"groups"`
	MultiIssueGroups  int                           `json:"multi_issue_groups"`
	DuplicatesRemoved int                           `json:"duplicates_removed"`
	Requests          []AiDeduplicationRequestStats `json:"requests"`
}
