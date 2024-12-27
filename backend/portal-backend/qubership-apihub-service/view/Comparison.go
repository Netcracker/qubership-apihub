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

type VersionComparisonSummary struct {
	OperationTypes *[]OperationType              `json:"operationTypes,omitempty"`
	Refs           *[]RefComparison              `json:"refs,omitempty"`
	Packages       *map[string]PackageVersionRef `json:"packages,omitempty"`
	NoContent      bool                          `json:"noContent,omitempty"`
}

type RefComparison struct {
	PackageRef         string          `json:"packageRef,omitempty"`
	PreviousPackageRef string          `json:"previousPackageRef,omitempty"`
	OperationTypes     []OperationType `json:"operationTypes"`
	NoContent          bool            `json:"noContent,omitempty"`
}
