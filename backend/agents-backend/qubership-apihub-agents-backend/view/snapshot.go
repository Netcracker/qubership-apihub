package view

import (
	"time"

	"github.com/Netcracker/qubership-apihub-agents-backend/utils"
)

const DefaultSnapshotsGroupAlias = "RUNENV"

type CreateSnapshotRequest struct {
	Version         string   `json:"version"`
	PreviousVersion string   `json:"previousVersion"`
	Services        []string `json:"services"`
	Status          string   `json:"status"`
	BuilderId       string   `json:"builderId"`
}

type CreateSnapshotDTO struct {
	PreviousVersion string
	Services        []string
	ClientBuild     bool
	BuilderId       string
	Promote         bool
	VersionStatus   string
	AgentUrl        string
	CloudName       string
}

type CreateSnapshotResponse struct {
	Snapshot *GroupBuildConfig `json:"snapshot,omitempty"`
	Services []BuildConfig     `json:"services"`
}

type SnapshotsListResponse struct {
	Snapshots []SnapshotListItem `json:"snapshots"`
	PackageId string             `json:"packageId"`
}

type SnapshotListItem struct {
	Version           string    `json:"version"`
	CreatedAt         time.Time `json:"createdAt"`
	NotLatestRevision bool      `json:"notLatestRevision,omitempty"`
}

type Snapshot struct {
	Version           string               `json:"version"`
	ApiTypes          []string             `json:"apiTypes"`
	PreviousVersion   string               `json:"previousVersion"`
	PublishedAt       string               `json:"publishedAt"`
	Services          []ServiceWithChanges `json:"services,omitempty"`
	ViewSnapshotUrl   string               `json:"viewSnapshotUrl"`
	NotLatestRevision bool                 `json:"notLatestRevision,omitempty"`
}

type ServiceWithChanges struct {
	Id                       string         `json:"id"`
	PackageId                string         `json:"packageId"`
	PreviousVersionPackageId string         `json:"previousVersionPackageId"`
	Changes                  *ChangeSummary `json:"changes,omitempty"`
	ViewChangesUrl           string         `json:"viewChangesUrl,omitempty"`
	ViewSnapshotUrl          string         `json:"viewSnapshotUrl"`
	ViewBaselineUrl          string         `json:"viewBaselineUrl,omitempty"`
	BaselineFound            bool           `json:"baselineFound"`
	BaselineVersionFound     bool           `json:"baselineVersionFound"`
	ApiTypes                 []string       `json:"apiTypes"`
}

func MakeSnapshotDashboardIdByGroupId(groupId string) string {
	return groupId + "." + utils.ToId("snapshot-dash")
}
