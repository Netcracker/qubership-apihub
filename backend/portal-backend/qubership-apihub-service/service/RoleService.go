package service

import (
	"context"
	"fmt"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/secctx"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/gosimple/slug"
)

type RoleService interface {
	AddPackageMembers(ctx context.Context, packageId string, emails []string, roleIds []string) (*view.PackageMembers, error)
	DeletePackageMember(ctx context.Context, packageId string, userId string) (*view.PackageMember, error)
	UpdatePackageMember(ctx context.Context, packageId string, userId string, roleId string, action string) error
	GetPackageMembers(ctx context.Context, packageId string) (*view.PackageMembers, error)
	GetPermissionsForPackage(ctx context.Context, packageId string) ([]string, error)
	FilterVersionsByPackageReadAccess(ctx context.Context, keys []entity.PublishedVersionKeyEntity) (accessible []entity.PublishedVersionKeyEntity, hiddenCount int, err error)
	GetUserPackagePromoteStatuses(ctx context.Context, packageIds []string, userId string) (*view.AvailablePackagePromoteStatuses, error)
	GetAvailableVersionPublishStatuses(ctx context.Context, packageId string) ([]string, error)
	HasRequiredPermissions(ctx context.Context, packageId string, requiredPermissions ...view.RolePermission) (bool, error)
	HasRequiredPermissionsAcrossAllPackages(ctx context.Context, requiredPermissions ...view.RolePermission) (bool, error)
	HasManageVersionPermission(ctx context.Context, packageId string, versionStatuses ...string) (bool, error)
	ValidateDefaultRole(ctx context.Context, packageId string, roleId string) error
	PackageRoleExists(ctx context.Context, roleId string) (bool, error)
	CreateRole(ctx context.Context, role string, permissions []string) (*view.PackageRole, error)
	DeleteRole(ctx context.Context, roleId string) error
	GetAvailablePackageRoles(ctx context.Context, packageId string, excludeNone bool) (*view.PackageRoles, error)
	GetExistingRolesExcludingNone(ctx context.Context) (*view.PackageRoles, error)
	GetExistingPermissions() (*view.Permissions, error)
	SetRolePermissions(ctx context.Context, roleId string, permissions []string) error
	SetRoleOrder(ctx context.Context, roles []string) error
	GetUserSystemRole(ctx context.Context, userId string) (string, error)
	SetUserSystemRole(ctx context.Context, userId string, roleId string) error
	GetSystemAdministrators(ctx context.Context) (*view.Admins, error)
	AddSystemAdministrator(ctx context.Context, userId string) (*view.Admins, error)
	DeleteSystemAdministrator(ctx context.Context, userId string) error
}

func NewRoleService(roleRepository repository.RoleRepository, userService UserService, atService ActivityTrackingService, publishedRepo repository.PublishedRepository) RoleService {
	return roleServiceImpl{roleRepository: roleRepository, userService: userService, atService: atService, publishedRepo: publishedRepo}
}

type roleServiceImpl struct {
	roleRepository repository.RoleRepository
	userService    UserService
	atService      ActivityTrackingService
	publishedRepo  repository.PublishedRepository
}

