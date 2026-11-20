package entity

import (
	"time"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
)

const VersionContentInternalErrorReason = "Internal error: failed to get version content."

type VersionScore struct {
	tableName struct{} `pg:"version_score"`

	PackageId string `pg:"package_id,pk,type:varchar,notnull"`
	Version   string `pg:"version,pk,type:varchar,notnull"`
	Revision  int    `pg:"revision,pk,type:integer,notnull"`

	ScoredAt            time.Time `pg:"scored_at,type:timestamp without time zone,notnull"`
	ValidationProcessId string    `pg:"validation_process_id,type:varchar"`

	Status         view.ScoringStatus         `pg:"status,type:varchar,notnull,use_zero"`
	Reasons        []string                   `pg:"reasons,type:character varying ARRAY,array"`
	Debug          []string                   `pg:"debug,type:character varying ARRAY,array"`
	ProcessDetails view.ScoringProcessDetails `pg:"process_details,type:jsonb,notnull"`
}

func (s *VersionScore) PartsFinished() bool {
	return s.ProcessDetails.PublicationIntegrity.ProcessStatus.IsTerminal() &&
		s.ProcessDetails.BackwardsCompatibility.ProcessStatus.IsTerminal() &&
		s.ProcessDetails.QualityCheck.ProcessStatus.IsTerminal()
}

func MakeVersionScoreView_deprecated(ent *VersionScore) *view.VersionScore_deprecated {
	if ent == nil {
		return nil
	}
	integrity := ent.ProcessDetails.PublicationIntegrity
	integrityDetails := integrity.Details
	if integrityDetails == nil && integrity.ProcessStatus == view.ScoringProcessError {
		integrityDetails = &view.PublicationIntegrityDetails{
			Status: view.ScoringNotPassed,
			Reason: VersionContentInternalErrorReason,
		}
	}
	var qualityDetails map[view.OpApiType][]view.QualityCheckDetails_deprecated
	if ent.ProcessDetails.QualityCheck.Details != nil {
		qualityDetails = make(map[view.OpApiType][]view.QualityCheckDetails_deprecated, len(ent.ProcessDetails.QualityCheck.Details))
		for apiType, entries := range ent.ProcessDetails.QualityCheck.Details {
			var deprecatedEntries []view.QualityCheckDetails_deprecated
			if entries != nil {
				deprecatedEntries = make([]view.QualityCheckDetails_deprecated, 0, len(entries))
			}
			for _, entry := range entries {
				deprecatedEntries = append(deprecatedEntries, view.QualityCheckDetails_deprecated{
					Linter:        entry.Linter,
					Status:        entry.Status,
					Optional:      entry.Optional,
					Reason:        entry.Reason,
					ErrorsCount:   entry.ErrorsCount,
					WarningsCount: entry.WarningsCount,
					InternalError: entry.InternalError,
				})
			}
			qualityDetails[apiType] = deprecatedEntries
		}
	}
	return &view.VersionScore_deprecated{
		Status:                       ent.Status,
		Reasons:                      ent.Reasons,
		Debug:                        ent.Debug,
		PublicationIntegrityDetails:  integrityDetails,
		BackwardCompatibilityDetails: ent.ProcessDetails.BackwardsCompatibility.Details,
		QualityCheckDetails:          qualityDetails,
	}
}

func MakeVersionScoreView(ent *VersionScore) *view.VersionScore {
	if ent == nil {
		return nil
	}
	return &view.VersionScore{
		Status:         ent.Status,
		Reasons:        emptyIfNil(ent.Reasons),
		Debug:          emptyIfNil(ent.Debug),
		ProcessDetails: ent.ProcessDetails,
	}
}

func emptyIfNil(values []string) []string {
	if values == nil {
		return []string{}
	}
	return values
}
