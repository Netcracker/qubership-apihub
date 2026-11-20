package controller

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/portal-backend/exception"
	"github.com/stretchr/testify/require"
)

func TestGetOffsetQueryParam(t *testing.T) {
	tests := []struct {
		name       string
		query      string
		wantOffset int
		wantCode   string
	}{
		{name: "absent defaults to zero", query: ""},
		{name: "empty defaults to zero", query: "?offset="},
		{name: "zero", query: "?offset=0"},
		{name: "positive", query: "?offset=25", wantOffset: 25},
		//the OpenAPI parameter declares a non-negative integer, so neither of these may pass as zero
		{name: "not a number", query: "?offset=abc", wantCode: exception.IncorrectParamType},
		{name: "negative", query: "?offset=-1", wantCode: exception.InvalidParameterValue},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			offset, customErr := getOffsetQueryParam(httptest.NewRequest(http.MethodGet, "/test"+test.query, nil))
			if test.wantCode == "" {
				require.Nil(t, customErr)
				require.Equal(t, test.wantOffset, offset)
				return
			}
			require.NotNil(t, customErr)
			require.Equal(t, http.StatusBadRequest, customErr.Status)
			require.Equal(t, test.wantCode, customErr.Code)
			require.Equal(t, 0, offset)
		})
	}
}
