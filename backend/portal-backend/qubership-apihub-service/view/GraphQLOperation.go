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
	QueryType        string = "query"
	MutationType     string = "mutation"
	SubscriptionType string = "subscription"
)

func ValidGraphQLOperationType(typeValue string) bool {
	switch typeValue {
	case QueryType, MutationType, SubscriptionType:
		return true
	}
	return false
}

type GraphQLOperationMetadata struct {
	Type   string   `json:"type"`
	Method string   `json:"method"`
	Tags   []string `json:"tags"`
}

type GraphQLOperationSingleView struct {
	SingleOperationView
	GraphQLOperationMetadata
}

type GraphQLOperationView struct {
	OperationListView
	GraphQLOperationMetadata
}
type DeprecateGraphQLOperationView struct {
	DeprecatedOperationView
	GraphQLOperationMetadata
}

type GraphQLOperationComparisonChangelogView_deprecated struct {
	OperationComparisonChangelogView_deprecated
	GraphQLOperationMetadata
}

type GraphQLOperationComparisonChangelogView_deprecated_2 struct {
	OperationComparisonChangelogView_deprecated_2
	GraphQLOperationMetadata
}

type GraphQLOperationComparisonChangesView struct {
	OperationComparisonChangesView
	GraphQLOperationMetadata
}

type GraphqlOperationComparisonChangelogView struct {
	GenericComparisonOperationView
	GraphQLOperationMetadata
}

type GraphqlOperationPairChangesView struct {
	CurrentOperation  *GraphqlOperationComparisonChangelogView `json:"currentOperation,omitempty"`
	PreviousOperation *GraphqlOperationComparisonChangelogView `json:"previousOperation,omitempty"`
	ChangeSummary     ChangeSummary                            `json:"changeSummary"`
}
