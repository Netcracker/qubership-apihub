package graphql

import (
	"encoding/json"
	"fmt"
	"regexp"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub-agent/api_type/generic"
	"github.com/Netcracker/qubership-apihub-agent/client"
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

func (r graphqlDiscoveryRunner) DiscoverDocuments(baseUrl string, urls view.DocumentDiscoveryUrls, timeout time.Duration) ([]view.Document, error) {
	refs := make([]view.DocumentRef, len(urls.GraphqlSchema)+len(urls.GraphqlIntrospection)+len(urls.GraphqlConfig))
	for _, url := range urls.GraphqlSchema {
		refs = append(refs, view.DocumentRef{Url: url, ApiType: view.ATGraphql, Required: false, Timeout: timeout}) // TODO: Metadata: map[string]interface{}{"isIntrospection": false} ???
	}
	for _, url := range urls.GraphqlIntrospection {
		refs = append(refs, view.DocumentRef{Url: url, ApiType: view.ATGraphql, Required: false, Timeout: timeout}) //TODO: Metadata: map[string]interface{}{"isIntrospection": true} ???
	}
	for _, url := range urls.GraphqlConfig {
		refs = getRefsFromGraphqlConfig(baseUrl, url, timeout)
		if len(refs) > 0 {
			// Graphql config found
			return r.GetDocumentsByRefs(baseUrl, refs)
		}
	}
	return r.GetDocumentsByRefs(baseUrl, refs)
}

func (r graphqlDiscoveryRunner) GetDocumentsByRefs(baseUrl string, refs []view.DocumentRef) ([]view.Document, error) {
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

			err := checkGraphqlIntrospection(url, ref.Timeout)
			if err != nil {
				log.Debugf("Failed to read graphql introspection from %v: %v", url, err.Error())

				err := checkGraphqlSpec(url, ref.Timeout)
				if err != nil {
					log.Debugf("Failed to read graphql spec from %v: %v", url, err.Error())
					if ref.Required {
						// this is an error in this case!
						errors[i] = fmt.Sprintf("Failed to read required openapi spec from %s: %s", url, err)
					}
					return
				} else {
					if currentSpecRef.Name != "" {
						spec.Name = currentSpecRef.Name
					} else {
						spec.Name = DefaultGraphqlSpecName
					}
					spec.Format = view.FormatGraphql
					spec.FileId = utils.GenerateFileId(&fileIds, spec.Name, view.GraphQLExtension)
					spec.Type = view.GraphQLType
				}
			} else {
				if currentSpecRef.Name != "" {
					spec.Name = currentSpecRef.Name
				} else {
					spec.Name = DefaultGraphqlSpecName
				}
				spec.Format = view.FormatJson
				spec.FileId = utils.GenerateFileId(&fileIds, spec.Name, view.JsonExtension)
				spec.Type = view.GraphQLType // what about introspection?
			}

			spec.XApiKind = currentSpecRef.XApiKind

			result[i] = spec
		})
	}

	wg.Wait()

	return utils.FilterResultDocuments(result), utils.FilterResultErrors(errors)
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
		return fmt.Errorf("failed to get graphql specification from '%v': %v", specUrl, err.Error())
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

func getRefsFromGraphqlConfig(baseUrl string, graphqlConfigUrl string, timeout time.Duration) []view.DocumentRef {
	graphqlSpecRefs := make([]view.DocumentRef, 0)
	spec, _, err := generic.GetGenericObjectFromUrl(baseUrl+graphqlConfigUrl, timeout) // TODO: refactor
	if err != nil {
		log.Debugf("Failed to read json spec from %v: %v", baseUrl+graphqlConfigUrl, err.Error())
		return nil
	}
	if spec == nil {
		return nil
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
		return graphqlSpecRefs
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
	return graphqlSpecRefs
}
