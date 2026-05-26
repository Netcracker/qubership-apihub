package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var WSBranchEditSessionCount = prometheus.NewGaugeVec(
	prometheus.GaugeOpts{
		Name: "apihub_ws_branch_edit_session_count",
		Help: "ws branch edit sessions count.",
	},
	[]string{},
)

var WSFileEditSessionCount = prometheus.NewGaugeVec(
	prometheus.GaugeOpts{
		Name: "apihub_ws_file_edit_session_count",
		Help: "ws file edit sessions count.",
	},
	[]string{},
)

var TotalRequests = prometheus.NewCounterVec(
	prometheus.CounterOpts{
		Name: "apihub_http_requests_total",
		Help: "Number of get requests.",
	},
	[]string{"path", "code", "method"},
)

var HttpDuration = promauto.NewHistogramVec(
	prometheus.HistogramOpts{
		Name: "apihub_http_request_duration_seconds_historgram",
		Buckets: []float64{
			0.1, // 100 ms
			0.2,
			0.25,
			0.5,
			1,
			1.5,
			3,
			5,
			10,
		},
	},
	[]string{"path", "code", "method"},
)

var BuildNoneStatusQueueSize = prometheus.NewGaugeVec(
	prometheus.GaugeOpts{
		Name: "apihub_build_none_queue_size",
		Help: "Build count with status = 'none'",
	},
	[]string{},
)

var BuildRunningStatusQueueSize = prometheus.NewGaugeVec(
	prometheus.GaugeOpts{
		Name: "apihub_build_running_queue_size",
		Help: "Build count with status = 'running'",
	},
	[]string{},
)

var FailedBuildCount = prometheus.NewGaugeVec(
	prometheus.GaugeOpts{
		Name: "apihub_failed_build_count",
		Help: "Build count with status = 'error'",
	},
	[]string{},
)

var MaxBuildTime = prometheus.NewGaugeVec(
	prometheus.GaugeOpts{
		Name: "apihub_max_build_time",
		Help: "Max build time",
	},
	[]string{},
)

var AvgBuildTime = prometheus.NewGaugeVec(
	prometheus.GaugeOpts{
		Name: "apihub_avg_build_time",
		Help: "Avg build time",
	},
	[]string{},
)

var NumberOfBuildRetries = prometheus.NewGaugeVec(
	prometheus.GaugeOpts{
		Name: "apihub_build_retries_count",
		Help: "Number of build retries",
	},
	[]string{},
)

// AI chat metrics

var AiChatTurnsTotal = prometheus.NewCounterVec(
	prometheus.CounterOpts{
		Name: "apihub_ai_chat_turns_total",
		Help: "Number of AI chat turns processed, partitioned by mode (sync/stream) and status (ok/error).",
	},
	[]string{"mode", "status"},
)

var AiChatTurnDuration = prometheus.NewHistogramVec(
	prometheus.HistogramOpts{
		Name:    "apihub_ai_chat_turn_duration_seconds",
		Help:    "End-to-end duration of an AI chat turn (LLM + tool calls + persistence).",
		Buckets: []float64{0.5, 1, 2, 3, 5, 8, 13, 20, 30, 60, 120},
	},
	[]string{"mode", "status"},
)

var AiChatTurnTokens = prometheus.NewHistogramVec(
	prometheus.HistogramOpts{
		Name:    "apihub_ai_chat_turn_tokens",
		Help:    "Total tokens (prompt+completion) reported by the LLM provider per turn.",
		Buckets: []float64{500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 96000, 128000},
	},
	[]string{"mode"},
)

var AiChatToolCallsTotal = prometheus.NewCounterVec(
	prometheus.CounterOpts{
		Name: "apihub_ai_chat_tool_calls_total",
		Help: "Number of MCP tool invocations performed during AI chat turns.",
	},
	[]string{"tool", "status"},
)

var AiChatCompactionsTotal = prometheus.NewCounter(
	prometheus.CounterOpts{
		Name: "apihub_ai_chat_compactions_total",
		Help: "Number of context compactions performed.",
	},
)

var EphemeralFilesTotal = prometheus.NewCounter(
	prometheus.CounterOpts{
		Name: "apihub_ephemeral_files_total",
		Help: "Number of ephemeral files persisted.",
	},
)

var EphemeralFileBytes = prometheus.NewHistogram(
	prometheus.HistogramOpts{
		Name:    "apihub_ephemeral_file_bytes",
		Help:    "Size of ephemeral files in bytes.",
		Buckets: []float64{1024, 8 * 1024, 64 * 1024, 512 * 1024, 4 * 1024 * 1024, 32 * 1024 * 1024},
	},
)

var AiChatCleanupDeleted = prometheus.NewCounterVec(
	prometheus.CounterOpts{
		Name: "apihub_ai_chat_cleanup_deleted_total",
		Help: "Items deleted by the AI chat retention cleanup job.",
	},
	[]string{"job", "kind"},
)

var EphemeralFileCleanupDeleted = prometheus.NewCounterVec(
	prometheus.CounterOpts{
		Name: "apihub_ephemeral_file_cleanup_deleted_total",
		Help: "Items deleted by the ephemeral file cleanup job.",
	},
	[]string{"kind"},
)

func RegisterAllPrometheusApplicationMetrics() {
	prometheus.Register(TotalRequests)
	prometheus.Register(HttpDuration)
	prometheus.Register(WSBranchEditSessionCount)
	prometheus.Register(WSFileEditSessionCount)
	prometheus.Register(BuildRunningStatusQueueSize)
	prometheus.Register(BuildNoneStatusQueueSize)
	prometheus.Register(FailedBuildCount)
	prometheus.Register(MaxBuildTime)
	prometheus.Register(AvgBuildTime)
	prometheus.Register(NumberOfBuildRetries)

	prometheus.Register(AiChatTurnsTotal)
	prometheus.Register(AiChatTurnDuration)
	prometheus.Register(AiChatTurnTokens)
	prometheus.Register(AiChatToolCallsTotal)
	prometheus.Register(AiChatCompactionsTotal)
	prometheus.Register(EphemeralFilesTotal)
	prometheus.Register(EphemeralFileBytes)
	prometheus.Register(AiChatCleanupDeleted)
	prometheus.Register(EphemeralFileCleanupDeleted)
}
