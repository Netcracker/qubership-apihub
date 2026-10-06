import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exitIfInsideNodeModules } from "./compatibility-suite-generation-utils.mjs";
import {
  JSON_SCHEMA_VALIDATION_GROUPS,
  listJsonSchemaValidationYamlCases,
} from "./json-schema-validation-case-definitions.mjs";
import {
  getSampleFileName,
  resolveSampleFormat,
  serializeSampleSchema,
} from "./json-schema-sample-generation-utils.mjs";

exitIfInsideNodeModules(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const samplesRoot = path.resolve(packageRoot, "../samples/json-schema");
const sampleFormat = resolveSampleFormat();
const sampleFileName = getSampleFileName(sampleFormat);

for (const { group } of JSON_SCHEMA_VALIDATION_GROUPS) {
  const groupDir = path.join(samplesRoot, group);
  mkdirSync(groupDir, { recursive: true });
}

const counts = {};

for (const { group, cases } of JSON_SCHEMA_VALIDATION_GROUPS) {
  counts[group] = cases.length;
  for (const [index, sampleCase] of cases.entries()) {
    const caseId = `${String(index + 1).padStart(3, "0")}-${sampleCase.slug}`;
    const caseDir = path.join(samplesRoot, group, caseId);
    mkdirSync(caseDir, { recursive: true });
    writeFileSync(
      path.join(caseDir, sampleFileName),
      serializeSampleSchema(sampleCase.schema, sampleFormat),
    );
  }
  console.log(`Generated ${cases.length} ${group} sample(s)`);
}

writeFileSync(
  path.join(samplesRoot, "validations-manifest.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      sampleFormat,
      counts,
      total: listJsonSchemaValidationYamlCases().length,
    },
    null,
    2,
  )}\n`,
);

console.log(
  `Wrote validations-manifest.json with ${listJsonSchemaValidationYamlCases().length} total sample(s)`,
);
