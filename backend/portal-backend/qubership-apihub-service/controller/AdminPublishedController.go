package controller

import (
	"io"
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/secctx"
	log "github.com/sirupsen/logrus"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
)

type AdminPublishedController interface {
	ReplaceVersionSources(w http.ResponseWriter, r *http.Request)
}

func NewAdminPublishedController(publishedService service.PublishedService, publishArchiveSizeLimit int64) AdminPublishedController {
	return &adminPublishedControllerImpl{
		publishedService:        publishedService,
		publishArchiveSizeLimit: publishArchiveSizeLimit,
	}
}

type adminPublishedControllerImpl struct {
	publishedService        service.PublishedService
	publishArchiveSizeLimit int64
}

func (c adminPublishedControllerImpl) ReplaceVersionSources(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !secctx.IsSysadm(ctx) {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	if r.ContentLength > c.publishArchiveSizeLimit {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.ArchiveSizeExceeded,
			Message: exception.ArchiveSizeExceededMsg,
			Params:  map[string]interface{}{"size": c.publishArchiveSizeLimit},
		})
		return
	}

	packageId := getStringParam(r, "packageId")
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, c.publishArchiveSizeLimit)
	body, err := io.ReadAll(r.Body)
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	if len(body) == 0 {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.EmptyParameter,
			Message: exception.EmptyParameterMsg,
			Params:  map[string]interface{}{"param": "request body (ZIP archive)"},
		})
		return
	}

	log.Infof("Replacing published version sources: packageId=%s version=%s archiveSize=%d", packageId, versionName, len(body))

	err = c.publishedService.ReplaceVersionSources(ctx, packageId, versionName, body)
	if err != nil {
		utils.RespondWithError(w, r, "Failed to replace version sources", err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
