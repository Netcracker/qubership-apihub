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
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-agents-backend/client"
	"github.com/Netcracker/qubership-apihub-agents-backend/entity"
	"github.com/Netcracker/qubership-apihub-agents-backend/exception"
	"github.com/Netcracker/qubership-apihub-agents-backend/repository"
	"github.com/Netcracker/qubership-apihub-agents-backend/secctx"
	"github.com/Netcracker/qubership-apihub-agents-backend/utils"
	"github.com/Netcracker/qubership-apihub-agents-backend/view"
	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
)

type NamespaceSecurityService interface {
	StartAuthSecurityCheckProcess(ctx context.Context, req view.StartNamespaceSecurityCheckReq) (string, error)
	GetAuthSecurityCheckReports(req view.GetNamespaceSecurityCheckReq) (*view.NamespaceSecurityCheckReports, error)
	GetAuthSecurityCheckStatus(processId string) (*view.NamespaceSecurityCheckStatus, error)
}

func NewNamespaceSecurityService(agentClient client.AgentClient, apihubClient client.ApihubClient, namespaceSecurityRepo repository.NamespaceSecurityRepository,
	agentService AgentService, snapshotService SnapshotService, apiKeyService ApiKeyService, userService UserService, systemInfoService SystemInfoService) NamespaceSecurityService {
	return &namespaceSecurityServiceImpl{
		agentClient:           agentClient,
		apihubClient:          apihubClient,
		namespaceSecurityRepo: namespaceSecurityRepo,
		agentService:          agentService,
		snapshotService:       snapshotService,
		apiKeyService:         apiKeyService,
		userService:           userService,
		systemInfoService:     systemInfoService,
	}
}

type namespaceSecurityServiceImpl struct {
	agentClient           client.AgentClient
	apihubClient          client.ApihubClient
	namespaceSecurityRepo repository.NamespaceSecurityRepository
	agentService          AgentService
	snapshotService       SnapshotService
	apiKeyService         ApiKeyService
	userService           UserService
	systemInfoService     SystemInfoService
}

func (n *namespaceSecurityServiceImpl) StartAuthSecurityCheckProcess(ctx context.Context, req view.StartNamespaceSecurityCheckReq) (string, error) {
	agent, err := n.agentService.GetAgent(req.AgentId)
	if err != nil {
		if customError, ok := err.(*exception.CustomError); ok {
			return "", customError
		} else {
			return "", &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get agent by id - '$id'",
				Debug:   err.Error(),
				Params:  map[string]interface{}{"id": req.AgentId}}
		}
	}
	if agent == nil {
		return "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.AgentNotFound,
			Message: exception.AgentNotFoundMsg,
			Params:  map[string]interface{}{"agentId": req.AgentId},
		}
	}

	namespaces, err := n.agentClient.GetNamespaces(ctx, agent.AgentUrl)
	if err != nil {
		return "", fmt.Errorf("failed to list namespaces for agent (agentUrl = '%v')", req.AgentId)
	}
	namespaceExists := false
	for _, agentNamespace := range namespaces.Namespaces {
		if agentNamespace == req.Namespace {
			namespaceExists = true
			break
		}
	}
	if !namespaceExists {
		return "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.NamespaceNotFound,
			Message: exception.NamespaceNotFoundMsg,
			Params:  map[string]interface{}{"namespace": req.Namespace, "agentId": req.AgentId},
		}
	}
	workspace, err := n.apihubClient.GetPackageById(ctx, req.WorkspaceId)
	if err != nil {
		return "", fmt.Errorf("failed to get workspace by id: %v", err.Error())
	}
	if workspace == nil || workspace.Kind != string(view.KindWorkspace) {
		return "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.WorkspaceNotFound,
			Message: exception.WorkspaceNotFoundMsg,
			Params:  map[string]interface{}{"workspaceId": req.WorkspaceId},
		}
	}

	processId := uuid.NewString()
	namespaceSecurityCheckEntity := entity.NamespaceSecurityCheckEntity{
		CloudName:   namespaces.CloudName,
		AgentId:     req.AgentId,
		Namespace:   req.Namespace,
		WorkspaceId: req.WorkspaceId,
		ProcessId:   processId,
		Status:      string(view.StatusRunning),
		StartedAt:   time.Now(),
		StartedBy:   secctx.GetUserId(ctx),
	}
	err = n.namespaceSecurityRepo.SaveNamespaceSecurityCheck(&namespaceSecurityCheckEntity)
	if err != nil {
		return "", fmt.Errorf("failed to store security check process entity: %v", err.Error())
	}
	utils.SafeAsync(func() {
		n.startAuthSecurityCheck(namespaceSecurityCheckEntity, agent.AgentUrl)
	})
	return processId, nil
}

