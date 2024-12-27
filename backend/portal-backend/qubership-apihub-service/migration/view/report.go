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

import "time"

type MigrationReport struct {
	Status                string            `json:"status"`
	StartedAt             time.Time         `json:"startedAt"`
	FinishedAt            *time.Time        `json:"finishedAt,omitempty"`
	ElapsedTime           string            `json:"elapsedTime"`
	SuccessBuildsCount    int               `json:"successBuildsCount,omitempty"`
	ErrorBuildsCount      int               `json:"errorBuildsCount,omitempty"`
	SuspiciousBuildsCount int               `json:"suspiciousBuildsCount,omitempty"`
	ErrorBuilds           []MigrationError  `json:"errorBuilds,omitempty"`
	MigrationChanges      []MigrationChange `json:"migrationChanges,omitempty"`
}

type MigrationError struct {
	PackageId                string `json:"packageId,omitempty"`
	Version                  string `json:"version,omitempty"`
	Revision                 int    `json:"revision,omitempty"`
	Error                    string `json:"error,omitempty"`
	BuildId                  string `json:"buildId"`
	BuildType                string `json:"buildType,omitempty"`
	PreviousVersion          string `json:"previousVersion,omitempty"`
	PreviousVersionPackageId string `json:"previousVersionPackageId,omitempty"`
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

const MigrationStatusRunning = "running"
const MigrationStatusComplete = "complete"
const MigrationStatusFailed = "failed"
const MigrationStatusCancelled = "cancelled"
