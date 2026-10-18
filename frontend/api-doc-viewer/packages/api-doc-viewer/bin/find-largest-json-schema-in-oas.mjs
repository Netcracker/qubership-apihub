#!/usr/bin/env node
/**
 * Find the widest/deepest JSON Schema in an OpenAPI document for JSON Schema
 * viewer performance demos.
 *
 * Uses @netcracker/qubership-apihub-api-unifier to resolve internal $ref pointers
 * (including circular references via shared object identity) and measures tree size
 * with the same structural children the next-data-model JSON Schema crawl rules use.
 *
 * Usage:
 *   node bin/find-largest-json-schema-in-oas.mjs <path-to-oas.yaml> [options]
 *
 * Options:
 *   --top=N              Number of ranked candidates to print (default: 20)
 *   --include-inline     Also score inline schemas (parameters, request/response bodies, …)
 *   --components-only    Only score #/components/schemas/* (default when that section exists)
 *   --inline-only        Only score inline /schema locations (skip components/schemas)
 *   --json                 Print machine-readable JSON on stdout
 *   --output=FILE          Write full ranked report JSON to FILE
 *   --extract-winner=FILE  Write resolved winning schema as YAML (for Storybook fixtures)
 *   --resolve-only         Skip mergeAllOf/unify (default; fastest faithful structural measure)
 *   --normalize            Apply unify + validate + liftCombiners like Storybook preprocess
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stringify as stringifyYaml } from "yaml";
import {
  JSON_SCHEMA_PROPERTY_ADDITIONAL_ITEMS,
  JSON_SCHEMA_PROPERTY_ADDITIONAL_PROPERTIES,
  JSON_SCHEMA_PROPERTY_ALL_OF,
  JSON_SCHEMA_PROPERTY_ANY_OF,
  JSON_SCHEMA_PROPERTY_ITEMS,
  JSON_SCHEMA_PROPERTY_ONE_OF,
  JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES,
  JSON_SCHEMA_PROPERTY_PROPERTIES,
  buildPointer,
  isPureRefNode,
  loadYaml,
  normalize,
  parseRef,
  resolveValueByPath,
} from "@netcracker/qubership-apihub-api-unifier";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_TOP = 20;

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {{ filePath?: string, top: number, includeInline: boolean, componentsOnly: boolean, inlineOnly: boolean, json: boolean, output?: string, extractWinner?: string, normalize: boolean }} */
  const options = {
    top: DEFAULT_TOP,
    includeInline: false,
    componentsOnly: false,
    inlineOnly: false,
    json: false,
    output: undefined,
    extractWinner: undefined,
    normalize: false,
  };

  for (const arg of argv) {
    if (arg.startsWith("--top=")) {
      options.top = Number.parseInt(arg.slice("--top=".length), 10);
      continue;
    }
    if (arg === "--include-inline") {
      options.includeInline = true;
      continue;
    }
    if (arg === "--components-only") {
      options.componentsOnly = true;
      options.inlineOnly = false;
      continue;
    }
    if (arg === "--inline-only") {
      options.inlineOnly = true;
      options.componentsOnly = false;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg.startsWith("--output=")) {
      options.output = arg.slice("--output=".length);
      continue;
    }
    if (arg.startsWith("--extract-winner=")) {
      options.extractWinner = arg.slice("--extract-winner=".length);
      continue;
    }
    if (arg === "--normalize") {
      options.normalize = true;
      continue;
    }
    if (arg === "--resolve-only") {
      options.normalize = false;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    if (options.filePath) {
      throw new Error(`Unexpected extra argument: ${arg}`);
    }
    options.filePath = arg;
  }

  if (!options.filePath) {
    throw new Error(
      "Usage: node bin/find-largest-json-schema-in-oas.mjs <path-to-oas.yaml> [--top=N] [--include-inline] [--components-only] [--json] [--output=FILE] [--normalize]",
    );
  }

  if (!Number.isFinite(options.top) || options.top < 1) {
    throw new Error(`Invalid --top value: ${options.top}`);
  }

  return options;
}

/**
 * Collect child schema objects using the same structural edges as
 * next-data-model getJsonSchemaCrawlRules().
 *
 * @param {Record<string, unknown>} schema
 * @returns {Record<string, unknown>[]}
 */
