package controller

import (
	"encoding/json"
	"io/ioutil"
	"net/http"
	"strconv"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/responder"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/secctx"
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

func NewTransitionController(tService service.TransitionService, responder responder.Responder) TransitionController {
	return &transitionControllerImpl{
		tService:  tService,
		responder: responder,
	}
}

type transitionControllerImpl struct {
	tService  service.TransitionService
	responder responder.Responder
}

func (t transitionControllerImpl) MoveOrRenamePackage(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !secctx.IsSysadm(ctx) {
		t.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		t.responder.RespondWithCustomError(w, &exception.CustomError{
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
		t.responder.RespondWithCustomError(w, &exception.CustomError{
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
			t.responder.RespondWithCustomError(w, customError)
			return
		}
	}

	id, err := t.tService.MoveOrRenamePackage(ctx, transitionReq.From, transitionReq.To, transitionReq.OverwriteHistory)
	if err != nil {
		t.responder.RespondWithError(w, r, "Failed to move or rename package", err)
		return
	}
	result := map[string]interface{}{}
	result["id"] = id
	t.responder.RespondWithJson(w, http.StatusOK, result)
}

func (t transitionControllerImpl) GetMoveStatus(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !secctx.IsSysadm(ctx) {
		t.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	id := getStringParam(r, "id")

	status, err := t.tService.GetMoveStatus(ctx, id)
	if err != nil {
		t.responder.RespondWithError(w, r, "Failed to get transition status", err)
		return
	}
	t.responder.RespondWithJson(w, http.StatusOK, status)
}

func (t transitionControllerImpl) ListActivities(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !secctx.IsSysadm(ctx) {
		t.responder.RespondWithCustomError(w, &exception.CustomError{
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
			t.responder.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "offset", "type": "int"},
				Debug:   err.Error(),
			})
		}
		if offset < 0 {
			t.responder.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidParameterValue,
				Message: exception.InvalidParameterValueMsg,
				Params:  map[string]interface{}{"value": offset, "param": "offset"},
			})
		}
	}

	limit, customErr := getLimitQueryParam(r)
	if customErr != nil {
		t.responder.RespondWithCustomError(w, customErr)
		return
	}

	list, err := t.tService.ListCompletedActivities(ctx, offset, limit)
	if err != nil {
		t.responder.RespondWithError(w, r, "Failed to list transition activities", err)
		return
	}
	t.responder.RespondWithJson(w, http.StatusOK, list)
}

func (t transitionControllerImpl) ListPackageTransitions(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !secctx.IsSysadm(ctx) {
		t.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	list, err := t.tService.ListPackageTransitions(ctx)
	if err != nil {
		t.responder.RespondWithError(w, r, "Failed to list package transitions", err)
		return
	}
	t.responder.RespondWithJson(w, http.StatusOK, list)
}
