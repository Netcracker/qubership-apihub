import { OpenApiPathVisitor, OpenApiWalker } from '../../src'

const walker = new OpenApiWalker()

export function walkRestOperation(
  source: unknown,
  callbacks: OpenApiPathVisitor,
): void {
  walker.walkPaths(source, callbacks, {
    allowNotValidSyntheticChanges: true,
    syntheticTitleFlag: Symbol('synthetic-title'),
  })
}
