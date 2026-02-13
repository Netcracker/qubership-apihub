package generic

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub-agent/exception"
	"gopkg.in/yaml.v2"

	"github.com/Netcracker/qubership-apihub-agent/client"
	"github.com/Netcracker/qubership-apihub-agent/utils"
	"github.com/Netcracker/qubership-apihub-agent/view"
	log "github.com/sirupsen/logrus"
)

type DiscoveryRunner interface {
	DiscoverDocuments(baseUrl string, urls view.DocumentDiscoveryUrls, timeout time.Duration) ([]view.Document, []view.EndpointCallInfo, error)
	GetDocumentsByRefs(baseUrl string, refs []view.DocumentRef, configPath string) ([]view.Document, []view.EndpointCallInfo, error)
	FilterRefsForApiType(refs []view.DocumentRef) []view.DocumentRef
	GetName() string
}

const ConfigUrlField = "url"
const ConfigNameField = "name"
const ConfigXApiKindField = "x-api-kind"
const ConfigUrlsField = "urls"

func GetRefsFromConfig(baseUrl string, configUrl string, timeout time.Duration) ([]view.DocumentRef, *view.EndpointCallInfo) {
	specRefs := make([]view.DocumentRef, 0)
	spec, _, err := GetGenericObjectFromUrl(baseUrl+configUrl, timeout) // TODO: refactor??
	if err != nil {
		log.Debugf("Failed to read spec from %v: %v", baseUrl+configUrl, err.Error())
		var statusCode int
		if customError, ok := err.(*exception.CustomError); ok {
			statusCode, _ = strconv.Atoi(customError.Params["code"].(string))
		}
		return nil, &view.EndpointCallInfo{
			Path:         configUrl,
			StatusCode:   statusCode,
			ErrorSummary: fmt.Sprintf("Failed to get config: %s", err.Error()),
		}
	}
	// single url case
	url := spec.GetValueAsString(ConfigUrlField)
	if url != "" {
		xApiKind := spec.GetValueAsString(ConfigXApiKindField)
		name := spec.GetValueAsString(ConfigNameField)
		specRefs = append(specRefs,
			view.DocumentRef{
				Url:      utils.EscapeSpaces(url),
				XApiKind: xApiKind,
				Name:     name,
				Timeout:  timeout * 10, // We know that this endpoint should contain the spec, so it's not a guess, increase timeout
			})
		return specRefs, nil
	}
	// multiple urls case
	urls := spec.GetObjectsArray(ConfigUrlsField)
	for _, specObj := range urls {
		url := specObj.GetValueAsString(ConfigUrlField)
		xApiKind := specObj.GetValueAsString(ConfigXApiKindField)
		name := specObj.GetValueAsString(ConfigNameField)
		specRefs = append(specRefs,
			view.DocumentRef{
				Url:      utils.EscapeSpaces(url),
				XApiKind: xApiKind,
				Name:     name,
				Timeout:  timeout * 10, // We know that this endpoint should contain the spec, so it's not a guess, increase timeout
			})
	}
	if len(specRefs) == 0 {
		return nil, &view.EndpointCallInfo{
			Path:         configUrl,
			ErrorSummary: "Config found but contains no spec URLs",
		}
	}
	return specRefs, nil
}

func GetAnyDocsByRefs(baseUrl string, refs []view.DocumentRef, configPath string) ([]view.Document, []view.EndpointCallInfo, error) {
	if len(refs) == 0 {
		return nil, nil, nil
	}

	result := make([]view.Document, len(refs))
	callResults := make([]view.EndpointCallInfo, len(refs))
	errors := make([]string, len(refs))

	wg := sync.WaitGroup{}
	wg.Add(len(refs))

	fileIds := sync.Map{}

	for it, refIt := range refs {
		i := it
		ref := refIt
		url := refIt.Url
		utils.SafeAsync(func() {
			defer wg.Done()

			name := ref.Name
			if name == "" {
				// generate name from url
				parts := strings.Split(url, "/")
				name = parts[len(parts)-1]
			}

			fullUrl := baseUrl + url

			data, err := client.GetRawDocumentFromUrl(fullUrl, string(ref.ApiType), ref.Timeout)
			if err != nil {
				log.Debugf("Failed to get document from url %s: %s", fullUrl, err)
				var statusCode int
				if customError, ok := err.(*exception.CustomError); ok {
					statusCode, _ = strconv.Atoi(customError.Params["code"].(string))
				}
				callResults[i] = view.EndpointCallInfo{
					Path:         url,
					StatusCode:   statusCode,
					ErrorSummary: fmt.Sprintf("Failed to get document: %s", err.Error()),
				}
				if ref.Required {
					errors[i] = fmt.Sprintf("Failed to get required document from url %s: %s", url, err)
				}
				return
			}
			if len(data) > 0 {
				format := view.GetDocExtensionByType(string(ref.ApiType))
				result[i] = view.Document{
					Name:       name,
					Format:     format,
					FileId:     utils.GenerateFileId(&fileIds, name, format),
					Type:       string(ref.ApiType),
					XApiKind:   ref.XApiKind,
					DocPath:    url,
					ConfigPath: configPath,
				}
			} else {
				callResults[i] = view.EndpointCallInfo{
					Path:         url,
					ErrorSummary: "Document contains no data",
				}
			}
		})
	}
	wg.Wait()
	return utils.FilterResultDocuments(result), utils.FilterEndpointCallResults(callResults), utils.FilterResultErrors(errors)
}

func GetGenericObjectFromUrl(url string, timeout time.Duration) (view.JsonMap, string, error) {
	specBytes, err := client.GetRawDocumentFromUrl(url, string(view.ATRest), timeout)
	if err != nil {
		return nil, "", err
	}
	if len(specBytes) == 0 {
		return nil, "", fmt.Errorf("response body is empty")
	}
	var spec view.JsonMap
	jsonErr := json.Unmarshal(specBytes, &spec)
	if jsonErr == nil {
		return spec, view.FormatJson, nil
	}
	var body map[interface{}]interface{}
	yamlErr := yaml.Unmarshal(specBytes, &body)
	if yamlErr != nil {
		// TODO: Both failed - what error should be in this case ?
		return nil, "", fmt.Errorf("invalid JSON: %v", jsonErr)
	}
	spec = view.ConvertYamlToJsonMap(body)
	if spec == nil {
		return nil, "", fmt.Errorf("YAML structure cannot be converted to JSON map")
	}
	return spec, view.FormatYaml, nil
}
