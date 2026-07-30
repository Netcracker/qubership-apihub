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
	services, status, details := s.serviceListCache.GetServicesList(namespace, workspaceId)
	servicesDeprecated := make([]view.Service_deprecated, len(services))
	for i, svc := range services {
		servicesDeprecated[i] = svc.ToDeprecated()
	}
	respondWithJson(w, http.StatusOK, view.ServiceListResponse_deprecated{Services: servicesDeprecated, Status: status, Debug: details})
}

func (s serviceControllerImpl) ListServices(w http.ResponseWriter, r *http.Request) {
	namespace := getStringParam(r, "name")
	workspaceId := getStringParam(r, "workspaceId")
	if workspaceId == "" {
		workspaceId = view.DefaultWorkspaceId
	}
	services, status, details := s.serviceListCache.GetServicesList(namespace, workspaceId)
	respondWithJson(w, http.StatusOK, view.ServiceListResponse{Services: services, Status: status, Debug: details})
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

	err := s.discoveryService.StartDiscovery(secctx.Create(r), namespace, workspaceId, failOnError)
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
