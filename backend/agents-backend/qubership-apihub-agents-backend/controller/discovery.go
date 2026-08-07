package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub-agents-backend/secctx"
	"github.com/Netcracker/qubership-apihub-agents-backend/service"
)

type DiscoveryController interface {
	StartDiscovery(w http.ResponseWriter, r *http.Request)
	ListDiscoveredServices_deprecated(w http.ResponseWriter, r *http.Request)
	ListDiscoveredServices(w http.ResponseWriter, r *http.Request)
}

func NewDiscoveryController(discoveryService service.DiscoveryService) DiscoveryController {
	return &discoveryControllerImpl{
		discoveryService: discoveryService,
	}
}

type discoveryControllerImpl struct {
	discoveryService service.DiscoveryService
}

func (d discoveryControllerImpl) StartDiscovery(w http.ResponseWriter, r *http.Request) {
	namespace := getStringParam(r, "namespace")
	agentId := getStringParam(r, "agentId")
	workspaceId := getStringParam(r, "workspaceId")

	failOnError, queryParamErr := getFailOnErrorQueryParam(r)
	if queryParamErr != nil {
		respondWithError(w, "failed to parse failOnError query param", queryParamErr)
		return
	}

	req, bodyErr := getDiscoveryRequestBody(w, r)
	if bodyErr != nil {
		respondWithError(w, "failed to parse discovery request body", bodyErr)
		return
	}

	err := d.discoveryService.StartDiscovery(secctx.MakeUserContext(r), agentId, namespace, workspaceId, failOnError, req)
	if err != nil {
		respondWithError(w, "failed to start discovery process", err)
		return
	}
	w.WriteHeader(http.StatusAccepted)
}

func (d discoveryControllerImpl) ListDiscoveredServices_deprecated(w http.ResponseWriter, r *http.Request) {
	namespace := getStringParam(r, "namespace")
	agentId := getStringParam(r, "agentId")
	workspaceId := getStringParam(r, "workspaceId")

	serviceList, err := d.discoveryService.GetDiscoveredServices_deprecated(secctx.MakeUserContext(r), agentId, namespace, workspaceId)
	if err != nil {
		respondWithError(w, "failed to list discovered services", err)
		return
	}
	respondWithJson(w, http.StatusOK, serviceList)
}

func (d discoveryControllerImpl) ListDiscoveredServices(w http.ResponseWriter, r *http.Request) {
	namespace := getStringParam(r, "namespace")
	agentId := getStringParam(r, "agentId")
	workspaceId := getStringParam(r, "workspaceId")
	services := r.URL.Query().Get("services")

	serviceList, err := d.discoveryService.GetDiscoveredServices(secctx.MakeUserContext(r), agentId, namespace, workspaceId, services)
	if err != nil {
		respondWithError(w, "failed to list discovered services", err)
		return
	}
	respondWithJson(w, http.StatusOK, serviceList)
}
