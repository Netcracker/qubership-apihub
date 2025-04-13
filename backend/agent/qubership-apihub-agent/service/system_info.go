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
