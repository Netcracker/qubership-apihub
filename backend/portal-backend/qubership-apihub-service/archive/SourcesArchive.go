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

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type SourcesArchive struct {
	ZipReader *zip.Reader
	BuildCfg  *view.BuildConfig

	FileHeaders map[string]*zip.File
}

func NewSourcesArchive(zipReader *zip.Reader, buildCfg *view.BuildConfig) *SourcesArchive {
	result := &SourcesArchive{
		ZipReader:   zipReader,
		BuildCfg:    buildCfg,
		FileHeaders: map[string]*zip.File{},
	}
	result.splitFiles()
	return result
}

func (a *SourcesArchive) splitFiles() {
	for _, zipFile := range a.ZipReader.File {
		if zipFile.FileInfo().IsDir() {
			continue
		}
		filepath := zipFile.Name
		a.FileHeaders[filepath] = zipFile
	}
}
