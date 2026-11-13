import { Diff, DiffAction, isDiffRename } from "@netcracker/qubership-apihub-api-diff"
import { isObject, isString } from "../../../utilities"
import { FieldSides, SideContext, SideContexts, SideReader } from "../../shared/side-reader"
import { OpenApiOperationContext } from "./openapi-spec-transformer"

/** What every with-diffs build step needs to know about the selected operation of a merged document. */
export type OpenApiDiffsOperationFacts = {
  /** The sides where the operation exists. */
  readonly sides: SideContext
  /** The operation (or its path item) wholly added / removed: every node below inherits it. */
  readonly wholeDiff: Diff | undefined
  /** A renamed `paths` key as a `replace` of the address. */
  readonly addressDiff: Diff | undefined
  /** The operation's `responses`, `parameters` and `requestBody`, read per side once. */
  readonly responsesField: FieldSides
  readonly parametersField: FieldSides
  readonly requestBodyField: FieldSides
}

/**
 * Derives the facts of an operation from its context, once per context object. A pure function of
 * its input (the cache is keyed by the context), so callers may ask in any order and a transformer
 * instance may serve several operations.
 */
export class OpenApiDiffsOperationFactsResolver {
  private readonly cache = new WeakMap<OpenApiOperationContext, OpenApiDiffsOperationFacts>()

  constructor(private readonly reader: SideReader) { }

  public resolve(context: OpenApiOperationContext): OpenApiDiffsOperationFacts {
    let facts = this.cache.get(context)
    if (!facts) {
      facts = this.build(context)
      this.cache.set(context, facts)
    }
    return facts
  }

  private build(context: OpenApiOperationContext): OpenApiDiffsOperationFacts {
    const { source, keys, operation } = context
    const paths = source.paths
    const pathItemField = this.reader.readField(paths, keys.path, SideContexts.BOTH)
    const operationField = this.reader.readField(isObject(paths) ? paths[keys.path] : undefined, keys.method, this.reader.childContext(pathItemField))
    const sides = this.reader.childContext(operationField)
    return {
      sides,
      wholeDiff: [operationField.diff, pathItemField.diff].find(diff => SideReader.isWholeChange(diff)),
      addressDiff: this.resolveAddressDiff(pathItemField.diff),
      responsesField: this.reader.readField(operation, 'responses', sides),
      parametersField: this.reader.readField(operation, 'parameters', sides),
      requestBodyField: this.reader.readField(operation, 'requestBody', sides),
    }
  }

  private resolveAddressDiff(pathDiff: Diff | undefined): Diff | undefined {
    if (!pathDiff || !isDiffRename(pathDiff) || !isString(pathDiff.beforeKey) || !isString(pathDiff.afterKey)) {
      return undefined
    }
    return {
      type: pathDiff.type,
      scope: pathDiff.scope,
      action: DiffAction.replace,
      beforeValue: pathDiff.beforeKey,
      afterValue: pathDiff.afterKey,
      beforeDeclarationPaths: pathDiff.beforeDeclarationPaths,
      afterDeclarationPaths: pathDiff.afterDeclarationPaths,
    }
  }
}
