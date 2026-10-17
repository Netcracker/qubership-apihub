package service

import (
	"context"
	"errors"
	"testing"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type publisherApiKeyRepoStub struct {
	repository.ApihubApiKeyRepository
	apiKey     *entity.ApihubApiKeyEntity
	err        error
	lookupDone bool
}

func (s *publisherApiKeyRepoStub) GetApiKey(context.Context, string) (*entity.ApihubApiKeyEntity, error) {
	s.lookupDone = true
	if s.err != nil {
		return nil, s.err
	}
	return s.apiKey, nil
}

type publisherRoleRepoStub struct {
	repository.RoleRepository
	rolePermissions map[string][]string
	userPermissions []string
	systemRole      *entity.SystemRoleEntity
}

func (s publisherRoleRepoStub) GetPermissionsForRoles(_ context.Context, roles []string) ([]string, error) {
	permissions := make([]string, 0)
	for _, role := range roles {
		permissions = append(permissions, s.rolePermissions[role]...)
	}
	return permissions, nil
}

func (s publisherRoleRepoStub) GetUserSystemRole(context.Context, string) (*entity.SystemRoleEntity, error) {
	return s.systemRole, nil
}

func (s publisherRoleRepoStub) GetUserPermissions(context.Context, string, string) ([]string, error) {
	return s.userPermissions, nil
}

const testApiKeyId = API_KEY_PREFIX + "3f2b1a0c-0000-4000-8000-000000000001"

func apiKey(packageId string, roles ...string) *entity.ApihubApiKeyEntity {
	return &entity.ApihubApiKeyEntity{Id: testApiKeyId, PackageId: packageId, Roles: roles}
}

func TestResolvePublisherReadScope(t *testing.T) {
	const readerRole = "Viewer"
	const blindRole = "None"
	rolePermissions := map[string][]string{
		readerRole: {string(view.ReadPermission)},
		blindRole:  {},
	}

	tests := []struct {
		name        string
		publisherId string
		apiKey      *entity.ApihubApiKeyEntity
		systemRole  *entity.SystemRoleEntity
		expected    view.PackageReadScope
	}{
		{
			// A build row written before the publisher was recorded must not name anything.
			name:        "no publisher",
			publisherId: "",
			expected:    view.PackageReadScope{Kind: view.PackageReadScopeNone},
		},
		{
			name:        "api key carrying the sysadmin role",
			publisherId: testApiKeyId,
			apiKey:      apiKey("QS.PKG", view.SysadmRole),
			expected:    view.PackageReadScope{Kind: view.PackageReadScopeAll},
		},
		{
			name:        "api key without read permission",
			publisherId: testApiKeyId,
			apiKey:      apiKey("QS.PKG", blindRole),
			expected:    view.PackageReadScope{Kind: view.PackageReadScopeNone},
		},
		{
			name:        "api key scoped to all packages",
			publisherId: testApiKeyId,
			apiKey:      apiKey(view.AllPackagesApikeyScope, readerRole),
			expected:    view.PackageReadScope{Kind: view.PackageReadScopeAll},
		},
		{
			name:        "api key scoped to a subtree",
			publisherId: testApiKeyId,
			apiKey:      apiKey("QS.PKG", readerRole),
			expected:    view.PackageReadScope{Kind: view.PackageReadScopeSubtree, SubtreeRoot: "QS.PKG"},
		},
		{
			name:        "api key id with no row",
			publisherId: testApiKeyId,
			expected:    view.PackageReadScope{Kind: view.PackageReadScopeNone},
		},
		{
			name:        "sysadmin user",
			publisherId: "user-id",
			systemRole:  &entity.SystemRoleEntity{UserId: "user-id", Role: view.SysadmRole},
			expected:    view.PackageReadScope{Kind: view.PackageReadScopeAll},
		},
		{
			name:        "ordinary user",
			publisherId: "user-id",
			expected:    view.PackageReadScope{Kind: view.PackageReadScopeUser},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := roleServiceImpl{
				apiKeyRepository: &publisherApiKeyRepoStub{apiKey: tt.apiKey},
				roleRepository:   publisherRoleRepoStub{rolePermissions: rolePermissions, systemRole: tt.systemRole},
			}

			scope, err := service.resolvePublisherReadScope(context.Background(), tt.publisherId)
			if err != nil {
				t.Fatalf("expected the scope to resolve, but it failed: %v", err)
			}
			if scope != tt.expected {
				t.Fatalf("expected scope %+v, got %+v", tt.expected, scope)
			}
		})
	}
}

