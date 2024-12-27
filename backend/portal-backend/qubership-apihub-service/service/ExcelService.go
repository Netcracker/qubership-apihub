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
	"strconv"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	log "github.com/sirupsen/logrus"
	"github.com/xuri/excelize/v2"
)

const ExcelTemplatePath = "static/templates/resources/ExcelExportTemplate.xlsx"

type ExcelService interface {
	ExportDeprecatedOperations(packageId, version, apiType string, req view.ExportOperationRequestView) (*excelize.File, string, error)
	ExportApiChanges(packageId, version, apiType string, severities []string, req view.ExportApiChangesRequestView) (*excelize.File, string, error)
	ExportOperations(packageId, version, apiType string, req view.ExportOperationRequestView) (*excelize.File, string, error)
	ExportBusinessMetrics(businessMetrics []view.BusinessMetric) (*excelize.File, string, error)
}

func NewExcelService(publishedRepo repository.PublishedRepository, versionService VersionService, operationService OperationService, packageService PackageService) ExcelService {
	return &excelServiceImpl{publishedRepo: publishedRepo, versionService: versionService, operationService: operationService, packageService: packageService}
}

type excelServiceImpl struct {
	publishedRepo    repository.PublishedRepository
	versionService   VersionService
	operationService OperationService
	packageService   PackageService
}

func (e excelServiceImpl) ExportApiChanges(packageId, version, apiType string, severities []string, req view.ExportApiChangesRequestView) (*excelize.File, string, error) {
	versionChangesSearchReq := view.VersionChangesReq{
		PreviousVersion:          req.PreviousVersion,
		PreviousVersionPackageId: req.PreviousVersionPackageId,
		ApiKind:                  req.ApiKind,
		EmptyTag:                 req.EmptyTag,
		RefPackageId:             req.RefPackageId,
		Tags:                     req.Tags,
		TextFilter:               req.TextFilter,
		Group:                    req.Group,
		EmptyGroup:               req.EmptyGroup,
		ApiAudience:              req.ApiAudience,
	}
	changelog, err := e.versionService.GetVersionChanges(packageId, version, apiType, severities, versionChangesSearchReq)
	if err != nil {
		return nil, "", err
	}
	if changelog == nil || len(changelog.Operations) == 0 {
		return nil, "", nil
	}
	versionName, err := e.getVersionNameForAttachmentName(packageId, version)
	if err != nil {
		return nil, "", err
	}
	versionStatus, err := e.versionService.GetVersionStatus(packageId, version)
	if err != nil {
		return nil, "", err
	}
	packageName, err := e.packageService.GetPackageName(packageId)
	if err != nil {
		return nil, "", err
	}
	file, err := buildApiChangesWorkbook(changelog, packageName, versionName, versionStatus)
	return file, versionName, err
}

type OperationsReport struct {
	workbook           *excelize.File
	firstSheetIndex    int
	startColumn        string
	endColumn          string
	columnDefaultWidth float64
}

func (e excelServiceImpl) ExportOperations(packageId, version, apiType string, req view.ExportOperationRequestView) (*excelize.File, string, error) {
	restOperationListReq := view.OperationListReq{
		Kind:         req.Kind,
		EmptyTag:     req.EmptyTag,
		Tag:          req.Tag,
		TextFilter:   req.TextFilter,
		ApiType:      apiType,
		RefPackageId: req.RefPackageId,
		Group:        req.Group,
		EmptyGroup:   req.EmptyGroup,
		ApiAudience:  req.ApiAudience,
	}
	operations, err := e.operationService.GetOperations(packageId, version, false, restOperationListReq)
	if err != nil {
		return nil, "", err
	}
	if operations == nil || len(operations.Operations) == 0 {
		return nil, "", nil
	}
	versionName, err := e.getVersionNameForAttachmentName(packageId, version)
	if err != nil {
		return nil, "", err
	}
	versionStatus, err := e.versionService.GetVersionStatus(packageId, version)
	if err != nil {
		return nil, "", err
	}
	packageName, err := e.packageService.GetPackageName(packageId)
	if err != nil {
		return nil, "", err
	}
	file, err := buildOperationsWorkbook(operations, packageName, versionName, versionStatus)
	return file, versionName, err
}

type DeprecatedOperationsReport struct {
	workbook           *excelize.File
	firstSheetIndex    int
	startColumn        string
	endColumn          string
	columnDefaultWidth float64
}

func (e excelServiceImpl) ExportDeprecatedOperations(packageId, version, apiType string, req view.ExportOperationRequestView) (*excelize.File, string, error) {
	deprecatedOperationListReq := view.DeprecatedOperationListReq{
		Kind:                   req.Kind,
		Tags:                   req.Tags,
		TextFilter:             req.TextFilter,
		ApiType:                apiType,
		IncludeDeprecatedItems: true,
		RefPackageId:           req.RefPackageId,
		EmptyTag:               req.EmptyTag,
		EmptyGroup:             req.EmptyGroup,
		Group:                  req.Group,
		ApiAudience:            req.ApiAudience,
	}
	deprecatedOperations, err := e.operationService.GetDeprecatedOperations(packageId, version, deprecatedOperationListReq)
	if err != nil {
		return nil, "", err
	}
	if deprecatedOperations == nil || len(deprecatedOperations.Operations) == 0 {
		return nil, "", nil
	}

	versionName, err := e.getVersionNameForAttachmentName(packageId, version)
	if err != nil {
		return nil, "", err
	}

	versionStatus, err := e.versionService.GetVersionStatus(packageId, version)
	if err != nil {
		return nil, "", err
	}
	packageName, err := e.packageService.GetPackageName(packageId)
	if err != nil {
		return nil, "", err
	}
	file, err := buildDeprecatedOperationsWorkbook(deprecatedOperations, packageName, versionName, versionStatus)
	return file, versionName, err
}

