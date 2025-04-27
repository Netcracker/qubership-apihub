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
	"github.com/Netcracker/qubership-apihub-test-service/exception"
	"net/http"
	"os"
)

type OpenapiController interface {
	GetOpenapiSpec(w http.ResponseWriter, r *http.Request)
	GetOpenapiYamlSpec(w http.ResponseWriter, r *http.Request)
	GetMdFile(w http.ResponseWriter, r *http.Request)
	GetJsonSample(w http.ResponseWriter, r *http.Request)
}

func NewOpenapiController(basePath string) OpenapiController {
	return &openapiControllerImpl{basePath: basePath}
}

type openapiControllerImpl struct {
	basePath string
}

func (o openapiControllerImpl) GetOpenapiSpec(w http.ResponseWriter, r *http.Request) {
	bytes, err := os.ReadFile(o.basePath + "/static/openapi.json")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.FailedToReadSpecFile,
			Message: exception.FailedToReadSpecFileMsg,
			Debug:   err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(bytes)
}

func (o openapiControllerImpl) GetOpenapiYamlSpec(w http.ResponseWriter, r *http.Request) {
	bytes, err := os.ReadFile(o.basePath + "/static/openapi.yaml")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.FailedToReadSpecFile,
			Message: exception.FailedToReadSpecFileMsg,
			Debug:   err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/x-yaml")
	w.Write(bytes)
}
func (o openapiControllerImpl) GetMdFile(w http.ResponseWriter, r *http.Request) {
	bytes, err := os.ReadFile(o.basePath + "/static/markdown-sample.md")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.FailedToReadSpecFile,
			Message: exception.FailedToReadSpecFileMsg,
			Debug:   err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "text/markdown")
	w.Write(bytes)
}
func (o openapiControllerImpl) GetJsonSample(w http.ResponseWriter, r *http.Request) {
	bytes, err := os.ReadFile(o.basePath + "/static/sample_json.json")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.FailedToReadSpecFile,
			Message: exception.FailedToReadSpecFileMsg,
			Debug:   err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(bytes)
}
