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

package rest

import (
	"fmt"
	"regexp"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub-agent/api_type/generic"
	"github.com/Netcracker/qubership-apihub-agent/utils"
	"github.com/Netcracker/qubership-apihub-agent/view"
	log "github.com/sirupsen/logrus"
)

func NewRestDiscoveryRunner() generic.DiscoveryRunner {
	return &restDiscoveryRunner{}
}

type restDiscoveryRunner struct {
}

func (r restDiscoveryRunner) DiscoverDocuments(baseUrl string, urls view.DocumentDiscoveryUrls, timeout time.Duration) ([]view.Document, error) {
	// find swagger-config, etc..
	var refs []view.DocumentRef
	for _, url := range urls.SwaggerConfig {
		refs = getRefsFromSwaggerConfig(baseUrl, url, timeout)
		if len(refs) > 0 {
			// Swagger config found
			return r.GetDocumentsByRefs(baseUrl, refs)
		}
	}
	// Swagger config not found, generate refs list from openapi urls
	refs = utils.MakeDocumentRefsFromUrls(urls.Openapi, view.ATRest, false, timeout)
	return r.GetDocumentsByRefs(baseUrl, refs)
}

func (r restDiscoveryRunner) GetDocumentsByRefs(baseUrl string, refs []view.DocumentRef) ([]view.Document, error) {
	filteredRefs := r.FilterRefsForApiType(refs) // take only appropriate api type
	if len(filteredRefs) == 0 {
		return nil, nil
	}

	result := make([]view.Document, len(filteredRefs))
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

			spec := view.Document{
				Path: currentSpecUrl,
			}

			url := baseUrl + currentSpecUrl

			specVersion, specTitle, specFormat, err := getSpecVersionAndTitleFromDoc(url, ref.Timeout)
			if err != nil {
				log.Debugf("Failed to read openapi spec from %s: %s", url, err)
				return
			}
			log.Debugf("Got valid openapi spec from: %v", url)
			if currentSpecRef.Name != "" {
				spec.Name = currentSpecRef.Name
			} else if specTitle != "" {
				spec.Name = specTitle
			} else {
				spec.Name = DefaultOpenapiSpecName
			}
			spec.Format = specFormat
			spec.FileId = utils.GenerateFileId(&fileIds, spec.Name, specFormat)
			spec.Type = specVersion

			spec.XApiKind = currentSpecRef.XApiKind

			result[i] = spec
		})
	}

	wg.Wait()

	return utils.FilterResultDocuments(result), utils.FilterResultErrors(errors)
}

// TODO: move to type detection
var openapi3Regexp = regexp.MustCompile(`3.0+`)
var openapi31Regexp = regexp.MustCompile(`3.1+`)
var openapi2Regexp = regexp.MustCompile(`2.*`)

const DefaultOpenapiSpecName = "default"

func getRefsFromSwaggerConfig(baseUrl string, swaggerConfigUrl string, timeout time.Duration) []view.DocumentRef {
	swaggerSpecRefs := generic.GetRefsFromConfig(baseUrl, swaggerConfigUrl, timeout)
	for i := range swaggerSpecRefs {
		swaggerSpecRefs[i].ApiType = view.ATRest
		swaggerSpecRefs[i].Required = true
	}
	return swaggerSpecRefs
}

func getSpecVersionAndTitleFromDoc(specUrl string, timeout time.Duration) (string, string, string, error) {
	var spec view.JsonMap
	spec, specFormat, err := generic.GetGenericObjectFromUrl(specUrl, timeout)
	if err != nil {
		return "", "", "", fmt.Errorf("failed to get specification from '%v': %v", specUrl, err.Error())
	}
	if spec == nil {
		return "", "", "", fmt.Errorf("specification from '%v' is invalid", specUrl)
	}
	infoObject := spec.GetObject("info")
	title := infoObject.GetValueAsString("title")
	version := infoObject.GetValueAsString("version")
	if openapi3Regexp.MatchString(spec.GetValueAsString("openapi")) {
		return view.OpenAPI30Type, title + " " + version, specFormat, nil
	}
	if openapi31Regexp.MatchString(spec.GetValueAsString("openapi")) {
		return view.OpenAPI31Type, title + " " + version, specFormat, nil
	}
	if openapi2Regexp.MatchString(spec.GetValueAsString("swagger")) || openapi2Regexp.MatchString(spec.GetValueAsString("openapi")) {
		return view.OpenAPI20Type, title + " " + version, specFormat, nil
	}

	return "", "", "", fmt.Errorf("failed to get openapi version from spec at `%v`", specUrl)
}

func (r restDiscoveryRunner) FilterRefsForApiType(refs []view.DocumentRef) []view.DocumentRef {
	return utils.FilterRefsForApiType(refs, view.ATRest)
}

func (r restDiscoveryRunner) GetName() string {
	return "rest"
}
