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
	"net/http"
	"time"

	"github.com/Netcracker/qubership-apihub-agent/client"
	"github.com/Netcracker/qubership-apihub-agent/exception"
	"github.com/Netcracker/qubership-apihub-agent/view"
)

type DocumentService interface {
	GetDocumentById(namespace, workspaceId, serviceId, fileId string) ([]byte, error)
}

func NewDocumentService(servicesListCache ServiceListCache, getDocTimeout time.Duration) DocumentService {
	return &documentServiceImpl{servicesListCache: servicesListCache, getDocTimeout: getDocTimeout}
}

type documentServiceImpl struct {
	servicesListCache ServiceListCache
	getDocTimeout     time.Duration
}

func (d documentServiceImpl) GetDocumentById(namespace, workspaceId, serviceId, fileId string) ([]byte, error) {
	var svc view.Service
	var relPath string
	var documentType string
	var format string

	slist, _, _ := d.servicesListCache.GetServicesList(namespace, workspaceId)
	for _, svcIt := range slist {
		if svcIt.Id == serviceId {
			svc = svcIt
			break
		}
	}
	for _, document := range svc.Documents {
		if document.FileId == fileId {
			relPath = document.Path
			documentType = document.Type
			format = document.Format
			break
		}
	}

	if relPath == "" || documentType == "" || format == "" {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.DocumentNotFound,
			Message: exception.DocumentNotFoundMsg,
			Params:  map[string]interface{}{"fileId": fileId},
		}
	}

	specUrl := svc.Url + relPath

	var content []byte
	var err error
	switch documentType {
	case view.OpenAPI20Type, view.OpenAPI30Type, view.OpenAPI31Type:
		content, err = client.GetRawDocumentFromUrl(specUrl, string(view.ATRest), d.getDocTimeout)
	case view.GraphQLType:
		if format == "json" {
			content, err = client.GetRawGraphqlIntrospectionFromUrl(specUrl, d.getDocTimeout)
		} else {
			content, err = client.GetRawDocumentFromUrl(specUrl, string(view.ATGraphql), d.getDocTimeout)
		}
	default:
		content, err = client.GetRawDocumentFromUrl(specUrl, documentType, d.getDocTimeout)
	}
	if err != nil {
		return nil, err
	}
	return content, nil
}
