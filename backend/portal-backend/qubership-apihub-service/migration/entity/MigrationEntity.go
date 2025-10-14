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

	view2 "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/view"
)

type PublishedContentMigrationEntity struct {
	tableName struct{} `pg:"published_version_revision_content, alias:published_version_revision_content"`

	entity.PublishedContentEntity
	Data []byte `pg:"data, type:bytea"`
}

type MigrationRunEntity struct {
	tableName struct{} `pg:"migration_run"`

	Id                     string                 `pg:"id, type:varchar"`
	StartedAt              time.Time              `pg:"started_at, type:timestamp without time zone"`
	Status                 string                 `pg:"status, type:varchar"`
	Stage                  view.OpsMigrationStage `pg:"stage, type:varchar"`
	PackageIds             []string               `pg:"package_ids, type:varchar[]"`
	Versions               []string               `pg:"versions, type:varchar[]"`
	IsRebuild              bool                   `pg:"is_rebuild, type:boolean"`
	IsRebuildChangelogOnly bool                   `pg:"is_rebuild_changelog_only, type:boolean"`
	SkipValidation         bool                   `pg:"skip_validation, type:boolean"`
	CurrentBuilderVersion  string                 `pg:"current_builder_version, type:varchar"`
	ErrorDetails           string                 `pg:"error_details, type:varchar"`
	PostCheckResult        *PostCheckResultEntity `pg:"post_check_result, type:jsonb"`
	FinishedAt             time.Time              `pg:"finished_at, type:timestamp without time zone"`
	UpdatedAt              time.Time              `pg:"updated_at, type:timestamp without time zone"`
	InstanceId             string                 `pg:"instance_id, type:varchar"`
	SequenceNumber         int                    `pg:"sequence_number, type:integer"`
	RetryCount             int                    `pg:"retry_count, type:integer"`
	StagesExecution        []StageExecution       `pg:"stages_execution, type:jsonb"`
}

type MigrationBuildResultEntity struct {
	tableName struct{} `pg:"build, alias:build"`

	BuildId                  string                `pg:"build_id, type:varchar"`
	PackageId                string                `pg:"package_id, type:varchar"`
	Version                  string                `pg:"version, type:varchar"`
	Revision                 int                   `pg:"revision, type:integer"`
	Status                   view2.BuildStatusEnum `pg:"status, type:varchar"`
	Details                  string                `pg:"details, type:varchar"`
	BuildType                view2.BuildType       `pg:"build_type, type:varchar"`
	PreviousVersion          string                `pg:"previous_version, type:varchar"`
	PreviousVersionPackageId string                `pg:"previous_version_package_id, type:varchar"`
}

type MigrationChangelogEntity struct {
	tableName struct{} `pg:"version_comparison, alias:version_comparison"`

	PackageId         string `pg:"package_id, type:varchar"`
	Version           string `pg:"version, type:varchar"`
	Revision          int    `pg:"revision, type:integer"`
	PreviousPackageId string `pg:"previous_package_id, type:varchar"`
	PreviousVersion   string `pg:"previous_version, type:varchar"`
	PreviousRevision  int    `pg:"previous_revision, type:integer"`
}

type SchemaMigrationEntity struct {
	tableName struct{} `pg:"stored_schema_migration, alias:stored_schema_migration"`

	Num      int    `pg:"num, pk, type:integer"`
	UpHash   string `pg:"up_hash, type:varchar"`
	SqlUp    string `pg:"sql_up, type:varchar"`
	DownHash string `pg:"down_hash, type:varchar"`
	SqlDown  string `pg:"sql_down, type:varchar"`
}

type MigratedVersionChangesEntity struct {
	tableName struct{} `pg:"migrated_version_changes, alias:migrated_version_changes"`

	PackageId     string                 `pg:"package_id, type:varchar"`
	Version       string                 `pg:"version, type:varchar"`
	Revision      int                    `pg:"revision, type:integer"`
	BuildId       string                 `pg:"build_id, type:varchar"`
	MigrationId   string                 `pg:"migration_id, type:varchar"`
	Changes       map[string]interface{} `pg:"changes, type:jsonb"`
	UniqueChanges []string               `pg:"unique_changes, type:varchar[]"`
}

type MigratedVersionChangesResultEntity struct {
	tableName struct{} `pg:"migrated_version_changes, alias:migrated_version_changes"`

	MigratedVersionChangesEntity
	BuildType                string `pg:"build_type, type:varchar"`
	PreviousVersion          string `pg:"previous_version, type:varchar"`
	PreviousVersionPackageId string `pg:"previous_version_package_id, type:varchar"`
}

type MigrationVersionEntity struct {
	tableName struct{} `pg:"published_version, alias:published_version"`

	PackageId                string `json:"packageId"`
	Version                  string `json:"version"`
	Revision                 int    `json:"revision"`
	PreviousVersion          string `json:"previousVersion"`
	PreviousVersionPackageId string `json:"previousVersionPackageId"`
}

type PostCheckResultEntity struct {
	NotMigratedVersions    []MigrationVersionEntity   `json:"notMigratedVersions"`
	NotMigratedComparisons []MigrationChangelogEntity `json:"notMigratedComparisons"`
}

func MakeSuspiciousBuildView(changedVersion MigratedVersionChangesResultEntity) *view.SuspiciousMigrationBuild {
	return &view.SuspiciousMigrationBuild{
		PackageId:                changedVersion.PackageId,
		Version:                  changedVersion.Version,
		Revision:                 changedVersion.Revision,
		BuildId:                  changedVersion.BuildId,
		Changes:                  changedVersion.Changes,
		BuildType:                changedVersion.BuildType,
		PreviousVersion:          changedVersion.PreviousVersion,
		PreviousVersionPackageId: changedVersion.PreviousVersionPackageId,
	}
}

func MakePostCheckResultView(entity PostCheckResultEntity) *view.PostCheckResult {
	notMigratedVersions := make([]view.NotMigratedVersion, len(entity.NotMigratedVersions))
	for i, version := range entity.NotMigratedVersions {
		notMigratedVersions[i] = view.NotMigratedVersion{
			PackageId:                version.PackageId,
			Version:                  version.Version,
			Revision:                 version.Revision,
			PreviousVersion:          version.PreviousVersion,
			PreviousVersionPackageId: version.PreviousVersionPackageId,
		}
	}

	notMigratedComparisons := make([]view.NotMigratedComparison, len(entity.NotMigratedComparisons))
	for i, comparison := range entity.NotMigratedComparisons {
		notMigratedComparisons[i] = view.NotMigratedComparison{
			PackageId:         comparison.PackageId,
			Version:           comparison.Version,
			Revision:          comparison.Revision,
			PreviousPackageId: comparison.PreviousPackageId,
			PreviousVersion:   comparison.PreviousVersion,
			PreviousRevision:  comparison.PreviousRevision,
		}
	}

	return &view.PostCheckResult{
		NotMigratedVersions:    notMigratedVersions,
		NotMigratedComparisons: notMigratedComparisons,
	}
}

type StageExecution struct {
	Stage       view.OpsMigrationStage `json:"stage"`
	Start       time.Time              `json:"start"`
	End         time.Time              `json:"end"`
	BuildsCount int                    `json:"buildsCount"`
}
