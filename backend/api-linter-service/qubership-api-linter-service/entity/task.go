package entity

import (
	"github.com/Netcracker/qubership-api-linter-service/view"
	"time"
)

type VersionLintTask struct {
	tableName struct{} `pg:"version_lint_task"`

	Id           string          `pg:"id,pk,type:varchar"`
	PackageId    string          `pg:"package_id,type:varchar,notnull"`
	Version      string          `pg:"version,type:varchar,notnull"`
	Revision     int             `pg:"revision,type:integer,notnull"`
	EventId      string          `pg:"event_id,type:varchar"`
	Status       view.TaskStatus `pg:"status,type:varchar,notnull"`
	Details      string          `pg:"details,type:varchar"`
	CreatedAt    time.Time       `pg:"created_at,type:timestamp without time zone,notnull"`
	CreatedBy    string          `pg:"created_by,type:varchar,notnull"`
	ExecutorId   string          `pg:"executor_id,type:varchar"`
	LastActive   time.Time       `pg:"last_active,type:timestamp without time zone,notnull"`
	RestartCount int             `pg:"restart_count,type:integer,notnull,use_zero"`
	Priority     int             `pg:"priority, type:integer, use_zero"`
}

type DocumentLintTask struct {
	tableName struct{} `pg:"document_lint_task"`

	Id                string          `pg:"id,pk,type:varchar"`
	VersionLintTaskId string          `pg:"version_lint_task_id,type:varchar,notnull"`
	PackageId         string          `pg:"package_id,type:varchar,notnull"`
	Version           string          `pg:"version,type:varchar,notnull"`
	Revision          int             `pg:"revision,type:integer,notnull"`
	FileId            string          `pg:"file_id,type:varchar,notnull"`
	FileSlug          string          `pg:"file_slug,type:varchar,notnull"`
	APIType           view.ApiType    `pg:"api_type,type:varchar,notnull"`
	Linter            view.Linter     `pg:"linter,type:varchar,notnull"`
	RulesetId         string          `pg:"ruleset_id,type:varchar,notnull"`
	Status            view.TaskStatus `pg:"status,type:varchar,notnull"`
	Details           string          `pg:"details,type:varchar"`
	CreatedAt         time.Time       `pg:"created_at,type:timestamp without time zone,notnull"`
	ExecutorId        string          `pg:"executor_id,type:varchar"`
	LastActive        *time.Time      `pg:"last_active,type:timestamp without time zone"`
	RestartCount      int             `pg:"restart_count,type:integer,notnull,use_zero"`
	Priority          int             `pg:"priority, type:integer use_zero"`
	LintTimeMs        int64           `pg:"lint_time_ms,type:integer,notnull,use_zero"`
}
