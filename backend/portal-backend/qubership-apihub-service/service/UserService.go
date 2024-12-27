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
	"crypto/sha256"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-ldap/ldap"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/gosimple/slug"
	log "github.com/sirupsen/logrus"
	"golang.org/x/crypto/bcrypt"
)

type UserService interface {
	GetUsers(usersListReq view.UsersListReq) (*view.Users, error)
	GetUsersByIds(userIds []string) ([]view.User, error)
	GetUsersIdMap(userIds []string) (map[string]view.User, error)
	GetUsersEmailMap(emails []string) (map[string]view.User, error)
	GetUserFromDB(userId string) (*view.User, error)
	GetUserByEmail(email string) (*view.User, error)
	GetOrCreateUserForIntegration(user view.User, integration view.ExternalIntegration) (*view.User, error)
	CreateInternalUser(internalUser *view.InternalUser) (*view.User, error)
	StoreUserAvatar(id string, avatar []byte) error
	GetUserAvatar(userId string) (*view.UserAvatar, error)
	AuthenticateUser(email string, password string) (*view.User, error)
	SearchUsersInLdap(ldapSearch view.LdapSearchFilterReq, withAvatars bool) (*view.LdapUsers, error)
}

func NewUserService(repo repository.UserRepository, gitClientProvider GitClientProvider, systemInfoService SystemInfoService, privateUserPackageService PrivateUserPackageService) UserService {
	return &usersServiceImpl{
		repo:                      repo,
		gitClientProvider:         gitClientProvider,
		systemInfoService:         systemInfoService,
		privateUserPackageService: privateUserPackageService,
	}
}

type usersServiceImpl struct {
	repo                      repository.UserRepository
	gitClientProvider         GitClientProvider
	systemInfoService         SystemInfoService
	privateUserPackageService PrivateUserPackageService
}

func (u usersServiceImpl) saveUserAvatar(userAvatar *view.UserAvatar) error {
	return u.repo.SaveUserAvatar(entity.MakeUserAvatarEntity(userAvatar))
}

func (u usersServiceImpl) GetUserAvatar(userId string) (*view.UserAvatar, error) {
	userAvatarEntity, err := u.repo.GetUserAvatar(userId)

	if err != nil {
		return nil, err
	}
	if userAvatarEntity == nil {
		usersFromLdap, err := u.SearchUsersInLdap(view.LdapSearchFilterReq{FilterToValue: map[string]string{view.SAMAccountName: userId}, Limit: 1}, true)
		if err != nil {
			return nil, err
		}
		if usersFromLdap == nil || len(usersFromLdap.Users) == 0 {
			return nil, nil
		}
		return &view.UserAvatar{
			Id:     userId,
			Avatar: usersFromLdap.Users[0].Avatar,
		}, nil
	} else {
		userAvatar := *entity.MakeUserAvatarView(userAvatarEntity)
		return &userAvatar, nil
	}
}

func (u usersServiceImpl) StoreUserAvatar(id string, avatar []byte) error {
	newAvatarChecksum := sha256.Sum256(avatar)
	avatarChanged, err := u.avatarChanged(id, newAvatarChecksum)
	if err != nil {
		return fmt.Errorf("failed to get user avatar: %v", err.Error())
	}
	if avatarChanged {
		err = u.saveUserAvatar(&view.UserAvatar{Id: id, Avatar: avatar, Checksum: newAvatarChecksum})
		if err != nil {
			return err
		}
	}
	return nil
}

func (u usersServiceImpl) avatarChanged(id string, newChecksum [32]byte) (bool, error) {
	var err error
	avatarFromDB, err := u.GetUserAvatar(id)
	if err != nil {
		return false, err
	}
	return avatarFromDB == nil || avatarFromDB.Checksum != newChecksum, nil
}

func (u usersServiceImpl) GetUsers(usersListReq view.UsersListReq) (*view.Users, error) {
	result := make([]view.User, 0)
	existingEmailsSet := map[string]struct{}{}

	if usersListReq.Filter != "" {
		searchResults, err := u.SearchUsersInLdap(
			view.LdapSearchFilterReq{
				FilterToValue: map[string]string{view.DisplayName: usersListReq.Filter,
					view.Surname: usersListReq.Filter,
					view.Mail:    usersListReq.Filter},
				Limit: usersListReq.Limit,
			},
			false)
		if err != nil {
			return nil, err
		}
		if searchResults != nil {
			for _, ldapUser := range searchResults.Users {
				user := view.User{
					Id:        ldapUser.Id,
					Name:      ldapUser.Name,
					Email:     strings.ToLower(ldapUser.Email),
					AvatarUrl: fmt.Sprintf("/api/v2/users/%s/profile/avatar", ldapUser.Id),
				}
				result = append(result, user)
				existingEmailsSet[user.Email] = struct{}{}
			}
		}
	}

	userEntities, err := u.repo.GetUsers(usersListReq)
	if err != nil {
		return nil, err
	}

	for _, userEntity := range userEntities {
		if _, exists := existingEmailsSet[userEntity.Email]; exists {
			continue
		}
		result = append(result, *entity.MakeUserV2View(&userEntity))
	}

	return &view.Users{Users: result}, nil
}

