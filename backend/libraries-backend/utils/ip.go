package utils

import (
	"net/http"
)

const (
	xForwardedForHeader = "X-Forwarded-For"
)

func RequestorIPFields(r *http.Request) (xForwardedFor string, remoteAddr string) {
	if r == nil {
		return "", ""
	}

	return r.Header.Get(xForwardedForHeader), r.RemoteAddr
}
