package utils

func SliceContains(slice []string, val string) bool {
	for _, v := range slice {
		if v == val {
			return true
		}
	}
	return false
}

func UniqueSet(slice []string) []string {
	set := map[string]bool{}
	for _, v := range slice {
		set[v] = true
	}
	result := []string{}
	for key := range set {
		result = append(result, key)
	}
	return result
}
