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
	"strconv"
	"strings"
	"sync"
)

func ToId(part string) string {
	return strings.ToUpper(strings.Replace(part, " ", "-", -1)) // TODO: any other conversions?
}

func MakeAgentId(cloud, agentNamespace string) string {
	return strings.ToLower(cloud) + "_" + strings.ToLower(agentNamespace)
}

func GenerateFileId(fileIds *sync.Map, docName string, extension string) string {
	if extension != "" {
		extension = "." + extension
	}
	_, exists := fileIds.LoadOrStore(docName+extension, true)
	if exists {
		for i := 1; ; i++ {
			_, exists := fileIds.LoadOrStore(docName+strconv.Itoa(i)+extension, true)
			if !exists {
				return docName + strconv.Itoa(i) + extension
			}
		}
	}
	return docName + extension
}