func buildDeprecatedOperationsWorkbook(deprecatedOperations *view.Operations, packageName, versionName, versionStatus string) (*excelize.File, error) {
	var err error
	deprecatedOperationsReport, err := excelize.OpenFile(ExcelTemplatePath)
	defer func() {
		if err := deprecatedOperationsReport.Close(); err != nil {
			log.Errorf("Failed to close excel template file: %v", err.Error())
		}
	}()
	if err != nil {
		log.Errorf("Failed to open excel template file: %v", err.Error())
		return nil, err
	}

	report := DeprecatedOperationsReport{
		workbook:           deprecatedOperationsReport,
		startColumn:        "A",
		endColumn:          "L",
		columnDefaultWidth: 35,
	}

	buildCoverPage(report.workbook, packageName, "Deprecated API Operations", versionName, versionStatus)

	evenCellStyle := getEvenCellStyle(report.workbook)
	oddCellStyle := getOddCellStyle(report.workbook)
	restOperations := make(map[string][]view.DeprecatedRestOperationView)
	graphQLOperations := make(map[string][]view.DeprecateGraphQLOperationView)
	protobufOperations := make(map[string][]view.DeprecateProtobufOperationView)

	for _, operation := range deprecatedOperations.Operations {
		if restOperation, ok := operation.(view.DeprecatedRestOperationView); ok {
			restOperations[restOperation.PackageRef] = append(restOperations[restOperation.PackageRef], restOperation)
			continue
		}
		if graphQLOperation, ok := operation.(view.DeprecateGraphQLOperationView); ok {
			graphQLOperations[graphQLOperation.PackageRef] = append(graphQLOperations[graphQLOperation.PackageRef], graphQLOperation)
		}
		if protobufOperation, ok := operation.(view.DeprecateProtobufOperationView); ok {
			protobufOperations[protobufOperation.PackageRef] = append(protobufOperations[protobufOperation.PackageRef], protobufOperation)
		}
	}
	var cellsValues map[string]interface{}
	rowIndex := 2
	restSheetCreated := false
	for packageRef, operationsView := range restOperations {
		versionName := deprecatedOperations.Packages[packageRef].RefPackageVersion
		if !deprecatedOperations.Packages[packageRef].NotLatestRevision {
			versionName, err = getVersionNameFromVersionWithRevision(deprecatedOperations.Packages[packageRef].RefPackageVersion)
			if err != nil {
				return nil, err
			}
		}
		for _, operationView := range operationsView {
			if !restSheetCreated {
				err := report.createRestSheet()
				if err != nil {
					return nil, err
				}
				restSheetCreated = true
			}
			for _, deprecatedItem := range operationView.DeprecatedItems {
				cellsValues = make(map[string]interface{})
				cellsValues[fmt.Sprintf("A%d", rowIndex)] = deprecatedOperations.Packages[packageRef].RefPackageId
				cellsValues[fmt.Sprintf("B%d", rowIndex)] = deprecatedOperations.Packages[packageRef].RefPackageName
				cellsValues[fmt.Sprintf("C%d", rowIndex)] = deprecatedOperations.Packages[packageRef].ServiceName
				cellsValues[fmt.Sprintf("D%d", rowIndex)] = versionName
				cellsValues[fmt.Sprintf("E%d", rowIndex)] = operationView.Title
				cellsValues[fmt.Sprintf("F%d", rowIndex)] = strings.ToUpper(operationView.Method)
				cellsValues[fmt.Sprintf("G%d", rowIndex)] = operationView.Path
				cellsValues[fmt.Sprintf("H%d", rowIndex)] = strings.Join(operationView.Tags, ",")
				cellsValues[fmt.Sprintf("I%d", rowIndex)] = strings.ToUpper(operationView.ApiKind)
				if len(deprecatedItem.PreviousReleaseVersions) > 0 {
					cellsValues[fmt.Sprintf("J%d", rowIndex)] = deprecatedItem.PreviousReleaseVersions[0]
				}
				cellsValues[fmt.Sprintf("K%d", rowIndex)] = deprecatedItem.Description
				if deprecatedItem.DeprecatedInfo != "" {
					cellsValues[fmt.Sprintf("L%d", rowIndex)] = deprecatedItem.DeprecatedInfo
				}
				err := setCellsValues(report.workbook, view.RestAPISheetName, cellsValues)
				if err != nil {
					return nil, err
				}
				if rowIndex%2 == 0 {
					err = report.workbook.SetCellStyle(view.RestAPISheetName, fmt.Sprintf("A%d", rowIndex), fmt.Sprintf("L%d", rowIndex), evenCellStyle)
				} else {
					err = report.workbook.SetCellStyle(view.RestAPISheetName, fmt.Sprintf("A%d", rowIndex), fmt.Sprintf("L%d", rowIndex), oddCellStyle)
				}
				if err != nil {
					return nil, err
				}
				rowIndex += 1
			}
		}
	}

	rowIndex = 2
	graphQLSheetCreated := false
	for packageRef, operationsView := range graphQLOperations {
		versionName := deprecatedOperations.Packages[packageRef].RefPackageVersion
		if !deprecatedOperations.Packages[packageRef].NotLatestRevision {
			versionName, err = getVersionNameFromVersionWithRevision(deprecatedOperations.Packages[packageRef].RefPackageVersion)
			if err != nil {
				return nil, err
			}
		}
		for _, operationView := range operationsView {
			if !graphQLSheetCreated {
				err := report.createGraphQLSheet()
				if err != nil {
					return nil, err
				}
				graphQLSheetCreated = true
			}
			for _, deprecatedItem := range operationView.DeprecatedItems {
				cellsValues = make(map[string]interface{})
				cellsValues[fmt.Sprintf("A%d", rowIndex)] = deprecatedOperations.Packages[packageRef].RefPackageId
				cellsValues[fmt.Sprintf("B%d", rowIndex)] = deprecatedOperations.Packages[packageRef].RefPackageName
				cellsValues[fmt.Sprintf("C%d", rowIndex)] = deprecatedOperations.Packages[packageRef].ServiceName
				cellsValues[fmt.Sprintf("D%d", rowIndex)] = versionName
				cellsValues[fmt.Sprintf("E%d", rowIndex)] = operationView.Title
				cellsValues[fmt.Sprintf("F%d", rowIndex)] = operationView.Type
				cellsValues[fmt.Sprintf("G%d", rowIndex)] = strings.ToUpper(operationView.Method)
				cellsValues[fmt.Sprintf("H%d", rowIndex)] = strings.Join(operationView.Tags, ",")
				cellsValues[fmt.Sprintf("I%d", rowIndex)] = strings.ToUpper(operationView.ApiKind)
				if len(deprecatedItem.PreviousReleaseVersions) > 0 {
					cellsValues[fmt.Sprintf("J%d", rowIndex)] = deprecatedItem.PreviousReleaseVersions[0]
				}
				cellsValues[fmt.Sprintf("K%d", rowIndex)] = deprecatedItem.Description
				if deprecatedItem.DeprecatedInfo != "" {
					cellsValues[fmt.Sprintf("L%d", rowIndex)] = deprecatedItem.DeprecatedInfo
				}
				err := setCellsValues(report.workbook, view.GraphQLSheetName, cellsValues)
				if err != nil {
					return nil, err
				}
				if rowIndex%2 == 0 {
					err = report.workbook.SetCellStyle(view.GraphQLSheetName, fmt.Sprintf("A%d", rowIndex), fmt.Sprintf("L%d", rowIndex), evenCellStyle)
				} else {
					err = report.workbook.SetCellStyle(view.GraphQLSheetName, fmt.Sprintf("A%d", rowIndex), fmt.Sprintf("L%d", rowIndex), oddCellStyle)
				}
				if err != nil {
					return nil, err
				}
				rowIndex += 1
			}
		}
	}

	rowIndex = 2
	protobufSheetCreated := false
	for packageRef, operationsView := range protobufOperations {
		versionName := deprecatedOperations.Packages[packageRef].RefPackageVersion
		if !deprecatedOperations.Packages[packageRef].NotLatestRevision {
			versionName, err = getVersionNameFromVersionWithRevision(deprecatedOperations.Packages[packageRef].RefPackageVersion)
			if err != nil {
				return nil, err
			}
		}
		for _, operationView := range operationsView {
			if !protobufSheetCreated {
				err := report.createProtobufSheet()
				if err != nil {
					return nil, err
				}
				protobufSheetCreated = true
			}
			for _, deprecatedItem := range operationView.DeprecatedItems {
				cellsValues = make(map[string]interface{})
				cellsValues[fmt.Sprintf("A%d", rowIndex)] = deprecatedOperations.Packages[packageRef].RefPackageId
				cellsValues[fmt.Sprintf("B%d", rowIndex)] = deprecatedOperations.Packages[packageRef].RefPackageName
				cellsValues[fmt.Sprintf("C%d", rowIndex)] = deprecatedOperations.Packages[packageRef].ServiceName
				cellsValues[fmt.Sprintf("D%d", rowIndex)] = versionName
				cellsValues[fmt.Sprintf("E%d", rowIndex)] = operationView.Title
				cellsValues[fmt.Sprintf("F%d", rowIndex)] = operationView.Type
				cellsValues[fmt.Sprintf("G%d", rowIndex)] = strings.ToUpper(operationView.Method)
				cellsValues[fmt.Sprintf("H%d", rowIndex)] = strings.ToUpper(operationView.ApiKind)
				if len(deprecatedItem.PreviousReleaseVersions) > 0 {
					cellsValues[fmt.Sprintf("I%d", rowIndex)] = deprecatedItem.PreviousReleaseVersions[0]
				}
				cellsValues[fmt.Sprintf("J%d", rowIndex)] = deprecatedItem.Description
				if deprecatedItem.DeprecatedInfo != "" {
					cellsValues[fmt.Sprintf("K%d", rowIndex)] = deprecatedItem.DeprecatedInfo
				}
				err := setCellsValues(report.workbook, view.ProtobufSheetName, cellsValues)
				if err != nil {
					return nil, err
				}
				if rowIndex%2 == 0 {
					err = report.workbook.SetCellStyle(view.ProtobufSheetName, fmt.Sprintf("A%d", rowIndex), fmt.Sprintf("K%d", rowIndex), evenCellStyle)
				} else {
					err = report.workbook.SetCellStyle(view.ProtobufSheetName, fmt.Sprintf("A%d", rowIndex), fmt.Sprintf("K%d", rowIndex), oddCellStyle)
				}
				if err != nil {
					return nil, err
				}
				rowIndex += 1
			}
		}
	}
	err = report.setupSettings()
	if err != nil {
		return nil, err
	}
	return report.workbook, nil
}
func buildOperationsWorkbook(operations *view.Operations, packageName, versionName, versionStatus string) (*excelize.File, error) {
	var err error

	apiChangesReport, err := excelize.OpenFile(ExcelTemplatePath)
	defer func() {
		if err := apiChangesReport.Close(); err != nil {
			log.Errorf("Failed to close excel template file: %v", err.Error())
		}
	}()
	if err != nil {
		log.Errorf("Failed to open excel template file: %v", err.Error())
		return nil, err
	}
	report := OperationsReport{
		workbook:           apiChangesReport,
		startColumn:        "A",
		endColumn:          "J",
		columnDefaultWidth: 35,
	}

	buildCoverPage(report.workbook, packageName, "API Operations", versionName, versionStatus)

	evenCellStyle := getEvenCellStyle(report.workbook)
	oddCellStyle := getOddCellStyle(report.workbook)

	restOperations := make(map[string][]view.RestOperationView)
	graphQLOperations := make(map[string][]view.GraphQLOperationView)
	protobufOperations := make(map[string][]view.ProtobufOperationView)

	for _, operation := range operations.Operations {
		if restOperation, ok := operation.(view.RestOperationView); ok {
			restOperations[restOperation.PackageRef] = append(restOperations[restOperation.PackageRef], restOperation)
			continue
		}
		if graphQLOperation, ok := operation.(view.GraphQLOperationView); ok {
			graphQLOperations[graphQLOperation.PackageRef] = append(graphQLOperations[graphQLOperation.PackageRef], graphQLOperation)
		}
		if protobufOperation, ok := operation.(view.ProtobufOperationView); ok {
			protobufOperations[protobufOperation.PackageRef] = append(protobufOperations[protobufOperation.PackageRef], protobufOperation)
		}
	}
	var cellsValues map[string]interface{}
	rowIndex := 2
	restSheetCreated := false
	for packageRef, operationsView := range restOperations {
		versionName := operations.Packages[packageRef].RefPackageVersion
		if !operations.Packages[packageRef].NotLatestRevision {
			versionName, err = getVersionNameFromVersionWithRevision(operations.Packages[packageRef].RefPackageVersion)
			if err != nil {
				return nil, err
			}
		}
		for _, operationView := range operationsView {
			if !restSheetCreated {
				err := report.createRestSheet()
				if err != nil {
					return nil, err
				}
				restSheetCreated = true
			}
			cellsValues = make(map[string]interface{})
			cellsValues[fmt.Sprintf("A%d", rowIndex)] = operations.Packages[packageRef].RefPackageId
			cellsValues[fmt.Sprintf("B%d", rowIndex)] = operations.Packages[packageRef].RefPackageName
			cellsValues[fmt.Sprintf("C%d", rowIndex)] = operations.Packages[packageRef].ServiceName
			cellsValues[fmt.Sprintf("D%d", rowIndex)] = versionName
			cellsValues[fmt.Sprintf("E%d", rowIndex)] = operationView.Title
			cellsValues[fmt.Sprintf("F%d", rowIndex)] = strings.ToUpper(operationView.Method)
			cellsValues[fmt.Sprintf("G%d", rowIndex)] = operationView.Path
			cellsValues[fmt.Sprintf("H%d", rowIndex)] = strings.Join(operationView.Tags, " ")
			cellsValues[fmt.Sprintf("I%d", rowIndex)] = strings.ToUpper(operationView.ApiKind)
			cellsValues[fmt.Sprintf("J%d", rowIndex)] = strings.ToLower(strconv.FormatBool(operationView.Deprecated))
			err := setCellsValues(report.workbook, view.RestAPISheetName, cellsValues)
			if err != nil {
				return nil, err
			}
			if rowIndex%2 == 0 {
				err = report.workbook.SetCellStyle(view.RestAPISheetName, fmt.Sprintf("A%d", rowIndex), fmt.Sprintf("J%d", rowIndex), evenCellStyle)
			} else {
				err = report.workbook.SetCellStyle(view.RestAPISheetName, fmt.Sprintf("A%d", rowIndex), fmt.Sprintf("J%d", rowIndex), oddCellStyle)
			}
			if err != nil {
				return nil, err
			}
			rowIndex += 1
		}
	}

	rowIndex = 2
	graphQLSheetCreated := false
	for packageRef, operationsView := range graphQLOperations {
		versionName := operations.Packages[packageRef].RefPackageVersion
		if !operations.Packages[packageRef].NotLatestRevision {
			versionName, err = getVersionNameFromVersionWithRevision(operations.Packages[packageRef].RefPackageVersion)
			if err != nil {
				return nil, err
			}
		}
		for _, operationView := range operationsView {
			if !graphQLSheetCreated {
				err := report.createGraphQLSheet()
				if err != nil {
					return nil, err
				}
				graphQLSheetCreated = true
			}
			cellsValues = make(map[string]interface{})
			cellsValues[fmt.Sprintf("A%d", rowIndex)] = operations.Packages[packageRef].RefPackageId
			cellsValues[fmt.Sprintf("B%d", rowIndex)] = operations.Packages[packageRef].RefPackageName
			cellsValues[fmt.Sprintf("C%d", rowIndex)] = operations.Packages[packageRef].ServiceName
			cellsValues[fmt.Sprintf("D%d", rowIndex)] = versionName
			cellsValues[fmt.Sprintf("E%d", rowIndex)] = operationView.Title
			cellsValues[fmt.Sprintf("F%d", rowIndex)] = strings.ToUpper(operationView.Method)
			cellsValues[fmt.Sprintf("G%d", rowIndex)] = operationView.Type
			cellsValues[fmt.Sprintf("H%d", rowIndex)] = strings.ToUpper(operationView.ApiKind)
			cellsValues[fmt.Sprintf("I%d", rowIndex)] = strings.ToLower(strconv.FormatBool(operationView.Deprecated))
			err := setCellsValues(report.workbook, view.GraphQLSheetName, cellsValues)
			if err != nil {
				return nil, err
			}
			if rowIndex%2 == 0 {
				err = report.workbook.SetCellStyle(view.GraphQLSheetName, fmt.Sprintf("A%d", rowIndex), fmt.Sprintf("I%d", rowIndex), evenCellStyle)
			} else {
				err = report.workbook.SetCellStyle(view.GraphQLSheetName, fmt.Sprintf("A%d", rowIndex), fmt.Sprintf("I%d", rowIndex), oddCellStyle)
			}
			if err != nil {
				return nil, err
			}
			rowIndex += 1
		}
	}

	rowIndex = 2
	protobufSheetCreated := false
	for packageRef, operationsView := range protobufOperations {
		versionName := operations.Packages[packageRef].RefPackageVersion
		if !operations.Packages[packageRef].NotLatestRevision {
			versionName, err = getVersionNameFromVersionWithRevision(operations.Packages[packageRef].RefPackageVersion)
			if err != nil {
				return nil, err
			}
		}
		for _, operationView := range operationsView {
			if !protobufSheetCreated {
				err := report.createProtobufSheet()
				if err != nil {
					return nil, err
				}
				protobufSheetCreated = true
			}
			cellsValues = make(map[string]interface{})
			cellsValues[fmt.Sprintf("A%d", rowIndex)] = operations.Packages[packageRef].RefPackageId
			cellsValues[fmt.Sprintf("B%d", rowIndex)] = operations.Packages[packageRef].RefPackageName
			cellsValues[fmt.Sprintf("C%d", rowIndex)] = operations.Packages[packageRef].ServiceName
			cellsValues[fmt.Sprintf("D%d", rowIndex)] = versionName
			cellsValues[fmt.Sprintf("E%d", rowIndex)] = operationView.Title
			cellsValues[fmt.Sprintf("F%d", rowIndex)] = strings.ToUpper(operationView.Method)
			cellsValues[fmt.Sprintf("G%d", rowIndex)] = operationView.Type
			cellsValues[fmt.Sprintf("H%d", rowIndex)] = strings.ToUpper(operationView.ApiKind)
			cellsValues[fmt.Sprintf("I%d", rowIndex)] = strings.ToLower(strconv.FormatBool(operationView.Deprecated))
			err := setCellsValues(report.workbook, view.ProtobufSheetName, cellsValues)
			if err != nil {
				return nil, err
			}
			if rowIndex%2 == 0 {
				err = report.workbook.SetCellStyle(view.ProtobufSheetName, fmt.Sprintf("A%d", rowIndex), fmt.Sprintf("J%d", rowIndex), evenCellStyle)
			} else {
				err = report.workbook.SetCellStyle(view.ProtobufSheetName, fmt.Sprintf("A%d", rowIndex), fmt.Sprintf("J%d", rowIndex), oddCellStyle)
			}
			if err != nil {
				return nil, err
			}
			rowIndex += 1
		}
	}
	err = report.setupSettings()
	if err != nil {
		return nil, err
	}
	return report.workbook, nil
}

