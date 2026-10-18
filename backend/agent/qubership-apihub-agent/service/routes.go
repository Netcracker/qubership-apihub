package service

import (
	goctx "context"
	"net/http"

	"github.com/Netcracker/qubership-apihub-agent/exception"
	"github.com/Netcracker/qubership-apihub-agent/view"
	"github.com/netcracker/qubership-core-lib-go-paas-mediation-client/v8/entity"
	"github.com/netcracker/qubership-core-lib-go-paas-mediation-client/v8/service"
)

type RoutesService interface {
	GetRouteByName(namespace string, resourceName string) (*view.Route, error)
}

func NewRoutesService(paasClient service.PlatformService) RoutesService {
	return &routesService{
		paasClient: paasClient,
	}
}

type routesService struct {
	paasClient service.PlatformService
}

func (s routesService) GetRouteByName(namespace string, resourceName string) (*view.Route, error) {
	ctx := goctx.Background()
	route, err := s.paasClient.GetRoute(ctx, resourceName, namespace)
	if err != nil {
		return nil, err
	}
	if route == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.RouteDoesntExist,
			Message: exception.RouteDoesntExistMsg,
			Params:  map[string]interface{}{"route": resourceName},
		}
	}
	return paasRouteToView(route), nil
}

func paasRouteToView(route *entity.Route) *view.Route {
	return &view.Route{
		Name:      route.Name,
		Namespace: route.Namespace,
		Host:      route.Spec.Host,
	}
}
