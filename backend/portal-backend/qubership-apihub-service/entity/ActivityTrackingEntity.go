package entity

import (
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/google/uuid"
)

type ActivityTrackingEntity struct {
	tableName struct{} `pg:"activity_tracking"`

	Id        string                 `pg:"id, pk, type:varchar"`
	Type      string                 `pg:"e_type, type:varchar"`
	Data      map[string]interface{} `pg:"data, type:jsonb"`
	PackageId string                 `pg:"package_id, type:varchar"`
	Date      time.Time              `pg:"date, type:varchar"`
	UserId    string                 `pg:"user_id, type:timestamp without time zone"`
}

type EnrichedActivityTrackingEntity struct {
	tableName struct{} `pg:"select:activity_tracking,alias:at"`

	ActivityTrackingEntity
	PrincipalEntity
	PackageName       string `pg:"pkg_name, type:varchar"`
	PackageKind       string `pg:"pkg_kind, type:varchar"`
	NotLatestRevision bool   `pg:"not_latest_revision, type:bool"`
}

func MakeActivityTrackingEventEntity(event view.ActivityTrackingEvent) ActivityTrackingEntity {
	return ActivityTrackingEntity{
		Id:        uuid.New().String(),
		Type:      string(event.Type),
		Data:      event.Data,
		PackageId: event.PackageId,
		Date:      event.Date,
		UserId:    event.UserId,
	}
}

func MakeActivityTrackingEventView(ent EnrichedActivityTrackingEntity) view.PkgActivityResponseItem {
	return view.PkgActivityResponseItem{
		PackageName: ent.PackageName,
		PackageKind: ent.PackageKind,
		Principal:   *MakeActivityHistoryPrincipalView(&ent.PrincipalEntity),
		ActivityTrackingEvent: view.ActivityTrackingEvent{
			Type:      view.ATEventType(ent.Type),
			Data:      ent.Data,
			PackageId: ent.PackageId,
			Date:      ent.Date,
		},
	}
}
