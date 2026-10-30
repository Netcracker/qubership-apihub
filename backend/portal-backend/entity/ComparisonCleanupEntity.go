package entity

import "time"

type ComparisonCleanupEntity struct {
	tableName struct{} `pg:"comparisons_cleanup_run"`

	RunId        string    `pg:"run_id, pk, type:uuid"`
	InstanceId   string    `pg:"instance_id, type:uuid"`
	StartedAt    time.Time `pg:"started_at, type:timestamp without time zone"`
	FinishedAt   time.Time `pg:"finished_at, type:timestamp without time zone"`
	Status       string    `pg:"status, type:varchar"`
	Details      string    `pg:"details, type:varchar"`
	DeleteBefore time.Time `pg:"delete_before, type:timestamp without time zone"`
	DeletedItems int       `pg:"deleted_items, type:integer"` //TODO: do we additionally need to count deleted operation_comparison and comparison_internal_document records?
}
