package utils

import "fmt"

type JsonMap map[string]interface{}

func (j JsonMap) GetValueAsString(key string) string {
	if _, isObj := j[key].(map[string]interface{}); isObj {
		return ""
	}
	if _, isArr := j[key].([]interface{}); isArr {
		return ""
	}
	if val, ok := j[key]; ok {
		return fmt.Sprint(val)
	}

	return ""
}

func (j JsonMap) GetObject(key string) JsonMap {
	if obj, isObj := j[key].(map[string]interface{}); isObj {
		return obj
	}
	return JsonMap{}
}

func (j JsonMap) GetObjectsArray(key string) []JsonMap {
	if array, ok := j[key].([]interface{}); ok {
		objectsArray := make([]JsonMap, 0)
		for _, el := range array {
			if obj, ok := el.(map[string]interface{}); ok {
				objectsArray = append(objectsArray, obj)
			}
		}
		return objectsArray
	}
	return []JsonMap{}
}

func (j JsonMap) GetKeys() []string {
	keys := make([]string, 0)
	for key := range j {
		keys = append(keys, key)
	}
	return keys
}

func (j JsonMap) Contains(key string) bool {
	if _, ok := j[key]; ok {
		return true
	}
	return false
}
