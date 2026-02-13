package service

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/Netcracker/qubership-apihub-agents-backend/client"
	"github.com/Netcracker/qubership-apihub-agents-backend/entity"
	"github.com/Netcracker/qubership-apihub-agents-backend/exception"
	"github.com/Netcracker/qubership-apihub-agents-backend/repository"
	"github.com/Netcracker/qubership-apihub-agents-backend/view"
	log "github.com/sirupsen/logrus"
	"github.com/xuri/excelize/v2"
)

type ExcelService interface {
	GetNamespaceSecurityAuthCheckReport(processId string) (*excelize.File, string, error)
}

func NewExcelService(namespaceSecurityRepository repository.NamespaceSecurityRepository, apihubClient client.ApihubClient) ExcelService {
	return &excelServiceImpl{
		namespaceSecurityRepository: namespaceSecurityRepository,
		apihubClient:                apihubClient,
	}
}

type excelServiceImpl struct {
	namespaceSecurityRepository repository.NamespaceSecurityRepository
	apihubClient                client.ApihubClient
}

type namespaceSecurityAuthReport struct {
	workbook *excelize.File
}

func (e *excelServiceImpl) GetNamespaceSecurityAuthCheckReport(processId string) (*excelize.File, string, error) {
	namespaceSecurityAuthWorkbook := excelize.NewFile()
	defer func() {
		if err := namespaceSecurityAuthWorkbook.Close(); err != nil {
			log.Errorf("failed to close worksheet: %v", err.Error())
		}
	}()
	report := namespaceSecurityAuthReport{
		workbook: namespaceSecurityAuthWorkbook,
	}
	securityCheckStatus, err := e.namespaceSecurityRepository.GetNamespaceSecurityCheckStatus(processId)
	if err != nil {
		return nil, "", err
	}
	if securityCheckStatus == nil {
		return nil, "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.SecurityCheckNotFound,
			Message: exception.SecurityCheckNotFoundMsg,
			Params:  map[string]interface{}{"processId": processId},
		}
	}
	err = report.createOverviewSheet(*securityCheckStatus)
	if err != nil {
		return nil, "", err
	}
	err = report.workbook.DeleteSheet("Sheet1")
	if err != nil {
		return nil, "", fmt.Errorf("failed to delete default Sheet1: %v", err.Error())
	}
	results, err := e.namespaceSecurityRepository.GetNamespaceSecurityCheckResults(processId)
	if err != nil {
		return nil, "", err
	}
	services, err := e.namespaceSecurityRepository.GetServicesForNamespaceSecurityCheck(processId)
	if err != nil {
		return nil, "", err
	}
	err = report.createServicesSheet(services, results)
	if err != nil {
		return nil, "", err
	}
	err = report.createEndpointsSheet(results)
	if err != nil {
		return nil, "", err
	}
	filename := fmt.Sprintf("%v authentication security report.xlsx", securityCheckStatus.Namespace)
	if securityCheckStatus.Status != string(view.StatusComplete) && securityCheckStatus.Status != string(view.StatusError) {
		filename = "IN PROGRESS_" + filename
	}
	return report.workbook, filename, nil
}

