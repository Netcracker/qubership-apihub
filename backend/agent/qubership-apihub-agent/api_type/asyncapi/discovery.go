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

package asyncapi

import (
	"fmt"
	"regexp"
	"strconv"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub-agent/api_type/generic"
	"github.com/Netcracker/qubership-apihub-agent/exception"
	"github.com/Netcracker/qubership-apihub-agent/utils"
	"github.com/Netcracker/qubership-apihub-agent/view"
	log "github.com/sirupsen/logrus"
)

const DefaultAsyncAPISpecName = "AsyncAPI specification"

var asyncapi3Regexp = regexp.MustCompile(`^3\.0`)

func NewAsyncAPIDiscoveryRunner() generic.DiscoveryRunner {
	return &asyncAPIDiscoveryRunner{}
}

type asyncAPIDiscoveryRunner struct {
}

func (r asyncAPIDiscoveryRunner) DiscoverDocuments(baseUrl string, urls view.DocumentDiscoveryUrls, timeout time.Duration) ([]view.Document, []view.EndpointCallInfo, error) {
	refs := utils.MakeDocumentRefsFromUrls(urls.AsyncAPI, view.ATAsyncAPI, false, timeout)
	return r.GetDocumentsByRefs(baseUrl, refs, "")
}

func (r asyncAPIDiscoveryRunner) GetDocumentsByRefs(baseUrl string, refs []view.DocumentRef, configPath string) ([]view.Document, []view.EndpointCallInfo, error) {
	filteredRefs := r.FilterRefsForApiType(refs) // take only appropriate api type
	if len(filteredRefs) == 0 {
		return nil, nil, nil
	}

	result := make([]view.Document, len(filteredRefs))
	failedCalls := make([]view.EndpointCallInfo, len(filteredRefs))
	errors := make([]string, len(filteredRefs))

	wg := sync.WaitGroup{}
	wg.Add(len(filteredRefs))

	fileIds := sync.Map{}

	for it, ref := range filteredRefs {
		i := it
		currentSpecRef := ref
		currentSpecUrl := ref.Url

		utils.SafeAsync(func() {
			defer wg.Done()

			url := baseUrl + currentSpecUrl

			specVersion, specTitle, specFormat, failedCall := getAsyncAPISpecInfo(url, currentSpecUrl, ref.Timeout)
			if failedCall != nil {
				log.Debugf("Failed to read asyncapi spec from %s: %s", url, failedCall.ErrorSummary)
				failedCalls[i] = *failedCall
				if ref.Required {
					errors[i] = fmt.Sprintf("Failed to read required asyncapi spec from %s: %s", url, failedCall.ErrorSummary)
				}
				return
			}
			log.Debugf("Got valid asyncapi spec from: %v", url)

			var name string
			if currentSpecRef.Name != "" {
				name = currentSpecRef.Name
			} else if specTitle != "" {
				name = specTitle
			} else {
				name = DefaultAsyncAPISpecName
			}

			result[i] = view.Document{
				Name:       name,
				Format:     specFormat,
				FileId:     utils.GenerateFileId(&fileIds, name, specFormat),
				Type:       specVersion,
				XApiKind:   currentSpecRef.XApiKind,
				DocPath:    currentSpecUrl,
				ConfigPath: configPath,
			}
		})
	}

	wg.Wait()

	return utils.FilterResultDocuments(result), utils.FilterFailedEndpointCalls(failedCalls), utils.FilterResultErrors(errors)
}

func getAsyncAPISpecInfo(specUrl string, relativePath string, timeout time.Duration) (string, string, string, *view.EndpointCallInfo) {
	spec, specFormat, err := generic.GetGenericObjectFromUrl(specUrl, timeout)
	if err != nil {
		var statusCode int
		if customError, ok := err.(*exception.CustomError); ok {
			statusCode, _ = strconv.Atoi(customError.Params["code"].(string))
		}
		return "", "", "", &view.EndpointCallInfo{
			Path:         relativePath,
			StatusCode:   statusCode,
			ErrorSummary: fmt.Sprintf("failed to get AsyncAPI specification: %v", err.Error()),
		}
	}

	asyncapiVersion := spec.GetValueAsString("asyncapi")
	if asyncapiVersion == "" {
		return "", "", "", &view.EndpointCallInfo{
			Path:         relativePath,
			ErrorSummary: "not an AsyncAPI spec: missing 'asyncapi' field",
		}
	}

	infoObject := spec.GetObject("info")
	title := infoObject.GetValueAsString("title")
	version := infoObject.GetValueAsString("version")
	specTitle := title
	if version != "" {
		specTitle = title + " " + version
	}

	if asyncapi3Regexp.MatchString(asyncapiVersion) {
		return view.AsyncAPI30Type, specTitle, specFormat, nil
	}

	return "", "", "", &view.EndpointCallInfo{
		Path:         relativePath,
		ErrorSummary: fmt.Sprintf("unsupported AsyncAPI version: %s (expected 3.0.x)", asyncapiVersion),
	}
}

func (r asyncAPIDiscoveryRunner) FilterRefsForApiType(refs []view.DocumentRef) []view.DocumentRef {
	return utils.FilterRefsForApiType(refs, view.ATAsyncAPI)
}

func (r asyncAPIDiscoveryRunner) GetName() string {
	return "asyncapi"
}
