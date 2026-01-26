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
	"sync"

	"github.com/Netcracker/qubership-apihub-agents-backend/client"
	"github.com/Netcracker/qubership-apihub-agents-backend/exception"
	"github.com/Netcracker/qubership-apihub-agents-backend/secctx"
	"github.com/Netcracker/qubership-apihub-agents-backend/utils"
	"github.com/Netcracker/qubership-apihub-agents-backend/view"
)

type DiscoveryService interface {
	StartDiscovery(ctx context.Context, agentId string, namespace string, workspaceId string, failOnError bool) error
	GetDiscoveredServices_deprecated(ctx context.Context, agentId string, namespace string, workspaceId string) (*view.ServiceListResponse_deprecated, error)
	GetDiscoveredServices(ctx context.Context, agentId string, namespace string, workspaceId string) (*view.ServiceListResponse, error)
}

func NewDiscoveryService(agentClient client.AgentClient, apihubClient client.ApihubClient, agentService AgentService, permissionService PermissionService, systemInfoService SystemInfoService) DiscoveryService {
	return &discoveryServiceImpl{
		defaultWorkspaceId: systemInfoService.GetDefaultWorkspaceId(),
		agentClient:        agentClient,
		apihubClient:       apihubClient,
		agentService:       agentService,
		permissionService:  permissionService,
	}
}

type discoveryServiceImpl struct {
	defaultWorkspaceId string
	agentClient        client.AgentClient
	apihubClient       client.ApihubClient
	agentService       AgentService
	permissionService  PermissionService
}

func (d discoveryServiceImpl) StartDiscovery(ctx context.Context, agentId string, namespace string, workspaceId string, failOnError bool) error {
	agent, err := d.agentService.GetAgent(agentId)
	if err != nil {
		return exception.CustomError{
			Status:  http.StatusInternalServerError,
			Message: "Failed to get agent by id - '$id'",
			Params:  map[string]interface{}{"id": agentId},
			Debug:   err.Error(),
		}
	}
	if agent == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.AgentNotFound,
			Message: exception.AgentNotFoundMsg,
			Params:  map[string]interface{}{"id": agentId}}
	}

	workspace, err := d.apihubClient.GetPackageById(ctx, workspaceId)
	if err != nil {
		return err
	}
	if workspace == nil || workspace.Kind != string(view.KindWorkspace) {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.WorkspaceNotFound,
			Message: exception.WorkspaceNotFoundMsg,
			Params:  map[string]interface{}{"workspaceId": workspaceId},
		}
	}
	namespaces, err := d.agentClient.GetNamespaces(ctx, agent.AgentUrl)
	if err != nil {
		return fmt.Errorf("failed to list agent namespaces: %v", err.Error())
	}
	if namespaces == nil || len(namespaces.Namespaces) == 0 {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.NamespaceNotFound,
			Message: exception.NamespaceNotFoundMsg,
			Params:  map[string]interface{}{"namespace": namespace, "agentId": agentId},
		}
	}
	namespaceExists := false
	for _, ns := range namespaces.Namespaces {
		if ns == namespace {
			namespaceExists = true
			break
		}
	}
	if !namespaceExists {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.NamespaceNotFound,
			Message: exception.NamespaceNotFoundMsg,
			Params:  map[string]interface{}{"namespace": namespace, "agentId": agentId},
		}
	}

	if d.defaultWorkspaceId != "" && workspaceId != d.defaultWorkspaceId {
		namespaceServiceNames, err := d.agentClient.ListServiceNames(ctx, agent.AgentUrl, namespace)
		if err != nil {
			return fmt.Errorf("failed to list namespace service names: %v", err.Error())
		}
		if namespaceServiceNames != nil && len(namespaceServiceNames.ServiceNames) > 0 {
			serviceNames := make([]string, 0, len(namespaceServiceNames.ServiceNames))
			for _, svc := range namespaceServiceNames.ServiceNames {
				serviceNames = append(serviceNames, svc.Id)
			}
			err = d.copyWorkspaceServicesStructure(secctx.MakeSysadminContext(ctx), d.defaultWorkspaceId, workspaceId, serviceNames, workspace.DefaultRole)
			if err != nil {
				return fmt.Errorf("failed to copy package services from '%v' to '%v': %v", d.defaultWorkspaceId, workspaceId, err.Error())
			}
		}
	}

	return d.agentClient.StartDiscovery(ctx, namespace, workspaceId, agent.AgentUrl, failOnError)
}

