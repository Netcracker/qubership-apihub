package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub-agent/exception"
	"github.com/Netcracker/qubership-apihub-agent/service"
	"github.com/Netcracker/qubership-apihub-agent/view"
	log "github.com/sirupsen/logrus"
)

type DocumentController interface {
	GetServiceDocument(w http.ResponseWriter, r *http.Request)
}

func NewDocumentController(documentService service.DocumentService) DocumentController {
	return documentControllerImpl{documentService: documentService}
}

type documentControllerImpl struct {
	documentService service.DocumentService
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
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "fileId"},
			Debug:   err.Error(),
		})
		return
	}

	content, err := d.documentService.GetDocumentById(namespace, workspaceId, serviceId, fileId)

	if err != nil {
		log.Error("Failed to get document by id: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get document by id",
				Debug:   err.Error()})
		}
		return
	}

	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusOK)
	w.Write(content)
}
