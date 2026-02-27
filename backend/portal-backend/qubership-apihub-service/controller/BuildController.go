package controller

import (
	"fmt"
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
)

type BuildController interface {
	GetBuildResult(w http.ResponseWriter, r *http.Request)
	GetBuildSources(w http.ResponseWriter, r *http.Request)
}

func NewBuildController(buildResultService service.BuildResultService, buildService service.BuildService, isSysadm func(ctx context.SecurityContext) bool) BuildController {
	return &buildControllerImpl{
		buildResultService: buildResultService,
		buildService:       buildService,
		isSysadm:           isSysadm,
	}
}

type buildControllerImpl struct {
	buildResultService service.BuildResultService
	buildService       service.BuildService
	isSysadm           func(ctx context.SecurityContext) bool
}

func (c buildControllerImpl) GetBuildResult(w http.ResponseWriter, r *http.Request) {
	ctx := context.Create(r)
	if !c.isSysadm(ctx) {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	buildId := getStringParam(r, "buildId")
	data, err := c.buildResultService.GetBuildResultData(buildId)
	if err != nil {
		utils.RespondWithError(w, "Failed to get build result", err)
		return
	}
	if data == nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.BuildResultNotFound,
			Message: exception.BuildResultNotFoundMsg,
			Params:  map[string]interface{}{"buildId": buildId},
		})
		return
	}
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=build_%s_result.zip", buildId))
	w.Header().Set("Content-Transfer-Encoding", "binary")
	w.Header().Set("Expires", "0")
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

func (c buildControllerImpl) GetBuildSources(w http.ResponseWriter, r *http.Request) {
	ctx := context.Create(r)
	if !c.isSysadm(ctx) {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	buildId := getStringParam(r, "buildId")
	data, err := c.buildService.GetBuildSourceData(buildId)
	if err != nil {
		utils.RespondWithError(w, "Failed to get build sources", err)
		return
	}
	if data == nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.BuildSourcesNotFound,
			Message: exception.BuildSourcesNotFoundMsg,
			Params:  map[string]interface{}{"buildId": buildId},
		})
		return
	}
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=build_%s_sources.zip", buildId))
	w.Header().Set("Content-Transfer-Encoding", "binary")
	w.Header().Set("Expires", "0")
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}