func (d discoveryServiceImpl) copyWorkspaceServicesStructure(ctx context.Context, srcWorkspaceId string, dstWorkspaceId string, serviceNames []string, defaultRole string) error {
	mutex := &sync.Mutex{}
	srcPackagesToCopy := make([]*view.PackagesInfo, 0)

	wg := sync.WaitGroup{}
	errMap := sync.Map{}
	for _, serviceName := range serviceNames {
		svcName := serviceName
		wg.Add(1)
		utils.SafeAsync(func() {
			defer wg.Done()
			dstPackage, err := d.apihubClient.GetPackageByServiceName(ctx, dstWorkspaceId, svcName)
			if err != nil {
				errMap.Store(fmt.Sprintf("failed to get apihub package by service name: %v", err.Error()), nil)
				return
			}
			if dstPackage != nil {
				return
			}
			srcPackage, err := d.apihubClient.GetPackageByServiceName(ctx, srcWorkspaceId, svcName)
			if err != nil {
				errMap.Store(fmt.Sprintf("failed to get apihub package by service name: %v", err.Error()), nil)
				return
			}
			if srcPackage == nil {
				return
			}
			mutex.Lock()
			srcPackagesToCopy = append(srcPackagesToCopy, srcPackage)
			mutex.Unlock()
		})
	}
	wg.Wait()

	errList := make([]string, 0)
	errMap.Range(func(key, value interface{}) bool {
		errList = append(errList, key.(string))
		return false
	})
	if len(errList) > 0 {
		return fmt.Errorf("failed to calculate service packages to copy: %v", strings.Join(errList, ", "))
	}

	newPackages := make([]view.PackageCreateRequest, 0, len(srcPackagesToCopy))

	productPackageId := fmt.Sprintf("%s.%s", dstWorkspaceId, srcWorkspaceId)
	productPackage, err := d.apihubClient.GetPackageById(ctx, productPackageId)
	if err != nil {
		return fmt.Errorf("failed to get apihub package by id")
	}
	if productPackage == nil {
		newPackages = append(newPackages, view.PackageCreateRequest{
			ParentId:    dstWorkspaceId,
			Kind:        string(view.KindGroup),
			Name:        fmt.Sprintf("%s Product", srcWorkspaceId),
			Alias:       srcWorkspaceId,
			Description: fmt.Sprintf("Group to sync packages from '%v' workspace during service discovery", srcWorkspaceId),
			DefaultRole: defaultRole,
		})
	} else {
		if productPackage.Kind != string(view.KindGroup) {
			return fmt.Errorf("unable to copy service packages from '%v' to '%v' workspace: package '%v' has invalid package type", srcWorkspaceId, dstWorkspaceId, productPackageId)
		}
	}

	seenPackages := make(map[string]struct{})
	seenPackages[productPackageId] = struct{}{}

	errMap = sync.Map{}
	wg = sync.WaitGroup{}
	for _, srtPkg := range srcPackagesToCopy {
		wg.Add(1)
		srcPackage := srtPkg
		utils.SafeAsync(func() {
			defer wg.Done()
			newPackageId := fmt.Sprintf("%s.%s", dstWorkspaceId, srcPackage.Id)
			dstPackage, err := d.apihubClient.GetPackageById(ctx, newPackageId)
			if err != nil {
				errMap.Store(fmt.Sprintf("failed to get apihub package by id: %v", err.Error()), nil)
				return
			}
			if dstPackage != nil {
				errMap.Store(fmt.Sprintf("unable to copy '%v' package from '%v' to '%v' workspace: package with id='%v' and different serviceName already exists", srcPackage.Id, srcWorkspaceId, dstWorkspaceId, newPackageId), nil)
				return
			}
			srcParentIds := getOrderedParentPackageIds(srcPackage.Id)
			for _, srcParentId := range srcParentIds {
				dstParentId := fmt.Sprintf("%s.%s", dstWorkspaceId, srcParentId)
				if _, exists := seenPackages[dstParentId]; exists {
					continue
				}
				dstParent, err := d.apihubClient.GetPackageById(ctx, dstParentId)
				if err != nil {
					errMap.Store(fmt.Sprintf("failed to get apihub package by id: %v", err.Error()), nil)
					return
				}
				if dstParent == nil {
					srcParent, err := d.apihubClient.GetPackageById(ctx, srcParentId)
					if err != nil {
						errMap.Store(fmt.Sprintf("failed to get apihub package by id: %v", err.Error()), nil)
						return
					}
					if srcParent == nil {
						errMap.Store(fmt.Sprintf("unable to copy parents structure for '%v' package: parent package '%v' doesn't exist", srcPackage, srcParentId), nil)
						return
					}
					mutex.Lock()
					if _, exists := seenPackages[dstParentId]; !exists {
						newPackages = append(newPackages, view.PackageCreateRequest{
							ParentId:              getParentPackageId(dstParentId),
							Kind:                  string(view.KindGroup),
							Name:                  srcParent.Name,
							Alias:                 srcParent.Alias,
							Description:           srcParent.Description,
							ImageUrl:              srcParent.ImageUrl,
							DefaultRole:           defaultRole,
							ReleaseVersionPattern: srcParent.ReleaseVersionPattern,
						})
						seenPackages[dstParentId] = struct{}{}
					}
					mutex.Unlock()
					continue
				}
				if dstParent.Kind != string(view.KindGroup) {
					errMap.Store(fmt.Sprintf("unable to copy service packages from '%v' to '%v' workspace: package '%v' has invalid package type", srcWorkspaceId, dstWorkspaceId, dstParentId), nil)
					return
				}
				mutex.Lock()
				seenPackages[dstParentId] = struct{}{}
				mutex.Unlock()
			}
			mutex.Lock()
			newPackages = append(newPackages, view.PackageCreateRequest{
				ParentId:              getParentPackageId(newPackageId),
				Kind:                  srcPackage.Kind,
				Name:                  srcPackage.Name,
				Alias:                 srcPackage.Alias,
				Description:           srcPackage.Description,
				ImageUrl:              srcPackage.ImageUrl,
				DefaultRole:           defaultRole,
				ReleaseVersionPattern: srcPackage.ReleaseVersionPattern,
				ServiceName:           srcPackage.ServiceName,
			})
			mutex.Unlock()
		})
	}
	wg.Wait()

	errList = make([]string, 0)
	errMap.Range(func(key, value interface{}) bool {
		errList = append(errList, key.(string))
		return false
	})
	if len(errList) > 0 {
		return fmt.Errorf("failed to calculate service packages to copy: %v", strings.Join(errList, ", "))
	}

	for _, newPackage := range newPackages {
		if newPackage.Kind != string(view.KindGroup) {
			continue
		}
		_, err := d.apihubClient.CreatePackage(ctx, newPackage)
		if err != nil {
			return fmt.Errorf("unable to copy service packages from '%v' to '%v' workspace: failed to create '%s.%s' group: %v", srcWorkspaceId, dstWorkspaceId, newPackage.ParentId, newPackage.Alias, err.Error())
		}
	}
	wg = sync.WaitGroup{}
	errMap = sync.Map{}
	for _, pkg := range newPackages {
		if pkg.Kind == string(view.KindGroup) {
			continue
		}
		wg.Add(1)
		newPackage := pkg
		utils.SafeAsync(func() {
			defer wg.Done()
			_, err := d.apihubClient.CreatePackage(ctx, newPackage)
			if err != nil {
				errMap.Store(fmt.Sprintf("unable to copy service packages from '%v' to '%v' workspace: failed to create '%s.%s' package: %v", srcWorkspaceId, dstWorkspaceId, newPackage.ParentId, newPackage.Alias, err.Error()), nil)
				return
			}
		})
	}
	wg.Wait()

	errList = make([]string, 0)
	errMap.Range(func(key, value interface{}) bool {
		errList = append(errList, key.(string))
		return false
	})
	if len(errList) > 0 {
		return fmt.Errorf("failed to copy service packages: %v", strings.Join(errList, ", "))
	}
	return nil
}

