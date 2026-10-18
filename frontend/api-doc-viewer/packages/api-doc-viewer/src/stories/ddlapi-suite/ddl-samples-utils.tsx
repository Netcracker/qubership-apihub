import type { ArgTypes } from "@storybook/react";

export type DdlSampleStoryCase = {
  caseId: string;
  sampleSql: string;
};

export type DdlCaseStoryComponentProps = DdlSampleStoryCase;

export const ddlSampleReferenceArgTypes = {
  caseId: {
    control: { type: "text" },
    table: { category: "Sample" },
    description: "Sample case identifier. The viewer always uses the bundled fixture for this case.",
  },
  sampleSql: {
    control: { type: "text" },
    table: { category: "Sample" },
    description:
      "Original sample SQL for reference. The viewer always uses the bundled fixture for the selected case.",
  },
} satisfies Partial<ArgTypes<DdlCaseStoryComponentProps>>;