var errApiKeyLookup = errors.New("api key lookup failed")

// A failed lookup must not fall through to the user branch, which would describe the wrong principal.
func TestResolvePublisherReadScopePropagatesApiKeyLookupFailure(t *testing.T) {
	service := roleServiceImpl{
		apiKeyRepository: &publisherApiKeyRepoStub{err: errApiKeyLookup},
		roleRepository:   publisherRoleRepoStub{},
	}

	if _, err := service.resolvePublisherReadScope(context.Background(), testApiKeyId); !errors.Is(err, errApiKeyLookup) {
		t.Fatalf("expected the lookup failure to propagate, got %v", err)
	}
}

func TestFilterVersionsByPublisherReadAccessSubtreeScope(t *testing.T) {
	service := roleServiceImpl{
		apiKeyRepository: &publisherApiKeyRepoStub{apiKey: apiKey("QS.PKG", "Viewer")},
		roleRepository:   publisherRoleRepoStub{rolePermissions: map[string][]string{"Viewer": {string(view.ReadPermission)}}},
	}

	keys := []entity.PublishedVersionKeyEntity{
		{PackageId: "QS.PKG", Version: "1.0", Revision: 1},
		{PackageId: "QS.PKG.CHILD", Version: "2.0", Revision: 1},
		// A neighbouring package whose id merely starts with the same characters is out of scope.
		{PackageId: "QS.PKG2", Version: "3.0", Revision: 1},
		{PackageId: "QS.OTHER", Version: "4.0", Revision: 1},
	}

	accessible, hidden, err := service.FilterVersionsByPublisherReadAccess(context.Background(), testApiKeyId, keys)
	if err != nil {
		t.Fatalf("expected the filter to answer, but it failed: %v", err)
	}
	if hidden != 2 {
		t.Fatalf("expected 2 hidden versions, got %d", hidden)
	}
	if len(accessible) != 2 || accessible[0].PackageId != "QS.PKG" || accessible[1].PackageId != "QS.PKG.CHILD" {
		t.Fatalf("expected the subtree versions in input order, got %+v", accessible)
	}
}

// Callers pass repeated keys and derive their own grouping from the result, so the filter must not collapse them.
func TestFilterVersionsByPublisherReadAccessKeepsDuplicates(t *testing.T) {
	service := roleServiceImpl{
		apiKeyRepository: &publisherApiKeyRepoStub{apiKey: apiKey(view.AllPackagesApikeyScope, "Viewer")},
		roleRepository:   publisherRoleRepoStub{rolePermissions: map[string][]string{"Viewer": {string(view.ReadPermission)}}},
	}

	key := entity.PublishedVersionKeyEntity{PackageId: "QS.PKG", Version: "1.0", Revision: 1}
	accessible, hidden, err := service.FilterVersionsByPublisherReadAccess(context.Background(), testApiKeyId,
		[]entity.PublishedVersionKeyEntity{key, key, key})
	if err != nil {
		t.Fatalf("expected the filter to answer, but it failed: %v", err)
	}
	if len(accessible) != 3 || hidden != 0 {
		t.Fatalf("expected all three repeated keys to survive, got %d accessible and %d hidden", len(accessible), hidden)
	}
}

// The id prefix decides the branch, so an interactive publication must not pay for an api key lookup.
func TestResolvePublisherReadScopeSkipsApiKeyLookupForUser(t *testing.T) {
	apiKeyRepo := &publisherApiKeyRepoStub{}
	service := roleServiceImpl{apiKeyRepository: apiKeyRepo, roleRepository: publisherRoleRepoStub{}}

	if _, err := service.resolvePublisherReadScope(context.Background(), "user-id"); err != nil {
		t.Fatalf("expected the scope to resolve, but it failed: %v", err)
	}
	if apiKeyRepo.lookupDone {
		t.Fatal("expected no api key lookup for an id without the api key prefix")
	}
}
