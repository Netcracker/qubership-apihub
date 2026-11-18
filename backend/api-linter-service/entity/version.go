package entity

import (
	"time"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
)

type LintedVersion struct {
	tableName struct{} `pg:"linted_version"`

	PackageId           string                   `pg:"package_id,pk,type:varchar,notnull"`
	Version             string                   `pg:"version,pk,type:varchar,notnull"`
	Revision            int                      `pg:"revision,pk,type:integer,notnull"`
	LintStatus          view.LintedVersionStatus `pg:"lint_status,type:varchar,notnull"`
	LintDetails         string                   `pg:"lint_details,type:varchar"`
	LintedAt            time.Time                `pg:"linted_at,type:timestamp without time zone,notnull"`
	ValidationProcessId string                   `pg:"validation_process_id,type:varchar"`
}

// ValidationProcessStatus is empty for a row written before validation processes existed.
type LintedVersionWithProcess_deprecated struct {
	LintedVersion

	ValidationProcessStatus view.ValidationProcessStatus `pg:"validation_process_status"`
}

type VersionValidationProcess struct {
	tableName struct{} `pg:"version_validation_process"`

	Id        string                       `pg:"id,pk,type:varchar"`
	PackageId string                       `pg:"package_id,type:varchar,notnull"`
	Version   string                       `pg:"version,type:varchar,notnull"`
	Revision  int                          `pg:"revision,type:integer,notnull"`
	CreatedAt time.Time                    `pg:"created_at,type:timestamp without time zone,notnull"`
	Status    view.ValidationProcessStatus `pg:"status,type:varchar,notnull"`
}