func (r roleServiceImpl) AddPackageMembers(ctx context.Context, packageId string, emails []string, roleIds []string) (*view.PackageMembers, error) {
	packageEnt, err := r.publishedRepo.GetPackage(ctx, packageId)
	if err != nil {
		return nil, err
	}
	if packageEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId},
		}
	}
	if packageEnt.DefaultRole == view.NoneRoleId && packageEnt.ParentId == "" {
		if !secctx.IsSysadm(ctx) {
			return nil, &exception.CustomError{
				Status:  http.StatusForbidden,
				Code:    exception.InsufficientPrivileges,
				Message: exception.InsufficientPrivilegesMsg,
				Debug:   exception.PrivateWorkspaceNotModifiableMsg,
			}
		}
	}

	err = r.validatePackageMemberRoles(ctx, packageId, roleIds)
	if err != nil {
		return nil, err
	}

	usersEmailMap, err := r.userService.GetUsersEmailMap(ctx, emails)
	if err != nil {
		return nil, err
	}
	nonExistentEmails := make([]string, 0)
	userIds := make([]string, 0)
	for _, email := range emails {
		user, exists := usersEmailMap[email]
		if exists {
			userIds = append(userIds, user.Id)
		} else {
			nonExistentEmails = append(nonExistentEmails, email)
		}
	}

	for _, nonExistentEmail := range nonExistentEmails {
		ldapUsers, err := r.userService.SearchUsersInLdap(ctx, view.LdapSearchFilterReq{FilterToValue: map[string]string{view.Mail: nonExistentEmail}, Limit: 1}, true)
		if err != nil {
			return nil, err
		}
		if ldapUsers == nil {
			continue
		}

		if len(ldapUsers.Users) == 0 {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.UserByEmailNotFound,
				Message: exception.UserByEmailNotFoundMsg,
				Params:  map[string]interface{}{"email": nonExistentEmail},
			}
		}
		user := ldapUsers.Users[0]

		err = r.userService.StoreUserAvatar(ctx, user.Id, user.Avatar)
		if err != nil {
			return nil, err
		}
		externalUser := view.User{
			Id:        user.Id,
			Name:      user.Name,
			Email:     user.Email,
			AvatarUrl: fmt.Sprintf("/api/v2/users/%s/profile/avatar", user.Id),
		}
		createdUser, err := r.userService.GetOrCreateUserForIntegration(ctx, externalUser, view.ExternalLdapIntegration, "")
		if err != nil {
			return nil, err
		}
		userIds = append(userIds, createdUser.Id)
	}

	err = r.addRolesForPackageMembers(ctx, packageId, userIds, roleIds)
	if err != nil {
		return nil, err
	}

	usersMap, err := r.userService.GetUsersIdMap(ctx, userIds)
	if err != nil {
		return nil, err
	}

	for _, addedUsrId := range userIds {
		dataMap := map[string]interface{}{}
		dataMap["memberId"] = addedUsrId
		dataMap["memberName"] = usersMap[addedUsrId].Name
		var roleViews []view.EventRoleView
		for _, roleId := range roleIds {
			roleEnt, err := r.roleRepository.GetRole(ctx, roleId)
			if err != nil {
				return nil, err
			}
			roleViews = append(roleViews, view.EventRoleView{
				RoleId: roleId,
				Role:   roleEnt.Role,
			})
		}
		dataMap["roles"] = roleViews
		r.atService.TrackEvent(ctx, view.ActivityTrackingEvent{
			Type:      view.ATETGrantRole,
			Data:      dataMap,
			PackageId: packageId,
			Date:      time.Now(),
			UserId:    secctx.GetUserId(ctx),
		})
	}

	return r.GetPackageMembers(ctx, packageId)
}

func (r roleServiceImpl) UpdatePackageMember(ctx context.Context, packageId string, userIdToUpdate string, roleId string, action string) error {
	packageEnt, err := r.publishedRepo.GetPackage(ctx, packageId)
	if err != nil {
		return err
	}
	if packageEnt == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId},
		}
	}
	if packageEnt.DefaultRole == view.NoneRoleId && packageEnt.ParentId == "" {
		if !secctx.IsSysadm(ctx) {
			return &exception.CustomError{
				Status:  http.StatusForbidden,
				Code:    exception.InsufficientPrivileges,
				Message: exception.InsufficientPrivilegesMsg,
				Debug:   exception.PrivateWorkspaceNotModifiableMsg,
			}
		}
	}
	err = r.validatePackageMemberRoles(ctx, packageId, []string{roleId})
	if err != nil {
		return err
	}
	switch action {
	case view.ActionAddRole:
		err = r.addRoleForPackageMember(ctx, packageId, userIdToUpdate, roleId)
	case view.ActionRemoveRole:
		err = r.deleteRoleForPackageMember(ctx, packageId, userIdToUpdate, roleId)
	default:
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.UnsupportedMemberUpdateAction,
			Message: exception.UnsupportedMemberUpdateActionMsg,
			Params:  map[string]interface{}{"action": action},
		}
	}
	if err != nil {
		return err
	}

	user, err := r.userService.GetUserFromDB(ctx, userIdToUpdate)
	if err != nil {
		return err
	}
	dataMap := map[string]interface{}{}
	dataMap["memberId"] = userIdToUpdate
	dataMap["memberName"] = user.Name
	dataMap["roleId"] = roleId
	dataMap["action"] = action
	r.atService.TrackEvent(ctx, view.ActivityTrackingEvent{
		Type:      view.ATETUpdateRole,
		Data:      dataMap,
		PackageId: packageId,
		Date:      time.Now(),
		UserId:    secctx.GetUserId(ctx),
	})

	return nil
}