func (n *namespaceSecurityAuthReport) createOverviewSheet(securityCheckStatus entity.NamespaceSecurityCheckStatusEntity) error {
	sheetName := "Overview"
	_, err := n.workbook.NewSheet(sheetName)
	if err != nil {
		return fmt.Errorf("failed to create new sheet: %v", err)
	}
	cells := make(map[string]interface{}, 0)
	cells["A1"] = "Cloud"
	cells["B1"] = securityCheckStatus.CloudName
	cells["A2"] = "Namespace"
	cells["B2"] = securityCheckStatus.Namespace
	cells["A3"] = "Status"
	cells["B3"] = securityCheckStatus.Status
	cells["A4"] = "Services processed"
	cells["B4"] = securityCheckStatus.ServicesProcessed
	cells["A5"] = "Services total"
	cells["B5"] = securityCheckStatus.ServicesTotal
	cells["A6"] = "Details"
	cells["B6"] = securityCheckStatus.Details
	n.workbook.SetColWidth(sheetName, "A", "A", 20)
	n.workbook.SetColWidth(sheetName, "B", "B", 40)

	err = setCellsValues(n.workbook, sheetName, cells)
	if err != nil {
		return fmt.Errorf("failed to set cell values: %v", err.Error())
	}
	headerStyle, err := n.workbook.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "left"},
		Font:      &excelize.Font{Bold: true},
	})
	if err != nil {
		return fmt.Errorf("failed to create worksheet style: %v", err.Error())
	}
	valueStyle, err := n.workbook.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "left"},
	})
	if err != nil {
		return fmt.Errorf("failed to create worksheet style: %v", err.Error())
	}
	n.workbook.SetColStyle(sheetName, "A", headerStyle)
	n.workbook.SetColStyle(sheetName, "B", valueStyle)
	return nil
}

func (n *namespaceSecurityAuthReport) createServicesSheet(services []entity.NamespaceSecurityCheckServiceEntity, results []entity.NamespaceSecurityCheckResultEntity) error {
	sheetName := "Services"
	_, err := n.workbook.NewSheet(sheetName)
	if err != nil {
		return fmt.Errorf("failed to create new sheet: %v", err)
	}
	cells := make(map[string]interface{}, 0)
	cells["A1"] = "Service"
	cells["B1"] = "Endpoints total"
	cells["C1"] = "Endpoints failed"
	cells["D1"] = "Scan Status"
	cells["E1"] = "Result"
	cells["F1"] = "Apihub link"
	cells["G1"] = "Details"

	n.workbook.SetColWidth(sheetName, "A", "A", 30)
	n.workbook.SetColWidth(sheetName, "B", "C", 16)
	n.workbook.SetColWidth(sheetName, "D", "D", 12)
	n.workbook.SetColWidth(sheetName, "E", "E", 12)
	n.workbook.SetColWidth(sheetName, "F", "F", 30)
	n.workbook.SetColWidth(sheetName, "G", "G", 20)

	headerStyle, err := n.workbook.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "left"},
		Font:      &excelize.Font{Bold: true},
	})
	if err != nil {
		return fmt.Errorf("failed to create worksheet style: %v", err.Error())
	}
	valueStyle, err := n.workbook.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "left"},
	})
	if err != nil {
		return fmt.Errorf("failed to create worksheet style: %v", err.Error())
	}
	resultNotOkStyle, err := n.workbook.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "left"},
		Fill: excelize.Fill{
			Type:    "pattern",
			Pattern: 1,
			Color:   []string{"#ff6565"},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to create worksheet style: %v", err.Error())
	}
	resultOkStyle, err := n.workbook.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "left"},
		Fill: excelize.Fill{
			Type:    "pattern",
			Pattern: 1,
			Color:   []string{"#aad08e"},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to create worksheet style: %v", err.Error())
	}
	resultToCheckStyle, err := n.workbook.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "left"},
		Fill: excelize.Fill{
			Type:    "pattern",
			Pattern: 1,
			Color:   []string{"#c9c9c9"},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to create worksheet style: %v", err.Error())
	}
	hyperLinkStyle, err := n.workbook.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{
			Horizontal: "left",
		},
		Font: &excelize.Font{
			Underline: "single",
			Color:     "#0000EE",
		},
	})
	if err != nil {
		return fmt.Errorf("failed to create worksheet style: %v", err.Error())
	}
	n.workbook.SetRowStyle(sheetName, 2, len(services)+1, valueStyle)
	n.workbook.SetColStyle(sheetName, "F", hyperLinkStyle)
	n.workbook.SetRowStyle(sheetName, 1, 1, headerStyle)
	row := 2
	for _, service := range services {
		serviceResult := n.calculateAuthServiceResult(service, results)
		switch serviceResult {
		case view.ServiceResultOK:
			err = n.workbook.SetCellStyle(sheetName, fmt.Sprintf("E%d", row), fmt.Sprintf("E%d", row), resultOkStyle)
		case view.ServiceResultNotOK:
			err = n.workbook.SetCellStyle(sheetName, fmt.Sprintf("E%d", row), fmt.Sprintf("E%d", row), resultNotOkStyle)
		case view.ServiceResultToCheck:
			err = n.workbook.SetCellStyle(sheetName, fmt.Sprintf("E%d", row), fmt.Sprintf("E%d", row), resultToCheckStyle)
		}
		if err != nil {
			return fmt.Errorf("failed to apply style")
		}

		cells[fmt.Sprintf("A%d", row)] = service.ServiceId
		cells[fmt.Sprintf("B%d", row)] = service.EndpointsTotal
		cells[fmt.Sprintf("C%d", row)] = service.EndpointsFailed
		cells[fmt.Sprintf("D%d", row)] = service.Status
		cells[fmt.Sprintf("E%d", row)] = serviceResult
		if service.ApihubUrl != "" && service.PackageId != "" && service.Version != "" {
			apihubLink := fmt.Sprintf(`%s/portal/packages/%s/%s/operations`, service.ApihubUrl, service.PackageId, url.PathEscape(service.Version))
			n.workbook.SetCellHyperLink(sheetName, fmt.Sprintf("F%d", row), apihubLink, "External")
			cells[fmt.Sprintf("F%d", row)] = service.ServiceId
		}
		cells[fmt.Sprintf("G%d", row)] = service.Details
		row++
	}
	err = setCellsValues(n.workbook, sheetName, cells)
	if err != nil {
		return fmt.Errorf("failed to set cell values: %v", err.Error())
	}
	return nil
}

