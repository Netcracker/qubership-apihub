package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub-agents-backend/client"
	"github.com/Netcracker/qubership-apihub-agents-backend/exception"
	"github.com/Netcracker/qubership-apihub-agents-backend/responder"
	"github.com/Netcracker/qubership-apihub-agents-backend/secctx"
	"github.com/Netcracker/qubership-apihub-agents-backend/service"
)

type SpecificationsController interface {
	GetServiceSpecification(w http.ResponseWriter, r *http.Request)
}

func NewSpecificationsController(agentClient client.AgentClient, agentService service.AgentService, resp *responder.Responder) SpecificationsController {
	return specificationsControllerImpl{agentClient: agentClient, agentService: agentService, responder: resp}
}

type specificationsControllerImpl struct {
	agentClient  client.AgentClient
	agentService service.AgentService
	responder    *responder.Responder
}

func (s specificationsControllerImpl) GetServiceSpecification(w http.ResponseWriter, r *http.Request) {
	agentId := getStringParam(r, "agentId")
	namespace := getStringParam(r, "namespace")
	workspaceId := getStringParam(r, "workspaceId")
	serviceId, err := getUnescapedStringParam(r, "serviceId")
	if err != nil {
		s.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "serviceId"},
			Debug:   err.Error(),
		})
		return
	}
	fileId, err := getUnescapedStringParam(r, "fileId")
	if err != nil {
		s.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "fileId"},
			Debug:   err.Error(),
		})
		return
	}
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
	services := r.URL.Query().Get("services")

	specBytes, err := s.agentClient.GetServiceSpecification(secctx.MakeUserContext(r), namespace, workspaceId, serviceId, fileId, agent.AgentUrl, services)
	if err != nil {
		s.responder.RespondWithError(w, "Failed to get specification", err)
		return
	}

	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusOK)
	w.Write(specBytes)
}
