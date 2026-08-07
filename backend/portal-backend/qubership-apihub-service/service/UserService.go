package service

import (
	"context"
	"crypto/sha256"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/secctx"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
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
	GetUsers(ctx context.Context, usersListReq view.UsersListReq) (*view.Users, error)
	GetUsersIdMap(ctx context.Context, userIds []string) (map[string]view.User, error)
	GetUsersEmailMap(ctx context.Context, emails []string) (map[string]view.User, error)
	GetUserFromDB(ctx context.Context, userId string) (*view.User, error)
	GetUserByEmail(ctx context.Context, email string) (*view.User, error)
	GetOrCreateUserForIntegration(ctx context.Context, user view.User, integration view.ExternalIntegration, providerId string) (*view.User, error)
	CreateInternalUser(ctx context.Context, internalUser *view.InternalUser) (*view.User, error)
	StoreUserAvatar(ctx context.Context, id string, avatar []byte) error
	GetUserAvatar(ctx context.Context, userId string) (*view.UserAvatar, error)
	AuthenticateUser(ctx context.Context, email string, password string) (*view.User, error)
	SearchUsersInLdap(ctx context.Context, ldapSearch view.LdapSearchFilterReq, withAvatars bool) (*view.LdapUsers, error)
	GetExtendedUser_deprecated(ctx context.Context) (*view.ExtendedUser_deprecated, error)
	GetExtendedUser(ctx context.Context) (*view.ExtendedUser, error)
}

func NewUserService(repo repository.UserRepository, systemInfoService SystemInfoService, privateUserPackageService PrivateUserPackageService) UserService {
	return &usersServiceImpl{
		repo:                      repo,
		systemInfoService:         systemInfoService,
		privateUserPackageService: privateUserPackageService,
	}
}

type usersServiceImpl struct {
	repo                      repository.UserRepository
	systemInfoService         SystemInfoService
	privateUserPackageService PrivateUserPackageService
}

func (u usersServiceImpl) saveUserAvatar(ctx context.Context, userAvatar *view.UserAvatar) error {
	return u.repo.SaveUserAvatar(ctx, entity.MakeUserAvatarEntity(userAvatar))
}

