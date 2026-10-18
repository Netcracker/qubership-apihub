package entity

import "time"

type VersionCleanupEntity struct {
	tableName struct{} `pg:"versions_cleanup_run"`

	RunId        string    `pg:"run_id, pk, type:uuid"`
	InstanceId   string    `pg:"instance_id, type:uuid"`
	StartedAt    time.Time `pg:"started_at, type:timestamp without time zone"`
	FinishedAt   time.Time `pg:"finished_at, type:timestamp without time zone"`
	Status       string    `pg:"status, type:varchar"`
	Details      string    `pg:"details, type:varchar"`
	PackageId    *string   `pg:"package_id, type:varchar"`
	DeleteBefore time.Time `pg:"delete_before, type:timestamp without time zone"`
	DeletedItems int       `pg:"deleted_items, type:integer"`
}
