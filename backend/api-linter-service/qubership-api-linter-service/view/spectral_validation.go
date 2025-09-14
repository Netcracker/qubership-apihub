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

type SpectralResultSummary struct {
	ErrorCount   int `json:"errorCount"`
	WarningCount int `json:"warningCount"`
	InfoCount    int `json:"infoCount"`
	HintCount    int `json:"hintCount"`
}

type SpectralDocumentValidationEntity struct {
	Filename        string
	Summary         SpectralResultSummary
	Report          []interface{}
	CalculationTime int64
	Details         string
}

type SpectralOutputItem struct {
	Code     string   `json:"code"`
	Path     []string `json:"path"`
	Message  string   `json:"message"`
	Severity int      `json:"severity"`
	Range    struct {
		Start struct {
			Line      int `json:"line"`
			Character int `json:"character"`
		} `json:"start"`
		End struct {
			Line      int `json:"line"`
			Character int `json:"character"`
		} `json:"end"`
	} `json:"range"`
	Source string `json:"source"`
}

func ConvertSpectralSeverityToString(severity int) string {
	switch severity {
	case 0:
		return "error"
	case 1:
		return "warning"
	case 2:
		return "info"
	case 3:
		return "hint"
	}
	return "unknown"
}
