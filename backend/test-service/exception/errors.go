package exception

import (
	"fmt"
	"strings"
)

type CustomError struct {
	Status  int                    `json:"status"`
	Code    string                 `json:"code,omitempty"`
	Message string                 `json:"message,omitempty"`
	Params  map[string]interface{} `json:"params,omitempty"`
	Debug   string                 `json:"debug,omitempty"`
}

func (c CustomError) Error() string {
	msg := c.Message
	for k, v := range c.Params {
		//todo make smart replace (e.g. now it replaces $projectId if we have $project in params)
		msg = strings.ReplaceAll(msg, "$"+k, fmt.Sprintf("%v", v))
	}
	return msg
}
