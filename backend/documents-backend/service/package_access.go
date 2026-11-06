package service

import (
	"context"
	"errors"
	"net/http"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/client"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/repository"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
)

// PackageAccessService authorizes admin operations. A System administrator may do everything; any other
// authenticated caller may administer package-scoped articles and navigation only for packages on which APIHUB
// grants them view.ManagePackagePermission (the permission APIHUB requires for editing package settings).
// The APIHUB answer is cached in the request context, so one request asks APIHUB at most once per package.
type PackageAccessService interface {
	// CheckSysadm allows System administrators only.
	CheckSysadm(ctx context.Context) error
	// CheckPackageAdmin allows sysadmins and callers with the package permission on packageId.
	CheckPackageAdmin(ctx context.Context, packageId string) error
	// CheckScopeAdmin authorizes an operation addressed by scope/packageId (query or request body):
	// package scope with a packageId needs the package permission, everything else needs sysadmin.
	CheckScopeAdmin(ctx context.Context, scope, packageId string) error
	// CheckArticleAdmin authorizes an operation on a stored article by id.
	CheckArticleAdmin(ctx context.Context, articleId string) error
	// CheckSectionAdmin authorizes an operation on a stored navigation section by id.
	CheckSectionAdmin(ctx context.Context, sectionId string) error
	// CheckItemAdmin authorizes an operation on a stored navigation item by id (via its section).
	CheckItemAdmin(ctx context.Context, itemId string) error
}

func NewPackageAccessService(apihubClient client.ApihubClient, articleRepository repository.ArticleRepository, navigationRepository repository.NavigationRepository) PackageAccessService {
	return &packageAccessServiceImpl{apihubClient: apihubClient, articleRepository: articleRepository, navigationRepository: navigationRepository}
}

type packageAccessServiceImpl struct {
	apihubClient         client.ApihubClient
	articleRepository    repository.ArticleRepository
	navigationRepository repository.NavigationRepository
}

func sysadmRequired() error {
	return &exception.CustomError{
		Status:  http.StatusForbidden,
		Code:    exception.InsufficientPrivileges,
		Message: exception.InsufficientPrivilegesMsg,
	}
}

func packagePermissionRequired(packageId string) error {
	return &exception.CustomError{
		Status:  http.StatusForbidden,
		Code:    exception.InsufficientPrivileges,
		Message: exception.InsufficientPackagePrivilegesMsg,
		Params:  map[string]interface{}{"packageId": packageId, "permission": view.ManagePackagePermission},
	}
}

func (s packageAccessServiceImpl) CheckSysadm(ctx context.Context) error {
	if secctx.IsSysadm(ctx) {
		return nil
	}
	return sysadmRequired()
}

func (s packageAccessServiceImpl) CheckPackageAdmin(ctx context.Context, packageId string) error {
	if secctx.IsSysadm(ctx) {
		return nil
	}
	if packageId == "" || secctx.IsAnonymous(ctx) {
		return sysadmRequired()
	}
	if allowed, known := secctx.CachedPackageAdmin(ctx, packageId); known {
		if allowed {
			return nil
		}
		return packagePermissionRequired(packageId)
	}
	cred := secctx.GetCredential(ctx)
	if cred == nil {
		return packagePermissionRequired(packageId)
	}
	pkg, err := s.apihubClient.GetPackage(ctx, cred, packageId)
	if err != nil {
		switch {
		case errors.Is(err, client.ErrUnauthorized):
			return &exception.CustomError{Status: http.StatusUnauthorized, Code: exception.Unauthorized, Message: exception.UnauthorizedMsg, Debug: "APIHUB rejected the caller's credentials"}
		case errors.Is(err, client.ErrForbidden), errors.Is(err, client.ErrNotFound):
			secctx.SetPackageAdmin(ctx, packageId, false)
			return packagePermissionRequired(packageId)
		case errors.Is(err, client.ErrUnavailable):
			return apihubUnavailable(err)
		default:
			return err
		}
	}
	allowed := false
	for _, p := range pkg.Permissions {
		if p == view.ManagePackagePermission {
			allowed = true
			break
		}
	}
	secctx.SetPackageAdmin(ctx, packageId, allowed)
	if !allowed {
		return packagePermissionRequired(packageId)
	}
	return nil
}

func (s packageAccessServiceImpl) CheckScopeAdmin(ctx context.Context, scope, packageId string) error {
	if secctx.IsSysadm(ctx) {
		return nil
	}
	if scope != view.ScopePackage || packageId == "" {
		return sysadmRequired()
	}
	return s.CheckPackageAdmin(ctx, packageId)
}

func (s packageAccessServiceImpl) CheckArticleAdmin(ctx context.Context, articleId string) error {
	if secctx.IsSysadm(ctx) {
		return nil
	}
	ent, err := s.articleRepository.GetArticleById(ctx, articleId)
	if err != nil {
		return err
	}
	if ent == nil {
		return articleIdNotFound(articleId)
	}
	return s.CheckScopeAdmin(ctx, ent.Scope, derefString(ent.PackageId))
}

func (s packageAccessServiceImpl) CheckSectionAdmin(ctx context.Context, sectionId string) error {
	if secctx.IsSysadm(ctx) {
		return nil
	}
	section, err := s.navigationRepository.GetSection(ctx, sectionId)
	if err != nil {
		return err
	}
	if section == nil {
		return navSectionNotFound(sectionId)
	}
	return s.CheckScopeAdmin(ctx, section.Scope, derefString(section.PackageId))
}

func (s packageAccessServiceImpl) CheckItemAdmin(ctx context.Context, itemId string) error {
	if secctx.IsSysadm(ctx) {
		return nil
	}
	item, err := s.navigationRepository.GetItem(ctx, itemId)
	if err != nil {
		return err
	}
	if item == nil {
		return navItemNotFound(itemId)
	}
	return s.CheckSectionAdmin(ctx, item.SectionId)
}
