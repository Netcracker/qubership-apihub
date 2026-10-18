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
