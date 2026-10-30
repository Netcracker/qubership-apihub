package view

type NamespacesListResponse struct {
	Namespaces []string `json:"namespaces"`
	CloudName  string   `json:"cloudName"`
}
