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

type ValidationStatus string
type ContentValidationType string

const (
	RvStatusYes        ValidationStatus = "YES"
	RvStatusSemi       ValidationStatus = "SEMI"
	RvStatusNo         ValidationStatus = "NO"
	RvStatusInProgress ValidationStatus = "IN_PROGRESS"
)

const (
	CvTypeError          ContentValidationType = "ERROR"
	CvTypeWarning        ContentValidationType = "WARNING"
	CvTypeInformation    ContentValidationType = "INFORMATION"
	CvTypeRecommendation ContentValidationType = "RECOMMENDATION"
)

type ValidationReport struct {
	ValidationId string                    `json:"validationId"`
	GroupName    string                    `json:"groupName"`
	Status       ValidationStatus          `json:"status"`
	Error        string                    `json:"error,omitempty"`
	Packages     []PackageValidationReport `json:"packages,omitempty"`
}

type PackageValidationReport struct {
	PackageId   string                 `json:"packageId"`
	PackageName string                 `json:"packageName"`
	Status      ValidationStatus       `json:"status"`
	Files       []FileValidationReport `json:"files,omitempty"`
}

type FileValidationReport struct {
	Slug         string                  `json:"slug"`
	Status       ValidationStatus        `json:"status"`
	FileMessages []FileValidationMessage `json:"messages,omitempty"`
}

type FileValidationMessage struct {
	Type ContentValidationType `json:"type"`
	Path string                `json:"path"`
	Text string                `json:"text"`
}

type FileDataInfo struct {
	Checksum string
	Data     []byte
	Format   string
}

func (f ValidationStatus) String() string {
	switch f {
	case RvStatusYes:
		return "OK"
	case RvStatusNo:
		return "NO"
	case RvStatusSemi:
		return "SEMI"
	case RvStatusInProgress:
		return "IN-PROGRESS"
	default:
		return "NONE"
	}
}

func (f ContentValidationType) String() string {
	switch f {
	case CvTypeError:
		return "ERROR"
	case CvTypeWarning:
		return "WARNING"
	case CvTypeInformation:
		return "INFORMATION"
	default:
		return "RECOMMENDATION"
	}
}
func ParseCvTypeInt(severity int) ContentValidationType {
	switch severity {
	case 0:
		return CvTypeError
	case 1:
		return CvTypeWarning
	case 2:
		return CvTypeInformation
	default:
		return CvTypeRecommendation
	}
}

func (f ContentValidationType) ToInt() int {
	switch f {
	case CvTypeError:
		return 0
	case CvTypeWarning:
		return 1
	case CvTypeInformation:
		return 2
	case CvTypeRecommendation:
		return 3
	default:
		return 4
	}
}
