package controller

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"

	"github.com/Netcracker/qubership-apihub-agent/exception"
	"github.com/Netcracker/qubership-apihub-agent/secctx"
	log "github.com/sirupsen/logrus"
)

type LogsController interface {
	SetLogLevel(w http.ResponseWriter, r *http.Request)
	CheckLogLevel(w http.ResponseWriter, r *http.Request)
}

func NewLogsController() LogsController {
	return &logsControllerImpl{}
}

type logsControllerImpl struct {
}

func (l logsControllerImpl) SetLogLevel(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	ctx := secctx.Create(r)
	sufficientPrivileges := ctx.IsSysadm()
	if !sufficientPrivileges {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	type SetLevelReq struct {
		Level log.Level `json:"level"`
	}
	var req SetLevelReq
	err = json.Unmarshal(body, &req)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}

	log.SetLevel(req.Level)
	log.Infof("Log level was set to %s", req.Level.String())
	w.WriteHeader(http.StatusOK)
}

func (l logsControllerImpl) CheckLogLevel(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.Create(r)
	sufficientPrivileges := ctx.IsSysadm()
	if !sufficientPrivileges {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	log.Error("Error level is enabled")
	log.Warn("Warn level is enabled")
	log.Info("Info level is enabled")
	log.Debug("Debug level is enabled")
	log.Trace("Trace level is enabled")
	w.Write([]byte(fmt.Sprintf("Current log level is '%s'. See logs for details", log.GetLevel())))
}