type ApiChangesReport struct {
	workbook           *excelize.File
	firstSheetIndex    int
	startColumn        string
	endColumn          string
	columnDefaultWidth float64
}

func buildApiChangesWorkbook(versionChanges *view.VersionChangesView, packageName, versionName, versionStatus string) (*excelize.File, error) {
	var err error
	apiChangesReport, err := excelize.OpenFile(ExcelTemplatePath)
	defer func() {
		if err := apiChangesReport.Close(); err != nil {
			log.Errorf("Failed to close excel template file: %v", err.Error())
		}
	}()
	if err != nil {
		log.Errorf("Failed to open excel template file: %v", err.Error())
		return nil, err
	}
	report := ApiChangesReport{
		workbook:           apiChangesReport,
		startColumn:        "A",
		endColumn:          "M",
		columnDefaultWidth: 35,
	}

	reportName := fmt.Sprintf("API changes between versions %s and %s", versionChanges.PreviousVersion, versionName)

	buildCoverPage(report.workbook, packageName, reportName, versionName, versionStatus)

	var cellsValues map[string]interface{}
	report.firstSheetIndex, err = report.workbook.NewSheet(view.SummarySheetName)
	if err != nil {
		return nil, err
	}
	evenCellStyle := getEvenCellStyle(report.workbook)
	oddCellStyle := getOddCellStyle(report.workbook)
	summaryCellStyle := getSummaryCellStyle(report.workbook)
	summaryFirstHeaderStyle := getSummaryFirstHeaderStyle(report.workbook)
	summaryHeaderStyle := getSummaryHeaderStyle(report.workbook)
	restApiMap := make(map[string][]view.RestOperationComparisonChangesView)
	graphQLApiMap := make(map[string][]view.GraphQLOperationComparisonChangesView)
	protobufApiMap := make(map[string][]view.ProtobufOperationComparisonChangesView)
	err = report.setupSettings()
	if err != nil {
		return nil, err
	}

	for _, operation := range versionChanges.Operations {
		if restOperation, ok := operation.(view.RestOperationComparisonChangesView); ok {
			if restOperation.PackageRef == "" {
				restApiMap[restOperation.PreviousVersionPackageRef] = append(restApiMap[restOperation.PreviousVersionPackageRef], restOperation)
				continue
			}
			restApiMap[restOperation.PackageRef] = append(restApiMap[restOperation.PackageRef], restOperation)
			continue
		}
		if graphQLOperation, ok := operation.(view.GraphQLOperationComparisonChangesView); ok {
			if graphQLOperation.PackageRef == "" {
				graphQLApiMap[graphQLOperation.PreviousVersionPackageRef] = append(graphQLApiMap[graphQLOperation.PreviousVersionPackageRef], graphQLOperation)
				continue
			}
			graphQLApiMap[graphQLOperation.PackageRef] = append(graphQLApiMap[graphQLOperation.PackageRef], graphQLOperation)
		}
		if protobufOperation, ok := operation.(view.ProtobufOperationComparisonChangesView); ok {
			if protobufOperation.PackageRef == "" {
				protobufApiMap[protobufOperation.PreviousVersionPackageRef] = append(protobufApiMap[protobufOperation.PreviousVersionPackageRef], protobufOperation)
				continue
			}
			protobufApiMap[protobufOperation.PackageRef] = append(protobufApiMap[protobufOperation.PackageRef], protobufOperation)
		}
	}

	restApiAllChangesSummaryMap := make(map[string]view.ChangeSummary)
	graphQLApiAllChangesSummaryMap := make(map[string]view.ChangeSummary)
	protobufApiAllChangesSummaryMap := make(map[string]view.ChangeSummary)

	for key, value := range restApiMap {
		summary := restApiAllChangesSummaryMap[key]
		for _, changelogView := range value {
			if changelogView.ChangeSummary.Deprecated > 0 {
				summary.Deprecated += 1
			}
			if changelogView.ChangeSummary.NonBreaking > 0 {
				summary.NonBreaking += 1
			}
			if changelogView.ChangeSummary.Breaking > 0 {
				summary.Breaking += 1
			}
			if changelogView.ChangeSummary.SemiBreaking > 0 {
				summary.SemiBreaking += 1
			}
			if changelogView.ChangeSummary.Annotation > 0 {
				summary.Annotation += 1
			}
			if changelogView.ChangeSummary.Unclassified > 0 {
				summary.Unclassified += 1
			}
		}
		restApiAllChangesSummaryMap[key] = summary
	}

	for key, value := range graphQLApiMap {
		summary := graphQLApiAllChangesSummaryMap[key]
		for _, changelogView := range value {
			if changelogView.ChangeSummary.Deprecated > 0 {
				summary.Deprecated += 1
			}
			if changelogView.ChangeSummary.NonBreaking > 0 {
				summary.NonBreaking += 1
			}
			if changelogView.ChangeSummary.Breaking > 0 {
				summary.Breaking += 1
			}
			if changelogView.ChangeSummary.SemiBreaking > 0 {
				summary.SemiBreaking += 1
			}
			if changelogView.ChangeSummary.Annotation > 0 {
				summary.Annotation += 1
			}
			if changelogView.ChangeSummary.Unclassified > 0 {
				summary.Unclassified += 1
			}
		}
		graphQLApiAllChangesSummaryMap[key] = summary
	}
	for key, value := range protobufApiMap {
		summary := protobufApiAllChangesSummaryMap[key]
		for _, changelogView := range value {
			if changelogView.ChangeSummary.Deprecated > 0 {
				summary.Deprecated += 1
			}
			if changelogView.ChangeSummary.NonBreaking > 0 {
				summary.NonBreaking += 1
			}
			if changelogView.ChangeSummary.Breaking > 0 {
				summary.Breaking += 1
			}
			if changelogView.ChangeSummary.SemiBreaking > 0 {
				summary.SemiBreaking += 1
			}
			if changelogView.ChangeSummary.Annotation > 0 {
				summary.Annotation += 1
			}
			if changelogView.ChangeSummary.Unclassified > 0 {
				summary.Unclassified += 1
			}
		}
		protobufApiAllChangesSummaryMap[key] = summary
	}

	cellsValues = make(map[string]interface{})
	cellsValues["A1"] = view.SummarySheetName
	cellsValues["A2"] = view.PackageIDColumnName
	cellsValues["A3"] = view.PackageNameColumnName
	cellsValues["A4"] = view.ServiceNameColumnName
	cellsValues["A5"] = view.VersionColumnName
	cellsValues["A6"] = view.PreviousVersionColumnName
	cellsValues["A7"] = view.APITypeColumnName
	cellsValues["A8"] = "Number of operations with breaking changes"
	cellsValues["A9"] = "Number of operations with risky changes"
	cellsValues["A10"] = "Number of operations with non-breaking changes"
	cellsValues["A11"] = "Number of operations with deprecated changes"
	cellsValues["A12"] = "Number of operations with annotation changes"
	cellsValues["A13"] = "Number of operations with unclassified changes"
	err = setCellsValues(report.workbook, view.SummarySheetName, cellsValues)
	if err != nil {
		return nil, err
	}
	err = report.workbook.SetCellStyle(view.SummarySheetName, "A1", "A1", summaryFirstHeaderStyle)
	if err != nil {
		return nil, err
	}
	err = report.workbook.SetCellStyle(view.SummarySheetName, "A2", "A13", summaryHeaderStyle)
	if err != nil {
		return nil, err
	}

	for key, value := range restApiAllChangesSummaryMap {
		versionName := versionChanges.Packages[key].RefPackageVersion
		if !versionChanges.Packages[key].NotLatestRevision {
			versionName, err = getVersionNameFromVersionWithRevision(versionChanges.Packages[key].RefPackageVersion)
			if err != nil {
				return nil, err
			}
		}
		previousVersionName := versionChanges.Packages[restApiMap[key][0].PreviousVersionPackageRef].RefPackageVersion
		if !versionChanges.Packages[restApiMap[key][0].PreviousVersionPackageRef].NotLatestRevision {
			previousVersionName, err = getVersionNameFromVersionWithRevision(versionChanges.Packages[restApiMap[key][0].PreviousVersionPackageRef].RefPackageVersion)
			if err != nil {
				return nil, err
			}
		}
		cellsValues = make(map[string]interface{})
		cellsValues["B2"] = versionChanges.Packages[key].RefPackageId
		cellsValues["B3"] = versionChanges.Packages[key].RefPackageName
		cellsValues["B4"] = versionChanges.Packages[key].ServiceName
		cellsValues["B5"] = versionName
		cellsValues["B6"] = previousVersionName
		cellsValues["B7"] = "rest"
		cellsValues["B8"] = value.Breaking
		cellsValues["B9"] = value.SemiBreaking
		cellsValues["B10"] = value.NonBreaking
		cellsValues["B11"] = value.Deprecated
		cellsValues["B12"] = value.Annotation
		cellsValues["B13"] = value.Unclassified
		err := setCellsValues(report.workbook, view.SummarySheetName, cellsValues)
		if err != nil {
			return nil, err
		}
		err = report.workbook.SetCellStyle(view.SummarySheetName, "B1", "B13", summaryCellStyle)
		if err != nil {
			return nil, err
		}
	}
	for key, value := range graphQLApiAllChangesSummaryMap {
		versionName := versionChanges.Packages[key].RefPackageVersion
		if !versionChanges.Packages[key].NotLatestRevision {
			versionName, err = getVersionNameFromVersionWithRevision(versionChanges.Packages[key].RefPackageVersion)
			if err != nil {
				return nil, err
			}
		}
		previousVersionName := versionChanges.Packages[graphQLApiMap[key][0].PreviousVersionPackageRef].RefPackageVersion
		if !versionChanges.Packages[graphQLApiMap[key][0].PreviousVersionPackageRef].NotLatestRevision {
			previousVersionName, err = getVersionNameFromVersionWithRevision(versionChanges.Packages[graphQLApiMap[key][0].PreviousVersionPackageRef].RefPackageVersion)
			if err != nil {
				return nil, err
			}
		}
		cellsValues = make(map[string]interface{})
		cellsValues["C2"] = versionChanges.Packages[key].RefPackageId
		cellsValues["C3"] = versionChanges.Packages[key].RefPackageName
		cellsValues["C4"] = versionChanges.Packages[key].ServiceName
		cellsValues["C5"] = versionName
		cellsValues["C6"] = previousVersionName
		cellsValues["C7"] = "graphQL"
		cellsValues["C8"] = value.Breaking
		cellsValues["C9"] = value.SemiBreaking
		cellsValues["C10"] = value.NonBreaking
		cellsValues["C11"] = value.Deprecated
		cellsValues["C12"] = value.Annotation
		cellsValues["C13"] = value.Unclassified
		err := setCellsValues(report.workbook, view.SummarySheetName, cellsValues)
		if err != nil {
			return nil, err
		}
		err = report.workbook.SetCellStyle(view.SummarySheetName, "C1", "C13", summaryCellStyle)
		if err != nil {
			return nil, err
		}
	}
	for key, value := range protobufApiAllChangesSummaryMap {
		versionName := versionChanges.Packages[key].RefPackageVersion
		if !versionChanges.Packages[key].NotLatestRevision {
			versionName, err = getVersionNameFromVersionWithRevision(versionChanges.Packages[key].RefPackageVersion)
			if err != nil {
				return nil, err
			}
		}
		previousVersionName := versionChanges.Packages[protobufApiMap[key][0].PreviousVersionPackageRef].RefPackageVersion
		if !versionChanges.Packages[protobufApiMap[key][0].PreviousVersionPackageRef].NotLatestRevision {
			previousVersionName, err = getVersionNameFromVersionWithRevision(versionChanges.Packages[protobufApiMap[key][0].PreviousVersionPackageRef].RefPackageVersion)
			if err != nil {
				return nil, err
			}
		}
		cellsValues = make(map[string]interface{})
		cellsValues["D2"] = versionChanges.Packages[key].RefPackageId
		cellsValues["D3"] = versionChanges.Packages[key].RefPackageName
		cellsValues["D4"] = versionChanges.Packages[key].ServiceName
		cellsValues["D5"] = versionName
		cellsValues["D6"] = previousVersionName
		cellsValues["D7"] = "protobuf"
		cellsValues["D8"] = value.Breaking
		cellsValues["D9"] = value.SemiBreaking
		cellsValues["D10"] = value.NonBreaking
		cellsValues["D11"] = value.Deprecated
		cellsValues["D12"] = value.Annotation
		cellsValues["D13"] = value.Unclassified
		err := setCellsValues(report.workbook, view.SummarySheetName, cellsValues)
		if err != nil {
			return nil, err
		}
		err = report.workbook.SetCellStyle(view.SummarySheetName, "D1", "D13", summaryCellStyle)
		if err != nil {
			return nil, err
		}
	}

	rowIndex := 2
	restSheetCreated := false
	for key, changelogRestOperationView := range restApiMap {
		versionName := versionChanges.Packages[key].RefPackageVersion
		if !versionChanges.Packages[key].NotLatestRevision {
			versionName, err = getVersionNameFromVersionWithRevision(versionChanges.Packages[key].RefPackageVersion)
			if err != nil {
				return nil, err
			}
		}
		for _, changelogView := range changelogRestOperationView {
			previousVersionName := versionChanges.Packages[changelogView.PreviousVersionPackageRef].RefPackageVersion
			if !versionChanges.Packages[changelogView.PreviousVersionPackageRef].NotLatestRevision {
				previousVersionName, err = getVersionNameFromVersionWithRevision(versionChanges.Packages[changelogView.PreviousVersionPackageRef].RefPackageVersion)
				if err != nil {
					return nil, err
				}
			}
			for _, change := range changelogView.Changes {
				commonOperationChange := view.GetSingleOperationChangeCommon(change)
				if !restSheetCreated {
					err := report.createRestSheet()
					if err != nil {
						return nil, err
					}
					restSheetCreated = true
				}
				cellsValues = make(map[string]interface{})
				cellsValues[fmt.Sprintf("A%d", rowIndex)] = versionChanges.Packages[key].RefPackageId
				cellsValues[fmt.Sprintf("B%d", rowIndex)] = versionChanges.Packages[key].RefPackageName
				cellsValues[fmt.Sprintf("C%d", rowIndex)] = versionChanges.Packages[key].ServiceName
				cellsValues[fmt.Sprintf("D%d", rowIndex)] = versionName
				cellsValues[fmt.Sprintf("E%d", rowIndex)] = previousVersionName
				cellsValues[fmt.Sprintf("F%d", rowIndex)] = strings.Replace(changelogView.Title, "Semi-Breaking", "Risky", -1)
				cellsValues[fmt.Sprintf("G%d", rowIndex)] = changelogView.Method
				cellsValues[fmt.Sprintf("H%d", rowIndex)] = changelogView.Path
				cellsValues[fmt.Sprintf("I%d", rowIndex)] = changelogView.Action
				cellsValues[fmt.Sprintf("J%d", rowIndex)] = commonOperationChange.Description
				cellsValues[fmt.Sprintf("K%d", rowIndex)] = mapServerity(commonOperationChange.Severity)
				cellsValues[fmt.Sprintf("L%d", rowIndex)] = versionChanges.Packages[key].Kind
				cellsValues[fmt.Sprintf("M%d", rowIndex)] = changelogView.ApiKind
				err := setCellsValues(report.workbook, view.RestAPISheetName, cellsValues)
				if err != nil {
					return nil, err
				}
				if rowIndex%2 == 0 {
					err = report.workbook.SetCellStyle(view.RestAPISheetName, fmt.Sprintf("A%d", rowIndex), fmt.Sprintf("M%d", rowIndex), evenCellStyle)
				} else {
					err = report.workbook.SetCellStyle(view.RestAPISheetName, fmt.Sprintf("A%d", rowIndex), fmt.Sprintf("M%d", rowIndex), oddCellStyle)
				}
				if err != nil {
					return nil, err
				}
				rowIndex += 1
			}
		}
	}

	rowIndex = 2
	graphQLSheetCreated := false
	for key, changelogGraphQLOperationView := range graphQLApiMap {
		versionName := versionChanges.Packages[key].RefPackageVersion
		if !versionChanges.Packages[key].NotLatestRevision {
			versionName, err = getVersionNameFromVersionWithRevision(versionChanges.Packages[key].RefPackageVersion)
			if err != nil {
				return nil, err
			}
		}
		for _, changelogView := range changelogGraphQLOperationView {
			previousVersionName := versionChanges.Packages[changelogView.PreviousVersionPackageRef].RefPackageVersion
			if !versionChanges.Packages[changelogView.PreviousVersionPackageRef].NotLatestRevision {
				previousVersionName, err = getVersionNameFromVersionWithRevision(versionChanges.Packages[changelogView.PreviousVersionPackageRef].RefPackageVersion)
				if err != nil {
					return nil, err
				}
			}
			for _, change := range changelogView.Changes {
				commonOperationChange := view.GetSingleOperationChangeCommon(change)
				if !graphQLSheetCreated {
					err := report.createGraphQLSheet()
					if err != nil {
						return nil, err
					}
					graphQLSheetCreated = true
				}
				cellsValues = make(map[string]interface{})
				cellsValues[fmt.Sprintf("A%d", rowIndex)] = versionChanges.Packages[key].RefPackageId
				cellsValues[fmt.Sprintf("B%d", rowIndex)] = versionChanges.Packages[key].RefPackageName
				cellsValues[fmt.Sprintf("C%d", rowIndex)] = versionChanges.Packages[key].ServiceName
				cellsValues[fmt.Sprintf("D%d", rowIndex)] = versionName
				cellsValues[fmt.Sprintf("E%d", rowIndex)] = previousVersionName
				cellsValues[fmt.Sprintf("F%d", rowIndex)] = strings.Replace(changelogView.Title, "Semi-Breaking", "Risky", -1)
				cellsValues[fmt.Sprintf("G%d", rowIndex)] = changelogView.Method
				cellsValues[fmt.Sprintf("H%d", rowIndex)] = changelogView.Type
				cellsValues[fmt.Sprintf("I%d", rowIndex)] = changelogView.Action
				cellsValues[fmt.Sprintf("J%d", rowIndex)] = commonOperationChange.Description
				cellsValues[fmt.Sprintf("K%d", rowIndex)] = mapServerity(commonOperationChange.Severity)
				cellsValues[fmt.Sprintf("L%d", rowIndex)] = versionChanges.Packages[key].Kind
				cellsValues[fmt.Sprintf("M%d", rowIndex)] = changelogView.ApiKind
				err := setCellsValues(report.workbook, view.GraphQLSheetName, cellsValues)
				if err != nil {
					return nil, err
				}
				if rowIndex%2 == 0 {
					err = report.workbook.SetCellStyle(view.GraphQLSheetName, fmt.Sprintf("A%d", rowIndex), fmt.Sprintf("M%d", rowIndex), evenCellStyle)
				} else {
					err = report.workbook.SetCellStyle(view.GraphQLSheetName, fmt.Sprintf("A%d", rowIndex), fmt.Sprintf("M%d", rowIndex), oddCellStyle)
				}
				if err != nil {
					return nil, err
				}
				rowIndex += 1
			}
		}
	}

	rowIndex = 2
	protobufSheetCreated := false
	for key, changelogProtobufOperationView := range protobufApiMap {
		versionName := versionChanges.Packages[key].RefPackageVersion
		if !versionChanges.Packages[key].NotLatestRevision {
			versionName, err = getVersionNameFromVersionWithRevision(versionChanges.Packages[key].RefPackageVersion)
			if err != nil {
				return nil, err
			}
		}
		for _, changelogView := range changelogProtobufOperationView {
			previousVersionName := versionChanges.Packages[changelogView.PreviousVersionPackageRef].RefPackageVersion
			if !versionChanges.Packages[changelogView.PreviousVersionPackageRef].NotLatestRevision {
				previousVersionName, err = getVersionNameFromVersionWithRevision(versionChanges.Packages[changelogView.PreviousVersionPackageRef].RefPackageVersion)
				if err != nil {
					return nil, err
				}
			}
			for _, change := range changelogView.Changes {
				commonOperationChange := view.GetSingleOperationChangeCommon(change)
				if !protobufSheetCreated {
					err := report.createProtobufSheet()
					if err != nil {
						return nil, err
					}
					protobufSheetCreated = true
				}
				cellsValues = make(map[string]interface{})
				cellsValues[fmt.Sprintf("A%d", rowIndex)] = versionChanges.Packages[key].RefPackageId
				cellsValues[fmt.Sprintf("B%d", rowIndex)] = versionChanges.Packages[key].RefPackageName
				cellsValues[fmt.Sprintf("C%d", rowIndex)] = versionChanges.Packages[key].ServiceName
				cellsValues[fmt.Sprintf("D%d", rowIndex)] = versionName
				cellsValues[fmt.Sprintf("E%d", rowIndex)] = previousVersionName
				cellsValues[fmt.Sprintf("F%d", rowIndex)] = strings.Replace(changelogView.Title, "Semi-Breaking", "Risky", -1)
				cellsValues[fmt.Sprintf("G%d", rowIndex)] = changelogView.Method
				cellsValues[fmt.Sprintf("H%d", rowIndex)] = changelogView.Type
				cellsValues[fmt.Sprintf("I%d", rowIndex)] = changelogView.Action
				cellsValues[fmt.Sprintf("J%d", rowIndex)] = commonOperationChange.Description
				cellsValues[fmt.Sprintf("K%d", rowIndex)] = mapServerity(commonOperationChange.Severity)
				cellsValues[fmt.Sprintf("L%d", rowIndex)] = versionChanges.Packages[key].Kind
				cellsValues[fmt.Sprintf("M%d", rowIndex)] = changelogView.ApiKind
				err := setCellsValues(report.workbook, view.ProtobufSheetName, cellsValues)
				if err != nil {
					return nil, err
				}
				if rowIndex%2 == 0 {
					err = report.workbook.SetCellStyle(view.ProtobufSheetName, fmt.Sprintf("A%d", rowIndex), fmt.Sprintf("M%d", rowIndex), evenCellStyle)
				} else {
					err = report.workbook.SetCellStyle(view.ProtobufSheetName, fmt.Sprintf("A%d", rowIndex), fmt.Sprintf("M%d", rowIndex), oddCellStyle)
				}
				if err != nil {
					return nil, err
				}
				rowIndex += 1
			}
		}
	}
	return report.workbook, nil
}

