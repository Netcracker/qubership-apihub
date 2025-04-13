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

package controller

import (
	"io/ioutil"
	"net/http"
	"os"
)

type ApiDocsController interface {
	GetSpec(w http.ResponseWriter, r *http.Request)
}

func NewApiDocsController(fsRoot string) ApiDocsController {
	return apiDocsControllerImpl{
		fsRoot: fsRoot + "/api",
	}
}

type apiDocsControllerImpl struct {
	fsRoot string
}

func (a apiDocsControllerImpl) GetSpec(w http.ResponseWriter, r *http.Request) {
	fullPath := a.fsRoot + "/Agent API.yaml"
	_, err := os.Stat(fullPath)
	if err != nil {
		respondWithError(w, "Failed to read API spec", err)
		return
	}
	content, err := ioutil.ReadFile(fullPath)
	if err != nil {
		respondWithError(w, "Failed to read API spec", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(content)
}
