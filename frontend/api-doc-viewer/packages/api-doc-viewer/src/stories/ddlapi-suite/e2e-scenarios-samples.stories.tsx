import type { Meta, StoryObj } from "@storybook/react";
import { TableKey } from "@netcracker/qubership-apihub-next-data-model/shared/ddlapi/types/table-key";
import type { DdlSampleCase } from "../utils/ddl-samples-cases";
import { createDdlSampleById } from "../utils/ddl-samples-cases";
import {
  DdlSampleStory,
  createCaseStoryFactory,
  ddlSamplesStoryMetaBase,
  type DdlSamplesStoryObj,
} from "./ddl-samples-common";

const SAMPLE_FILES = import.meta.glob(
  "../../../../samples/ddlapi/e2e-scenarios/*/sample.sql",
  { as: "raw", eager: true },
) as Record<string, string>;

const SAMPLE_TABLE_KEYS: Record<string, TableKey> = {
  users: { schemaName: "public", name: "users" },
  employees: { schemaName: "public", name: "employees" },
  projects: { schemaName: "public", name: "projects" },
  employees_projects: { schemaName: "public", name: "employees_projects" },
  users_plus_idx: { schemaName: "public", name: "users_plus_idx" },
  petstore: { schemaName: "petstore", name: "animals" },
  sample_table: { schemaName: "public", name: "sample_table" },
};

const SAMPLE_SUFFIX = "/sample.sql";

const extractCaseId = (samplePath: string): string | undefined => {
  const normalized = samplePath.replaceAll("\\", "/");
  if (!normalized.endsWith(SAMPLE_SUFFIX)) {
    return undefined;
  }

  const trimmed = normalized.slice(0, -SAMPLE_SUFFIX.length);
  const parts = trimmed.split("/");
  return parts[parts.length - 1];
};

const collectE2eSampleCases = (): DdlSampleCase[] => {
  const cases: DdlSampleCase[] = [];

  for (const [samplePath, ddl] of Object.entries(SAMPLE_FILES)) {
    const caseId = extractCaseId(samplePath);
    if (!caseId) {
      continue;
    }

    const tableKey = SAMPLE_TABLE_KEYS[caseId];
    if (!tableKey) {
      continue;
    }

    cases.push({ caseId, ddl, tableKey });
  }

  return cases.sort((left, right) =>
    left.caseId.localeCompare(right.caseId, undefined, { numeric: true }),
  );
};

const sampleById = createDdlSampleById(collectE2eSampleCases());
const createCaseStory = createCaseStoryFactory(sampleById, {
  perCase: {
    sample_table: { noHeading: true },
  },
});

// eslint-disable-next-line storybook/story-exports
const meta = {
  ...ddlSamplesStoryMetaBase,
  id: "ddlapi-suite-e2e-scenarios",
  title: "DDL API Suite/E2E Scenarios",
} satisfies Meta<typeof DdlSampleStory>;

export default meta;

type Story = DdlSamplesStoryObj;

export const Users: Story = createCaseStory("users");
export const Employees: Story = createCaseStory("employees");
export const Projects: Story = createCaseStory("projects");
export const EmployeesProjects: Story = createCaseStory("employees_projects");
export const UsersPlusIdx: Story = createCaseStory("users_plus_idx");
export const Petstore: Story = createCaseStory("petstore");
export const NoHeadingWithTableName: Story = createCaseStory("sample_table");
