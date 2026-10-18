package utils

import "strings"

func GetPackageWorkspaceId(packageId string) string {
	return strings.SplitN(packageId, ".", 2)[0]
}

func GetPackageHierarchy(packageId string) []string {
	packageIds := GetParentPackageIds(packageId)
	packageIds = append(packageIds, packageId)
	return packageIds
}

func GetParentPackageIds(packageId string) []string {
	parts := strings.Split(packageId, ".")
	packageIds := make([]string, 0)
	if len(parts) == 0 || len(parts) == 1 {
		return packageIds
	}
	for i, part := range parts {
		if i == 0 {
			packageIds = append(packageIds, part)
			continue
		}
		if i == (len(parts) - 1) {
			break
		}
		packageIds = append(packageIds, packageIds[i-1]+"."+part)
	}
	return packageIds
}
