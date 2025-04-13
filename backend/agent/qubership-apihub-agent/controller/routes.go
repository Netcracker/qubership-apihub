package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub-agent/exception"
	"github.com/Netcracker/qubership-apihub-agent/service"
	log "github.com/sirupsen/logrus"
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
		log.Error("Failed to get route: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get route",
				Debug:   err.Error()})
		}
		return
	}
	respondWithJson(w, http.StatusOK, result)
}