func (r roleServiceImpl) DeletePackageMember(ctx context.Context, packageId string, userId string) (*view.PackageMember, error) {
	packageEnt, err := r.publishedRepo.GetPackage(ctx, packageId)
	if err != nil {
		return nil, err
	}
	if packageEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId},
		}
	}
	if packageEnt.DefaultRole == view.NoneRoleId && packageEnt.ParentId == "" {
		if !secctx.IsSysadm(ctx) {
			return nil, &exception.CustomError{
				Status:  http.StatusForbidden,
				Code:    exception.InsufficientPrivileges,
				Message: exception.InsufficientPrivilegesMsg,
				Debug:   exception.PrivateWorkspaceNotModifiableMsg,
			}
		}
	}
	packageMember, err := r.roleRepository.GetDirectPackageMember(ctx, packageId, userId)
	if err != nil {
		return nil, err
	}
	if packageMember == nil {
		user, err := r.userService.GetUserFromDB(ctx, userId)
		if err != nil {
			return nil, err
		}
		if user == nil {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.UserNotFound,
				Message: exception.UserNotFoundMsg,
				Params:  map[string]interface{}{"userId": userId},
			}
		}
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.UserWithNoRoles,
			Message: exception.UserWithNoRolesMsg,
			Params:  map[string]interface{}{"user": user.Name, "packageId": packageId},
		}
	}

	err = r.validatePackageMemberRoles(ctx, packageId, packageMember.Roles)
	if err != nil {
		return nil, err
	}

	err = r.roleRepository.DeleteDirectPackageMember(ctx, packageId, userId)
	if err != nil {
		return nil, err
	}

	user, err := r.userService.GetUserFromDB(ctx, userId)
	if err != nil {
		return nil, err
	}

	dataMap := map[string]interface{}{}
	dataMap["memberId"] = userId
	dataMap["memberName"] = user.Name
	var roleViews []view.EventRoleView
	for _, roleId := range packageMember.Roles {
		roleEnt, err := r.roleRepository.GetRole(ctx, roleId)
		if err != nil {
			return nil, err
		}
		roleViews = append(roleViews, view.EventRoleView{
			RoleId: roleId,
			Role:   roleEnt.Role,
		})
	}
	dataMap["roles"] = roleViews

	r.atService.TrackEvent(ctx, view.ActivityTrackingEvent{
		Type:      view.ATETDeleteRole,
		Data:      dataMap,
		PackageId: packageId,
		Date:      time.Now(),
		UserId:    secctx.GetUserId(ctx),
	})

	effectiveMemberRoles, err := r.roleRepository.GetPackageRolesHierarchyForUser(ctx, packageId, userId)
	if err != nil {
		return nil, err
	}
	if len(effectiveMemberRoles) != 0 {
		packageMemverView := entity.MakePackageMemberView(packageId, effectiveMemberRoles)
		return &packageMemverView, nil
	}

	return nil, nil
}

func (r roleServiceImpl) deleteRoleForPackageMember(ctx context.Context, packageId string, userId string, roleId string) error {
	packageMember, err := r.roleRepository.GetDirectPackageMember(ctx, packageId, userId)
	if err != nil {
		return err
	}
	if packageMember == nil || !utils.SliceContains(packageMember.Roles, roleId) {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.MemberRoleNotFound,
			Message: exception.MemberRoleNotFoundMsg,
			Params:  map[string]interface{}{"userId": userId, "packageId": packageId, "roleId": roleId},
		}
	}
	return r.roleRepository.RemoveRoleFromPackageMember(ctx, packageId, userId, roleId)
}

func (r roleServiceImpl) addRoleForPackageMember(ctx context.Context, packageId string, userId string, roleId string) error {
	return r.addRolesForPackageMembers(ctx, packageId, []string{userId}, []string{roleId})
}

func (r roleServiceImpl) addRolesForPackageMembers(ctx context.Context, packageId string, userIds []string, roleIds []string) error {
	usersMap, err := r.userService.GetUsersIdMap(ctx, userIds)
	if err != nil {
		return err
	}
	if len(usersMap) != len(userIds) {
		incorrectUserIds := make([]string, 0)
		for _, userId := range userIds {
			if _, exists := usersMap[userId]; !exists {
				incorrectUserIds = append(incorrectUserIds, userId)
			}
		}
		if len(incorrectUserIds) != 0 {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.UsersNotFound,
				Message: exception.UsersNotFoundMsg,
				Params:  map[string]interface{}{"users": strings.Join(incorrectUserIds, ", ")},
			}
		}
	}
	packageMembers, err := r.getEffectivePackageMembersMap(ctx, packageId)
	if err != nil {
		return err
	}
	packageDirectMembers, err := r.getDirectPackageMembersMap(ctx, packageId)
	if err != nil {
		return err
	}
	directMemberEntites := make([]entity.PackageMemberRoleEntity, 0)
	timeNow := time.Now()
	for _, userId := range userIds {
		rolesToSet := make([]string, 0)

		if packageMemberRoles, exists := packageMembers[userId]; exists {
			for _, roleId := range roleIds {
				if !roleExists(packageMemberRoles, roleId) {
					rolesToSet = append(rolesToSet, roleId)
				}
			}
		} else {
			rolesToSet = roleIds
		}

		if len(rolesToSet) == 0 {
			continue
		}

		directMember, exists := packageDirectMembers[userId]
		if !exists {
			directMemberEntites = append(directMemberEntites, entity.PackageMemberRoleEntity{
				PackageId: packageId,
				UserId:    userId,
				Roles:     rolesToSet,
				CreatedAt: timeNow,
				CreatedBy: secctx.GetUserId(ctx),
			})
			continue
		}
		directMember.Roles = rolesToSet
		directMember.UpdatedAt = &timeNow
		directMember.UpdatedBy = secctx.GetUserId(ctx)
		directMemberEntites = append(directMemberEntites, directMember)
	}
	err = r.roleRepository.AddPackageMemberRoles(ctx, directMemberEntites)
	if err != nil {
		return err
	}
	return nil
}

