import { BuildingServiceLogger, createBuildingServiceLogger } from '../../../loggers'
import { JavaApiClassListItem } from '../../../model/javaapi/class-list/class-list-item'
import { JavaApiClassListBuilderParams } from '../../../shared/javaapi/types/tree-builder-params'
import { JavaApiSpecTransformer } from '../shared/javaapi-spec-transformer'

/*
 * Lists the classes of a jdiff document, ordered by package and then by name.
 * Hosts use it for the class list next to `JavaClassViewer`, so they never parse jdiff themselves.
 */
export class JavaApiClassListBuilder {
  protected readonly source: unknown
  protected readonly logger: BuildingServiceLogger

  constructor(params: JavaApiClassListBuilderParams) {
    const { source, logger = createBuildingServiceLogger() } = params
    this.source = source
    this.logger = logger
  }

  public build(): JavaApiClassListItem[] {
    return new JavaApiSpecTransformer(this.logger).transformSourceToClassList(this.source)
  }
}
