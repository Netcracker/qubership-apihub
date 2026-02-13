package entity

import (
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"time"
)

type ExportResultEntity struct {
	tableName struct{} `pg:"export_result"`

	ExportId  string           `pg:"export_id, pk, type:varchar"`
	Config    view.BuildConfig `pg:"config, type:json"`
	CreatedAt time.Time        `pg:"created_at, type:timestamp without time zone"`
	CreatedBy string           `pg:"created_by, type:varchar"`
	Filename  string           `pg:"filename, type:varchar"`
	Data      []byte           `pg:"data, type:bytea"`
}
