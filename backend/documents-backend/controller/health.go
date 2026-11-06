package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/utils"
)

type HealthController interface {
	HandleReadyRequest(w http.ResponseWriter, r *http.Request)
	HandleLiveRequest(w http.ResponseWriter, r *http.Request)
}

func NewHealthController(readyChan chan bool) HealthController {
	c := &healthControllerImpl{ready: false}
	utils.SafeAsync(func() {
		c.watchReady(readyChan)
	})
	return c
}

type healthControllerImpl struct {
	ready bool
}

func (h *healthControllerImpl) HandleReadyRequest(w http.ResponseWriter, r *http.Request) {
	if h.ready {
		w.WriteHeader(http.StatusOK)
		return
	}
	w.WriteHeader(http.StatusNotFound)
}

func (h *healthControllerImpl) HandleLiveRequest(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (h *healthControllerImpl) watchReady(readyChan chan bool) {
	h.ready = <-readyChan
}
