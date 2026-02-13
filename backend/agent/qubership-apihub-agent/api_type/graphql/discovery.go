package graphql

import (
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub-agent/api_type/generic"
	"github.com/Netcracker/qubership-apihub-agent/client"
	"github.com/Netcracker/qubership-apihub-agent/exception"
	"github.com/Netcracker/qubership-apihub-agent/utils"
	"github.com/Netcracker/qubership-apihub-agent/view"
	log "github.com/sirupsen/logrus"
)

func NewGraphqlDiscoveryRunner() generic.DiscoveryRunner {
	return &graphqlDiscoveryRunner{}
}

type graphqlDiscoveryRunner struct {
}

const DefaultGraphqlSpecName = "Graphql specification"
const DefaultGraphqlIntSpecName = "Graphql introspection"

func (r graphqlDiscoveryRunner) DiscoverDocuments(baseUrl string, urls view.DocumentDiscoveryUrls, timeout time.Duration) ([]view.Document, []view.EndpointCallInfo, error) {
	var allCallResults []view.EndpointCallInfo

	// Check for GraphQL config first
	for _, url := range urls.GraphqlConfig {
		configRefs, callResult := getRefsFromGraphqlConfig(baseUrl, url, timeout)
		if callResult != nil {
			allCallResults = append(allCallResults, *callResult)
		}
		if len(configRefs) > 0 {
			// Graphql config found
			docs, callResults, err := r.GetDocumentsByRefs(baseUrl, configRefs, url)
			allCallResults = append(allCallResults, callResults...)
			return docs, allCallResults, err
		}
	}

	// No config found, collect schema and introspection URLs
	refs := make([]view.DocumentRef, 0, len(urls.GraphqlSchema)+len(urls.GraphqlIntrospection))
	for _, url := range urls.GraphqlSchema {
		refs = append(refs, view.DocumentRef{Url: url, ApiType: view.ATGraphql, Required: false, Timeout: timeout}) // TODO: Metadata: map[string]interface{}{"isIntrospection": false} ???
	}
	for _, url := range urls.GraphqlIntrospection {
		refs = append(refs, view.DocumentRef{Url: url, ApiType: view.ATGraphql, Required: false, Timeout: timeout}) //TODO: Metadata: map[string]interface{}{"isIntrospection": true} ???
	}
	docs, callResults, err := r.GetDocumentsByRefs(baseUrl, refs, "")
	allCallResults = append(allCallResults, callResults...)
	return docs, allCallResults, err
}

func (r graphqlDiscoveryRunner) GetDocumentsByRefs(baseUrl string, refs []view.DocumentRef, configPath string) ([]view.Document, []view.EndpointCallInfo, error) {
	filteredRefs := r.FilterRefsForApiType(refs) // take only appropriate api type
	if len(filteredRefs) == 0 {
		return nil, nil, nil
	}

	result := make([]view.Document, len(filteredRefs))
	callResults := make([]view.EndpointCallInfo, len(filteredRefs))
	errs := make([]string, len(filteredRefs))

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

			var name, format, fileId string

			err := checkGraphqlIntrospection(url, ref.Timeout)
			if err != nil {
				log.Debugf("Failed to read graphql introspection from %v: %v", url, err.Error())

				err := checkGraphqlSpec(url, ref.Timeout)
				if err != nil {
					log.Debugf("Failed to read graphql spec from %v: %v", url, err.Error())
					var customErr *exception.CustomError
					var statusCode int
					if errors.As(err, &customErr) {
						statusCode, _ = strconv.Atoi(customErr.Params["code"].(string))
					}
					callResults[i] = view.EndpointCallInfo{
						Path:         currentSpecUrl,
						StatusCode:   statusCode,
						ErrorSummary: err.Error(),
					}
					if ref.Required {
						errs[i] = fmt.Sprintf("Failed to read required graphql spec from %s: %s", url, err)
					}
					return
				} else {
					if currentSpecRef.Name != "" {
						name = currentSpecRef.Name
					} else {
						name = DefaultGraphqlSpecName
					}
					format = view.FormatGraphql
					fileId = utils.GenerateFileId(&fileIds, name, view.GraphQLExtension)
				}
			} else {
				if currentSpecRef.Name != "" {
					name = currentSpecRef.Name
				} else {
					name = DefaultGraphqlSpecName
				}
				format = view.FormatJson
				fileId = utils.GenerateFileId(&fileIds, name, view.JsonExtension)
			}

			result[i] = view.Document{
				Name:       name,
				Format:     format,
				FileId:     fileId,
				Type:       view.GraphQLType,
				XApiKind:   currentSpecRef.XApiKind,
				DocPath:    currentSpecUrl,
				ConfigPath: configPath,
			}
		})
	}

	wg.Wait()

	return utils.FilterResultDocuments(result), utils.FilterEndpointCallResults(callResults), utils.FilterResultErrors(errs)
}

