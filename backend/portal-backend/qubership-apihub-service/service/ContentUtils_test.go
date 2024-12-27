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
	"strings"
	"testing"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/stretchr/testify/assert"
)

func TestSplit(t *testing.T) {
	var fileIds []string
	fileIds = append(fileIds, "fileName.json")
	fileIds = append(fileIds, "/fileName.json")
	fileIds = append(fileIds, "./fileName.json")
	fileIds = append(fileIds, "/./fileName.json")
	fileIds = append(fileIds, "dir/fileName.json")
	fileIds = append(fileIds, "dir/./fileName.json")
	fileIds = append(fileIds, ".dir/./fileName.json")
	fileIds = append(fileIds, "dir/../fileName.json")
	fileIds = append(fileIds, "./dir/../fileName.json")

	for _, fileId := range fileIds {
		path, name := utils.SplitFileId(fileId)
		if path == "." {
			t.Error("File Path after split can't equal to '.'")
		}
		if strings.HasPrefix(path, "/") {
			t.Error("File Path after split can't start from '/'")
		}

		if strings.Contains(name, "/") {
			t.Error("File Name after split can't contain '/'")
		}

		if strings.HasPrefix(path, "../") || strings.Contains(path, "/../") || strings.HasSuffix(path, "/..") {
			t.Error("File Path after split can't contain '..' directories")
		}

		if strings.Contains(path, "//") {
			t.Error("File Path after split can't contain '//'")
		}
	}
}

func TestConcat(t *testing.T) {
	var fileInfo [][2]string
	fileInfo = append(fileInfo, [2]string{"filePath", "fileName.json"})
	fileInfo = append(fileInfo, [2]string{"", "filePath/fileName.json"})

	for _, fileInfo := range fileInfo {
		fileId := utils.ConcatToFileId(fileInfo[0], fileInfo[1])
		if fileId != "filePath/fileName.json" {
			t.Errorf("Slug after concat should contain '/' between path and name: '%s' and '%s'", fileInfo[0], fileInfo[1])
		}
	}

	fileId := utils.ConcatToFileId(".", "fileName.json")
	if fileId != "./fileName.json" {
		t.Errorf("Slug after concat should contain equal to ./fileName.json")
	}

	fileInfo = append([][2]string{}, [2]string{"./", "fileName.json"})
	fileInfo = append(fileInfo, [2]string{"/", "fileName.json"})

	for _, fileInfo := range fileInfo {
		fileId := utils.ConcatToFileId(fileInfo[0], fileInfo[1])
		if fileId != fileInfo[0]+fileInfo[1] {
			t.Errorf("Slug after concat should contain '/' between path and name: '%s' and '%s'", fileInfo[0], fileInfo[1])
		}
	}
}

