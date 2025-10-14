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

package entity

import (
	"time"
)

type SoftDeletedDataCleanupEntity struct {
	tableName struct{} `pg:"soft_deleted_data_cleanup_run"`

	RunId        string             `pg:"run_id, pk, type:uuid"`
	InstanceId   string             `pg:"instance_id, type:uuid"`
	StartedAt    time.Time          `pg:"started_at, type:timestamp without time zone"`
	FinishedAt   *time.Time         `pg:"finished_at, type:timestamp without time zone"`
	Status       string             `pg:"status, type:varchar"`
	Details      string             `pg:"details, type:varchar"`
	DeleteBefore time.Time          `pg:"delete_before, type:timestamp without time zone"`
	DeletedItems *DeletedItemsStats `pg:"deleted_items, type:jsonb"`
}

type DeletedItemsStats struct {
	Packages                        []string                    `json:"packages"`
	PackageRevisions                []PublishedVersionKeyEntity `json:"packageRevisions"`
	ActivityTracking                int                         `json:"activityTracking"`
	ApiKeys                         []ApihubApiKeyEntity        `json:"apiKeys"`
	Builds                          int                         `json:"builds"`
	BuildDepends                    int                         `json:"buildDepends"`
	BuildResults                    int                         `json:"buildResults"`
	BuildSources                    int                         `json:"buildSources"`
	BuilderNotifications            int                         `json:"builderNotifications"`
	FavoritePackages                int                         `json:"favoritePackages"`
	Operations                      int                         `json:"operations"`
	OperationGroups                 int                         `json:"operationGroups"`
	GroupedOperations               int                         `json:"groupedOperations"`
	OperationOpenCounts             int                         `json:"operationOpenCounts"`
	PackageExportConfigs            int                         `json:"packageExportConfigs"`
	PackageMembersRoles             []PackageMemberRoleEntity   `json:"packageMembersRoles"`
	PackageServices                 []PackageService            `json:"packageServices"`
	PackageTransitions              int                         `json:"packageTransitions"`
	PublishedData                   int                         `json:"publishedData"`
	PublishedDocumentOpenCounts     int                         `json:"publishedDocumentOpenCounts"`
	PublishedSources                int                         `json:"publishedSources"`
	PublishedVersionOpenCounts      int                         `json:"publishedVersionOpenCounts"`
	PublishedVersionReferences      int                         `json:"publishedVersionReferences"`
	PublishedVersionRevisionContent int                         `json:"publishedVersionRevisionContent"`
	PublishedVersionValidation      int                         `json:"publishedVersionValidation"`
	SharedUrlInfo                   int                         `json:"sharedUrlInfo"`
	TransformedContentData          int                         `json:"transformedContentData"`
	TotalRecords                    int                         `json:"totalRecords"`
}

type PackageService struct {
	tableName struct{} `pg:"package_service"`

	PackageId   string `pg:"package_id" json:"packageId"`
	ServiceName string `pg:"service_name" json:"serviceName"`
}

func (d *DeletedItemsStats) CalculateTotal() {
	d.TotalRecords = len(d.Packages) +
		len(d.PackageRevisions) +
		d.ActivityTracking +
		len(d.ApiKeys) +
		d.Builds +
		d.BuildDepends +
		d.BuildResults +
		d.BuildSources +
		d.BuilderNotifications +
		d.FavoritePackages +
		d.Operations +
		d.OperationGroups +
		d.GroupedOperations +
		d.OperationOpenCounts +
		d.PackageExportConfigs +
		len(d.PackageMembersRoles) +
		len(d.PackageServices) +
		d.PublishedData +
		d.PublishedDocumentOpenCounts +
		d.PublishedSources +
		d.PublishedVersionOpenCounts +
		d.PublishedVersionReferences +
		d.PublishedVersionRevisionContent +
		d.PublishedVersionValidation +
		d.SharedUrlInfo +
		d.TransformedContentData +
		d.PackageTransitions
}

func (d *DeletedItemsStats) Add(other *DeletedItemsStats) {
	d.Packages = append(d.Packages, other.Packages...)
	d.PackageRevisions = append(d.PackageRevisions, other.PackageRevisions...)
	d.ActivityTracking += other.ActivityTracking
	d.ApiKeys = append(d.ApiKeys, other.ApiKeys...)
	d.Builds += other.Builds
	d.BuildDepends += other.BuildDepends
	d.BuildResults += other.BuildResults
	d.BuildSources += other.BuildSources
	d.BuilderNotifications += other.BuilderNotifications
	d.FavoritePackages += other.FavoritePackages
	d.Operations += other.Operations
	d.OperationGroups += other.OperationGroups
	d.GroupedOperations += other.GroupedOperations
	d.OperationOpenCounts += other.OperationOpenCounts
	d.PackageExportConfigs += other.PackageExportConfigs
	d.PackageMembersRoles = append(d.PackageMembersRoles, other.PackageMembersRoles...)
	d.PackageServices = append(d.PackageServices, other.PackageServices...)
	d.PublishedData += other.PublishedData
	d.PublishedDocumentOpenCounts += other.PublishedDocumentOpenCounts
	d.PublishedSources += other.PublishedSources
	d.PublishedVersionOpenCounts += other.PublishedVersionOpenCounts
	d.PublishedVersionReferences += other.PublishedVersionReferences
	d.PublishedVersionRevisionContent += other.PublishedVersionRevisionContent
	d.PublishedVersionValidation += other.PublishedVersionValidation
	d.SharedUrlInfo += other.SharedUrlInfo
	d.TransformedContentData += other.TransformedContentData
	d.PackageTransitions += other.PackageTransitions
	d.CalculateTotal()
}