func (r graphqlDiscoveryRunner) FilterRefsForApiType(refs []view.DocumentRef) []view.DocumentRef {
	return utils.FilterRefsForApiType(refs, view.ATGraphql)
}

func (r graphqlDiscoveryRunner) GetName() string {
	return "graphql"
}

func getGraphqlIntrospectionFromUrl(url string, timeout time.Duration) (view.JsonMap, error) {
	log.Debugf("Sending graphql introspection discovery request to %s", url)
	specBytes, err := client.GetRawGraphqlIntrospectionFromUrl(url, timeout)
	if err != nil {
		return nil, err
	}
	var spec view.JsonMap
	err = json.Unmarshal(specBytes, &spec)
	if err != nil {
		return nil, err
	}
	return spec, nil
}

func getGraphqlSpecFromUrl(url string, timeout time.Duration) ([]byte, error) {
	log.Debugf("Sending graphql spec discovery request to %s", url)
	specBytes, err := client.GetRawDocumentFromUrl(url, string(view.ATGraphql), timeout)
	if err != nil {
		return nil, err
	}
	return specBytes, nil
}

func checkGraphqlIntrospection(specUrl string, timeout time.Duration) error {
	spec, err := getGraphqlIntrospectionFromUrl(specUrl, timeout)
	if err != nil {
		return fmt.Errorf("failed to get graphql introspection from '%v': %v", specUrl, err.Error())
	}
	if spec != nil {
		if _, ok := spec["data"]; ok {
			return nil
		}
	}
	return fmt.Errorf("incorrect graphql introspection found at url `%v`", specUrl)
}

func checkGraphqlSpec(specUrl string, timeout time.Duration) error {
	spec, err := getGraphqlSpecFromUrl(specUrl, timeout)
	if err != nil {
		return fmt.Errorf("failed to get graphql specification from '%v': %w", specUrl, err)
	}
	if spec != nil {
		match, err := regexp.Match("type\\s+?\\S+?\\s+?{", spec)
		if err != nil {
			return fmt.Errorf("failed to check if content of url %s is graphql spec: %s", specUrl, err)
		}
		if match {
			return nil
		} else {
			return fmt.Errorf("incorrect graphql spec found at url `%v`", specUrl)
		}
	}
	return fmt.Errorf("incorrect graphql spec found at url `%v`", specUrl)
}

const GraphqlConfigUrlField = "url"
const GraphqlConfigUrlsField = "urls"
const GraphqlConfigNameField = "name"

func getRefsFromGraphqlConfig(baseUrl string, graphqlConfigUrl string, timeout time.Duration) ([]view.DocumentRef, *view.EndpointCallInfo) {
	graphqlSpecRefs := make([]view.DocumentRef, 0)
	spec, _, err := generic.GetGenericObjectFromUrl(baseUrl+graphqlConfigUrl, timeout) // TODO: refactor
	if err != nil {
		log.Debugf("Failed to read json spec from %v: %v", baseUrl+graphqlConfigUrl, err.Error())
		var statusCode int
		if customError, ok := err.(*exception.CustomError); ok {
			statusCode, _ = strconv.Atoi(customError.Params["code"].(string))
		}
		return nil, &view.EndpointCallInfo{
			Path:         graphqlConfigUrl,
			StatusCode:   statusCode,
			ErrorSummary: fmt.Sprintf("Failed to get GraphQL config: %s", err.Error()),
		}
	}
	// single url case
	url := spec.GetValueAsString(GraphqlConfigUrlField)
	if url != "" {
		name := spec.GetValueAsString(GraphqlConfigNameField)
		graphqlSpecRefs = append(graphqlSpecRefs,
			view.DocumentRef{
				Url:      utils.EscapeSpaces(url),
				Name:     name,
				ApiType:  view.ATGraphql,
				Required: true,
				Timeout:  timeout * 10, // We know that this endpoint should contain the spec, so it's not a guess, increase timeout
			})
		return graphqlSpecRefs, nil
	}
	// multiple urls case
	urls := spec.GetObjectsArray(GraphqlConfigUrlsField)
	for _, specObj := range urls {
		url := specObj.GetValueAsString(GraphqlConfigUrlField)
		name := specObj.GetValueAsString(GraphqlConfigNameField)
		graphqlSpecRefs = append(graphqlSpecRefs,
			view.DocumentRef{
				Url:      utils.EscapeSpaces(url),
				Name:     name,
				ApiType:  view.ATGraphql,
				Required: true,
				Timeout:  timeout * 10, // We know that this endpoint should contain the spec, so it's not a guess, increase timeout
			})
	}
	if len(graphqlSpecRefs) == 0 {
		return nil, &view.EndpointCallInfo{
			Path:         graphqlConfigUrl,
			ErrorSummary: "Config found but contains no spec URLs",
		}
	}
	return graphqlSpecRefs, nil
}
