package utils

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-agent/view"
)

func MakeDiscoveryHttpClient(timeout time.Duration) http.Client {
	return http.Client{Timeout: timeout, CheckRedirect: func(req *http.Request, via []*http.Request) error {
		return http.ErrUseLastResponse
	}}
}

func EscapeSpaces(s string) string {
	return strings.ReplaceAll(s, " ", "%20")
}

func MakeDocumentRefsFromUrls(urls []string, apiType view.ApiType, required bool, timeout time.Duration) []view.DocumentRef {
	specRefs := make([]view.DocumentRef, len(urls))
	for _, url := range urls {
		specRefs = append(specRefs, view.DocumentRef{Url: url, ApiType: apiType, Required: required, Timeout: timeout})
	}
	return specRefs
}

func FilterRefsForApiType(refs []view.DocumentRef, targetApiType view.ApiType) []view.DocumentRef {
	var filteredRefs []view.DocumentRef
	for _, ref := range refs {
		if ref.ApiType == targetApiType {
			filteredRefs = append(filteredRefs, ref)
		}
	}
	return filteredRefs
}

func FilterResultDocuments(documents []view.Document) []view.Document {
	var result []view.Document
	for _, doc := range documents {
		if doc.FileId != "" {
			result = append(result, doc)
		}
	}
	return result
}

func FilterEndpointCallResults(calls []view.EndpointCallInfo) []view.EndpointCallInfo {
	result := make([]view.EndpointCallInfo, 0)
	for _, call := range calls {
		if call.Path != "" {
			result = append(result, call)
		}
	}
	return result
}

func FilterResultErrors(errs []string) error {
	result := ""
	for i, err := range errs {
		if err != "" {
			result += err
			if i < len(errs)-1 {
				result += " | "
			}
		}
	}
	if result == "" {
		return nil
	}
	return fmt.Errorf("%s", result)
}

func FilterResultErrorsMap(errs map[int]error) error {
	result := ""
	i := 0
	for _, err := range errs {
		if err != nil {
			result += err.Error()
			if i < len(errs)-1 {
				result += " | "
			}
		}
		i += 1
	}
	if result == "" {
		return nil
	}
	return fmt.Errorf("%s", result)
}
