package idp

import (
	"net/http"
)

type Provider interface {
	StartAuthentication(w http.ResponseWriter, r *http.Request)
	CallbackHandler(w http.ResponseWriter, r *http.Request)
	ServeMetadata(w http.ResponseWriter, r *http.Request)
}
