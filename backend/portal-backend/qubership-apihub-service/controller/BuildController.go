package controller

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/secctx"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type BuildController interface {
	GetBuild(w http.ResponseWriter, r *http.Request)
	ListBuilds(w http.ResponseWriter, r *http.Request)
	GetBuildResult(w http.ResponseWriter, r *http.Request)
	GetBuildSources(w http.ResponseWriter, r *http.Request)
}

func NewBuildController(buildResultService service.BuildResultService, buildService service.BuildService) BuildController {
	return &buildControllerImpl{
		buildResultService: buildResultService,
		buildService:       buildService,
	}
}

type buildControllerImpl struct {
	buildResultService service.BuildResultService
	buildService       service.BuildService
}

func (c buildControllerImpl) GetBuild(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !secctx.IsSysadm(ctx) {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	buildId := getStringParam(r, "buildId")
	build, err := c.buildService.GetExtendedBuild(ctx, buildId)
	if err != nil {
		utils.RespondWithError(w, r, "Failed to get build", err)
		return
	}
	if build == nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.BuildNotFoundById,
			Message: exception.BuildNotFoundByIdMsg,
			Params:  map[string]interface{}{"id": buildId},
		})
		return
	}
	utils.RespondWithJson(w, http.StatusOK, build)
}

func (c buildControllerImpl) ListBuilds(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !secctx.IsSysadm(ctx) {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	buildIds, customErr := getListFromParam(r, "buildIds")
	if customErr != nil {
		utils.RespondWithCustomError(w, customErr)
		return
	}
	offset, customErr := getBuildOffsetQueryParam(r)
	if customErr != nil {
		utils.RespondWithCustomError(w, customErr)
		return
	}
	limit, customErr := getLimitQueryParam(r)
	if customErr != nil {
		utils.RespondWithCustomError(w, customErr)
		return
	}

	builds, err := c.buildService.ListExtendedBuilds(ctx, view.ExtendedBuildFilter{
		PackageId: r.URL.Query().Get("packageId"),
		Version:   r.URL.Query().Get("version"),
		BuildIds:  buildIds,
		Offset:    offset,
		Limit:     limit,
	})
	if err != nil {
		utils.RespondWithError(w, r, "Failed to list builds", err)
		return
	}
	utils.RespondWithJson(w, http.StatusOK, builds)
}

func (c buildControllerImpl) GetBuildResult(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !secctx.IsSysadm(ctx) {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	buildId := getStringParam(r, "buildId")
	data, err := c.buildResultService.GetBuildResultData(ctx, buildId)
	if err != nil {
		utils.RespondWithError(w, r, "Failed to get build result", err)
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

func getBuildOffsetQueryParam(r *http.Request) (int, *exception.CustomError) {
	if r.URL.Query().Get("offset") == "" {
		return 0, nil
	}
	offset, err := strconv.Atoi(r.URL.Query().Get("offset"))
	if err != nil {
		return 0, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.IncorrectParamType,
			Message: exception.IncorrectParamTypeMsg,
			Params:  map[string]interface{}{"param": "offset", "type": "int"},
			Debug:   err.Error(),
		}
	}
	if offset < 0 {
		return 0, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"value": offset, "param": "offset"},
		}
	}
	return offset, nil
}

func (c buildControllerImpl) GetBuildSources(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !secctx.IsSysadm(ctx) {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	buildId := getStringParam(r, "buildId")
	data, err := c.buildService.GetBuildSourceData(ctx, buildId)
	if err != nil {
		utils.RespondWithError(w, r, "Failed to get build sources", err)
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
