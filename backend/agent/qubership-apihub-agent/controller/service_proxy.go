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
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"

	"github.com/Netcracker/qubership-apihub-agent/exception"
	"github.com/Netcracker/qubership-apihub-agent/service"
	"github.com/Netcracker/qubership-apihub-agent/utils"
	log "github.com/sirupsen/logrus"
)

func NewServiceProxyController(discoveryService service.DiscoveryService) ProxyController {
	return &serviceProxyControllerImpl{
		tr:               http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}},
		discoveryService: discoveryService,
	}
}

type serviceProxyControllerImpl struct {
	tr               http.Transport
	discoveryService service.DiscoveryService
}

const CustomJwtAuthHeader = "X-Apihub-Authorization"
const CustomApiKeyHeader = "X-Apihub-ApiKey"
const CustomProxyErrorHeader = "X-Apihub-Proxy-Error"

func (s *serviceProxyControllerImpl) Proxy(w http.ResponseWriter, r *http.Request) {
	namespace := getStringParam(r, "name")
	serviceId := getStringParam(r, "serviceId")
	customServerUrl, err := s.discoveryService.GetServiceUrl(namespace, serviceId)
	if err != nil {
		log.Errorf("Failed to proxy a request to namespace %v service %v: %v", namespace, serviceId, err.Error())
		w.Header().Add(CustomProxyErrorHeader, fmt.Sprintf("Failed to proxy a request to namespace %v service %v: %v", namespace, serviceId, err.Error()))
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: fmt.Sprintf("Failed to proxy a request to namespace %v service %v", namespace, serviceId),
				Debug:   err.Error()})
		}
		return
	}
	r.Header.Del(CustomJwtAuthHeader)
	r.Header.Del(CustomApiKeyHeader)

	fullTargetUrl := makeFullTargetUrl(customServerUrl, r.URL.EscapedPath())

	proxyURL, err := url.Parse(fullTargetUrl)
	if err != nil {
		w.Header().Add(CustomProxyErrorHeader, fmt.Sprintf("Failed to proxy a request to namespace %v service %v: %v", namespace, serviceId, err.Error()))
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURL,
			Message: exception.InvalidURLMsg,
			Params:  map[string]interface{}{"url": fullTargetUrl},
			Debug:   err.Error(),
		})
		return
	}
	r.URL.Host = proxyURL.Host
	r.URL.Scheme = proxyURL.Scheme
	r.URL.Path = proxyURL.Path
	r.URL.RawPath = proxyURL.RawPath
	r.Host = proxyURL.Host
	log.Debugf("Sending proxy request to %s", r.URL)
	resp, err := s.tr.RoundTrip(r)
	if err != nil {
		w.Header().Add(CustomProxyErrorHeader, fmt.Sprintf("Failed to proxy a request to namespace %v service %v: %v", namespace, serviceId, err.Error()))
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
	copyHeader(w.Header(), resp.Header)
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func makeFullTargetUrl(customServerUrl, path string) string {
	proxyRouteRegexp := regexp.MustCompile(utils.MakeCustomProxyPath(".*", ".*", ".*"))
	customServerPath := proxyRouteRegexp.ReplaceAllString(path, "") // delete ProxyPath prefix
	return customServerUrl + "/" + customServerPath
}
