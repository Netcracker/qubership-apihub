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
