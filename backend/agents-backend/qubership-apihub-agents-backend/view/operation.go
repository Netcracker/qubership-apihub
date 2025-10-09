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

type RestOperations struct {
	Operations []RestOperationView          `json:"operations"`
	Packages   map[string]PackageVersionRef `json:"packages,omitempty"`
}

type RestOperationView struct {
	OperationListView
	RestOperationMetadata
}

type OperationListView struct {
	CommonOperationView
	PackageRef string                 `json:"packageRef,omitempty"`
	Data       map[string]interface{} `json:"data,omitempty"`
}

type CommonOperationView struct {
	OperationId string `json:"operationId"`
	Title       string `json:"title"`
	DataHash    string `json:"dataHash"`
	Deprecated  bool   `json:"deprecated,omitempty"`
	ApiKind     string `json:"apiKind"`
	ApiType     string `json:"apiType"`
	ApiAudience string `json:"apiAudience"`
}

type RestOperationMetadata struct {
	Path   string   `json:"path"`
	Method string   `json:"method"`
	Tags   []string `json:"tags,omitempty"`
}
