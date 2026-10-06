import { sanitize } from "@storybook/csf";
import { kebabCase } from "lodash-es";

/** Storybook meta id from a CSF `title` (e.g. `Group/Story Name`). */
export const toStorybookMetaId = (title) => title.split("/").map(sanitize).join("-");

/** Storybook story slug from a CSF named export (e.g. `Case_025_rule1_string`). */
export const toStorybookStorySlug = (exportName) => kebabCase(exportName);
