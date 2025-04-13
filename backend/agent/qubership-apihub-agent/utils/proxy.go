package utils

import "strings"

const ProxyPath = "/agents/{agentId}/namespaces/{name}/services/{serviceId}/proxy/"

func MakeCustomProxyPath(agentId string, namespace string, serviceId string) string {
	customPath := strings.ReplaceAll(ProxyPath, "{agentId}", agentId)
	customPath = strings.ReplaceAll(customPath, "{name}", namespace)
	customPath = strings.ReplaceAll(customPath, "{serviceId}", serviceId)
	return customPath
}
