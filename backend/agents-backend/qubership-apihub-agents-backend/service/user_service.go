package service

import (
	"context"
	"time"

	"github.com/Netcracker/qubership-apihub-agents-backend/client"
	"github.com/Netcracker/qubership-apihub-agents-backend/secctx"
	"github.com/Netcracker/qubership-apihub-agents-backend/view"
	"github.com/shaj13/libcache"
	log "github.com/sirupsen/logrus"
)

const (
	MinSize       = 100
	DefaultAge    = 6 * time.Hour
	ErrBadClient  = "invalid apihub client reference"
	ErrBadContext = "invalid security context"
	errGeneric    = "%s in user service"
)

// UserService public interface for service implementation
type UserService interface {
	// GetApihubUser acquires user in cache or request it through API HUB client
	GetApihubUser(userId string) (view.User, error)
}

// service instance internal structure
type userServiceImpl struct {
	apihubClient client.ApihubClient
	instance     libcache.Cache
	ctx          context.Context
}

// NewUserService creates a new user service instance
func NewUserService(apihubClient client.ApihubClient, nSize int, age time.Duration) UserService {
	service := &userServiceImpl{apihubClient: apihubClient, instance: libcache.LRU.New(nSize), ctx: secctx.MakeSysadminContext(context.Background())}
	service.instance.SetTTL(age) // set age
	// register expiration callback
	service.instance.RegisterOnExpired(func(key, _ interface{}) {
		service.instance.Delete(key)
	})
	// don't fall when apihubClient is nil
	if service.apihubClient == nil {
		log.Errorf(errGeneric, ErrBadClient)
	}
	// don't fall if context is nil
	if service.ctx == nil {
		log.Errorf(errGeneric, ErrBadContext)
	}
	return service
}

// GetApihubUser is the only interface to the cache
func (uc userServiceImpl) GetApihubUser(userId string) (view.User, error) {
	// acquire user from cache
	viewUser, exists := uc.instance.Load(userId)
	if exists {
		return viewUser.(view.User), nil
	}
	// get user from API hub
	rUser, err := uc.apihubClient.GetUserById(uc.ctx, userId)
	// API hub reports error?
	if err != nil {
		log.Errorf("get user from apihub has been failed for id=%v with err %s", userId, err)
		return view.User{Id: userId}, err
	}
	// it is possible to receive (nil, nil) from GetUserById
	if rUser != nil {
		uc.instance.Store(rUser.Id, *rUser) // store returned users
		return *rUser, nil
	}
	rUser = &view.User{Id: userId}
	uc.instance.Store(rUser.Id, *rUser) // store empty users
	return *rUser, nil
}
