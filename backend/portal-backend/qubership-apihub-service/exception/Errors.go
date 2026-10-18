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
	if c.Debug != "" {
		return msg + " | " + c.Debug
	} else {
		return msg
	}
}

// todo replace with CustomError
type NotFoundError struct {
	Id      string
	Name    string
	Message string
}

func (g NotFoundError) Error() string {
	if g.Message != "" {
		return g.Message
	}
	if g.Id != "" {
		return fmt.Sprintf("entity with id = %s not found", g.Id)
	} else {
		return fmt.Sprintf("entity with name = %s not found", g.Name)
	}
}

// todo replace with CustomError
type ContentNotFoundError struct {
	ContentId string
	Slug      string
}

func (c ContentNotFoundError) Error() string {
	if c.ContentId != "" {
		return fmt.Sprintf("content with contentId = %v not found", c.ContentId)
	} else {
		return fmt.Sprintf("content with slug = %v not found", c.Slug)
	}
}