func (n *namespaceSecurityServiceImpl) startAuthSecurityCheck(securityCheck entity.NamespaceSecurityCheckEntity, agentUrl string) {
	systemCtx := secctx.MakeSysadminContext(context.Background())
	err := n.agentClient.StartDiscovery(systemCtx, securityCheck.Namespace, securityCheck.WorkspaceId, agentUrl, false)
	if err != nil {
		n.updateProcessStatus(&securityCheck, view.StatusError, fmt.Sprintf("failed to start service discovery: %v", err.Error()))
		return
	}
	discoveryResult, err := n.getDiscoveryResults(systemCtx, securityCheck.Namespace, securityCheck.WorkspaceId, agentUrl)
	if err != nil {
		n.updateProcessStatus(&securityCheck, view.StatusError, fmt.Sprintf("failed to get service discovery result: %v", err.Error()))
		return
	}
	if len(discoveryResult.Services) == 0 {
		n.updateProcessStatus(&securityCheck, view.StatusComplete, fmt.Sprintf("0 services found for namespace %v", securityCheck.Namespace))
		return
	}
	authSecurityCheckVersionName := makeAuthSecurityCheckVersionName()
	supportedServiceIds := make([]string, 0)
	serviceEnts := make([]entity.NamespaceSecurityCheckServiceEntity, 0)
	for _, svc := range discoveryResult.Services {
		serviceSupported := false
		for _, spec := range svc.Documents {
			if spec.Type == view.OpenAPI20Type || spec.Type == view.OpenAPI30Type || spec.Type == view.OpenAPI31Type {
				serviceSupported = true
				supportedServiceIds = append(supportedServiceIds, svc.Id)
				serviceEnts = append(serviceEnts, entity.NamespaceSecurityCheckServiceEntity{
					ProcessId:       securityCheck.ProcessId,
					ServiceId:       svc.Id,
					EndpointsTotal:  0,
					EndpointsFailed: 0,
					Status:          string(view.StatusNone),
				})
				break
			}
		}
		if !serviceSupported {
			serviceEnts = append(serviceEnts, entity.NamespaceSecurityCheckServiceEntity{
				ProcessId:       securityCheck.ProcessId,
				ServiceId:       svc.Id,
				EndpointsTotal:  0,
				EndpointsFailed: 0,
				Status:          string(view.StatusComplete),
				Details:         "unsupported service (no valid openapi specs)",
			})
		}
	}
	err = n.namespaceSecurityRepo.SaveNamespaceSecurityCheckServices(serviceEnts)
	if err != nil {
		n.updateProcessStatus(&securityCheck, view.StatusError, fmt.Sprintf("failed to store services: %v", err.Error()))
		return
	}

	if len(supportedServiceIds) == 0 {
		n.updateProcessStatus(&securityCheck, view.StatusComplete, "found 0 services with valid openapi specs")
		return
	}

	newSnapshot := view.CreateSnapshotDTO{
		Services:      supportedServiceIds,
		ClientBuild:   false,
		Promote:       false,
		VersionStatus: string(view.DraftStatus),
		CloudName:     securityCheck.CloudName,
		AgentUrl:      agentUrl,
	}
	snapshot, err := n.snapshotService.CreateSnapshot(systemCtx, securityCheck.Namespace, securityCheck.WorkspaceId, authSecurityCheckVersionName, newSnapshot)
	if err != nil {
		n.updateProcessStatus(&securityCheck, view.StatusError, fmt.Sprintf("failed to create snapshot for discovered services: %v", err.Error()))
		return
	}
	servicesMap := map[string]view.BuildConfig{}
	for _, svc := range snapshot.Services {
		servicesMap[svc.PublishId] = svc
	}
	start := time.Now()
	failedServices := make([]entity.NamespaceSecurityCheckServiceEntity, 0)

	tasks := make(chan view.EndpointsProcessTask, len(servicesMap))
	results := make(chan int, len(servicesMap))
	startedTasks := 0
	numberOfWorkers := 10
	if len(servicesMap) < 10 {
		numberOfWorkers = len(servicesMap)
	}
	for i := 1; i <= numberOfWorkers; i++ {
		utils.SafeAsync(func() {
			n.processServiceEndpoints(tasks, results)
		})
	}
	for {
		if len(servicesMap) == 0 {
			break
		}
		publishIds := make([]string, 0)
		for publishId := range servicesMap {
			publishIds = append(publishIds, publishId)
		}
		buildStatuses, err := n.apihubClient.GetPublishStatuses(systemCtx, snapshot.Snapshot.PackageId, publishIds)
		if err != nil {
			log.Warnf("failed to get publish statuses for snapshot: %v", err.Error())
		}
		for _, buildStatus := range buildStatuses {
			if svc, exists := servicesMap[buildStatus.PublishId]; exists {
				switch buildStatus.Status {
				case string(view.StatusError):
					failedServices = append(failedServices, entity.NamespaceSecurityCheckServiceEntity{
						ProcessId: securityCheck.ProcessId,
						ServiceId: svc.ServiceId,
						Status:    string(view.StatusFailed),
						Details:   fmt.Sprintf("failed to publish service: %v", buildStatus.Message),
					})
				case string(view.StatusComplete):
					serviceEnt := entity.NamespaceSecurityCheckServiceEntity{
						ProcessId: securityCheck.ProcessId,
						ServiceId: svc.ServiceId,
						Status:    string(view.StatusRunning),
					}
					err = n.namespaceSecurityRepo.SaveNamespaceSecurityCheckService(&serviceEnt)
					if err != nil {
						failedServices = append(failedServices, entity.NamespaceSecurityCheckServiceEntity{
							ProcessId: securityCheck.ProcessId,
							ServiceId: svc.ServiceId,
							Status:    string(view.StatusFailed),
							Details:   fmt.Sprintf("failed to start service security check: %v", err.Error()),
						})
						delete(servicesMap, buildStatus.PublishId)
						continue
					}
					version, err := n.apihubClient.GetVersion(systemCtx, svc.PackageId, svc.Version)
					if err != nil {
						failedServices = append(failedServices, entity.NamespaceSecurityCheckServiceEntity{
							ProcessId: securityCheck.ProcessId,
							ServiceId: svc.ServiceId,
							Status:    string(view.StatusFailed),
							Details:   fmt.Sprintf("failed to start service security check: %v", err.Error()),
						})
						delete(servicesMap, buildStatus.PublishId)
						continue
					}
					if version == nil {
						failedServices = append(failedServices, entity.NamespaceSecurityCheckServiceEntity{
							ProcessId: securityCheck.ProcessId,
							ServiceId: svc.ServiceId,
							Status:    string(view.StatusFailed),
							Details:   "failed to start service security check: failed to get published version",
						})
						delete(servicesMap, buildStatus.PublishId)
						continue
					}
					tasks <- view.EndpointsProcessTask{
						ProcessId: securityCheck.ProcessId,
						Namespace: securityCheck.Namespace,
						AgentUrl:  agentUrl,
						ServiceId: svc.ServiceId,
						PackageId: svc.PackageId,
						Version:   version.Version,
					}
					startedTasks++
				default:
					continue
				}
				delete(servicesMap, buildStatus.PublishId)
			}
		}
		time.Sleep(10 * time.Second)
		if time.Since(start) > time.Minute*10 {
			n.updateProcessStatus(&securityCheck, view.StatusError, "deadline exceeded for snapshot creation")
			return
		}
	}
	close(tasks)

	if len(failedServices) > 0 {
		err = n.namespaceSecurityRepo.SaveNamespaceSecurityCheckServices(failedServices)
		if err != nil {
			log.Errorf("failed to store failed services: %v", err.Error())
		}
	}

	for i := 1; i <= startedTasks; i++ {
		<-results
	}
	n.updateProcessStatus(&securityCheck, view.StatusComplete, "")
}

