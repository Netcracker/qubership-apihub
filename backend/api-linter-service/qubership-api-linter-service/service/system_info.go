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
	"fmt"
	"github.com/Netcracker/qubership-api-linter-service/view"
	"os"
	"strconv"

	log "github.com/sirupsen/logrus"
)

const (
	BASE_PATH = "BASE_PATH"

	LINTER_POSTGRESQL_HOST     = "LINTER_POSTGRESQL_HOST"
	LINTER_POSTGRESQL_PORT     = "LINTER_POSTGRESQL_PORT"
	LINTER_POSTGRESQL_DB_NAME  = "LINTER_POSTGRESQL_DB_NAME"
	LINTER_POSTGRESQL_USERNAME = "LINTER_POSTGRESQL_USERNAME"
	LINTER_POSTGRESQL_PASSWORD = "LINTER_POSTGRESQL_PASSWORD"
	LINTER_PG_SSL_MODE         = "LINTER_PG_SSL_MODE"

	APIHUB_URL          = "APIHUB_URL"
	APIHUB_ACCESS_TOKEN = "APIHUB_ACCESS_TOKEN"

	LISTEN_ADDRESS = "LISTEN_ADDRESS"
	ORIGIN_ALLOWED = "ORIGIN_ALLOWED"
	LOG_LEVEL      = "LOG_LEVEL"

	SPECTRAL_BIN_PATH = "SPECTRAL_BIN_PATH"

	OLRIC_DISCOVERY_MODE = "OLRIC_DISCOVERY_MODE"
	OLRIC_REPLICA_COUNT  = "OLRIC_REPLICA_COUNT"
	NAMESPACE            = "NAMESPACE"
)

