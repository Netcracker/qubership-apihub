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

package main

import (
	"os"
	"strconv"
	"strings"
	"time"

	log "github.com/sirupsen/logrus"
)

type AgentConfig struct {
	ApihubUrl        string
	AgentUrl         string
	AccessToken      string
	DiscoveryConfig  string
	CloudName        string
	AgentNamespace   string
	ExcludeLabels    []string
	GroupingLabels   []string
	AgentName        string
	DiscoveryTimeout time.Duration
}

/*
add to DiscoveryConfig
{
"customSwaggerConfigUrls": ["string"],
"customSwaggerUrls": ["string"]
}
*/
func loadAgentConfig() AgentConfig {
	result := AgentConfig{}

	result.ApihubUrl = os.Getenv("APIHUB_URL")
	if result.ApihubUrl == "" {
		result.ApihubUrl = "https://qubership.localhost"
	}

	result.AgentUrl = os.Getenv("AGENT_URL")

	result.AccessToken = os.Getenv("APIHUB_ACCESS_TOKEN")

	result.DiscoveryConfig = os.Getenv("DISCOVERY_CONFIG")

	result.CloudName = os.Getenv("CLOUD_NAME")
	if result.CloudName == "" {
		result.CloudName = "unknown"
	}

	result.AgentNamespace = os.Getenv("NAMESPACE")
	if result.AgentNamespace == "" {
		result.AgentNamespace = "unknown"
	}

	excludeLablesStr := os.Getenv("DISCOVERY_EXCLUDE_LABELS")
	if excludeLablesStr != "" {
		labels := strings.Split(excludeLablesStr, ",")
		var cleanedExcludeLabels []string
		for _, label := range labels {
			cleanedLabel := strings.TrimSpace(label)
			if cleanedLabel != "" {
				cleanedExcludeLabels = append(cleanedExcludeLabels, cleanedLabel)
			}
		}
		result.ExcludeLabels = cleanedExcludeLabels
	}

	groupingLablesStr := os.Getenv("DISCOVERY_GROUPING_LABELS")
	if groupingLablesStr != "" {
		labels := strings.Split(groupingLablesStr, ",")
		var cleanedGroupingLabels []string
		for _, label := range labels {
			cleanedLabel := strings.TrimSpace(label)
			if cleanedLabel != "" {
				cleanedGroupingLabels = append(cleanedGroupingLabels, cleanedLabel)
			}
		}
		result.GroupingLabels = cleanedGroupingLabels
	}

	result.AgentName = os.Getenv("AGENT_NAME")

	discoveryTimeoutSecStr := os.Getenv("DISCOVERY_TIMEOUT_SEC")
	if discoveryTimeoutSecStr == "" {
		result.DiscoveryTimeout = time.Second * 15
	} else {
		discoveryTimeoutSec, err := strconv.ParseInt(discoveryTimeoutSecStr, 10, 64)
		if err != nil {
			log.Errorf("Failed to parse DISCOVERY_TIMEOUT_SEC value = '%s' with err = '%s', using default = %ds", discoveryTimeoutSecStr, err, 15)
		} else {
			result.DiscoveryTimeout = time.Second * time.Duration(discoveryTimeoutSec)
		}
	}

	return result
}
