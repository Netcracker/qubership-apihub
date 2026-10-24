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
	parent  *entity.PackageEntity
	created *entity.PackageEntity
}

func (s *createPackageRepoStub) GetPackage(context.Context, string) (*entity.PackageEntity, error) {
	return s.parent, nil
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
	for _, parentKind := range []string{entity.KIND_WORKSPACE, entity.KIND_GROUP, entity.KIND_PACKAGE, entity.KIND_DASHBOARD} {
		for _, childKind := range []string{entity.KIND_GROUP, entity.KIND_PACKAGE, entity.KIND_DASHBOARD} {
			t.Run(parentKind+"/"+childKind, func(t *testing.T) {
				repo := &createPackageRepoStub{parent: &entity.PackageEntity{Id: parentId, Kind: parentKind}}
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
				if parentKind == entity.KIND_PACKAGE || parentKind == entity.KIND_DASHBOARD {
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
					if customErr.Params["parentId"] != parentId || customErr.Params["kind"] != parentKind {
						t.Fatalf("expected parent ID and kind in error parameters, got %v", customErr.Params)
					}
					if result != nil || repo.created != nil {
						t.Fatal("a rejected parent must not create a child")
					}
					return
				}
				if err != nil {
					t.Fatalf("expected creation under %s to succeed, got %v", parentKind, err)
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
