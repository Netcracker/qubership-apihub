package service

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/client"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/repository"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
)

// roleCatalogueTTL is how long the role catalogue read from portal-backend is reused. Roles and their
// permissions change rarely, and every permission check would otherwise cost an extra HTTP round trip.
const roleCatalogueTTL = 5 * time.Minute

// AuthorizationService answers what the caller may do with a library. This service defines no roles of its
// own: the catalogue and a caller's roles on the parent package come from portal-backend, and only the
// library-local assignment lives here.
type AuthorizationService interface {
	HasLibraryPermission(ctx context.Context, library entity.LibraryEntity, permission view.RolePermission) (bool, error)
	// CanCreateLibrary is checked against the parent package, because the library does not exist yet.
	// Without a parent package there is nothing to inherit from, so only a system administrator may create
	// the library.
	CanCreateLibrary(ctx context.Context, parentPackageId string) (bool, error)
	// RolePermissions resolves role ids against the portal-backend catalogue.
	RolePermissions(ctx context.Context, roleIds []string) (map[string][]view.RolePermission, error)
	// KnownRoles returns the catalogue, so a role id can be validated and named before it is stored.
	KnownRoles(ctx context.Context) (map[string]view.PackageRole, error)
}

func NewAuthorizationService(apihubClient client.ApihubClient, memberRepository repository.MemberRepository) AuthorizationService {
	return &authorizationServiceImpl{
		apihubClient:     apihubClient,
		memberRepository: memberRepository,
	}
}

type authorizationServiceImpl struct {
	apihubClient     client.ApihubClient
	memberRepository repository.MemberRepository

	catalogueMutex   sync.Mutex
	catalogue        map[string]view.PackageRole
	catalogueFetched time.Time
}

func (a *authorizationServiceImpl) HasLibraryPermission(ctx context.Context, library entity.LibraryEntity, permission view.RolePermission) (bool, error) {
	if secctx.IsSysadm(ctx) {
		return true, nil
	}
	userId := secctx.GetUserId(ctx)
	if userId == "" {
		return false, nil
	}

	// Roles assigned on the library itself, plus the library's default role, which every authenticated
	// caller holds the same way a portal package grants its default role.
	roleIds := []string{library.DefaultRole}
	member, err := a.memberRepository.Get(ctx, library.Id, userId)
	if err != nil {
		return false, fmt.Errorf("failed to read the roles of user %s on library %s: %w", userId, library.Id, err)
	}
	if member != nil {
		roleIds = append(roleIds, member.Roles...)
	}

	permissions, err := a.RolePermissions(ctx, roleIds)
	if err != nil {
		return false, err
	}
	for _, rolePermissions := range permissions {
		if containsPermission(rolePermissions, permission) {
			return true, nil
		}
	}

	// Anything the caller holds on the parent package also applies to the library whose docs surface there.
	if library.ParentPackageId != "" {
		inherited, err := a.hasPackagePermission(ctx, library.ParentPackageId, permission)
		if err != nil {
			return false, err
		}
		return inherited, nil
	}
	return false, nil
}

func (a *authorizationServiceImpl) CanCreateLibrary(ctx context.Context, parentPackageId string) (bool, error) {
	if secctx.IsSysadm(ctx) {
		return true, nil
	}
	if parentPackageId == "" {
		return false, nil
	}
	return a.hasPackagePermission(ctx, parentPackageId, view.CreateAndUpdatePackagePermission)
}

func (a *authorizationServiceImpl) hasPackagePermission(ctx context.Context, packageId string, permission view.RolePermission) (bool, error) {
	roles, err := a.apihubClient.GetAvailableRoles(ctx, packageId)
	if err != nil {
		return false, fmt.Errorf("failed to read the roles of the caller on package %s: %w", packageId, err)
	}
	if roles == nil {
		return false, nil
	}
	for _, role := range roles.Roles {
		if containsPermission(role.Permissions, permission) {
			return true, nil
		}
	}
	return false, nil
}

func (a *authorizationServiceImpl) RolePermissions(ctx context.Context, roleIds []string) (map[string][]view.RolePermission, error) {
	catalogue, err := a.KnownRoles(ctx)
	if err != nil {
		return nil, err
	}
	result := make(map[string][]view.RolePermission, len(roleIds))
	for _, roleId := range roleIds {
		if roleId == "" {
			continue
		}
		if role, found := catalogue[roleId]; found {
			result[roleId] = role.Permissions
		}
	}
	return result, nil
}

func (a *authorizationServiceImpl) KnownRoles(ctx context.Context) (map[string]view.PackageRole, error) {
	a.catalogueMutex.Lock()
	defer a.catalogueMutex.Unlock()

	if a.catalogue != nil && time.Since(a.catalogueFetched) < roleCatalogueTTL {
		return a.catalogue, nil
	}

	// Read with the service's own token: the catalogue is global, and reading it requires privileges a
	// library member does not need to hold.
	roles, err := a.apihubClient.GetExistingRoles(secctx.MakeSysadminContext(ctx))
	if err != nil {
		return nil, fmt.Errorf("failed to read the APIHUB role catalogue: %w", err)
	}
	if roles == nil {
		return nil, fmt.Errorf("the APIHUB role catalogue is empty")
	}

	catalogue := make(map[string]view.PackageRole, len(roles.Roles))
	for _, role := range roles.Roles {
		catalogue[role.RoleId] = role
	}
	a.catalogue = catalogue
	a.catalogueFetched = time.Now()
	return catalogue, nil
}

func containsPermission(permissions []view.RolePermission, wanted view.RolePermission) bool {
	for _, permission := range permissions {
		if permission == wanted {
			return true
		}
	}
	return false
}
