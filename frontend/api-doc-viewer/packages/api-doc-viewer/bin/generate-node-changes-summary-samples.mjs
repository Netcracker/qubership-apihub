import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { stringify as stringifyYaml } from "yaml";
import { exitIfInsideNodeModules } from "./compatibility-suite-generation-utils.mjs";
import {
  buildCase1Schema,
  buildCase2Schema,
  buildCase3Schema,
  buildCase4Schema,
  buildCase5Schema,
  buildCase6Schema,
  buildCase7Schema,
} from "./node-changes-summary-schema-builder.mjs";

exitIfInsideNodeModules(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const samplesRoot = path.resolve(packageRoot, "../samples/json-schema-diffs/node-changes-summary");

const CASES = [
  { slug: "1-simple-properties", build: buildCase1Schema },
  { slug: "2-object-wrapping-case-1", build: buildCase2Schema },
  { slug: "3-array-items-case-1", build: buildCase3Schema },
  { slug: "4-array-items-case-2", build: buildCase4Schema },
  { slug: "5-oneof-properties", build: buildCase5Schema },
  { slug: "6-oneof-wrapping-object-cases", build: buildCase6Schema },
  { slug: "7-oneof-wrapping-array-cases", build: buildCase7Schema },
];

const serializeSchema = (schema) => `${stringifyYaml(schema, { lineWidth: 0 })}\n`;

for (const { slug, build } of CASES) {
  const { before, after } = build();
  const caseDir = path.join(samplesRoot, `case-${slug}`);
  mkdirSync(caseDir, { recursive: true });
  writeFileSync(path.join(caseDir, "before.yaml"), serializeSchema(before));
  writeFileSync(path.join(caseDir, "after.yaml"), serializeSchema(after));
  console.log(`Wrote ${caseDir}`);
}
