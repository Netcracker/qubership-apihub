package service

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/crypto"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/secctx"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/google/uuid"
)

type PersonalAccessTokenService interface {
	CreatePAT(ctx context.Context, req view.PersonalAccessTokenCreateRequest) (*view.PersonalAccessTokenCreateResponse, error)
	DeletePAT(ctx context.Context, id string) error
	GetPATByToken(ctx context.Context, pat string) (*view.PersonalAccessTokenItem, *view.User, string, error)
	ListPATs(ctx context.Context, userId string) ([]view.PersonalAccessTokenItem, error)
}

func NewPersonalAccessTokenService(repo repository.PersonalAccessTokenRepository, userService UserService, roleService RoleService) PersonalAccessTokenService {
	return personalAccessTokenServiceImpl{repo: repo, userService: userService, roleService: roleService}
}

type personalAccessTokenServiceImpl struct {
	repo        repository.PersonalAccessTokenRepository
	userService UserService
	roleService RoleService
}

const ActivePatPerUserLimit = 100

func (p personalAccessTokenServiceImpl) CreatePAT(ctx context.Context, req view.PersonalAccessTokenCreateRequest) (*view.PersonalAccessTokenCreateResponse, error) {
	//TODO: The validations are not thread-safe, but probably it's ok for now

	count, err := p.repo.CountActiveTokens(ctx, secctx.GetUserId(ctx))
	if err != nil {
		return nil, fmt.Errorf("failed to check token limit: %w", err)
	}
	if count >= ActivePatPerUserLimit {
		return nil, exception.CustomError{
			Status:  http.StatusConflict,
			Code:    exception.PersonalAccessTokenLimitExceeded,
			Message: exception.PersonalAccessTokenLimitExceededMsg,
			Params:  map[string]interface{}{"limit": ActivePatPerUserLimit},
		}
	}

	free, err := p.repo.CheckNameIsFree(ctx, secctx.GetUserId(ctx), req.Name)
	if err != nil {
		return nil, fmt.Errorf("failed to check token name availability: %w", err)
	}
	if !free {
		return nil, exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.PersonalAccessTokenNameIsUsed,
			Message: exception.PersonalAccessTokenNameIsUsedMsg,
			Params:  map[string]interface{}{"name": req.Name},
		}
	}

	pat := crypto.CreateRandomHash()
	tokenHash := crypto.CreateSHA256Hash([]byte(pat))

	expiresAt, err := calculateExpiresAt(req.DaysUntilExpiry)
	if err != nil {
		return nil, err
	}

	ent := entity.PersonaAccessTokenEntity{
		Id:        uuid.New().String(),
		UserId:    secctx.GetUserId(ctx),
		TokenHash: tokenHash,
		Name:      req.Name,
		CreatedAt: time.Now(),
		ExpiresAt: expiresAt,
		DeletedAt: time.Time{},
	}

	err = p.repo.CreatePAT(ctx, ent)
	if err != nil {
		return nil, err
	}

	resp := &view.PersonalAccessTokenCreateResponse{
		PersonalAccessTokenItem: entity.MakePersonaAccessTokenView(ent),
		Token:                   pat,
	}
	return resp, nil
}

func calculateExpiresAt(daysUntilExpiry int) (time.Time, error) {
	if daysUntilExpiry == -1 {
		return time.Time{}, nil
	}

	if daysUntilExpiry < -1 || daysUntilExpiry == 0 {
		return time.Time{}, exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.PersonalAccessTokenIncorrectExpiry,
			Message: exception.PersonalAccessTokenIncorrectExpiryMsg,
			Params:  map[string]interface{}{"param": "daysUntilExpiry"},
		}
	}

	return time.Now().Add(time.Duration(daysUntilExpiry) * 24 * time.Hour), nil
}

func (p personalAccessTokenServiceImpl) DeletePAT(ctx context.Context, id string) error {
	pat, err := p.repo.GetPAT(ctx, id, secctx.GetUserId(ctx))
	if err != nil {
		return fmt.Errorf("failed to get PAT: %w", err)
	}
	if pat == nil {
		return exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PersonalAccessTokenNotFound,
			Message: exception.PersonalAccessTokenNotFoundMsg,
			Params:  map[string]interface{}{"id": id},
		}
	}
	return p.repo.DeletePAT(ctx, pat.Id, secctx.GetUserId(ctx))
}

func (p personalAccessTokenServiceImpl) GetPATByToken(ctx context.Context, pat string) (*view.PersonalAccessTokenItem, *view.User, string, error) {
	tokenHash := crypto.CreateSHA256Hash([]byte(pat))

	//TODO: some optimization wanted: this auth method is using 3 DB calls: get pat, get user, get system role

	ent, err := p.repo.GetPATByHash(ctx, tokenHash)
	if err != nil {
		return nil, nil, "", err
	}
	if ent == nil {
		return nil, nil, "", nil
	}
	result := entity.MakePersonaAccessTokenView(*ent)

	user, err := p.userService.GetUserFromDB(ctx, ent.UserId)
	if err != nil {
		return nil, nil, "", fmt.Errorf("failed to get user for pat: %w", err)
	}

	systemRole, err := p.roleService.GetUserSystemRole(ctx, user.Id)
	if err != nil {
		return nil, nil, "", fmt.Errorf("failed to get user system role for pat: %w", err)
	}
	return &result, user, systemRole, nil
}

func (p personalAccessTokenServiceImpl) ListPATs(ctx context.Context, userId string) ([]view.PersonalAccessTokenItem, error) {
	var pats []entity.PersonaAccessTokenEntity

	pats, err := p.repo.ListPATs(ctx, userId)
	if err != nil {
		return nil, err
	}
	result := make([]view.PersonalAccessTokenItem, 0, len(pats))
	for _, pat := range pats {
		v := entity.MakePersonaAccessTokenView(pat)
		result = append(result, v)
	}

	return result, nil
}
