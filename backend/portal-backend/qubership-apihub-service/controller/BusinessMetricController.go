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
	"fmt"
	"net/http"
	"strconv"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type BusinessMetricController interface {
	GetBusinessMetrics(w http.ResponseWriter, r *http.Request)
}

func NewBusinessMetricController(businessMetricService service.BusinessMetricService, excelService service.ExcelService, isSysadm func(context.SecurityContext) bool) BusinessMetricController {
	return businessMetricControllerImpl{
		businessMetricService: businessMetricService,
		isSysadm:              isSysadm,
		excelService:          excelService,
	}
}

type businessMetricControllerImpl struct {
	businessMetricService service.BusinessMetricService
	excelService          service.ExcelService
	isSysadm              func(context.SecurityContext) bool
}

func (b businessMetricControllerImpl) GetBusinessMetrics(w http.ResponseWriter, r *http.Request) {
	var err error
	ctx := context.Create(r)
	sufficientPrivileges := b.isSysadm(ctx)
	if !sufficientPrivileges {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	parentPackageId := r.URL.Query().Get("parentPackageId")
	hierarchyLevel := 0
	if r.URL.Query().Get("hierarchyLevel") != "" {
		hierarchyLevel, err = strconv.Atoi(r.URL.Query().Get("hierarchyLevel"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "hierarchyLevel", "type": "int"},
				Debug:   err.Error(),
			})
			return
		}
	}
	format := r.URL.Query().Get("format")
	if format == "" {
		format = view.ExportFormatJson
	}
	businessMetrics, err := b.businessMetricService.GetBusinessMetrics(parentPackageId, hierarchyLevel)
	if err != nil {
		RespondWithError(w, "Failed to get business metrics", err)
		return
	}
	switch format {
	case view.ExportFormatJson:
		RespondWithJson(w, http.StatusOK, businessMetrics)
		return
	case view.ExportFormatXlsx:
		report, filename, err := b.excelService.ExportBusinessMetrics(businessMetrics)
		if err != nil {
			RespondWithError(w, "Failed to export business metrics as xlsx", err)
			return
		}
		w.Header().Set("Content-Type", "application/octet-stream")
		w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%v"`, filename))
		w.Header().Set("Content-Transfer-Encoding", "binary")
		w.Header().Set("Expires", "0")
		report.Write(w)
		report.Close()
		return
	}
}
