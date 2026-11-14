package entity

import (
	"time"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
)

type LibraryVersionComparisonEntity struct {
	tableName struct{} `pg:"library_version_comparison,alias:library_version_comparison"`

	LibraryId         string         `pg:"library_id,pk,type:varchar"`
	Version           string         `pg:"version,pk,type:varchar"`
	PreviousLibraryId string         `pg:"previous_library_id,pk,type:varchar"`
	PreviousVersion   string         `pg:"previous_version,pk,type:varchar"`
	ComparisonId      string         `pg:"comparison_id,type:varchar,notnull"`
	ChangeCounts      map[string]int `pg:"change_counts,type:jsonb"`
	OpenCount         int            `pg:"open_count,type:bigint,use_zero"`
	LastActive        time.Time      `pg:"last_active,type:timestamp without time zone,notnull"`
	NoContent         bool           `pg:"no_content,type:boolean,use_zero"`
	BuilderVersion    string         `pg:"builder_version,type:varchar"`
}

type LibraryVersionChangeEntity struct {
	tableName struct{} `pg:"library_version_changes,alias:library_version_changes"`

	ComparisonId string                 `pg:"comparison_id,pk,type:varchar"`
	ChangeId     string                 `pg:"change_id,pk,type:varchar"`
	ClassId      string                 `pg:"class_id,type:varchar,notnull"`
	MethodId     string                 `pg:"method_id,type:varchar"`
	ChangeType   string                 `pg:"change_type,type:varchar,notnull"`
	Severity     string                 `pg:"severity,type:varchar,notnull"`
	Description  string                 `pg:"description,type:text"`
	Details      map[string]interface{} `pg:"details,type:jsonb"`
}

func MakeChangeSummaryView(ent LibraryVersionComparisonEntity) view.ChangeSummary {
	return view.ChangeSummary{
		ComparisonId:      ent.ComparisonId,
		LibraryId:         ent.LibraryId,
		Version:           ent.Version,
		PreviousLibraryId: ent.PreviousLibraryId,
		PreviousVersion:   ent.PreviousVersion,
		ChangeCounts:      ent.ChangeCounts,
		OpenCount:         ent.OpenCount,
		NoContent:         ent.NoContent,
		BuilderVersion:    ent.BuilderVersion,
		LastActive:        ent.LastActive,
	}
}

func MakeChangeView(ent LibraryVersionChangeEntity) view.Change {
	return view.Change{
		ChangeId:    ent.ChangeId,
		ClassId:     ent.ClassId,
		MethodId:    ent.MethodId,
		ChangeType:  view.ChangeType(ent.ChangeType),
		Severity:    view.ChangeSeverity(ent.Severity),
		Description: ent.Description,
		Details:     ent.Details,
	}
}
