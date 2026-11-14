package controller

import (
	"fmt"
	"io"
	"net/http"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/responder"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/service"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"

	log "github.com/sirupsen/logrus"
)

// maxStatusFormMemory is how much of a status post is buffered in memory before the remainder spills to a
// temporary file. A result ZIP is routinely larger than this, so it spills by design.
const maxStatusFormMemory = 32 << 20

const (
	statusPartStatus    = "status"
	statusPartBuilderId = "builderId"
	statusPartData      = "data"
	statusPartErrors    = "errors"
)

// BuilderController serves the pull-worker loop of java-task-consumer. Both endpoints are for workers, not
// for users: they authenticate with a system access token and require system administrator privileges, the
// same way portal-backend guards its own builder endpoints.
type BuilderController interface {
	PollTasks(w http.ResponseWriter, r *http.Request)
	PostStatus(w http.ResponseWriter, r *http.Request)
}

func NewBuilderController(buildService service.BuildService, resp responder.Responder) BuilderController {
	return builderControllerImpl{
		buildService: buildService,
		responder:    resp,
	}
}

type builderControllerImpl struct {
	buildService service.BuildService
	responder    responder.Responder
}

func (c builderControllerImpl) PollTasks(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !secctx.IsSysadm(ctx) {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	builderId := getStringParam(r, "builderId")
	taskZip, err := c.buildService.GetFreeBuild(ctx, builderId)
	if err != nil {
		c.responder.RespondWithError(w, "Failed to get a free build", err)
		return
	}
	if taskZip == nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	w.Header().Set("Content-Type", "application/zip")
	if _, err := w.Write(taskZip); err != nil {
		// The response is already committed, so there is nothing left to tell the worker. It retries, and
		// the build returns to the queue once its keepalive lapses.
		log.Errorf("Failed to write the task archive for builder %s: %v", builderId, err)
	}
}

func (c builderControllerImpl) PostStatus(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !secctx.IsSysadm(ctx) {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	libraryId := getStringParam(r, "libraryId")
	publishId := getStringParam(r, "publishId")

	if err := r.ParseMultipartForm(maxStatusFormMemory); err != nil {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	defer func() {
		if r.MultipartForm != nil {
			if err := r.MultipartForm.RemoveAll(); err != nil {
				log.Warnf("Failed to clean up the uploaded build result: %v", err)
			}
		}
	}()

	status := view.BuildStatus(r.FormValue(statusPartStatus))
	if !status.ValidWorkerStatus() {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidBuildStatus,
			Message: exception.InvalidBuildStatusMsg,
			Params:  map[string]interface{}{"status": r.FormValue(statusPartStatus)},
		})
		return
	}

	builderId := r.FormValue(statusPartBuilderId)
	if builderId == "" {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.RequiredParamsMissing,
			Message: exception.RequiredParamsMissingMsg,
			Params:  map[string]interface{}{"params": statusPartBuilderId},
		})
		return
	}

	var resultZip []byte
	if status == view.StatusComplete {
		data, err := readFilePart(r, statusPartData)
		if err != nil {
			c.responder.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectMultipartFile,
				Message: exception.IncorrectMultipartFileMsg,
				Debug:   err.Error(),
			})
			return
		}
		if data == nil {
			c.responder.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.BuildResultMissing,
				Message: exception.BuildResultMissingMsg,
				Params:  map[string]interface{}{"part": statusPartData, "status": status},
			})
			return
		}
		resultZip = data
	}

	buildErrors := r.FormValue(statusPartErrors)
	if status == view.StatusError && buildErrors == "" {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BuildResultMissing,
			Message: exception.BuildResultMissingMsg,
			Params:  map[string]interface{}{"part": statusPartErrors, "status": status},
		})
		return
	}

	err := c.buildService.PostStatus(ctx, libraryId, publishId, builderId, status, resultZip, buildErrors)
	if err != nil {
		c.responder.RespondWithError(w, "Failed to post the build status", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// readFilePart reads one file part of the status post. A missing part is not an error: whether it is
// required depends on the reported status, which the caller knows.
func readFilePart(r *http.Request, part string) ([]byte, error) {
	if r.MultipartForm != nil && len(r.MultipartForm.File[part]) > 1 {
		return nil, fmt.Errorf("part '%s' is sent more than once", part)
	}
	file, _, err := r.FormFile(part)
	if err != nil {
		if err == http.ErrMissingFile {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to read part '%s': %w", part, err)
	}
	defer file.Close()

	content, err := io.ReadAll(file)
	if err != nil {
		return nil, fmt.Errorf("failed to read part '%s': %w", part, err)
	}
	return content, nil
}
