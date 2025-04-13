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
