package utils

import (
	log "github.com/sirupsen/logrus"
	"runtime/debug"
)

type noPanicFunc func()

func (f noPanicFunc) run() {
	defer internalRecover()
	f()
}

func SafeAsync(function noPanicFunc) {
	go function.run()
}

func internalRecover() {
	if err := recover(); err != nil {
		log.Errorf("Request failed with panic: %v", err)
		log.Tracef("Stacktrace: %v", string(debug.Stack()))
		debug.PrintStack()
		return
	}
}
