package view

type SystemInfo struct {
	BackendVersion string `json:"backendVersion"`
	InsecureProxy  bool   `json:"-"`
}
