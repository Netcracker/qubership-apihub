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

package controller

import (
	"fmt"
	"net/http"
	"net/url"
	"strconv"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	log "github.com/sirupsen/logrus"
)

type ActivityTrackingController interface {
	GetActivityHistory_deprecated(w http.ResponseWriter, r *http.Request)
	GetActivityHistory(w http.ResponseWriter, r *http.Request)
	GetActivityHistoryForPackage_deprecated(w http.ResponseWriter, r *http.Request)
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

func (a activityTrackingControllerImpl) GetActivityHistory_deprecated(w http.ResponseWriter, r *http.Request) {
	var err error
	onlyFavorite := false
	onlyFavoriteStr := r.URL.Query().Get("onlyFavorite")
	if onlyFavoriteStr != "" {
		onlyFavorite, err = strconv.ParseBool(onlyFavoriteStr)
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
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
		RespondWithCustomError(w, &exception.CustomError{
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
		RespondWithCustomError(w, customError)
		return
	}

	page := 0
	if r.URL.Query().Get("page") != "" {
		page, err = strconv.Atoi(r.URL.Query().Get("page"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
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
		RespondWithCustomError(w, customErr)
		return
	}

	onlyShared := false
	if r.URL.Query().Get("onlyShared") != "" {
		onlyShared, err = strconv.ParseBool(r.URL.Query().Get("onlyShared"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
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
		RespondWithCustomError(w, customErr)
		return
	}

	// TODO: role check?
	activityHistoryReq := view.ActivityHistoryReq{
		OnlyFavorite: onlyFavorite,
		TextFilter:   textFilter,
		Types:        types,
		OnlyShared:   onlyShared,
		Kind:         kind,
		Limit:        limit,
		Page:         page,
	}
	result, err := a.activityTrackingService.GetActivityHistory_deprecated(context.Create(r), activityHistoryReq)
	if err != nil {
		log.Error("Failed to get activity events for favourite packages: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get activity events",
				Debug:   err.Error()})
		}
		return
	}
	RespondWithJson(w, http.StatusOK, result)
}

func (a activityTrackingControllerImpl) GetActivityHistory(w http.ResponseWriter, r *http.Request) {
	var err error
	onlyFavorite := false
	onlyFavoriteStr := r.URL.Query().Get("onlyFavorite")
	if onlyFavoriteStr != "" {
		onlyFavorite, err = strconv.ParseBool(onlyFavoriteStr)
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
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
		RespondWithCustomError(w, &exception.CustomError{
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
		RespondWithCustomError(w, customError)
		return
	}

	page := 0
	if r.URL.Query().Get("page") != "" {
		page, err = strconv.Atoi(r.URL.Query().Get("page"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
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
		RespondWithCustomError(w, customErr)
		return
	}

	onlyShared := false
	if r.URL.Query().Get("onlyShared") != "" {
		onlyShared, err = strconv.ParseBool(r.URL.Query().Get("onlyShared"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
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
		RespondWithCustomError(w, customErr)
		return
	}

	// TODO: role check?
	activityHistoryReq := view.ActivityHistoryReq{
		OnlyFavorite: onlyFavorite,
		TextFilter:   textFilter,
		Types:        types,
		OnlyShared:   onlyShared,
		Kind:         kind,
		Limit:        limit,
		Page:         page,
	}
	result, err := a.activityTrackingService.GetActivityHistory(context.Create(r), activityHistoryReq)
	if err != nil {
		log.Error("Failed to get activity events for favourite packages: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get activity events",
				Debug:   err.Error()})
		}
		return
	}
	RespondWithJson(w, http.StatusOK, result)
}

func (a activityTrackingControllerImpl) GetActivityHistoryForPackage_deprecated(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := a.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, a.ptHandler, packageId, "Failed to check user privileges", err)
		return
	}
	if !sufficientPrivileges {
		RespondWithCustomError(w, &exception.CustomError{
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
			RespondWithCustomError(w, &exception.CustomError{
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
		RespondWithCustomError(w, &exception.CustomError{
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
		RespondWithCustomError(w, customError)
		return
	}

	page := 0
	if r.URL.Query().Get("page") != "" {
		page, err = strconv.Atoi(r.URL.Query().Get("page"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
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
		RespondWithCustomError(w, customErr)
		return
	}

	result, err := a.activityTrackingService.GetEventsForPackage_deprecated(packageId, includeRefs, limit, page, textFilter, types)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, a.ptHandler, packageId, fmt.Sprintf("Failed to get activity events for package %s", packageId), err)
		return
	}
	RespondWithJson(w, http.StatusOK, result)
}

func (a activityTrackingControllerImpl) GetActivityHistoryForPackage(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := a.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, a.ptHandler, packageId, "Failed to check user privileges", err)
		return
	}
	if !sufficientPrivileges {
		RespondWithCustomError(w, &exception.CustomError{
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
			RespondWithCustomError(w, &exception.CustomError{
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
		RespondWithCustomError(w, &exception.CustomError{
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
		RespondWithCustomError(w, customError)
		return
	}

	page := 0
	if r.URL.Query().Get("page") != "" {
		page, err = strconv.Atoi(r.URL.Query().Get("page"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
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
		RespondWithCustomError(w, customErr)
		return
	}

	result, err := a.activityTrackingService.GetEventsForPackage(packageId, includeRefs, limit, page, textFilter, types)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, a.ptHandler, packageId, fmt.Sprintf("Failed to get activity events for package %s", packageId), err)
		return
	}
	RespondWithJson(w, http.StatusOK, result)
}
