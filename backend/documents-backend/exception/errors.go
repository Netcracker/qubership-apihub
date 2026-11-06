package exception

import (
	"fmt"
	"strings"
)

// CustomError is the APIHUB error envelope: {"status","code","message","params","debug"}.
type CustomError struct {
	Status  int                    `json:"status"`
	Code    string                 `json:"code,omitempty"`
	Message string                 `json:"message,omitempty"`
	Params  map[string]interface{} `json:"params,omitempty"`
	Debug   string                 `json:"debug,omitempty"`
}

func (c *CustomError) Error() string {
	msg := c.Message
	for k, v := range c.Params {
		msg = strings.ReplaceAll(msg, "$"+k, fmt.Sprintf("%v", v))
	}
	if c.Debug != "" {
		return msg + " | " + c.Debug
	}
	return msg
}
