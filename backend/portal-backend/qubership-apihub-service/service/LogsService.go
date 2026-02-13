package service

import (
	"fmt"
	"strings"

	log "github.com/sirupsen/logrus"
)

type LogsService interface {
	StoreLogs(obj map[string]interface{})
}

func NewLogsService() LogsService {
	return &logsServiceImpl{}
}

type logsServiceImpl struct {
}

func (l logsServiceImpl) StoreLogs(obj map[string]interface{}) {
	fields := make([]string, 0)
	for key, value := range obj {
		fields = append(fields, fmt.Sprintf("%v: %v", key, value))
	}
	log.Infof("logs received: " + strings.Join(fields, ", "))
}
