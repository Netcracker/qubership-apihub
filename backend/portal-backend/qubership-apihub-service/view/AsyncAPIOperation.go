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

const (
	SendAction    string = "send"
	ReceiveAction string = "receive"
)

func ValidAsyncAPIAction(actionValue string) bool {
	switch actionValue {
	case SendAction, ReceiveAction:
		return true
	}
	return false
}

type AsyncAPIOperationMetadata struct {
	Action   string   `json:"action"`
	Channel  string   `json:"channel"`
	Protocol string   `json:"protocol"`
	Tags     []string `json:"tags,omitempty"`
}

type AsyncAPIOperationSingleView struct {
	SingleOperationView
	AsyncAPIOperationMetadata
}

type AsyncAPIOperationView struct {
	OperationListView
	AsyncAPIOperationMetadata
}

type DeprecatedAsyncAPIOperationView struct {
	DeprecatedOperationView
	AsyncAPIOperationMetadata
}

type AsyncAPIOperationComparisonChangelogView struct {
	GenericComparisonOperationView
	AsyncAPIOperationMetadata
}

type AsyncAPIOperationComparisonChangesView struct {
	OperationComparisonChangesView
	AsyncAPIOperationMetadata
}

type AsyncAPIOperationPairChangesView struct {
	CurrentOperation             *AsyncAPIOperationComparisonChangelogView `json:"currentOperation,omitempty"`
	PreviousOperation            *AsyncAPIOperationComparisonChangelogView `json:"previousOperation,omitempty"`
	ChangeSummary                ChangeSummary                             `json:"changeSummary"`
	ComparisonInternalDocumentId string                                    `json:"comparisonInternalDocumentId"`
}
