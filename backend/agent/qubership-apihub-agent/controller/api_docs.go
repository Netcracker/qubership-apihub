package controller

import (
	"io/ioutil"
	"net/http"
	"os"

	"github.com/Netcracker/qubership-apihub-agent/responder"
)

type ApiDocsController interface {
	GetSpec(w http.ResponseWriter, r *http.Request)
}

func NewApiDocsController(fsRoot string, resp responder.Responder) ApiDocsController {
	return apiDocsControllerImpl{
		fsRoot:    fsRoot + "/api",
		responder: resp,
	}
}

type apiDocsControllerImpl struct {
	fsRoot    string
	responder responder.Responder
}

func (a apiDocsControllerImpl) GetSpec(w http.ResponseWriter, r *http.Request) {
	fullPath := a.fsRoot + "/Agent API.yaml"
	_, err := os.Stat(fullPath)
	if err != nil {
		a.responder.RespondWithError(w, "Failed to read API spec", err)
		return
	}
	content, err := ioutil.ReadFile(fullPath)
	if err != nil {
		a.responder.RespondWithError(w, "Failed to read API spec", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(content)
}