function collectStructuralChildSchemas(schema) {
  /** @type {Record<string, unknown>[]} */
  const children = [];

  for (const combinerKey of [
    JSON_SCHEMA_PROPERTY_ALL_OF,
    JSON_SCHEMA_PROPERTY_ONE_OF,
    JSON_SCHEMA_PROPERTY_ANY_OF,
  ]) {
    const combiner = schema[combinerKey];
    if (Array.isArray(combiner)) {
      for (const item of combiner) {
        if (isPlainObject(item)) {
          children.push(item);
        }
      }
    }
  }

  const properties = schema[JSON_SCHEMA_PROPERTY_PROPERTIES];
  if (isPlainObject(properties)) {
    for (const propertySchema of Object.values(properties)) {
      if (isPlainObject(propertySchema)) {
        children.push(propertySchema);
      }
    }
  }

  const patternProperties = schema[JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES];
  if (isPlainObject(patternProperties)) {
    for (const propertySchema of Object.values(patternProperties)) {
      if (isPlainObject(propertySchema)) {
        children.push(propertySchema);
      }
    }
  }

  const items = schema[JSON_SCHEMA_PROPERTY_ITEMS];
  if (Array.isArray(items)) {
    for (const itemSchema of items) {
      if (isPlainObject(itemSchema)) {
        children.push(itemSchema);
      }
    }
  } else if (isPlainObject(items)) {
    children.push(items);
  }

  const additionalProperties = schema[JSON_SCHEMA_PROPERTY_ADDITIONAL_PROPERTIES];
  if (additionalProperties !== undefined && additionalProperties !== false && isPlainObject(additionalProperties)) {
    children.push(additionalProperties);
  }

  const additionalItems = schema[JSON_SCHEMA_PROPERTY_ADDITIONAL_ITEMS];
  if (additionalItems !== undefined && additionalItems !== false && isPlainObject(additionalItems)) {
    children.push(additionalItems);
  }

  return children;
}

/**
 * Cycle-aware tree measure aligned with JSON Schema crawl semantics.
 *
 * @param {unknown} rootSchema
 */
function measureSchemaTree(rootSchema) {
  /** @type {{ nodeCount: number, maxDepth: number, maxWidth: number, directPropertyCount: number, cycleBackEdges: number, widthDepthProduct: number, score: number }} */
  const metrics = {
    nodeCount: 0,
    maxDepth: 0,
    maxWidth: 0,
    directPropertyCount: 0,
    cycleBackEdges: 0,
    widthDepthProduct: 0,
    score: 0,
  };

  if (!isPlainObject(rootSchema)) {
    return metrics;
  }

  /**
   * @param {Record<string, unknown>} schema
   * @param {number} depth
   * @param {Set<object>} activePath
   */
  function visit(schema, depth, activePath) {
    if (activePath.has(schema)) {
      metrics.nodeCount += 1;
      metrics.cycleBackEdges += 1;
      return;
    }

    metrics.nodeCount += 1;
    metrics.maxDepth = Math.max(metrics.maxDepth, depth);

    const properties = schema[JSON_SCHEMA_PROPERTY_PROPERTIES];
    if (isPlainObject(properties)) {
      metrics.directPropertyCount += Object.keys(properties).length;
    }

    activePath.add(schema);

    const children = collectStructuralChildSchemas(schema);
    metrics.maxWidth = Math.max(metrics.maxWidth, children.length);

    for (const child of children) {
      visit(child, depth + 1, activePath);
    }

    activePath.delete(schema);
  }

  visit(rootSchema, 1, new Set());

  metrics.widthDepthProduct = metrics.maxWidth * metrics.maxDepth;
  // Primary ranking key: total structural nodes (proxy for viewer row count).
  // widthDepthProduct breaks ties toward simultaneously wide and deep trees.
  metrics.score = metrics.nodeCount * 1_000_000 + metrics.widthDepthProduct;

  return metrics;
}

/**
 * @param {unknown} root
 * @param {{ componentsOnly: boolean, includeInline: boolean, inlineOnly: boolean }} scope
 * @returns {{ pointer: string, path: string[], schemaName?: string, location: string }[]}
 */
