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
	"encoding/json"
	"io/ioutil"
	"net/http"
	"net/url"

	"github.com/Qubership/qubership-apihub-test-service/exception"
)

type TryitController interface {
	Get(w http.ResponseWriter, r *http.Request)
	Post(w http.ResponseWriter, r *http.Request)
}

func NewTryitController() TryitController {
	return &tryitControllerImpl{}
}

type tryitControllerImpl struct {
}

type tryitGetResponse struct {
	PathEscapedUnescaped  string `json:"pathEscapedUnescaped"`
	QueryEscapedUnescaped string `json:"queryEscapedUnescaped"`
	PathTextUnescaped     string `json:"pathTextUnescaped"`
	QueryTextUnescaped    string `json:"queryTextUnescaped,omitempty"`
}

func (t tryitControllerImpl) Get(w http.ResponseWriter, r *http.Request) {
	pathTextUnescaped, err := url.PathUnescape(getStringParam(r, "text"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPathURLEscape,
			Message: exception.InvalidPathURLEscapeMsg,
			Params:  map[string]interface{}{"param": "text"},
			Debug:   err.Error(),
		})
		return
	}
	pathEscaped := getStringParam(r, "escaped")
	pathEscapedUnescaped, err := url.PathUnescape(pathEscaped)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPathURLEscape,
			Message: exception.InvalidPathURLEscapeMsg,
			Params:  map[string]interface{}{"param": "escaped"},
			Debug:   err.Error(),
		})
		return
	}
	if pathEscaped == pathEscapedUnescaped {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.PathParameterWithoutEscapedCharacters,
			Message: exception.PathParameterWithoutEscapedCharactersMsg,
			Params:  map[string]interface{}{"param": "escaped"},
		})
		return
	}

	queryTextUnescaped, err := url.QueryUnescape(r.URL.Query().Get("text"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidQueryURLEscape,
			Message: exception.InvalidQueryURLEscapeMsg,
			Params:  map[string]interface{}{"param": "text"},
			Debug:   err.Error(),
		})
		return
	}

	queryEscapedUnescaped, err := url.QueryUnescape(r.URL.Query().Get("escaped"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidQueryURLEscape,
			Message: exception.InvalidQueryURLEscapeMsg,
			Params:  map[string]interface{}{"param": "escaped"},
			Debug:   err.Error(),
		})
		return
	}
	queryEscapedEscaped := url.QueryEscape(queryEscapedUnescaped)
	if queryEscapedEscaped == queryEscapedUnescaped {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.QueryParameterWithoutEscapedCharacters,
			Message: exception.QueryParameterWithoutEscapedCharactersMsg,
			Params:  map[string]interface{}{"param": "escaped"},
		})
		return
	}
	tryitGetResponse := tryitGetResponse{
		PathEscapedUnescaped:  pathEscapedUnescaped,
		QueryEscapedUnescaped: queryEscapedUnescaped,
		PathTextUnescaped:     pathTextUnescaped,
		QueryTextUnescaped:    queryTextUnescaped,
	}
	respondWithJson(w, http.StatusOK, tryitGetResponse)
}

type tryitPostRequest struct {
	Text string `json:"text"`
}

type tryitPostResponse struct {
	PathEscapedUnescaped string `json:"pathEscapedUnescaped"`
	PathTextUnescaped    string `json:"pathTextUnescaped"`
	BodyText             string `json:"bodyText"`
}

func (t tryitControllerImpl) Post(w http.ResponseWriter, r *http.Request) {
	pathTextUnescaped, err := url.PathUnescape(getStringParam(r, "text"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPathURLEscape,
			Message: exception.InvalidPathURLEscapeMsg,
			Params:  map[string]interface{}{"param": "text"},
			Debug:   err.Error(),
		})
		return
	}
	pathEscaped := getStringParam(r, "escaped")
	pathEscapedUnescaped, err := url.PathUnescape(pathEscaped)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPathURLEscape,
			Message: exception.InvalidPathURLEscapeMsg,
			Params:  map[string]interface{}{"param": "escaped"},
			Debug:   err.Error(),
		})
		return
	}
	if pathEscaped == pathEscapedUnescaped {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.PathParameterWithoutEscapedCharacters,
			Message: exception.PathParameterWithoutEscapedCharactersMsg,
			Params:  map[string]interface{}{"param": "escaped"},
		})
		return
	}

	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	var tryitPostRequest tryitPostRequest
	err = json.Unmarshal(body, &tryitPostRequest)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	if tryitPostRequest.Text == "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.EmptyBodyParam,
			Message: exception.EmptyBodyParamMsg,
			Params:  map[string]interface{}{"param": "text"},
		})
		return
	}
	tryitPostResponse := tryitPostResponse{
		PathEscapedUnescaped: pathEscapedUnescaped,
		PathTextUnescaped:    pathTextUnescaped,
		BodyText:             tryitPostRequest.Text,
	}
	respondWithJson(w, http.StatusOK, tryitPostResponse)
}
