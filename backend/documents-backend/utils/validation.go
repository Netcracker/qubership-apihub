package utils

import (
	"fmt"
	"strings"

	"github.com/go-playground/validator/v10"
)

var validate = validator.New()

// ValidateConfig reports every failed `validate` tag of a configuration struct in one error.
func ValidateConfig(object interface{}) error {
	err := validate.Struct(object)
	if err == nil {
		return nil
	}
	validationErrors, ok := err.(validator.ValidationErrors)
	if !ok {
		return err
	}
	messages := make([]string, 0, len(validationErrors))
	for _, e := range validationErrors {
		messages = append(messages, fmt.Sprintf("field '%s' failed on validation '%s'", e.StructNamespace(), e.Tag()))
	}
	return fmt.Errorf("configuration validation failed:\n\t- %s", strings.Join(messages, "\n\t- "))
}
