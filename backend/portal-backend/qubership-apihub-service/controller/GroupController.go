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
	"encoding/json"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	log "github.com/sirupsen/logrus"
)

type GroupController interface {
	AddGroup(w http.ResponseWriter, r *http.Request)
	GetAllGroups(w http.ResponseWriter, r *http.Request)
	GetGroupInfo(w http.ResponseWriter, r *http.Request)
	FavorGroup(w http.ResponseWriter, r *http.Request)
	DisfavorGroup(w http.ResponseWriter, r *http.Request)
}

func NewGroupController(service service.GroupService, publishedService service.PublishedService, roleService service.RoleService) GroupController {
	return &groupControllerImpl{service: service, publishedService: publishedService, roleService: roleService}
}

type groupControllerImpl struct {
	service          service.GroupService
	publishedService service.PublishedService
	roleService      service.RoleService
}

func (g groupControllerImpl) AddGroup(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	var group view.Group
	err = json.Unmarshal(body, &group)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}

	ctx := context.Create(r)
	var sufficientPrivileges bool
	if group.ParentId == "" {
		sufficientPrivileges = g.roleService.IsSysadm(ctx)
	} else {
		sufficientPrivileges, err = g.roleService.HasRequiredPermissions(ctx, group.ParentId, view.CreateAndUpdatePackagePermission)
		if err != nil {
			RespondWithError(w, "Failed to check user privileges", err)
			return
		}
	}
	if !sufficientPrivileges {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	validationErr := utils.ValidateObject(group)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
			return
		}
	}

	if !IsAcceptableAlias(group.Alias) {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.AliasContainsForbiddenChars,
			Message: exception.AliasContainsForbiddenCharsMsg,
		})
		return
	}

	if !strings.Contains(group.ParentId, ".") && strings.ToLower(group.Alias) == "runenv" && !g.roleService.IsSysadm(ctx) {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.AliasContainsRunenvChars,
			Message: exception.AliasContainsRunenvCharsMsg,
		})
		return
	}

	newGroup, err := g.service.AddGroup(context.Create(r), &group)
	if err != nil {
		log.Error("Failed to add group: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to add group",
				Debug:   err.Error()})
		}
		return
	}
	RespondWithJson(w, http.StatusCreated, newGroup)
}

func (g groupControllerImpl) GetAllGroups(w http.ResponseWriter, r *http.Request) {
	depth := 1
	var err error
	if r.URL.Query().Get("depth") != "" {
		depth, err = strconv.Atoi(r.URL.Query().Get("depth"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "depth", "type": "int"},
				Debug:   err.Error()})
			return
		}
	}

	onlyFavoriteStr := r.URL.Query().Get("onlyFavorite")
	onlyFavorite := false
	if onlyFavoriteStr != "" {
		onlyFavorite, err = strconv.ParseBool(onlyFavoriteStr)
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "onlyFavorite", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}

	groupId := r.URL.Query().Get("groupId")
	groupName := r.URL.Query().Get("name")

	groups, err := g.service.GetAllGroups(context.Create(r), depth, groupId, groupName, onlyFavorite)
	if err != nil {
		log.Error("Failed to get all groups: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get all groups",
				Debug:   err.Error()})
		}
		return
	}
	RespondWithJson(w, http.StatusOK, groups)
}

func (g groupControllerImpl) GetGroupInfo(w http.ResponseWriter, r *http.Request) {
	groupId := getStringParam(r, "groupId")

	groupInfo, err := g.service.GetGroupInfo(context.Create(r), groupId)
	if err != nil {
		log.Error("Failed to get group info: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get group info",
				Debug:   err.Error()})
		}
		return
	}
	RespondWithJson(w, http.StatusOK, groupInfo)
}

func (g groupControllerImpl) FavorGroup(w http.ResponseWriter, r *http.Request) {
	groupId := getStringParam(r, "groupId")

	err := g.service.FavorGroup(context.Create(r), groupId)
	if err != nil {
		log.Error("Failed to add group to favorites: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to add group to favorites",
				Debug:   err.Error()})
		}
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (g groupControllerImpl) DisfavorGroup(w http.ResponseWriter, r *http.Request) {
	groupId := getStringParam(r, "groupId")

	err := g.service.DisfavorGroup(context.Create(r), groupId)
	if err != nil {
		log.Error("Failed to remove group from favorites: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to remove group from favorites",
				Debug:   err.Error()})
		}
		return
	}
	w.WriteHeader(http.StatusOK)
}
