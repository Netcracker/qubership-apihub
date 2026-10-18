import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import {
  DEBUG_TABLE_KEY_ARG_TYPES,
  DEBUG_TABLE_KEY_DEFAULT_ARGS,
} from "../ddlapi-suite/debug-table-key-story-args";
import {
  BuildFromDdlDiffsDebug,
  DEFAULT_AFTER_DDL,
  DEFAULT_BEFORE_DDL,
} from "./BuildFromDdlDiffsDebug";

type StoryArgs = ComponentProps<typeof BuildFromDdlDiffsDebug>;

const meta = {
  title: "Debug/DDL API Diffs from DDL SQL",
  component: BuildFromDdlDiffsDebug,
  argTypes: {
    beforeSql: {
      control: "text",
    },
    afterSql: {
      control: "text",
    },
    displayMode: {
      control: "select",
      options: ["simple", "detailed"],
      defaultValue: "detailed",
    },
    ...DEBUG_TABLE_KEY_ARG_TYPES,
  },
  args: {
    beforeSql: DEFAULT_BEFORE_DDL,
    afterSql: DEFAULT_AFTER_DDL,
    displayMode: "detailed",
    ...DEBUG_TABLE_KEY_DEFAULT_ARGS,
  },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<StoryArgs>;

export const Debug: Story = {};
