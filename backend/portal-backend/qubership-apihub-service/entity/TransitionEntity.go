package entity

import (
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type TransitionActivityEntity struct {
	tableName struct{} `pg:"activity_tracking_transition"`

	Id                    string    `pg:"id, pk, type:varchar"`
	TrType                string    `pg:"tr_type, type:varchar"`
	FromId                string    `pg:"from_id, type:varchar"`
	ToId                  string    `pg:"to_id, type:varchar"`
	Status                string    `pg:"status, type:varchar"`
	Details               string    `pg:"details, type:varchar"`
	StartedBy             string    `pg:"started_by, type:varchar"`
	StartedAt             time.Time `pg:"started_at, type:timestamp without time zone"`
	FinishedAt            time.Time `pg:"finished_at, type:timestamp without time zone"`
	ProgressPercent       int       `pg:"progress_percent, type:integer"`
	AffectedObjects       int       `pg:"affected_objects, type:integer"`
	CompletedSerialNumber *int      `pg:"completed_serial_number, type:integer"`
}

type PackageTransitionEntity struct {
	tableName struct{} `pg:"package_transition"`

	OldPackageId string `pg:"old_package_id, type:varchar"`
	NewPackageId string `pg:"new_package_id, type:varchar"`
}

func MakeTransitionStatusView(ent *TransitionActivityEntity) *view.TransitionStatus {
	result := &view.TransitionStatus{
		Id:                    ent.Id,
		TrType:                ent.TrType,
		FromId:                ent.FromId,
		ToId:                  ent.ToId,
		Status:                ent.Status,
		Details:               ent.Details,
		StartedBy:             ent.StartedBy,
		StartedAt:             ent.StartedAt,
		FinishedAt:            ent.FinishedAt,
		ProgressPercent:       ent.ProgressPercent,
		AffectedObjects:       ent.AffectedObjects,
		CompletedSerialNumber: ent.CompletedSerialNumber,
	}
	return result
}

func MakePackageTransitionView(ent *PackageTransitionEntity) *view.PackageTransition {
	return &view.PackageTransition{
		OldPackageId: ent.OldPackageId,
		NewPackageId: ent.NewPackageId,
	}
}