func (n *namespaceSecurityAuthReport) createEndpointsSheet(endpoints []entity.NamespaceSecurityCheckResultEntity) error {
	sheetName := "Endpoints"
	_, err := n.workbook.NewSheet(sheetName)
	if err != nil {
		return fmt.Errorf("failed to create new sheet: %v", err)
	}
	cells := make(map[string]interface{}, 0)
	cells["A1"] = "Service"
	cells["B1"] = "Method"
	cells["C1"] = "Path"
	cells["D1"] = "Security"
	cells["E1"] = "Actual code"
	cells["F1"] = "Expected code"
	cells["G1"] = "Status"
	cells["H1"] = "Details"

	n.workbook.SetColWidth(sheetName, "A", "A", 30)
	n.workbook.SetColWidth(sheetName, "B", "B", 10)
	n.workbook.SetColWidth(sheetName, "C", "C", 70)
	n.workbook.SetColWidth(sheetName, "D", "D", 30)
	n.workbook.SetColWidth(sheetName, "E", "E", 12)
	n.workbook.SetColWidth(sheetName, "F", "F", 15)
	n.workbook.SetColWidth(sheetName, "G", "G", 15)
	n.workbook.SetColWidth(sheetName, "H", "H", 20)

	headerStyle, err := n.workbook.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "left"},
		Font:      &excelize.Font{Bold: true},
	})
	if err != nil {
		return fmt.Errorf("failed to create worksheet style: %v", err.Error())
	}
	valueStyle, err := n.workbook.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "left"},
	})
	if err != nil {
		return fmt.Errorf("failed to create worksheet style: %v", err.Error())
	}
	statusNotOkStyle, err := n.workbook.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "left"},
		Fill: excelize.Fill{
			Type:    "pattern",
			Pattern: 1,
			Color:   []string{"#ff6565"},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to create worksheet style: %v", err.Error())
	}
	statusOkStyle, err := n.workbook.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "left"},
		Fill: excelize.Fill{
			Type:    "pattern",
			Pattern: 1,
			Color:   []string{"#aad08e"},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to create worksheet style: %v", err.Error())
	}
	statusUnknownStyle, err := n.workbook.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "left"},
		Fill: excelize.Fill{
			Type:    "pattern",
			Pattern: 1,
			Color:   []string{"#c9c9c9"},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to create worksheet style: %v", err.Error())
	}

	err = n.workbook.SetRowStyle(sheetName, 1, 1, headerStyle)
	if err != nil {
		return fmt.Errorf("failed to apply style to a row: %v", err.Error())
	}
	err = n.workbook.SetRowStyle(sheetName, 2, len(endpoints)+1, valueStyle)
	if err != nil {
		return fmt.Errorf("failed to apply style to a row")
	}
	row := 2
	for _, endpoint := range endpoints {
		endpointStatus := n.calculateAuthEndpointStatus(endpoint)
		switch endpointStatus {
		case view.EndpointStatusOK:
			err = n.workbook.SetCellStyle(sheetName, fmt.Sprintf("G%d", row), fmt.Sprintf("G%d", row), statusOkStyle)
		case view.EndpointStatusNotOK:
			err = n.workbook.SetCellStyle(sheetName, fmt.Sprintf("G%d", row), fmt.Sprintf("G%d", row), statusNotOkStyle)
		case view.EndpointStatusUnknown:
			err = n.workbook.SetCellStyle(sheetName, fmt.Sprintf("G%d", row), fmt.Sprintf("G%d", row), statusUnknownStyle)
		}
		if err != nil {
			return fmt.Errorf("failed to apply style")
		}
		cells[fmt.Sprintf("A%d", row)] = endpoint.ServiceId
		cells[fmt.Sprintf("B%d", row)] = endpoint.Method
		cells[fmt.Sprintf("C%d", row)] = endpoint.Path
		cells[fmt.Sprintf("D%d", row)] = strings.Join(endpoint.Security, ", ")
		cells[fmt.Sprintf("E%d", row)] = endpoint.ActualResponseCode
		if endpoint.ExpectedResponseCode != 0 {
			cells[fmt.Sprintf("F%d", row)] = endpoint.ExpectedResponseCode
		} else {
			cells[fmt.Sprintf("F%d", row)] = ""
		}
		cells[fmt.Sprintf("G%d", row)] = endpointStatus
		cells[fmt.Sprintf("H%d", row)] = endpoint.Details
		row++
	}
	err = setCellsValues(n.workbook, sheetName, cells)
	if err != nil {
		return fmt.Errorf("failed to set cell values: %v", err.Error())
	}
	return nil
}

