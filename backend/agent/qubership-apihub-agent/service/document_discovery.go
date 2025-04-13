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

package service

import (
	"encoding/json"
	"io/ioutil"
	"sync"

	"time"

	"github.com/Netcracker/qubership-apihub-agent/api_type/generic"
	"github.com/Netcracker/qubership-apihub-agent/api_type/graphql"
	"github.com/Netcracker/qubership-apihub-agent/api_type/json_schema"
	"github.com/Netcracker/qubership-apihub-agent/api_type/markdown"
	"github.com/Netcracker/qubership-apihub-agent/api_type/rest"
	"github.com/Netcracker/qubership-apihub-agent/api_type/smartplug"
	"github.com/Netcracker/qubership-apihub-agent/api_type/unknown"
	"github.com/Netcracker/qubership-apihub-agent/utils"
	"github.com/Netcracker/qubership-apihub-agent/view"
	log "github.com/sirupsen/logrus"
)

type DocumentsDiscoveryService interface {
	RetrieveDocuments(baseUrl string, serviceName string, urls view.DocumentDiscoveryUrls) ([]view.Document, error)
}

const ConfigUrlField = "url"
const ConfigNameField = "name"
const ConfigXApiKindField = "x-api-kind"
const ConfigUrlsField = "urls"

const ConfigTypeField = "type"

func NewDocumentsDiscoveryService(discoveryTimeout time.Duration) DocumentsDiscoveryService {
	return &documentsDiscoveryServiceImpl{
		runners: []generic.DiscoveryRunner{
			rest.NewRestDiscoveryRunner(),
			graphql.NewGraphqlDiscoveryRunner(),
			markdown.NewMarkdownDiscoveryRunner(),
			unknown.NewUnknownDiscoveryRunner(),
			json_schema.NewJsonSchemaDiscoveryRunner(),
			smartplug.NewSmartplugDiscoveryRunner(),
		},
		discoveryTimeout: discoveryTimeout,
	}
}

type documentsDiscoveryServiceImpl struct {
	runners          []generic.DiscoveryRunner
	discoveryTimeout time.Duration
}

func (d documentsDiscoveryServiceImpl) RetrieveDocuments(baseUrl string, serviceName string, urls view.DocumentDiscoveryUrls) ([]view.Document, error) {
	// check apihub config first
	var refsFromApihubConfig []view.DocumentRef

	apihubConfig := getApihubConfigFromUrls(baseUrl, urls.ApihubConfig, d.discoveryTimeout)
	if apihubConfig != nil {
		refsFromApihubConfig = getDocumentRefsFromApihubConfig(apihubConfig, d.discoveryTimeout*3) // We know that this endpoint should contain the spec, so it's not a guess, increase timeout
	}

	// process each supported type in parallel
	docsByRunners := map[int][]view.Document{}
	errsByRunners := map[int]error{}
	docsMutex := sync.RWMutex{}

	wg := sync.WaitGroup{}
	wg.Add(len(d.runners))
	for it, r := range d.runners {
		i := it
		runner := r

		utils.SafeAsync(func() {
			defer wg.Done()
			log.Debugf("Starting runner %s", runner.GetName())

			var docs []view.Document
			var err error

			if len(refsFromApihubConfig) > 0 {
				docs, err = runner.GetDocumentsByRefs(baseUrl, refsFromApihubConfig) // just get documents from known urls
			} else {
				docs, err = runner.DiscoverDocuments(baseUrl, urls, d.discoveryTimeout)
			}

			docsMutex.Lock()
			docsByRunners[i] = docs
			errsByRunners[i] = err
			docsMutex.Unlock()
			log.Debugf("Runner %s finished", runner.GetName())
		})
	}

	wg.Wait()

	// required to maintain order of documents
	var result []view.Document
	for i, _ := range d.runners {
		result = append(result, docsByRunners[i]...)
	}

	result = removeDuplicateDocuments(result) // TODO: required or not???

	return result, utils.FilterResultErrorsMap(errsByRunners)
}

func removeDuplicateDocuments(specs []view.Document) []view.Document {
	result := make([]view.Document, 0)
	uniqueIds := make(map[string]string)
	for _, spec := range specs {
		if _, exists := uniqueIds[spec.Path]; exists {
			continue
		}
		result = append(result, spec)
		uniqueIds[spec.Path] = spec.Path
	}
	return result
}

func getDocumentRefsFromApihubConfig(apihubConfig view.JsonMap, timeout time.Duration) []view.DocumentRef {
	documentRefs := make([]view.DocumentRef, 0)
	if apihubConfig == nil {
		return nil
	}
	// single url case
	url := apihubConfig.GetValueAsString(ConfigUrlField)
	if url != "" {
		xApiKind := apihubConfig.GetValueAsString(ConfigXApiKindField)
		name := apihubConfig.GetValueAsString(ConfigNameField)
		documentRefs = append(documentRefs,
			view.DocumentRef{
				Url:      utils.EscapeSpaces(url),
				XApiKind: xApiKind,
				Name:     name,
				Required: true,
				Timeout:  timeout * 10, // We know that this endpoint should contain the spec, so it's not a guess, increase timeout
			})
		return documentRefs
	}
	// multiple urls case
	docUrls := apihubConfig.GetObjectsArray(ConfigUrlsField)
	for _, docUrlObj := range docUrls {
		url := docUrlObj.GetValueAsString(ConfigUrlField)
		xApiKind := docUrlObj.GetValueAsString(ConfigXApiKindField)
		name := docUrlObj.GetValueAsString(ConfigNameField)
		documentType := docUrlObj.GetValueAsString(ConfigTypeField)
		if !view.ValidDocumentType(documentType) {
			log.Warnf("Unknown document type - %s", documentType)
			continue
		}
		documentRefs = append(documentRefs,
			view.DocumentRef{
				Url:      utils.EscapeSpaces(url),
				XApiKind: xApiKind,
				Name:     name,
				ApiType:  view.DocTypeToApiType(documentType),
				Required: true,
				Timeout:  timeout * 10, // We know that this endpoint should contain the spec, so it's not a guess, increase timeout
			})
	}
	return documentRefs
}

func getApihubConfigFromUrls(baseUrl string, paths []string, timeout time.Duration) view.JsonMap {
	client := utils.MakeDiscoveryHttpClient(timeout)
	for _, path := range paths {
		url := baseUrl + path
		log.Debugf("Trying to get apihub config from url: %s", url)
		resp, err := client.Get(url)
		if err != nil {
			return nil
		}
		if resp.StatusCode != 200 {
			log.Debugf("Failed to get apihub config from url: %s with code %d", url, resp.StatusCode)
			resp.Body.Close()
			continue
		}
		bytes, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			log.Debugf("Failed to read apihub config from url: %s with error: %s", url, err)
			resp.Body.Close()
			continue
		}
		resp.Body.Close()

		var jmap view.JsonMap
		err = json.Unmarshal(bytes, &jmap)
		if err != nil {
			log.Debugf("Failed to unmarshall apihub config from url %s with error: %s", url, err.Error())
			continue
		} else {
			return jmap
		}
	}
	return nil
}
