package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub-agent/responder"
	"github.com/Netcracker/qubership-apihub-agent/service"
)

type DisabledServicesMiddleware interface {
	HandleRequest(h http.Handler) http.Handler
}

func NewDisabledServicesMiddleware(disablingService service.DisablingService, resp responder.Responder) DisabledServicesMiddleware {
	return &disabledServicesMiddlewareImpl{disablingService: disablingService, responder: resp}
}

type disabledServicesMiddlewareImpl struct {
	disablingService service.DisablingService
	responder        responder.Responder
}

func (i *disabledServicesMiddlewareImpl) HandleRequest(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/ready" && r.URL.Path != "/live" && r.URL.Path != "/startup" {
			d := i.disablingService.GetDisablingStatus()
			if d != nil {
				i.responder.RespondWithCustomError(w, d)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}
