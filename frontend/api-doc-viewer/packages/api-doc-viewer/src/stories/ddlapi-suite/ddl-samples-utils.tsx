import type { DisplayMode } from "@apihub/types/DisplayMode";
import type { ArgTypes } from "@storybook/react-vite";
import { DISPLAY_MODE_ARG_TYPES } from "../shared/display-mode-arg-types";

export type DdlSampleStoryCase = {
  caseId: string;
  sampleSql: string;
  displayMode?: DisplayMode;
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
  ...DISPLAY_MODE_ARG_TYPES,
} satisfies Partial<ArgTypes<DdlCaseStoryComponentProps>>;
