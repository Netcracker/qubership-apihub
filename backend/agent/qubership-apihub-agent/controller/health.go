package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub-agent/utils"
	log "github.com/sirupsen/logrus"
)

type HealthController interface {
	HandleStartupRequest(w http.ResponseWriter, r *http.Request)
	HandleReadyRequest(w http.ResponseWriter, r *http.Request)
	HandleLiveRequest(w http.ResponseWriter, r *http.Request)
	AddStartupCheck(check StartupCheckFunc, name string)
	RunStartupChecks()
}

type StartupCheckFunc func() bool

func NewHealthController() HealthController {
	c := healthControllerImpl{
		startupOk: false,
		checks:    map[string]StartupCheckFunc{},
	}
	return &c
}

type healthControllerImpl struct {
	startupOk bool
	checks    map[string]StartupCheckFunc
}

func (h *healthControllerImpl) HandleStartupRequest(w http.ResponseWriter, r *http.Request) {
	if h.startupOk {
		w.WriteHeader(http.StatusOK)
	} else {
		w.WriteHeader(http.StatusNotFound)
	}
}

func (h *healthControllerImpl) HandleReadyRequest(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (h *healthControllerImpl) HandleLiveRequest(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (h *healthControllerImpl) AddStartupCheck(check StartupCheckFunc, name string) {
	h.checks[name] = check
}

func (h *healthControllerImpl) RunStartupChecks() {
	utils.SafeAsync(func() {
		ok := true
		for name, check := range h.checks {
			log.Infof("Executing startup check '%s'", name)
			checkOk := check()
			log.Infof("Startup check '%s' returned result: %v", name, checkOk)
			if !checkOk {
				ok = false
			}
		}
		h.startupOk = ok
	})
}
