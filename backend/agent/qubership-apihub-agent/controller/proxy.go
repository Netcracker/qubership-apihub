// Copyright 2024-2025 NetCracker Technology Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
