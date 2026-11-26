package entity

import (
	"time"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
)

type LibraryVersionEntity struct {
	tableName struct{} `pg:"library_version,alias:library_version"`

	LibraryId       string                 `pg:"library_id,pk,type:varchar"`
	Version         string                 `pg:"version,pk,type:varchar"`
	PreviousVersion string                 `pg:"previous_version,type:varchar"`
	Status          string                 `pg:"status,type:varchar,notnull"`
	Labels          []string               `pg:"labels,type:varchar[],array"`
	Metadata        map[string]interface{} `pg:"metadata,type:jsonb"`
	CreatedAt       time.Time              `pg:"created_at,type:timestamp without time zone,notnull"`
	CreatedBy       string                 `pg:"created_by,type:varchar,notnull"`
	// The counters are computed once, when the version's inventory is imported.
	ClassCount          int        `pg:"class_count,type:integer,use_zero"`
	InterfaceCount      int        `pg:"interface_count,type:integer,use_zero"`
	EnumCount           int        `pg:"enum_count,type:integer,use_zero"`
	AnnotationTypeCount int        `pg:"annotation_type_count,type:integer,use_zero"`
	DeletedAt           *time.Time `pg:"deleted_at,type:timestamp without time zone"`
	DeletedBy           string     `pg:"deleted_by,type:varchar"`
}

func MakeLibraryVersionView(ent LibraryVersionEntity) view.LibraryVersion {
	return view.LibraryVersion{
		LibraryId:       ent.LibraryId,
		Version:         ent.Version,
		PreviousVersion: ent.PreviousVersion,
		Status:          view.VersionStatus(ent.Status),
		Labels:          ent.Labels,
		Metadata:        ent.Metadata,
		CreatedAt:       ent.CreatedAt,
		CreatedBy:       ent.CreatedBy,
		Statistics: view.LibraryVersionStatistics{
			ClassCount:          ent.ClassCount,
			InterfaceCount:      ent.InterfaceCount,
			EnumCount:           ent.EnumCount,
			AnnotationTypeCount: ent.AnnotationTypeCount,
		},
	}
}
