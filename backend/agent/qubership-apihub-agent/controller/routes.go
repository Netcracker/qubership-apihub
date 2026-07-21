package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub-agent/service"
)

type RoutesController interface {
	GetRouteByName(w http.ResponseWriter, r *http.Request)
}

func NewRoutesController(routesSvc service.RoutesService) RoutesController {
	return &routesController{
		routesSvc: routesSvc,
	}
}

type routesController struct {
	routesSvc service.RoutesService
}

func (c routesController) GetRouteByName(w http.ResponseWriter, r *http.Request) {
	namespace := getStringParam(r, "name")
	routeName := getStringParam(r, "routeName")

	result, err := c.routesSvc.GetRouteByName(namespace, routeName)
	if err != nil {
		respondWithError(w, "Failed to get route", err)
		return
	}
	respondWithJson(w, http.StatusOK, result)
}
