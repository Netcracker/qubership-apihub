package utils

import (
	"fmt"
	"reflect"
	"unicode"

	log "github.com/sirupsen/logrus"
)

// PrintConfig logs the effective configuration, masking fields tagged `sensitive`.
func PrintConfig(config interface{}) {
	log.Info("Loaded configuration:")
	printStruct("", reflect.ValueOf(config))
}

func printStruct(prefix string, v reflect.Value) {
	if v.Kind() == reflect.Ptr {
		if v.IsNil() {
			return
		}
		v = v.Elem()
	}
	if v.Kind() != reflect.Struct {
		return
	}
	t := v.Type()
	for i := 0; i < v.NumField(); i++ {
		field := t.Field(i)
		if field.PkgPath != "" {
			continue
		}
		value := v.Field(i)
		runes := []rune(field.Name)
		runes[0] = unicode.ToLower(runes[0])
		key := string(runes)
		if prefix != "" {
			key = prefix + "." + key
		}
		_, sensitive := field.Tag.Lookup("sensitive")
		if value.Kind() == reflect.Struct {
			printStruct(key, value)
			continue
		}
		if sensitive && !value.IsZero() {
			log.Infof("%s=*****", key)
			continue
		}
		log.Infof("%s=%s", key, fmt.Sprintf("%v", value.Interface()))
	}
}
