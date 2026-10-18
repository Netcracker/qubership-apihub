package entity

import (
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type ErrorBuildNotificationEntity struct {
	tableName struct{} `pg:"error_build_notification"`

	Id         int64  `pg:"id, type:bigint"`
	BuildId    string `pg:"build_id, type:varchar"`
	Severity   string `pg:"severity, type:varchar, use_zero"`
	Category   string `pg:"category, type:varchar, use_zero"`
	Message    string `pg:"message, type:varchar, use_zero"`
	DocumentId string `pg:"document_id, type:varchar, use_zero"`
}

func MakeErrorBuildNotificationView(ent ErrorBuildNotificationEntity) view.Notification {
	return view.Notification{
		Category:   ent.Category,
		Severity:   ent.Severity,
		Message:    ent.Message,
		DocumentId: ent.DocumentId,
	}
}
