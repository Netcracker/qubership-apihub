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

package service

import (
	"fmt"
	"net/http"

	"github.com/Netcracker/qubership-api-linter-service/exception"
)

type ValidationService interface {
	Validate(engine string, files []string) (interface{}, error)
}

func NewValidationService() ValidationService {
	return &validationServiceImpl{}
}

type validationServiceImpl struct {
}

const tempFolder = "tmp"

func (v *validationServiceImpl) Validate(engine string, files []string) (interface{}, error) {
	var err error
	var report interface{}
	switch engine {
	case "vacuum":
		report, err = v.runDocumentsVacuum(files)
	case "spectral":
		report, err = v.runDocumentsSpectral(files)
	default:
		err = &exception.CustomError{
			Status:  http.StatusBadRequest,
			Message: fmt.Sprintf("Value %s is incorrect validation engine. Available options are: vacuum, spectral.", engine),
		}
	}
	return report, err
}