func (u usersServiceImpl) SearchUsersInLdap(ldapSearchFilterReq view.LdapSearchFilterReq, withAvatars bool) (*view.LdapUsers, error) {
	if len(ldapSearchFilterReq.FilterToValue) == 0 {
		return nil, nil
	}
	ldapServerUrl := u.systemInfoService.GetLdapServer()
	if ldapServerUrl == "" {
		return nil, nil
	}
	ld, err := ldap.DialURL(ldapServerUrl)
	defer ld.Close()
	if err != nil {
		log.Debugf("[ldap.DialURL()] err -%s", err.Error())
		return nil, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.LdapConnectionIsNotCorrect,
			Message: exception.LdapConnectionIsNotCorrectMsg,
			Params:  map[string]interface{}{"server": ldapServerUrl, "error": err.Error()},
		}
	}
	err = ld.Bind(
		fmt.Sprintf("cn=%s,%s,%s",
			u.systemInfoService.GetLdapUser(),
			u.systemInfoService.GetLdapOrganizationUnit(),
			u.systemInfoService.GetLdapBaseDN()),
		u.systemInfoService.GetLdapUserPassword())
	if err != nil {
		log.Debugf("[ ld.Bind()] err -%s", err.Error())
		return nil, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.LdapConnectionIsNotAllowed,
			Message: exception.LdapConnectionIsNotAllowedMsg,
			Params:  map[string]interface{}{"server": ldapServerUrl, "error": err.Error()},
		}
	}

	var subFilter string
	for attribute, value := range ldapSearchFilterReq.FilterToValue {
		subFilter += fmt.Sprintf("(%s=%s*)", attribute, value)
	}
	mainFilter := fmt.Sprintf("(&(objectClass=user)(|%s))", subFilter)
	searchBase := u.systemInfoService.GetLdapSearchBase()
	attributes := []string{view.Mail, view.DisplayName, view.ThumbnailPhoto, view.SAMAccountName}
	pagingControl := ldap.NewControlPaging(uint32(ldapSearchFilterReq.Limit))
	controls := []ldap.Control{pagingControl}
	searchReq := ldap.NewSearchRequest(
		searchBase,
		ldap.ScopeWholeSubtree, ldap.DerefAlways, ldapSearchFilterReq.Limit, 0, false,
		mainFilter,
		attributes,
		controls,
	)
	result, err := ld.Search(searchReq)
	if err != nil {
		log.Debugf("[ld.Search() ]failed to query LDAP: %s", err.Error())
		return nil, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.LdapSearchFailed,
			Message: exception.LdapSearchFailedMsg,
			Params:  map[string]interface{}{"server": ldapServerUrl, "error": err.Error()},
		}
	}
	users := make([]view.LdapUser, 0)
	for _, entry := range result.Entries {
		user := view.LdapUser{}
		for _, attribute := range entry.Attributes {
			switch attribute.Name {
			case view.Mail:
				user.Email = attribute.Values[0]
			case view.DisplayName:
				user.Name = attribute.Values[0]
			case view.SAMAccountName:
				user.Id = attribute.Values[0]
			case view.ThumbnailPhoto:
				if withAvatars {
					user.Avatar = attribute.ByteValues[0]
				}
			default:

			}
		}
		users = append(users, user)
	}

	return &view.LdapUsers{Users: users}, nil
}

func (u usersServiceImpl) GetUsersByIds(userIds []string) ([]view.User, error) {
	result := make([]view.User, 0)
	userEntities, err := u.repo.GetUsersByIds(userIds)
	if err != nil {
		return nil, err
	}
	for _, userEntity := range userEntities {
		result = append(result, *entity.MakeUserView(&userEntity))
	}
	return result, nil
}