func mapServerity(severity string) string {
	switch severity {
	case "semi-breaking":
		return "risky"
	default:
		return severity
	}
}

func (a *ApiChangesReport) setupSettings() error {
	a.workbook.SetActiveSheet(a.firstSheetIndex)
	err := a.workbook.DeleteSheet("Sheet1")
	if err != nil {
		return err
	}
	err = a.workbook.SetColWidth(view.SummarySheetName, a.startColumn, a.endColumn, a.columnDefaultWidth)
	if err != nil {
		return err
	}
	return nil
}

func (o *OperationsReport) setupSettings() error {
	o.workbook.SetActiveSheet(o.firstSheetIndex)
	err := o.workbook.DeleteSheet("Sheet1")
	if err != nil {
		return err
	}
	return nil
}

func (o *DeprecatedOperationsReport) setupSettings() error {
	o.workbook.SetActiveSheet(o.firstSheetIndex)
	err := o.workbook.DeleteSheet("Sheet1")
	if err != nil {
		return err
	}
	return nil
}

func setCellsValues(report *excelize.File, sheetName string, columnsValue map[string]interface{}) error {
	for key, value := range columnsValue {
		err := report.SetCellValue(sheetName, key, value)
		if err != nil {
			return err
		}
	}
	return nil
}

func (a *ApiChangesReport) createGraphQLSheet() error {
	headerRowIndex := 1
	_, err := a.workbook.NewSheet(view.GraphQLSheetName)
	headerStyle := getHeaderStyle(a.workbook)
	if err != nil {
		return err
	}
	err = a.workbook.SetColWidth(view.GraphQLSheetName, a.startColumn, a.endColumn, a.columnDefaultWidth)
	if err != nil {
		return err
	}
	cellsValues := make(map[string]interface{})
	cellsValues[fmt.Sprintf("A%d", headerRowIndex)] = view.PackageIDColumnName
	cellsValues[fmt.Sprintf("B%d", headerRowIndex)] = view.PackageNameColumnName
	cellsValues[fmt.Sprintf("C%d", headerRowIndex)] = view.ServiceNameColumnName
	cellsValues[fmt.Sprintf("D%d", headerRowIndex)] = view.VersionColumnName
	cellsValues[fmt.Sprintf("E%d", headerRowIndex)] = view.PreviousVersionColumnName
	cellsValues[fmt.Sprintf("F%d", headerRowIndex)] = view.OperationTitleColumnName
	cellsValues[fmt.Sprintf("G%d", headerRowIndex)] = view.OperationMethodColumnName
	cellsValues[fmt.Sprintf("H%d", headerRowIndex)] = view.OperationTypeColumnName
	cellsValues[fmt.Sprintf("I%d", headerRowIndex)] = view.OperationActionColumnName
	cellsValues[fmt.Sprintf("J%d", headerRowIndex)] = view.ChangeDescriptionColumnName
	cellsValues[fmt.Sprintf("K%d", headerRowIndex)] = view.ChangeSeverityColumnName
	cellsValues[fmt.Sprintf("L%d", headerRowIndex)] = view.KindColumnName
	cellsValues[fmt.Sprintf("M%d", headerRowIndex)] = view.APIKindColumnName
	err = setCellsValues(a.workbook, view.GraphQLSheetName, cellsValues)
	if err != nil {
		return err
	}
	err = a.workbook.SetCellStyle(view.GraphQLSheetName, fmt.Sprintf("A%d", headerRowIndex), fmt.Sprintf("M%d", headerRowIndex), headerStyle)
	if err != nil {
		return err
	}
	err = a.workbook.AutoFilter(view.GraphQLSheetName, fmt.Sprintf("%s:%s", fmt.Sprintf("A%d", headerRowIndex), fmt.Sprintf("M%d", headerRowIndex)), []excelize.AutoFilterOptions{})
	if err != nil {
		return err
	}
	return nil
}