func (n *namespaceSecurityServiceImpl) getDiscoveryResults(ctx context.Context, namespace string, workspaceId string, agentUrl string) (*view.ServiceListResponse, error) {
	start := time.Now()
	var discoveryResult *view.ServiceListResponse
	var err error
	for {
		discoveryResult, err = n.agentClient.ListServices(ctx, namespace, workspaceId, agentUrl)
		if err != nil {
			return nil, fmt.Errorf("failed to get service list: %v", err.Error())
		}
		if discoveryResult == nil {
			return nil, fmt.Errorf("failed to get service list: unexpected agent response")
		}
		if discoveryResult.Status == view.StatusError {
			return nil, fmt.Errorf("service discovery failed: %v", discoveryResult.Debug)
		}
		if discoveryResult.Status == view.StatusComplete {
			return discoveryResult, nil
		}
		if time.Since(start) > time.Minute*10 {
			return nil, fmt.Errorf("deadline exceeded for services discovery")
		}
		time.Sleep(time.Second * 5)
	}
}

func (n *namespaceSecurityServiceImpl) updateProcessStatus(securityCheck *entity.NamespaceSecurityCheckEntity, status view.Status, details string) {
	if status == view.StatusComplete || status == view.StatusError {
		timeNow := time.Now()
		securityCheck.FinishedAt = &timeNow
	}
	securityCheck.Status = string(status)
	securityCheck.Details = details
	err := n.namespaceSecurityRepo.UpdateNamespaceSecurityCheckStatus(securityCheck)
	if err != nil {
		log.Errorf("failed to store security check status: %+v. Error: %v", *securityCheck, err.Error())
	}
}

