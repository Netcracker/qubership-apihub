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
	"github.com/gorilla/mux"
	"net/http"
	"net/url"
	"strconv"

	"github.com/Netcracker/qubership-api-linter-service/exception"
	log "github.com/sirupsen/logrus"
)

func RespondWithCustomError(w http.ResponseWriter, err *exception.CustomError) {
	log.Debugf("Request failed. Code = %d. Message = %s. Params: %v. Debug: %s", err.Status, err.Message, err.Params, err.Debug)
	respondWithJson(w, err.Status, err)
}

func respondWithError(w http.ResponseWriter, msg string, err error) {
	log.Errorf("%s: %s", msg, err.Error())
	if customError, ok := err.(*exception.CustomError); ok {
		RespondWithCustomError(w, customError)
	} else {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Message: msg,
			Debug:   err.Error()})
	}
}

func respondWithJson(w http.ResponseWriter, code int, payload interface{}) {
	response, _ := json.Marshal(payload)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}

func getStringParam(r *http.Request, p string) string {
	params := mux.Vars(r)
	return params[p]
}

func getUnescapedStringParam(r *http.Request, p string) (string, error) {
	params := mux.Vars(r)
	return url.QueryUnescape(params[p])
}

func getLimitQueryParam(r *http.Request) (int, *exception.CustomError) {
	return getLimitQueryParamBase(r, 100, 100)
}

func getLimitQueryParamBase(r *http.Request, defaultLimit, maxLimit int) (int, *exception.CustomError) {
	if r.URL.Query().Get("limit") != "" {
		limit, err := strconv.Atoi(r.URL.Query().Get("limit"))
		if err != nil {
			return 0, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "limit", "type": "int"},
				Debug:   err.Error(),
			}
		}
		if limit < 1 || limit > maxLimit {
			return 0, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidParameterValue,
				Message: exception.InvalidLimitMsg,
				Params:  map[string]interface{}{"value": limit, "maxLimit": maxLimit},
			}
		}
		return limit, nil
	}
	return defaultLimit, nil
}
