package entity

import (
	"time"

	"github.com/Netcracker/qubership-api-linter-service/view"
)

type VersionScore struct {
	tableName struct{} `pg:"version_score"`

	PackageId string `pg:"package_id,pk,type:varchar,notnull"`
	Version   string `pg:"version,pk,type:varchar,notnull"`
	Revision  int    `pg:"revision,pk,type:integer,notnull"`

	ScoredAt time.Time `pg:"scored_at,type:timestamp without time zone,notnull"`

	Status  view.ScoringStatus `pg:"status,type:varchar,notnull"`
	Reasons []string           `pg:"reasons,type:character varying ARRAY,array"`
	Debug   []string           `pg:"debug,type:character varying ARRAY,array"`

	BackwardCompatibilityDetails map[view.OpApiType]view.BackwardCompatibilityDetails `pg:"backward_compatibility_details,type:jsonb"`
	QualityCheckDetails          map[view.OpApiType][]view.QualityCheckDetails        `pg:"quality_check_details,type:jsonb"`
}
