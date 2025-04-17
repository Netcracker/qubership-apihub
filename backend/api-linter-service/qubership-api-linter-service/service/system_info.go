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
	"os"

	log "github.com/sirupsen/logrus"
)

const (
	LISTEN_ADDRESS = "LISTEN_ADDRESS"
	ORIGIN_ALLOWED = "ORIGIN_ALLOWED"
	LOG_LEVEL      = "LOG_LEVEL"
)

type SystemInfoService interface {
	Init() error
	GetListenAddress() string
	GetOriginAllowed() string
	GetLogLevel() string
}

func NewSystemInfoService() (SystemInfoService, error) {
	s := &systemInfoServiceImpl{
		systemInfoMap: make(map[string]interface{})}
	if err := s.Init(); err != nil {
		log.Error("Failed to read system info: " + err.Error())
		return nil, err
	}
	return s, nil
}

type systemInfoServiceImpl struct {
	systemInfoMap map[string]interface{}
}

func (g systemInfoServiceImpl) Init() error {
	g.setListenAddress()
	g.setOriginAllowed()
	g.setLogLevel()

	return nil
}

func (g systemInfoServiceImpl) setListenAddress() {
	listenAddr := os.Getenv(LISTEN_ADDRESS)
	if listenAddr == "" {
		listenAddr = ":8080"
	}
	g.systemInfoMap[LISTEN_ADDRESS] = listenAddr
}

func (g systemInfoServiceImpl) GetListenAddress() string {
	return g.systemInfoMap[LISTEN_ADDRESS].(string)
}

func (g systemInfoServiceImpl) setOriginAllowed() {
	g.systemInfoMap[ORIGIN_ALLOWED] = os.Getenv(ORIGIN_ALLOWED)
}

func (g systemInfoServiceImpl) GetOriginAllowed() string {
	return g.systemInfoMap[ORIGIN_ALLOWED].(string)
}

func (g systemInfoServiceImpl) setLogLevel() {
	g.systemInfoMap[LOG_LEVEL] = os.Getenv(LOG_LEVEL)
}

func (g systemInfoServiceImpl) GetLogLevel() string {
	return g.systemInfoMap[LOG_LEVEL].(string)
}
