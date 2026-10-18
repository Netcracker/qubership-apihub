package service

import (
	"context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	log "github.com/sirupsen/logrus"
)

type ZeroDayAdminService interface {
	CreateZeroDayAdmin(ctx context.Context) error
}

func NewZeroDayAdminService(userService UserService, roleService RoleService, repo repository.UserRepository, systemInfoService SystemInfoService) ZeroDayAdminService {
	return &zeroDayAdminServiceImpl{
		userService:       userService,
		roleService:       roleService,
		repo:              repo,
		systemInfoService: systemInfoService,
	}
}

type zeroDayAdminServiceImpl struct {
	userService       UserService
	roleService       RoleService
	repo              repository.UserRepository
	systemInfoService SystemInfoService
}

func (a zeroDayAdminServiceImpl) CreateZeroDayAdmin(ctx context.Context) error {
	email, password := a.systemInfoService.GetZeroDayAdminCreds()

	user, _ := a.userService.GetUserByEmail(ctx, email)
	if user != nil {
		_, err := a.userService.AuthenticateUser(ctx, email, password)
		if err != nil {
			passwordHash, err := createBcryptHashedPassword(password)
			if err != nil {
				return err
			}
			err = a.repo.UpdateUserPassword(ctx, user.Id, passwordHash)
			if err != nil {
				return err
			}
			log.Infof("CreateZeroDayAdmin: password is updated for system admin user")
		} else {
			log.Infof("CreateZeroDayAdmin: system admin user is already present")
		}
	} else {
		user, err := a.userService.CreateInternalUser(ctx,
			&view.InternalUser{
				Email:    email,
				Password: password,
			},
		)
		if err != nil {
			return err
		}

		_, err = a.roleService.AddSystemAdministrator(ctx, user.Id)
		if err != nil {
			return err
		}
		log.Infof("CreateZeroDayAdmin: system admin user '%s' has been created", email)
	}
	return nil
}
