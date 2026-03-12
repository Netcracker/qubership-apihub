package controller

import (
	"encoding/json"
	"io/ioutil"
	"net/http"
	"strconv"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type TransitionController interface {
	MoveOrRenamePackage(w http.ResponseWriter, r *http.Request)
	GetMoveStatus(w http.ResponseWriter, r *http.Request)
	ListActivities(w http.ResponseWriter, r *http.Request)
	ListPackageTransitions(w http.ResponseWriter, r *http.Request)
}

func NewTransitionController(tService service.TransitionService, isSysadmFunc func(context.SecurityContext) bool) TransitionController {
	return &transitionControllerImpl{
		tService:     tService,
		isSysadmFunc: isSysadmFunc,
	}
}

type transitionControllerImpl struct {
	tService     service.TransitionService
	isSysadmFunc func(context.SecurityContext) bool
}

func (t transitionControllerImpl) MoveOrRenamePackage(w http.ResponseWriter, r *http.Request) {
	ctx := context.Create(r)
	if !t.isSysadmFunc(ctx) {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}

	var transitionReq view.TransitionRequest
	err = json.Unmarshal(body, &transitionReq)
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	validationErr := utils.ValidateObject(transitionReq)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			utils.RespondWithCustomError(w, customError)
			return
		}
	}

	id, err := t.tService.MoveOrRenamePackage(ctx, transitionReq.From, transitionReq.To, transitionReq.OverwriteHistory)
	if err != nil {
		utils.RespondWithError(w, "Failed to move or rename package", err)
		return
	}
	result := map[string]interface{}{}
	result["id"] = id
	utils.RespondWithJson(w, http.StatusOK, result)
}

func (t transitionControllerImpl) GetMoveStatus(w http.ResponseWriter, r *http.Request) {
	ctx := context.Create(r)
	if !t.isSysadmFunc(ctx) {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	id := getStringParam(r, "id")

	status, err := t.tService.GetMoveStatus(id)
	if err != nil {
		utils.RespondWithError(w, "Failed to get transition status", err)
		return
	}
	utils.RespondWithJson(w, http.StatusOK, status)
}

func (t transitionControllerImpl) ListActivities(w http.ResponseWriter, r *http.Request) {
	ctx := context.Create(r)
	if !t.isSysadmFunc(ctx) {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	var offset int
	if r.URL.Query().Get("offset") != "" {
		var err error
		offset, err = strconv.Atoi(r.URL.Query().Get("offset"))
		if err != nil {
			utils.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "offset", "type": "int"},
				Debug:   err.Error(),
			})
		}
		if offset < 0 {
			utils.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidParameterValue,
				Message: exception.InvalidParameterValueMsg,
				Params:  map[string]interface{}{"value": offset, "param": "offset"},
			})
		}
	}

	limit, customErr := getLimitQueryParam(r)
	if customErr != nil {
		utils.RespondWithCustomError(w, customErr)
		return
	}

	list, err := t.tService.ListCompletedActivities(offset, limit)
	if err != nil {
		utils.RespondWithError(w, "Failed to list transition activities", err)
		return
	}
	utils.RespondWithJson(w, http.StatusOK, list)
}

func (t transitionControllerImpl) ListPackageTransitions(w http.ResponseWriter, r *http.Request) {
	ctx := context.Create(r)
	if !t.isSysadmFunc(ctx) {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	list, err := t.tService.ListPackageTransitions()
	if err != nil {
		utils.RespondWithError(w, "Failed to list package transitions", err)
		return
	}
	utils.RespondWithJson(w, http.StatusOK, list)
}
