package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub-agent/responder"
	"github.com/Netcracker/qubership-apihub-agent/service"
)

type RoutesController interface {
	GetRouteByName(w http.ResponseWriter, r *http.Request)
}

func NewRoutesController(routesSvc service.RoutesService, resp responder.Responder) RoutesController {
	return &routesController{
		routesSvc: routesSvc,
		responder: resp,
	}
}

type routesController struct {
	routesSvc service.RoutesService
	responder responder.Responder
}

func (c routesController) GetRouteByName(w http.ResponseWriter, r *http.Request) {
	namespace := getStringParam(r, "name")
	routeName := getStringParam(r, "routeName")

	result, err := c.routesSvc.GetRouteByName(namespace, routeName)
	if err != nil {
		c.responder.RespondWithError(w, "Failed to get route", err)
		return
	}
	c.responder.RespondWithJson(w, http.StatusOK, result)
}