func (a *ApiChangesReport) createProtobufSheet() error {
	headerRowIndex := 1
	headerStyle := getHeaderStyle(a.workbook)
	_, err := a.workbook.NewSheet(view.ProtobufSheetName)
	if err != nil {
		return err
	}
	err = a.workbook.SetColWidth(view.ProtobufSheetName, a.startColumn, a.endColumn, a.columnDefaultWidth)
	if err != nil {
		return err
	}
	cellsValues := make(map[string]interface{})
	cellsValues[fmt.Sprintf("A%d", headerRowIndex)] = view.PackageIDColumnName
	cellsValues[fmt.Sprintf("B%d", headerRowIndex)] = view.PackageNameColumnName
	cellsValues[fmt.Sprintf("C%d", headerRowIndex)] = view.ServiceNameColumnName
	cellsValues[fmt.Sprintf("D%d", headerRowIndex)] = view.VersionColumnName
	cellsValues[fmt.Sprintf("E%d", headerRowIndex)] = view.PreviousVersionColumnName
	cellsValues[fmt.Sprintf("F%d", headerRowIndex)] = view.OperationTitleColumnName
	cellsValues[fmt.Sprintf("G%d", headerRowIndex)] = view.OperationMethodColumnName
	cellsValues[fmt.Sprintf("H%d", headerRowIndex)] = view.OperationTypeColumnName
	cellsValues[fmt.Sprintf("I%d", headerRowIndex)] = view.OperationActionColumnName
	cellsValues[fmt.Sprintf("J%d", headerRowIndex)] = view.ChangeDescriptionColumnName
	cellsValues[fmt.Sprintf("K%d", headerRowIndex)] = view.ChangeSeverityColumnName
	cellsValues[fmt.Sprintf("L%d", headerRowIndex)] = view.KindColumnName
	cellsValues[fmt.Sprintf("M%d", headerRowIndex)] = view.APIKindColumnName
	err = setCellsValues(a.workbook, view.ProtobufSheetName, cellsValues)
	if err != nil {
		return err
	}
	err = a.workbook.SetCellStyle(view.ProtobufSheetName, fmt.Sprintf("A%d", headerRowIndex), fmt.Sprintf("M%d", headerRowIndex), headerStyle)
	if err != nil {
		return err
	}
	err = a.workbook.AutoFilter(view.ProtobufSheetName, fmt.Sprintf("%s:%s", fmt.Sprintf("A%d", headerRowIndex), fmt.Sprintf("M%d", headerRowIndex)), []excelize.AutoFilterOptions{})
	if err != nil {
		return err
	}
	return nil
}

