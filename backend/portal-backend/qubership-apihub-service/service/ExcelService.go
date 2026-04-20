package service

import (
	"fmt"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
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
	BuildShareabilityReport(groupId, versionName string) (*excelize.File, string, error)
	ParseShareabilityReport(in io.Reader) ([]view.ShareabilityReportRow, error)
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
		AsyncapiChannel:          req.AsyncapiChannel,
		AsyncapiProtocol:         req.AsyncapiProtocol,
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
		Kind:             req.Kind,
		EmptyTag:         req.EmptyTag,
		Tag:              req.Tag,
		TextFilter:       req.TextFilter,
		ApiType:          apiType,
		RefPackageId:     req.RefPackageId,
		Group:            req.Group,
		EmptyGroup:       req.EmptyGroup,
		ApiAudience:      req.ApiAudience,
		AsyncapiChannel:  req.AsyncapiChannel,
		AsyncapiProtocol: req.AsyncapiProtocol,
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
		AsyncapiChannel:        req.AsyncapiChannel,
		AsyncapiProtocol:       req.AsyncapiProtocol,
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
		endColumn:          "M",
		columnDefaultWidth: 35,
	}

	buildCoverPage(report.workbook, packageName, "Deprecated API Operations", versionName, versionStatus)

	evenCellStyle := getEvenCellStyle(report.workbook)
	oddCellStyle := getOddCellStyle(report.workbook)
	restOperations := make(map[string][]view.DeprecatedRestOperationView)
	graphQLOperations := make(map[string][]view.DeprecateGraphQLOperationView)
	protobufOperations := make(map[string][]view.DeprecateProtobufOperationView)
	asyncapiOperations := make(map[string][]view.DeprecatedAsyncAPIOperationView)

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
		if asyncapiOperation, ok := operation.(view.DeprecatedAsyncAPIOperationView); ok {
			asyncapiOperations[asyncapiOperation.PackageRef] = append(asyncapiOperations[asyncapiOperation.PackageRef], asyncapiOperation)
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

	rowIndex = 2
	asyncapiSheetCreated := false
	for packageRef, operationsView := range asyncapiOperations {
		versionName := deprecatedOperations.Packages[packageRef].RefPackageVersion
		if !deprecatedOperations.Packages[packageRef].NotLatestRevision {
			versionName, err = getVersionNameFromVersionWithRevision(deprecatedOperations.Packages[packageRef].RefPackageVersion)
			if err != nil {
				return nil, err
			}
		}
		for _, operationView := range operationsView {
			if !asyncapiSheetCreated {
				err := report.createAsyncAPISheet()
				if err != nil {
					return nil, err
				}
				asyncapiSheetCreated = true
			}
			for _, deprecatedItem := range operationView.DeprecatedItems {
				cellsValues = make(map[string]interface{})
				cellsValues[fmt.Sprintf("A%d", rowIndex)] = deprecatedOperations.Packages[packageRef].RefPackageId
				cellsValues[fmt.Sprintf("B%d", rowIndex)] = deprecatedOperations.Packages[packageRef].RefPackageName
				cellsValues[fmt.Sprintf("C%d", rowIndex)] = deprecatedOperations.Packages[packageRef].ServiceName
				cellsValues[fmt.Sprintf("D%d", rowIndex)] = versionName
				cellsValues[fmt.Sprintf("E%d", rowIndex)] = operationView.Title
				cellsValues[fmt.Sprintf("F%d", rowIndex)] = operationView.Action
				cellsValues[fmt.Sprintf("G%d", rowIndex)] = operationView.Channel
				cellsValues[fmt.Sprintf("H%d", rowIndex)] = operationView.Protocol
				cellsValues[fmt.Sprintf("I%d", rowIndex)] = operationView.AsyncOperationId
				cellsValues[fmt.Sprintf("J%d", rowIndex)] = operationView.MessageId
				cellsValues[fmt.Sprintf("K%d", rowIndex)] = strings.Join(operationView.Tags, ",")
				cellsValues[fmt.Sprintf("L%d", rowIndex)] = strings.ToUpper(operationView.ApiKind)
				if len(deprecatedItem.PreviousReleaseVersions) > 0 {
					cellsValues[fmt.Sprintf("M%d", rowIndex)] = deprecatedItem.PreviousReleaseVersions[0]
				}
				cellsValues[fmt.Sprintf("N%d", rowIndex)] = deprecatedItem.Description
				if deprecatedItem.DeprecatedInfo != "" {
					cellsValues[fmt.Sprintf("O%d", rowIndex)] = deprecatedItem.DeprecatedInfo
				}
				err := setCellsValues(report.workbook, view.AsyncAPISheetName, cellsValues)
				if err != nil {
					return nil, err
				}
				if rowIndex%2 == 0 {
					err = report.workbook.SetCellStyle(view.AsyncAPISheetName, fmt.Sprintf("A%d", rowIndex), fmt.Sprintf("O%d", rowIndex), evenCellStyle)
				} else {
					err = report.workbook.SetCellStyle(view.AsyncAPISheetName, fmt.Sprintf("A%d", rowIndex), fmt.Sprintf("O%d", rowIndex), oddCellStyle)
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
		endColumn:          "K",
		columnDefaultWidth: 35,
	}

	buildCoverPage(report.workbook, packageName, "API Operations", versionName, versionStatus)

	evenCellStyle := getEvenCellStyle(report.workbook)
	oddCellStyle := getOddCellStyle(report.workbook)

	restOperations := make(map[string][]view.RestOperationView)
	graphQLOperations := make(map[string][]view.GraphQLOperationView)
	protobufOperations := make(map[string][]view.ProtobufOperationView)
	asyncapiOperations := make(map[string][]view.AsyncAPIOperationView)

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
		if asyncapiOperation, ok := operation.(view.AsyncAPIOperationView); ok {
			asyncapiOperations[asyncapiOperation.PackageRef] = append(asyncapiOperations[asyncapiOperation.PackageRef], asyncapiOperation)
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

	rowIndex = 2
	asyncapiSheetCreated := false
	for packageRef, operationsView := range asyncapiOperations {
		versionName := operations.Packages[packageRef].RefPackageVersion
		if !operations.Packages[packageRef].NotLatestRevision {
			versionName, err = getVersionNameFromVersionWithRevision(operations.Packages[packageRef].RefPackageVersion)
			if err != nil {
				return nil, err
			}
		}
		for _, operationView := range operationsView {
			if !asyncapiSheetCreated {
				err := report.createAsyncAPISheet()
				if err != nil {
					return nil, err
				}
				asyncapiSheetCreated = true
			}
			cellsValues = make(map[string]interface{})
			cellsValues[fmt.Sprintf("A%d", rowIndex)] = operations.Packages[packageRef].RefPackageId
			cellsValues[fmt.Sprintf("B%d", rowIndex)] = operations.Packages[packageRef].RefPackageName
			cellsValues[fmt.Sprintf("C%d", rowIndex)] = operations.Packages[packageRef].ServiceName
			cellsValues[fmt.Sprintf("D%d", rowIndex)] = versionName
			cellsValues[fmt.Sprintf("E%d", rowIndex)] = operationView.Title
			cellsValues[fmt.Sprintf("F%d", rowIndex)] = operationView.Action
			cellsValues[fmt.Sprintf("G%d", rowIndex)] = operationView.Channel
			cellsValues[fmt.Sprintf("H%d", rowIndex)] = operationView.Protocol
			cellsValues[fmt.Sprintf("I%d", rowIndex)] = operationView.AsyncOperationId
			cellsValues[fmt.Sprintf("J%d", rowIndex)] = operationView.MessageId
			cellsValues[fmt.Sprintf("K%d", rowIndex)] = strings.Join(operationView.Tags, " ")
			cellsValues[fmt.Sprintf("L%d", rowIndex)] = strings.ToUpper(operationView.ApiKind)
			cellsValues[fmt.Sprintf("M%d", rowIndex)] = strings.ToLower(strconv.FormatBool(operationView.Deprecated))
			err := setCellsValues(report.workbook, view.AsyncAPISheetName, cellsValues)
			if err != nil {
				return nil, err
			}
			if rowIndex%2 == 0 {
				err = report.workbook.SetCellStyle(view.AsyncAPISheetName, fmt.Sprintf("A%d", rowIndex), fmt.Sprintf("M%d", rowIndex), evenCellStyle)
			} else {
				err = report.workbook.SetCellStyle(view.AsyncAPISheetName, fmt.Sprintf("A%d", rowIndex), fmt.Sprintf("M%d", rowIndex), oddCellStyle)
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
		endColumn:          "N",
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
	asyncapiApiMap := make(map[string][]view.AsyncAPIOperationComparisonChangesView)
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
		if asyncapiOperation, ok := operation.(view.AsyncAPIOperationComparisonChangesView); ok {
			if asyncapiOperation.PackageRef == "" {
				asyncapiApiMap[asyncapiOperation.PreviousVersionPackageRef] = append(asyncapiApiMap[asyncapiOperation.PreviousVersionPackageRef], asyncapiOperation)
				continue
			}
			asyncapiApiMap[asyncapiOperation.PackageRef] = append(asyncapiApiMap[asyncapiOperation.PackageRef], asyncapiOperation)
		}
	}

	restApiAllChangesSummaryMap := make(map[string]view.ChangeSummary)
	graphQLApiAllChangesSummaryMap := make(map[string]view.ChangeSummary)
	protobufApiAllChangesSummaryMap := make(map[string]view.ChangeSummary)
	asyncapiApiAllChangesSummaryMap := make(map[string]view.ChangeSummary)

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
	for key, value := range asyncapiApiMap {
		summary := asyncapiApiAllChangesSummaryMap[key]
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
		asyncapiApiAllChangesSummaryMap[key] = summary
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
	cellsValues["A9"] = "Number of operations with changes requiring attention"
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

	colNum := 2 // B

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
		colName, _ := excelize.ColumnNumberToName(colNum)
		colNum++
		cellsValues = make(map[string]interface{})
		cellsValues[fmt.Sprintf("%s2", colName)] = versionChanges.Packages[key].RefPackageId
		cellsValues[fmt.Sprintf("%s3", colName)] = versionChanges.Packages[key].RefPackageName
		cellsValues[fmt.Sprintf("%s4", colName)] = versionChanges.Packages[key].ServiceName
		cellsValues[fmt.Sprintf("%s5", colName)] = versionName
		cellsValues[fmt.Sprintf("%s6", colName)] = previousVersionName
		cellsValues[fmt.Sprintf("%s7", colName)] = "rest"
		cellsValues[fmt.Sprintf("%s8", colName)] = value.Breaking
		cellsValues[fmt.Sprintf("%s9", colName)] = value.SemiBreaking
		cellsValues[fmt.Sprintf("%s10", colName)] = value.NonBreaking
		cellsValues[fmt.Sprintf("%s11", colName)] = value.Deprecated
		cellsValues[fmt.Sprintf("%s12", colName)] = value.Annotation
		cellsValues[fmt.Sprintf("%s13", colName)] = value.Unclassified
		err := setCellsValues(report.workbook, view.SummarySheetName, cellsValues)
		if err != nil {
			return nil, err
		}
		err = report.workbook.SetCellStyle(view.SummarySheetName, fmt.Sprintf("%s1", colName), fmt.Sprintf("%s13", colName), summaryCellStyle)
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
		colName, _ := excelize.ColumnNumberToName(colNum)
		colNum++
		cellsValues = make(map[string]interface{})
		cellsValues[fmt.Sprintf("%s2", colName)] = versionChanges.Packages[key].RefPackageId
		cellsValues[fmt.Sprintf("%s3", colName)] = versionChanges.Packages[key].RefPackageName
		cellsValues[fmt.Sprintf("%s4", colName)] = versionChanges.Packages[key].ServiceName
		cellsValues[fmt.Sprintf("%s5", colName)] = versionName
		cellsValues[fmt.Sprintf("%s6", colName)] = previousVersionName
		cellsValues[fmt.Sprintf("%s7", colName)] = "graphQL"
		cellsValues[fmt.Sprintf("%s8", colName)] = value.Breaking
		cellsValues[fmt.Sprintf("%s9", colName)] = value.SemiBreaking
		cellsValues[fmt.Sprintf("%s10", colName)] = value.NonBreaking
		cellsValues[fmt.Sprintf("%s11", colName)] = value.Deprecated
		cellsValues[fmt.Sprintf("%s12", colName)] = value.Annotation
		cellsValues[fmt.Sprintf("%s13", colName)] = value.Unclassified
		err := setCellsValues(report.workbook, view.SummarySheetName, cellsValues)
		if err != nil {
			return nil, err
		}
		err = report.workbook.SetCellStyle(view.SummarySheetName, fmt.Sprintf("%s1", colName), fmt.Sprintf("%s13", colName), summaryCellStyle)
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
		colName, _ := excelize.ColumnNumberToName(colNum)
		colNum++
		cellsValues = make(map[string]interface{})
		cellsValues[fmt.Sprintf("%s2", colName)] = versionChanges.Packages[key].RefPackageId
		cellsValues[fmt.Sprintf("%s3", colName)] = versionChanges.Packages[key].RefPackageName
		cellsValues[fmt.Sprintf("%s4", colName)] = versionChanges.Packages[key].ServiceName
		cellsValues[fmt.Sprintf("%s5", colName)] = versionName
		cellsValues[fmt.Sprintf("%s6", colName)] = previousVersionName
		cellsValues[fmt.Sprintf("%s7", colName)] = "protobuf"
		cellsValues[fmt.Sprintf("%s8", colName)] = value.Breaking
		cellsValues[fmt.Sprintf("%s9", colName)] = value.SemiBreaking
		cellsValues[fmt.Sprintf("%s10", colName)] = value.NonBreaking
		cellsValues[fmt.Sprintf("%s11", colName)] = value.Deprecated
		cellsValues[fmt.Sprintf("%s12", colName)] = value.Annotation
		cellsValues[fmt.Sprintf("%s13", colName)] = value.Unclassified
		err := setCellsValues(report.workbook, view.SummarySheetName, cellsValues)
		if err != nil {
			return nil, err
		}
		err = report.workbook.SetCellStyle(view.SummarySheetName, fmt.Sprintf("%s1", colName), fmt.Sprintf("%s13", colName), summaryCellStyle)
		if err != nil {
			return nil, err
		}
	}
	for key, value := range asyncapiApiAllChangesSummaryMap {
		versionName := versionChanges.Packages[key].RefPackageVersion
		if !versionChanges.Packages[key].NotLatestRevision {
			versionName, err = getVersionNameFromVersionWithRevision(versionChanges.Packages[key].RefPackageVersion)
			if err != nil {
				return nil, err
			}
		}
		previousVersionName := versionChanges.Packages[asyncapiApiMap[key][0].PreviousVersionPackageRef].RefPackageVersion
		if !versionChanges.Packages[asyncapiApiMap[key][0].PreviousVersionPackageRef].NotLatestRevision {
			previousVersionName, err = getVersionNameFromVersionWithRevision(versionChanges.Packages[asyncapiApiMap[key][0].PreviousVersionPackageRef].RefPackageVersion)
			if err != nil {
				return nil, err
			}
		}
		colName, _ := excelize.ColumnNumberToName(colNum)
		colNum++
		cellsValues = make(map[string]interface{})
		cellsValues[fmt.Sprintf("%s2", colName)] = versionChanges.Packages[key].RefPackageId
		cellsValues[fmt.Sprintf("%s3", colName)] = versionChanges.Packages[key].RefPackageName
		cellsValues[fmt.Sprintf("%s4", colName)] = versionChanges.Packages[key].ServiceName
		cellsValues[fmt.Sprintf("%s5", colName)] = versionName
		cellsValues[fmt.Sprintf("%s6", colName)] = previousVersionName
		cellsValues[fmt.Sprintf("%s7", colName)] = "asyncapi"
		cellsValues[fmt.Sprintf("%s8", colName)] = value.Breaking
		cellsValues[fmt.Sprintf("%s9", colName)] = value.SemiBreaking
		cellsValues[fmt.Sprintf("%s10", colName)] = value.NonBreaking
		cellsValues[fmt.Sprintf("%s11", colName)] = value.Deprecated
		cellsValues[fmt.Sprintf("%s12", colName)] = value.Annotation
		cellsValues[fmt.Sprintf("%s13", colName)] = value.Unclassified
		err := setCellsValues(report.workbook, view.SummarySheetName, cellsValues)
		if err != nil {
			return nil, err
		}
		err = report.workbook.SetCellStyle(view.SummarySheetName, fmt.Sprintf("%s1", colName), fmt.Sprintf("%s13", colName), summaryCellStyle)
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
				cellsValues[fmt.Sprintf("F%d", rowIndex)] = changelogView.Title
				cellsValues[fmt.Sprintf("G%d", rowIndex)] = changelogView.Method
				cellsValues[fmt.Sprintf("H%d", rowIndex)] = changelogView.Path
				cellsValues[fmt.Sprintf("I%d", rowIndex)] = changelogView.Action
				cellsValues[fmt.Sprintf("J%d", rowIndex)] = commonOperationChange.Description
				cellsValues[fmt.Sprintf("K%d", rowIndex)] = mapSeverity(commonOperationChange.Severity)
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
				cellsValues[fmt.Sprintf("F%d", rowIndex)] = changelogView.Title
				cellsValues[fmt.Sprintf("G%d", rowIndex)] = changelogView.Method
				cellsValues[fmt.Sprintf("H%d", rowIndex)] = changelogView.Type
				cellsValues[fmt.Sprintf("I%d", rowIndex)] = changelogView.Action
				cellsValues[fmt.Sprintf("J%d", rowIndex)] = commonOperationChange.Description
				cellsValues[fmt.Sprintf("K%d", rowIndex)] = mapSeverity(commonOperationChange.Severity)
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
				cellsValues[fmt.Sprintf("F%d", rowIndex)] = changelogView.Title
				cellsValues[fmt.Sprintf("G%d", rowIndex)] = changelogView.Method
				cellsValues[fmt.Sprintf("H%d", rowIndex)] = changelogView.Type
				cellsValues[fmt.Sprintf("I%d", rowIndex)] = changelogView.Action
				cellsValues[fmt.Sprintf("J%d", rowIndex)] = commonOperationChange.Description
				cellsValues[fmt.Sprintf("K%d", rowIndex)] = mapSeverity(commonOperationChange.Severity)
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

	rowIndex = 2
	asyncapiSheetCreated := false
	for key, changelogAsyncAPIOperationView := range asyncapiApiMap {
		versionName := versionChanges.Packages[key].RefPackageVersion
		if !versionChanges.Packages[key].NotLatestRevision {
			versionName, err = getVersionNameFromVersionWithRevision(versionChanges.Packages[key].RefPackageVersion)
			if err != nil {
				return nil, err
			}
		}
		for _, changelogView := range changelogAsyncAPIOperationView {
			previousVersionName := versionChanges.Packages[changelogView.PreviousVersionPackageRef].RefPackageVersion
			if !versionChanges.Packages[changelogView.PreviousVersionPackageRef].NotLatestRevision {
				previousVersionName, err = getVersionNameFromVersionWithRevision(versionChanges.Packages[changelogView.PreviousVersionPackageRef].RefPackageVersion)
				if err != nil {
					return nil, err
				}
			}
			for _, change := range changelogView.Changes {
				commonOperationChange := view.GetSingleOperationChangeCommon(change)
				if !asyncapiSheetCreated {
					err := report.createAsyncAPISheet()
					if err != nil {
						return nil, err
					}
					asyncapiSheetCreated = true
				}
				cellsValues = make(map[string]interface{})
				cellsValues[fmt.Sprintf("A%d", rowIndex)] = versionChanges.Packages[key].RefPackageId
				cellsValues[fmt.Sprintf("B%d", rowIndex)] = versionChanges.Packages[key].RefPackageName
				cellsValues[fmt.Sprintf("C%d", rowIndex)] = versionChanges.Packages[key].ServiceName
				cellsValues[fmt.Sprintf("D%d", rowIndex)] = versionName
				cellsValues[fmt.Sprintf("E%d", rowIndex)] = previousVersionName
				cellsValues[fmt.Sprintf("F%d", rowIndex)] = changelogView.Title
				cellsValues[fmt.Sprintf("G%d", rowIndex)] = changelogView.AsyncAPIOperationMetadata.Action
				cellsValues[fmt.Sprintf("H%d", rowIndex)] = changelogView.Channel
				cellsValues[fmt.Sprintf("I%d", rowIndex)] = changelogView.Protocol
				cellsValues[fmt.Sprintf("J%d", rowIndex)] = changelogView.AsyncOperationId
				cellsValues[fmt.Sprintf("K%d", rowIndex)] = changelogView.MessageId
				cellsValues[fmt.Sprintf("L%d", rowIndex)] = changelogView.OperationComparisonChangesView.Action
				cellsValues[fmt.Sprintf("M%d", rowIndex)] = commonOperationChange.Description
				cellsValues[fmt.Sprintf("N%d", rowIndex)] = mapSeverity(commonOperationChange.Severity)
				cellsValues[fmt.Sprintf("O%d", rowIndex)] = versionChanges.Packages[key].Kind
				cellsValues[fmt.Sprintf("P%d", rowIndex)] = changelogView.ApiKind
				err := setCellsValues(report.workbook, view.AsyncAPISheetName, cellsValues)
				if err != nil {
					return nil, err
				}
				if rowIndex%2 == 0 {
					err = report.workbook.SetCellStyle(view.AsyncAPISheetName, fmt.Sprintf("A%d", rowIndex), fmt.Sprintf("P%d", rowIndex), evenCellStyle)
				} else {
					err = report.workbook.SetCellStyle(view.AsyncAPISheetName, fmt.Sprintf("A%d", rowIndex), fmt.Sprintf("P%d", rowIndex), oddCellStyle)
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

func mapSeverity(severity string) string {
	switch severity {
	case "semi-breaking":
		return "requires attention"
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

func (a *ApiChangesReport) createAsyncAPISheet() error {
	headerRowIndex := 1
	headerStyle := getHeaderStyle(a.workbook)
	_, err := a.workbook.NewSheet(view.AsyncAPISheetName)
	if err != nil {
		return err
	}
	err = a.workbook.SetColWidth(view.AsyncAPISheetName, a.startColumn, a.endColumn, a.columnDefaultWidth)
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
	cellsValues[fmt.Sprintf("G%d", headerRowIndex)] = view.AsyncAPIActionColumnName
	cellsValues[fmt.Sprintf("H%d", headerRowIndex)] = view.OperationChannelColumnName
	cellsValues[fmt.Sprintf("I%d", headerRowIndex)] = view.OperationProtocolColumnName
	cellsValues[fmt.Sprintf("J%d", headerRowIndex)] = view.AsyncOperationIdColumnName
	cellsValues[fmt.Sprintf("K%d", headerRowIndex)] = view.MessageIdColumnName
	cellsValues[fmt.Sprintf("L%d", headerRowIndex)] = view.OperationActionColumnName
	cellsValues[fmt.Sprintf("M%d", headerRowIndex)] = view.ChangeDescriptionColumnName
	cellsValues[fmt.Sprintf("N%d", headerRowIndex)] = view.ChangeSeverityColumnName
	cellsValues[fmt.Sprintf("O%d", headerRowIndex)] = view.KindColumnName
	cellsValues[fmt.Sprintf("P%d", headerRowIndex)] = view.APIKindColumnName
	err = setCellsValues(a.workbook, view.AsyncAPISheetName, cellsValues)
	if err != nil {
		return err
	}
	err = a.workbook.SetCellStyle(view.AsyncAPISheetName, fmt.Sprintf("A%d", headerRowIndex), fmt.Sprintf("P%d", headerRowIndex), headerStyle)
	if err != nil {
		return err
	}
	err = a.workbook.AutoFilter(view.AsyncAPISheetName, fmt.Sprintf("%s:%s", fmt.Sprintf("A%d", headerRowIndex), fmt.Sprintf("P%d", headerRowIndex)), []excelize.AutoFilterOptions{})
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

func (o *OperationsReport) createAsyncAPISheet() error {
	var err error
	headerRowIndex := 1
	o.firstSheetIndex, err = o.workbook.NewSheet(view.AsyncAPISheetName)
	if err != nil {
		return err
	}
	err = o.workbook.SetColWidth(view.AsyncAPISheetName, o.startColumn, o.endColumn, o.columnDefaultWidth)
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
	cellsValues[fmt.Sprintf("F%d", headerRowIndex)] = view.AsyncAPIActionColumnName
	cellsValues[fmt.Sprintf("G%d", headerRowIndex)] = view.OperationChannelColumnName
	cellsValues[fmt.Sprintf("H%d", headerRowIndex)] = view.OperationProtocolColumnName
	cellsValues[fmt.Sprintf("I%d", headerRowIndex)] = view.AsyncOperationIdColumnName
	cellsValues[fmt.Sprintf("J%d", headerRowIndex)] = view.MessageIdColumnName
	cellsValues[fmt.Sprintf("K%d", headerRowIndex)] = view.TagColumnName
	cellsValues[fmt.Sprintf("L%d", headerRowIndex)] = view.KindColumnName
	cellsValues[fmt.Sprintf("M%d", headerRowIndex)] = view.DeprecatedColumnName
	err = setCellsValues(o.workbook, view.AsyncAPISheetName, cellsValues)
	if err != nil {
		return err
	}
	err = o.workbook.SetCellStyle(view.AsyncAPISheetName, fmt.Sprintf("A%d", headerRowIndex), fmt.Sprintf("M%d", headerRowIndex), headerStyle)
	if err != nil {
		return err
	}
	err = o.workbook.AutoFilter(view.AsyncAPISheetName, fmt.Sprintf("%s:%s", fmt.Sprintf("A%d", headerRowIndex), fmt.Sprintf("M%d", headerRowIndex)), []excelize.AutoFilterOptions{})
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

func (o *DeprecatedOperationsReport) createAsyncAPISheet() error {
	var err error
	headerRowIndex := 1
	headerStyle := getHeaderStyle(o.workbook)
	o.firstSheetIndex, err = o.workbook.NewSheet(view.AsyncAPISheetName)
	if err != nil {
		return err
	}
	err = o.workbook.SetColWidth(view.AsyncAPISheetName, o.startColumn, o.endColumn, o.columnDefaultWidth)
	if err != nil {
		return err
	}
	cellsValues := make(map[string]interface{})
	cellsValues[fmt.Sprintf("A%d", headerRowIndex)] = view.PackageIDColumnName
	cellsValues[fmt.Sprintf("B%d", headerRowIndex)] = view.PackageNameColumnName
	cellsValues[fmt.Sprintf("C%d", headerRowIndex)] = view.ServiceNameColumnName
	cellsValues[fmt.Sprintf("D%d", headerRowIndex)] = view.VersionColumnName
	cellsValues[fmt.Sprintf("E%d", headerRowIndex)] = view.OperationTitleColumnName
	cellsValues[fmt.Sprintf("F%d", headerRowIndex)] = view.AsyncAPIActionColumnName
	cellsValues[fmt.Sprintf("G%d", headerRowIndex)] = view.OperationChannelColumnName
	cellsValues[fmt.Sprintf("H%d", headerRowIndex)] = view.OperationProtocolColumnName
	cellsValues[fmt.Sprintf("I%d", headerRowIndex)] = view.AsyncOperationIdColumnName
	cellsValues[fmt.Sprintf("J%d", headerRowIndex)] = view.MessageIdColumnName
	cellsValues[fmt.Sprintf("K%d", headerRowIndex)] = view.TagColumnName
	cellsValues[fmt.Sprintf("L%d", headerRowIndex)] = view.KindColumnName
	cellsValues[fmt.Sprintf("M%d", headerRowIndex)] = view.DeprecatedSinceColumnName
	cellsValues[fmt.Sprintf("N%d", headerRowIndex)] = view.DeprecatedDescriptionColumnName
	cellsValues[fmt.Sprintf("O%d", headerRowIndex)] = view.AdditionalInformationColumnName
	err = setCellsValues(o.workbook, view.AsyncAPISheetName, cellsValues)
	if err != nil {
		return err
	}
	err = o.workbook.SetCellStyle(view.AsyncAPISheetName, fmt.Sprintf("A%d", headerRowIndex), fmt.Sprintf("O%d", headerRowIndex), headerStyle)
	if err != nil {
		return err
	}
	err = o.workbook.AutoFilter(view.AsyncAPISheetName, fmt.Sprintf("%s:%s", fmt.Sprintf("A%d", headerRowIndex), fmt.Sprintf("O%d", headerRowIndex)), []excelize.AutoFilterOptions{})
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

func (e excelServiceImpl) BuildShareabilityReport(groupId, versionName string) (*excelize.File, string, error) {
	if err := ValidateVersionName(versionName); err != nil {
		return nil, "", err
	}

	packages, err := e.packageService.GetGroupDescendantPackages(groupId)
	if err != nil {
		return nil, "", err
	}

	rows, err := e.collectShareabilityRows(packages, versionName)
	if err != nil {
		return nil, "", err
	}
	sortShareabilityRows(rows)

	report := &shareabilityReport{workbook: excelize.NewFile(), rows: rows}
	if err := report.build(); err != nil {
		if cerr := report.workbook.Close(); cerr != nil {
			log.Errorf("Failed to close shareability report workbook on error: %v", cerr.Error())
		}
		return nil, "", err
	}

	filename := fmt.Sprintf("shareability_report_%s_%s_%v.xlsx",
		groupId, versionName, time.Now().Format("2006-01-02-15-04-05"))
	return report.workbook, filename, nil
}

func (e excelServiceImpl) collectShareabilityRows(packages []entity.PackageEntity, versionName string) ([]view.ShareabilityReportRow, error) {
	rows := make([]view.ShareabilityReportRow, 0)
	for _, pkg := range packages {
		docs, found, err := e.versionService.GetVersionDocumentsMetadata(pkg.Id, versionName)
		if err != nil {
			return nil, err
		}
		if !found {
			continue
		}
		for _, doc := range docs {
			rows = append(rows, view.ShareabilityReportRow{
				PackageName:    pkg.Name,
				DocumentName:   buildDocumentDisplayName(doc),
				Shareability:   doc.Shareability,
				PackageId:      pkg.Id,
				PackageVersion: versionName,
				Slug:           doc.Slug,
			})
		}
	}
	return rows, nil
}

func sortShareabilityRows(rows []view.ShareabilityReportRow) {
	sort.SliceStable(rows, func(i, j int) bool {
		ri, rj := rows[i], rows[j]
		if c := strings.Compare(strings.ToLower(ri.PackageName), strings.ToLower(rj.PackageName)); c != 0 {
			return c < 0
		}
		if c := strings.Compare(strings.ToLower(ri.DocumentName), strings.ToLower(rj.DocumentName)); c != 0 {
			return c < 0
		}
		return strings.Compare(strings.ToLower(ri.Slug), strings.ToLower(rj.Slug)) < 0
	})
}

func (e excelServiceImpl) ParseShareabilityReport(in io.Reader) ([]view.ShareabilityReportRow, error) {
	workbook, err := excelize.OpenReader(in)
	if err != nil {
		if strings.Contains(err.Error(), "http: request body too large") {
			return nil, &exception.CustomError{
				Status:  http.StatusRequestEntityTooLarge,
				Code:    exception.TemplateSizeExceeded,
				Message: exception.TemplateSizeExceededMsg,
				Params:  map[string]interface{}{"size": "10 MB"},
			}
		}
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidShareabilityReportStructure,
			Message: exception.InvalidShareabilityReportStructureMsg,
			Params:  map[string]interface{}{"details": "failed to open xlsx: " + err.Error()},
		}
	}
	defer workbook.Close()

	sheetName := view.ShareabilityReportSheetName
	if idx, err := workbook.GetSheetIndex(sheetName); err != nil || idx < 0 {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidShareabilityReportStructure,
			Message: exception.InvalidShareabilityReportStructureMsg,
			Params:  map[string]interface{}{"details": fmt.Sprintf("missing required sheet '%s'", sheetName)},
		}
	}

	allRows, err := workbook.GetRows(sheetName)
	if err != nil {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidShareabilityReportStructure,
			Message: exception.InvalidShareabilityReportStructureMsg,
			Params:  map[string]interface{}{"details": "failed to read sheet rows: " + err.Error()},
		}
	}

	if len(allRows) == 0 {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidShareabilityReportStructure,
			Message: exception.InvalidShareabilityReportStructureMsg,
			Params:  map[string]interface{}{"details": "sheet is empty, header row is missing"},
		}
	}

	expectedHeaders := []string{
		view.ShareabilityReportColPackageName,
		view.ShareabilityReportColDocumentName,
		view.ShareabilityReportColShareability,
		view.ShareabilityReportColPackageId,
		view.ShareabilityReportColPackageVersion,
		view.ShareabilityReportColSlug,
	}
	header := allRows[0]
	if len(header) != len(expectedHeaders) {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidShareabilityReportStructure,
			Message: exception.InvalidShareabilityReportStructureMsg,
			Params:  map[string]interface{}{"details": fmt.Sprintf("header row has %d columns, expected %d", len(header), len(expectedHeaders))},
		}
	}
	for i, want := range expectedHeaders {
		if strings.TrimSpace(header[i]) != want {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidShareabilityReportStructure,
				Message: exception.InvalidShareabilityReportStructureMsg,
				Params:  map[string]interface{}{"details": fmt.Sprintf("column %d header is '%s', expected '%s'", i+1, header[i], want)},
			}
		}
	}

	rows := make([]view.ShareabilityReportRow, 0, len(allRows)-1)
	for idx := 1; idx < len(allRows); idx++ {
		raw := allRows[idx]
		xlsxRow := idx + 1

		cells := make([]string, len(expectedHeaders))
		for i := 0; i < len(expectedHeaders) && i < len(raw); i++ {
			cells[i] = strings.TrimSpace(raw[i])
		}

		allEmpty := true
		for _, c := range cells {
			if c != "" {
				allEmpty = false
				break
			}
		}
		if allEmpty {
			continue
		}

		row := view.ShareabilityReportRow{
			PackageName:    cells[0],
			DocumentName:   cells[1],
			Shareability:   cells[2],
			PackageId:      cells[3],
			PackageVersion: cells[4],
			Slug:           cells[5],
			XlsxRowNumber:  xlsxRow,
		}
		if row.Shareability == "" || row.PackageId == "" || row.PackageVersion == "" || row.Slug == "" {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidShareabilityReportRow,
				Message: exception.InvalidShareabilityReportRowMsg,
				Params: map[string]interface{}{
					"row":     xlsxRow,
					"details": "required cells (Shareability, Package Id, Package Version, Slug) must be non-empty",
				},
			}
		}
		rows = append(rows, row)
	}

	return rows, nil
}

func buildDocumentDisplayName(doc entity.PublishedContentEntity) string {
	name := doc.Title
	if doc.Metadata.GetVersion() != "" {
		name += " " + doc.Metadata.GetVersion()
	}
	return name
}

type shareabilityReport struct {
	workbook *excelize.File
	rows     []view.ShareabilityReportRow
}

func (r *shareabilityReport) build() error {
	if err := r.createReportSheet(); err != nil {
		return err
	}
	if err := r.workbook.DeleteSheet("Sheet1"); err != nil {
		return fmt.Errorf("failed to delete default Sheet1: %v", err.Error())
	}
	return nil
}

func (r *shareabilityReport) createReportSheet() error {
	sheetName := view.ShareabilityReportSheetName
	if _, err := r.workbook.NewSheet(sheetName); err != nil {
		return fmt.Errorf("failed to create shareability report sheet: %v", err)
	}

	headerStyle := getHeaderStyle(r.workbook)
	evenCellStyle := getEvenCellStyle(r.workbook)
	oddCellStyle := getOddCellStyle(r.workbook)

	cells := map[string]interface{}{
		"A1": view.ShareabilityReportColPackageName,
		"B1": view.ShareabilityReportColDocumentName,
		"C1": view.ShareabilityReportColShareability,
		"D1": view.ShareabilityReportColPackageId,
		"E1": view.ShareabilityReportColPackageVersion,
		"F1": view.ShareabilityReportColSlug,
	}
	if err := r.workbook.SetCellStyle(sheetName, "A1", "F1", headerStyle); err != nil {
		return err
	}
	r.workbook.SetColWidth(sheetName, "A", "A", 30)
	r.workbook.SetColWidth(sheetName, "B", "B", 60)
	r.workbook.SetColWidth(sheetName, "C", "C", 16)
	r.workbook.SetColWidth(sheetName, "D", "D", 40)
	r.workbook.SetColWidth(sheetName, "E", "E", 20)
	r.workbook.SetColWidth(sheetName, "F", "F", 30)
	if err := r.workbook.SetPanes(sheetName, &excelize.Panes{Freeze: true, Split: false, YSplit: 1, TopLeftCell: "A2", ActivePane: "bottomLeft"}); err != nil {
		return err
	}

	rowIndex := 2
	for _, row := range r.rows {
		cells[fmt.Sprintf("A%d", rowIndex)] = row.PackageName
		cells[fmt.Sprintf("B%d", rowIndex)] = row.DocumentName
		cells[fmt.Sprintf("C%d", rowIndex)] = row.Shareability
		cells[fmt.Sprintf("D%d", rowIndex)] = row.PackageId
		cells[fmt.Sprintf("E%d", rowIndex)] = row.PackageVersion
		cells[fmt.Sprintf("F%d", rowIndex)] = row.Slug
		style := oddCellStyle
		if rowIndex%2 == 0 {
			style = evenCellStyle
		}
		if err := r.workbook.SetCellStyle(sheetName, fmt.Sprintf("A%d", rowIndex), fmt.Sprintf("F%d", rowIndex), style); err != nil {
			return err
		}
		rowIndex++
	}

	if err := setCellsValues(r.workbook, sheetName, cells); err != nil {
		return fmt.Errorf("failed to set cell values: %v", err.Error())
	}

	lastDataRow := rowIndex - 1
	if lastDataRow >= 2 {
		dv := excelize.NewDataValidation(true)
		dv.SetSqref(fmt.Sprintf("C2:C%d", lastDataRow))
		allowed := view.AllowedShareabilityValues()
		if err := dv.SetDropList(allowed); err != nil {
			return fmt.Errorf("failed to configure shareability dropdown: %v", err.Error())
		}
		dv.SetError(excelize.DataValidationErrorStyleStop,
			"Invalid shareability value",
			fmt.Sprintf("Allowed values: %s", strings.Join(allowed, ", ")))
		if err := r.workbook.AddDataValidation(sheetName, dv); err != nil {
			return fmt.Errorf("failed to add shareability data validation: %v", err.Error())
		}
	}

	filterRange := "A1:F1"
	if lastDataRow >= 2 {
		filterRange = fmt.Sprintf("A1:F%d", lastDataRow)
	}
	if err := r.workbook.AutoFilter(sheetName, filterRange, []excelize.AutoFilterOptions{}); err != nil {
		return fmt.Errorf("failed to set auto filter on shareability report: %v", err.Error())
	}
	return nil
}
