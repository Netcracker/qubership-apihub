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
	OpenAPI31Type     string = "openapi-3-1"
	OpenAPI30Type     string = "openapi-3-0"
	OpenAPI20Type     string = "openapi-2-0"
	AsyncAPIType      string = "asyncapi-2"
	JsonSchemaType    string = "json-schema"
	MDType            string = "markdown"
	GraphQLSchemaType string = "graphql-schema"
	GraphAPIType      string = "graphapi"
	GraphQLType       string = "graphql"
	IntrospectionType string = "introspection"
	UnknownType       string = "unknown"
)

func ValidDocumentType(documentType string) bool {
	switch documentType {
	case OpenAPI31Type, OpenAPI30Type, OpenAPI20Type, AsyncAPIType, JsonSchemaType, MDType, GraphQLSchemaType, GraphAPIType, IntrospectionType, GraphQLType, UnknownType:
		return true
	}
	return false
}

func DocTypeToApiType(documentType string) ApiType {
	switch documentType {
	case OpenAPI31Type, OpenAPI30Type, OpenAPI20Type:
		return ATRest
	case GraphAPIType, GraphQLType, IntrospectionType:
		return ATGraphql
	case MDType:
		return ATMarkdown
	case JsonSchemaType:
		return ATJsonSchema
	default:
		return ATUnknown
	}
}

func GetDocExtensionByType(documentType string) string {
	switch documentType {
	case MDType:
		return MarkdownExtension
	case JsonSchemaType:
		return JsonExtension
	default:
		return UnknownExtension
	}
}
