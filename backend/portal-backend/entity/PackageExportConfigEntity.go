package entity

type PackageExportConfigEntity struct {
	tableName struct{} `pg:"package_export_config"`

	PackageId            string   `pg:"package_id, type:varchar"`
	AllowedOasExtensions []string `pg:"allowed_oas_extensions, type:varchar array, array"`
}

type PackageExportConfigExtEntity struct {
	tableName struct{} `pg:"package_export_config, alias:package_export_config"`

	PackageId            string   `pg:"package_id, type:varchar"`
	PackageName          string   `pg:"package_name, type:varchar"`
	PackageKind          string   `pg:"package_kind, type:varchar"`
	AllowedOasExtensions []string `pg:"allowed_oas_extensions, type:varchar array, array"`
}
