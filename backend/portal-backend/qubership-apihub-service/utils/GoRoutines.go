package utils

import (
	"errors"
	log "github.com/sirupsen/logrus"
	"runtime/debug"
)

type noPanicFunc func()
type noPanicFuncWErr func() error

func (f noPanicFunc) run() {
	defer internalRecover()
	f()
}

func (f noPanicFuncWErr) run() error {
	var err error
	defer func() {
		recoverErr := recoverToErr()
		if recoverErr != nil {
			err = recoverErr
		}
	}()
	err = f()
	return err
}

func SafeAsync(function noPanicFunc) {
	go function.run()
}

func SafeSync(function noPanicFuncWErr) error {
	return function.run()
}

func internalRecover() {
	if err := recover(); err != nil {
		log.Errorf("Request failed with panic: %v", err)
		log.Tracef("Stacktrace: %v", string(debug.Stack()))
		debug.PrintStack()
		return
	}
}

func recoverToErr() error {
	if e := recover(); e != nil {
		log.Errorf("Request failed with panic: %v", e)
		log.Tracef("Stacktrace: %v", string(debug.Stack()))
		debug.PrintStack()
		switch x := e.(type) {
		case string:
			return errors.New(x)
		case error:
			return x
		default:
			return errors.New("unknown panic error type")
		}
	}
	return nil
}
