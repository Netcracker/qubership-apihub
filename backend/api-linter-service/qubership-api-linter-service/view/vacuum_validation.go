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

type ValidationResult struct {
}

type ValidationData struct {
	DataHash string
	Data     []byte
}

type VacuumReport struct {
	ResultSet  VacuumResultSet        `json:"resultSet"`
	Statistics map[string]interface{} `json:"statistics"`
}

type VacuumResultSet struct {
	VacuumResultSummary
	Results []interface{} `json:"results"`
}

type VacuumResultSummary struct {
	ErrorCount   int `json:"errorCount"`
	WarningCount int `json:"warningCount"`
	InfoCount    int `json:"infoCount"`
	HintCount    int `json:"hintCount"`
}

type DocumentValidationEntity struct {
	Filename        string
	Summary         map[string]interface{}
	Report          []interface{}
	CalculationTime int64
	Details         string
}

type OperationValidationEntity struct {
	DataHash        string
	Summary         map[string]interface{}
	Report          []interface{}
	CalculationTime int64
	Details         string
}