function collectSchemaEntryPoints(root, scope) {
  /** @type {{ pointer: string, path: string[], schemaName?: string, location: string }[]} */
  const entryPoints = [];
  /** @type {Set<string>} */
  const seenPointers = new Set();

  /**
   * @param {unknown} value
   * @param {string[]} jsonPath
   */
  function walk(value, jsonPath) {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        walk(value[index], [...jsonPath, String(index)]);
      }
      return;
    }

    if (!isPlainObject(value)) {
      return;
    }

    const isComponentSchema =
      jsonPath.length === 3 &&
      jsonPath[0] === "components" &&
      jsonPath[1] === "schemas";

    const isInlineSchema = jsonPath.at(-1) === "schema";

    if (
      (scope.inlineOnly && isInlineSchema) ||
      (!scope.inlineOnly && isComponentSchema) ||
      (scope.includeInline && isInlineSchema)
    ) {
      registerEntry(value, jsonPath, isComponentSchema ? "component" : "inline");
    }

    for (const [key, child] of Object.entries(value)) {
      walk(child, [...jsonPath, key]);
    }
  }

  /**
   * @param {unknown} value
   * @param {string[]} jsonPath
   * @param {"component" | "inline"} location
   */
  function registerEntry(value, jsonPath, location) {
    let pointer = `#${buildPointer(jsonPath)}`;

    if (isPureRefNode(value)) {
      const ref = parseRef(value.$ref);
      if (!ref.filePath) {
        pointer = ref.normalized.startsWith("#") ? ref.normalized : `#${ref.normalized}`;
      }
    }

    if (seenPointers.has(pointer)) {
      return;
    }
    seenPointers.add(pointer);

    entryPoints.push({
      pointer,
      path: [...jsonPath],
      schemaName:
        location === "component" && jsonPath.length === 3 ? jsonPath[2] : undefined,
      location,
    });
  }

  walk(root, []);

  if (scope.componentsOnly) {
    return entryPoints.filter((entry) => entry.location === "component");
  }

  if (scope.inlineOnly) {
    return entryPoints.filter((entry) => entry.location === "inline");
  }

  return entryPoints;
}

/**
 * Choose schema scope based on CLI flags and document shape.
 *
 * @param {unknown} rawSpec
 * @param {{ componentsOnly: boolean, includeInline: boolean, inlineOnly: boolean }} cliOptions
 */
function resolveSchemaScope(rawSpec, cliOptions) {
  const hasComponentSchemas =
    isPlainObject(rawSpec) &&
    isPlainObject(rawSpec.components) &&
    isPlainObject(rawSpec.components.schemas) &&
    Object.keys(rawSpec.components.schemas).length > 0;

  if (cliOptions.inlineOnly) {
    return { componentsOnly: false, includeInline: false, inlineOnly: true };
  }

  if (cliOptions.componentsOnly) {
    return { componentsOnly: true, includeInline: false, inlineOnly: false };
  }

  if (cliOptions.includeInline) {
    return { componentsOnly: false, includeInline: true, inlineOnly: false };
  }

  if (hasComponentSchemas) {
    return { componentsOnly: true, includeInline: false, inlineOnly: false };
  }

  // Specs without reusable components (fully inlined schemas) — scan inline /schema nodes.
  return { componentsOnly: false, includeInline: false, inlineOnly: true };
}

/**
 * @param {unknown} resolvedSpec
 * @returns {Map<object, string>}
 */
function buildComponentSchemaIdentityIndex(resolvedSpec) {
  /** @type {Map<object, string>} */
  const index = new Map();

  if (!isPlainObject(resolvedSpec)) {
    return index;
  }

  const components = resolvedSpec.components;
  if (!isPlainObject(components)) {
    return index;
  }

  const schemas = components.schemas;
  if (!isPlainObject(schemas)) {
    return index;
  }

  for (const [name, schema] of Object.entries(schemas)) {
    if (isPlainObject(schema)) {
      index.set(schema, `#/components/schemas/${name}`);
    }
  }

  return index;
}

/**
 * @param {Record<string, unknown>} rootSchema
 * @param {Map<object, string>} componentIndex
 * @returns {string[]}
 */
function collectComponentDependencies(rootSchema, componentIndex) {
  /** @type {Set<string>} */
  const dependencies = new Set();

  /**
   * @param {Record<string, unknown>} schema
   * @param {Set<object>} activePath
   */
  function walk(schema, activePath) {
    const componentPointer = componentIndex.get(schema);
    if (componentPointer) {
      dependencies.add(componentPointer);
    }

    if (activePath.has(schema)) {
      return;
    }

    activePath.add(schema);

    for (const child of collectStructuralChildSchemas(schema)) {
      walk(child, activePath);
    }

    activePath.delete(schema);
  }

  walk(rootSchema, new Set());

  return [...dependencies].sort();
}

