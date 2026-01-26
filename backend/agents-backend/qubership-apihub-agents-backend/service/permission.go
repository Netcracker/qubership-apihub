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

	"github.com/Netcracker/qubership-apihub-agents-backend/client"
	"github.com/Netcracker/qubership-apihub-agents-backend/view"
)

type PermissionService interface {
	SetPermissionsForServices_deprecated(ctx context.Context, services []view.Service_deprecated) error
	SetPermissionsForServices(ctx context.Context, services []view.Service) error
}

func NewPermissionService(apihubClient client.ApihubClient) PermissionService {
	return &permissionServiceImpl{apihubClient: apihubClient}
}

type permissionServiceImpl struct {
	apihubClient client.ApihubClient
}

func (p permissionServiceImpl) SetPermissionsForServices_deprecated(ctx context.Context, services []view.Service_deprecated) error {
	packageIds := make([]string, 0)
	for _, service := range services {
		baseline := service.Baseline
		if baseline != nil && baseline.PackageId != "" {
			packageIds = append(packageIds, baseline.PackageId)
		}
	}
	if len(packageIds) == 0 {
		return nil
	}

	availablePackagePromoteStatuses, err := p.apihubClient.GetUserPackagesPromoteStatuses(ctx, view.PackagesReq{Packages: packageIds})
	if err != nil {
		return err
	}
	if len(availablePackagePromoteStatuses) == 0 {
		return nil
	}
	for index := range services {
		service := &services[index]
		baseline := service.Baseline
		if baseline != nil && baseline.PackageId != "" {
			availablePromoteStatuses, exists := availablePackagePromoteStatuses[baseline.PackageId]
			if !exists {
				continue
			}
			service.AvailablePromoteStatuses = availablePromoteStatuses
		}
	}
	return nil
}

func (p permissionServiceImpl) SetPermissionsForServices(ctx context.Context, services []view.Service) error {
	packageIds := make([]string, 0)
	for _, service := range services {
		baseline := service.Baseline
		if baseline != nil && baseline.PackageId != "" {
			packageIds = append(packageIds, baseline.PackageId)
		}
	}
	if len(packageIds) == 0 {
		return nil
	}

	availablePackagePromoteStatuses, err := p.apihubClient.GetUserPackagesPromoteStatuses(ctx, view.PackagesReq{Packages: packageIds})
	if err != nil {
		return err
	}
	if len(availablePackagePromoteStatuses) == 0 {
		return nil
	}
	for index := range services {
		service := &services[index]
		baseline := service.Baseline
		if baseline != nil && baseline.PackageId != "" {
			availablePromoteStatuses, exists := availablePackagePromoteStatuses[baseline.PackageId]
			if !exists {
				continue
			}
			service.AvailablePromoteStatuses = availablePromoteStatuses
		}
	}
	return nil
}
