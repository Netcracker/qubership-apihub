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

type Validation struct {
	Summary interface{} `json:"summary,omitempty"`
	//Data    []interface{} `json:"data,omitempty"`
}

type ValidationsMap map[string]Validation

type VersionValidationChanges struct {
	PreviousVersion          string                 `json:"previousVersion,omitempty"`
	PreviousVersionPackageId string                 `json:"previousVersionPackageId,omitempty"`
	Changes                  []VersionChangelogData `json:"changes"`
	Bwc                      []VersionBwcData       `json:"bwcMessages"`
}

type VersionValidationProblems struct {
	Spectral []VersionSpectralData `json:"messages"`
}

// changelog.json
type VersionChangelog struct {
	Summary VersionChangelogSummary `json:"summary,omitempty"`
	Data    []VersionChangelogData  `json:"data,omitempty"`
}

type VersionChangelogSummary struct {
	Breaking     int `json:"breaking"`
	NonBreaking  int `json:"non-breaking"`
	Unclassified int `json:"unclassified"`
	SemiBreaking int `json:"semi-breaking"`
	Annotation   int `json:"annotation"`
	Deprecate    int `json:"deprecate"`
}

type VersionChangelogData struct {
	FileId         string             `json:"fileId,omitempty"`
	Slug           string             `json:"slug,omitempty"`
	PreviousFileId string             `json:"previousFileId,omitempty"`
	PreviousSlug   string             `json:"previousSlug,omitempty"`
	Openapi        *OpenapiOperation  `json:"openapi,omitempty"`
	Asyncapi       *AsyncapiOperation `json:"asyncapi,omitempty"`
	JsonPath       []string           `json:"jsonPath,omitempty" validate:"required"`
	Action         string             `json:"action,omitempty" validate:"required"`
	Severity       string             `json:"severity,omitempty" validate:"required"`
}

// spectral.json
type VersionSpectral struct {
	Summary VersionSpectralSummary `json:"summary,omitempty"`
	Data    []VersionSpectralData  `json:"data,omitempty"`
}

type VersionSpectralSummary struct {
	Errors   int `json:"error"`
	Warnings int `json:"warnings"`
}

type VersionSpectralData struct {
	FileId           string   `json:"fileId,omitempty"`
	Slug             string   `json:"slug,omitempty"`
	JsonPath         []string `json:"jsonPath,omitempty"`
	ExternalFilePath string   `json:"externalFilePath,omitempty"`
	Message          string   `json:"message" validate:"required"`
	Severity         int      `json:"severity" validate:"required"`
}

// bwc.json
type VersionBwc struct {
	Summary VersionBwcSummary `json:"summary,omitempty"`
	Data    []VersionBwcData  `json:"data,omitempty"`
}

type VersionBwcSummary struct {
	Errors   int `json:"error"`
	Warnings int `json:"warnings"`
}

type VersionBwcData struct {
	FileId           string   `json:"fileId,omitempty"`
	PreviousFileId   string   `json:"previousFileId,omitempty"`
	Slug             string   `json:"slug,omitempty"`
	PreviousSlug     string   `json:"previousSlug,omitempty"`
	JsonPath         []string `json:"jsonPath,omitempty"`
	ExternalFilePath string   `json:"externalFilePath,omitempty"`
	Message          string   `json:"message" validate:"required"`
	Severity         int      `json:"severity" validate:"required"`
}
