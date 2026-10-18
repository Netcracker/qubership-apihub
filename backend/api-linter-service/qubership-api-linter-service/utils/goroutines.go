package utils

import (
	"runtime/debug"

	log "github.com/sirupsen/logrus"
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

/////////////

type Semaphore struct {
	C chan struct{}
}

func (s *Semaphore) Acquire() {
	s.C <- struct{}{}
}

func (s *Semaphore) Release() {
	<-s.C
}

func NewSemaphore(count int) *Semaphore {
	return &Semaphore{
		C: make(chan struct{}, count),
	}
}
