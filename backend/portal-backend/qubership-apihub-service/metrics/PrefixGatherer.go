package metrics

import (
	"strings"

	"github.com/prometheus/client_golang/prometheus"
	dto "github.com/prometheus/client_model/go"
)

// PrefixGatherer exposes only the metric families of the wrapped gatherer whose name starts with one of the prefixes.
type PrefixGatherer struct {
	inner    prometheus.Gatherer
	prefixes []string
}

func NewPrefixGatherer(inner prometheus.Gatherer, prefixes []string) *PrefixGatherer {
	return &PrefixGatherer{inner: inner, prefixes: prefixes}
}

func (g *PrefixGatherer) Gather() ([]*dto.MetricFamily, error) {
	families, err := g.inner.Gather()
	if err != nil {
		return nil, err
	}
	filtered := make([]*dto.MetricFamily, 0, len(families))
	for _, family := range families {
		if g.matches(family.GetName()) {
			filtered = append(filtered, family)
		}
	}
	return filtered, nil
}

func (g *PrefixGatherer) matches(name string) bool {
	for _, prefix := range g.prefixes {
		if strings.HasPrefix(name, prefix) {
			return true
		}
	}
	return false
}