func (n *namespaceSecurityServiceImpl) processServiceEndpoints(tasks <-chan view.EndpointsProcessTask, result chan<- int) {
	systemCtx := secctx.MakeSysadminContext(context.Background())
	for task := range tasks {
		serviceEnt := &entity.NamespaceSecurityCheckServiceEntity{
			ProcessId: task.ProcessId,
			ServiceId: task.ServiceId,
			ApihubUrl: n.systemInfoService.GetApihubUrl(),
			PackageId: task.PackageId,
			Version:   task.Version,
		}
		n.updateServiceStatus(serviceEnt, view.StatusRunning, "")
		operationsLimit := 50
		operationsPage := 0
		restOperations, err := n.apihubClient.GetVersionRestOperationsWithData(systemCtx, task.PackageId, task.Version, operationsLimit, operationsPage)
		if err != nil {
			n.updateServiceStatus(serviceEnt, view.StatusFailed, fmt.Sprintf("failed to retrieve service endpoints from apihub: %v", err.Error()))
			result <- 0
			continue
		}
		if restOperations == nil || len(restOperations.Operations) == 0 {
			n.updateServiceStatus(serviceEnt, view.StatusComplete, "no endpoints found for this service")
			result <- 0
			continue
		}
		restOperationsList := make([]view.RestOperationSecurity, 0)
		for _, operation := range restOperations.Operations {
			restOperationsList = append(restOperationsList, getRestOperationDetails(operation))
		}
		if len(restOperations.Operations) == operationsLimit {
			failedToFetchAllOperations := false
			for {
				operationsPage++
				restOperations, err = n.apihubClient.GetVersionRestOperationsWithData(systemCtx, task.PackageId, task.Version, operationsLimit, operationsPage)
				if err != nil {
					n.updateServiceStatus(serviceEnt, view.StatusFailed, fmt.Sprintf("failed to retrieve service endpoints from apihub: %v", err.Error()))
					result <- 0
					failedToFetchAllOperations = true
					break
				}
				if restOperations == nil || len(restOperations.Operations) == 0 {
					break
				}
				for _, operation := range restOperations.Operations {
					restOperationsList = append(restOperationsList, getRestOperationDetails(operation))
				}
				if len(restOperations.Operations) < operationsLimit {
					break
				}
			}
			if failedToFetchAllOperations {
				continue
			}
		}
		serviceEnt.EndpointsTotal = len(restOperationsList)
		n.updateServiceStatus(serviceEnt, view.StatusRunning, "")
		processedOperations := make([]entity.NamespaceSecurityCheckResultEntity, 0)
		for _, restOperation := range restOperationsList {
			operationSecurityCheckResult := entity.NamespaceSecurityCheckResultEntity{
				ProcessId: task.ProcessId,
				ServiceId: task.ServiceId,
				Method:    restOperation.Method,
				Path:      restOperation.Path,
				Security:  restOperation.Security,
			}
			if len(restOperation.Security) > 0 {
				operationSecurityCheckResult.ExpectedResponseCode = http.StatusUnauthorized
			}
			operationSecurityCheckResult.ActualResponseCode, err = n.agentClient.SendEmptyServiceRequest(task.Namespace, task.ServiceId, task.AgentUrl, restOperation.Method, restOperation.Path)
			if err != nil {
				operationSecurityCheckResult.Details = err.Error()
			}
			if operationSecurityCheckResult.ExpectedResponseCode != 0 && operationSecurityCheckResult.ActualResponseCode != operationSecurityCheckResult.ExpectedResponseCode {
				serviceEnt.EndpointsFailed++
			}
			processedOperations = append(processedOperations, operationSecurityCheckResult)
		}
		if len(processedOperations) > 0 {
			err = n.namespaceSecurityRepo.SaveNamespaceSecurityCheckResults(processedOperations)
			if err != nil {
				n.updateServiceStatus(serviceEnt, view.StatusFailed, fmt.Sprintf("failed to store security check results: %v", err.Error()))
				result <- 0
				continue
			}
		}
		n.updateServiceStatus(serviceEnt, view.StatusComplete, "")

		result <- 1
	}
}

