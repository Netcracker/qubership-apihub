package view

// SimplePackage is the subset of portal-backend's package representation this service reads. A library's
// parentPackageId points at one of these.
type SimplePackage struct {
	Id              string   `json:"packageId"`
	Alias           string   `json:"alias"`
	ParentId        string   `json:"parentId"`
	Kind            string   `json:"kind"`
	Name            string   `json:"name"`
	Description     string   `json:"description"`
	DefaultRole     string   `json:"defaultRole"`
	UserPermissions []string `json:"permissions"`
}
