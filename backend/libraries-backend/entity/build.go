package entity

import (
	"time"
)

type BuildEntity struct {
	tableName struct{} `pg:"build,alias:build"`

	BuildId      string                 `pg:"build_id,pk,type:varchar"`
	Status       string                 `pg:"status,type:varchar,notnull"`
	Details      string                 `pg:"details,type:varchar"`
	LibraryId    string                 `pg:"library_id,type:varchar,notnull"`
	Version      string                 `pg:"version,type:varchar,notnull"`
	BuildType    string                 `pg:"build_type,type:varchar,notnull"`
	CreatedAt    time.Time              `pg:"created_at,type:timestamp without time zone,notnull"`
	LastActive   time.Time              `pg:"last_active,type:timestamp without time zone,notnull"`
	CreatedBy    string                 `pg:"created_by,type:varchar,notnull"`
	RestartCount int                    `pg:"restart_count,type:integer,use_zero"`
	StartedAt    *time.Time             `pg:"started_at,type:timestamp without time zone"`
	BuilderId    string                 `pg:"builder_id,type:varchar"`
	Priority     int                    `pg:"priority,type:integer,use_zero"`
	Metadata     map[string]interface{} `pg:"metadata,type:jsonb"`
}

type BuildResultEntity struct {
	tableName struct{} `pg:"build_result,alias:build_result"`

	BuildId string `pg:"build_id,pk,type:varchar"`
	Data    []byte `pg:"data,type:bytea,notnull"`
}
