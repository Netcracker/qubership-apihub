package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-api-linter-service/responder"
	"github.com/Netcracker/qubership-api-linter-service/service"
)

type LinterController interface {
	ListLinters(w http.ResponseWriter, r *http.Request)
}

type linterControllerImpl struct {
	linterConfigService service.LinterConfigService
	responder           responder.Responder
}

func NewLinterController(linterConfigService service.LinterConfigService, resp responder.Responder) LinterController {
	return &linterControllerImpl{
		linterConfigService: linterConfigService,
		responder:           resp,
	}
}

func (c *linterControllerImpl) ListLinters(w http.ResponseWriter, r *http.Request) {
	configs := c.linterConfigService.GetExternalLinterConfigs()
	c.responder.RespondWithJson(w, http.StatusOK, configs)
}
