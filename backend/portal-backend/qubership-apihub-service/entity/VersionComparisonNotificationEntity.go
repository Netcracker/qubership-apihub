package entity

import (
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type VersionComparisonNotificationEntity struct {
	tableName struct{} `pg:"version_comparison_notification"`

	Id                       int64  `pg:"id, type:bigint"`
	PackageId                string `pg:"package_id, type:varchar"`
	Version                  string `pg:"version, type:varchar"`
	Revision                 int    `pg:"revision, type:integer"`
	PreviousVersionPackageId string `pg:"previous_package_id, type:varchar"`
	PreviousVersion          string `pg:"previous_version, type:varchar"`
	PreviousVersionRevision  int    `pg:"previous_revision, type:integer"`
	ComparisonId             string `pg:"comparison_id, type:varchar"`
	Severity                 string `pg:"severity, type:varchar, use_zero"`
	Category                 string `pg:"category, type:varchar, use_zero"`
	Message                  string `pg:"message, type:varchar, use_zero"`
	DocumentId               string `pg:"document_id, type:varchar, use_zero"`
}

func MakeComparisonNotificationView(ent VersionComparisonNotificationEntity) view.Notification {
	return view.Notification{
		Category:   ent.Category,
		Severity:   ent.Severity,
		Message:    ent.Message,
		DocumentId: ent.DocumentId,
	}
}