func TestNormalizationOfFileId(t *testing.T) {
	var fileIds []string

	initFileName := "fileName.json"
	initFilePath := "dir"

	fileIds = append(fileIds, initFileName)
	fileIds = append(fileIds, "/"+initFileName)
	fileIds = append(fileIds, "./"+initFileName)

	for _, fileId := range fileIds {
		normFileId := utils.NormalizeFileId(fileId)
		if normFileId != initFileName {
			t.Errorf("Slug normalization works incorrect with empty Path: '%s'", fileId)
		}
	}

	fileIds = append([]string{}, "../"+initFileName)
	fileIds = append(fileIds, "/../"+initFileName)
	fileIds = append(fileIds, "./../"+initFileName)
	fileIds = append(fileIds, "/../../../"+initFileName)
	fileIds = append(fileIds, "/1/../2/../"+initFileName)
	fileIds = append(fileIds, "./1/../2/../"+initFileName)
	fileIds = append(fileIds, "../1/../2/../"+initFileName)

	for _, fileId := range fileIds {
		normFileId := utils.NormalizeFileId(fileId)
		if normFileId != initFileName {
			t.Errorf("Slug normalization works incorrect with '..' directories: '%s'", fileId)
		}
	}

	fileIds = append([]string{}, "../1/../"+initFilePath+"/"+initFileName)

	for _, fileId := range fileIds {
		normFileId := utils.NormalizeFileId(fileId)
		if normFileId != initFilePath+"/"+initFileName {
			t.Errorf("Slug normalization works incorrect with '..' directories: '%s'", fileId)
		}
	}

	fileIds = append([]string{}, initFilePath+"/fileName.json")
	fileIds = append(fileIds, "./././"+initFilePath+"/fileName.json")
	fileIds = append(fileIds, "/"+initFilePath+"/./././fileName.json")

	for _, fileId := range fileIds {
		normFileId := utils.NormalizeFileId(fileId)
		if normFileId != initFilePath+"/"+initFileName {
			t.Errorf("Slug normalization works incorrect with Path prefix: '%s'", fileId)
		}
	}
}
func TestNormalizationOfFilePath(t *testing.T) {
	var paths []string

	initFilePath := "dir"

	paths = append(paths, "")
	paths = append(paths, "/")
	paths = append(paths, "./")

	for _, path := range paths {
		normFileId := utils.NormalizeFilePath(path)
		if normFileId != "" {
			t.Errorf("File path normalization works incorrect with empty Path: '%s'", path)
		}
	}

	paths = append([]string{}, "../")
	paths = append(paths, "/../")
	paths = append(paths, "./../")
	paths = append(paths, "/../../../")
	paths = append(paths, "/1/../2/../")
	paths = append(paths, "./1/../2/../")
	paths = append(paths, "../1/../2/../")

	for _, path := range paths {
		normFileId := utils.NormalizeFilePath(path)
		if normFileId != "" {
			t.Errorf("File path normalization works incorrect with '..' directories: '%s'", path)
		}
	}

	paths = append([]string{}, "/"+initFilePath+"/")
	paths = append([]string{}, "./"+initFilePath+"/")
	paths = append([]string{}, ""+initFilePath+"/")

	for _, path := range paths {
		normFileId := utils.NormalizeFilePath(path)
		if normFileId != initFilePath {
			t.Errorf("File path normalization works incorrect with '/' suffix: '%s'", path)
		}
	}

	paths = append([]string{}, "../1/../"+initFilePath)

	for _, path := range paths {
		normFileId := utils.NormalizeFilePath(path)
		if normFileId != initFilePath {
			t.Errorf("File path normalization works incorrect with '..' directories: '%s'", path)
		}
	}
}

func TestCheckAvailability(t *testing.T) {
	folders := make(map[string]bool)
	folders["2021.4/worklog/"] = true
	folders["2021.4/gsmtmf/"] = true
	folders["2020.4/acmbi/"] = true
	folders["2020.4/cmp/tmf621/"] = true
	folders["apihub-config/"] = true
	folders["newfolder/"] = true
	folders["other/"] = true
	folders["/"] = true

	files := make(map[string]bool)
	files["2021.4/worklog/worklog.md"] = true
	files["2021.4/gsmtmf/gsmtmf.md"] = true
	files["2020.4/acmbi/acmbi.md"] = true
	files["2020.4/cmp/tmf621/tmf.md"] = true
	files["apihub-config/config.md"] = true
	files["newfolder/new.md"] = true
	files["other/other.md"] = true
	files["README.md"] = true

	assert.Error(t, checkAvailability("README.md", files, folders))
	assert.Error(t, checkAvailability("README.md/qwerty.md", files, folders))
	assert.Error(t, checkAvailability("other/other.md/qwerty.md", files, folders)) //gitlab allows this but it deletes 'other.md' file
	assert.Error(t, checkAvailability("2021.4", files, folders))

	assert.NoError(t, checkAvailability("2021.4/qwerty.md", files, folders))
	assert.NoError(t, checkAvailability("2021.4/worklog/qwerty.md", files, folders))
	assert.NoError(t, checkAvailability("2021.5", files, folders))
	assert.NoError(t, checkAvailability("readme.md", files, folders))
	assert.NoError(t, checkAvailability("readme.md/qwerty.md", files, folders)) //gitlab allows this
}
