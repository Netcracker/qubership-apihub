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

func (v validationServiceImpl) runDocumentsVacuum(documents []string) (*[]view.DocumentValidationEntity, error) {
	err := os.MkdirAll(tempFolder, 0777)
	if err != nil {
		log.Errorf("failed to create temp folder: %v", err.Error())
	}
	resultReports := make([]view.DocumentValidationEntity, len(documents))
	for i, doc := range documents {
		fd, err := os.ReadFile(path.Join(os.TempDir(), doc))
		if err != nil {
			return nil, err
		}
		vacuumReport, errStr, calculationTime := vacuumExec(&view.ValidationData{Data: fd}, false)
		documentValidation := view.DocumentValidationEntity{
			Filename:        doc,
			CalculationTime: calculationTime,
		}
		if errStr != "" {
			log.Errorf(errStr)
			documentValidation.Details = errStr
		} else {
			documentValidation.Summary = vacuumReport.Statistics
			documentValidation.Report = vacuumReport.ResultSet.Results
		}
		resultReports[i] = documentValidation
		log.Infof("vacuum validation of file '%s' took %d ms", documentValidation.Filename, documentValidation.CalculationTime)
	}
	return &resultReports, nil
}

func vacuumExec(validationData *view.ValidationData, singleOperation bool) (*view.VacuumReport, string, int64) {
	id := uuid.NewString()
	tempDocumentPath := fmt.Sprintf("%v/%v", tempFolder, id)
	document, err := os.Create(tempDocumentPath)
	if err != nil {
		log.Errorf("failed to create temp document file: %v", err.Error())
		return nil, err.Error(), 0
	}
	defer os.Remove(tempDocumentPath)
	_, err = document.Write(validationData.Data)
	if err != nil {
		log.Errorf("failed to write temp document file: %v", err.Error())
		return nil, err.Error(), 0
	}
	document.Close()
	executablePath := "resources/vacuum/windows/vacuum.exe"
	args := []string{}
	args = append(args, "report")
	args = append(args, "-n") //minified json (m2m)
	args = append(args, "-q") //disable output styling
	args = append(args, "-o") //write to stdout instead of file
	args = append(args, "-i") //read from stdin instead of file
	if singleOperation {
		args = append(args, "-k") //skip checking for a valid OpenAPI document
	}
	args = append(args, "-r") //use custom ruleset
	args = append(args, "resources/vacuum/rules/rules.yaml")
	if runtime.GOOS != "windows" {
		executablePath = "resources/vacuum/linux/vacuum"
	}
	cmd := exec.Command(executablePath, args...)
	inBuffer := bytes.Buffer{}
	inBuffer.Write(validationData.Data)
	cmd.Stdin = &inBuffer
	var out bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr

	start := time.Now()
	err = cmd.Run()
	calculationTime := time.Since(start)
	if err != nil {
		return nil, fmt.Sprintf("failed to get vacuum report: %v: %v", err.Error(), stderr.String()), calculationTime.Milliseconds()
	}

	var vacuumReport view.VacuumReport
	err = json.Unmarshal(out.Bytes(), &vacuumReport)
	if err != nil {
		return nil, fmt.Sprintf("failed to unmarshal vacuum report: %v", err.Error()), calculationTime.Milliseconds()
	}
	return &vacuumReport, "", calculationTime.Milliseconds()
}
