package entity

import "time"

type EphemeralFileEntity struct {
	tableName struct{} `pg:"ephemeral_file, alias:ephemeral_file"`

	ID          string    `pg:"id, pk, type:uuid"`
	UserID      string    `pg:"user_id, type:varchar"`
	Filename    string    `pg:"filename, type:text"`
	StoragePath string    `pg:"storage_path, type:text"`
	MimeType    *string   `pg:"mime_type, type:varchar"`
	SizeBytes   *int64    `pg:"size_bytes"`
	CreatedAt   time.Time `pg:"created_at"`
	ExpiresAt   time.Time `pg:"expires_at"`
}
