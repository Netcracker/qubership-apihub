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

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type MigrationReport struct {
	Status                string            `json:"status"`
	StartedAt             time.Time         `json:"startedAt"`
	FinishedAt            *time.Time        `json:"finishedAt,omitempty"`
	ElapsedTime           string            `json:"elapsedTime"`
	SuccessBuildsCount    int               `json:"successBuildsCount,omitempty"`
	ErrorBuildsCount      int               `json:"errorBuildsCount,omitempty"`
	SuspiciousBuildsCount int               `json:"suspiciousBuildsCount,omitempty"`
	ErrorDetails          string            `json:"errorDetails,omitempty"`
	Stages                []StageExecution  `json:"stages,omitempty"`
	ErrorBuilds           []MigrationError  `json:"errorBuilds,omitempty"`
	MigrationChanges      []MigrationChange `json:"migrationChanges,omitempty"`
	PostCheckResult       *PostCheckResult  `json:"postCheckResult,omitempty"`
}

type MigrationError struct {
	PackageId                string         `json:"packageId,omitempty"`
	Version                  string         `json:"version,omitempty"`
	Revision                 int            `json:"revision,omitempty"`
	Error                    string         `json:"error,omitempty"`
	BuildId                  string         `json:"buildId"`
	BuildType                view.BuildType `json:"buildType,omitempty"`
	PreviousVersion          string         `json:"previousVersion,omitempty"`
	PreviousVersionPackageId string         `json:"previousVersionPackageId,omitempty"`
}

type MigrationChange struct {
	ChangedField        string                    `json:"changedField"`
	AffectedBuildsCount int                       `json:"affectedBuildsCount"`
	AffectedBuildSample *SuspiciousMigrationBuild `json:"affectedBuildSample,omitempty"`
}

type SuspiciousMigrationBuild struct {
	PackageId                string                 `json:"packageId,omitempty"`
	Version                  string                 `json:"version,omitempty"`
	Revision                 int                    `json:"revision,omitempty"`
	BuildId                  string                 `json:"buildId"`
	Changes                  map[string]interface{} `json:"changes"`
	BuildType                string                 `json:"buildType"`
	PreviousVersion          string                 `json:"previousVersion,omitempty"`
	PreviousVersionPackageId string                 `json:"previousVersionPackageId,omitempty"`
}

type NotMigratedVersion struct {
	PackageId                string `json:"packageId"`
	Version                  string `json:"version"`
	Revision                 int    `json:"revision"`
	PreviousVersion          string `json:"previousVersion"`
	PreviousVersionPackageId string `json:"previousVersionPackageId"`
}

type NotMigratedComparison struct {
	PackageId         string `pg:"package_id, type:varchar"`
	Version           string `pg:"version, type:varchar"`
	Revision          int    `pg:"revision, type:integer"`
	PreviousPackageId string `pg:"previous_package_id, type:varchar"`
	PreviousVersion   string `pg:"previous_version, type:varchar"`
	PreviousRevision  int    `pg:"previous_revision, type:integer"`
}

type PostCheckResult struct {
	NotMigratedVersions    []NotMigratedVersion    `json:"notMigratedVersions"`
	NotMigratedComparisons []NotMigratedComparison `json:"notMigratedComparisons"`
}

type TimePerPhase struct {
	Phase        time.Time `json:"phase"`
	TimeSpentSec int       `json:"timeSpentSec"`
}

type BuildsInPackage struct {
	PackageId      string `json:"packageId"`
	BuildCount     int    `json:"buildCount"`
	TotalTimeSec   int    `json:"totalTimeSec"`
	AverageTimeSec int    `json:"averageTimeSec"`
}

type BuildPerHour struct {
	Hour             time.Time           `json:"hour"`
	TotalCount       int                 `json:"totalCount"`
	Stages           []OpsMigrationStage `json:"stages"`
	BuildsInPackages []BuildsInPackage   `json:"buildsInPackages,omitempty"`
}

type SlowBuild struct {
	BuildId   string `json:"buildId"`
	PackageId string `json:"packageId"`
	// TODO: []versions, averageTimeSec - aggregate versions in the same package!
	// TODO: time percent
	Version     string `json:"version"`
	TimeSeconds int    `json:"timeSeconds"`
}

type SlowComparison struct {
	BuildId           string `json:"buildId"`
	PackageId         string `json:"packageId"`
	Version           string `json:"version"`
	PreviousPackageId string `pg:"previous_package_id, type:varchar"`
	PreviousVersion   string `pg:"previous_version, type:varchar"`
	TimeSeconds       int    `json:"timeSeconds"`
}

type MigrPerfData struct {
	Stages          []StageExecution `json:"stages"`
	BuildPerHour    []BuildPerHour   `json:"buildPerHour"`
	SlowBuilds      []SlowBuild      `json:"slowBuilds"`
	SlowComparisons []SlowComparison `json:"slowComparisons"`
}

const MigrationStatusRunning = "running"
const MigrationStatusComplete = "complete"
const MigrationStatusFailed = "failed"
const MigrationStatusCancelling = "cancelling"
const MigrationStatusCancelled = "cancelled"

type OpsMigrationStage string

const MigrationStageStarting OpsMigrationStage = "starting"
const MigrationStageCleanupBefore OpsMigrationStage = "cleanup_before"
const MigrationStageIndependentVersionsLastRevs OpsMigrationStage = "independent_versions_last"
const MigrationStageDependentVersionsLastRevs OpsMigrationStage = "dependent_versions_last"

const MigrationStageIndependentVersionsOldRevs OpsMigrationStage = "independent_versions_old"
const MigrationStageDependentVersionsOldRevs OpsMigrationStage = "dependent_versions_old"

const MigrationStageComparisonsOther OpsMigrationStage = "comparisons_other"

const MigrationStageComparisonsOnly OpsMigrationStage = "comparisons_only"

const MigrationStageTSRecalculate OpsMigrationStage = "ts_recalculate"

const MigrationStagePostCheck OpsMigrationStage = "post_check"
const MigrationStageDone OpsMigrationStage = "done"
const MigrationStageUndefined OpsMigrationStage = "undefined"

const MigrationStageCancelling OpsMigrationStage = "cancelling"
const MigrationStageCancelled OpsMigrationStage = "cancelled"

type StageExecution struct {
	Stage       OpsMigrationStage `json:"stage"`
	Start       *time.Time        `json:"start,omitempty"`
	End         *time.Time        `json:"end,omitempty"`
	ElapsedTime string            `json:"elapsedTime"`
	TimePercent int               `json:"timePercent"`
	BuildsCount *int              `json:"buildsCount,omitempty"`
}
