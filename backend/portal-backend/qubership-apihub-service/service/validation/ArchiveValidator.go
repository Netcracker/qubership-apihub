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

package validation

import (
	"archive/zip"
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/archive"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
)

func ValidatePublishSources(srcArc *archive.SourcesArchive) error {
	var fileIds []string
	for _, configFile := range srcArc.BuildCfg.Files {
		fileIds = append(fileIds, configFile.FileId)
	}

	duplicates, missing, unknown := validateFiles(srcArc.FileHeaders, fileIds)
	if len(duplicates) != 0 {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.FileDuplicate,
			Message: exception.FileDuplicateMsg,
			Params:  map[string]interface{}{"fileIds": duplicates, "configName": "build config"},
		}
	}

	if len(missing) != 0 {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.FileMissing,
			Message: exception.FileMissingMsg,
			Params:  map[string]interface{}{"fileIds": missing, "location": "sources"},
		}
	}

	if len(unknown) != 0 {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.FileRedundant,
			Message: exception.FileRedundantMsg,
			Params:  map[string]interface{}{"files": unknown, "location": "sources"},
		}
	}

	return nil
}

func ValidatePublishBuildResult(buildArc *archive.BuildResultArchive) error {
	var documentsFileIds, operationsFileIds, comparisonsFileIds []string
	for _, configFile := range buildArc.PackageDocuments.Documents {
		documentsFileIds = append(documentsFileIds, configFile.Filename)
	}
	for _, configFile := range buildArc.PackageOperations.Operations {
		operationsFileIds = append(operationsFileIds, configFile.OperationId)
	}
	for _, configFile := range buildArc.PackageComparisons.Comparisons {
		if configFile.ComparisonFileId != "" {
			comparisonsFileIds = append(comparisonsFileIds, configFile.ComparisonFileId)
		}
	}

	var fullUnknownList []string
	for f := range buildArc.UncategorizedFileHeaders {
		fullUnknownList = append(fullUnknownList, f)
	}

	duplicates, missing, unknown := validateFiles(buildArc.DocumentsHeaders, documentsFileIds)
	if len(duplicates) != 0 {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.FileDuplicate,
			Message: exception.FileDuplicateMsg,
			Params:  map[string]interface{}{"fileIds": duplicates, "configName": archive.DocumentsFilePath + " config"},
		}
	}

	if len(missing) != 0 {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.FileMissing,
			Message: exception.FileMissingMsg,
			Params:  map[string]interface{}{"fileIds": missing, "location": archive.DocumentsRootFolder + " folder in achive"},
		}
	}

	for _, u := range unknown {
		fullUnknownList = append(fullUnknownList, archive.DocumentsRootFolder+u)
	}

	duplicates, missing, unknown = validateFiles(buildArc.OperationFileHeaders, operationsFileIds)
	if len(duplicates) != 0 {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.FileDuplicate,
			Message: exception.FileDuplicateMsg,
			Params:  map[string]interface{}{"fileIds": duplicates, "configName": archive.OperationsFilePath + " config"},
		}
	}

	if len(missing) != 0 {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.FileMissing,
			Message: exception.FileMissingMsg,
			Params:  map[string]interface{}{"fileIds": missing, "location": archive.OperationFilesRootFolder + " folder in achive"},
		}
	}

	for _, u := range unknown {
		fullUnknownList = append(fullUnknownList, archive.OperationFilesRootFolder+u)
	}

	duplicates, missing, unknown = validateFiles(buildArc.ComparisonsFileHeaders, comparisonsFileIds)
	if len(duplicates) != 0 {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.FileDuplicate,
			Message: exception.FileDuplicateMsg,
			Params:  map[string]interface{}{"fileIds": duplicates, "configName": archive.ComparisonsFilePath + " config"},
		}
	}

	if len(missing) != 0 {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.FileMissing,
			Message: exception.FileMissingMsg,
			Params:  map[string]interface{}{"fileIds": missing, "location": archive.ComparisonsRootFolder + " folder in achive"},
		}
	}

	for _, u := range unknown {
		fullUnknownList = append(fullUnknownList, archive.ComparisonsRootFolder+u)
	}

	if len(fullUnknownList) != 0 {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.FileRedundant,
			Message: exception.FileRedundantMsg,
			Params:  map[string]interface{}{"files": fullUnknownList, "location": "build result archive"},
		}
	}
	return nil
}

func validateFiles(zipFileHeaders map[string]*zip.File, configFileIds []string) ([]string, []string, []string) {
	duplicates, configFileIdsMap := getDuplicateFiles(configFileIds)
	if len(duplicates) != 0 {
		return duplicates, nil, nil
	}
	missing := getMissingFiles(zipFileHeaders, configFileIdsMap)
	if len(missing) != 0 {
		return nil, missing, nil
	}
	unknown := getUnknownFiles(zipFileHeaders, configFileIdsMap)
	if len(unknown) != 0 {
		return nil, nil, unknown
	}
	return nil, nil, nil
}

func getDuplicateFiles(configFileIds []string) ([]string, map[string]struct{}) {
	configFileIdsMap := map[string]struct{}{}
	duplicatesMap := map[string]struct{}{}
	for _, file := range configFileIds {
		if _, exists := configFileIdsMap[file]; exists {
			duplicatesMap[file] = struct{}{}
		} else {
			configFileIdsMap[file] = struct{}{}
		}
	}
	duplicates := make([]string, 0, len(duplicatesMap))
	for f := range duplicatesMap {
		duplicates = append(duplicates, f)
	}
	return duplicates, configFileIdsMap
}

func getMissingFiles(zipFileHeaders map[string]*zip.File, configFileIds map[string]struct{}) []string {
	missingMap := map[string]struct{}{}
	for file := range configFileIds {
		if _, exists := zipFileHeaders[file]; !exists {
			missingMap[file] = struct{}{}
		}
	}
	missing := make([]string, 0, len(missingMap))
	for f := range missingMap {
		missing = append(missing, f)
	}
	return missing
}

func getUnknownFiles(zipFileHeaders map[string]*zip.File, configFileIds map[string]struct{}) []string {
	unknownMap := map[string]struct{}{}
	for filePath := range zipFileHeaders {
		if _, exists := configFileIds[filePath]; !exists {
			unknownMap[filePath] = struct{}{}
		}
	}
	unknown := make([]string, 0, len(unknownMap))
	for f := range unknownMap {
		unknown = append(unknown, f)
	}
	return unknown
}