func (n *namespaceSecurityAuthReport) calculateAuthServiceResult(service entity.NamespaceSecurityCheckServiceEntity, endpoints []entity.NamespaceSecurityCheckResultEntity) string {
	serviceResult := view.ServiceResultOK
	if service.Status == string(view.StatusRunning) || service.Status == string(view.StatusError) || service.Status == string(view.StatusNone) {
		return view.ServiceResultUnknown
	}
	for _, endpoint := range endpoints {
		if endpoint.ServiceId == service.ServiceId && endpoint.ProcessId == service.ProcessId {
			switch n.calculateAuthEndpointStatus(endpoint) {
			case view.EndpointStatusNotOK:
				return view.ServiceResultNotOK
			case view.EndpointStatusUnknown:
				if serviceResult != view.ServiceResultToCheck {
					serviceResult = view.ServiceResultToCheck
				}
			}
		}
	}
	return serviceResult
}

func (n *namespaceSecurityAuthReport) calculateAuthEndpointStatus(endpoint entity.NamespaceSecurityCheckResultEntity) string {
	if endpoint.ExpectedResponseCode == 0 {
		return view.EndpointStatusUnknown
	} else if endpoint.ActualResponseCode != endpoint.ExpectedResponseCode {
		return view.EndpointStatusNotOK
	} else {
		return view.EndpointStatusOK
	}
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
