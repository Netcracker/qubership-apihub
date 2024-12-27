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
	"net/url"
	"strconv"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type UserController interface {
	GetUserAvatar(w http.ResponseWriter, r *http.Request)
	GetUsers(w http.ResponseWriter, r *http.Request)
	GetUserById(w http.ResponseWriter, r *http.Request)
	CreateInternalUser(w http.ResponseWriter, r *http.Request)
	CreatePrivatePackageForUser(w http.ResponseWriter, r *http.Request)
	CreatePrivateUserPackage(w http.ResponseWriter, r *http.Request)
	GetPrivateUserPackage(w http.ResponseWriter, r *http.Request)
}

func NewUserController(service service.UserService, privateUserPackageService service.PrivateUserPackageService, isSysadm func(context.SecurityContext) bool) UserController {
	return &userControllerImpl{
		service:                   service,
		privateUserPackageService: privateUserPackageService,
		isSysadm:                  isSysadm,
	}
}

type userControllerImpl struct {
	service                   service.UserService
	privateUserPackageService service.PrivateUserPackageService
	isSysadm                  func(context.SecurityContext) bool
}

func (u userControllerImpl) GetUserAvatar(w http.ResponseWriter, r *http.Request) {
	userId := getStringParam(r, "userId")
	if userId == "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.EmptyParameter,
			Message: exception.EmptyParameterMsg,
			Params:  map[string]interface{}{"param": "userId"},
		})
	}
	userAvatar, err := u.service.GetUserAvatar(userId)
	if err != nil {
		RespondWithError(w, "Failed to get user avatar", err)
		return
	}
	if userAvatar == nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.UserAvatarNotFound,
			Message: exception.UserAvatarNotFoundMsg,
			Params:  map[string]interface{}{"userId": userId},
		})
		return
	}

	w.Header().Set("Content-Disposition", "filename=\""+"image"+"\"")
	w.Header().Set("Content-Type", "image/png") // TODO: what if avatar is not png?
	w.Header().Set("Content-Length", string(rune(len(userAvatar.Avatar))))
	w.Write(userAvatar.Avatar)
}

func (u userControllerImpl) GetUsers(w http.ResponseWriter, r *http.Request) {
	var err error
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
	filter, err := url.QueryUnescape(r.URL.Query().Get("filter"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "filter"},
			Debug:   err.Error(),
		})
		return
	}

	usersListReq := view.UsersListReq{
		Filter: filter,
		Limit:  limit,
		Page:   page,
	}
	users, err := u.service.GetUsers(usersListReq)
	if err != nil {
		RespondWithError(w, "Failed to get users", err)
		return
	}
	RespondWithJson(w, http.StatusOK, users)
}

func (u userControllerImpl) GetUserById(w http.ResponseWriter, r *http.Request) {
	userId := getStringParam(r, "userId")

	user, err := u.service.GetUserFromDB(userId)
	if err != nil {
		RespondWithError(w, "Failed to get user", err)
		return
	}
	if user == nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.UserNotFound,
			Message: exception.UserNotFoundMsg,
			Params:  map[string]interface{}{"userId": userId},
		})
		return
	}
	RespondWithJson(w, http.StatusOK, user)
}

func (u userControllerImpl) CreateInternalUser(w http.ResponseWriter, r *http.Request) {
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
	var internalUser view.InternalUser
	err = json.Unmarshal(body, &internalUser)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	validationErr := utils.ValidateObject(internalUser)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
			return
		}
	}

	user, err := u.service.CreateInternalUser(&internalUser)
	if err != nil {
		RespondWithError(w, "Failed to create internal user", err)
		return
	}
	RespondWithJson(w, http.StatusCreated, user)
}

func (u userControllerImpl) CreatePrivatePackageForUser(w http.ResponseWriter, r *http.Request) {
	userId := getStringParam(r, "userId")
	ctx := context.Create(r)
	if userId != ctx.GetUserId() {
		if !u.isSysadm(ctx) {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusForbidden,
				Code:    exception.InsufficientPrivileges,
				Message: exception.InsufficientPrivilegesMsg,
				Debug:   "only sysadmin can create private package for another user",
			})
			return
		}
	}
	packageView, err := u.privateUserPackageService.CreatePrivateUserPackage(ctx, userId)
	if err != nil {
		RespondWithError(w, "Failed to create private package for user", err)
		return
	}
	RespondWithJson(w, http.StatusCreated, packageView)
}

func (u userControllerImpl) CreatePrivateUserPackage(w http.ResponseWriter, r *http.Request) {
	ctx := context.Create(r)
	packageView, err := u.privateUserPackageService.CreatePrivateUserPackage(ctx, ctx.GetUserId())
	if err != nil {
		RespondWithError(w, "Failed to create private user package", err)
		return
	}
	RespondWithJson(w, http.StatusCreated, packageView)
}

func (u userControllerImpl) GetPrivateUserPackage(w http.ResponseWriter, r *http.Request) {
	packageView, err := u.privateUserPackageService.GetPrivateUserPackage(context.Create(r).GetUserId())
	if err != nil {
		if customError, ok := err.(*exception.CustomError); ok {
			if customError.Code == exception.PrivateWorkspaceIdDoesntExist {
				// do not use respondWithError because it prints annoying(and useless in this case) logs
				RespondWithCustomError(w, customError)
				return
			}
		}
		RespondWithError(w, "Failed to get private user package", err)
		return
	}
	RespondWithJson(w, http.StatusOK, packageView)
}
