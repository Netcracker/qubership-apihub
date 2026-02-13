package service

import (
	"encoding/json"
	"fmt"
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
	RetrieveDocuments(baseUrl string, serviceName string, urls view.DocumentDiscoveryUrls) (*view.DiscoveryResult, error)
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

func (d documentsDiscoveryServiceImpl) RetrieveDocuments(baseUrl string, serviceName string, urls view.DocumentDiscoveryUrls) (*view.DiscoveryResult, error) {
	// check apihub config first
	var refsFromApihubConfig []view.DocumentRef

	apihubConfig, configPath, apihubConfigCallResults := getApihubConfigFromUrls(baseUrl, urls.ApihubConfig, d.discoveryTimeout)
	if apihubConfig != nil {
		refsFromApihubConfig = getDocumentRefsFromApihubConfig(apihubConfig, d.discoveryTimeout*3) // We know that this endpoint should contain the spec, so it's not a guess, increase timeout
	}

	// process each supported type in parallel
	docsByRunners := map[int][]view.Document{}
	callsByRunners := map[int][]view.EndpointCallInfo{}
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
			var callResults []view.EndpointCallInfo
			var err error

			if len(refsFromApihubConfig) > 0 {
				docs, callResults, err = runner.GetDocumentsByRefs(baseUrl, refsFromApihubConfig, configPath) // just get documents from known urls
			} else {
				docs, callResults, err = runner.DiscoverDocuments(baseUrl, urls, d.discoveryTimeout)
			}

			docsMutex.Lock()
			docsByRunners[i] = docs
			callsByRunners[i] = callResults
			errsByRunners[i] = err
			docsMutex.Unlock()
			log.Debugf("Runner %s finished", runner.GetName())
		})
	}

	wg.Wait()

	// required to maintain order of documents
	var resultDocs []view.Document
	var resultCalls []view.EndpointCallInfo

	resultCalls = append(resultCalls, apihubConfigCallResults...)
	for i := range d.runners {
		resultDocs = append(resultDocs, docsByRunners[i]...)
		resultCalls = append(resultCalls, callsByRunners[i]...)
	}

	resultDocs = removeDuplicateDocuments(resultDocs) // TODO: required or not???

	return &view.DiscoveryResult{
		Documents:     resultDocs,
		EndpointCalls: resultCalls,
	}, utils.FilterResultErrorsMap(errsByRunners)
}

func removeDuplicateDocuments(specs []view.Document) []view.Document {
	result := make([]view.Document, 0)
	uniqueIds := make(map[string]string)
	for _, spec := range specs {
		if _, exists := uniqueIds[spec.DocPath]; exists {
			continue
		}
		result = append(result, spec)
		uniqueIds[spec.DocPath] = spec.DocPath
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

func getApihubConfigFromUrls(baseUrl string, paths []string, timeout time.Duration) (view.JsonMap, string, []view.EndpointCallInfo) {
	client := utils.MakeDiscoveryHttpClient(timeout)
	var callResults []view.EndpointCallInfo

	for _, path := range paths {
		url := baseUrl + path
		log.Debugf("Trying to get apihub config from url: %s", url)
		resp, err := client.Get(url)
		if err != nil {
			callResults = append(callResults, view.EndpointCallInfo{
				Path:         path,
				ErrorSummary: fmt.Sprintf("Failed to get APIHUB config: %s", err.Error()),
			})
			continue
		}
		if resp.StatusCode != 200 {
			log.Debugf("Failed to get apihub config from url: %s with code %d", url, resp.StatusCode)
			callResults = append(callResults, view.EndpointCallInfo{
				Path:         path,
				StatusCode:   resp.StatusCode,
				ErrorSummary: "Failed to get APIHUB config",
			})
			resp.Body.Close()
			continue
		}
		bytes, err := ioutil.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			log.Debugf("Failed to read apihub config from url: %s with error: %s", url, err)
			callResults = append(callResults, view.EndpointCallInfo{
				Path:         path,
				ErrorSummary: fmt.Sprintf("Failed to get APIHUB config: failed to read response body: %s", err.Error()),
			})
			continue
		}
		if len(bytes) == 0 {
			callResults = append(callResults, view.EndpointCallInfo{
				Path:         path,
				ErrorSummary: "Failed to get APIHUB config: response body is empty",
			})
			continue
		}
		var jmap view.JsonMap
		err = json.Unmarshal(bytes, &jmap)
		if err != nil {
			log.Debugf("Failed to unmarshall apihub config from url %s with error: %s", url, err.Error())
			callResults = append(callResults, view.EndpointCallInfo{
				Path:         path,
				ErrorSummary: fmt.Sprintf("Failed to get APIHUB config: invalid JSON: %s", err.Error()),
			})
			continue
		}
		return jmap, path, callResults
	}
	return nil, "", callResults
}
