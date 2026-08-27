package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub-agent/secctx"
	"github.com/Netcracker/qubership-apihub-agent/service"
	"github.com/Netcracker/qubership-apihub-agent/view"
)

type ServiceController interface {
	ListServices_deprecated(w http.ResponseWriter, r *http.Request)
	ListServices(w http.ResponseWriter, r *http.Request)
	StartDiscovery(w http.ResponseWriter, r *http.Request)
	ListServiceNames(w http.ResponseWriter, r *http.Request)
	ListServiceItems(w http.ResponseWriter, r *http.Request)
}

func NewServiceController(serviceListCache service.ServiceListCache,
	discoveryService service.DiscoveryService,
	listNamesService service.ListService) ServiceController {
	return serviceControllerImpl{
		serviceListCache: serviceListCache,
		discoveryService: discoveryService,
		listService:      listNamesService,
	}
}

type serviceControllerImpl struct {
	serviceListCache service.ServiceListCache
	discoveryService service.DiscoveryService
	listService      service.ListService
}

func (s serviceControllerImpl) ListServices_deprecated(w http.ResponseWriter, r *http.Request) {
	namespace := getStringParam(r, "name")
	workspaceId := getStringParam(r, "workspaceId")
	//v1 support
	if workspaceId == "" {
		workspaceId = view.DefaultWorkspaceId
	}
	servicesList := s.serviceListCache.GetServicesList(namespace, workspaceId, nil)
	servicesDeprecated := make([]view.Service_deprecated, len(servicesList.Services))
	for i, svc := range servicesList.Services {
		servicesDeprecated[i] = svc.ToDeprecated()
	}
	respondWithJson(w, http.StatusOK, view.ServiceListResponse_deprecated{Services: servicesDeprecated, Status: servicesList.Status, Debug: servicesList.Details})
}

func (s serviceControllerImpl) ListServices(w http.ResponseWriter, r *http.Request) {
	namespace := getStringParam(r, "name")
	workspaceId := getStringParam(r, "workspaceId")
	if workspaceId == "" {
		workspaceId = view.DefaultWorkspaceId
	}
	requestedServices := getRequestedServicesQueryParam(r)
	servicesList := s.serviceListCache.GetServicesList(namespace, workspaceId, requestedServices)
	respondWithJson(w, http.StatusOK, view.ServiceListResponse{
		Services:          servicesList.Services,
		Status:            servicesList.Status,
		Debug:             servicesList.Details,
		RequestedServices: servicesList.RequestedServices,
	})
}

func (s serviceControllerImpl) StartDiscovery(w http.ResponseWriter, r *http.Request) {
	namespace := getStringParam(r, "name")
	workspaceId := getStringParam(r, "workspaceId")
	//v1 support
	if workspaceId == "" {
		workspaceId = view.DefaultWorkspaceId
	}

	failOnError, paramErr := getFailOnErrorQueryParam(r)
	if paramErr != nil {
		respondWithError(w, "failed to parse failOnError param", paramErr)
		return
	}

	req, bodyErr := getDiscoveryRequestBody(w, r)
	if bodyErr != nil {
		respondWithError(w, "Failed to parse discovery request body", bodyErr)
		return
	}

	err := s.discoveryService.StartDiscovery(secctx.Create(r), namespace, workspaceId, failOnError, req)
	if err != nil {
		respondWithError(w, "Failed to start discovery process", err)
		return
	}
	w.WriteHeader(http.StatusAccepted)
}

func (s serviceControllerImpl) ListServiceNames(w http.ResponseWriter, r *http.Request) {
	namespace := getStringParam(r, "name")

	result, err := s.listService.ListServiceNames(namespace)
	if err != nil {
		respondWithError(w, "Failed to list service names", err)
		return
	}
	respondWithJson(w, http.StatusOK, view.ServiceNamesResponse{ServiceNames: result})
}

func (s serviceControllerImpl) ListServiceItems(w http.ResponseWriter, r *http.Request) {
	namespace := getStringParam(r, "name")

	result, err := s.listService.ListServiceItems(namespace)
	if err != nil {
		respondWithError(w, "Failed to list service items", err)
		return
	}
	respondWithJson(w, http.StatusOK, view.ServiceItemsResponse{ServiceItems: result})
}
