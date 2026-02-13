package view

type AgentKeepaliveMessage struct {
	AgentDeploymentCloud     string `json:"cloud"`
	AgentDeploymentNamespace string `json:"namespace"`
	AgentUrl                 string `json:"url"`
	BackendVersion           string `json:"backendVersion"`
	AgentName                string `json:"name"`
	AgentVersion             string `json:"agentVersion"`
}
