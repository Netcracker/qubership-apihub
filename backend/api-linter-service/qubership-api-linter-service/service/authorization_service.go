package service

import (
	"context"
	"github.com/Netcracker/qubership-api-linter-service/client"
	"github.com/Netcracker/qubership-api-linter-service/secctx"
	"github.com/Netcracker/qubership-api-linter-service/view"
)

type AuthorizationService interface {
	HasRulesetReadPermission(ctx context.Context) (bool, error)
	HasRulesetListPermission(ctx context.Context) (bool, error)
	HasRulesetManagementPermission(ctx context.Context) (bool, error)

	HasReadPackagePermission(ctx context.Context, packageId string) (bool, error)
	HasPublishPackagePermission(ctx context.Context, packageId string) (bool, error)
}

func NewAuthorizationService(apihubClient client.ApihubClient) AuthorizationService {
	return &authorizationServiceImpl{apihubClient: apihubClient}
}

type authorizationServiceImpl struct {
	apihubClient client.ApihubClient
}

func (a authorizationServiceImpl) HasRulesetReadPermission(ctx context.Context) (bool, error) {
	return true, nil // No restrictions at this moment
}

func (a authorizationServiceImpl) HasRulesetListPermission(ctx context.Context) (bool, error) {
	return secctx.IsSysadm(ctx), nil
}

func (a authorizationServiceImpl) HasRulesetManagementPermission(ctx context.Context) (bool, error) {
	return secctx.IsSysadm(ctx), nil
}

func (a authorizationServiceImpl) HasReadPackagePermission(ctx context.Context, packageId string) (bool, error) {
	if secctx.IsSysadm(ctx) {
		return true, nil
	}
	roles, err := a.apihubClient.GetAvailableRoles(ctx, packageId)
	if err != nil {
		return false, err
	}
	if roles == nil {
		return false, nil
	}
	for _, role := range roles.Roles {
		for _, perm := range role.Permissions {
			if perm == view.ReadPermission {
				return true, nil
			}
		}
	}
	return false, nil
}

func (a authorizationServiceImpl) HasPublishPackagePermission(ctx context.Context, packageId string) (bool, error) {
	if secctx.IsSysadm(ctx) {
		return true, nil
	}
	roles, err := a.apihubClient.GetAvailableRoles(ctx, packageId)
	if err != nil {
		return false, err
	}
	for _, role := range roles.Roles {
		for _, perm := range role.Permissions {
			if perm == view.ManageDraftVersionPermission {
				return true, nil
			}
		}
	}
	return false, nil
}
