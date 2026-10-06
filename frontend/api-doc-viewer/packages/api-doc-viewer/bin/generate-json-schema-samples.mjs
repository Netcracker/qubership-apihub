import { rmSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exitIfInsideNodeModules } from "./compatibility-suite-generation-utils.mjs";
import {
  JSON_SCHEMA_DRAFT,
  SCHEMA_TYPES,
  collectCasesForType,
  resolveSampleFormat,
  writeSampleCase,
} from "./json-schema-sample-generation-utils.mjs";

exitIfInsideNodeModules(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const samplesRoot = path.resolve(packageRoot, "../samples/json-schema");
const sampleFormat = resolveSampleFormat();

for (const schemaType of SCHEMA_TYPES) {
  rmSync(path.join(samplesRoot, schemaType), { recursive: true, force: true });
}

const counts = {};

for (const schemaType of SCHEMA_TYPES) {
  const cases = collectCasesForType(schemaType);
  counts[schemaType] = cases.length;

  for (const sampleCase of cases) {
    writeSampleCase(samplesRoot, schemaType, sampleCase, sampleFormat);
  }

  console.log(`Generated ${cases.length} ${schemaType} sample(s)`);
}

writeFileSync(
  path.join(samplesRoot, "manifest.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      jsonSchemaDraft: JSON_SCHEMA_DRAFT,
      caseStrategy: "rendering-groups",
      sampleFormat,
      counts,
    },
    null,
    2,
  )}\n`,
);

console.log(`Wrote manifest with ${Object.values(counts).reduce((sum, count) => sum + count, 0)} total sample(s)`);
