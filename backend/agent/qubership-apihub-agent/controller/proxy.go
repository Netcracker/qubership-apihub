package controller

import (
	"crypto/tls"
	"io"
	"net/http"
	"net/url"
)

type ProxyController interface {
	Proxy(w http.ResponseWriter, req *http.Request)
}

func NewProxyController(apihubUrl string, accessToken string) ProxyController {
	return &proxyControllerImpl{apihubUrl: apihubUrl, accessToken: accessToken, tr: http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}}
}

type proxyControllerImpl struct {
	apihubUrl   string
	accessToken string
	tr          http.Transport
}

func (p *proxyControllerImpl) Proxy(w http.ResponseWriter, req *http.Request) {
	tempURL, _ := url.Parse(p.apihubUrl)
	req.URL.Host = tempURL.Host
	req.URL.Scheme = tempURL.Scheme
	req.Host = tempURL.Host
	req.Header.Set("api-key", p.accessToken) // add access key
	resp, err := p.tr.RoundTrip(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusServiceUnavailable)
		return
	}
	defer resp.Body.Close()
	copyHeader(w.Header(), resp.Header)
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func copyHeader(dst, src http.Header) {
	for k, vv := range src {
		for _, v := range vv {
			dst.Add(k, v)
		}
	}
}
