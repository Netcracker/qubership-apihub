package rest

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

func NewRestDiscoveryRunner() generic.DiscoveryRunner {
	return &restDiscoveryRunner{}
}

type restDiscoveryRunner struct {
}

func (r restDiscoveryRunner) DiscoverDocuments(baseUrl string, urls view.DocumentDiscoveryUrls, timeout time.Duration) ([]view.Document, []view.EndpointCallInfo, error) {
	var allCallResults []view.EndpointCallInfo

	// find swagger-config, etc..
	var refs []view.DocumentRef
	for _, url := range urls.SwaggerConfig {
		refs, callResult := getRefsFromSwaggerConfig(baseUrl, url, timeout)
		if callResult != nil {
			allCallResults = append(allCallResults, *callResult)
		}
		if len(refs) > 0 {
			// Swagger config found
			docs, callResults, err := r.GetDocumentsByRefs(baseUrl, refs, url)
			allCallResults = append(allCallResults, callResults...)
			return docs, allCallResults, err
		}
	}
	// Swagger config not found, generate refs list from openapi urls
	refs = utils.MakeDocumentRefsFromUrls(urls.Openapi, view.ATRest, false, timeout)
	docs, callResults, err := r.GetDocumentsByRefs(baseUrl, refs, "")
	allCallResults = append(allCallResults, callResults...)
	return docs, allCallResults, err
}

func (r restDiscoveryRunner) GetDocumentsByRefs(baseUrl string, refs []view.DocumentRef, configPath string) ([]view.Document, []view.EndpointCallInfo, error) {
	filteredRefs := r.FilterRefsForApiType(refs) // take only appropriate api type
	if len(filteredRefs) == 0 {
		return nil, nil, nil
	}

	result := make([]view.Document, len(filteredRefs))
	callResults := make([]view.EndpointCallInfo, len(filteredRefs))
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

			specVersion, specTitle, specFormat, callResult := getSpecVersionAndTitleFromDoc(url, currentSpecUrl, ref.Timeout)
			if callResult != nil {
				log.Debugf("Failed to read openapi spec from %s: %s", url, callResult.ErrorSummary)
				callResults[i] = *callResult
				if ref.Required {
					errors[i] = fmt.Sprintf("Failed to read required openapi spec from %s: %s", url, callResult.ErrorSummary)
				}
				return
			}
			log.Debugf("Got valid openapi spec from: %v", url)

			var name string
			if currentSpecRef.Name != "" {
				name = currentSpecRef.Name
			} else if specTitle != "" {
				name = specTitle
			} else {
				name = DefaultOpenapiSpecName
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

	return utils.FilterResultDocuments(result), utils.FilterEndpointCallResults(callResults), utils.FilterResultErrors(errors)
}

// TODO: move to type detection
var openapi3Regexp = regexp.MustCompile(`3.0+`)
var openapi31Regexp = regexp.MustCompile(`3.1+`)
var openapi2Regexp = regexp.MustCompile(`2.*`)

const DefaultOpenapiSpecName = "default"

func getRefsFromSwaggerConfig(baseUrl string, swaggerConfigUrl string, timeout time.Duration) ([]view.DocumentRef, *view.EndpointCallInfo) {
	swaggerSpecRefs, callResult := generic.GetRefsFromConfig(baseUrl, swaggerConfigUrl, timeout)
	if callResult != nil {
		return nil, callResult
	}
	for i := range swaggerSpecRefs {
		swaggerSpecRefs[i].ApiType = view.ATRest
		swaggerSpecRefs[i].Required = true
	}
	return swaggerSpecRefs, nil
}

func getSpecVersionAndTitleFromDoc(specUrl string, relativePath string, timeout time.Duration) (string, string, string, *view.EndpointCallInfo) {
	spec, specFormat, err := generic.GetGenericObjectFromUrl(specUrl, timeout)
	if err != nil {
		var statusCode int
		if customError, ok := err.(*exception.CustomError); ok {
			statusCode, _ = strconv.Atoi(customError.Params["code"].(string))
		}
		return "", "", "", &view.EndpointCallInfo{
			Path:         relativePath,
			StatusCode:   statusCode,
			ErrorSummary: fmt.Sprintf("failed to get OpenAPI specification: %v", err.Error()),
		}
	}
	infoObject := spec.GetObject("info")
	title := infoObject.GetValueAsString("title")
	version := infoObject.GetValueAsString("version")
	openapiVersion := spec.GetValueAsString("openapi")
	swaggerVersion := spec.GetValueAsString("swagger")
	if openapi3Regexp.MatchString(openapiVersion) {
		return view.OpenAPI30Type, title + " " + version, specFormat, nil
	}
	if openapi31Regexp.MatchString(openapiVersion) {
		return view.OpenAPI31Type, title + " " + version, specFormat, nil
	}
	if openapi2Regexp.MatchString(swaggerVersion) || openapi2Regexp.MatchString(openapiVersion) {
		return view.OpenAPI20Type, title + " " + version, specFormat, nil
	}

	if openapiVersion != "" {
		return "", "", "", &view.EndpointCallInfo{
			Path:         relativePath,
			ErrorSummary: fmt.Sprintf("unsupported OpenAPI version: %s (expected 2.x, 3.0.x, or 3.1.x)", openapiVersion),
		}
	}
	if swaggerVersion != "" {
		return "", "", "", &view.EndpointCallInfo{
			Path:         relativePath,
			ErrorSummary: fmt.Sprintf("unsupported Swagger version: %s (expected 2.x)", swaggerVersion),
		}
	}
	return "", "", "", &view.EndpointCallInfo{
		Path:         relativePath,
		ErrorSummary: "response is valid JSON but missing 'openapi' or 'swagger' version field",
	}
}

func (r restDiscoveryRunner) FilterRefsForApiType(refs []view.DocumentRef) []view.DocumentRef {
	return utils.FilterRefsForApiType(refs, view.ATRest)
}

func (r restDiscoveryRunner) GetName() string {
	return "rest"
}
