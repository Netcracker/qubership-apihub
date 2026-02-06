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

type RestOperationMetadata struct {
	Path   string   `json:"path"`
	Method string   `json:"method"`
	Tags   []string `json:"tags,omitempty"`
}

type RestOperationSingleView struct {
	SingleOperationView
	RestOperationMetadata
}

type RestOperationView struct {
	OperationListView
	RestOperationMetadata
}

type DeprecatedRestOperationView struct {
	DeprecatedOperationView
	RestOperationMetadata
}

type RestOperationComparisonChangelogView struct {
	GenericComparisonOperationView
	RestOperationMetadata
}

type RestOperationComparisonChangesView struct {
	OperationComparisonChangesView
	RestOperationMetadata
}

type RestOperationPairChangesView struct {
	CurrentOperation             *RestOperationComparisonChangelogView `json:"currentOperation,omitempty"`
	PreviousOperation            *RestOperationComparisonChangelogView `json:"previousOperation,omitempty"`
	ChangeSummary                ChangeSummary                         `json:"changeSummary"`
	ComparisonInternalDocumentId string                                `json:"comparisonInternalDocumentId"`
}