func roleExists(roles []entity.PackageMemberRoleRichEntity, roleId string) bool {
	for _, memberRoleEntity := range roles {
		if memberRoleEntity.RoleId == roleId {
			return true
		}
	}
	return false
}

func (r roleServiceImpl) GetPackageMembers(ctx context.Context, packageId string) (*view.PackageMembers, error) {
	packageEnt, err := r.publishedRepo.GetPackage(ctx, packageId)
	if err != nil {
		return nil, err
	}
	if packageEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId},
		}
	}
	packageMembers, err := r.getEffectivePackageMembersMap(ctx, packageId)
	if err != nil {
		return nil, err
	}
	packageMembersView := make([]view.PackageMember, 0)
	for _, packageMember := range packageMembers {
		memberView := entity.MakePackageMemberView(packageId, packageMember)
		packageMembersView = append(packageMembersView, memberView)
	}
	sort.Slice(packageMembersView, func(i, j int) bool {
		return packageMembersView[i].User.Name < packageMembersView[j].User.Name
	})
	return &view.PackageMembers{Members: packageMembersView}, nil
}

func (r roleServiceImpl) getEffectivePackageMembersMap(ctx context.Context, packageId string) (map[string][]entity.PackageMemberRoleRichEntity, error) {
	packageMembers, err := r.roleRepository.GetPackageHierarchyMembers(ctx, packageId)
	if err != nil {
		return nil, err
	}
	membersMap := make(map[string][]entity.PackageMemberRoleRichEntity, 0)
	for _, memberEntity := range packageMembers {
		if memberRoles, exists := membersMap[memberEntity.UserId]; exists {
			membersMap[memberEntity.UserId] = append(memberRoles, memberEntity)
		} else {
			membersMap[memberEntity.UserId] = []entity.PackageMemberRoleRichEntity{memberEntity}
		}
	}
	return membersMap, nil
}

func (r roleServiceImpl) getDirectPackageMembersMap(ctx context.Context, packageId string) (map[string]entity.PackageMemberRoleEntity, error) {
	packageMembers, err := r.roleRepository.GetDirectPackageMembers(ctx, packageId)
	if err != nil {
		return nil, err
	}
	packageMembersMap := make(map[string]entity.PackageMemberRoleEntity, 0)
	for _, member := range packageMembers {
		packageMembersMap[member.UserId] = member
	}
	return packageMembersMap, nil
}

// for agent
func (r roleServiceImpl) GetUserPackagePromoteStatuses(ctx context.Context, packageIds []string, userId string) (*view.AvailablePackagePromoteStatuses, error) {
	userSystemRole, err := r.GetUserSystemRole(ctx, userId)
	if err != nil {
		return nil, err
	}
	sysadmUser := userSystemRole == view.SysadmRole

	result := make(view.AvailablePackagePromoteStatuses, 0)
	for _, packageId := range packageIds {
		if sysadmUser {
			result[packageId] = []string{
				string(view.Draft),
				string(view.Release),
				string(view.Archived),
			}
			continue
		}
		userPermissions, err := r.getUserPermissionsForPackage(ctx, packageId, userId)
		if err != nil {
			return nil, err
		}
		result[packageId] = getAvailablePublishStatuses(userPermissions)
	}
	return &result, nil
}

func getAvailablePublishStatuses(userPermissions []string) []string {
	availablePublishStatuses := make([]string, 0)
	if utils.SliceContains(userPermissions, string(view.ManageDraftVersionPermission)) {
		availablePublishStatuses = append(availablePublishStatuses, string(view.Draft))
	}
	if utils.SliceContains(userPermissions, string(view.ManageReleaseVersionPermission)) {
		availablePublishStatuses = append(availablePublishStatuses, string(view.Release))
	}
	if utils.SliceContains(userPermissions, string(view.ManageArchivedVersionPermission)) {
		availablePublishStatuses = append(availablePublishStatuses, string(view.Archived))
	}
	return availablePublishStatuses
}

