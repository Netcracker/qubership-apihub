package controller

import (
	"io"
	"net"
	"net/http"
	"net/url"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	log "github.com/sirupsen/logrus"
)

const (
	maxHeaders      = 100
	maxHeaderValues = 1000
)

type ProxyController interface {
	Proxy(w http.ResponseWriter, req *http.Request)
}

func NewPlaygroundProxyController(systemInfoService service.SystemInfoService) (ProxyController, error) {
	tlsConfig, err := utils.BuildSecureTLSConfig(nil)
	if err != nil {
		return nil, err
	}
	return &playgroundProxyControllerImpl{
		tr: http.Transport{
			TLSClientConfig:     tlsConfig,
			DialContext:         (&net.Dialer{Timeout: 15 * time.Second}).DialContext,
			TLSHandshakeTimeout: 15 * time.Second,
			IdleConnTimeout:     90 * time.Second,
		},
		systemInfoService: systemInfoService}, nil
}

type playgroundProxyControllerImpl struct {
	tr                http.Transport
	systemInfoService service.SystemInfoService
}

const CustomProxyUrlHeader = "X-Apihub-Proxy-Url"

func (p *playgroundProxyControllerImpl) Proxy(w http.ResponseWriter, r *http.Request) {
	proxyUrlStr := r.Header.Get(CustomProxyUrlHeader)
	if proxyUrlStr == "" {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.RequiredParamsMissing,
			Message: exception.RequiredParamsMissingMsg,
			Params:  map[string]interface{}{"params": CustomProxyUrlHeader},
		})
		return
	}
	r.Header.Del(CustomProxyUrlHeader)
	proxyURL, err := url.Parse(proxyUrlStr)
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURL,
			Message: exception.InvalidURLMsg,
			Params:  map[string]interface{}{"url": proxyUrlStr},
			Debug:   err.Error(),
		})
		return
	}
	if err := utils.IsHostValid(proxyURL, p.systemInfoService.GetAllowedHosts()); err != nil {
		utils.RespondWithCustomError(w, err)
		return
	}
	r.URL = proxyURL
	r.Host = proxyURL.Host
	// RoundTrip honors the context of the request it is given. r is the inbound request, so the
	// deadline set by RequestTimeoutMiddleware bounds the whole exchange: dial, TLS, header wait and body streaming.
	resp, err := p.tr.RoundTrip(r)
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusFailedDependency,
			Code:    exception.ProxyFailed,
			Message: exception.ProxyFailedMsg,
			Params:  map[string]interface{}{"url": r.URL.String()},
			Debug:   err.Error(),
		})
		return
	}
	defer resp.Body.Close()
	if err := copyHeader(w.Header(), resp.Header); err != nil {
		utils.RespondWithCustomError(w, err)
		return
	}
	w.WriteHeader(resp.StatusCode)
	if _, err := io.Copy(w, resp.Body); err != nil {
		// Headers/status are already sent, so we can only log; a read/write timeout or an expired
		// request deadline surfaces here.
		log.Warnf("playground proxy: failed to stream upstream response for %s: %v", r.URL.String(), err)
	}
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
