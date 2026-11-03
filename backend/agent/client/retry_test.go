package client

import (
	"net/http"
	"testing"

	"gopkg.in/resty.v1"
)

func TestRetryOn5xx(t *testing.T) {
	tests := []struct {
		name       string
		resp       *resty.Response
		statusCode int
		want       bool
	}{
		{name: "nil response", resp: nil, want: false},
		{name: "200 OK", statusCode: http.StatusOK, want: false},
		{name: "404 Not Found", statusCode: http.StatusNotFound, want: false},
		{name: "500 Internal Server Error", statusCode: http.StatusInternalServerError, want: true},
		{name: "502 Bad Gateway", statusCode: http.StatusBadGateway, want: true},
		{name: "503 Service Unavailable", statusCode: http.StatusServiceUnavailable, want: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := tt.resp
			if tt.statusCode != 0 {
				resp = responseWithStatusCode(tt.statusCode)
			}
			got, err := retryOn5xx(resp)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Errorf("retryOn5xx() = %v, want %v", got, tt.want)
			}
		})
	}
}

func responseWithStatusCode(statusCode int) *resty.Response {
	resp := &resty.Response{
		RawResponse: &http.Response{StatusCode: statusCode},
	}
	return resp
}
