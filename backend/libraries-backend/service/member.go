package service

import (
	"context"
	"fmt"
	"net/http"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/client"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/repository"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"

	log "github.com/sirupsen/logrus"
)

type MemberService interface {
	List(ctx context.Context, library entity.LibraryEntity) (*view.Members, error)
	SetRoles(ctx context.Context, library entity.LibraryEntity, userId string, roleIds []string) error
	Delete(ctx context.Context, library entity.LibraryEntity, userId string) error
}

func NewMemberService(
	memberRepository repository.MemberRepository,
	authorizationService AuthorizationService,
	apihubClient client.ApihubClient,
) MemberService {
	return memberServiceImpl{
		memberRepository:     memberRepository,
		authorizationService: authorizationService,
		apihubClient:         apihubClient,
	}
}

type memberServiceImpl struct {
	memberRepository     repository.MemberRepository
	authorizationService AuthorizationService
	apihubClient         client.ApihubClient
}

func (m memberServiceImpl) List(ctx context.Context, library entity.LibraryEntity) (*view.Members, error) {
	memberEnts, err := m.memberRepository.List(ctx, library.Id)
	if err != nil {
		return nil, err
	}

	catalogue, err := m.authorizationService.KnownRoles(ctx)
	if err != nil {
		return nil, err
	}

	result := view.Members{Members: make([]view.Member, 0, len(memberEnts))}
	for _, memberEnt := range memberEnts {
		roles := make([]view.MemberRole, 0, len(memberEnt.Roles))
		for _, roleId := range memberEnt.Roles {
			roles = append(roles, view.MemberRole{RoleId: roleId, Role: catalogue[roleId].RoleName})
		}
		result.Members = append(result.Members, view.Member{
			User:  view.MemberUser{UserId: memberEnt.UserId, Name: m.userName(ctx, memberEnt.UserId)},
			Roles: roles,
		})
	}
	return &result, nil
}

// userName resolves a login to a display name. A lookup failure only costs the name, so it is logged and
// the member is still listed with the login the role is stored against.
func (m memberServiceImpl) userName(ctx context.Context, userId string) string {
	user, err := m.apihubClient.GetUserById(ctx, userId)
	if err != nil {
		log.Warnf("Failed to resolve the name of user %s: %v", userId, err)
		return ""
	}
	if user == nil {
		return ""
	}
	return user.Name
}

func (m memberServiceImpl) SetRoles(ctx context.Context, library entity.LibraryEntity, userId string, roleIds []string) error {
	catalogue, err := m.authorizationService.KnownRoles(ctx)
	if err != nil {
		return err
	}
	for _, roleId := range roleIds {
		if _, known := catalogue[roleId]; !known {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidParameterValue,
				Message: exception.InvalidParameterValueMsg,
				Params:  map[string]interface{}{"value": roleId, "param": "roleIds"},
			}
		}
	}

	user, err := m.apihubClient.GetUserById(ctx, userId)
	if err != nil {
		return fmt.Errorf("failed to resolve user %s: %w", userId, err)
	}
	if user == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"value": userId, "param": "userId"},
		}
	}

	return m.memberRepository.SetRoles(ctx, library.Id, userId, roleIds, secctx.GetUserId(ctx))
}

func (m memberServiceImpl) Delete(ctx context.Context, library entity.LibraryEntity, userId string) error {
	return m.memberRepository.Delete(ctx, library.Id, userId)
}
