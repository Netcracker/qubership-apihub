package view

type StartValidationRequest struct {
	Version       string      `json:"version"`
	DescriptorUrl *string     `json:"descriptorUrl"`
	Descriptor    *Descriptor `json:"descriptor"`
}

type Descriptor struct {
	Services []Service `json:"services"`
}

type Service struct {
	ServiceName string `json:"service_name"`
}

type StartValidationResponse struct {
	ValidationId string `json:"validationId"`
}

type ValidationReport struct {
	Status          string          `json:"status"`
	QualityGateStep int             `json:"qualityGateStep"`
	Service         []ServiceReport `json:"services"`
}

type ServiceReport struct {
	ServiceName        string `json:"serviceName"`
	QualityGateStep    int    `json:"qualityGateStep"`
	ServiceApiURL      string `json:"serviceApiURL"`
	CompareVersionsUrl string `json:"compareVersionsUrl"`
}

const StatusRunning = "running"
const StatusComplete = "complete"