func (a *ApiChangesReport) createRestSheet() error {
	headerRowIndex := 1
	headerStyle := getHeaderStyle(a.workbook)
	_, err := a.workbook.NewSheet(view.RestAPISheetName)
	if err != nil {
		return err
	}
	err = a.workbook.SetColWidth(view.RestAPISheetName, a.startColumn, a.endColumn, a.columnDefaultWidth)
	if err != nil {
		return err
	}
	cellsValues := make(map[string]interface{})
	cellsValues[fmt.Sprintf("A%d", headerRowIndex)] = view.PackageIDColumnName
	cellsValues[fmt.Sprintf("B%d", headerRowIndex)] = view.PackageNameColumnName
	cellsValues[fmt.Sprintf("C%d", headerRowIndex)] = view.ServiceNameColumnName
	cellsValues[fmt.Sprintf("D%d", headerRowIndex)] = view.VersionColumnName
	cellsValues[fmt.Sprintf("E%d", headerRowIndex)] = view.PreviousVersionColumnName
	cellsValues[fmt.Sprintf("F%d", headerRowIndex)] = view.OperationTitleColumnName
	cellsValues[fmt.Sprintf("G%d", headerRowIndex)] = view.OperationMethodColumnName
	cellsValues[fmt.Sprintf("H%d", headerRowIndex)] = view.OperationPathColumnName
	cellsValues[fmt.Sprintf("I%d", headerRowIndex)] = view.OperationActionColumnName
	cellsValues[fmt.Sprintf("J%d", headerRowIndex)] = view.ChangeDescriptionColumnName
	cellsValues[fmt.Sprintf("K%d", headerRowIndex)] = view.ChangeSeverityColumnName
	cellsValues[fmt.Sprintf("L%d", headerRowIndex)] = view.KindColumnName
	cellsValues[fmt.Sprintf("M%d", headerRowIndex)] = view.APIKindColumnName
	err = setCellsValues(a.workbook, view.RestAPISheetName, cellsValues)
	if err != nil {
		return err
	}
	err = a.workbook.SetCellStyle(view.RestAPISheetName, fmt.Sprintf("A%d", headerRowIndex), fmt.Sprintf("M%d", headerRowIndex), headerStyle)
	if err != nil {
		return err
	}
	err = a.workbook.AutoFilter(view.RestAPISheetName, fmt.Sprintf("%s:%s", fmt.Sprintf("A%d", headerRowIndex), fmt.Sprintf("M%d", headerRowIndex)), []excelize.AutoFilterOptions{})
	if err != nil {
		return err
	}
	return nil
}

func (o *OperationsReport) createRestSheet() error {
	var err error
	headerRowIndex := 1
	o.firstSheetIndex, err = o.workbook.NewSheet(view.RestAPISheetName)
	headerStyle := getHeaderStyle(o.workbook)
	if err != nil {
		return err
	}
	err = o.workbook.SetColWidth(view.RestAPISheetName, o.startColumn, o.endColumn, o.columnDefaultWidth)
	if err != nil {
		return err
	}
	cellsValues := make(map[string]interface{})
	cellsValues[fmt.Sprintf("A%d", headerRowIndex)] = view.PackageIDColumnName
	cellsValues[fmt.Sprintf("B%d", headerRowIndex)] = view.PackageNameColumnName
	cellsValues[fmt.Sprintf("C%d", headerRowIndex)] = view.ServiceNameColumnName
	cellsValues[fmt.Sprintf("D%d", headerRowIndex)] = view.VersionColumnName
	cellsValues[fmt.Sprintf("E%d", headerRowIndex)] = view.OperationTitleColumnName
	cellsValues[fmt.Sprintf("F%d", headerRowIndex)] = view.OperationMethodColumnName
	cellsValues[fmt.Sprintf("G%d", headerRowIndex)] = view.OperationPathColumnName
	cellsValues[fmt.Sprintf("H%d", headerRowIndex)] = view.TagColumnName
	cellsValues[fmt.Sprintf("I%d", headerRowIndex)] = view.KindColumnName
	cellsValues[fmt.Sprintf("J%d", headerRowIndex)] = view.DeprecatedColumnName
	err = setCellsValues(o.workbook, view.RestAPISheetName, cellsValues)
	if err != nil {
		return err
	}
	err = o.workbook.SetCellStyle(view.RestAPISheetName, fmt.Sprintf("A%d", headerRowIndex), fmt.Sprintf("J%d", headerRowIndex), headerStyle)
	if err != nil {
		return err
	}
	err = o.workbook.AutoFilter(view.RestAPISheetName, fmt.Sprintf("%s:%s", fmt.Sprintf("A%d", headerRowIndex), fmt.Sprintf("J%d", headerRowIndex)), []excelize.AutoFilterOptions{})
	if err != nil {
		return err
	}
	return nil
}