func (u usersServiceImpl) GetUsersIdMap(userIds []string) (map[string]view.User, error) {
	result := make(map[string]view.User, 0)
	userEntities, err := u.repo.GetUsersByIds(userIds)
	if err != nil {
		return nil, err
	}
	for _, userEntity := range userEntities {
		result[userEntity.Id] = *entity.MakeUserView(&userEntity)
	}
	return result, nil
}

func (u usersServiceImpl) GetUsersEmailMap(emails []string) (map[string]view.User, error) {
	result := make(map[string]view.User, 0)
	for index := range emails {
		emails[index] = strings.ToLower(emails[index])
	}
	userEntities, err := u.repo.GetUsersByEmails(emails)
	if err != nil {
		return nil, err
	}
	for _, userEntity := range userEntities {
		result[userEntity.Email] = *entity.MakeUserView(&userEntity)
	}
	return result, nil
}

func (u usersServiceImpl) GetUserFromDB(userId string) (*view.User, error) {
	userEntity, err := u.repo.GetUserById(userId)

	if err != nil {
		return nil, fmt.Errorf("failed to get user from DB: %v", err)
	}
	if userEntity != nil {
		return entity.MakeUserView(userEntity), nil
	}
	return nil, nil

}

func (u usersServiceImpl) GetUserByEmail(email string) (*view.User, error) {
	userEntity, err := u.repo.GetUserByEmail(email)

	if err != nil {
		return nil, err
	}
	if userEntity != nil {
		return entity.MakeUserView(userEntity), nil
	}
	return nil, nil
}

func (u usersServiceImpl) GetOrCreateUserForIntegration(externalUser view.User, integration view.ExternalIntegration) (*view.User, error) {
	if externalUser.Email == "" {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.EmptyParameter,
			Message: exception.EmptyParameterMsg,
			Params:  map[string]interface{}{"param": "email"},
		}
	}
	externalId := view.GetIntegrationExternalId(externalUser, integration)
	if externalId == "" {
		return nil, fmt.Errorf("external id is missing for user in '%v' integration", integration)
	}
	externalIdentity, err := u.repo.GetUserExternalIdentity(string(integration), externalId)
	if err != nil {
		return nil, err
	}
	if externalIdentity == nil {
		return u.createExternalUser(externalUser, integration)
	}
	userEnt, err := u.repo.GetUserById(externalIdentity.InternalId)
	if err != nil {
		return nil, err
	}
	if userEnt == nil {
		return u.createExternalUser(externalUser, integration)
	}
	if len(userEnt.Password) != 0 {
		err = u.repo.ClearUserPassword(userEnt.Id)
		if err != nil {
			return nil, err
		}
	}
	userEnt, err = u.updateExternalUserInfo(userEnt, externalUser)
	if err != nil {
		return nil, err
	}

	return entity.MakeUserView(userEnt), nil
}

func (u usersServiceImpl) createExternalUser(externalUser view.User, integration view.ExternalIntegration) (*view.User, error) {
	externalId := view.GetIntegrationExternalId(externalUser, integration)
	if externalId == "" {
		return nil, fmt.Errorf("external id is missing for user in %v integration", integration)
	}
	existingUser, err := u.repo.GetUserByEmail(externalUser.Email)
	if err != nil {
		return nil, err
	}
	if existingUser != nil {
		err = u.repo.UpdateUserExternalIdentity(string(integration), externalId, existingUser.Id)
		if err != nil {
			return nil, err
		}
		if len(existingUser.Password) != 0 {
			err = u.repo.ClearUserPassword(existingUser.Id)
			if err != nil {
				return nil, err
			}
		}
		existingUser, err = u.updateExternalUserInfo(existingUser, externalUser)
		if err != nil {
			return nil, err
		}
		return entity.MakeUserView(existingUser), nil
	}

	existingUser, err = u.repo.GetUserById(externalId)
	if err != nil {
		return nil, err
	}
	if existingUser != nil {
		externalUser.Id, err = u.createUniqueUserId(externalUser.Email)
		if err != nil {
			return nil, err
		}
	}
	if externalUser.Name == "" {
		externalUser.Name = externalUser.Email
	}

	err = u.saveExternalUserToDB(&externalUser, integration, externalId)
	if err != nil {
		return nil, err
	}
	return &externalUser, nil
}

func (u usersServiceImpl) updateExternalUserInfo(existingUser *entity.UserEntity, externalUser view.User) (*entity.UserEntity, error) {
	userInfoChanged := false
	//update name only if user was created without a display name
	if existingUser.Username == existingUser.Email && externalUser.Name != existingUser.Username {
		existingUser.Username = externalUser.Name
		userInfoChanged = true
	}
	if existingUser.AvatarUrl == "" && externalUser.AvatarUrl != "" {
		existingUser.AvatarUrl = externalUser.AvatarUrl
		userInfoChanged = true
	}
	if userInfoChanged {
		err := u.repo.UpdateUserInfo(existingUser)
		if err != nil {
			return nil, err
		}
	}
	return existingUser, nil
}

