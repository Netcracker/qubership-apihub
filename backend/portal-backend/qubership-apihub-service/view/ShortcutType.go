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

type ShortcutType string

// todo maybe add plain text type
const (
	OpenAPI31     ShortcutType = "openapi-3-1"
	OpenAPI30     ShortcutType = "openapi-3-0"
	OpenAPI20     ShortcutType = "openapi-2-0"
	AsyncAPI      ShortcutType = "asyncapi-2"
	JsonSchema    ShortcutType = "json-schema"
	MD            ShortcutType = "markdown"
	GraphQLSchema ShortcutType = "graphql-schema"
	GraphAPI      ShortcutType = "graphapi"
	Introspection ShortcutType = "introspection"
	Unknown       ShortcutType = "unknown"
)

func (s ShortcutType) String() string {
	return string(s)
}

func ParseTypeFromString(s string) ShortcutType {
	switch s {
	case "openapi-3-0":
		return OpenAPI30
	case "openapi-3-1":
		return OpenAPI31
	case "openapi-2-0":
		return OpenAPI20
	case "asyncapi-2":
		return AsyncAPI
	case "markdown":
		return MD
	case "unknown":
		return Unknown
	case "json-schema":
		return JsonSchema
	case "graphql-schema":
		return GraphQLSchema
	case "graphapi":
		return GraphAPI
	case "introspection":
		return Introspection
	default:
		return Unknown
	}
}

func ComparableTypes(type1 ShortcutType, type2 ShortcutType) bool {
	if type1 == type2 {
		return true
	}
	if type1 == OpenAPI30 && type2 == OpenAPI31 {
		return true
	}
	if type1 == OpenAPI31 && type2 == OpenAPI30 {
		return true
	}

	return false
}
