package service

import (
	"context"
	"errors"
	"net/http"
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/portal-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/portal-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/portal-backend/repository"
	"github.com/Netcracker/qubership-apihub/backend/portal-backend/view"
)

type createPackageRepoStub struct {
	repository.PublishedRepository
	parent        *entity.PackageEntity
	getPackageErr error
	created       *entity.PackageEntity
}

func (s *createPackageRepoStub) GetPackage(context.Context, string) (*entity.PackageEntity, error) {
	return s.parent, s.getPackageErr
}

func (s *createPackageRepoStub) GetPackageIncludingDeleted(context.Context, string) (*entity.PackageEntity, error) {
	return nil, nil
}

func (s *createPackageRepoStub) CreatePackage(_ context.Context, pkg *entity.PackageEntity) error {
	s.created = pkg
	return nil
}

func (s *createPackageRepoStub) GetParentsForPackage(context.Context, string, bool) ([]entity.PackageEntity, error) {
	return []entity.PackageEntity{*s.parent}, nil
}

type createPackageUserRepoStub struct {
	repository.UserRepository
}

func (createPackageUserRepoStub) PrivatePackageIdExists(context.Context, string) (bool, error) {
	return false, nil
}

type createPackageFavoritesRepoStub struct {
	repository.FavoritesRepository
}

func (createPackageFavoritesRepoStub) IsFavoritePackage(context.Context, string, string) (bool, error) {
	return false, nil
}

type createPackageRoleServiceStub struct {
	RoleService
}

func (createPackageRoleServiceStub) ValidateDefaultRole(context.Context, string, string) error {
	return nil
}

func (createPackageRoleServiceStub) GetPermissionsForPackage(context.Context, string) ([]string, error) {
	return nil, nil
}

type createPackageTransitionHandlerStub struct {
	PackageTransitionHandler
}

func (createPackageTransitionHandlerStub) HandleMissingPackageId(context.Context, string) (string, error) {
	return "", nil
}

type createPackageActivityServiceStub struct {
	ActivityTrackingService
}

func (createPackageActivityServiceStub) TrackEvent(context.Context, view.ActivityTrackingEvent) {}

func TestCreatePackageValidatesParentKind(t *testing.T) {
	const parentId = "AB.CD"
	const alias = "CHILD"
	for _, parent := range []struct {
		kind    string
		allowed bool
	}{
		{kind: entity.KIND_WORKSPACE, allowed: true},
		{kind: entity.KIND_GROUP, allowed: true},
		{kind: entity.KIND_PACKAGE},
		{kind: entity.KIND_DASHBOARD},
		{kind: "unknown"},
		{kind: ""},
	} {
		for _, childKind := range []string{entity.KIND_GROUP, entity.KIND_PACKAGE, entity.KIND_DASHBOARD} {
			t.Run(parent.kind+"/"+childKind, func(t *testing.T) {
				repo := &createPackageRepoStub{parent: &entity.PackageEntity{Id: parentId, Kind: parent.kind}}
				service := packageServiceImpl{
					publishedRepo: repo,
					userRepo:      createPackageUserRepoStub{},
					favoritesRepo: createPackageFavoritesRepoStub{},
					roleService:   createPackageRoleServiceStub{},
					ptHandler:     createPackageTransitionHandlerStub{},
					atService:     createPackageActivityServiceStub{},
				}

				result, err := service.CreatePackage(context.Background(), view.SimplePackage{
					Alias:                 alias,
					Name:                  "Child",
					Kind:                  childKind,
					ParentId:              parentId,
					ReleaseVersionPattern: ".*",
				})
				if !parent.allowed {
					var customErr *exception.CustomError
					if !errors.As(err, &customErr) {
						t.Fatalf("expected a parent-kind validation error, got result %+v and error %v", result, err)
					}
					if customErr.Status != http.StatusBadRequest || customErr.Code != exception.IncorrectPackageKind {
						t.Fatalf("unexpected validation error: %+v", customErr)
					}
					if customErr.Message != exception.IncorrectPackageParentKindMsg {
						t.Fatalf("expected the parent-kind validation message, got %q", customErr.Message)
					}
					if customErr.Params["parentId"] != parentId || customErr.Params["kind"] != parent.kind {
						t.Fatalf("expected parent ID and kind in error parameters, got %v", customErr.Params)
					}
					if result != nil || repo.created != nil {
						t.Fatal("a rejected parent must not create a child")
					}
					return
				}
				if err != nil {
					t.Fatalf("expected creation under %s to succeed, got %v", parent.kind, err)
				}
				if result == nil || repo.created == nil {
					t.Fatal("expected a child to be created")
				}
				if result.Id != parentId+"."+alias || repo.created.ParentId != parentId || repo.created.Kind != childKind {
					t.Fatalf("unexpected created child: %+v", repo.created)
				}
			})
		}
	}
}

func TestCreatePackageParentLookupFailures(t *testing.T) {
	const parentId = "AB.CD"
	lookupErr := errors.New("parent lookup failed")
	for _, tc := range []struct {
		name string
		err  error
	}{
		{name: "missing parent"},
		{name: "repository error", err: lookupErr},
	} {
		t.Run(tc.name, func(t *testing.T) {
			repo := &createPackageRepoStub{getPackageErr: tc.err}
			service := packageServiceImpl{publishedRepo: repo}
			result, err := service.CreatePackage(context.Background(), view.SimplePackage{
				Alias:    "CHILD",
				Kind:     entity.KIND_PACKAGE,
				ParentId: parentId,
			})
			if tc.err != nil {
				if !errors.Is(err, tc.err) {
					t.Fatalf("expected the parent lookup error, got %v", err)
				}
			} else {
				var customErr *exception.CustomError
				if !errors.As(err, &customErr) {
					t.Fatalf("expected a missing-parent error, got %v", err)
				}
				if customErr.Status != http.StatusNotFound || customErr.Code != exception.PackageNotFound {
					t.Fatalf("unexpected missing-parent error: %+v", customErr)
				}
			}
			if result != nil || repo.created != nil {
				t.Fatal("a failed parent lookup must not create a child")
			}
		})
	}
}
