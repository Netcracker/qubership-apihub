// Copyright 2024-2025 NetCracker Technology Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
}