func (r roleServiceImpl) GetAvailableVersionPublishStatuses(ctx context.Context, packageId string) ([]string, error) {
	userPackagePermissions, err := r.GetPermissionsForPackage(ctx, packageId)
	if err != nil {
		return nil, err
	}
	return getAvailablePublishStatuses(userPackagePermissions), nil
}

func (r roleServiceImpl) GetPermissionsForPackage(ctx context.Context, packageId string) ([]string, error) {
	if secctx.IsSysadm(ctx) {
		allPermissions := make([]string, 0)
		for _, permission := range view.GetAllRolePermissions() {
			allPermissions = append(allPermissions, permission.Id())
		}
		return allPermissions, nil
	}
	if apikeyPackageId := secctx.GetApiKeyPackageId(ctx); apikeyPackageId != "" {
		apikeyRoles := secctx.GetApiKeyRoles(ctx)
		if apikeyPackageId != packageId && !strings.HasPrefix(packageId, apikeyPackageId+".") && apikeyPackageId != "*" {
			return make([]string, 0), nil
		}
		apikeyPermissions, err := r.roleRepository.GetPermissionsForRoles(ctx, apikeyRoles)
		if err != nil {
			return nil, err
		}
		return apikeyPermissions, nil
	}
	return r.getUserPermissionsForPackage(ctx, packageId, secctx.GetUserId(ctx))
}

func (r roleServiceImpl) getUserPermissionsForPackage(ctx context.Context, packageId string, userId string) ([]string, error) {
	userPermissions, err := r.roleRepository.GetUserPermissions(ctx, packageId, userId)
	if err != nil {
		return nil, err
	}
	return userPermissions, nil
}

func (r roleServiceImpl) FilterVersionsByPackageReadAccess(ctx context.Context, keys []entity.PublishedVersionKeyEntity) ([]entity.PublishedVersionKeyEntity, int, error) {
	accessible := make([]entity.PublishedVersionKeyEntity, 0, len(keys))
	hiddenCount := 0
	checkedPackages := make(map[string]bool)
	for _, key := range keys {
		canRead, checked := checkedPackages[key.PackageId]
		if !checked {
			permissions, err := r.GetPermissionsForPackage(ctx, key.PackageId)
			if err != nil {
				return nil, 0, err
			}
			canRead = utils.SliceContains(permissions, string(view.ReadPermission))
			checkedPackages[key.PackageId] = canRead
		}
		if canRead {
			accessible = append(accessible, key)
		} else {
			hiddenCount++
		}
	}
	return accessible, hiddenCount, nil
}

func (r roleServiceImpl) HasRequiredPermissions(ctx context.Context, packageId string, requiredPermissions ...view.RolePermission) (bool, error) {
	if secctx.IsSysadm(ctx) {
		return true, nil
	}

	if apikeyPackageId := secctx.GetApiKeyPackageId(ctx); apikeyPackageId != "" {
		apikeyRoles := secctx.GetApiKeyRoles(ctx)
		if apikeyPackageId != packageId && !strings.HasPrefix(packageId, apikeyPackageId+".") && apikeyPackageId != "*" {
			return false, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.PackageNotFound,
				Message: exception.PackageNotFoundMsg,
				Params:  map[string]interface{}{"packageId": packageId},
				Debug:   fmt.Sprintf("Package %s is out of (package) scope for the api key", packageId),
			}
		}
		apikeyPermissions, err := r.roleRepository.GetPermissionsForRoles(ctx, apikeyRoles)
		if err != nil {
			return false, err
		}
		for _, requiredPermission := range requiredPermissions {
			if !utils.SliceContains(apikeyPermissions, string(requiredPermission)) {
				return false, nil
			}
		}
		return true, nil
	}

	userPermissions, err := r.getUserPermissionsForPackage(ctx, packageId, secctx.GetUserId(ctx))
	if err != nil {
		return false, err
	}
	if !utils.SliceContains(userPermissions, string(view.ReadPermission)) {
		return false, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId},
			Debug:   fmt.Sprintf("The user have no required read permission to access the package %s", packageId),
		}
	}
	for _, requiredPermission := range requiredPermissions {
		if !utils.SliceContains(userPermissions, string(requiredPermission)) {
			return false, nil
		}
	}
	return true, nil
}

