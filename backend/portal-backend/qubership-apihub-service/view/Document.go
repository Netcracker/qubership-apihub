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
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
)

type DocumentTransformationReq struct {
	PackageId string `json:"packageId" validate:"required"`
	Version   string `json:"version" validate:"required"`
	ApiType   string `json:"apiType" validate:"required"`
	GroupName string `json:"groupName" validate:"required"`
}

type TransformedDocumentsFormat string

const JsonDocumentFormat TransformedDocumentsFormat = "json"
const YamlDocumentFormat TransformedDocumentsFormat = "yaml"
const HtmlDocumentFormat TransformedDocumentsFormat = "html"

func ValidTransformedDocumentsFormat_deprecated(format string) bool {
	switch format {
	case string(JsonDocumentFormat), string(HtmlDocumentFormat):
		return true
	}
	return false
}

func ValidateTransformedDocumentsFormat(format string) error {
	switch format {
	case string(JsonDocumentFormat), string(HtmlDocumentFormat), string(YamlDocumentFormat):
		return nil
	}
	return &exception.CustomError{
		Status:  http.StatusBadRequest,
		Code:    exception.InvalidParameterValue,
		Message: exception.InvalidParameterValueMsg,
		Params:  map[string]interface{}{"param": "format", "value": format},
	}
}

func ValidateFormatForBuildType(buildType string, format string) error {
	bt := BuildType(buildType)

	err := ValidateGroupBuildType(bt)
	if err != nil {
		return err
	}
	err = ValidateTransformedDocumentsFormat(format)
	if err != nil {
		return err
	}
	if bt == MergedSpecificationType_deprecated && format == string(HtmlDocumentFormat) {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.FormatNotSupportedForBuildType,
			Message: exception.FormatNotSupportedForBuildTypeMsg,
			Params:  map[string]interface{}{"format": format, "buildType": buildType},
		}
	}
	return nil
}

type DocumentExtension string

const JsonExtension DocumentExtension = "json"

const (
	JsonFormat     string = "json"
	YamlFormat     string = "yaml"
	MDFormat       string = "md"
	GraphQLFormat  string = "graphql"
	GQLFormat      string = "gql"
	ProtobufFormat string = "proto"
	UnknownFormat  string = "unknown"
)

func InvalidDocumentFormat(s string) bool {
	switch s {
	case JsonFormat, YamlFormat, MDFormat, GraphQLFormat, GQLFormat, ProtobufFormat, UnknownFormat:
		return false
	}
	return true
}

const (
	OpenAPI31Type     string = "openapi-3-1"
	OpenAPI30Type     string = "openapi-3-0"
	OpenAPI20Type     string = "openapi-2-0"
	Protobuf3Type     string = "protobuf-3"
	JsonSchemaType    string = "json-schema"
	MDType            string = "markdown"
	GraphQLSchemaType string = "graphql-schema"
	GraphAPIType      string = "graphapi"
	IntrospectionType string = "introspection"
	UnknownType       string = "unknown"
)

func InvalidDocumentType(documentType string) bool {
	switch documentType {
	case OpenAPI31Type, OpenAPI30Type, OpenAPI20Type, Protobuf3Type, JsonSchemaType, MDType, GraphQLSchemaType, GraphAPIType, IntrospectionType, UnknownType:
		return false
	}
	return true
}
