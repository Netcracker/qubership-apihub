package entity

import (
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type PublishedVersionNotificationEntity struct {
	tableName struct{} `pg:"published_version_notification"`

	Id         int64  `pg:"id, type:bigint"`
	PackageId  string `pg:"package_id, type:varchar"`
	Version    string `pg:"version, type:varchar"`
	Revision   int    `pg:"revision, type:integer"`
	Severity   string `pg:"severity, type:varchar, use_zero"`
	Category   string `pg:"category, type:varchar, use_zero"`
	Message    string `pg:"message, type:varchar, use_zero"`
	DocumentId string `pg:"document_id, type:varchar, use_zero"`
}

func MakeVersionNotificationView(ent PublishedVersionNotificationEntity) view.Notification {
	return view.Notification{
		Category:   ent.Category,
		Severity:   ent.Severity,
		Message:    ent.Message,
		DocumentId: ent.DocumentId,
	}
}