func (u usersServiceImpl) saveExternalUserToDB(user *view.User, integration view.ExternalIntegration, externalId string) error {
	userPrivatePackageId, err := u.privateUserPackageService.GenerateUserPrivatePackageId(user.Id)
	if err != nil {
		return err
	}
	userEntity := entity.MakeExternalUserEntity(user, userPrivatePackageId)
	externalIdentityEnt := &entity.ExternalIdentityEntity{Provider: string(integration), InternalId: user.Id, ExternalId: externalId}
	return u.repo.SaveExternalUser(userEntity, externalIdentityEnt)
}

func (u usersServiceImpl) CreateInternalUser(internalUser *view.InternalUser) (*view.User, error) {
	//bcrypt max allowed password len
	if len([]byte(internalUser.Password)) > 72 {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.PasswordTooLong,
			Message: exception.PasswordTooLongMsg,
		}
	}
	err := u.validateEmail(internalUser.Email)
	if err != nil {
		return nil, err
	}

	internalUser.Id, err = u.createUniqueUserId(internalUser.Email)
	if err != nil {
		return nil, err
	}

	if internalUser.Name == "" {
		internalUser.Name = internalUser.Email
	}
	passwordHash, err := createBcryptHashedPassword(internalUser.Password)
	if err != nil {
		return nil, err
	}
	userPrivatePackageId := internalUser.PrivateWorkspaceId
	if internalUser.PrivateWorkspaceId == "" {
		userPrivatePackageId, err = u.privateUserPackageService.GenerateUserPrivatePackageId(internalUser.Id)
		if err != nil {
			return nil, err
		}
	} else {
		privatePackageIdIsTaken, err := u.privateUserPackageService.PrivatePackageIdIsTaken(internalUser.PrivateWorkspaceId)
		if err != nil {
			return nil, err
		}
		if privatePackageIdIsTaken {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.PrivateWorkspaceIdAlreadyTaken,
				Message: exception.PrivateWorkspaceIdAlreadyTakenMsg,
				Params:  map[string]interface{}{"id": internalUser.PrivateWorkspaceId},
			}
		}
	}

	userEntity := entity.MakeInternalUserEntity(internalUser, passwordHash, userPrivatePackageId)
	saved, err := u.repo.SaveInternalUser(userEntity)
	if err != nil {
		return nil, err
	}
	if !saved {
		return nil, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Message: "Failed to create internal user",
		}
	}
	return entity.MakeUserV2View(userEntity), nil
}

func (u usersServiceImpl) validateEmail(email string) error {
	if email == "" {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.EmptyParameter,
			Message: exception.EmptyParameterMsg,
			Params:  map[string]interface{}{"param": "email"},
		}
	}
	existingUser, err := u.repo.GetUserByEmail(email)
	if err != nil {
		return err
	}
	if existingUser != nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.EmailAlreadyTaken,
			Message: exception.EmailAlreadyTakenMsg,
			Params:  map[string]interface{}{"email": email},
		}
	}
	return nil
}

func (u usersServiceImpl) createUniqueUserId(email string) (string, error) {
	userId := slug.Make(email)
	existingUser, err := u.repo.GetUserById(userId)
	if err != nil {
		return "", err
	}
	if existingUser != nil {
		i := 1
		for existingUser != nil {
			userId = slug.Make(email + "-" + strconv.Itoa(i))
			existingUser, err = u.repo.GetUserById(userId)
			if err != nil {
				return "", err
			}
			i++
		}
	}
	return userId, nil
}

func (u usersServiceImpl) AuthenticateUser(email string, password string) (*view.User, error) {
	userEntity, err := u.repo.GetUserByEmail(email)
	if err != nil {
		return nil, err
	}
	if password == "" || userEntity == nil || len(userEntity.Password) == 0 {
		log.Debugf("Local authentication failed for %v", email)
		return nil, fmt.Errorf("invalid credentials")
	}
	err = bcrypt.CompareHashAndPassword(userEntity.Password, []byte(password))
	if err != nil {
		log.Debugf("Local authentication failed for %v", email)
		return nil, fmt.Errorf("invalid credentials")
	}

	return entity.MakeUserView(userEntity), nil
}

func createBcryptHashedPassword(password string) ([]byte, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return hashedPassword, err
}
