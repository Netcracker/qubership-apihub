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

package client

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	log "github.com/sirupsen/logrus"
)

func GitlabDeadlineExceeded(err error) error {
	log.Errorf("Gitlab is currently unavailable. Please try again later")
	return &exception.CustomError{
		Status:  http.StatusFailedDependency,
		Code:    exception.GitlabDeadlineExceeded,
		Message: exception.GitlabDeadlineExceededMsg,
		Debug:   err.Error(),
	}
}

func GitlabBranchNotFound(projectId string, branchName string) error {
	return &exception.CustomError{
		Status:  http.StatusNotFound,
		Code:    exception.BranchNotFound,
		Message: exception.BranchNotFoundMsg,
		Params:  map[string]interface{}{"branch": branchName, "projectId": projectId},
	}
}
