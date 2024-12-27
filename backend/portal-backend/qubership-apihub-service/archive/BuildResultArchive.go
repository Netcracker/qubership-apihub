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

package archive

import (
	"archive/zip"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

const (
	InfoFilePath                 = "info.json"
	DocumentsFilePath            = "documents.json"
	ComparisonsFilePath          = "comparisons.json"
	OperationsFilePath           = "operations.json"
	BuilderNotificationsFilePath = "notifications.json"
	ChangelogFilePath            = "changelog.json"

	DocumentsRootFolder      = "documents/"
	ComparisonsRootFolder    = "comparisons/"
	OperationFilesRootFolder = "operations/"
)

type BuildResultArchive struct {
	ZipReader *zip.Reader

	InfoFile                 *zip.File
	DocumentsFile            *zip.File
	ComparisonsFile          *zip.File
	OperationsFile           *zip.File
	BuilderNotificationsFile *zip.File
	ChangelogFile            *zip.File

	DocumentsHeaders         map[string]*zip.File
	OperationFileHeaders     map[string]*zip.File
	ComparisonsFileHeaders   map[string]*zip.File
	UncategorizedFileHeaders map[string]*zip.File

	PackageInfo          view.PackageInfoFile
	PackageDocuments     view.PackageDocumentsFile
	PackageOperations    view.PackageOperationsFile
	PackageComparisons   view.PackageComparisonsFile
	BuilderNotifications view.BuilderNotificationsFile
}

func NewBuildResultArchive(zipReader *zip.Reader) *BuildResultArchive {
	result := &BuildResultArchive{
		ZipReader:                zipReader,
		DocumentsHeaders:         map[string]*zip.File{},
		OperationFileHeaders:     map[string]*zip.File{},
		ComparisonsFileHeaders:   map[string]*zip.File{},
		UncategorizedFileHeaders: map[string]*zip.File{},
	}
	result.splitFiles()
	return result
}

func (a *BuildResultArchive) ReadPackageInfo() error {
	return a.readFile(InfoFilePath, a.InfoFile, &a.PackageInfo, true)
}

func (a *BuildResultArchive) ReadPackageDocuments(required bool) error {
	return a.readFile(DocumentsFilePath, a.DocumentsFile, &a.PackageDocuments, required)
}

func (a *BuildResultArchive) ReadPackageOperations(required bool) error {
	return a.readFile(OperationsFilePath, a.OperationsFile, &a.PackageOperations, required)
}

func (a *BuildResultArchive) ReadPackageComparisons(required bool) error {
	return a.readFile(ComparisonsFilePath, a.ComparisonsFile, &a.PackageComparisons, required)
}

func (a *BuildResultArchive) ReadBuilderNotifications(required bool) error {
	return a.readFile(BuilderNotificationsFilePath, a.BuilderNotificationsFile, &a.BuilderNotifications, required)
}

func (a *BuildResultArchive) readFile(filePath string, file *zip.File, v interface{}, required bool) error {
	if file == nil {
		if required {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.FileMissingFromSources,
				Message: exception.FileMissingFromSourcesMsg,
				Params:  map[string]interface{}{"fileId": filePath},
			}
		}
		return nil
	}
	unzippedFileBytes, err := ReadZipFile(file)
	if err != nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackageArchivedFile,
			Message: exception.InvalidPackageArchivedFileMsg,
			Params:  map[string]interface{}{"file": filePath, "error": err.Error()},
		}
	}
	err = json.Unmarshal(unzippedFileBytes, v)
	if err != nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackageArchivedFile,
			Message: exception.InvalidPackageArchivedFileMsg,
			Params:  map[string]interface{}{"file": filePath, "error": "failed to unmarshal"},
			Debug:   err.Error(),
		}
	}
	return nil
}

func (a *BuildResultArchive) splitFiles() {
	for _, zipFile := range a.ZipReader.File {
		if zipFile.FileInfo().IsDir() {
			continue
		}
		filepath := zipFile.Name
		switch filepath {
		case InfoFilePath:
			a.InfoFile = zipFile
		case DocumentsFilePath:
			a.DocumentsFile = zipFile
		case OperationsFilePath:
			a.OperationsFile = zipFile
		case ComparisonsFilePath:
			a.ComparisonsFile = zipFile
		case BuilderNotificationsFilePath:
			a.BuilderNotificationsFile = zipFile
		case ChangelogFilePath:
			a.ChangelogFile = zipFile
		default:
			{
				if strings.HasPrefix(filepath, DocumentsRootFolder) {
					zipFilePtr := zipFile
					a.DocumentsHeaders[strings.TrimPrefix(filepath, DocumentsRootFolder)] = zipFilePtr
					continue
				} else if strings.HasPrefix(filepath, OperationFilesRootFolder) {
					zipFilePtr := zipFile
					a.OperationFileHeaders[strings.TrimPrefix(filepath, OperationFilesRootFolder)] = zipFilePtr
					continue
				} else if strings.HasPrefix(filepath, ComparisonsRootFolder) {
					zipFilePtr := zipFile
					a.ComparisonsFileHeaders[strings.TrimPrefix(filepath, ComparisonsRootFolder)] = zipFilePtr
					continue
				} else {
					a.UncategorizedFileHeaders[filepath] = zipFile
				}
			}
		}
	}
}

func getMediaType(data []byte) string {
	return http.DetectContentType(data)
}
