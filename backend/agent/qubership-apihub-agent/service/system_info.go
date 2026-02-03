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
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-agent/view"
	log "github.com/sirupsen/logrus"
)

var slugPattern = regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)

type SystemInfoService interface {
	GetSystemInfo() *view.SystemInfo
	GetBackendVersion() string
	GetApihubUrl() string
	GetAgentUrl() string
	GetAccessToken() string
	GetDiscoveryConfig() string
	GetCloudName() string
	GetAgentNamespace() string
	GetExcludeLabels() []string
	GetGroupingLabels() []string
	GetAgentName() string
	GetDiscoveryTimeout() time.Duration
	GetNamespacesCacheTTL() time.Duration
	GetServicesCacheTTL() time.Duration
}

func NewSystemInfoService() (SystemInfoService, error) {
	cloudName, err := getCloudName()
	if err != nil {
		return nil, fmt.Errorf("invalid CLOUD_NAME: %w", err)
	}

	agentNamespace, err := getAgentNamespace()
	if err != nil {
		return nil, fmt.Errorf("invalid NAMESPACE: %w", err)
	}

	agentName, err := getAgentName()
	if err != nil {
		return nil, fmt.Errorf("invalid AGENT_NAME: %w", err)
	}

	systemInfo := view.SystemInfo{
		BackendVersion:   getBackendVersion(),
		InsecureProxy:    getInsecureProxy(),
		ApihubUrl:        getApihubUrl(),
		AgentUrl:         getAgentUrl(),
		AccessToken:      getAccessToken(),
		DiscoveryConfig:  getDiscoveryConfig(),
		CloudName:        cloudName,
		AgentNamespace:   agentNamespace,
		ExcludeLabels:    getExcludeLabels(),
		GroupingLabels:   getGroupingLabels(),
		AgentName:        agentName,
		DiscoveryTimeout:   getDiscoveryTimeout(),
		NamespacesCacheTTL: getNamespacesCacheTTL(),
		ServicesCacheTTL:   getServicesCacheTTL(),
	}
	return &systemInfoServiceImpl{
		systemInfo: systemInfo}, nil
}

type systemInfoServiceImpl struct {
	systemInfo view.SystemInfo
}

func (g systemInfoServiceImpl) GetSystemInfo() *view.SystemInfo {
	return &g.systemInfo
}

func (g systemInfoServiceImpl) GetBackendVersion() string {
	return g.systemInfo.BackendVersion
}

func (g systemInfoServiceImpl) GetApihubUrl() string {
	return g.systemInfo.ApihubUrl
}

func (g systemInfoServiceImpl) GetAgentUrl() string {
	return g.systemInfo.AgentUrl
}

func (g systemInfoServiceImpl) GetAccessToken() string {
	return g.systemInfo.AccessToken
}

func (g systemInfoServiceImpl) GetDiscoveryConfig() string {
	return g.systemInfo.DiscoveryConfig
}

func (g systemInfoServiceImpl) GetCloudName() string {
	return g.systemInfo.CloudName
}

func (g systemInfoServiceImpl) GetAgentNamespace() string {
	return g.systemInfo.AgentNamespace
}

func (g systemInfoServiceImpl) GetExcludeLabels() []string {
	return g.systemInfo.ExcludeLabels
}

func (g systemInfoServiceImpl) GetGroupingLabels() []string {
	return g.systemInfo.GroupingLabels
}

func (g systemInfoServiceImpl) GetAgentName() string {
	return g.systemInfo.AgentName
}

func (g systemInfoServiceImpl) GetDiscoveryTimeout() time.Duration {
	return g.systemInfo.DiscoveryTimeout
}

func (g systemInfoServiceImpl) GetNamespacesCacheTTL() time.Duration {
	return g.systemInfo.NamespacesCacheTTL
}

func (g systemInfoServiceImpl) GetServicesCacheTTL() time.Duration {
	return g.systemInfo.ServicesCacheTTL
}

