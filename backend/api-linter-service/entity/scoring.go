package entity

import (
	"time"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
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
	PublicationIntegrityDetails  *view.PublicationIntegrityDetails                    `pg:"publication_integrity_details,type:jsonb"`

	//TODO: rework ???
	ScoringTaskId               string                    `pg:"scoring_task_id,type:varchar"`
	ProcessStatus               view.ScoringProcessStatus `pg:"process_status,type:varchar,notnull"`
	PublicationIntegrityStatus  view.ScoringProcessStatus `pg:"publication_integrity_status,type:varchar,notnull"`
	PublicationIntegrityError   string                    `pg:"publication_integrity_error,type:varchar"`
	BackwardCompatibilityStatus view.ScoringProcessStatus `pg:"backward_compatibility_status,type:varchar,notnull"`
	BackwardCompatibilityError  string                    `pg:"backward_compatibility_error,type:varchar"`
	QualityCheckStatus          view.ScoringProcessStatus `pg:"quality_check_status,type:varchar,notnull"`
	QualityCheckError           string                    `pg:"quality_check_error,type:varchar"`
}

func (s *VersionScore) PartsFinished() bool {
	return s.PublicationIntegrityStatus.IsTerminal() &&
		s.BackwardCompatibilityStatus.IsTerminal() &&
		s.QualityCheckStatus.IsTerminal()
}

func MakeVersionScoreView_deprecated(ent *VersionScore) *view.VersionScore_deprecated {
	if ent == nil {
		return nil
	}
	return &view.VersionScore_deprecated{
		Status:                       ent.Status,
		Reasons:                      ent.Reasons,
		Debug:                        ent.Debug,
		PublicationIntegrityDetails:  ent.PublicationIntegrityDetails,
		BackwardCompatibilityDetails: ent.BackwardCompatibilityDetails,
		QualityCheckDetails:          ent.QualityCheckDetails,
	}
}

func MakeVersionScoreView(ent *VersionScore) *view.VersionScore {
	if ent == nil {
		return nil
	}
	return &view.VersionScore{
		Status:                       ent.Status,
		Reasons:                      emptyIfNil(ent.Reasons),
		Debug:                        emptyIfNil(ent.Debug),
		PublicationIntegrityDetails:  ent.PublicationIntegrityDetails,
		BackwardCompatibilityDetails: ent.BackwardCompatibilityDetails,
		QualityCheckDetails:          ent.QualityCheckDetails,
		Process: view.ScoringProcess{
			Status:                 ent.ProcessStatus,
			PublicationIntegrity:   ent.PublicationIntegrityStatus,
			BackwardsCompatibility: ent.BackwardCompatibilityStatus,
			QualityCheck:           ent.QualityCheckStatus,
		},
	}
}

func emptyIfNil(values []string) []string {
	if values == nil {
		return []string{}
	}
	return values
}
