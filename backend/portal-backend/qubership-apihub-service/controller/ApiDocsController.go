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
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type ApiDocsController interface {
	GetSpecsUrls(w http.ResponseWriter, r *http.Request)
	GetSpec(w http.ResponseWriter, r *http.Request)
}

func NewApiDocsController(fsRoot string) ApiDocsController {
	return apiDocsControllerImpl{
		urls: []view.Url{
			{Url: "/v3/api-docs/APIHUB BE API contract", Name: "APIHUB BE API contract"},
			{Url: "/v3/api-docs/APIHUB registry public API", Name: "APIHUB registry public API"},
		},
		fsRoot: fsRoot + "/api",
	}
}

type apiDocsControllerImpl struct {
	urls   []view.Url
	fsRoot string
}

func (a apiDocsControllerImpl) GetSpecsUrls(w http.ResponseWriter, r *http.Request) {
	configUrl := view.ApiConfig{
		ConfigUrl: "/v3/api-docs/swagger-config",
		Urls:      a.urls,
	}
	RespondWithJson(w, http.StatusOK, configUrl)
}

func (a apiDocsControllerImpl) GetSpec(w http.ResponseWriter, r *http.Request) {
	var content []byte
	var err error
	switch path := r.URL.Path; path {
	case a.urls[0].Url:
		fullPath := a.fsRoot + "/APIHUB API.yaml"
		_, err = os.Stat(fullPath)
		if err != nil {
			break
		}
		content, err = ioutil.ReadFile(fullPath)
		if err != nil {
			break
		}
		a.respond(w, content)
	case a.urls[1].Url:
		fullPath := a.fsRoot + "/Public Registry API.yaml"
		_, err = os.Stat(fullPath)
		if err != nil {
			break
		}
		content, err = ioutil.ReadFile(fullPath)
		if err != nil {
			break
		}
		a.respond(w, content)
	default:
		err = errors.New(fmt.Sprintf("There is no API with '%s' title", strings.TrimPrefix(path, "/v3/api-docs/")))
	}

	if err != nil {
		RespondWithError(w, "Failed to read API spec", err)
		return
	}
}

func (a apiDocsControllerImpl) respond(w http.ResponseWriter, content []byte) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(content)
}
