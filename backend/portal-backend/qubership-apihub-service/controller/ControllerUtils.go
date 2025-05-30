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
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/gorilla/mux"
	log "github.com/sirupsen/logrus"
)

const (
	maxParamItems = 1000
	maxParamLen   = 8192
)

func getStringParam(r *http.Request, p string) string {
	params := mux.Vars(r)
	return params[p]
}

func getUnescapedStringParam(r *http.Request, p string) (string, error) {
	params := mux.Vars(r)
	return url.QueryUnescape(params[p])
}

func getParamsFromBody(r *http.Request) (map[string]interface{}, error) {
	var params map[string]interface{}
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(body, &params); err != nil {
		return nil, err
	}
	return params, nil
}

func getBodyObjectParam(params map[string]interface{}, p string) (map[string]interface{}, error) {
	if params[p] == nil {
		return nil, fmt.Errorf("parameter %v is missing", p)
	}
	if param, ok := params[p].(map[string]interface{}); ok {
		return param, nil
	}
	return nil, fmt.Errorf("parameter %v has incorrect type", p)
}

func getBodyStringParam(params map[string]interface{}, p string) (string, error) {
	if params[p] == nil {
		return "", nil
	}
	if param, ok := params[p].(string); ok {
		return param, nil
	}
	return "", fmt.Errorf("parameter %v is not a string", p)
}

func getBodyBoolParam(params map[string]interface{}, p string) (*bool, error) {
	if params[p] == nil {
		return nil, nil
	}
	if param, ok := params[p].(bool); ok {
		return &param, nil
	}
	return nil, fmt.Errorf("parameter %v is not boolean", p)
}

func getBodyStrArrayParam(params map[string]interface{}, p string) ([]string, error) {
	if params[p] == nil {
		return nil, fmt.Errorf("parameter %v is missing", p)
	}
	if param, ok := params[p].([]interface{}); ok {
		arr := make([]string, 0)
		for _, el := range param {
			if elStr, ok := el.(string); ok {
				arr = append(arr, elStr)
			}
		}
		return arr, nil
	}
	return nil, fmt.Errorf("parameter %v has incorrect type", p)
}

func RespondWithError(w http.ResponseWriter, msg string, err error) {
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

func RespondWithCustomError(w http.ResponseWriter, err *exception.CustomError) {
	log.Debugf("Request failed. Code = %d. Message = %s. Params: %v. Debug: %s", err.Status, err.Message, err.Params, err.Debug)
	RespondWithJson(w, err.Status, err)
}

func RespondWithJson(w http.ResponseWriter, code int, payload interface{}) {
	response, _ := json.Marshal(payload)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}

func IsAcceptableAlias(alias string) bool {
	return alias == url.QueryEscape(alias) && !strings.Contains(alias, ".")
}

func getListFromParam(r *http.Request, param string) ([]string, *exception.CustomError) {
	paramStr := r.URL.Query().Get(param)
	if paramStr == "" {
		return []string{}, nil
	}
	listStr, err := url.QueryUnescape(paramStr)
	if err != nil {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": param},
			Debug:   err.Error(),
		}
	}
	//validations were added based on security scan results to avoid resource exhaustion
	if len(paramStr) > maxParamLen {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueLengthMsg,
			Params:  map[string]interface{}{"param": param, "value": paramStr, "maxLen": maxParamLen},
		}
	}
	commaCount := strings.Count(listStr, ",")
	if commaCount+1 > maxParamItems {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidItemsNumberMsg,
			Params:  map[string]interface{}{"param": param, "maxItems": maxParamItems},
		}
	}

	return strings.Split(listStr, ","), nil
}

func getLimitQueryParam(r *http.Request) (int, *exception.CustomError) {
	return getLimitQueryParamBase(r, 100, 100)
}

func getLimitQueryParamWithIncreasedMax(r *http.Request) (int, *exception.CustomError) {
	return getLimitQueryParamBase(r, 100, 500)
}

func getLimitQueryParamWithExtendedMax(r *http.Request) (int, *exception.CustomError) {
	return getLimitQueryParamBase(r, 100, 1000)
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

// TODO: duplicate in v2
func handlePkgRedirectOrRespondWithError(w http.ResponseWriter, r *http.Request, ptHandler service.PackageTransitionHandler, packageId, msg string, err error) {
	if customError, ok := err.(*exception.CustomError); ok {
		if strings.Contains(r.URL.Path, packageId) &&
			(customError.Code == exception.PackageNotFound ||
				customError.Code == exception.PublishedPackageVersionNotFound ||
				customError.Code == exception.PublishedVersionNotFound) {
			newPkg, err := ptHandler.HandleMissingPackageId(packageId)
			if err != nil {
				RespondWithError(w, "Package not found, failed to check package move", err)
				return
			}
			if newPkg != "" {
				path := strings.Replace(r.URL.Path, packageId, newPkg, -1)
				if r.URL.RawQuery != "" {
					path += "?" + r.URL.RawQuery
				}
				w.Header().Add("Location", path)
				w.WriteHeader(301)
				return
			}
		}
	}
	RespondWithError(w, msg, err)
}

func getTemplatePath(r *http.Request) string {
	route := mux.CurrentRoute(r)
	if route == nil {
		return ""
	}
	templatePath, _ := route.GetPathTemplate()
	return templatePath
}
