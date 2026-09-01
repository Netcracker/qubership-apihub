package controller

import (
	"encoding/json"
	"io/ioutil"
	"net/http"
	"strconv"

	"github.com/Netcracker/qubership-apihub-agents-backend/exception"
	"github.com/Netcracker/qubership-apihub-agents-backend/responder"
	"github.com/Netcracker/qubership-apihub-agents-backend/secctx"
	"github.com/Netcracker/qubership-apihub-agents-backend/service"
	"github.com/Netcracker/qubership-apihub-agents-backend/view"
)

type SnapshotController interface {
	CreateSnapshot(w http.ResponseWriter, r *http.Request)
	ListSnapshots(w http.ResponseWriter, r *http.Request)
	GetSnapshot(w http.ResponseWriter, r *http.Request)
}

func NewSnapshotController(snapshotService service.SnapshotService, agentService service.AgentService, resp *responder.Responder) SnapshotController {
	return snapshotControllerImpl{snapshotService: snapshotService, agentService: agentService, responder: resp}
}

type snapshotControllerImpl struct {
	snapshotService service.SnapshotService
	agentService    service.AgentService
	responder       *responder.Responder
}

func (s snapshotControllerImpl) CreateSnapshot(w http.ResponseWriter, r *http.Request) {
	var err error
	namespace := getStringParam(r, "namespace")
	agentId := getStringParam(r, "agentId")
	workspaceId := getStringParam(r, "workspaceId")
	agent, err := s.agentService.GetAgent(agentId)
	if err != nil {
		if customError, ok := err.(*exception.CustomError); ok {
			s.responder.RespondWithCustomError(w, customError)
		} else {
			s.responder.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get agent by id - '$id'",
				Debug:   err.Error(),
				Params:  map[string]interface{}{"id": agentId}})
		}
		return
	}
	if agent == nil {
		s.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.AgentNotFound,
			Message: exception.AgentNotFoundMsg,
			Params:  map[string]interface{}{"id": agentId}})
		return
	}

	clientBuild := false
	clientBuildStr := r.URL.Query().Get("clientBuild")
	if clientBuildStr != "" {
		clientBuild, err = strconv.ParseBool(clientBuildStr)
		if err != nil {
			s.responder.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidParameter,
				Message: exception.InvalidParameterMsg,
				Params:  map[string]interface{}{"param": "clientBuild"},
				Debug:   err.Error(),
			})
			return
		}
	}

	promote := false
	promoteStr := r.URL.Query().Get("promote")
	if promoteStr != "" {
		promote, err = strconv.ParseBool(promoteStr)
		if err != nil {
			s.responder.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidParameter,
				Message: exception.InvalidParameterMsg,
				Params:  map[string]interface{}{"param": "promote"},
				Debug:   err.Error(),
			})
			return
		}
	}

	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		s.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	var req view.CreateSnapshotRequest
	err = json.Unmarshal(body, &req)
	if err != nil {
		s.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}

	if clientBuild && req.BuilderId == "" {
		s.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.RequiredParamsMissing,
			Message: exception.RequiredParamsMissingMsg,
			Params:  map[string]interface{}{"params": "builderId"},
		})
		return
	}

	if req.Version == "" {
		s.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.RequiredParamsMissing,
			Message: exception.RequiredParamsMissingMsg,
			Params:  map[string]interface{}{"params": "version"},
		})
		return
	}

	status := string(view.DraftStatus)
	if req.Status != "" {
		status = req.Status
	}

	snapshotDTO := view.CreateSnapshotDTO{
		PreviousVersion: req.PreviousVersion,
		Services:        req.Services,
		ClientBuild:     clientBuild,
		BuilderId:       req.BuilderId,
		Promote:         promote,
		VersionStatus:   status,
		AgentUrl:        agent.AgentUrl,
		CloudName:       agent.AgentDeploymentCloud,
	}

	resp, err := s.snapshotService.CreateSnapshot(secctx.MakeUserContext(r), namespace, workspaceId, req.Version, snapshotDTO)
	if err != nil {
		s.responder.RespondWithError(w, "Failed to create snapshot", err)
		return
	}
	s.responder.RespondWithJson(w, http.StatusOK, resp)
}

func (s snapshotControllerImpl) ListSnapshots(w http.ResponseWriter, r *http.Request) {
	namespace := getStringParam(r, "namespace")
	workspaceId := getStringParam(r, "workspaceId")
	var err error
	page := 0
	if r.URL.Query().Get("page") != "" {
		page, err = strconv.Atoi(r.URL.Query().Get("page"))
		if err != nil {
			s.responder.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "page", "type": "int"},
				Debug:   err.Error(),
			})
			return
		}
	}

	limit := 100
	if r.URL.Query().Get("limit") != "" {
		limit, err = strconv.Atoi(r.URL.Query().Get("limit"))
		if err != nil {
			s.responder.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "limit", "type": "int"},
				Debug:   err.Error(),
			})
			return
		}
	}

	agentId := getStringParam(r, "agentId")
	agent, err := s.agentService.GetAgent(agentId)
	if err != nil {
		if customError, ok := err.(*exception.CustomError); ok {
			s.responder.RespondWithCustomError(w, customError)
		} else {
			s.responder.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get agent by id - '$id'",
				Debug:   err.Error(),
				Params:  map[string]interface{}{"id": agentId}})
		}
		return
	}
	if agent == nil {
		s.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.AgentNotFound,
			Message: exception.AgentNotFoundMsg,
			Params:  map[string]interface{}{"id": agentId}})
		return
	}

	snapshots, err := s.snapshotService.ListSnapshots(secctx.MakeUserContext(r), namespace, workspaceId, page, limit, agent.AgentDeploymentCloud)
	if err != nil {
		s.responder.RespondWithError(w, "Failed to list snapshots", err)
		return
	}

	s.responder.RespondWithJson(w, http.StatusOK, snapshots)
}

func (s snapshotControllerImpl) GetSnapshot(w http.ResponseWriter, r *http.Request) {
	namespace := getStringParam(r, "namespace")
	agentId := getStringParam(r, "agentId")
	workspaceId := getStringParam(r, "workspaceId")
	version := getStringParam(r, "version")
	agent, err := s.agentService.GetAgent(agentId)
	if err != nil {
		if customError, ok := err.(*exception.CustomError); ok {
			s.responder.RespondWithCustomError(w, customError)
		} else {
			s.responder.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get agent by id - '$id'",
				Debug:   err.Error(),
				Params:  map[string]interface{}{"id": agentId}})
		}
		return
	}
	if agent == nil {
		s.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.AgentNotFound,
			Message: exception.AgentNotFoundMsg,
			Params:  map[string]interface{}{"id": agentId}})
		return
	}

	sn, err := s.snapshotService.GetSnapshot(secctx.MakeUserContext(r), namespace, workspaceId, version, agent.AgentDeploymentCloud)
	if err != nil {
		s.responder.RespondWithError(w, "Failed to get snapshot", err)
		return
	}

	if sn == nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	s.responder.RespondWithJson(w, http.StatusOK, sn)
}