func (o *OperationsReport) createGraphQLSheet() error {
	var err error
	headerRowIndex := 1
	o.firstSheetIndex, err = o.workbook.NewSheet(view.GraphQLSheetName)
	if err != nil {
		return err
	}
	err = o.workbook.SetColWidth(view.GraphQLSheetName, o.startColumn, o.endColumn, o.columnDefaultWidth)
	if err != nil {
		return err
	}
	headerStyle := getHeaderStyle(o.workbook)
	cellsValues := make(map[string]interface{})
	cellsValues[fmt.Sprintf("A%d", headerRowIndex)] = view.PackageIDColumnName
	cellsValues[fmt.Sprintf("B%d", headerRowIndex)] = view.PackageNameColumnName
	cellsValues[fmt.Sprintf("C%d", headerRowIndex)] = view.ServiceNameColumnName
	cellsValues[fmt.Sprintf("D%d", headerRowIndex)] = view.VersionColumnName
	cellsValues[fmt.Sprintf("E%d", headerRowIndex)] = view.OperationTitleColumnName
	cellsValues[fmt.Sprintf("F%d", headerRowIndex)] = view.OperationMethodColumnName
	cellsValues[fmt.Sprintf("G%d", headerRowIndex)] = view.OperationTypeColumnName
	cellsValues[fmt.Sprintf("H%d", headerRowIndex)] = view.KindColumnName
	cellsValues[fmt.Sprintf("I%d", headerRowIndex)] = view.Deprecated
	err = setCellsValues(o.workbook, view.GraphQLSheetName, cellsValues)
	if err != nil {
		return err
	}
	err = o.workbook.SetCellStyle(view.GraphQLSheetName, fmt.Sprintf("A%d", headerRowIndex), fmt.Sprintf("I%d", headerRowIndex), headerStyle)
	if err != nil {
		return err
	}
	err = o.workbook.AutoFilter(view.GraphQLSheetName, fmt.Sprintf("%s:%s", fmt.Sprintf("A%d", headerRowIndex), fmt.Sprintf("I%d", headerRowIndex)), []excelize.AutoFilterOptions{})
	if err != nil {
		return err
	}
	return nil
}

func getHeaderStyle(file *excelize.File) (style int) {
	headerStyle, _ := file.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Bold:   true,
			Family: "Arial",
			Size:   10,
			Color:  "FFFFFF",
		},
		Border: []excelize.Border{
			{Type: "left", Color: "E2E5E8", Style: 1},
			{Type: "right", Color: "E2E5E8", Style: 1},
			{Type: "top", Color: "E2E5E8", Style: 1},
			{Type: "bottom", Color: "E2E5E8", Style: 1},
		},
		Fill: excelize.Fill{
			Type:    "pattern",
			Color:   []string{"4E79A0"},
			Pattern: 1,
		},
	})
	return headerStyle
}

func getSummaryFirstHeaderStyle(file *excelize.File) (style int) {
	headerStyle, _ := file.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Bold:   true,
			Family: "Arial",
			Size:   10,
		},
		Border: []excelize.Border{
			{Type: "left", Color: "000000", Style: 1},
			{Type: "right", Color: "000000", Style: 1},
			{Type: "top", Color: "000000", Style: 1},
			{Type: "bottom", Color: "000000", Style: 1},
		},
		Fill: excelize.Fill{
			Type:    "pattern",
			Color:   []string{"DAE3ED"},
			Pattern: 1,
		},
		Alignment: &excelize.Alignment{
			Horizontal: "center",
		},
	})
	return headerStyle
}

func getSummaryHeaderStyle(file *excelize.File) (style int) {
	headerStyle, _ := file.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Bold:   true,
			Family: "Arial",
			Size:   10,
		},
		Border: []excelize.Border{
			{Type: "left", Color: "000000", Style: 1},
			{Type: "right", Color: "000000", Style: 1},
			{Type: "top", Color: "000000", Style: 1},
			{Type: "bottom", Color: "000000", Style: 1},
		},
		Fill: excelize.Fill{
			Type:    "pattern",
			Color:   []string{"DAE3ED"},
			Pattern: 1,
		},
	})
	return headerStyle
}

func buildCoverPage(file *excelize.File, packageName, reportName, packageVersion, packageVersionStatus string) error {
	var err error

	err = file.AddShape("Cover Page", "B15",
		&excelize.Shape{
			Type: "rect",
			Paragraph: []excelize.RichTextRun{
				{
					Text: packageName,
					Font: &excelize.Font{
						Family: "Arial",
						Size:   24,
						Color:  "183147",
					},
				},
			},
			Width:  800,
			Height: 50,
		},
	)
	if err != nil {
		return err
	}

	err = file.AddShape("Cover Page", "B18",
		&excelize.Shape{
			Type: "rect",
			Paragraph: []excelize.RichTextRun{
				{
					Text: reportName,
					Font: &excelize.Font{
						Family: "Arial",
						Size:   16,
						Color:  "91ABC4",
					},
				},
			},
			Width:  800,
			Height: 50,
		},
	)
	if err != nil {
		return err
	}

	err = file.SetCellValue("Cover Page", "C23", packageVersion)
	if err != nil {
		return err
	}
	err = file.SetCellValue("Cover Page", "C24", packageVersionStatus)
	if err != nil {
		return err
	}
	currentTime := time.Now()
	err = file.SetCellValue("Cover Page", "C25", currentTime.Format("2006-01-02")) // YYYY-MM-DD
	if err != nil {
		return err
	}
	return nil
}

func getEvenCellStyle(file *excelize.File) (style int) {
	evenCellStyle, _ := file.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Family: "Arial",
			Size:   10,
		},
		Border: []excelize.Border{
			{Type: "left", Color: "E2E5E8", Style: 1},
			{Type: "right", Color: "E2E5E8", Style: 1},
			{Type: "top", Color: "E2E5E8", Style: 1},
			{Type: "bottom", Color: "E2E5E8", Style: 1},
		},
		Fill: excelize.Fill{
			Type:    "pattern",
			Color:   []string{"#F5F7F8"},
			Pattern: 1,
		},
	})
	return evenCellStyle
}

func getOddCellStyle(file *excelize.File) (style int) {
	oddCellStyle, _ := file.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Family: "Arial",
			Size:   10,
		},
		Border: []excelize.Border{
			{Type: "left", Color: "E2E5E8", Style: 1},
			{Type: "right", Color: "E2E5E8", Style: 1},
			{Type: "top", Color: "E2E5E8", Style: 1},
			{Type: "bottom", Color: "E2E5E8", Style: 1},
		},
	})
	return oddCellStyle
}

func getSummaryCellStyle(file *excelize.File) (style int) {
	oddCellStyle, _ := file.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Family: "Arial",
			Size:   10,
		},
		Border: []excelize.Border{
			{Type: "left", Color: "000000", Style: 1},
			{Type: "right", Color: "000000", Style: 1},
			{Type: "top", Color: "000000", Style: 1},
			{Type: "bottom", Color: "000000", Style: 1},
		},
		Alignment: &excelize.Alignment{
			Horizontal: "left",
		},
	})
	return oddCellStyle
}

func (o *OperationsReport) createProtobufSheet() error {
	var err error
	headerRowIndex := 1
	o.firstSheetIndex, err = o.workbook.NewSheet(view.ProtobufSheetName)
	if err != nil {
		return err
	}
	err = o.workbook.SetColWidth(view.ProtobufSheetName, o.startColumn, o.endColumn, o.columnDefaultWidth)
	if err != nil {
		return err
	}
	headerStyle := getHeaderStyle(o.workbook)
	cellsValues := make(map[string]interface{})
	cellsValues[fmt.Sprintf("A%d", headerRowIndex)] = view.PackageIDColumnName
	cellsValues[fmt.Sprintf("B%d", headerRowIndex)] = view.PackageNameColumnName
	cellsValues[fmt.Sprintf("C%d", headerRowIndex)] = view.ServiceNameColumnName
	cellsValues[fmt.Sprintf("D%d", headerRowIndex)] = view.VersionColumnName
	cellsValues[fmt.Sprintf("E%d", headerRowIndex)] = view.OperationTitleColumnName
	cellsValues[fmt.Sprintf("F%d", headerRowIndex)] = view.OperationMethodColumnName
	cellsValues[fmt.Sprintf("G%d", headerRowIndex)] = view.OperationTypeColumnName
	cellsValues[fmt.Sprintf("H%d", headerRowIndex)] = view.KindColumnName
	cellsValues[fmt.Sprintf("I%d", headerRowIndex)] = view.Deprecated
	err = setCellsValues(o.workbook, view.ProtobufSheetName, cellsValues)
	if err != nil {
		return err
	}
	err = o.workbook.SetCellStyle(view.ProtobufSheetName, fmt.Sprintf("A%d", headerRowIndex), fmt.Sprintf("I%d", headerRowIndex), headerStyle)
	if err != nil {
		return err
	}
	err = o.workbook.AutoFilter(view.ProtobufSheetName, fmt.Sprintf("%s:%s", fmt.Sprintf("A%d", headerRowIndex), fmt.Sprintf("I%d", headerRowIndex)), []excelize.AutoFilterOptions{})
	if err != nil {
		return err
	}
	return nil
}

