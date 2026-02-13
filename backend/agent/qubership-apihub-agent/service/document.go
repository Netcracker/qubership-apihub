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
			relPath = document.DocPath
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
