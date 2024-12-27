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
	UnaryType                  string = "unary"
	ServerStreamingType        string = "serverStreaming"
	ClientStreamingType        string = "clientStreaming"
	BidirectionalStreamingType string = "bidirectionalStreaming"
)

func ValidProtobufOperationType(typeValue string) bool {
	switch typeValue {
	case UnaryType, ServerStreamingType, ClientStreamingType, BidirectionalStreamingType:
		return true
	}
	return false
}

type ProtobufOperationMetadata struct {
	Type   string `json:"type"`
	Method string `json:"method"`
}

type ProtobufOperationSingleView struct {
	SingleOperationView
	ProtobufOperationMetadata
}

type ProtobufOperationView struct {
	OperationListView
	ProtobufOperationMetadata
}
type DeprecateProtobufOperationView struct {
	DeprecatedOperationView
	ProtobufOperationMetadata
}

type ProtobufOperationComparisonChangelogView struct {
	OperationComparisonChangelogView
	ProtobufOperationMetadata
}
type ProtobufOperationComparisonChangesView struct {
	OperationComparisonChangesView
	ProtobufOperationMetadata
}
