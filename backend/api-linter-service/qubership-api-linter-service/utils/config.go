package utils

import (
	"fmt"
	"reflect"
	"strings"
	"unicode"

	"github.com/Netcracker/qubership-api-linter-service/config"
	"github.com/go-playground/validator/v10"
	log "github.com/sirupsen/logrus"
)

var v *validator.Validate

func getValidator() *validator.Validate {
	if v == nil {
		v = validator.New()
		v.RegisterStructValidation(validateAILinterConfig, config.AILinterConfig{})
	}
	return v
}

func validateAILinterConfig(sl validator.StructLevel) {
	ai := sl.Current().Interface().(config.AILinterConfig)
	if ai.Enabled && ai.OpenAI.APIKey == "" {
		sl.ReportError(ai.OpenAI.APIKey, "OpenAI.APIKey", "APIKey", "required_if_enabled", "")
	}
}

func ValidateConfig(object interface{}) error {
	err := getValidator().Struct(object)
	if err == nil {
		return nil
	}

	validationErrors, ok := err.(validator.ValidationErrors)
	if !ok {
		return err
	}

	errorMessages := make([]string, 0)
	for _, e := range validationErrors {
		errorMessages = append(errorMessages, fmt.Sprintf("field '%s' failed on validation '%s'", e.StructNamespace(), e.Tag()))
	}

	if len(errorMessages) > 0 {
		return fmt.Errorf("configuration validation failed:\n\t- %s", strings.Join(errorMessages, "\n\t- "))
	}

	return nil
}

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
		if len(runes) > 0 {
			runes[0] = unicode.ToLower(runes[0])
		}
		fieldName := string(runes)

		key := fieldName
		if prefix != "" {
			key = prefix + "." + fieldName
		}

		_, isSensitive := field.Tag.Lookup("sensitive")

		if value.Kind() == reflect.Ptr {
			if value.IsNil() {
				log.Infof("%s=<nil>", key)
				continue
			}
			value = value.Elem()
		}

		switch value.Kind() {
		case reflect.Struct:
			printStruct(key, value)
		case reflect.Slice:
			if value.Type().Elem().Kind() == reflect.Struct && value.Len() > 0 {
				for j := 0; j < value.Len(); j++ {
					printStruct(fmt.Sprintf("%s[%d]", key, j), value.Index(j))
				}
			} else {
				printValue(key, value, isSensitive)
			}
		default:
			printValue(key, value, isSensitive)
		}
	}
}

func printValue(key string, value reflect.Value, isSensitive bool) {
	var valStr string
	if isSensitive && !isValueEmpty(value) {
		valStr = "*****"
	} else if value.IsValid() && value.CanInterface() {
		valStr = fmt.Sprintf("%v", value.Interface())
	}
	log.Infof("%s=%s", key, valStr)
}

func isValueEmpty(v reflect.Value) bool {
	if !v.IsValid() {
		return true
	}
	switch v.Kind() {
	case reflect.Array, reflect.Map, reflect.Slice, reflect.String:
		return v.Len() == 0
	case reflect.Interface, reflect.Ptr:
		return v.IsNil()
	default:
		return v.IsZero()
	}
}
