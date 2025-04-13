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
	"strconv"

	"github.com/Netcracker/qubership-apihub-agent/view"
)

type SystemInfoService interface {
	GetSystemInfo() *view.SystemInfo
	GetBackendVersion() string
}

func NewSystemInfoService() (SystemInfoService, error) {
	return &systemInfoServiceImpl{
		systemInfo: view.SystemInfo{
			BackendVersion: getBackendVersion(),
			InsecureProxy:  insecureProxyEnabled()}}, nil
}

type systemInfoServiceImpl struct {
	systemInfo view.SystemInfo
}

func (g systemInfoServiceImpl) GetBackendVersion() string {
	return g.systemInfo.BackendVersion
}
func insecureProxyEnabled() bool {
	envVal := os.Getenv("INSECURE_PROXY")
	if envVal == "" {
		return false
	}
	insecureProxy, err := strconv.ParseBool(envVal)
	if err != nil {
		return false
	}
	return insecureProxy
}

func getBackendVersion() string {
	version := os.Getenv("ARTIFACT_DESCRIPTOR_VERSION")
	if version == "" {
		version = "unknown"
	}
	return version
}
func (g systemInfoServiceImpl) GetSystemInfo() *view.SystemInfo {
	return &g.systemInfo
}