func (o *DeprecatedOperationsReport) createRestSheet() error {
	var err error
	headerRowIndex := 1
	headerStyle := getHeaderStyle(o.workbook)
	o.firstSheetIndex, err = o.workbook.NewSheet(view.RestAPISheetName)
	if err != nil {
		return err
	}
	err = o.workbook.SetColWidth(view.RestAPISheetName, o.startColumn, o.endColumn, o.columnDefaultWidth)
	if err != nil {
		return err
	}
	cellsValues := make(map[string]interface{})
	cellsValues[fmt.Sprintf("A%d", headerRowIndex)] = view.PackageIDColumnName
	cellsValues[fmt.Sprintf("B%d", headerRowIndex)] = view.PackageNameColumnName
	cellsValues[fmt.Sprintf("C%d", headerRowIndex)] = view.ServiceNameColumnName
	cellsValues[fmt.Sprintf("D%d", headerRowIndex)] = view.VersionColumnName
	cellsValues[fmt.Sprintf("E%d", headerRowIndex)] = view.OperationTitleColumnName
	cellsValues[fmt.Sprintf("F%d", headerRowIndex)] = view.OperationMethodColumnName
	cellsValues[fmt.Sprintf("G%d", headerRowIndex)] = view.OperationPathColumnName
	cellsValues[fmt.Sprintf("H%d", headerRowIndex)] = view.TagColumnName
	cellsValues[fmt.Sprintf("I%d", headerRowIndex)] = view.KindColumnName
	cellsValues[fmt.Sprintf("J%d", headerRowIndex)] = view.DeprecatedSinceColumnName
	cellsValues[fmt.Sprintf("K%d", headerRowIndex)] = view.DeprecatedDescriptionColumnName
	cellsValues[fmt.Sprintf("L%d", headerRowIndex)] = view.AdditionalInformationColumnName
	err = setCellsValues(o.workbook, view.RestAPISheetName, cellsValues)
	if err != nil {
		return err
	}
	err = o.workbook.SetCellStyle(view.RestAPISheetName, fmt.Sprintf("A%d", headerRowIndex), fmt.Sprintf("L%d", headerRowIndex), headerStyle)
	if err != nil {
		return err
	}
	err = o.workbook.AutoFilter(view.RestAPISheetName, fmt.Sprintf("%s:%s", fmt.Sprintf("A%d", headerRowIndex), fmt.Sprintf("L%d", headerRowIndex)), []excelize.AutoFilterOptions{})
	if err != nil {
		return err
	}
	return nil
}

func (o *DeprecatedOperationsReport) createGraphQLSheet() error {
	var err error
	headerRowIndex := 1
	headerStyle := getHeaderStyle(o.workbook)
	o.firstSheetIndex, err = o.workbook.NewSheet(view.GraphQLSheetName)
	if err != nil {
		return err
	}
	err = o.workbook.SetColWidth(view.GraphQLSheetName, o.startColumn, o.endColumn, o.columnDefaultWidth)
	if err != nil {
		return err
	}
	cellsValues := make(map[string]interface{})
	cellsValues[fmt.Sprintf("A%d", headerRowIndex)] = view.PackageIDColumnName
	cellsValues[fmt.Sprintf("B%d", headerRowIndex)] = view.PackageNameColumnName
	cellsValues[fmt.Sprintf("C%d", headerRowIndex)] = view.ServiceNameColumnName
	cellsValues[fmt.Sprintf("D%d", headerRowIndex)] = view.VersionColumnName
	cellsValues[fmt.Sprintf("E%d", headerRowIndex)] = view.OperationTitleColumnName
	cellsValues[fmt.Sprintf("F%d", headerRowIndex)] = view.OperationTypeColumnName
	cellsValues[fmt.Sprintf("G%d", headerRowIndex)] = view.OperationMethodColumnName
	cellsValues[fmt.Sprintf("H%d", headerRowIndex)] = view.TagColumnName
	cellsValues[fmt.Sprintf("I%d", headerRowIndex)] = view.KindColumnName
	cellsValues[fmt.Sprintf("J%d", headerRowIndex)] = view.DeprecatedSinceColumnName
	cellsValues[fmt.Sprintf("K%d", headerRowIndex)] = view.DeprecatedDescriptionColumnName
	cellsValues[fmt.Sprintf("L%d", headerRowIndex)] = view.AdditionalInformationColumnName
	err = setCellsValues(o.workbook, view.GraphQLSheetName, cellsValues)
	if err != nil {
		return err
	}
	err = o.workbook.SetCellStyle(view.GraphQLSheetName, fmt.Sprintf("A%d", headerRowIndex), fmt.Sprintf("L%d", headerRowIndex), headerStyle)
	if err != nil {
		return err
	}
	err = o.workbook.AutoFilter(view.GraphQLSheetName, fmt.Sprintf("%s:%s", fmt.Sprintf("A%d", headerRowIndex), fmt.Sprintf("L%d", headerRowIndex)), []excelize.AutoFilterOptions{})
	if err != nil {
		return err
	}
	return nil
}

func (o *DeprecatedOperationsReport) createProtobufSheet() error {
	var err error
	headerRowIndex := 1
	headerStyle := getHeaderStyle(o.workbook)
	o.firstSheetIndex, err = o.workbook.NewSheet(view.ProtobufSheetName)
	if err != nil {
		return err
	}
	err = o.workbook.SetColWidth(view.ProtobufSheetName, o.startColumn, o.endColumn, o.columnDefaultWidth)
	if err != nil {
		return err
	}
	cellsValues := make(map[string]interface{})
	cellsValues[fmt.Sprintf("A%d", headerRowIndex)] = view.PackageIDColumnName
	cellsValues[fmt.Sprintf("B%d", headerRowIndex)] = view.PackageNameColumnName
	cellsValues[fmt.Sprintf("C%d", headerRowIndex)] = view.ServiceNameColumnName
	cellsValues[fmt.Sprintf("D%d", headerRowIndex)] = view.VersionColumnName
	cellsValues[fmt.Sprintf("E%d", headerRowIndex)] = view.OperationTitleColumnName
	cellsValues[fmt.Sprintf("F%d", headerRowIndex)] = view.OperationTypeColumnName
	cellsValues[fmt.Sprintf("G%d", headerRowIndex)] = view.OperationMethodColumnName
	cellsValues[fmt.Sprintf("H%d", headerRowIndex)] = view.KindColumnName
	cellsValues[fmt.Sprintf("I%d", headerRowIndex)] = view.DeprecatedSinceColumnName
	cellsValues[fmt.Sprintf("J%d", headerRowIndex)] = view.DeprecatedDescriptionColumnName
	cellsValues[fmt.Sprintf("K%d", headerRowIndex)] = view.AdditionalInformationColumnName
	err = setCellsValues(o.workbook, view.ProtobufSheetName, cellsValues)
	if err != nil {
		return err
	}
	err = o.workbook.SetCellStyle(view.ProtobufSheetName, fmt.Sprintf("A%d", headerRowIndex), fmt.Sprintf("K%d", headerRowIndex), headerStyle)
	if err != nil {
		return err
	}
	err = o.workbook.AutoFilter(view.ProtobufSheetName, fmt.Sprintf("%s:%s", fmt.Sprintf("A%d", headerRowIndex), fmt.Sprintf("K%d", headerRowIndex)), []excelize.AutoFilterOptions{})
	if err != nil {
		return err
	}
	return nil
}

func (e excelServiceImpl) getVersionNameForAttachmentName(packageId, version string) (string, error) {
	latestRevision, err := e.publishedRepo.GetLatestRevision(packageId, version)
	if err != nil {
		return "", err
	}
	versionName, versionRevision, err := SplitVersionRevision(version)
	if err != nil {
		return "", err
	}
	if latestRevision == versionRevision {
		return versionName, nil
	}
	return version, nil
}

func getVersionNameFromVersionWithRevision(version string) (string, error) {
	versionName, _, err := SplitVersionRevision(version)
	if err != nil {
		return "", err
	}
	return versionName, nil
}

func (e excelServiceImpl) ExportBusinessMetrics(businessMetrics []view.BusinessMetric) (*excelize.File, string, error) {
	var err error
	workbook := excelize.NewFile()
	report := businessMetricsReport{
		workbook: workbook,
	}
	err = report.createResultSheet(businessMetrics)
	if err != nil {
		return nil, "", err
	}
	err = report.workbook.DeleteSheet("Sheet1")
	if err != nil {
		return nil, "", fmt.Errorf("failed to delete default Sheet1: %v", err.Error())
	}
	filename := fmt.Sprintf("business_metrics_%v.xlsx", time.Now().Format("2006-01-02 15-04-05"))
	return report.workbook, filename, nil
}

type businessMetricsReport struct {
	workbook *excelize.File
}

func (b *businessMetricsReport) createResultSheet(businessMetrics []view.BusinessMetric) error {
	sheetName := "Result"
	headerStyle := getHeaderStyle(b.workbook)
	evenCellStyle := getEvenCellStyle(b.workbook)
	oddCellStyle := getOddCellStyle(b.workbook)
	_, err := b.workbook.NewSheet(sheetName)
	if err != nil {
		return fmt.Errorf("failed to create new sheet: %v", err)
	}
	cells := make(map[string]interface{}, 0)
	cells["A1"] = "Date"
	cells["B1"] = "Package"
	cells["C1"] = "Metric"
	cells["D1"] = "User"
	cells["E1"] = "Value"
	err = b.workbook.SetCellStyle(sheetName, "A1", "E1", headerStyle)
	if err != nil {
		return err
	}

	b.workbook.SetColWidth(sheetName, "A", "A", 12)
	b.workbook.SetColWidth(sheetName, "B", "B", 30)
	b.workbook.SetColWidth(sheetName, "C", "C", 30)
	b.workbook.SetColWidth(sheetName, "D", "D", 30)
	b.workbook.SetColWidth(sheetName, "E", "E", 10)
	rowIndex := 2
	for _, businessMetric := range businessMetrics {
		cells[fmt.Sprintf("A%d", rowIndex)] = businessMetric.Date
		cells[fmt.Sprintf("B%d", rowIndex)] = businessMetric.PackageId
		cells[fmt.Sprintf("C%d", rowIndex)] = businessMetric.Metric
		cells[fmt.Sprintf("D%d", rowIndex)] = businessMetric.Username
		cells[fmt.Sprintf("E%d", rowIndex)] = businessMetric.Value
		if rowIndex%2 == 0 {
			err = b.workbook.SetCellStyle(sheetName, fmt.Sprintf("A%d", rowIndex), fmt.Sprintf("E%d", rowIndex), evenCellStyle)
		} else {
			err = b.workbook.SetCellStyle(sheetName, fmt.Sprintf("A%d", rowIndex), fmt.Sprintf("E%d", rowIndex), oddCellStyle)
		}
		if err != nil {
			return err
		}
		rowIndex++
	}
	err = setCellsValues(b.workbook, sheetName, cells)
	if err != nil {
		return fmt.Errorf("failed to set cell values: %v", err.Error())
	}
	return nil
}