func (r roleServiceImpl) HasRequiredPermissionsAcrossAllPackages(ctx context.Context, requiredPermissions ...view.RolePermission) (bool, error) {
	if secctx.IsSysadm(ctx) {
		return true, nil
	}

	if apikeyRoles := secctx.GetApiKeyRoles(ctx); len(apikeyRoles) > 0 {
		apikeyPermissions, err := r.roleRepository.GetPermissionsForRoles(ctx, apikeyRoles)
		if err != nil {
			return false, err
		}
		for _, requiredPermission := range requiredPermissions {
			if !utils.SliceContains(apikeyPermissions, string(requiredPermission)) {
				return false, nil
			}
		}
		return true, nil
	}

	userPermissions, err := r.roleRepository.GetAllUserPermissions(ctx, secctx.GetUserId(ctx))
	if err != nil {
		return false, err
	}

	for _, requiredPermission := range requiredPermissions {
		if !utils.SliceContains(userPermissions, string(requiredPermission)) {
			return false, nil
		}
	}
	return true, nil
}

func (r roleServiceImpl) HasManageVersionPermission(ctx context.Context, packageId string, versionStatuses ...string) (bool, error) {
	if secctx.IsSysadm(ctx) {
		return true, nil
	}
	requiredPermissions := make([]view.RolePermission, 0)
	for _, status := range versionStatuses {
		requiredPermissions = append(requiredPermissions, getRequiredPermissionForVersionStatus(status))
	}
	hasRequiredPermission, err := r.HasRequiredPermissions(ctx, packageId, requiredPermissions...)
	if err != nil {
		return false, nil
	}
	if hasRequiredPermission {
		return true, nil
	}

	return false, nil
}

func getRequiredPermissionForVersionStatus(versionStatus string) view.RolePermission {
	switch versionStatus {
	case string(view.Draft):
		return view.ManageDraftVersionPermission
	case string(view.Release):
		return view.ManageReleaseVersionPermission
	case string(view.Archived):
		return view.ManageArchivedVersionPermission
	default:
		return ""
	}
}

func (r roleServiceImpl) ValidateDefaultRole(ctx context.Context, packageId string, roleId string) error {
	return r.validatePackageMemberRoles(ctx, packageId, []string{roleId})
}

func (r roleServiceImpl) validatePackageMemberRoles(ctx context.Context, packageId string, roleIds []string) error {
	availableRoles, err := r.GetAvailablePackageRoles(ctx, packageId, false)
	if err != nil {
		return err
	}
	availableRolesMap := make(map[string]bool, 0)
	for _, role := range availableRoles.Roles {
		availableRolesMap[role.RoleId] = true
	}
	for _, roleId := range roleIds {
		if exists := availableRolesMap[roleId]; !exists {
			roleEnt, err := r.roleRepository.GetRole(ctx, roleId)
			if err != nil {
				return err
			}
			if roleEnt == nil {
				return &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.RoleDoesntExist,
					Message: exception.RoleDoesntExistMsg,
					Params:  map[string]interface{}{"roleId": roleId},
				}
			}
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.NotEnoughPermissionsForRole,
				Message: exception.NotEnoughPermissionsForRoleMsg,
				Params:  map[string]interface{}{"roleId": roleId},
			}
		}
	}

	return nil
}

func (r roleServiceImpl) PackageRoleExists(ctx context.Context, roleId string) (bool, error) {
	role, err := r.roleRepository.GetRole(ctx, roleId)
	if err != nil {
		return false, err
	}
	if role == nil {
		return false, nil
	}
	return true, nil
}

func (r roleServiceImpl) CreateRole(ctx context.Context, role string, permissions []string) (*view.PackageRole, error) {
	err := validateRolePermissionsEnum(permissions)
	if err != nil {
		return nil, err
	}
	err = validateRole(role)
	if err != nil {
		return nil, err
	}
	allRoles, err := r.roleRepository.GetAllRoles(ctx)
	if err != nil {
		return nil, err
	}
	newRoleId := slug.Make(role)
	viewerRoleRank := 1
	for _, role := range allRoles {
		if role.Id == string(view.ViewerRoleId) {
			viewerRoleRank = role.Rank
		}
		if role.Id == newRoleId {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.RoleAlreadyExists,
				Message: exception.RoleAlreadyExistsMsg,
				Params:  map[string]interface{}{"roleId": newRoleId},
			}
		}
	}
	if !utils.SliceContains(permissions, string(view.ReadPermission)) {
		permissions = append(permissions, string(view.ReadPermission))
	}
	newRoleEntity := entity.RoleEntity{
		Id:          newRoleId,
		Role:        role,
		Permissions: permissions,
		Rank:        viewerRoleRank + 1,
		ReadOnly:    false,
	}
	err = r.roleRepository.CreateRole(ctx, newRoleEntity)
	if err != nil {
		return nil, err
	}
	roleView := entity.MakeRoleView(newRoleEntity)
	return &roleView, nil
}

