package service

import (
	"github.com/Netcracker/qubership-api-linter-service/view"
)

type LinterConfigService interface {
	GetExternalLinterConfigs() []view.ExternalLinterConfig
	GetInternalLinterConfigs() []view.InternalLinterConfig
	GetConfigForLinter(linter view.Linter) (view.InternalLinterConfig, bool)
}

type linterConfigServiceImpl struct {
	systemInfoService SystemInfoService
	internalConfigs   []view.InternalLinterConfig // TODO: map[linter]config?
	externalConfigs   []view.ExternalLinterConfig
}

func NewLinterConfigService(systemInfoService SystemInfoService) LinterConfigService {
	impl := &linterConfigServiceImpl{
		systemInfoService: systemInfoService,
	}
	impl.internalConfigs = impl.loadInternalConfigs()
	impl.externalConfigs = impl.generateExternalConfigs(impl.internalConfigs)
	return impl
}

func (l *linterConfigServiceImpl) loadInternalConfigs() []view.InternalLinterConfig {
	result := make([]view.InternalLinterConfig, 0)

	result = append(result, view.InternalLinterConfig{
		Linter:          view.SpectralLinter,
		ApiTypes:        []view.ApiType{view.OpenAPI31Type, view.OpenAPI30Type, view.OpenAPI20Type, view.AsyncAPI30Type},
		DisplayName:     "Spectral",
		Enabled:         true,
		Workers:         l.systemInfoService.GetSpectralLinterWorkers(),
		IncludePackages: []string{"*"},
		ExcludePackages: nil,
		LinterSpecificParams: map[string]interface{}{
			"SpectralBinPath": l.systemInfoService.GetSpectralBinPath(),
		},
	})

	result = append(result, view.InternalLinterConfig{
		Linter:               view.AiLinter,
		ApiTypes:             []view.ApiType{view.OpenAPI31Type, view.OpenAPI30Type, view.OpenAPI20Type},
		DisplayName:          "AI Linter",
		Enabled:              l.systemInfoService.IsAiOasLinterEnabled(),
		Workers:              l.systemInfoService.GetAiLinterWorkers(),
		IncludePackages:      l.systemInfoService.GetAiLinterIncludedPackages(),
		ExcludePackages:      l.systemInfoService.GetAiLinterExcludedPackages(),
		LinterSpecificParams: nil, // TODO: llm params?
	})

	return result
}

func (l *linterConfigServiceImpl) generateExternalConfigs(internal []view.InternalLinterConfig) []view.ExternalLinterConfig {
	result := make([]view.ExternalLinterConfig, 0)
	for _, cfg := range internal {
		if cfg.Enabled {
			result = append(result, view.ExternalLinterConfig{
				Linter:      cfg.Linter,
				ApiTypes:    cfg.ApiTypes,
				DisplayName: cfg.DisplayName,
				Enabled:     cfg.Enabled,
			})
		}
	}
	return result
}

func (l *linterConfigServiceImpl) GetInternalLinterConfigs() []view.InternalLinterConfig {
	return l.internalConfigs
}

func (l *linterConfigServiceImpl) GetConfigForLinter(linter view.Linter) (view.InternalLinterConfig, bool) {
	for _, cfg := range l.internalConfigs {
		if cfg.Linter == linter {
			return cfg, true
		}
	}
	return view.InternalLinterConfig{}, false
}

func (l *linterConfigServiceImpl) GetExternalLinterConfigs() []view.ExternalLinterConfig {
	return l.externalConfigs
}