/**
 * @param {number} ms
 */
function formatDuration(ms) {
  if (ms < 1000) {
    return `${ms.toFixed(0)} ms`;
  }
  return `${(ms / 1000).toFixed(1)} s`;
}

/**
 * @param {string} pointer
 */
function decodeJsonPointer(pointer) {
  const ref = parseRef(pointer);
  return `#/${ref.jsonPath.map((segment) => decodeURIComponent(String(segment))).join("/")}`;
}

/**
 * @param {{ pointer: string, schemaName?: string, location: string, metrics: ReturnType<typeof measureSchemaTree>, dependencies: string[] }} candidate
 */
function formatCandidateLine(candidate) {
  const name = candidate.schemaName ?? candidate.pointer;
  const { nodeCount, maxDepth, maxWidth, directPropertyCount, cycleBackEdges, widthDepthProduct } =
    candidate.metrics;

  return [
    candidate.pointer,
    `name=${name}`,
    `nodes=${nodeCount}`,
    `depth=${maxDepth}`,
    `maxWidth=${maxWidth}`,
    `properties=${directPropertyCount}`,
    `width×depth=${widthDepthProduct}`,
    `cycles=${cycleBackEdges}`,
    `deps=${candidate.dependencies.length}`,
    `location=${candidate.location}`,
  ].join(" | ");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const filePath = path.resolve(options.filePath);
  const startedAt = performance.now();

  process.stderr.write(`Loading ${filePath} …\n`);
  const loadStartedAt = performance.now();
  const rawSpec = loadYaml(readFileSync(filePath, "utf8"));
  process.stderr.write(`Loaded in ${formatDuration(performance.now() - loadStartedAt)}\n`);

  /** @type {import('@netcracker/qubership-apihub-api-unifier').RefErrorType[]} */
  const refErrors = [];

  process.stderr.write(
    options.normalize
      ? "Normalizing (resolve + validate + unify + liftCombiners) …\n"
      : "Resolving internal $ref pointers …\n",
  );
  const normalizeStartedAt = performance.now();
  const resolvedSpec = normalize(rawSpec, {
    resolveRef: true,
    mergeAllOf: !options.normalize,
    mergeTraits: false,
    unify: options.normalize,
    validate: options.normalize,
    liftCombiners: options.normalize,
    allowNotValidSyntheticChanges: options.normalize,
    onRefResolveError: (_message, _path, _ref, errorType) => {
      refErrors.push(errorType);
    },
  });
  process.stderr.write(
    `Reference resolution finished in ${formatDuration(performance.now() - normalizeStartedAt)}` +
      (refErrors.length ? ` (${refErrors.length} ref warnings)` : "") +
      "\n",
  );

  const schemaScope = resolveSchemaScope(rawSpec, options);
  const entryPoints = collectSchemaEntryPoints(rawSpec, schemaScope);
  process.stderr.write(
    `Found ${entryPoints.length} schema entry point(s) to score` +
      ` (scope: ${schemaScope.componentsOnly ? "components" : schemaScope.inlineOnly ? "inline" : "components+inline"})\n`,
  );

  const componentIndex = buildComponentSchemaIdentityIndex(resolvedSpec);

  /** @type {{ pointer: string, schemaName?: string, location: string, metrics: ReturnType<typeof measureSchemaTree>, dependencies: string[] }[]} */
  const ranked = [];

  const scoreStartedAt = performance.now();
  for (const entry of entryPoints) {
    const resolvedSchema = resolveValueByPath(resolvedSpec, parseRef(entry.pointer).jsonPath);
    if (!isPlainObject(resolvedSchema)) {
      continue;
    }

    const metrics = measureSchemaTree(resolvedSchema);
    ranked.push({
      pointer: entry.pointer,
      schemaName: entry.schemaName,
      location: entry.location,
      metrics,
      dependencies: collectComponentDependencies(resolvedSchema, componentIndex),
    });
  }

  ranked.sort((left, right) => {
    if (right.metrics.score !== left.metrics.score) {
      return right.metrics.score - left.metrics.score;
    }
    if (right.metrics.nodeCount !== left.metrics.nodeCount) {
      return right.metrics.nodeCount - left.metrics.nodeCount;
    }
    if (right.metrics.maxDepth !== left.metrics.maxDepth) {
      return right.metrics.maxDepth - left.metrics.maxDepth;
    }
    return right.metrics.maxWidth - left.metrics.maxWidth;
  });

  process.stderr.write(`Scored ${ranked.length} schema(s) in ${formatDuration(performance.now() - scoreStartedAt)}\n`);

  const winner = ranked[0];
  const top = ranked.slice(0, options.top);

  /** @type {Record<string, unknown>} */
  const report = {
    sourceFile: filePath,
    openapiVersion: isPlainObject(rawSpec) ? rawSpec.openapi : undefined,
    analyzedAt: new Date().toISOString(),
    options: {
      top: options.top,
      componentsOnly: schemaScope.componentsOnly,
      includeInline: schemaScope.includeInline,
      inlineOnly: schemaScope.inlineOnly,
      normalize: options.normalize,
    },
    refWarningCount: refErrors.length,
    entryPointCount: entryPoints.length,
    rankedCandidateCount: ranked.length,
    winner: winner
      ? {
          pointer: winner.pointer,
          schemaName: winner.schemaName,
          location: winner.location,
          metrics: winner.metrics,
          dependencies: winner.dependencies,
        }
      : null,
    top,
    elapsedMs: Math.round(performance.now() - startedAt),
  };

  if (options.output) {
    writeFileSync(options.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    process.stderr.write(`Wrote report to ${path.resolve(options.output)}\n`);
  }

  if (options.extractWinner && winner) {
    const resolvedSchema = resolveValueByPath(resolvedSpec, parseRef(winner.pointer).jsonPath);
    const extractPath = path.resolve(options.extractWinner);
    writeFileSync(extractPath, `${stringifyYaml(resolvedSchema, { lineWidth: 0 })}\n`, "utf8");
    process.stderr.write(`Wrote winning schema to ${extractPath}\n`);
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  process.stdout.write("\nLargest JSON Schema candidates (JSON Schema crawl semantics)\n");
  process.stdout.write(`Source: ${filePath}\n`);
  if (winner) {
    process.stdout.write("\nRecommended Storybook root pointer:\n");
    process.stdout.write(`  ${winner.pointer}\n`);
    process.stdout.write(`  decoded: ${decodeJsonPointer(winner.pointer)}\n`);
    if (winner.schemaName) {
      process.stdout.write(`  schema name: ${winner.schemaName}\n`);
    }
    process.stdout.write("\nMetrics:\n");
    process.stdout.write(`  structural nodes: ${winner.metrics.nodeCount}\n`);
    process.stdout.write(`  max depth:        ${winner.metrics.maxDepth}\n`);
    process.stdout.write(`  max width:        ${winner.metrics.maxWidth}\n`);
    process.stdout.write(`  direct properties (sum over object nodes): ${winner.metrics.directPropertyCount}\n`);
    process.stdout.write(`  width × depth:    ${winner.metrics.widthDepthProduct}\n`);
    process.stdout.write(`  cycle back-edges: ${winner.metrics.cycleBackEdges}\n`);
    process.stdout.write(`  component deps:   ${winner.dependencies.length}\n`);
    if (winner.dependencies.length > 0 && winner.dependencies.length <= 30) {
      process.stdout.write("\nTransitive #/components/schemas dependencies:\n");
      for (const dependency of winner.dependencies) {
        process.stdout.write(`  ${dependency}\n`);
      }
    } else if (winner.dependencies.length > 30) {
      process.stdout.write("\nFirst 30 transitive #/components/schemas dependencies:\n");
      for (const dependency of winner.dependencies.slice(0, 30)) {
        process.stdout.write(`  ${dependency}\n`);
      }
      process.stdout.write(`  … and ${winner.dependencies.length - 30} more\n`);
    }
  } else {
    process.stdout.write("\nNo JSON Schema entry points matched the selected scope.\n");
  }

  process.stdout.write(`\nTop ${top.length}:\n`);
  for (const [index, candidate] of top.entries()) {
    process.stdout.write(`${String(index + 1).padStart(2, " ")}. ${formatCandidateLine(candidate)}\n`);
  }

  process.stdout.write(`\nTotal elapsed: ${formatDuration(report.elapsedMs)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
