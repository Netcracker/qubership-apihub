package controller

import (
	"fmt"
	"net/http"
	"net/url"
	"strconv"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/secctx"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type ActivityTrackingController interface {
	GetActivityHistory(w http.ResponseWriter, r *http.Request)
	GetActivityHistoryForPackage(w http.ResponseWriter, r *http.Request)
}

func NewActivityTrackingController(activityTrackingService service.ActivityTrackingService, roleService service.RoleService, ptHandler service.PackageTransitionHandler) ActivityTrackingController {
	return &activityTrackingControllerImpl{activityTrackingService: activityTrackingService, roleService: roleService, ptHandler: ptHandler}
}

type activityTrackingControllerImpl struct {
	activityTrackingService service.ActivityTrackingService
	roleService             service.RoleService
	ptHandler               service.PackageTransitionHandler
}

func (a activityTrackingControllerImpl) GetActivityHistory(w http.ResponseWriter, r *http.Request) {
	var err error
	onlyFavorite := false
	onlyFavoriteStr := r.URL.Query().Get("onlyFavorite")
	if onlyFavoriteStr != "" {
		onlyFavorite, err = strconv.ParseBool(onlyFavoriteStr)
		if err != nil {
			utils.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "onlyFavorite", "type": "bool"},
				Debug:   err.Error(),
			})
			return
		}
	}

	textFilter, err := url.QueryUnescape(r.URL.Query().Get("textFilter"))
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "textFilter"},
			Debug:   err.Error(),
		})
		return
	}

	limit, customError := getLimitQueryParam(r)
	if customError != nil {
		utils.RespondWithCustomError(w, customError)
		return
	}

	page := 0
	if r.URL.Query().Get("page") != "" {
		page, err = strconv.Atoi(r.URL.Query().Get("page"))
		if err != nil {
			utils.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "page", "type": "int"},
				Debug:   err.Error(),
			})
			return
		}
	}

	types, customErr := getListFromParam(r, "types")
	if customErr != nil {
		utils.RespondWithCustomError(w, customErr)
		return
	}

	onlyShared := false
	if r.URL.Query().Get("onlyShared") != "" {
		onlyShared, err = strconv.ParseBool(r.URL.Query().Get("onlyShared"))
		if err != nil {
			utils.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "onlyShared", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}

	kind, customErr := getListFromParam(r, "kind")
	if customErr != nil {
		utils.RespondWithCustomError(w, customErr)
		return
	}

	ctx := secctx.MakeUserContext(r)
	scope, err := a.roleService.GetPackageReadScope(ctx)
	if err != nil {
		utils.RespondWithError(w, r, "Failed to resolve activity read scope", err)
		return
	}

	activityHistoryReq := view.ActivityHistoryReq{
		OnlyFavorite: onlyFavorite,
		TextFilter:   textFilter,
		Types:        types,
		OnlyShared:   onlyShared,
		Kind:         kind,
		Limit:        limit,
		Page:         page,
	}
	result, err := a.activityTrackingService.GetActivityHistory(ctx, activityHistoryReq, scope)
	if err != nil {
		utils.RespondWithError(w, r, "Failed to get activity events", err)
		return
	}
	utils.RespondWithJson(w, http.StatusOK, result)
}

func (a activityTrackingControllerImpl) GetActivityHistoryForPackage(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := secctx.MakeUserContext(r)
	sufficientPrivileges, err := a.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, a.ptHandler, packageId, "Failed to check user privileges", err)
		return
	}
	if !sufficientPrivileges {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	includeRefs := false
	includeRefsStr := r.URL.Query().Get("includeRefs")
	if includeRefsStr != "" {
		includeRefs, err = strconv.ParseBool(includeRefsStr)
		if err != nil {
			utils.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "includeRefs", "type": "bool"},
				Debug:   err.Error(),
			})
			return
		}
	}

	textFilter, err := url.QueryUnescape(r.URL.Query().Get("textFilter"))
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "textFilter"},
			Debug:   err.Error(),
		})
		return
	}

	limit, customError := getLimitQueryParam(r)
	if customError != nil {
		utils.RespondWithCustomError(w, customError)
		return
	}

	page := 0
	if r.URL.Query().Get("page") != "" {
		page, err = strconv.Atoi(r.URL.Query().Get("page"))
		if err != nil {
			utils.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "page", "type": "int"},
				Debug:   err.Error(),
			})
			return
		}
	}

	types, customErr := getListFromParam(r, "types")
	if customErr != nil {
		utils.RespondWithCustomError(w, customErr)
		return
	}

	activityHistoryReq := view.ActivityHistoryReq{
		TextFilter: textFilter,
		Types:      types,
		Limit:      limit,
		Page:       page,
	}
	result, err := a.activityTrackingService.GetEventsForPackage(ctx, packageId, includeRefs, activityHistoryReq)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, a.ptHandler, packageId, fmt.Sprintf("Failed to get activity events for package %s", packageId), err)
		return
	}
	utils.RespondWithJson(w, http.StatusOK, result)
}
