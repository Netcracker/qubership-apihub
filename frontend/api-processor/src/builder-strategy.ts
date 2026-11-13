import { BuildConfig, BuilderStrategy, BuildResult, BuildTypeContexts } from './types'

export class BuilderStrategyContext {
  constructor(
    public strategy: BuilderStrategy,
    public config: BuildConfig,
    public buildResult: BuildResult,
    public contexts: BuildTypeContexts,
  ) {/* do nothing */}

  setStrategy(strategy: BuilderStrategy): void {
    this.strategy = strategy
  }

  async executeStrategy(): Promise<BuildResult> {
    return this.strategy.execute(this.config, this.buildResult, this.contexts)
  }
}
