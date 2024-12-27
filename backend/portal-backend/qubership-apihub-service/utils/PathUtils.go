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

package utils

import (
	"path"
	"strings"
)

// Returns normalised fileId
func NormalizeFileId(fileId string) string {
	// add prefix '/' since we are always operating from the root folder
	filePath, fileName := SplitFileId("/" + fileId)

	normalizedFileId := ConcatToFileId(filePath, fileName)
	return strings.TrimPrefix(normalizedFileId, "/")
}

// Returns normalised file Path
func NormalizeFilePath(filePath string) string {
	// add prefix '/' since we are always operating from the root folder
	filePath = path.Clean("/" + filePath)

	if filePath == "." || filePath == "/" {
		filePath = ""
	}
	return strings.TrimPrefix(filePath, "/")
}

// Splits fileId to normalized Path and Name
func SplitFileId(fileId string) (string, string) {
	filePath := path.Dir(fileId)
	var fileName string
	if strings.HasSuffix(fileId, "/") {
		fileName = ""
	} else {
		fileName = path.Base(fileId)
	}

	if filePath == "." || filePath == "/" {
		filePath = ""
	}

	return filePath, fileName
}

// Concatenates file Path and Name to fileId
func ConcatToFileId(filePath string, fileName string) string {
	if filePath == "" {
		return fileName
	} else if strings.HasSuffix(filePath, "/") {
		return filePath + fileName
	} else {
		return filePath + "/" + fileName
	}
}
