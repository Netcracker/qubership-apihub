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

type ExportApiChangesRequestView struct {
	PreviousVersion          string
	PreviousVersionPackageId string
	TextFilter               string
	Tags                     []string
	ApiKind                  string
	EmptyTag                 bool
	RefPackageId             string
	Group                    string
	EmptyGroup               bool
	ApiAudience              string
}

type ExportOperationRequestView struct {
	EmptyTag     bool
	Kind         string
	Tag          string
	TextFilter   string
	Tags         []string
	RefPackageId string
	Group        string
	EmptyGroup   bool
	ApiAudience  string
}

const ExportFormatXlsx = "xlsx"
const ExportFormatJson = "json"

func ValidateApiChangesExportFormat(format string) bool {
	switch format {
	case ExportFormatXlsx:
		return true
	default:
		return false
	}
}

type ExportedEntity string

const (
	ExportEntityVersion             ExportedEntity = "version"
	ExportEntityRestDocument        ExportedEntity = "restDocument"
	ExportEntityRestOperationsGroup ExportedEntity = "restOperationsGroup"
)

type ExportRequestDiscriminator struct {
	ExportedEntity ExportedEntity `json:"exportedEntity" validate:"required"`
	PackageId      string         `json:"packageId" validate:"required"`
	Version        string         `json:"version" validate:"required"`
}

type ExportVersionReq struct {
	ExportedEntity      ExportedEntity `json:"exportedEntity" validate:"required"`
	PackageId           string         `json:"packageId" validate:"required"`
	Version             string         `json:"version" validate:"required"`
	Format              string         `json:"format" validate:"required"`
	RemoveOasExtensions bool           `json:"removeOasExtensions"`
}

type ExportOASDocumentReq struct {
	ExportedEntity      ExportedEntity `json:"exportedEntity" validate:"required"`
	PackageId           string         `json:"packageId" validate:"required"`
	Version             string         `json:"version" validate:"required"`
	DocumentID          string         `json:"documentId"  validate:"required"`
	Format              string         `json:"format"  validate:"required"`
	RemoveOasExtensions bool           `json:"removeOasExtensions,omitempty"`
}

type ExportRestOperationsGroupReq struct {
	ExportedEntity               ExportedEntity `json:"exportedEntity" validate:"required"`
	PackageId                    string         `json:"packageId" validate:"required"`
	Version                      string         `json:"version" validate:"required"`
	GroupName                    string         `json:"groupName" validate:"required"`
	OperationsSpecTransformation string         `json:"operationsSpecTransformation" validate:"required"`
	Format                       string         `json:"format" validate:"required"`
	RemoveOasExtensions          bool           `json:"removeOasExtensions,omitempty"`
}

type ExportResponse struct {
	ExportID string `json:"exportId"`
}

const (
	FormatHTML = "html"
	FormatYAML = "yaml"
	FormatJSON = "json"
)

const (
	TransformationReducedSource = "reducedSourceSpecifications"
	TransformationMerged        = "mergedSpecification"
)

type ExportStatus struct {
	Status  string  `json:"status"`
	Message *string `json:"message,omitempty"`
}

type ExportResult struct {
	Data     []byte
	FileName string
}
