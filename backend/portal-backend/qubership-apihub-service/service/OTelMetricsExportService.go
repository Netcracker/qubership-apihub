package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/config"
	"github.com/prometheus/client_golang/prometheus"
	log "github.com/sirupsen/logrus"
	prombridge "go.opentelemetry.io/contrib/bridges/prometheus"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/metric/metricdata"
	"go.opentelemetry.io/otel/sdk/resource"
	semconv "go.opentelemetry.io/otel/semconv/v1.37.0"
)

const (
	oTelServiceName     = "apihub-backend"
	authorizationHeader = "Authorization"
	bearerPrefix        = "Bearer "
)

// OTelMetricsExportService pushes the Prometheus metrics of the given gatherer to an OTLP/HTTP endpoint.
// Shutdown flushes and stops the periodic export; nothing calls it today because the process has no graceful-shutdown path.
type OTelMetricsExportService interface {
	Start(ctx context.Context) error
	Shutdown(ctx context.Context) error
}

func NewOTelMetricsExportService(cfg config.OTelMetricsConfig, gatherer prometheus.Gatherer, instanceId string) OTelMetricsExportService {
	return &oTelMetricsExportServiceImpl{
		cfg:        cfg,
		gatherer:   gatherer,
		instanceId: instanceId,
	}
}

type oTelMetricsExportServiceImpl struct {
	cfg        config.OTelMetricsConfig
	gatherer   prometheus.Gatherer
	instanceId string
	provider   *sdkmetric.MeterProvider
}

func (s *oTelMetricsExportServiceImpl) Start(ctx context.Context) error {
	timeout := time.Duration(s.cfg.TimeoutSec) * time.Second
	interval := time.Duration(s.cfg.ExportIntervalSec) * time.Second

	endpoint := metricsEndpointURL(s.cfg.ServerUrl, s.cfg.MetricsPath)
	exporterOptions := []otlpmetrichttp.Option{
		otlpmetrichttp.WithEndpointURL(endpoint),
		otlpmetrichttp.WithTimeout(timeout),
	}
	if s.cfg.Token != "" {
		exporterOptions = append(exporterOptions, otlpmetrichttp.WithHeaders(map[string]string{
			authorizationHeader: bearerPrefix + s.cfg.Token,
		}))
	}
	otlpExporter, err := otlpmetrichttp.New(ctx, exporterOptions...)
	if err != nil {
		return fmt.Errorf("failed to create OTLP metrics exporter for %s: %w", endpoint, err)
	}
	exporter := &loggingMetricExporter{Exporter: otlpExporter, endpoint: endpoint}

	producer := prombridge.NewMetricProducer(prombridge.WithGatherer(s.gatherer))
	reader := sdkmetric.NewPeriodicReader(exporter,
		sdkmetric.WithProducer(producer),
		sdkmetric.WithInterval(interval),
		sdkmetric.WithTimeout(timeout),
	)
	s.provider = sdkmetric.NewMeterProvider(
		sdkmetric.WithReader(reader),
		sdkmetric.WithResource(s.makeResource()),
	)

	log.Infof("OpenTelemetry metrics export started: endpoint=%s, interval=%s, prefixes=%v", endpoint, interval, s.cfg.MetricPrefixes)
	return nil
}

func metricsEndpointURL(serverUrl string, metricsPath string) string {
	return strings.TrimRight(serverUrl, "/") + metricsPath
}

func (s *oTelMetricsExportServiceImpl) makeResource() *resource.Resource {
	attrs := []attribute.KeyValue{
		semconv.ServiceName(oTelServiceName),
		semconv.ServiceInstanceID(s.instanceId),
	}
	if s.cfg.Namespace != "" {
		attrs = append(attrs, semconv.K8SNamespaceName(s.cfg.Namespace))
	}
	return resource.NewSchemaless(attrs...)
}

func (s *oTelMetricsExportServiceImpl) Shutdown(ctx context.Context) error {
	if s.provider == nil {
		return nil
	}
	return s.provider.Shutdown(ctx)
}

// loggingMetricExporter routes export failures to the application log. The SDK's own error handler writes to stderr only,
// which does not reach the configured log file.
type loggingMetricExporter struct {
	sdkmetric.Exporter
	endpoint string
}

func (e *loggingMetricExporter) Export(ctx context.Context, rm *metricdata.ResourceMetrics) error {
	if err := e.Exporter.Export(ctx, rm); err != nil {
		log.Errorf("OpenTelemetry metrics export to %s failed: %v", e.endpoint, err)
		return err
	}
	if log.IsLevelEnabled(log.TraceLevel) {
		names := exportedMetricNames(rm)
		log.Tracef("OpenTelemetry metrics exported to %s: %d metrics %v", e.endpoint, len(names), names)
	}
	return nil
}

func exportedMetricNames(rm *metricdata.ResourceMetrics) []string {
	names := make([]string, 0)
	for _, scope := range rm.ScopeMetrics {
		for _, m := range scope.Metrics {
			names = append(names, m.Name)
		}
	}
	return names
}
