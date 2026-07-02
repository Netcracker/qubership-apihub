import type { Realm } from "@netcracker/qubership-apihub-ddlapi";
import type { Meta, StoryObj } from "@storybook/react";
import { DdlTableViewer } from "@apihub/components/DdlTableViewer/DdlTableViewer";
import { NavigationLinkBuilder } from "@netcracker/qubership-apihub-next-data-model/shared/ddlapi/types/navigation-link-builder";
import { TableKey } from "@netcracker/qubership-apihub-next-data-model/shared/ddlapi/types/table-key";
import { buildFromDdlInBrowser } from "./build-from-ddl-browser";

type LoaderData = {
  realm: Realm;
};

type DdlSample = {
  sampleId: string;
  ddl: string;
  tableKey: TableKey;
};

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

const extractSampleId = (samplePath: string): string | undefined => {
  const normalized = samplePath.replaceAll("\\", "/");
  if (!normalized.endsWith(SAMPLE_SUFFIX)) {
    return undefined;
  }

  const trimmed = normalized.slice(0, -SAMPLE_SUFFIX.length);
  const parts = trimmed.split("/");
  return parts[parts.length - 1];
};

const collectDdlSamples = (): DdlSample[] => {
  const samples: DdlSample[] = [];

  for (const [samplePath, ddl] of Object.entries(SAMPLE_FILES)) {
    const sampleId = extractSampleId(samplePath);
    if (!sampleId) {
      continue;
    }

    const tableKey = SAMPLE_TABLE_KEYS[sampleId];
    if (!tableKey) {
      continue;
    }

    samples.push({ sampleId, ddl, tableKey });
  }

  return samples.sort((left, right) =>
    left.sampleId.localeCompare(right.sampleId, undefined, { numeric: true }),
  );
};

const ddlSamples = collectDdlSamples();

const sampleById = ddlSamples.reduce<Record<string, DdlSample>>((accumulator, sample) => {
  accumulator[sample.sampleId] = sample;
  return accumulator;
}, {});

async function loadRealm(ddl: string): Promise<LoaderData> {
  return { realm: await buildFromDdlInBrowser(ddl) };
}

const navigationLinkBuilder: NavigationLinkBuilder = (schema, table, column) => {
  console.log(`Navigating to ${schema}.${table}.${column}`);
  return `#${schema}.${table}.${column}`;
};

// eslint-disable-next-line storybook/story-exports
const meta = {
  id: "ddlapi-suite-e2e-scenarios",
  title: "DDL API Suite/E2E Scenarios",
  component: DdlTableViewer,
} satisfies Meta<typeof DdlTableViewer>;

export default meta;

type Story = StoryObj<typeof DdlTableViewer>;

type CreateSampleStoryOptions = {
  noHeading?: boolean;
};

const createSampleStory = (sampleId: string, options: CreateSampleStoryOptions = {}): Story => {
  const sample = sampleById[sampleId];
  if (!sample) {
    throw new Error(`Sample not found: ${sampleId}`);
  }

  const { noHeading = false } = options;

  return {
    args: {
      noHeading,
      devMode: true,
    },
    loaders: [() => loadRealm(sample.ddl)],
    render: (args, { loaded }) => (
      <DdlTableViewer
        source={loaded!.realm}
        tableKey={sample.tableKey}
        navigationLinkBuilder={navigationLinkBuilder}
        displayMode={args.displayMode}
        noHeading={args.noHeading}
        devMode={args.devMode}
      />
    ),
  };
};

export const Users: Story = createSampleStory("users");
export const Employees: Story = createSampleStory("employees");
export const Projects: Story = createSampleStory("projects");
export const EmployeesProjects: Story = createSampleStory("employees_projects");
export const UsersPlusIdx: Story = createSampleStory("users_plus_idx");
export const Petstore: Story = createSampleStory("petstore");
export const NoHeadingWithTableName: Story = createSampleStory("sample_table", { noHeading: true });