func (r roleServiceImpl) DeleteRole(ctx context.Context, roleId string) error {
	role, err := r.roleRepository.GetRole(ctx, roleId)
	if err != nil {
		return err
	}
	if role == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.RoleDoesntExist,
			Message: exception.RoleDoesntExistMsg,
			Params:  map[string]interface{}{"roleId": roleId},
		}
	}
	if role.ReadOnly {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.RoleNotEditable,
			Message: exception.RoleNotEditableMsg,
			Params:  map[string]interface{}{"roleId": roleId},
		}
	}
	return r.roleRepository.DeleteRole(ctx, roleId)
}

func (r roleServiceImpl) GetAvailablePackageRoles(ctx context.Context, packageId string, excludeNone bool) (*view.PackageRoles, error) {
	packageEnt, err := r.publishedRepo.GetPackage(ctx, packageId)
	if err != nil {
		return nil, err
	}
	if packageEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId},
		}
	}
	userId := secctx.GetUserId(ctx)
	var availableRoles []entity.RoleEntity
	allRoles, err := r.roleRepository.GetAllRoles(ctx)
	if err != nil {
		return nil, err
	}
	if secctx.IsSysadm(ctx) {
		availableRoles = allRoles
	} else if secctx.GetApiKeyPackageId(ctx) == packageId || strings.HasPrefix(packageId, secctx.GetApiKeyPackageId(ctx)+".") || secctx.GetApiKeyPackageId(ctx) == "*" {
		maxRoleRank := -1
		for _, apikeyRoleId := range secctx.GetApiKeyRoles(ctx) {
			for _, role := range allRoles {
				if apikeyRoleId == role.Id {
					if maxRoleRank < role.Rank {
						maxRoleRank = role.Rank
					}
				}
			}
		}
		for _, role := range allRoles {
			if maxRoleRank >= role.Rank {
				availableRoles = append(availableRoles, role)
			}
		}
	} else {
		availableRoles, err = r.roleRepository.GetAvailablePackageRoles(ctx, packageId, userId)
		if err != nil {
			return nil, err
		}
	}
	result := make([]view.PackageRole, 0)
	for _, roleEnt := range availableRoles {
		if excludeNone && roleEnt.Id == view.NoneRoleId {
			continue
		}
		result = append(result, entity.MakeRoleView(roleEnt))
	}
	return &view.PackageRoles{Roles: result}, nil
}

func (r roleServiceImpl) GetExistingRolesExcludingNone(ctx context.Context) (*view.PackageRoles, error) {
	existingRoles := make([]view.PackageRole, 0)
	allRoles, err := r.roleRepository.GetAllRoles(ctx)
	if err != nil {
		return nil, err
	}
	for _, role := range allRoles {
		if role.Id == view.NoneRoleId {
			continue
		}
		existingRoles = append(existingRoles, entity.MakeRoleView(role))
	}
	return &view.PackageRoles{Roles: existingRoles}, nil
}

func (r roleServiceImpl) GetExistingPermissions() (*view.Permissions, error) {
	existingPermissions := make([]view.Permission, 0)

	for _, permission := range view.GetAllRolePermissions() {
		existingPermissions = append(existingPermissions,
			view.Permission{
				PermissionId: permission.Id(),
				Name:         permission.Name(),
			})
	}
	return &view.Permissions{Permissions: existingPermissions}, nil
}

func (r roleServiceImpl) SetRolePermissions(ctx context.Context, roleId string, permissions []string) error {
	err := validateRolePermissionsEnum(permissions)
	if err != nil {
		return err
	}
	role, err := r.roleRepository.GetRole(ctx, roleId)
	if err != nil {
		return err
	}
	if role == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.RoleDoesntExist,
			Message: exception.RoleDoesntExistMsg,
			Params:  map[string]interface{}{"roleId": roleId},
		}
	}
	if role.ReadOnly {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.RoleNotEditable,
			Message: exception.RoleNotEditableMsg,
			Params:  map[string]interface{}{"roleId": roleId},
		}
	}
	if !utils.SliceContains(permissions, string(view.ReadPermission)) {
		permissions = append(permissions, string(view.ReadPermission))
	}
	return r.roleRepository.UpdateRolePermissions(ctx, roleId, permissions)
}

