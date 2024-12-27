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
	"fmt"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/gosimple/slug"
)

type RoleService interface {
	AddPackageMembers(ctx context.SecurityContext, packageId string, emails []string, roleIds []string) (*view.PackageMembers, error)
	DeletePackageMember(ctx context.SecurityContext, packageId string, userId string) (*view.PackageMember, error)
	UpdatePackageMember(ctx context.SecurityContext, packageId string, userId string, roleId string, action string) error
	GetPackageMembers(packageId string) (*view.PackageMembers, error)
	GetPermissionsForPackage(ctx context.SecurityContext, packageId string) ([]string, error)
	GetUserPackagePromoteStatuses(packageIds []string, userId string) (*view.AvailablePackagePromoteStatuses, error)
	GetAvailableVersionPublishStatuses(ctx context.SecurityContext, packageId string) ([]string, error)
	HasRequiredPermissions(ctx context.SecurityContext, packageId string, requiredPermissions ...view.RolePermission) (bool, error)
	HasManageVersionPermission(ctx context.SecurityContext, packageId string, versionStatuses ...string) (bool, error)
	ValidateDefaultRole(ctx context.SecurityContext, packageId string, roleId string) error
	PackageRoleExists(roleId string) (bool, error)
	CreateRole(role string, permissions []string) (*view.PackageRole, error)
	DeleteRole(roleId string) error
	GetAvailablePackageRoles(ctx context.SecurityContext, packageId string, excludeNone bool) (*view.PackageRoles, error)
	GetExistingRolesExcludingNone() (*view.PackageRoles, error)
	GetExistingPermissions() (*view.Permissions, error)
	SetRolePermissions(roleId string, permissions []string) error
	SetRoleOrder(roles []string) error
	GetUserSystemRole(userId string) (string, error)
	SetUserSystemRole(userId string, roleId string) error
	IsSysadm(ctx context.SecurityContext) bool
	GetSystemAdministrators() (*view.Admins, error)
	AddSystemAdministrator(userId string) (*view.Admins, error)
	DeleteSystemAdministrator(userId string) error
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

func (r roleServiceImpl) AddPackageMembers(ctx context.SecurityContext, packageId string, emails []string, roleIds []string) (*view.PackageMembers, error) {
	packageEnt, err := r.publishedRepo.GetPackage(packageId)
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
		if !r.IsSysadm(ctx) {
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

	usersEmailMap, err := r.userService.GetUsersEmailMap(emails)
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
		ldapUsers, err := r.userService.SearchUsersInLdap(view.LdapSearchFilterReq{FilterToValue: map[string]string{view.Mail: nonExistentEmail}, Limit: 1}, true)
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

		err = r.userService.StoreUserAvatar(user.Id, user.Avatar)
		if err != nil {
			return nil, err
		}
		externalUser := view.User{
			Id:        user.Id,
			Name:      user.Name,
			Email:     user.Email,
			AvatarUrl: fmt.Sprintf("/api/v2/users/%s/profile/avatar", user.Id),
		}
		createdUser, err := r.userService.GetOrCreateUserForIntegration(externalUser, view.ExternalLdapIntegration)
		if err != nil {
			return nil, err
		}
		userIds = append(userIds, createdUser.Id)
	}

	err = r.addRolesForPackageMembers(ctx, packageId, userIds, roleIds)
	if err != nil {
		return nil, err
	}

	usersMap, err := r.userService.GetUsersIdMap(userIds)
	if err != nil {
		return nil, err
	}

	for _, addedUsrId := range userIds {
		dataMap := map[string]interface{}{}
		dataMap["memberId"] = addedUsrId
		dataMap["memberName"] = usersMap[addedUsrId].Name
		var roleViews []view.EventRoleView
		for _, roleId := range roleIds {
			roleEnt, err := r.roleRepository.GetRole(roleId)
			if err != nil {
				return nil, err
			}
			roleViews = append(roleViews, view.EventRoleView{
				RoleId: roleId,
				Role:   roleEnt.Role,
			})
		}
		dataMap["roles"] = roleViews
		r.atService.TrackEvent(view.ActivityTrackingEvent{
			Type:      view.ATETGrantRole,
			Data:      dataMap,
			PackageId: packageId,
			Date:      time.Now(),
			UserId:    ctx.GetUserId(),
		})
	}

	return r.GetPackageMembers(packageId)
}

func (r roleServiceImpl) UpdatePackageMember(ctx context.SecurityContext, packageId string, userIdToUpdate string, roleId string, action string) error {
	packageEnt, err := r.publishedRepo.GetPackage(packageId)
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
		if !r.IsSysadm(ctx) {
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

	user, err := r.userService.GetUserFromDB(userIdToUpdate)
	if err != nil {
		return err
	}
	dataMap := map[string]interface{}{}
	dataMap["memberId"] = userIdToUpdate
	dataMap["memberName"] = user.Name
	dataMap["roleId"] = roleId
	dataMap["action"] = action
	r.atService.TrackEvent(view.ActivityTrackingEvent{
		Type:      view.ATETUpdateRole,
		Data:      dataMap,
		PackageId: packageId,
		Date:      time.Now(),
		UserId:    ctx.GetUserId(),
	})

	return nil
}

func (r roleServiceImpl) DeletePackageMember(ctx context.SecurityContext, packageId string, userId string) (*view.PackageMember, error) {
	packageEnt, err := r.publishedRepo.GetPackage(packageId)
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
		if !r.IsSysadm(ctx) {
			return nil, &exception.CustomError{
				Status:  http.StatusForbidden,
				Code:    exception.InsufficientPrivileges,
				Message: exception.InsufficientPrivilegesMsg,
				Debug:   exception.PrivateWorkspaceNotModifiableMsg,
			}
		}
	}
	packageMember, err := r.roleRepository.GetDirectPackageMember(packageId, userId)
	if err != nil {
		return nil, err
	}
	if packageMember == nil {
		user, err := r.userService.GetUserFromDB(userId)
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

	err = r.roleRepository.DeleteDirectPackageMember(packageId, userId)
	if err != nil {
		return nil, err
	}

	user, err := r.userService.GetUserFromDB(userId)
	if err != nil {
		return nil, err
	}

	dataMap := map[string]interface{}{}
	dataMap["memberId"] = userId
	dataMap["memberName"] = user.Name
	var roleViews []view.EventRoleView
	for _, roleId := range packageMember.Roles {
		roleEnt, err := r.roleRepository.GetRole(roleId)
		if err != nil {
			return nil, err
		}
		roleViews = append(roleViews, view.EventRoleView{
			RoleId: roleId,
			Role:   roleEnt.Role,
		})
	}
	dataMap["roles"] = roleViews

	r.atService.TrackEvent(view.ActivityTrackingEvent{
		Type:      view.ATETDeleteRole,
		Data:      dataMap,
		PackageId: packageId,
		Date:      time.Now(),
		UserId:    ctx.GetUserId(),
	})

	effectiveMemberRoles, err := r.roleRepository.GetPackageRolesHierarchyForUser(packageId, userId)
	if err != nil {
		return nil, err
	}
	if len(effectiveMemberRoles) != 0 {
		packageMemverView := entity.MakePackageMemberView(packageId, effectiveMemberRoles)
		return &packageMemverView, nil
	}

	return nil, nil
}

func (r roleServiceImpl) deleteRoleForPackageMember(ctx context.SecurityContext, packageId string, userId string, roleId string) error {
	packageMember, err := r.roleRepository.GetDirectPackageMember(packageId, userId)
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
	return r.roleRepository.RemoveRoleFromPackageMember(packageId, userId, roleId)
}

func (r roleServiceImpl) addRoleForPackageMember(ctx context.SecurityContext, packageId string, userId string, roleId string) error {
	return r.addRolesForPackageMembers(ctx, packageId, []string{userId}, []string{roleId})
}

func (r roleServiceImpl) addRolesForPackageMembers(ctx context.SecurityContext, packageId string, userIds []string, roleIds []string) error {
	usersMap, err := r.userService.GetUsersIdMap(userIds)
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
	packageMembers, err := r.getEffectivePackageMembersMap(packageId)
	if err != nil {
		return err
	}
	packageDirectMembers, err := r.getDirectPackageMembersMap(packageId)
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
				CreatedBy: ctx.GetUserId(),
			})
			continue
		}
		directMember.Roles = rolesToSet
		directMember.UpdatedAt = &timeNow
		directMember.UpdatedBy = ctx.GetUserId()
		directMemberEntites = append(directMemberEntites, directMember)
	}
	err = r.roleRepository.AddPackageMemberRoles(directMemberEntites)
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