func getParentPackageId(packageId string) string {
	parts := strings.Split(packageId, ".")
	return strings.Join(parts[:len(parts)-1], ".")
}

func getOrderedParentPackageIds(packageId string) []string {
	parts := strings.Split(packageId, ".")
	parentIds := make([]string, 0)
	for i, part := range parts {
		if i == 0 {
			parentIds = append(parentIds, part)
			continue
		}
		if i == (len(parts) - 1) {
			break
		}
		parentIds = append(parentIds, parentIds[i-1]+"."+part)
	}
	return parentIds
}

func (d discoveryServiceImpl) GetDiscoveredServices_deprecated(ctx context.Context, agentId string, namespace string, workspaceId string) (*view.ServiceListResponse_deprecated, error) {
	agent, err := d.agentService.GetAgent(agentId)
	if err != nil {
		return nil, exception.CustomError{
			Status:  http.StatusInternalServerError,
			Message: "Failed to get agent by id - '$id'",
			Params:  map[string]interface{}{"id": agentId},
			Debug:   err.Error(),
		}
	}
	if agent == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.AgentNotFound,
			Message: exception.AgentNotFoundMsg,
			Params:  map[string]interface{}{"id": agentId}}
	}

	serviceList, err := d.agentClient.ListServices_deprecated(ctx, namespace, workspaceId, agent.AgentUrl)
	if err != nil {
		return nil, fmt.Errorf("agent failed to list services: %v", err.Error())
	}
	if serviceList != nil && len(serviceList.Services) > 0 {
		err = d.permissionService.SetPermissionsForServices_deprecated(ctx, serviceList.Services)
		if err != nil {
			return nil, fmt.Errorf("failed to set permissions for services: %v", err.Error())
		}
	}

	return serviceList, nil
}

func (d discoveryServiceImpl) GetDiscoveredServices(ctx context.Context, agentId string, namespace string, workspaceId string) (*view.ServiceListResponse, error) {
	agent, err := d.agentService.GetAgent(agentId)
	if err != nil {
		return nil, exception.CustomError{
			Status:  http.StatusInternalServerError,
			Message: "Failed to get agent by id - '$id'",
			Params:  map[string]interface{}{"id": agentId},
			Debug:   err.Error(),
		}
	}
	if agent == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.AgentNotFound,
			Message: exception.AgentNotFoundMsg,
			Params:  map[string]interface{}{"id": agentId}}
	}

	serviceList, err := d.agentClient.ListServices(ctx, namespace, workspaceId, agent.AgentUrl)
	if err != nil {
		return nil, fmt.Errorf("agent failed to list services: %v", err.Error())
	}
	if serviceList != nil && len(serviceList.Services) > 0 {
		err = d.permissionService.SetPermissionsForServices(ctx, serviceList.Services)
		if err != nil {
			return nil, fmt.Errorf("failed to set permissions for services: %v", err.Error())
		}
	}

	return serviceList, nil
}