type SystemInfoService interface {
	Init() error

	GetBasePath() string
	GetPGHost() string
	GetPGPort() int
	GetPGDB() string
	GetPGUser() string
	GetPGPassword() string
	GetPGSSLMode() string
	GetCredsFromEnv() *view.DbCredentials

	GetAPIHubUrl() string
	GetApihubAccessToken() string

	GetListenAddress() string
	GetOriginAllowed() string
	GetLogLevel() string

	GetSpectralBinPath() string

	GetOlricDiscoveryMode() string
	GetReplicaCount() int
	GetNamespace() string
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

func (s systemInfoServiceImpl) Init() error {
	s.setBasePath()

	s.setPGHost()
	if err := s.setPGPort(); err != nil {
		return err
	}
	s.setPGDB()
	s.setPGUser()
	s.setPGPassword()
	s.setPGSSLMode()
	s.setAPIHubUrl()
	s.setApihubAccessToken()

	s.setListenAddress()
	s.setOriginAllowed()
	s.setLogLevel()
	if err := s.setSpectralBinPath(); err != nil {
		return err
	}

	s.setOlricDiscoveryMode()
	s.setReplicaCount()
	s.setNamespace()

	return nil
}

func (s systemInfoServiceImpl) GetBasePath() string {
	return s.systemInfoMap[BASE_PATH].(string)
}

func (s systemInfoServiceImpl) setBasePath() {
	s.systemInfoMap[BASE_PATH] = os.Getenv(BASE_PATH)
	if s.systemInfoMap[BASE_PATH] == "" {
		s.systemInfoMap[BASE_PATH] = "."
	}
}
func (s systemInfoServiceImpl) GetCredsFromEnv() *view.DbCredentials {
	return &view.DbCredentials{
		Host:     s.GetPGHost(),
		Port:     s.GetPGPort(),
		Database: s.GetPGDB(),
		Username: s.GetPGUser(),
		Password: s.GetPGPassword(),
		SSLMode:  s.GetPGSSLMode(),
	}
}

func (s systemInfoServiceImpl) setPGHost() {
	host := os.Getenv(LINTER_POSTGRESQL_HOST)
	if host == "" {
		host = "localhost"
	}
	s.systemInfoMap[LINTER_POSTGRESQL_HOST] = host
}

func (s systemInfoServiceImpl) GetPGHost() string {
	return s.systemInfoMap[LINTER_POSTGRESQL_HOST].(string)
}

func (s systemInfoServiceImpl) setPGPort() error {
	portStr := os.Getenv(LINTER_POSTGRESQL_PORT)
	var port int
	var err error
	if portStr == "" {
		port = 5432
	} else {
		port, err = strconv.Atoi(portStr)
		if err != nil {
			return fmt.Errorf("failed to parse %v env value: %v", LINTER_POSTGRESQL_PORT, err.Error())
		}
	}
	s.systemInfoMap[LINTER_POSTGRESQL_PORT] = port
	return nil
}

func (s systemInfoServiceImpl) GetPGPort() int {
	return s.systemInfoMap[LINTER_POSTGRESQL_PORT].(int)
}

func (s systemInfoServiceImpl) setPGDB() {
	database := os.Getenv(LINTER_POSTGRESQL_DB_NAME)
	if database == "" {
		database = "apihub_linter"
	}
	s.systemInfoMap[LINTER_POSTGRESQL_DB_NAME] = database
}

func (s systemInfoServiceImpl) GetPGDB() string {
	return s.systemInfoMap[LINTER_POSTGRESQL_DB_NAME].(string)
}

func (s systemInfoServiceImpl) setPGUser() {
	user := os.Getenv(LINTER_POSTGRESQL_USERNAME)
	if user == "" {
		user = "apihub_linter"
	}
	s.systemInfoMap[LINTER_POSTGRESQL_USERNAME] = user
}

func (s systemInfoServiceImpl) GetPGUser() string {
	return s.systemInfoMap[LINTER_POSTGRESQL_USERNAME].(string)
}

func (s systemInfoServiceImpl) setPGPassword() {
	s.systemInfoMap[LINTER_POSTGRESQL_PASSWORD] = os.Getenv(LINTER_POSTGRESQL_PASSWORD)
}

func (s systemInfoServiceImpl) GetPGPassword() string {
	return s.systemInfoMap[LINTER_POSTGRESQL_PASSWORD].(string)
}

func (s systemInfoServiceImpl) setPGSSLMode() {
	sslMode := os.Getenv(LINTER_PG_SSL_MODE)
	if sslMode == "" {
		sslMode = "disable"
	}
	s.systemInfoMap[LINTER_PG_SSL_MODE] = sslMode
}

func (s systemInfoServiceImpl) GetPGSSLMode() string {
	return s.systemInfoMap[LINTER_PG_SSL_MODE].(string)
}

func (s systemInfoServiceImpl) setAPIHubUrl() {
	s.systemInfoMap[APIHUB_URL] = os.Getenv(APIHUB_URL)
	if s.systemInfoMap[APIHUB_URL] == "" {
		s.systemInfoMap[APIHUB_URL] = "http://localhost:8090"
	}
}

func (s systemInfoServiceImpl) GetAPIHubUrl() string {
	return s.systemInfoMap[APIHUB_URL].(string)
}

func (s systemInfoServiceImpl) setApihubAccessToken() {
	s.systemInfoMap[APIHUB_ACCESS_TOKEN] = os.Getenv(APIHUB_ACCESS_TOKEN)
}

func (s systemInfoServiceImpl) GetApihubAccessToken() string {
	return s.systemInfoMap[APIHUB_ACCESS_TOKEN].(string)
}

func (s systemInfoServiceImpl) setListenAddress() {
	listenAddr := os.Getenv(LISTEN_ADDRESS)
	if listenAddr == "" {
		listenAddr = ":8080"
	}
	s.systemInfoMap[LISTEN_ADDRESS] = listenAddr
}

func (s systemInfoServiceImpl) GetListenAddress() string {
	return s.systemInfoMap[LISTEN_ADDRESS].(string)
}

func (s systemInfoServiceImpl) setOriginAllowed() {
	s.systemInfoMap[ORIGIN_ALLOWED] = os.Getenv(ORIGIN_ALLOWED)
}

func (s systemInfoServiceImpl) GetOriginAllowed() string {
	return s.systemInfoMap[ORIGIN_ALLOWED].(string)
}

func (s systemInfoServiceImpl) setLogLevel() {
	s.systemInfoMap[LOG_LEVEL] = os.Getenv(LOG_LEVEL)
}

func (s systemInfoServiceImpl) GetLogLevel() string {
	return s.systemInfoMap[LOG_LEVEL].(string)
}

func (s systemInfoServiceImpl) setSpectralBinPath() error {
	s.systemInfoMap[SPECTRAL_BIN_PATH] = os.Getenv(SPECTRAL_BIN_PATH)
	if val, _ := s.systemInfoMap[SPECTRAL_BIN_PATH]; val == "" {
		return fmt.Errorf("mandatory env %s is not set", SPECTRAL_BIN_PATH)
	}
	return nil
}

func (s systemInfoServiceImpl) GetSpectralBinPath() string {
	return s.systemInfoMap[SPECTRAL_BIN_PATH].(string)
}

func (s systemInfoServiceImpl) setOlricDiscoveryMode() {
	s.systemInfoMap[OLRIC_DISCOVERY_MODE] = os.Getenv(OLRIC_DISCOVERY_MODE)
}

func (s systemInfoServiceImpl) GetOlricDiscoveryMode() string {
	return s.systemInfoMap[OLRIC_DISCOVERY_MODE].(string)
}

func (s systemInfoServiceImpl) setReplicaCount() {
	s.systemInfoMap[OLRIC_REPLICA_COUNT] = os.Getenv(OLRIC_REPLICA_COUNT)
}

func (s systemInfoServiceImpl) GetReplicaCount() int {
	replicaCountStr, exists := os.LookupEnv("OLRIC_REPLICA_COUNT")
	if exists {
		rc, err := strconv.Atoi(replicaCountStr)
		if err != nil {
			log.Errorf("Invalid OLRIC_REPLICA_COUNT env value, expecting int. Replica count set to 1.")
			return 1
		}
		return rc
	}
	return 1
}

func (s systemInfoServiceImpl) setNamespace() {
	s.systemInfoMap[NAMESPACE] = os.Getenv(NAMESPACE)
}

func (s systemInfoServiceImpl) GetNamespace() string {
	return s.systemInfoMap[NAMESPACE].(string)
}
