package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-api-linter-service/service"
)

type LinterController interface {
	ListLinters(w http.ResponseWriter, r *http.Request)
}

type linterControllerImpl struct {
	linterConfigService service.LinterConfigService
}

func NewLinterController(linterConfigService service.LinterConfigService) LinterController {
	return &linterControllerImpl{
		linterConfigService: linterConfigService,
	}
}

func (c *linterControllerImpl) ListLinters(w http.ResponseWriter, r *http.Request) {
	configs := c.linterConfigService.GetExternalLinterConfigs()
	respondWithJson(w, http.StatusOK, configs)
}
