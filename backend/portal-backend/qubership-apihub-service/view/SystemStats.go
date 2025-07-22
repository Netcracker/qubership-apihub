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

type SystemStats struct {
	BusinessEntities BusinessEntitiesCount     `json:"businessEntities"`
	Builds           map[BuildType]BuildsCount `json:"builds"`
	DatabaseSize     []TableSizeInfo           `json:"databaseSize"`
}

type BusinessEntitiesCount struct {
	Workspaces         int `json:"workspaces"`
	DeletedWorkspaces  int `json:"deletedWorkspaces"`
	Groups             int `json:"groups"`
	DeletedGroups      int `json:"deletedGroups"`
	Packages           int `json:"packages"`
	DeletedPackages    int `json:"deletedPackages"`
	Dashboards         int `json:"dashboards"`
	DeletedDashboards  int `json:"deletedDashboards"`
	Revisions          int `json:"revisions"`
	DeletedRevisions   int `json:"deletedRevisions"`
	Documents          int `json:"documents"`
	Operations         int `json:"operations"`
	VersionComparisons int `json:"versionComparisons"`
}

type BuildsCount struct {
	NotStarted       int `json:"notStarted"`
	Running          int `json:"running"`
	FailedLastWeek   int `json:"failedLastWeek"`
	SucceedLastWeek  int `json:"succeedLastWeek"`
	RestartsLastWeek int `json:"restartsLastWeek"`
}

type TableSizeInfo struct {
	TableName      string  `json:"tableName"`
	RowEstimate    float64 `json:"rowEstimate"`
	TotalSize      string  `json:"totalSize"`
	IndexSize      string  `json:"indexSize"`
	ToastSize      string  `json:"toastSize"`
	TableSize      string  `json:"tableSize"`
	TotalSizeShare float64 `json:"totalSizeShare"`
}
