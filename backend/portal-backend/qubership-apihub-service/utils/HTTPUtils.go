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
	"encoding/json"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	log "github.com/sirupsen/logrus"
	"net/http"
	"net/url"
	"strings"
	"time"
)

func DeleteCookie(w http.ResponseWriter, name string, path string, productionMode bool) {
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    "",
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Secure:   productionMode,
		Path:     path,
	})
}

func IsHostValid(url *url.URL, allowedHosts []string) *exception.CustomError {
	host := url.Hostname()
	if host == "" {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.HostNotAllowed,
			Message: exception.HostNotAllowedMsg,
			Params:  map[string]interface{}{"host": "empty host"},
		}
	}
	host = strings.ToLower(host)
	var validHost bool
	for _, allowedHost := range allowedHosts {
		if allowedHost == host {
			validHost = true
			break
		}
		if strings.HasSuffix(host, "."+allowedHost) {
			validHost = true
			break
		}

	}
	if !validHost {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.HostNotAllowed,
			Message: exception.HostNotAllowedMsg,
			Params:  map[string]interface{}{"host": host},
		}
	}
	return nil
}

func RedirectHandler(apihubURLStr string) http.HandlerFunc {
	apihubURL, _ := url.Parse(apihubURLStr)
	return func(w http.ResponseWriter, r *http.Request) {
		redirectURI := r.URL.Query().Get("redirectUri")
		if redirectURI == "" {
			redirectURI = "/"
		}
		log.Debugf("redirect url - %s", redirectURI)
		redirectUrl, err := url.Parse(redirectURI)
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectRedirectUrlError,
				Message: exception.IncorrectRedirectUrlErrorMsg,
				Params:  map[string]interface{}{"url": redirectUrl, "error": err.Error()},
			})
			return
		}

		if redirectUrl.Hostname() != apihubURL.Hostname() {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.HostNotAllowed,
				Message: exception.HostNotAllowedMsg,
				Params:  map[string]interface{}{"host": redirectUrl.Hostname()},
			})
			return
		}

		http.Redirect(w, r, redirectURI, http.StatusFound)
	}
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
