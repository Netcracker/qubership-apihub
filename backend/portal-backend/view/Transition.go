package view

import "time"

type TransitionRequest struct {
	From string `json:"from" validate:"required"`
	To   string `json:"to" validate:"required"`

	OverwriteHistory bool `json:"overwriteHistory"`
}

type TransitionStatus struct {
	Id                    string    `json:"id"`
	TrType                string    `json:"trType"`
	FromId                string    `json:"fromId"`
	ToId                  string    `json:"toId"`
	Status                string    `json:"status"`
	Details               string    `json:"details,omitempty"`
	StartedBy             string    `json:"startedBy"`
	StartedAt             time.Time `json:"startedAt"`
	FinishedAt            time.Time `json:"finishedAt"`
	ProgressPercent       int       `json:"progressPercent"`
	AffectedObjects       int       `json:"affectedObjects"`
	CompletedSerialNumber *int      `json:"completedSerialNumber"`
}

type PackageTransition struct {
	OldPackageId string `json:"oldPackageId"`
	NewPackageId string `json:"newPackageId"`
}
