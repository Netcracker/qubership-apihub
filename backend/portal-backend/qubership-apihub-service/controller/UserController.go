package controller

import (
	"encoding/json"
	"io/ioutil"
	"net/http"
	"net/url"
	"strconv"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/responder"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/secctx"
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
	GetExtendedUser_deprecated(w http.ResponseWriter, r *http.Request)
	GetExtendedUser(w http.ResponseWriter, r *http.Request)
}

func NewUserController(service service.UserService, privateUserPackageService service.PrivateUserPackageService, roleService service.RoleService, responder responder.Responder) UserController {
	return &userControllerImpl{
		service:                   service,
		privateUserPackageService: privateUserPackageService,
		roleService:               roleService,
		responder:                 responder,
	}
}

type userControllerImpl struct {
	service                   service.UserService
	privateUserPackageService service.PrivateUserPackageService
	roleService               service.RoleService
	responder                 responder.Responder
}

func (u userControllerImpl) GetUserAvatar(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userId := getStringParam(r, "userId")
	if userId == "" {
		u.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.EmptyParameter,
			Message: exception.EmptyParameterMsg,
			Params:  map[string]interface{}{"param": "userId"},
		})
	}
	userAvatar, err := u.service.GetUserAvatar(ctx, userId)
	if err != nil {
		u.responder.RespondWithError(w, r, "Failed to get user avatar", err)
		return
	}
	if userAvatar == nil {
		u.responder.RespondWithCustomError(w, &exception.CustomError{
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
	ctx := secctx.MakeUserContext(r)
	sufficientPrivileges, err := u.roleService.HasRequiredPermissionsAcrossAllPackages(ctx, view.UserAccessManagementPermission)
	if err != nil {
		u.responder.RespondWithError(w, r, "Failed to check user privileges", err)
		return
	}
	if !sufficientPrivileges {
		u.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	limit, customError := getLimitQueryParam(r)
	if customError != nil {
		u.responder.RespondWithCustomError(w, customError)
		return
	}

	page := 0
	if r.URL.Query().Get("page") != "" {
		page, err = strconv.Atoi(r.URL.Query().Get("page"))
		if err != nil {
			u.responder.RespondWithCustomError(w, &exception.CustomError{
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
		u.responder.RespondWithCustomError(w, &exception.CustomError{
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
	users, err := u.service.GetUsers(ctx, usersListReq)
	if err != nil {
		u.responder.RespondWithError(w, r, "Failed to get users", err)
		return
	}
	u.responder.RespondWithJson(w, http.StatusOK, users)
}

func (u userControllerImpl) GetUserById(w http.ResponseWriter, r *http.Request) {
	userId := getStringParam(r, "userId")
	ctx := secctx.MakeUserContext(r)
	if userId != secctx.GetUserId(ctx) {
		sufficientPrivileges, err := u.roleService.HasRequiredPermissionsAcrossAllPackages(ctx, view.UserAccessManagementPermission)
		if err != nil {
			u.responder.RespondWithError(w, r, "Failed to check user privileges", err)
			return
		}
		if !sufficientPrivileges {
			u.responder.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusForbidden,
				Code:    exception.InsufficientPrivileges,
				Message: exception.InsufficientPrivilegesMsg,
			})
			return
		}
	}

	user, err := u.service.GetUserFromDB(ctx, userId)
	if err != nil {
		u.responder.RespondWithError(w, r, "Failed to get user", err)
		return
	}
	if user == nil {
		u.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.UserNotFound,
			Message: exception.UserNotFoundMsg,
			Params:  map[string]interface{}{"userId": userId},
		})
		return
	}
	u.responder.RespondWithJson(w, http.StatusOK, user)
}

func (u userControllerImpl) CreateInternalUser(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		u.responder.RespondWithCustomError(w, &exception.CustomError{
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
		u.responder.RespondWithCustomError(w, &exception.CustomError{
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
			u.responder.RespondWithCustomError(w, customError)
			return
		}
	}

	user, err := u.service.CreateInternalUser(ctx, &internalUser)
	if err != nil {
		u.responder.RespondWithError(w, r, "Failed to create internal user", err)
		return
	}
	u.responder.RespondWithJson(w, http.StatusCreated, user)
}

func (u userControllerImpl) CreatePrivatePackageForUser(w http.ResponseWriter, r *http.Request) {
	userId := getStringParam(r, "userId")
	ctx := secctx.MakeUserContext(r)
	if userId != secctx.GetUserId(ctx) {
		if !secctx.IsSysadm(ctx) {
			u.responder.RespondWithCustomError(w, &exception.CustomError{
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
		u.responder.RespondWithError(w, r, "Failed to create private package for user", err)
		return
	}
	u.responder.RespondWithJson(w, http.StatusCreated, packageView)
}

func (u userControllerImpl) CreatePrivateUserPackage(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	packageView, err := u.privateUserPackageService.CreatePrivateUserPackage(ctx, secctx.GetUserId(ctx))
	if err != nil {
		u.responder.RespondWithError(w, r, "Failed to create private user package", err)
		return
	}
	u.responder.RespondWithJson(w, http.StatusCreated, packageView)
}

func (u userControllerImpl) GetPrivateUserPackage(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	packageView, err := u.privateUserPackageService.GetPrivateUserPackage(ctx, secctx.GetUserId(ctx))
	if err != nil {
		if customError, ok := err.(*exception.CustomError); ok {
			if customError.Code == exception.PrivateWorkspaceIdDoesntExist {
				// do not use respondWithError because it prints annoying(and useless in this case) logs
				u.responder.RespondWithCustomError(w, customError)
				return
			}
		}
		u.responder.RespondWithError(w, r, "Failed to get private user package", err)
		return
	}
	u.responder.RespondWithJson(w, http.StatusOK, packageView)
}

func (u userControllerImpl) GetExtendedUser_deprecated(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	extendedUser, err := u.service.GetExtendedUser_deprecated(ctx)
	if err != nil {
		u.responder.RespondWithError(w, r, "Failed to get user", err)
		return
	}
	if extendedUser == nil {
		u.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.UserNotFound,
			Message: exception.UserNotFoundMsg,
			Params:  map[string]interface{}{"userId": secctx.GetUserId(ctx)},
		})
		return
	}
	u.responder.RespondWithJson(w, http.StatusOK, extendedUser)
}

func (u userControllerImpl) GetExtendedUser(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	extendedUser, err := u.service.GetExtendedUser(ctx)
	if err != nil {
		u.responder.RespondWithError(w, r, "Failed to get user", err)
		return
	}
	if extendedUser == nil {
		u.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.UserNotFound,
			Message: exception.UserNotFoundMsg,
			Params:  map[string]interface{}{"userId": secctx.GetUserId(ctx)},
		})
		return
	}
	u.responder.RespondWithJson(w, http.StatusOK, extendedUser)
}
