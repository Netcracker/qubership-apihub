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
	"crypto/tls"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
)

func NewPlaygroundProxyController(systemInfoService service.SystemInfoService) ProxyController {
	return &playgroundProxyControllerImpl{
		tr:                http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}},
		systemInfoService: systemInfoService}
}

type playgroundProxyControllerImpl struct {
	tr                http.Transport
	systemInfoService service.SystemInfoService
}

const CustomProxyUrlHeader = "X-Apihub-Proxy-Url"

func (p *playgroundProxyControllerImpl) Proxy(w http.ResponseWriter, r *http.Request) {
	proxyUrlStr := r.Header.Get(CustomProxyUrlHeader)
	if proxyUrlStr == "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.RequiredParamsMissing,
			Message: exception.RequiredParamsMissingMsg,
			Params:  map[string]interface{}{"params": CustomProxyUrlHeader},
		})
		return
	}
	r.Header.Del(CustomProxyUrlHeader)
	proxyURL, err := url.Parse(proxyUrlStr)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURL,
			Message: exception.InvalidURLMsg,
			Params:  map[string]interface{}{"url": proxyUrlStr},
			Debug:   err.Error(),
		})
		return
	}
	var validHost bool
	for _, host := range p.systemInfoService.GetAllowedHosts() {
		if strings.Contains(proxyURL.Host, host) {
			validHost = true
			break
		}
	}
	if !validHost {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.HostNotAllowed,
			Message: exception.HostNotAllowedMsg,
			Params:  map[string]interface{}{"host": proxyUrlStr},
		})
		return
	}
	r.URL = proxyURL
	r.Host = proxyURL.Host
	resp, err := p.tr.RoundTrip(r)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusFailedDependency,
			Code:    exception.ProxyFailed,
			Message: exception.ProxyFailedMsg,
			Params:  map[string]interface{}{"url": r.URL.String()},
			Debug:   err.Error(),
		})
		return
	}
	defer resp.Body.Close()
	if err := copyHeader(w.Header(), resp.Header); err != nil {
		RespondWithCustomError(w, err)
		return
	}
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}
