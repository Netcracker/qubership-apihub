import { DdlTableViewer } from "@apihub/components/DdlTableViewer/DdlTableViewer";
import type { DisplayMode } from "@apihub/types/DisplayMode";
import type { Realm } from "@netcracker/qubership-apihub-ddlapi";
import type { Meta, StoryObj } from "@storybook/react";
import { NavigationLinkBuilder } from "@netcracker/qubership-apihub-next-data-model/shared/ddlapi/types/navigation-link-builder";
import type { DdlSampleCase } from "../utils/ddl-samples-cases";
import { buildFromDdlInBrowser } from "./build-from-ddl-browser";
import {
  type DdlCaseStoryComponentProps,
  ddlSampleReferenceArgTypes,
} from "./ddl-samples-utils";

type LoaderData = {
  realm: Realm;
};

const navigationLinkBuilder: NavigationLinkBuilder = (schema, table, column) => {
  console.log(`Navigating to ${schema}.${table}.${column}`);
  return `#${schema}.${table}.${column}`;
};

export const DdlSampleStory = (_props: DdlCaseStoryComponentProps) => null;

export type DdlSamplesStoryMeta = Meta<typeof DdlSampleStory>;
export type DdlSamplesStoryObj = StoryObj<DdlSamplesStoryMeta>;

export const ddlSamplesStoryMetaBase = {
  component: DdlSampleStory,
  argTypes: ddlSampleReferenceArgTypes,
} satisfies Pick<DdlSamplesStoryMeta, "component" | "argTypes">;

export type DdlCaseStoryFactoryOptions = {
  displayMode?: DisplayMode;
  perCase?: Partial<Record<string, { noHeading?: boolean }>>;
};

async function loadRealm(ddl: string): Promise<LoaderData> {
  return { realm: await buildFromDdlInBrowser(ddl) };
}

export const createCaseStoryFactory = (
  sampleById: Record<string, DdlSampleCase>,
  options?: DdlCaseStoryFactoryOptions,
) => {
  const { displayMode: factoryDisplayMode, perCase = {} } = options ?? {};

  return (caseId: string): DdlSamplesStoryObj => {
    const sample = sampleById[caseId];
    if (!sample) {
      throw new Error(`Sample case not found: ${caseId}`);
    }

    const caseOptions = perCase[caseId] ?? {};

    return {
      name: caseId,
      args: {
        caseId,
        sampleSql: sample.ddl,
      },
      argTypes: ddlSampleReferenceArgTypes,
      loaders: [() => loadRealm(sample.ddl)],
      render: (args, { loaded }) => {
        const resolvedSample = sampleById[args.caseId];
        return (
          <DdlTableViewer
            source={loaded!.realm}
            tableKey={resolvedSample.tableKey}
            navigationLinkBuilder={navigationLinkBuilder}
            displayMode={factoryDisplayMode}
            noHeading={caseOptions.noHeading}
            devMode
          />
        );
      },
    };
  };
};
