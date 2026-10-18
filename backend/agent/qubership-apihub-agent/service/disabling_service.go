package service

import (
	"net/http"
	"sync"

	"github.com/Netcracker/qubership-apihub-agent/exception"
)

type DisablingService interface {
	GetDisablingStatus() *exception.CustomError
	DisableServices(disable bool, apihubVersion string)
}

func NewDisablingService() DisablingService {
	return &disablingServiceImpl{}
}

type disablingServiceImpl struct {
	statusMutex     sync.RWMutex
	disableServices bool
	apihubVersion   string
}

func (d *disablingServiceImpl) GetDisablingStatus() *exception.CustomError {
	d.statusMutex.RLock()
	defer d.statusMutex.RUnlock()
	if d.disableServices {
		return &exception.CustomError{
			Status:  http.StatusServiceUnavailable,
			Code:    exception.AgentVersionMismatch,
			Message: exception.AgentVersionMismatchMsg,
			Params:  map[string]interface{}{"version": AGENT_VERSION, "recommended": d.apihubVersion},
		}
	} else {
		return nil
	}
}

func (d *disablingServiceImpl) DisableServices(disable bool, apihubVersion string) {
	d.statusMutex.Lock()
	defer d.statusMutex.Unlock()
	d.disableServices = disable
	d.apihubVersion = apihubVersion
}
