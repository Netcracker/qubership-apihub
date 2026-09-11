package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub-agent/exception"
	"github.com/Netcracker/qubership-apihub-agent/responder"
	"github.com/Netcracker/qubership-apihub-agent/service"
	"github.com/Netcracker/qubership-apihub-agent/view"
)

type DocumentController interface {
	GetServiceDocument(w http.ResponseWriter, r *http.Request)
}

func NewDocumentController(documentService service.DocumentService, resp responder.Responder) DocumentController {
	return documentControllerImpl{documentService: documentService, responder: resp}
}

type documentControllerImpl struct {
	documentService service.DocumentService
	responder       responder.Responder
}

func (d documentControllerImpl) GetServiceDocument(w http.ResponseWriter, r *http.Request) {
	namespace := getStringParam(r, "name")
	workspaceId := getStringParam(r, "workspaceId")
	//v1 support
	if workspaceId == "" {
		workspaceId = view.DefaultWorkspaceId
	}
	serviceId := getStringParam(r, "serviceId")
	fileId, err := getUnescapedStringParam(r, "fileId")
	if err != nil {
		d.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "fileId"},
			Debug:   err.Error(),
		})
		return
	}

	requestedServices := getRequestedServicesQueryParam(r)
	content, err := d.documentService.GetDocumentById(namespace, workspaceId, serviceId, fileId, requestedServices)

	if err != nil {
		d.responder.RespondWithError(w, "Failed to get document by id", err)
		return
	}

	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusOK)
	w.Write(content)
}
