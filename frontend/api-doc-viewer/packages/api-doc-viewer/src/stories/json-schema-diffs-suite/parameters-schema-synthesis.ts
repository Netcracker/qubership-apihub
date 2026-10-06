import {
  type Diff,
  DiffAction,
  type DiffMetaRecord,
  DIFF_META_KEY,
  isDiffAdd,
  isDiffRemove,
  isDiffRename,
  isDiffReplace,
} from "@netcracker/qubership-apihub-api-diff";
import { isObject } from "@netcracker/qubership-apihub-api-data-model";
import { parseYamlSource } from "../utils/parse-yaml-source";
import { mergeOpenApiDocuments } from "../preprocess";

/**
 * Synthesizes the merged JSON Schema a host application builds from an operation's parameters:
 * one property per parameter (keyed by its name), `required` array from `required` flags.
 *
 * `apiDiff` maps path parameters by their position in the path template, so a renamed path
 * parameter arrives as a `name` replace on the parameter. Here it becomes a `rename` of the
 * property key - the only producer of JSON Schema property renames (see
 * `docs/design/json-schema/features/node-key-rename.md`).
 */

type MergedParameter = Record<PropertyKey, unknown> & {
  name: string;
  required?: boolean;
  description?: string;
  deprecated?: boolean;
  schema?: Record<PropertyKey, unknown>;
};

type SynthesizedSchema = {
  type: "object";
  properties: Record<PropertyKey, unknown>;
  required: string[] & { [DIFF_META_KEY]?: DiffMetaRecord };
};

/** Parameter-level diffs which are not diffs of the property schema itself. */
const PARAMETER_ONLY_DIFF_KEYS: readonly PropertyKey[] = ["name", "in", "required", "schema"];

const takeDiffMetaRecord = (value: unknown): DiffMetaRecord | undefined =>
  isObject(value) ? (value as Record<PropertyKey, unknown>)[DIFF_META_KEY] as DiffMetaRecord | undefined : undefined;

const isMergedParameter = (value: unknown): value is MergedParameter =>
  isObject(value) && typeof (value as Record<string, unknown>).name === "string";

const toRenameDiff = (nameDiff: Diff): Diff | undefined => {
  if (!isDiffReplace(nameDiff)) {
    return undefined;
  }
  return {
    type: nameDiff.type,
    scope: nameDiff.scope,
    description: nameDiff.description,
    action: DiffAction.rename,
    beforeKey: String(nameDiff.beforeValue),
    afterKey: String(nameDiff.afterValue),
    beforeDeclarationPaths: nameDiff.beforeDeclarationPaths,
    afterDeclarationPaths: nameDiff.afterDeclarationPaths,
  } as Diff;
};

/**
 * A boolean `required` diff becomes a `required` array item diff: parameter name added to the array
 * (became required) or removed from it (became optional). Changes without effect are dropped.
 */
const toRequiredArrayItemDiff = (diff: Diff | undefined, parameterName: string): Diff | undefined => {
  if (!diff || isDiffRename(diff)) {
    return undefined;
  }
  const beforeRequired = (isDiffRemove(diff) || isDiffReplace(diff)) && diff.beforeValue === true;
  const afterRequired = (isDiffAdd(diff) || isDiffReplace(diff)) && diff.afterValue === true;
  if (beforeRequired === afterRequired) {
    return undefined;
  }
  const { type, scope, description } = diff;
  return afterRequired
    ? {
      type,
      scope,
      description,
      action: DiffAction.add,
      afterValue: parameterName,
      afterDeclarationPaths: isDiffAdd(diff) || isDiffReplace(diff) ? diff.afterDeclarationPaths : [],
    }
    : {
      type,
      scope,
      description,
      action: DiffAction.remove,
      beforeValue: parameterName,
      beforeDeclarationPaths: isDiffRemove(diff) || isDiffReplace(diff) ? diff.beforeDeclarationPaths : [],
    };
};

export const synthesizeParametersSchema = (parameters: unknown): SynthesizedSchema => {
  const schema: SynthesizedSchema = { type: "object", properties: {}, required: [] };
  const propertiesDiffs: DiffMetaRecord = {};
  const requiredArrayDiffs: DiffMetaRecord = {};
  const parametersArrayDiffs = takeDiffMetaRecord(parameters) ?? {};

  (Array.isArray(parameters) ? parameters : []).forEach((parameter, index) => {
    if (!isMergedParameter(parameter)) {
      return;
    }
    const { name, required, description, deprecated, schema: parameterSchema } = parameter;
    const parameterDiffs = takeDiffMetaRecord(parameter) ?? {};

    const propertyDiffs: DiffMetaRecord = { ...takeDiffMetaRecord(parameterSchema) };
    for (const [diffKey, diff] of Object.entries(parameterDiffs)) {
      if (!PARAMETER_ONLY_DIFF_KEYS.includes(diffKey)) {
        propertyDiffs[diffKey] = diff;
      }
    }

    schema.properties[name] = {
      ...parameterSchema,
      ...(description !== undefined ? { description } : {}),
      ...(deprecated !== undefined ? { deprecated } : {}),
      [DIFF_META_KEY]: Object.keys(propertyDiffs).length > 0 ? propertyDiffs : undefined,
    };

    // Whole parameter added/removed - a diff of the parameters array item
    const parameterArrayItemDiff = parametersArrayDiffs[index];
    if (parameterArrayItemDiff) {
      propertiesDiffs[name] = parameterArrayItemDiff;
    }

    const renameDiff = parameterDiffs.name && toRenameDiff(parameterDiffs.name);
    if (renameDiff) {
      propertiesDiffs[name] = renameDiff;
    }

    const requiredDiff = toRequiredArrayItemDiff(parameterDiffs.required, name);
    if (required || requiredDiff) {
      if (requiredDiff) {
        requiredArrayDiffs[schema.required.length] = requiredDiff;
      }
      schema.required.push(name);
    }
  });

  if (Object.keys(propertiesDiffs).length > 0) {
    schema.properties[DIFF_META_KEY] = propertiesDiffs;
  }
  if (Object.keys(requiredArrayDiffs).length > 0) {
    schema.required[DIFF_META_KEY] = requiredArrayDiffs;
  }
  return schema;
};

/** Parameters of the only operation of the merged document (fixtures declare exactly one). */
const takeSingleOperationParameters = (mergedDocument: unknown): unknown => {
  const paths = isObject(mergedDocument) ? (mergedDocument as Record<string, unknown>).paths : undefined;
  const pathItem = isObject(paths) ? Object.values(paths)[0] : undefined;
  const operation = isObject(pathItem) ? Object.values(pathItem).find(isObject) : undefined;
  return isObject(operation) ? (operation as Record<string, unknown>).parameters : undefined;
};

/** Merges two single-operation OpenAPI documents and synthesizes their parameters schema. */
export const createParametersSchemaFromOpenApiPair = (beforeYaml: string, afterYaml: string): SynthesizedSchema =>
  synthesizeParametersSchema(
    takeSingleOperationParameters(mergeOpenApiDocuments(parseYamlSource(beforeYaml), parseYamlSource(afterYaml))),
  );
