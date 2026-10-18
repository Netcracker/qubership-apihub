package entity

import "time"

type SourcesUpdateTrackingEntity struct {
	tableName struct{} `pg:"sources_update_tracking"`

	Id          string    `pg:"id, pk, type:varchar"`
	PackageId   string    `pg:"package_id, type:varchar"`
	Version     string    `pg:"version, type:varchar"`
	Revision    int       `pg:"revision, type:integer"`
	OldChecksum string    `pg:"old_checksum, type:varchar"`
	NewChecksum string    `pg:"new_checksum, type:varchar"`
	PerformedBy string    `pg:"performed_by, type:varchar"`
	PerformedAt time.Time `pg:"performed_at, type:timestamp without time zone"`
}
