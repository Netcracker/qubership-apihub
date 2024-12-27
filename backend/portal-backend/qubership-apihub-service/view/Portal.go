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

type DocumentationType string

const DTInteractive DocumentationType = "INTERACTIVE"
const DTStatic DocumentationType = "STATIC"
const DTPdf DocumentationType = "PDF"
const DTRaw DocumentationType = "RAW"

func GetDtFromStr(str string) DocumentationType {
	switch str {
	case "INTERACTIVE":
		return DTInteractive
	case "STATIC":
		return DTStatic
	case "PDF":
		return DTPdf
	case "RAW":
		return DTRaw
	case "":
		return DTInteractive
	}
	return DocumentationType(str)
}

type VersionDocMetadata struct {
	GitLink           string         `json:"gitLink"`
	Branch            string         `json:"branch"`
	DateOfPublication string         `json:"dateOfPublication"`
	CommitId          string         `json:"commitId"`
	Version           string         `json:"version"`
	Revision          int            `json:"revision"`
	User              string         `json:"user"`
	Labels            []string       `json:"labels"`
	Files             []FileMetadata `json:"files"`
}

type FileMetadata struct {
	Type     string    `json:"type"`
	Name     string    `json:"name"` // title
	Format   string    `json:"format"`
	Slug     string    `json:"slug"`
	Labels   []string  `json:"labels,omitempty"`
	Openapi  *Openapi  `json:"openapi,omitempty"`
	Asyncapi *Asyncapi `json:"asyncapi,omitempty"`
}