func (u usersServiceImpl) GetUserAvatar(ctx context.Context, userId string) (*view.UserAvatar, error) {
	userAvatarEntity, err := u.repo.GetUserAvatar(ctx, userId)

	if err != nil {
		return nil, err
	}
	if userAvatarEntity == nil {
		usersFromLdap, err := u.SearchUsersInLdap(ctx, view.LdapSearchFilterReq{FilterToValue: map[string]string{view.SAMAccountName: userId}, Limit: 1}, true)
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

func (u usersServiceImpl) StoreUserAvatar(ctx context.Context, id string, avatar []byte) error {
	newAvatarChecksum := sha256.Sum256(avatar)
	avatarChanged, err := u.avatarChanged(ctx, id, newAvatarChecksum)
	if err != nil {
		return fmt.Errorf("failed to get user avatar: %w", err)
	}
	if avatarChanged {
		err = u.saveUserAvatar(ctx, &view.UserAvatar{Id: id, Avatar: avatar, Checksum: newAvatarChecksum})
		if err != nil {
			return err
		}
	}
	return nil
}

func (u usersServiceImpl) avatarChanged(ctx context.Context, id string, newChecksum [32]byte) (bool, error) {
	var err error
	avatarFromDB, err := u.GetUserAvatar(ctx, id)
	if err != nil {
		return false, err
	}
	return avatarFromDB == nil || avatarFromDB.Checksum != newChecksum, nil
}

func (u usersServiceImpl) GetUsers(ctx context.Context, usersListReq view.UsersListReq) (*view.Users, error) {
	result := make([]view.User, 0)
	existingEmailsSet := map[string]struct{}{}

	if usersListReq.Filter != "" {
		searchResults, err := u.SearchUsersInLdap(
			ctx,
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

	userEntities, err := u.repo.GetUsers(ctx, usersListReq)
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

func (u usersServiceImpl) SearchUsersInLdap(ctx context.Context, ldapSearchFilterReq view.LdapSearchFilterReq, withAvatars bool) (*view.LdapUsers, error) {
	if len(ldapSearchFilterReq.FilterToValue) == 0 {
		return nil, nil
	}
	ldapServerUrl := u.systemInfoService.GetLdapServer()
	if ldapServerUrl == "" {
		return nil, nil
	}
	if err := ctx.Err(); err != nil {
		return nil, ldapContextError(ldapServerUrl, err)
	}
	ld, err := ldap.DialURL(ldapServerUrl)
	if err != nil {
		log.Debugf("[ldap.DialURL()] err -%s", err.Error())
		return nil, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.LdapConnectionIsNotCorrect,
			Message: exception.LdapConnectionIsNotCorrectMsg,
			Params:  map[string]interface{}{"server": ldapServerUrl, "error": err.Error()},
		}
	}
	defer ld.Close()

	if err := setLdapOperationTimeout(ctx, ld); err != nil {
		return nil, ldapContextError(ldapServerUrl, err)
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
	if err := ctx.Err(); err != nil {
		return nil, ldapContextError(ldapServerUrl, err)
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
	if err := setLdapOperationTimeout(ctx, ld); err != nil {
		return nil, ldapContextError(ldapServerUrl, err)
	}
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
	if err := ctx.Err(); err != nil {
		return nil, ldapContextError(ldapServerUrl, err)
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

// setLdapOperationTimeout bounds a single LDAP request by what is left of the caller's deadline. It is
// recomputed before each operation, because ldap.Conn.SetTimeout applies per request - one value set
// once would let Bind and Search each consume the whole budget - and because SetTimeout silently
// ignores a non-positive value.
func setLdapOperationTimeout(ctx context.Context, ld *ldap.Conn) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	deadline, ok := ctx.Deadline()
	if !ok {
		return nil
	}
	budget := time.Until(deadline) - time.Second
	if budget <= 0 {
		return context.DeadlineExceeded
	}
	ld.SetTimeout(budget)
	return nil
}

// ldapContextError keeps the context error reachable through errors.Is
func ldapContextError(ldapServerUrl string, err error) error {
	return fmt.Errorf("ldap request to %s aborted: %w", ldapServerUrl, err)
}

func (u usersServiceImpl) GetUsersIdMap(ctx context.Context, userIds []string) (map[string]view.User, error) {
	result := make(map[string]view.User, 0)
	userEntities, err := u.repo.GetUsersByIds(ctx, userIds)
	if err != nil {
		return nil, err
	}
	for _, userEntity := range userEntities {
		result[userEntity.Id] = *entity.MakeUserView(&userEntity)
	}
	return result, nil
}

func (u usersServiceImpl) GetUsersEmailMap(ctx context.Context, emails []string) (map[string]view.User, error) {
	result := make(map[string]view.User, 0)
	for index := range emails {
		emails[index] = strings.ToLower(emails[index])
	}
	userEntities, err := u.repo.GetUsersByEmails(ctx, emails)
	if err != nil {
		return nil, err
	}
	for _, userEntity := range userEntities {
		result[userEntity.Email] = *entity.MakeUserView(&userEntity)
	}
	return result, nil
}

func (u usersServiceImpl) GetUserFromDB(ctx context.Context, userId string) (*view.User, error) {
	userEntity, err := u.repo.GetUserById(ctx, userId)

	if err != nil {
		return nil, fmt.Errorf("failed to get user from DB: %w", err)
	}
	if userEntity != nil {
		return entity.MakeUserView(userEntity), nil
	}
	return nil, nil

}

func (u usersServiceImpl) GetUserByEmail(ctx context.Context, email string) (*view.User, error) {
	userEntity, err := u.repo.GetUserByEmail(ctx, email)

	if err != nil {
		return nil, err
	}
	if userEntity != nil {
		return entity.MakeUserView(userEntity), nil
	}
	return nil, nil
}

func (u usersServiceImpl) GetOrCreateUserForIntegration(ctx context.Context, externalUser view.User, integration view.ExternalIntegration, providerId string) (*view.User, error) {
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
	externalIdentity, err := u.repo.GetUserExternalIdentity(ctx, string(integration), providerId, externalId)
	if err != nil {
		return nil, err
	}
	if externalIdentity == nil {
		return u.createExternalUser(ctx, externalUser, integration, providerId)
	}
	userEnt, err := u.repo.GetUserById(ctx, externalIdentity.InternalId)
	if err != nil {
		return nil, err
	}
	if userEnt == nil {
		return u.createExternalUser(ctx, externalUser, integration, providerId)
	}
	if len(userEnt.Password) != 0 {
		err = u.repo.ClearUserPassword(ctx, userEnt.Id)
		if err != nil {
			return nil, err
		}
	}
	userEnt, err = u.updateExternalUserInfo(ctx, userEnt, externalUser)
	if err != nil {
		return nil, err
	}

	return entity.MakeUserView(userEnt), nil
}

func (u usersServiceImpl) createExternalUser(ctx context.Context, externalUser view.User, integration view.ExternalIntegration, providerId string) (*view.User, error) {
	externalId := view.GetIntegrationExternalId(externalUser, integration)
	if externalId == "" {
		return nil, fmt.Errorf("external id is missing for user in %v integration", integration)
	}
	existingUser, err := u.repo.GetUserByEmail(ctx, externalUser.Email)
	if err != nil {
		return nil, err
	}
	if existingUser != nil {
		err = u.repo.UpdateUserExternalIdentity(ctx, string(integration), providerId, externalId, existingUser.Id)
		if err != nil {
			return nil, err
		}
		if len(existingUser.Password) != 0 {
			err = u.repo.ClearUserPassword(ctx, existingUser.Id)
			if err != nil {
				return nil, err
			}
		}
		existingUser, err = u.updateExternalUserInfo(ctx, existingUser, externalUser)
		if err != nil {
			return nil, err
		}
		return entity.MakeUserView(existingUser), nil
	}

	existingUser, err = u.repo.GetUserById(ctx, externalId)
	if err != nil {
		return nil, err
	}
	if existingUser != nil {
		externalUser.Id, err = u.createUniqueUserId(ctx, externalUser.Email)
		if err != nil {
			return nil, err
		}
	}
	if externalUser.Name == "" {
		externalUser.Name = externalUser.Email
	}

	err = u.saveExternalUserToDB(ctx, &externalUser, integration, providerId, externalId)
	if err != nil {
		return nil, err
	}
	return &externalUser, nil
}

func (u usersServiceImpl) updateExternalUserInfo(ctx context.Context, existingUser *entity.UserEntity, externalUser view.User) (*entity.UserEntity, error) {
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
		err := u.repo.UpdateUserInfo(ctx, existingUser)
		if err != nil {
			return nil, err
		}
	}
	return existingUser, nil
}

func (u usersServiceImpl) saveExternalUserToDB(ctx context.Context, user *view.User, integration view.ExternalIntegration, providerId string, externalId string) error {
	userPrivatePackageId, err := u.privateUserPackageService.GenerateUserPrivatePackageId(ctx, user.Id)
	if err != nil {
		return err
	}
	userEntity := entity.MakeExternalUserEntity(user, userPrivatePackageId)
	externalIdentityEnt := &entity.ExternalIdentityEntity{Provider: string(integration), ProviderId: providerId, InternalId: user.Id, ExternalId: externalId}
	return u.repo.SaveExternalUser(ctx, userEntity, externalIdentityEnt)
}

func (u usersServiceImpl) CreateInternalUser(ctx context.Context, internalUser *view.InternalUser) (*view.User, error) {
	//bcrypt max allowed password len
	if len([]byte(internalUser.Password)) > 72 {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.PasswordTooLong,
			Message: exception.PasswordTooLongMsg,
		}
	}
	err := u.validateEmail(ctx, internalUser.Email)
	if err != nil {
		return nil, err
	}

	internalUser.Id, err = u.createUniqueUserId(ctx, internalUser.Email)
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
		userPrivatePackageId, err = u.privateUserPackageService.GenerateUserPrivatePackageId(ctx, internalUser.Id)
		if err != nil {
			return nil, err
		}
	} else {
		privatePackageIdIsTaken, err := u.privateUserPackageService.PrivatePackageIdIsTaken(ctx, internalUser.PrivateWorkspaceId)
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
	saved, err := u.repo.SaveInternalUser(ctx, userEntity)
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

func (u usersServiceImpl) validateEmail(ctx context.Context, email string) error {
	if email == "" {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.EmptyParameter,
			Message: exception.EmptyParameterMsg,
			Params:  map[string]interface{}{"param": "email"},
		}
	}
	existingUser, err := u.repo.GetUserByEmail(ctx, email)
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

func (u usersServiceImpl) createUniqueUserId(ctx context.Context, email string) (string, error) {
	userId := slug.Make(email)
	existingUser, err := u.repo.GetUserById(ctx, userId)
	if err != nil {
		return "", err
	}
	if existingUser != nil {
		i := 1
		for existingUser != nil {
			userId = slug.Make(email + "-" + strconv.Itoa(i))
			existingUser, err = u.repo.GetUserById(ctx, userId)
			if err != nil {
				return "", err
			}
			i++
		}
	}
	return userId, nil
}

func (u usersServiceImpl) AuthenticateUser(ctx context.Context, email string, password string) (*view.User, error) {
	userEntity, err := u.repo.GetUserByEmail(ctx, email)
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

func (u usersServiceImpl) GetExtendedUser_deprecated(ctx context.Context) (*view.ExtendedUser_deprecated, error) {
	userId := secctx.GetUserId(ctx)
	userEntity, err := u.repo.GetUserById(ctx, userId)
	if err != nil {
		return nil, fmt.Errorf("failed to get user from DB: %w", err)
	}
	if userEntity != nil {
		var ttlSeconds *int
		if secctx.GetTokenExpirationTimestamp(ctx) > 0 {
			remainingSeconds := int(utils.GetRemainingSeconds(secctx.GetTokenExpirationTimestamp(ctx)))
			ttlSeconds = &remainingSeconds
		}
		return entity.MakeExtendedUserView_deprecated(userEntity, false, secctx.GetUserSystemRole(ctx), ttlSeconds), nil
	}
	return nil, nil
}

func (u usersServiceImpl) GetExtendedUser(ctx context.Context) (*view.ExtendedUser, error) {
	userId := secctx.GetUserId(ctx)
	userEntity, err := u.repo.GetUserById(ctx, userId)
	if err != nil {
		return nil, fmt.Errorf("failed to get user from DB: %w", err)
	}
	if userEntity != nil {
		var ttlSeconds *int
		if secctx.GetTokenExpirationTimestamp(ctx) > 0 {
			remainingSeconds := int(utils.GetRemainingSeconds(secctx.GetTokenExpirationTimestamp(ctx)))
			ttlSeconds = &remainingSeconds
		}
		return entity.MakeExtendedUserView(userEntity, secctx.GetUserSystemRole(ctx), ttlSeconds), nil
	}
	return nil, nil
}

func createBcryptHashedPassword(password string) ([]byte, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return hashedPassword, err
}
