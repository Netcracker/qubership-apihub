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

type SearchEndpointOpts struct {
	SearchLevel    string   `json:"searchLevel,omitempty"`
	ApiType        string   `json:"apiType,omitempty"`
	Scopes         []string `json:"scope,omitempty"`
	DetailedScopes []string `json:"detailedScope,omitempty"`
	Methods        []string `json:"methods,omitempty"`
	OperationTypes []string `json:"operationTypes,omitempty"`
}

func MakeSearchEndpointOptions(searchLevel string, operationSearchParams *OperationSearchParams) SearchEndpointOpts {
	searchOpts := SearchEndpointOpts{
		SearchLevel: searchLevel,
	}
	if operationSearchParams != nil {
		searchOpts.ApiType = operationSearchParams.ApiType
		searchOpts.Scopes = operationSearchParams.Scopes
		searchOpts.DetailedScopes = operationSearchParams.DetailedScopes
		searchOpts.Methods = operationSearchParams.Methods
		searchOpts.OperationTypes = operationSearchParams.OperationTypes
	}
	return searchOpts
}