func getInsecureProxy() bool {
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

func getApihubUrl() string {
	apihubUrl := os.Getenv("APIHUB_URL")
	if apihubUrl == "" {
		apihubUrl = "https://qubership.localhost"
	}
	return apihubUrl
}

func getAgentUrl() string {
	return os.Getenv("AGENT_URL")
}

func getAccessToken() string {
	return os.Getenv("APIHUB_ACCESS_TOKEN")
}

func getDiscoveryConfig() string {
	return os.Getenv("DISCOVERY_CONFIG")
}

func getCloudName() (string, error) {
	cloudName := os.Getenv("CLOUD_NAME")
	if cloudName == "" {
		cloudName = "unknown"
	}
	if err := validateSlugOnlyCharacters(cloudName); err != nil {
		return "", err
	}
	return cloudName, nil
}

func getAgentNamespace() (string, error) {
	agentNamespace := os.Getenv("NAMESPACE")
	if agentNamespace == "" {
		agentNamespace = "unknown"
	}
	if err := validateSlugOnlyCharacters(agentNamespace); err != nil {
		return "", err
	}
	return agentNamespace, nil
}

func getExcludeLabels() []string {
	excludeLablesStr := os.Getenv("DISCOVERY_EXCLUDE_LABELS")
	if excludeLablesStr == "" {
		return []string{}
	}
	labels := strings.Split(excludeLablesStr, ",")
	var cleanedExcludeLabels []string
	for _, label := range labels {
		cleanedLabel := strings.TrimSpace(label)
		if cleanedLabel != "" {
			cleanedExcludeLabels = append(cleanedExcludeLabels, cleanedLabel)
		}
	}
	return cleanedExcludeLabels
}

func getGroupingLabels() []string {
	groupingLablesStr := os.Getenv("DISCOVERY_GROUPING_LABELS")
	if groupingLablesStr == "" {
		return []string{}
	}
	labels := strings.Split(groupingLablesStr, ",")
	var cleanedGroupingLabels []string
	for _, label := range labels {
		cleanedLabel := strings.TrimSpace(label)
		if cleanedLabel != "" {
			cleanedGroupingLabels = append(cleanedGroupingLabels, cleanedLabel)
		}
	}
	return cleanedGroupingLabels
}

func getAgentName() (string, error) {
	agentName := os.Getenv("AGENT_NAME")
	if agentName != "" {
		if err := validateSlugOnlyCharacters(agentName); err != nil {
			return "", err
		}
	}
	return agentName, nil
}

func getDiscoveryTimeout() time.Duration {
	discoveryTimeoutSecStr := os.Getenv("DISCOVERY_TIMEOUT_SEC")
	if discoveryTimeoutSecStr == "" {
		return time.Second * 15
	}
	discoveryTimeoutSec, err := strconv.ParseInt(discoveryTimeoutSecStr, 10, 64)
	if err != nil {
		log.Errorf("Failed to parse DISCOVERY_TIMEOUT_SEC value = '%s' with err = '%s', using default = %ds", discoveryTimeoutSecStr, err, 15)
		return time.Second * 15
	}
	return time.Second * time.Duration(discoveryTimeoutSec)
}

func getNamespacesCacheTTL() time.Duration {
	ttlMinStr := os.Getenv("NAMESPACES_CACHE_TTL_MIN")
	if ttlMinStr == "" {
		return time.Minute * 1440
	}
	ttlMin, err := strconv.ParseInt(ttlMinStr, 10, 64)
	if err != nil {
		log.Errorf("Failed to parse NAMESPACES_CACHE_TTL_MIN value = '%s' with err = '%s', using default = %dm", ttlMinStr, err, 1440)
		return time.Minute * 1440
	}
	return time.Minute * time.Duration(ttlMin)
}

func getServicesCacheTTL() time.Duration {
	ttlMinStr := os.Getenv("SERVICES_CACHE_TTL_MIN")
	if ttlMinStr == "" {
		return time.Minute * 480
	}
	ttlMin, err := strconv.ParseInt(ttlMinStr, 10, 64)
	if err != nil {
		log.Errorf("Failed to parse SERVICES_CACHE_TTL_MIN value = '%s' with err = '%s', using default = %dm", ttlMinStr, err, 480)
		return time.Minute * 480
	}
	return time.Minute * time.Duration(ttlMin)
}

func validateSlugOnlyCharacters(value string) error {
	if value == "" {
		return fmt.Errorf("value cannot be empty")
	}
	if !slugPattern.MatchString(value) {
		return fmt.Errorf("value '%s' contains invalid characters. Can only contain letters, numbers, hyphens and underscores", value)
	}
	return nil
}
