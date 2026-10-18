package service

import (
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/robfig/cron/v3"
	log "github.com/sirupsen/logrus"
)

type MetricsService interface {
	CreateJob(schedule string) error
}

func NewMetricsService(metricsRepository repository.MetricsRepository) MetricsService {
	return &metricsServiceImpl{
		metricsRepository: metricsRepository,
		cron:              cron.New(cron.WithLocation(time.UTC)),
	}
}

type metricsServiceImpl struct {
	metricsRepository repository.MetricsRepository
	cron              *cron.Cron
}

func (c *metricsServiceImpl) CreateJob(schedule string) error {
	job := cron.NewChain(cron.SkipIfStillRunning(cron.DefaultLogger)).Then(&metricsGetterJob{
		metricsRepository: c.metricsRepository,
	})
	if _, err := c.cron.AddJob(schedule, job); err != nil {
		log.Warnf("[Metrics service] Job wasn't added for schedule - %s. With error - %s", schedule, err)
		return err
	}
	c.cron.Start()
	log.Infof("[Metrics service] Job was created with schedule - %s", schedule)
	return nil
}

type metricsGetterJob struct {
	metricsRepository repository.MetricsRepository
}

func (j *metricsGetterJob) Run() {
	if err := j.metricsRepository.StartGetMetricsProcess(); err != nil {
		log.Errorf("[MetricsGetterJob-Run] err - %s", err.Error())
	}
}
