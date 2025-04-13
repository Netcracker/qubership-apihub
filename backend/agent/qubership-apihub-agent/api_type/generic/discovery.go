package generic

import (
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"gopkg.in/yaml.v2"

	"github.com/Netcracker/qubership-apihub-agent/client"
	"github.com/Netcracker/qubership-apihub-agent/utils"
	"github.com/Netcracker/qubership-apihub-agent/view"
	log "github.com/sirupsen/logrus"
)

type DiscoveryRunner interface {
	DiscoverDocuments(baseUrl string, urls view.DocumentDiscoveryUrls, timeout time.Duration) ([]view.Document, error)
	GetDocumentsByRefs(baseUrl string, refs []view.DocumentRef) ([]view.Document, error)
	FilterRefsForApiType(refs []view.DocumentRef) []view.DocumentRef
	GetName() string
}

const ConfigUrlField = "url"
const ConfigNameField = "name"
const ConfigXApiKindField = "x-api-kind"
const ConfigUrlsField = "urls"

func GetRefsFromConfig(baseUrl string, configUrl string, timeout time.Duration) []view.DocumentRef {
	specRefs := make([]view.DocumentRef, 0)
	spec, _, err := GetGenericObjectFromUrl(baseUrl+configUrl, timeout) // TODO: refactor??
	if err != nil {
		log.Debugf("Failed to read spec from %v: %v", baseUrl+configUrl, err.Error())
		return nil
	}
	if spec == nil {
		return nil
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
		return specRefs
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
	return specRefs
}

func GetAnyDocsByRefs(baseUrl string, refs []view.DocumentRef) ([]view.Document, error) {
	if len(refs) == 0 {
		return nil, nil
	}

	result := make([]view.Document, len(refs))
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

			doc := view.Document{
				Name:     name,
				Path:     url,
				Type:     string(ref.ApiType),
				XApiKind: ref.XApiKind,
			}

			fullUrl := baseUrl + url

			data, err := client.GetRawDocumentFromUrl(fullUrl, string(ref.ApiType), ref.Timeout)
			if err != nil {
				log.Debugf("Failed to get document from url %s: %s", fullUrl, err)
				if ref.Required {
					errors[i] = fmt.Sprintf("Failed to get required document from url %s: %s", url, err)
				}
				return
			}
			if len(data) > 0 {
				doc.Format = view.GetDocExtensionByType(doc.Type)
				doc.FileId = utils.GenerateFileId(&fileIds, doc.Name, doc.Format)
				result[i] = doc
			}
		})
	}
	wg.Wait()
	return utils.FilterResultDocuments(result), utils.FilterResultErrors(errors)
}

func GetGenericObjectFromUrl(url string, timeout time.Duration) (view.JsonMap, string, error) {
	specBytes, err := client.GetRawDocumentFromUrl(url, string(view.ATRest), timeout)
	if err != nil {
		return nil, "", err
	}
	var spec view.JsonMap
	err = json.Unmarshal(specBytes, &spec)
	if err == nil {
		return spec, view.FormatJson, nil
	}
	var body map[interface{}]interface{}
	if err := yaml.Unmarshal(specBytes, &body); err != nil {
		return nil, "", err
	}

	spec = view.ConvertYamlToJsonMap(body)
	if spec != nil {
		return spec, view.FormatYaml, nil
	}
	return nil, "", err
}