func (r roleServiceImpl) SetRoleOrder(ctx context.Context, roles []string) error {
	roleEntities, err := r.roleRepository.GetAllRoles(ctx)
	if err != nil {
		return err
	}
	if len(roles) != len(roleEntities) {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.AllRolesRequired,
			Message: exception.AllRolesRequiredMsg,
		}
	}
	roleMap := make(map[string]entity.RoleEntity, 0)
	for _, roleEntity := range roleEntities {
		roleMap[roleEntity.Id] = roleEntity
		if !utils.SliceContains(roles, roleEntity.Id) {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.AllRolesRequired,
				Message: exception.AllRolesRequiredMsg,
			}
		}
	}
	if roles[0] != view.AdminRoleId {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.RoleNotEditable,
			Message: exception.RoleNotEditableMsg,
			Params:  map[string]interface{}{"roleId": view.AdminRoleId},
		}
	}
	rolesToUpdate := make([]entity.RoleEntity, 0)
	rank := len(roles) - 1
	for index, roleId := range roles {
		role := roleMap[roleId]
		if role.ReadOnly {
			if roleId != string(view.AdminRoleId) && role.Rank != rank-index {
				return &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.RoleNotEditable,
					Message: exception.RoleNotEditableMsg,
					Params:  map[string]interface{}{"roleId": roleId},
				}
			}
			continue
		}
		rolesToUpdate = append(rolesToUpdate, entity.RoleEntity{Id: roleId, Rank: rank - index})
	}
	err = r.roleRepository.SetRoleRanks(ctx, rolesToUpdate)
	if err != nil {
		return err
	}
	return nil
}

func validateRolePermissionsEnum(permissions []string) error {
	for _, permission := range permissions {
		_, err := view.ParseRolePermission(permission)
		if err != nil {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidRolePermission,
				Message: exception.InvalidRolePermissionMsg,
				Params:  map[string]interface{}{"permission": permission},
			}
		}
	}
	return nil
}

func validateRole(role string) error {
	roleNamePattern := `^[a-zA-Z0-9 -]+$`
	roleNameRegexp := regexp.MustCompile(roleNamePattern)
	if !roleNameRegexp.MatchString(role) {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.RoleNameDoesntMatchPattern,
			Message: exception.RoleNameDoesntMatchPatternMsg,
			Params:  map[string]interface{}{"role": role, "pattern": roleNamePattern},
		}
	}
	return nil
}

func (r roleServiceImpl) GetUserSystemRole(ctx context.Context, userId string) (string, error) {
	systemRoleEnt, err := r.roleRepository.GetUserSystemRole(ctx, userId)
	if err != nil {
		return "", err
	}
	if systemRoleEnt == nil {
		return "", nil
	}
	return systemRoleEnt.Role, nil
}

func (r roleServiceImpl) SetUserSystemRole(ctx context.Context, userId string, roleId string) error {
	return r.roleRepository.SetUserSystemRole(ctx, userId, roleId)
}

func (r roleServiceImpl) GetSystemAdministrators(ctx context.Context) (*view.Admins, error) {
	userEnts, err := r.roleRepository.GetUsersBySystemRole(ctx, view.SysadmRole)
	if err != nil {
		return nil, err
	}
	users := make([]view.User, 0)
	for _, ent := range userEnts {
		users = append(users, *entity.MakeUserV2View(&ent))
	}
	return &view.Admins{Admins: users}, nil
}

func (r roleServiceImpl) AddSystemAdministrator(ctx context.Context, userId string) (*view.Admins, error) {
	userEnt, err := r.userService.GetUserFromDB(ctx, userId)
	if err != nil {
		return nil, err
	}
	if userEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.UserNotFound,
			Message: exception.UserNotFoundMsg,
			Params:  map[string]interface{}{"userId": userId},
		}
	}
	err = r.SetUserSystemRole(ctx, userId, view.SysadmRole)
	if err != nil {
		return nil, err
	}
	return r.GetSystemAdministrators(ctx)
}

func (r roleServiceImpl) DeleteSystemAdministrator(ctx context.Context, userId string) error {
	userEnt, err := r.userService.GetUserFromDB(ctx, userId)
	if err != nil {
		return err
	}
	if userEnt == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.UserNotFound,
			Message: exception.UserNotFoundMsg,
			Params:  map[string]interface{}{"userId": userId},
		}
	}
	userSystemRole, err := r.GetUserSystemRole(ctx, userId)
	if err != nil {
		return err
	}
	if userSystemRole != view.SysadmRole {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.SysadmNotFound,
			Message: exception.SysadmNotFoundMsg,
			Params:  map[string]interface{}{"userId": userId},
		}
	}
	err = r.roleRepository.DeleteUserSystemRole(ctx, userId)
	if err != nil {
		return err
	}
	return nil
}