func (r roleServiceImpl) GetPackageMembers(packageId string) (*view.PackageMembers, error) {
	packageEnt, err := r.publishedRepo.GetPackage(packageId)
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
	packageMembers, err := r.getEffectivePackageMembersMap(packageId)
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

func (r roleServiceImpl) getEffectivePackageMembersMap(packageId string) (map[string][]entity.PackageMemberRoleRichEntity, error) {
	packageMembers, err := r.roleRepository.GetPackageHierarchyMembers(packageId)
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

func (r roleServiceImpl) getDirectPackageMembersMap(packageId string) (map[string]entity.PackageMemberRoleEntity, error) {
	packageMembers, err := r.roleRepository.GetDirectPackageMembers(packageId)
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
func (r roleServiceImpl) GetUserPackagePromoteStatuses(packageIds []string, userId string) (*view.AvailablePackagePromoteStatuses, error) {
	userSystemRole, err := r.GetUserSystemRole(userId)
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
		userPermissions, err := r.getUserPermissionsForPackage(packageId, userId)
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

func (r roleServiceImpl) GetAvailableVersionPublishStatuses(ctx context.SecurityContext, packageId string) ([]string, error) {
	userPackagePermissions, err := r.GetPermissionsForPackage(ctx, packageId)
	if err != nil {
		return nil, err
	}
	return getAvailablePublishStatuses(userPackagePermissions), nil
}

func (r roleServiceImpl) GetPermissionsForPackage(ctx context.SecurityContext, packageId string) ([]string, error) {
	if r.IsSysadm(ctx) {
		allPermissions := make([]string, 0)
		for _, permission := range view.GetAllRolePermissions() {
			allPermissions = append(allPermissions, permission.Id())
		}
		return allPermissions, nil
	}
	if apikeyPackageId := ctx.GetApikeyPackageId(); apikeyPackageId != "" {
		apikeyRoles := ctx.GetApikeyRoles()
		if apikeyPackageId != packageId && !strings.HasPrefix(packageId, apikeyPackageId+".") && apikeyPackageId != "*" {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.PackageNotFound,
				Message: exception.PackageNotFoundMsg,
				Params:  map[string]interface{}{"packageId": packageId},
			}
		}
		apikeyPermissions, err := r.roleRepository.GetPermissionsForRoles(apikeyRoles)
		if err != nil {
			return nil, err
		}
		return apikeyPermissions, nil
	}
	return r.getUserPermissionsForPackage(packageId, ctx.GetUserId())
}

func (r roleServiceImpl) getUserPermissionsForPackage(packageId string, userId string) ([]string, error) {
	userPermissions, err := r.roleRepository.GetUserPermissions(packageId, userId)
	if err != nil {
		return nil, err
	}
	return userPermissions, nil
}

func (r roleServiceImpl) HasRequiredPermissions(ctx context.SecurityContext, packageId string, requiredPermissions ...view.RolePermission) (bool, error) {
	if r.IsSysadm(ctx) {
		return true, nil
	}

	if apikeyPackageId := ctx.GetApikeyPackageId(); apikeyPackageId != "" {
		apikeyRoles := ctx.GetApikeyRoles()
		if apikeyPackageId != packageId && !strings.HasPrefix(packageId, apikeyPackageId+".") && apikeyPackageId != "*" {
			return false, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.PackageNotFound,
				Message: exception.PackageNotFoundMsg,
				Params:  map[string]interface{}{"packageId": packageId},
			}
		}
		apikeyPermissions, err := r.roleRepository.GetPermissionsForRoles(apikeyRoles)
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

	userPermissions, err := r.getUserPermissionsForPackage(packageId, ctx.GetUserId())
	if err != nil {
		return false, err
	}
	if !utils.SliceContains(userPermissions, string(view.ReadPermission)) {
		return false, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId},
		}
	}
	for _, requiredPermission := range requiredPermissions {
		if !utils.SliceContains(userPermissions, string(requiredPermission)) {
			return false, nil
		}
	}
	return true, nil
}

func (r roleServiceImpl) HasManageVersionPermission(ctx context.SecurityContext, packageId string, versionStatuses ...string) (bool, error) {
	if r.IsSysadm(ctx) {
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

// todo move this method to utils or context package?
func (r roleServiceImpl) IsSysadm(ctx context.SecurityContext) bool {
	apikeyRoles := ctx.GetApikeyRoles()
	if utils.SliceContains(apikeyRoles, view.SysadmRole) {
		return true
	}
	return ctx.GetUserSystemRole() == view.SysadmRole
}

func (r roleServiceImpl) ValidateDefaultRole(ctx context.SecurityContext, packageId string, roleId string) error {
	return r.validatePackageMemberRoles(ctx, packageId, []string{roleId})
}

func (r roleServiceImpl) validatePackageMemberRoles(ctx context.SecurityContext, packageId string, roleIds []string) error {
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
			roleEnt, err := r.roleRepository.GetRole(roleId)
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

func (r roleServiceImpl) PackageRoleExists(roleId string) (bool, error) {
	role, err := r.roleRepository.GetRole(roleId)
	if err != nil {
		return false, err
	}
	if role == nil {
		return false, nil
	}
	return true, nil
}

func (r roleServiceImpl) CreateRole(role string, permissions []string) (*view.PackageRole, error) {
	err := validateRolePermissionsEnum(permissions)
	if err != nil {
		return nil, err
	}
	err = validateRole(role)
	if err != nil {
		return nil, err
	}
	allRoles, err := r.roleRepository.GetAllRoles()
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
	err = r.roleRepository.CreateRole(newRoleEntity)
	if err != nil {
		return nil, err
	}
	roleView := entity.MakeRoleView(newRoleEntity)
	return &roleView, nil
}

func (r roleServiceImpl) DeleteRole(roleId string) error {
	role, err := r.roleRepository.GetRole(roleId)
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
	return r.roleRepository.DeleteRole(roleId)
}

func (r roleServiceImpl) GetAvailablePackageRoles(ctx context.SecurityContext, packageId string, excludeNone bool) (*view.PackageRoles, error) {
	packageEnt, err := r.publishedRepo.GetPackage(packageId)
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
	userId := ctx.GetUserId()
	var availableRoles []entity.RoleEntity
	allRoles, err := r.roleRepository.GetAllRoles()
	if err != nil {
		return nil, err
	}
	if r.IsSysadm(ctx) {
		availableRoles = allRoles
	} else if ctx.GetApikeyPackageId() == packageId || strings.HasPrefix(packageId, ctx.GetApikeyPackageId()+".") || ctx.GetApikeyPackageId() == "*" {
		maxRoleRank := -1
		for _, apikeyRoleId := range ctx.GetApikeyRoles() {
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
		availableRoles, err = r.roleRepository.GetAvailablePackageRoles(packageId, userId)
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

func (r roleServiceImpl) GetExistingRolesExcludingNone() (*view.PackageRoles, error) {
	existingRoles := make([]view.PackageRole, 0)
	allRoles, err := r.roleRepository.GetAllRoles()
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

func (r roleServiceImpl) SetRolePermissions(roleId string, permissions []string) error {
	err := validateRolePermissionsEnum(permissions)
	if err != nil {
		return err
	}
	role, err := r.roleRepository.GetRole(roleId)
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
	return r.roleRepository.UpdateRolePermissions(roleId, permissions)
}

func (r roleServiceImpl) SetRoleOrder(roles []string) error {
	roleEntities, err := r.roleRepository.GetAllRoles()
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
	err = r.roleRepository.SetRoleRanks(rolesToUpdate)
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

func (r roleServiceImpl) GetUserSystemRole(userId string) (string, error) {
	systemRoleEnt, err := r.roleRepository.GetUserSystemRole(userId)
	if err != nil {
		return "", err
	}
	if systemRoleEnt == nil {
		return "", nil
	}
	return systemRoleEnt.Role, nil
}

func (r roleServiceImpl) SetUserSystemRole(userId string, roleId string) error {
	return r.roleRepository.SetUserSystemRole(userId, roleId)
}

func (r roleServiceImpl) GetSystemAdministrators() (*view.Admins, error) {
	userEnts, err := r.roleRepository.GetUsersBySystemRole(view.SysadmRole)
	if err != nil {
		return nil, err
	}
	users := make([]view.User, 0)
	for _, ent := range userEnts {
		users = append(users, *entity.MakeUserV2View(&ent))
	}
	return &view.Admins{Admins: users}, nil
}

func (r roleServiceImpl) AddSystemAdministrator(userId string) (*view.Admins, error) {
	userEnt, err := r.userService.GetUserFromDB(userId)
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
	err = r.SetUserSystemRole(userId, view.SysadmRole)
	if err != nil {
		return nil, err
	}
	return r.GetSystemAdministrators()
}

func (r roleServiceImpl) DeleteSystemAdministrator(userId string) error {
	userEnt, err := r.userService.GetUserFromDB(userId)
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
	userSystemRole, err := r.GetUserSystemRole(userId)
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
	err = r.roleRepository.DeleteUserSystemRole(userId)
	if err != nil {
		return err
	}
	return nil
}
