package entity

import (
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type PublishedVersionValidationEntity_deprecated struct {
	tableName struct{} `pg:"published_version_validation"`

	PackageId string                            `pg:"package_id, pk, type:varchar"`
	Version   string                            `pg:"version, pk, type:varchar"`
	Revision  int                               `pg:"revision, pk, type:integer"`
	Changelog *view.VersionChangelog_deprecated `pg:"changelog, type:jsonb"`
	Spectral  view.VersionSpectral_deprecated   `pg:"spectral, type:jsonb"`
	Bwc       *view.VersionBwc_deprecated       `pg:"bwc, type:jsonb"`
}