func (n *namespaceSecurityServiceImpl) updateServiceStatus(service *entity.NamespaceSecurityCheckServiceEntity, status view.Status, details string) {
	service.Status = string(status)
	service.Details = details
	err := n.namespaceSecurityRepo.UpdateNamespaceSecurityCheckService(service)
	if err != nil {
		log.Errorf("failed to store security check service status: %+v. Error: %v", *service, err.Error())
	}
}

func (n *namespaceSecurityServiceImpl) GetAuthSecurityCheckReports(req view.GetNamespaceSecurityCheckReq) (*view.NamespaceSecurityCheckReports, error) {
	reportEntities, err := n.namespaceSecurityRepo.GetNamespaceSecurityCheckReports(req.AgentId, req.Namespace, req.WorkspaceId, req.Limit, req.Page)
	if err != nil {
		return nil, err
	}
	reports := make([]view.NamespaceSecurityCheckReport, 0)

	for _, reportEnt := range reportEntities {
		var userView view.User
		var apiKeyView *view.ApihubApiKeyView
		if strings.HasPrefix(reportEnt.StartedBy, "api-key_") {
			apiKeyView, err = n.apiKeyService.GetApihubApiKey(reportEnt.StartedBy)
			if err != nil {
				log.Errorf("failed to load api key info from apihub: %v", err.Error())
			}
		} else {
			userView, err = n.userService.GetApihubUser(reportEnt.StartedBy)
			if err != nil {
				log.Errorf("failed to load user info from apihub: %v", err.Error())
			}
		}

		reportView := entity.MakeNamespaceSecurityCheckReportView(reportEnt, userView, apiKeyView)
		reports = append(reports, reportView)
	}
	return &view.NamespaceSecurityCheckReports{Reports: reports}, nil
}

func (n *namespaceSecurityServiceImpl) GetAuthSecurityCheckStatus(processId string) (*view.NamespaceSecurityCheckStatus, error) {
	securityCheckEnt, err := n.namespaceSecurityRepo.GetNamespaceSecurityCheckStatus(processId)
	if err != nil {
		return nil, err
	}
	if securityCheckEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.SecurityCheckNotFound,
			Message: exception.SecurityCheckNotFoundMsg,
			Params:  map[string]interface{}{"processId": processId},
		}
	}
	securityCheckStatusView := entity.MakeNamespaceSecurityCheckStatusView(*securityCheckEnt)
	return &securityCheckStatusView, nil
}

func makeAuthSecurityCheckVersionName() string {
	now := time.Now()
	return fmt.Sprintf(`auth_security_check_%d.%d.%d`, now.Year(), now.Month(), now.Day())
}

func getRestOperationDetails(operation view.RestOperationView) view.RestOperationSecurity {
	jsonData := utils.JsonMap(operation.Data)

	uniqueSecuritySchemes := make(map[string]bool, 0)
	commonSecurityArray := jsonData.GetObjectsArray("security")
	for _, securityMap := range commonSecurityArray {
		for _, security := range securityMap.GetKeys() {
			uniqueSecuritySchemes[security] = true
		}
	}
	operationPaths := jsonData.GetObject("paths").GetKeys()
	if len(operationPaths) > 0 {
		operationObj := jsonData.GetObject("paths").GetObject(operationPaths[0]).GetObject(operation.Method)
		if operationObj.Contains("security") {
			uniqueSecuritySchemes = make(map[string]bool, 0)
		}
		for _, securityMap := range operationObj.GetObjectsArray("security") {
			for _, security := range securityMap.GetKeys() {
				uniqueSecuritySchemes[security] = true
			}
		}
	}
	securitySchemes := make([]string, 0)
	for key := range uniqueSecuritySchemes {
		securitySchemes = append(securitySchemes, key)
	}
	restOperationDetails := view.RestOperationSecurity{
		Method:   operation.Method,
		Path:     operation.Path,
		Security: securitySchemes,
	}
	return restOperationDetails
}
