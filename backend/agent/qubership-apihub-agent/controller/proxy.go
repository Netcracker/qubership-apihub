package controller

import (
	"github.com/Netcracker/qubership-apihub-agent/exception"
	"net/http"
)

const (
	maxHeaders      = 100
	maxHeaderValues = 1000
)

type ProxyController interface {
	Proxy(w http.ResponseWriter, req *http.Request)
}

func copyHeader(dst, src http.Header) *exception.CustomError {
	//validation was added based on security scan results to avoid resource exhaustion
	if len(src) > maxHeaders {
		return &exception.CustomError{
			Status:  http.StatusBadGateway,
			Code:    exception.HeadersLimitExceeded,
			Message: exception.HeadersLimitExceededMsg,
			Params:  map[string]interface{}{"maxHeaders": maxHeaders},
		}
	}

	for k, vv := range src {
		//validation was added based on security scan results to avoid resource exhaustion
		if len(vv) > maxHeaderValues {
			return &exception.CustomError{
				Status:  http.StatusBadGateway,
				Code:    exception.HeaderValuesLimitExceeded,
				Message: exception.HeaderValuesLimitExceededMsg,
				Params:  map[string]interface{}{"key": k, "maxValues": maxHeaderValues},
			}
		}
		for _, v := range vv {
			dst.Add(k, v)
		}
	}
	return nil
}
