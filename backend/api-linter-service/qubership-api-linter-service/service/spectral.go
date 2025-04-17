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

package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path"
	"runtime"
	"time"

	"github.com/Netcracker/qubership-api-linter-service/view"
	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
)

func (v validationServiceImpl) runDocumentsSpectral(documents []string) (*[]view.SpectralDocumentValidationEntity, error) {
	err := os.MkdirAll(tempFolder, 0777)
	if err != nil {
		log.Errorf("failed to create temp folder: %v", err.Error())
		return nil, fmt.Errorf("failed to create temp folder: %v", err.Error())
	}

	resultReports := make([]view.SpectralDocumentValidationEntity, len(documents))
	for i, doc := range documents {
		fd, err := os.ReadFile(path.Join(os.TempDir(), doc))
		if err != nil {
			return nil, err
		}
		spectralReport, errStr, calculationTime := spectralExec(fd)
		documentValidation := view.SpectralDocumentValidationEntity{
			Filename:        doc,
			CalculationTime: calculationTime,
		}
		if errStr != "" {
			log.Errorf(errStr)
			documentValidation.Details = errStr
		} else {
			documentValidation.Summary = calculateSpectralSummary(spectralReport)
			documentValidation.Report = spectralReport
		}
		resultReports[i] = documentValidation
		log.Infof("spectral validation of file '%s' took %d ms", documentValidation.Filename, documentValidation.CalculationTime)
	}
	return &resultReports, nil
}

func calculateSpectralSummary(report []interface{}) view.SpectralResultSummary {
	summary := view.SpectralResultSummary{}
	for _, resultObj := range report {
		if result, ok := resultObj.(map[string]interface{}); ok {
			if severity, exists := result["severity"]; exists {
				if severityInt, ok := severity.(float64); ok {
					switch severityInt {
					case 0:
						summary.ErrorCount += 1
					case 1:
						summary.WarningCount += 1
					case 2:
						summary.InfoCount += 1
					case 3:
						summary.HintCount += 1
					}
				}
			}
		}
	}
	return summary
}

func spectralExec(validationData []byte) ([]interface{}, string, int64) {
	tempDocumentPath := fmt.Sprintf("%v/%v", tempFolder, uuid.NewString())
	tempDocumentValidationPath := fmt.Sprintf("%v-result", tempDocumentPath)
	document, err := os.Create(tempDocumentPath)
	if err != nil {
		log.Errorf("failed to create temp document file: %v", err.Error())
		return nil, err.Error(), 0
	}
	defer os.Remove(tempDocumentPath)
	defer os.Remove(tempDocumentValidationPath)
	_, err = document.Write(validationData)
	if err != nil {
		log.Errorf("failed to write temp document file: %v", err.Error())
		return nil, err.Error(), 0
	}
	document.Close()
	executablePath := "resources/spectral/windows/spectral.exe"
	args := []string{}
	args = append(args, "lint")
	args = append(args, tempDocumentPath)
	args = append(args, "--ruleset")
	args = append(args, "resources/spectral/rules/rules.yaml")
	args = append(args, "-q")
	args = append(args, "-f")
	args = append(args, "json")
	args = append(args, "-o.json")
	args = append(args, tempDocumentValidationPath)
	if runtime.GOOS != "windows" {
		executablePath = "resources/spectral/linux/spectral"
	}
	cmd := exec.Command(executablePath, args...)

	inBuffer := bytes.Buffer{}
	inBuffer.Write(validationData)
	cmd.Stdin = &inBuffer
	var out bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr

	start := time.Now()
	err = cmd.Run()
	calculationTime := time.Since(start)
	if err != nil {
		//spectral process exits with status 1 if validation contains at least one error..
		if err.Error() != "exit status 1" {
			return nil, fmt.Sprintf("failed to get Spectral report: %v", err.Error()), calculationTime.Milliseconds()
		}
	}
	result, resErr := os.ReadFile(tempDocumentValidationPath)
	if resErr != nil {
		log.Errorf("failed to read document validation file: %v", resErr.Error())
		return nil, fmt.Sprintf("failed to read Spectral output file: %s", resErr.Error()), calculationTime.Milliseconds()
	}
	var report []interface{}
	err = json.Unmarshal(result, &report)
	if err != nil {
		return nil, fmt.Sprintf("failed to unmarshal Spectral report: %v", err.Error()), calculationTime.Milliseconds()
	}
	return report, "", calculationTime.Milliseconds()
}
