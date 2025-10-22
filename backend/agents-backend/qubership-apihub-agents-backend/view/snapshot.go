// Copyright 2024-2025 NetCracker Technology Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
